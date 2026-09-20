export type SpeechResult={text:string};
export function speechSupported(){return Boolean((window as any).SpeechRecognition||(window as any).webkitSpeechRecognition)}

export function listenOnce(timeoutMs=15000):Promise<SpeechResult>{
  return new Promise((resolve,reject)=>{
    const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    if(!SR){reject(new Error('Spracherkennung wird von diesem Browser nicht unterstützt.'));return}
    const recognition=new SR();let settled=false;
    const finish=(fn:()=>void)=>{if(settled)return;settled=true;clearTimeout(timer);fn()};
    const timer=window.setTimeout(()=>{try{recognition.stop()}catch{}finish(()=>reject(new Error('Keine Sprache erkannt. Bitte erneut versuchen.')))},timeoutMs);
    recognition.lang='de-DE';recognition.interimResults=false;recognition.maxAlternatives=1;
    recognition.onerror=(event:any)=>finish(()=>reject(new Error(event?.error==='not-allowed'?'Mikrofonzugriff wurde nicht erlaubt.':'Spracheingabe fehlgeschlagen.')));
    recognition.onnomatch=()=>finish(()=>reject(new Error('Ich habe dich nicht verstanden. Bitte erneut versuchen.')));
    recognition.onresult=(event:any)=>{const text=String(event.results?.[0]?.[0]?.transcript||'').trim();finish(()=>text?resolve({text}):reject(new Error('Keine Sprache erkannt. Bitte erneut versuchen.')))};
    try{recognition.start()}catch{finish(()=>reject(new Error('Spracheingabe konnte nicht gestartet werden.')))}
  })
}

export function speak(text:string):Promise<void>{
  if(!('speechSynthesis'in window))return Promise.resolve();
  return new Promise(resolve=>{
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(text);let finished=false;
    const finish=()=>{if(finished)return;finished=true;resolve()};
    utterance.lang='de-DE';utterance.onend=finish;utterance.onerror=finish;
    window.speechSynthesis.speak(utterance)
  })
}
