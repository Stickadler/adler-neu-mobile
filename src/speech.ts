export type SpeechResult={text:string};
export type ListenOptions={timeoutMs?:number;silenceMs?:number;signal?:AbortSignal};

function abortError(){return new DOMException('Eingabe abgebrochen.','AbortError')}

export function speechSupported(){return Boolean((window as any).SpeechRecognition||(window as any).webkitSpeechRecognition)}

export function listenOnce({timeoutMs=30000,silenceMs=5000,signal}:ListenOptions={}):Promise<SpeechResult>{
  return new Promise((resolve,reject)=>{
    const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    if(!SR){reject(new Error('Spracherkennung wird von diesem Browser nicht unterstützt.'));return}
    if(signal?.aborted){reject(abortError());return}

    const recognition=new SR();
    let settled=false;
    let completedTranscript='';
    let currentTranscript='';
    let silenceTimer:number|undefined;
    let restartTimer:number|undefined;
    const clean=()=>{clearTimeout(overallTimer);clearTimeout(silenceTimer);clearTimeout(restartTimer);signal?.removeEventListener('abort',onAbort)};
    const finish=(fn:()=>void)=>{if(settled)return;settled=true;clean();try{recognition.stop()}catch{}fn()};
    const fullTranscript=()=>[completedTranscript,currentTranscript].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
    const complete=()=>finish(()=>{const text=fullTranscript();text?resolve({text}):reject(new Error('Keine Sprache erkannt. Bitte erneut versuchen.'))});
    const start=()=>{if(settled||signal?.aborted)return;try{recognition.start()}catch{}};
    const onAbort=()=>finish(()=>reject(abortError()));
    const overallTimer=window.setTimeout(complete,timeoutMs);

    recognition.lang='de-DE';recognition.continuous=true;recognition.interimResults=true;recognition.maxAlternatives=1;
    recognition.onresult=(event:any)=>{
      currentTranscript=Array.from(event.results||[]).map((result:any)=>String(result?.[0]?.transcript||'')).join(' ').replace(/\s+/g,' ').trim();
      clearTimeout(silenceTimer);
      if(fullTranscript())silenceTimer=window.setTimeout(complete,silenceMs);
    };
    recognition.onend=()=>{
      if(settled)return;
      if(currentTranscript){completedTranscript=fullTranscript();currentTranscript=''}
      restartTimer=window.setTimeout(start,200)
    };
    recognition.onerror=(event:any)=>{
      if(settled)return;
      if(event?.error==='no-speech')return;
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
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(text);let finished=false;
    const clean=()=>signal?.removeEventListener('abort',onAbort);
    const finish=()=>{if(finished)return;finished=true;clean();resolve()};
    const onAbort=()=>{if(finished)return;finished=true;clean();window.speechSynthesis.cancel();reject(abortError())};
    utterance.lang='de-DE';utterance.onend=finish;utterance.onerror=finish;
    signal?.addEventListener('abort',onAbort,{once:true});
    window.speechSynthesis.speak(utterance)
  })
}
