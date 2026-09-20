import React,{useEffect,useRef,useState}from'react';
import{createRoot}from'react-dom/client';
import{Mic,CheckSquare,StickyNote,Camera,UserRound,CalendarDays,Clock3,X,Volume2,VolumeX,Save as SaveIcon}from'lucide-react';
import'./styles.css';
import{parseVoice}from'./voiceParser';
import{listenOnce,speak,stopSpeaking}from'./speech';
import{adlerApi}from'./api';
import{resolveAssignee}from'./assigneeResolver';
import{parseVoiceDecision}from'./voiceDecision';
import type{VoiceDraft,EntryKind,Employee,EntryPayload}from'./types';

type GuideStep='idle'|'title'|'descriptionChoice'|'description'|'dueChoice'|'due'|'dueTimeChoice'|'dueTime'|'assigneeChoice'|'assignee'|'confirm';

function formatDate(value?:string){
  if(!value)return'';
  return new Date(value+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})
}
const yes=(text:string)=>/^(ja|ja bitte|gerne|okay|ok)\b/i.test(text.trim());
const isAbort=(error:unknown)=>error instanceof DOMException&&error.name==='AbortError';

function App(){
  const[status,setStatus]=useState('Bereit');
  const[draft,setDraft]=useState<VoiceDraft|null>(null);
  const[files,setFiles]=useState<File[]>([]);
  const[employees,setEmployees]=useState<Employee[]>([]);
  const[selectedEmployeeId,setSelectedEmployeeId]=useState('');
  const[saving,setSaving]=useState(false);
  const[listening,setListening]=useState(false);
  const[voicePrompts,setVoicePrompts]=useState(()=>localStorage.getItem('adler-voice-prompts')!=='off');
  const[guide,setGuide]=useState<GuideStep>('idle');
  const camera=useRef<HTMLInputElement>(null);
  const activeInput=useRef<AbortController|null>(null);
  const voicePromptsRef=useRef(voicePrompts);

  useEffect(()=>{adlerApi.employees().then(setEmployees).catch(()=>setStatus('Entwurfsmodus – Adler API noch nicht erreichbar.'))},[]);
  useEffect(()=>{
    if(!draft?.assigneeName||!employees.length){setSelectedEmployeeId('');return}
    const resolution=resolveAssignee(draft.assigneeName,employees);
    if(resolution.status==='matched')setSelectedEmployeeId(resolution.employee!.id);
    else{
      setSelectedEmployeeId('');
      if(resolution.status==='ambiguous')setStatus('Mitarbeitername ist mehrdeutig – bitte auswählen.');
      if(resolution.status==='missing')setStatus('Mitarbeiter wurde nicht gefunden – bitte auswählen.');
    }
  },[draft?.assigneeName,employees]);

  const beginInput=()=>{
    activeInput.current?.abort();
    const controller=new AbortController();
    activeInput.current=controller;
    return controller
  };
  const hear=async(controller:AbortController)=>{
    setListening(true);
    setStatus('Ich höre zu … Sprich in Ruhe.');
    try{return(await listenOnce({timeoutMs:30000,silenceMs:3000,signal:controller.signal,onTranscript:text=>setStatus(`Erkannt: „${text}“ – ich warte 3 Sekunden.`)})).text}
    finally{if(activeInput.current===controller)setListening(false)}
  };
  const ask=async(text:string,controller:AbortController)=>{
    setStatus(text);
    if(voicePromptsRef.current)await speak(text,controller.signal);
    else await new Promise(resolve=>window.setTimeout(resolve,200));
    return hear(controller)
  };
  const toggleVoicePrompts=()=>{
    const enabled=!voicePromptsRef.current;
    voicePromptsRef.current=enabled;
    setVoicePrompts(enabled);
    localStorage.setItem('adler-voice-prompts',enabled?'on':'off');
    if(!enabled)stopSpeaking();
  };
  const cancelInput=()=>{
    const controller=activeInput.current;
    activeInput.current=null;
    controller?.abort();
    stopSpeaking();
    setListening(false);
    setGuide('idle');
    setStatus('Eingabe abgebrochen.');
  };
  const discardDraft=()=>{
    cancelInput();
    setDraft(null);
    setFiles([]);
    setSelectedEmployeeId('');
    setStatus('Eingabe verworfen.');
  };
  async function save(entryDraft:VoiceDraft|null=draft,entryFiles:File[]=files,employeeId=selectedEmployeeId){
    if(!entryDraft?.kind||!entryDraft.title)return;
    setSaving(true);setStatus('Wird gespeichert …');
    try{
      const payload:EntryPayload={title:entryDraft.title,description:entryDraft.description||undefined,dueDate:entryDraft.dueDate,dueTime:entryDraft.dueTime,assignedEmployeeId:employeeId||undefined};
      const entry=await adlerApi.createEntry(entryDraft.kind,payload);
      for(const file of entryFiles)await adlerApi.uploadImage(entryDraft.kind,entry.id,file);
      const message=entryDraft.kind==='todo'?'Aufgabe gespeichert.':'Pinnwand-Notiz gespeichert.';
      setStatus(message);if(voicePromptsRef.current)void speak(message);setDraft(null);setFiles([]);setSelectedEmployeeId('');
    }catch(error){setStatus(error instanceof Error?error.message:'Speichern fehlgeschlagen.')}
    finally{setSaving(false)}
  }
  const saveManually=()=>{cancelInput();void save()};
  const finishByVoice=async(command:string,entryDraft:VoiceDraft,controller:AbortController)=>{
    const decision=parseVoiceDecision(command);
    if(decision==='discard'){
      setDraft(null);setFiles([]);setSelectedEmployeeId('');setStatus('Eingabe verworfen.');
      if(voicePromptsRef.current)await speak('Eingabe verworfen.',controller.signal);
      return
    }
    if(decision==='save'){
      const resolution=resolveAssignee(entryDraft.assigneeName,employees);
      await save(entryDraft,[],resolution.status==='matched'?resolution.employee!.id:'');
      return
    }
    setStatus('Antwort nicht erkannt. Bitte oben Speichern oder Verwerfen wählen.');
    if(voicePromptsRef.current)await speak('Antwort nicht erkannt. Bitte Speichern oder Verwerfen wählen.',controller.signal)
  };
  const quick=async(forced?:EntryKind)=>{
    const controller=beginInput();
    try{
      setFiles([]);setSelectedEmployeeId('');
      const parsed=parseVoice(await hear(controller));
      if(forced){parsed.kind=forced;parsed.needsDestinationChoice=false}
      setDraft(parsed);
      if(parsed.needsDestinationChoice){setGuide('idle');setStatus('Notiz erkannt – Todo oder Pinnwand?');return}
      setGuide('confirm');
      const command=await ask('Eingabe erkannt. Soll ich sie speichern oder verwerfen?',controller);
      await finishByVoice(command,parsed,controller);
      setGuide('idle');
    }catch(error){
      if(activeInput.current!==controller)return;
      setStatus(isAbort(error)?'Eingabe abgebrochen.':error instanceof Error?error.message:'Spracheingabe fehlgeschlagen.');
    }finally{
      if(activeInput.current===controller)activeInput.current=null;
      setListening(false);
    }
  };
  const guided=async()=>{
    const controller=beginInput();
    try{
      setFiles([]);setSelectedEmployeeId('');
      setGuide('title');
      const title=await ask('Wie lautet die Aufgabe?',controller);
      let next:VoiceDraft={kind:'todo',title,needsDestinationChoice:false};
      setDraft(next);

      setGuide('descriptionChoice');
      if(yes(await ask('Möchtest du eine Beschreibung hinzufügen?',controller))){
        setGuide('description');
        next={...next,description:await ask('Bitte sprich die Beschreibung.',controller)};
        setDraft(next)
      }

      setGuide('dueChoice');
      if(yes(await ask('Möchtest du ein Fälligkeitsdatum angeben?',controller))){
        setGuide('due');
        const dueText=await ask('Wann ist die Aufgabe fällig?',controller);
        const parsed=parseVoice('Aufgabe X, fällig '+dueText);
        next={...next,dueDate:parsed.dueDate,dueTime:parsed.dueTime};
        setDraft(next);
        if(parsed.dueDate&&!parsed.dueTime){
          setGuide('dueTimeChoice');
          if(yes(await ask('Möchtest du eine Uhrzeit angeben?',controller))){
            setGuide('dueTime');
            const timeText=await ask('Um wie viel Uhr?',controller);
            const withTime=parseVoice('Aufgabe X um '+timeText);
            next={...next,dueTime:withTime.dueTime};
            setDraft(next)
          }
        }
      }

      setGuide('assigneeChoice');
      if(yes(await ask('Möchtest du die Aufgabe einem Mitarbeiter zuweisen?',controller))){
        setGuide('assignee');
        next={...next,assigneeName:await ask('Welchem Mitarbeiter?',controller)};
        setDraft(next)
      }
      setGuide('confirm');
      const command=await ask('Die Aufgabe ist vollständig. Soll ich sie speichern oder verwerfen?',controller);
      await finishByVoice(command,next,controller);
      setGuide('idle');
    }catch(error){
      if(activeInput.current!==controller)return;
      setGuide('idle');
      setStatus(isAbort(error)?'Eingabe abgebrochen.':error instanceof Error?error.message:'Geführte Eingabe abgebrochen.');
    }finally{
      if(activeInput.current===controller)activeInput.current=null;
      setListening(false);
    }
  };

  const choose=(kind:EntryKind)=>draft&&setDraft({...draft,kind,needsDestinationChoice:false});

  const inputActive=listening||guide!=='idle';
  return <>
    <header className="app-header">
      <div className="brand"><img src={import.meta.env.BASE_URL+'adler-logo.png'} alt="Adler Neu"/><div><strong>Adler Neu</strong><span>Mobile App</span></div></div>
      <button className="voice-toggle" onClick={toggleVoicePrompts} aria-label={voicePrompts?'Sprachausgabe stummschalten':'Sprachausgabe einschalten'} title={voicePrompts?'Sprachausgabe an':'Sprachausgabe aus'}>{voicePrompts?<Volume2/>:<VolumeX/>}<span>{voicePrompts?'Ton an':'Stumm'}</span></button>
    </header>
    <main>
      <section className="hero">
        <button className={`mic${listening?' listening':''}`} onClick={()=>inputActive?cancelInput():quick()} aria-label={inputActive?'Spracheingabe abbrechen':'Spracheingabe starten'}>{inputActive?<X size={42}/>:<Mic size={42}/>}</button>
        <h1>Spracheingabe</h1>
        <p aria-live="polite">{status}</p>
        {inputActive&&<div className="active-dialog"><span className="badge">{listening?'Ich höre zu':'Geführter Dialog aktiv'}</span><button className="cancel-listening" onClick={cancelInput}>Abbrechen</button></div>}
      </section>

      <section className="actions">
        <button onClick={()=>quick('todo')} disabled={inputActive}><CheckSquare/>Schnelle Aufgabe</button>
        <button onClick={()=>quick('pinboard')} disabled={inputActive}><StickyNote/>Pinnwand-Notiz</button>
        <button onClick={()=>setStatus('Termin eintragen ist vorbereitet und wird mit dem Adler-Neu-Kalender verbunden.')} disabled={inputActive}><CalendarDays/>Termin eintragen</button>
        <button className="guided-action" onClick={guided} disabled={inputActive}><Mic/>Geführte Aufgabe</button>
      </section>

      {draft&&<section className="card">
        <div className="card-title"><h2>Eintrag prüfen</h2><div className="card-heading-actions"><button className="top-save" disabled={saving||!draft.kind||!draft.title} onClick={saveManually}><SaveIcon size={17}/> Speichern</button><button className="discard" onClick={discardDraft}><X size={17}/> Verwerfen</button></div></div>
        {draft.needsDestinationChoice&&<div className="choice"><button onClick={()=>choose('todo')}>Todo</button><button onClick={()=>choose('pinboard')}>Pinnwand</button></div>}
        <label>Titel<input value={draft.title} onChange={event=>setDraft({...draft,title:event.target.value})}/></label>
        <label>Beschreibung<textarea value={draft.description||''} onChange={event=>setDraft({...draft,description:event.target.value})}/></label>
        {draft.kind==='todo'&&<>
          <div className="date-time">
            <label><span><CalendarDays size={17}/> Fällig am</span><input type="date" value={draft.dueDate||''} onChange={event=>setDraft({...draft,dueDate:event.target.value||undefined,dueTime:event.target.value?draft.dueTime:undefined})}/></label>
            <label><span><Clock3 size={17}/> Uhrzeit</span><input type="time" value={draft.dueTime||''} disabled={!draft.dueDate} onChange={event=>setDraft({...draft,dueTime:event.target.value||undefined})}/></label>
          </div>
          {draft.dueDate&&<p className="due-summary"><CalendarDays/> Fällig: {formatDate(draft.dueDate)}{draft.dueTime&&` um ${draft.dueTime} Uhr`}</p>}
        </>}
        <label><span><UserRound size={17}/> Mitarbeiter</span><select value={selectedEmployeeId} onChange={event=>setSelectedEmployeeId(event.target.value)}><option value="">Nicht zugewiesen</option>{employees.filter(employee=>employee.active).map(employee=><option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
        {draft.assignToSelf&&<p>Zuordnung: angemeldeter Benutzer</p>}
        {draft.assigneeName&&!selectedEmployeeId&&employees.length>0&&<p className="warning">Gesprochen: {draft.assigneeName} – bitte Mitarbeiter bestätigen.</p>}
        <button className="photo" onClick={()=>camera.current?.click()}><Camera/> Bilder hinzufügen {files.length>0?`(${files.length})`:''}</button>
        <input ref={camera} hidden type="file" accept="image/*" capture="environment" multiple onChange={event=>setFiles(Array.from(event.target.files||[]))}/>
        {files.length>0&&<div className="previews">{files.map((file,index)=><div key={file.name+index}>{file.name}<button onClick={()=>setFiles(files.filter((_,itemIndex)=>itemIndex!==index))}>×</button></div>)}</div>}
        <button className="save" disabled={saving||!draft.kind||!draft.title} onClick={saveManually}>{saving?'Speichert …':'Bestätigen & speichern'}</button>
      </section>}
      <footer>Adler Neu · Mobile</footer>
    </main>
  </>
}

if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register(import.meta.env.BASE_URL+'sw.js').catch(()=>{}));
createRoot(document.getElementById('root')!).render(<App/>);
