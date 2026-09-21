import type { VoiceDraft } from './types';

const weekdays = ['sonntag', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag'];
const numberWords: Record<string, number> = {ein:1,eine:1,einer:1,einem:1,eins:1,zwei:2,drei:3,vier:4,'fünf':5,sechs:6,sieben:7,acht:8,neun:9,zehn:10,elf:11,'zwölf':12};

function iso(date: Date) {const year=date.getFullYear();const month=String(date.getMonth()+1).padStart(2,'0');const day=String(date.getDate()).padStart(2,'0');return `${year}-${month}-${day}`;}
function numberFromText(value:string){return /^\d+$/.test(value)?Number(value):numberWords[value.toLowerCase()];}
function nextWeekday(name:string,now=new Date()){const target=weekdays.indexOf(name.toLowerCase());if(target<0)return undefined;const date=new Date(now);const delta=(target-date.getDay()+7)%7||7;date.setDate(date.getDate()+delta);return iso(date);}

function dueFromText(text:string){
  const lower=text.toLowerCase();const date=new Date();
  if(/\bheute\b/.test(lower))return iso(date);
  if(/\bübermorgen\b/.test(lower)){date.setDate(date.getDate()+2);return iso(date);}
  if(/\bmorgen\b/.test(lower)){date.setDate(date.getDate()+1);return iso(date);}
  const relative=lower.match(/\bin\s+(\d+|ein(?:e[rm]?)?|eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf)\s+(tagen?|wochen?)\b/);
  if(relative){const amount=numberFromText(relative[1]);if(amount){date.setDate(date.getDate()+amount*(relative[2].startsWith('woche')?7:1));return iso(date);}}
  for(const weekday of weekdays){if(new RegExp(`(?:nächsten?\\s+|am\\s+)?${weekday}`,'i').test(lower))return nextWeekday(weekday,date);}
  const explicit=lower.match(/\b(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?\b/);
  if(explicit){let year=explicit[3]?Number(explicit[3]):date.getFullYear();if(year<100)year+=2000;const result=new Date(year,Number(explicit[2])-1,Number(explicit[1]));if(!explicit[3]&&result<date)result.setFullYear(result.getFullYear()+1);return iso(result);}
  return undefined;
}

function timeFromText(text:string){
  const normalized=text.toLowerCase().replace(/\s+/g,' ').trim();
  const numeric=normalized.match(/\b(?:um\s+)?([01]?\d|2[0-3])(?::|\.)([0-5]\d)\s*(?:uhr)?\b/i)||normalized.match(/\bum\s+([01]?\d|2[0-3])(?:\s*uhr)?\b/i);
  if(numeric)return `${String(Number(numeric[1])).padStart(2,'0')}:${numeric[2]||'00'}`;
  const half=normalized.match(/\bhalb\s+(eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf)\b/i);
  if(half){
    const next=numberWords[half[1]];
    const hour=(next===1?12:next-1);
    return `${String(hour).padStart(2,'0')}:30`;
  }
  const word=normalized.match(/\bum\s+(eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf)(?:\s*uhr)?\b/i);
  if(word){
    const hour=numberWords[word[1]];
    return `${String(hour).padStart(2,'0')}:00`;
  }
  return undefined;
}

function assigneeFromText(text:string){
  if(/\b(?:für|an)\s+mich\b/i.test(text))return{self:true};
  const labelled=text.match(/\b(?:mitarbeiter|kollege|kollegin)\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]+(?:\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]+)?)/i);
  if(labelled)return{name:labelled[1]};
  const assigned=text.match(/\b(?:an|für)\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]+(?:\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]+)?)(?=\s*(?:zuweisen|geben|heute|morgen|übermorgen|am\b|um\b|fällig\b|bis\b|$|[,.;]))/i);
  if(assigned)return{name:assigned[1]};
  const prefix=text.match(/^([A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]+(?:\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]+)?)\s+soll\b/);
  if(prefix)return{name:prefix[1]};
  const suffix=text.match(/\b([A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]+(?:\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]+)?)\s+zuweisen\b/i);
  return suffix?{name:suffix[1]}:{};
}

function stripDateTime(text:string){
  return text
    .replace(/\b(?:fällig\s+)?(?:heute|morgen|übermorgen)\b/gi,' ')
    .replace(/\b(?:fällig\s+)?(?:am\s+)?(?:montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/gi,' ')
    .replace(/\b(?:fällig\s+)?(?:am\s+)?\d{1,2}\.\d{1,2}(?:\.\d{2,4})?\b/gi,' ')
    .replace(/\bin\s+(?:\d+|ein(?:e[rm]?)?|eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf)\s+(?:tagen?|wochen?)\b/gi,' ')
    .replace(/\b(?:um\s+)?(?:[01]?\d|2[0-3])(?::|\.)[0-5]\d\s*(?:uhr)?\b/gi,' ')
    .replace(/\bum\s+(?:[01]?\d|2[0-3])(?:\s*uhr)?\b/gi,' ')
    .replace(/\bhalb\s+(?:eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf)\b/gi,' ')
    .replace(/\bum\s+(?:eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf)(?:\s*uhr)?\b/gi,' ');
}

function titleFromText(text:string){
  return stripDateTime(text)
    .replace(/^(schnelle\s+)?(aufgabe|todo|erinnerung|notiz|pinnwandnotiz)\s*:?\s*/i,'')
    .replace(/^([A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]+(?:\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]+)?)\s+soll\s+/i,'')
    .replace(/,?\s*beschreibung\s+.*$/i,'')
    .replace(/\b(?:für|an)\s+mich\b/gi,' ')
    .replace(/\b(?:mitarbeiter|kollege|kollegin)\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]+(?:\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]+)?/gi,' ')
    .replace(/\b(?:an|für)\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]+(?:\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]+)?\s*(?:zuweisen|geben)?(?=\s*(?:heute|morgen|übermorgen|am\b|um\b|fällig\b|bis\b|$|[,.;]))/gi,' ')
    .replace(/\b[A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]+(?:\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]+)?\s+zuweisen\b/gi,' ')
    .replace(/\b(?:fällig|bis)\b/gi,' ')
    .replace(/[,:;]+\s*$/g,'')
    .replace(/\s{2,}/g,' ')
    .trim();
}
export function parseVoice(raw:string):VoiceDraft{
  const text=raw.trim(),lower=text.toLowerCase();let kind:VoiceDraft['kind']=null;
  if(/pinnwand|pinnwandnotiz|notiz für die pinnwand/.test(lower))kind='pinboard';
  else if(/\b(aufgabe|todo|erinnerung)\b/.test(lower)||/notiz als todo|todo-notiz/.test(lower))kind='todo';
  const plainNote=/^(schnelle\s+)?notiz\b/i.test(text)&&!kind;
  const description=(text.match(/beschreibung\s+(.+?)(?=,?\s*(?:fällig|bis|für)\b|$)/i)||[])[1];
  const assignee=assigneeFromText(text);
  return{kind,title:titleFromText(text),description,dueDate:dueFromText(text),dueTime:timeFromText(text),assigneeName:assignee.name,assignToSelf:assignee.self,needsDestinationChoice:plainNote};
}
