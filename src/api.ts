import type{Employee,EntryKind,EntryPayload}from'./types';

const base=(import.meta.env.VITE_ADLER_API_URL||'').replace(/\/$/,'');
const chunkSize=700*1024;

type BridgeResponse={type:'adler-api-response';id:string;ok:boolean;status:number;text:string};

function bridgeRequest<T>(path:string,init?:RequestInit):Promise<T>{
  return new Promise((resolve,reject)=>{
    const id=crypto.randomUUID();
    const timeout=window.setTimeout(()=>{
      window.removeEventListener('message',onMessage);
      reject(new Error('API-Verbindung zur Hauptanwendung hat nicht geantwortet.'));
    },20000);
    const onMessage=(event:MessageEvent)=>{
      const message=event.data as BridgeResponse;
      if(message?.type!=='adler-api-response'||message.id!==id)return;
      window.clearTimeout(timeout);
      window.removeEventListener('message',onMessage);
      let data:any={};
      try{data=message.text?JSON.parse(message.text):{}}catch{data=message.text}
      if(!message.ok){
        reject(new Error((data&&typeof data==='object'&&data.error)||`API ${message.status}`));
        return;
      }
      resolve(data as T);
    };
    window.addEventListener('message',onMessage);
    window.parent.postMessage({
      type:'adler-api-request',
      id,
      path,
      method:init?.method||'GET',
      headers:init?.headers||{},
      body:init?.body||null,
    },'*');
  });
}

async function request<T>(path:string,init?:RequestInit):Promise<T>{
  if(window.parent!==window)return bridgeRequest<T>(path,init);
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
    await request(`/api/${resource}/${entryId}/images?uploadId=${uploadId}&part=${part}`,{method:'POST',body:chunk,headers:{'content-type':'application/octet-stream'}});
  }
  const result=await request<{image:{id:number}}>(`/api/${resource}/${entryId}/images?complete=1`,{method:'POST',body:JSON.stringify({uploadId,totalChunks,filename:file.name,contentType:file.type||'image/jpeg'}),headers:{'content-type':'application/json'}});
  return result.image;
}

export const adlerApi={
  me:()=>request<{authenticated:true;email:string;name:string}>('/api/auth/me'),
  employees:async()=>{
    const result=await request<{config:{employees?:Employee[]}}>('/api/form-config');
    return(result.config.employees||[]).filter(employee=>employee.active!==false);
  },
  createEntry:async(kind:EntryKind,data:EntryPayload)=>{
    if(kind==='todo'){
      const result=await request<{card:{id:number}}>('/api/todos',{method:'POST',body:JSON.stringify({title:data.title,description:data.description||'',columnId:'open',dueDate:data.dueDate||'',dueTime:data.dueTime||'',assignedEmployeeId:data.assignedEmployeeId||''}),headers:{'content-type':'application/json'}});
      return{id:result.card.id};
    }
    const result=await request<{note:{id:number}}>('/api/notes',{method:'POST',body:JSON.stringify({title:data.title,description:data.description||'',category:'Allgemein',data:{}}),headers:{'content-type':'application/json'}});
    return{id:result.note.id};
  },
  uploadImage,
};
