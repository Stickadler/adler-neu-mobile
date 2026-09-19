import type{Employee}from'./types';
export type AssigneeResolution={status:'none'|'matched'|'ambiguous'|'missing';employee?:Employee;candidates?:Employee[]};
const norm=(v:string)=>v.trim().toLocaleLowerCase('de-DE');
export function resolveAssignee(name:string|undefined,employees:Employee[]):AssigneeResolution{if(!name)return{status:'none'};const n=norm(name);const exact=employees.filter(e=>e.active&&norm(e.displayName)===n);if(exact.length===1)return{status:'matched',employee:exact[0]};if(exact.length>1)return{status:'ambiguous',candidates:exact};const first=employees.filter(e=>e.active&&norm(e.displayName).split(/\s+/)[0]===n);if(first.length===1)return{status:'matched',employee:first[0]};if(first.length>1)return{status:'ambiguous',candidates:first};return{status:'missing'};}
