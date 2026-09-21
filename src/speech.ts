export type SpeechResult={text:string};
export type ListenOptions={timeoutMs?:number;silenceMs?:number;signal?:AbortSignal;onTranscript?:(text:string)=>void;minVoiceLevel?:number};

let activeSpeechStop:(()=>void)|null=null;

function abortError(){return new DOMException('Eingabe abgebrochen.','AbortError')}

export function speechSupported(){return Boolean((window as any).SpeechRecognition||(window as any).webkitSpeechRecognition)}

function mergeSegments(segments:string[]){
  const words:string[]=[];
  for(const segment of segments.map(value=>value.replace(/\s+/g,' ').trim()).filter(Boolean)){
    const next=segment.split(' ');
    const current=words.join(' ').toLocaleLowerCase('de-DE');
    const incoming=segment.toLocaleLowerCase('de-DE');
    if(incoming===current||current.endsWith(` ${incoming}`))continue;
    if(incoming.startsWith(`${current} `)){words.splice(0,words.length,...next);continue}
    let overlap=0;
    for(let size=Math.min(words.length,next.length);size>0;size--){
      if(words.slice(-size).join(' ').toLocaleLowerCase('de-DE')===next.slice(0,size).join(' ').toLocaleLowerCase('de-DE')){overlap=size;break}
    }
    words.push(...next.slice(overlap));
  }
  return words.join(' ').trim()
}

async function createVoiceGate(minVoiceLevel:number,signal:AbortSignal|undefined,onOpen:()=>void){
  if(minVoiceLevel<=0||!navigator.mediaDevices?.getUserMedia){onOpen();return()=>{}}
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});
  const AudioCtx=(window.AudioContext||(window as any).webkitAudioContext);
  if(!AudioCtx){stream.getTracks().forEach(track=>track.stop());onOpen();return()=>{}}
  const context=new AudioCtx();
  const analyser=context.createAnalyser();
  analyser.fftSize=1024;
  const source=context.createMediaStreamSource(stream);
  source.connect(analyser);
  const data=new Uint8Array(analyser.fftSize);
  let raf=0;
  let opened=false;
  const tick=()=>{
    if(signal?.aborted)return;
    analyser.getByteTimeDomainData(data);
    let sum=0;
    for(const value of data){const normalized=(value-128)/128;sum+=normalized*normalized}
    const rms=Math.sqrt(sum/data.length);
    if(rms>=minVoiceLevel){
      opened=true;
      onOpen();
      return;
    }
    raf=requestAnimationFrame(tick);
  };
  tick();
  return()=>{
    cancelAnimationFrame(raf);
    stream.getTracks().forEach(track=>track.stop());
    void context.close().catch(()=>undefined);
  };
}

export async function listenOnce({timeoutMs=30000,silenceMs=3000,signal,onTranscript,minVoiceLevel=0}:ListenOptions={}):Promise<SpeechResult>{
  return new Promise((resolve,reject)=>{
    const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    if(!SR){reject(new Error('Spracherkennung wird von diesem Browser nicht unterstützt.'));return}
    if(signal?.aborted){reject(abortError());return}

    const recognition=new SR();
    let settled=false;
    let resultSegments:string[]=[];
    let lastReportedTranscript='';
    let silenceTimer:number|undefined;
    let voiceOpen=minVoiceLevel<=0;
    let closeGate=()=>{};
    let recognitionStarted=false;

    const fullTranscript=()=>mergeSegments(resultSegments);
    const processHeard=()=>{
      if(!voiceOpen||settled)return;
      const heard=fullTranscript();
      if(!heard||heard===lastReportedTranscript)return;
      lastReportedTranscript=heard;
      onTranscript?.(heard);
      clearTimeout(silenceTimer);
      silenceTimer=window.setTimeout(complete,silenceMs);
    };
    const clean=()=>{clearTimeout(overallTimer);clearTimeout(silenceTimer);signal?.removeEventListener('abort',onAbort);closeGate()};
    const finish=(fn:()=>void)=>{if(settled)return;settled=true;clean();try{recognition.stop()}catch{}fn()};
    const complete=()=>finish(()=>{const text=fullTranscript();text?resolve({text}):reject(new Error('Keine Sprache erkannt. Bitte erneut versuchen.'))});
    const start=()=>{if(settled||signal?.aborted||recognitionStarted)return;try{recognition.start();recognitionStarted=true}catch{}};
    const restart=()=>{recognitionStarted=false;window.setTimeout(start,50)};
    const onAbort=()=>finish(()=>reject(abortError()));
    const overallTimer=window.setTimeout(complete,timeoutMs);

    recognition.lang='de-DE';recognition.continuous=true;recognition.interimResults=true;recognition.maxAlternatives=1;
    recognition.onstart=()=>{recognitionStarted=true};
    recognition.onresult=(event:any)=>{
      resultSegments=Array.from(event.results||[]).map((result:any)=>String(result?.[0]?.transcript||''));
      processHeard();
    };
    recognition.onend=()=>{
      if(settled)return;
      const text=fullTranscript();
      if(voiceOpen&&text)finish(()=>resolve({text}));
      else restart();
    };
    recognition.onerror=(event:any)=>{
      if(settled)return;
      if(event?.error==='no-speech'){restart();return}
      if(event?.error==='aborted'&&signal?.aborted){onAbort();return}
      finish(()=>reject(new Error(event?.error==='not-allowed'?'Mikrofonzugriff wurde nicht erlaubt.':'Spracheingabe fehlgeschlagen.')));
    };
    signal?.addEventListener('abort',onAbort,{once:true});

    // Start browser speech recognition immediately so the first words are buffered.
    start();

    // Loudness gate runs in parallel and only decides when buffered speech is accepted.
    void createVoiceGate(minVoiceLevel,signal,()=>{
      voiceOpen=true;
      processHeard();
    }).then(close=>{closeGate=close}).catch(()=>{
      voiceOpen=true;
      processHeard();
    });
  })
}

export function speak(text:string,signal?:AbortSignal):Promise<void>{
  if(!('speechSynthesis'in window))return Promise.resolve();
  if(signal?.aborted)return Promise.reject(abortError());
  return new Promise((resolve,reject)=>{
    stopSpeaking();
    const utterance=new SpeechSynthesisUtterance(text);let finished=false;
    let watchdog:number|undefined;
    const clean=()=>{clearTimeout(watchdog);signal?.removeEventListener('abort',onAbort);if(activeSpeechStop===finish)activeSpeechStop=null};
    const finish=()=>{if(finished)return;finished=true;clean();resolve()};
    const onAbort=()=>{if(finished)return;finished=true;clean();window.speechSynthesis.cancel();reject(abortError())};
    watchdog=window.setTimeout(finish,Math.min(12000,Math.max(4000,text.length*90)));
    utterance.lang='de-DE';utterance.onend=finish;utterance.onerror=finish;
    activeSpeechStop=finish;
    signal?.addEventListener('abort',onAbort,{once:true});
    window.speechSynthesis.speak(utterance)
  })
}

export function stopSpeaking(){
  const finish=activeSpeechStop;
  activeSpeechStop=null;
  if('speechSynthesis'in window)window.speechSynthesis.cancel();
  finish?.()
}
