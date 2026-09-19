import type{Employee,EntryKind}from'./types';
const base=(import.meta.env.VITE_ADLER_API_URL||'').replace(/\/$/,'');
async function request<T>(path:string,init?:RequestInit):Promise<T>{if(!base)throw new Error('API noch nicht konfiguriert');const r=await fetch(base+path,{...init,headers:{'Content-Type':'application/json',...(init?.headers||{})},credentials:'include'});if(!r.ok)throw new Error('API '+r.status);return r.json()}
export const adlerApi={employees:()=>request<Employee[]>('/api/v1/employees?active=true'),createEntry:(kind:EntryKind,data:unknown)=>request(kind==='todo'?'/api/v1/todos':'/api/v1/pinboard/notes',{method:'POST',body:JSON.stringify(data)})};
