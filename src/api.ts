import type{Employee,EntryKind,EntryPayload}from'./types';

const base=(import.meta.env.VITE_ADLER_API_URL||'').replace(/\/$/,'');
const chunkSize=700*1024;

async function request<T>(path:string,init?:RequestInit):Promise<T>{
  if(!base)throw new Error('API noch nicht konfiguriert');
  const response=await fetch(base+path,{...init,headers:{...(init?.body instanceof Blob?{}:{'Content-Type':'application/json'}),...(init?.headers||{})},credentials:'include'});
  if(!response.ok){let message=`API ${response.status}`;try{const body=await response.json() as{error?:string};if(body.error)message=body.error}catch{}throw new Error(message)}
  if(response.status===204)return undefined as T;
  return response.json();
}

async function uploadImage(kind:EntryKind,entryId:number,file:File){
  const uploadId=crypto.randomUUID();
  const totalChunks=Math.ceil(file.size/chunkSize);
  const resource=kind==='todo'?'todos':'notes';
  for(let part=0;part<totalChunks;part++){
    const chunk=file.slice(part*chunkSize,Math.min(file.size,(part+1)*chunkSize));
    await request(`/api/${resource}/${entryId}/images?uploadId=${uploadId}&part=${part}`,{method:'POST',body:chunk});
  }
  const result=await request<{image:{id:number}}>(`/api/${resource}/${entryId}/images?complete=1`,{method:'POST',body:JSON.stringify({uploadId,totalChunks,filename:file.name,contentType:file.type||'image/jpeg'})});
  return result.image;
}

export const adlerApi={
  me:()=>request<{authenticated:true;email:string;name:string}>('/api/auth/me'),
  employees:async()=>{const result=await request<{config:{employees?:Employee[]}}>('/api/form-config');return result.config.employees||[]},
  createEntry:async(kind:EntryKind,data:EntryPayload)=>{
    if(kind==='todo'){
      const result=await request<{card:{id:number}}>('/api/todos',{method:'POST',body:JSON.stringify({title:data.title,description:data.description||'',columnId:'open',dueDate:data.dueDate||'',dueTime:data.dueTime||'',assignedEmployeeId:data.assignedEmployeeId||''})});
      return{id:result.card.id};
    }
    const result=await request<{note:{id:number}}>('/api/notes',{method:'POST',body:JSON.stringify({title:data.title,description:data.description||'',category:'Allgemein',data:{}})});
    return{id:result.note.id};
  },
  uploadImage,
};
