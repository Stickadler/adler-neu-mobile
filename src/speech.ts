export type SpeechResult={text:string};
export type ListenOptions={timeoutMs?:number;silenceMs?:number;signal?:AbortSignal;onTranscript?:(text:string)=>void};

let activeSpeechStop:(()=>void)|null=null;

function abortError(){return new DOMException('Eingabe abgebrochen.','AbortError')}

export function speechSupported(){return Boolean((window as any).SpeechRecognition||(window as any).webkitSpeechRecognition)}

export function listenOnce({timeoutMs=30000,silenceMs=3000,signal,onTranscript}:ListenOptions={}):Promise<SpeechResult>{
  return new Promise((resolve,reject)=>{
    const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    if(!SR){reject(new Error('Spracherkennung wird von diesem Browser nicht unterstützt.'));return}
    if(signal?.aborted){reject(abortError());return}

    const recognition=new SR();
    let settled=false;
    let completedTranscript='';
    let currentTranscript='';
    let lastReportedTranscript='';
    let silenceTimer:number|undefined;
    const clean=()=>{clearTimeout(overallTimer);clearTimeout(silenceTimer);signal?.removeEventListener('abort',onAbort)};
    const finish=(fn:()=>void)=>{if(settled)return;settled=true;clean();try{recognition.stop()}catch{}fn()};
    const fullTranscript=()=>[completedTranscript,currentTranscript].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
    const complete=()=>finish(()=>{const text=fullTranscript();text?resolve({text}):reject(new Error('Keine Sprache erkannt. Bitte erneut versuchen.'))});
    const start=()=>{if(settled||signal?.aborted)return;try{recognition.start()}catch{}};
    const onAbort=()=>finish(()=>reject(abortError()));
    const overallTimer=window.setTimeout(complete,timeoutMs);

    recognition.lang='de-DE';recognition.continuous=true;recognition.interimResults=true;recognition.maxAlternatives=1;
    recognition.onresult=(event:any)=>{
      currentTranscript=Array.from(event.results||[]).map((result:any)=>String(result?.[0]?.transcript||'')).join(' ').replace(/\s+/g,' ').trim();
      const heard=fullTranscript();
      if(!heard||heard===lastReportedTranscript)return;
      lastReportedTranscript=heard;
      onTranscript?.(heard);
      clearTimeout(silenceTimer);
      silenceTimer=window.setTimeout(complete,silenceMs);
    };
    recognition.onend=()=>{
      if(settled)return;
      if(currentTranscript){completedTranscript=fullTranscript();currentTranscript=''}
      const text=fullTranscript();
      if(text)finish(()=>resolve({text}));
      else finish(()=>reject(new Error('Keine Sprache erkannt. Bitte erneut starten.')));
    };
    recognition.onerror=(event:any)=>{
      if(settled)return;
      if(event?.error==='no-speech'){
        finish(()=>reject(new Error('Keine Sprache erkannt. Bitte erneut starten.')));
        return;
      }
      if(event?.error==='aborted'&&signal?.aborted){onAbort();return}
      finish(()=>reject(new Error(event?.error==='not-allowed'?'Mikrofonzugriff wurde nicht erlaubt.':'Spracheingabe fehlgeschlagen.')));
    };
    signal?.addEventListener('abort',onAbort,{once:true});
    start();
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
