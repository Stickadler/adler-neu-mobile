import type{Employee}from'./types';
export type AssigneeResolution={status:'none'|'matched'|'ambiguous'|'missing';employee?:Employee;candidates?:Employee[]};
const norm=(v:string)=>v.trim().toLocaleLowerCase('de-DE');
const clean=(value:string)=>norm(value).replace(/[.,;:!?]/g,' ').replace(/\b(?:bitte|mitarbeiter|kollege|kollegin|an|für|der|die|den|dem|zuweisen|geben)\b/g,' ').replace(/\s+/g,' ').trim();
export function resolveAssignee(name:string|undefined,employees:Employee[]):AssigneeResolution{
  if(!name)return{status:'none'};
  const n=clean(name),active=employees.filter(e=>e.active);
  const exact=active.filter(e=>clean(e.name)===n);
  if(exact.length===1)return{status:'matched',employee:exact[0]};
  if(exact.length>1)return{status:'ambiguous',candidates:exact};
  const contained=active.filter(e=>n.includes(clean(e.name))||clean(e.name).includes(n));
  if(contained.length===1)return{status:'matched',employee:contained[0]};
  if(contained.length>1)return{status:'ambiguous',candidates:contained};
  const spokenWords=new Set(n.split(/\s+/).filter(Boolean));
  const first=active.filter(e=>spokenWords.has(clean(e.name).split(/\s+/)[0]));
  if(first.length===1)return{status:'matched',employee:first[0]};
  if(first.length>1)return{status:'ambiguous',candidates:first};
  return{status:'missing'};
}
export function resolveAssigneeFromText(text:string,employees:Employee[]):AssigneeResolution{
  const normalized=norm(text),active=employees.filter(e=>e.active);
  const afterCue=(normalized.match(/\b(?:mitarbeiter|kollege|kollegin|an|für)\s+([^,.;]+?)(?=\s+(?:zuweisen|geben|heute|morgen|übermorgen|am|um|fällig|bis)\b|[,.;]|$)/)||[])[1];
  if(afterCue){
    const resolved=resolveAssignee(afterCue,active);
    if(resolved.status!=='missing'&&resolved.status!=='none')return resolved;
  }
  const mentioned=active.filter(employee=>{
    const full=clean(employee.name),first=full.split(/\s+/)[0];
    return normalized.includes(full)||new RegExp(`\\b${first.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}\\b`,'i').test(normalized);
  });
  if(mentioned.length===1)return{status:'matched',employee:mentioned[0]};
  if(mentioned.length>1)return{status:'ambiguous',candidates:mentioned};
  return{status:'missing'};
}
