// Experimental, limited to sessions 1, 3, 5 and 13. Not registered by the site.
const prefix='danna-offline-prototype-';
const metaName=prefix+'metadata';
let snapshotBusy=false;
const markerFor=value=>{
 const url=new URL(value,self.location.origin);
 const films={'/deep-learning/animations/backpropagation/':'s03','/deep-learning/animations/convolution/':'s05','/deep-learning/animations/convolution-code/':'s05','/deep-learning/animations/attention/':'s13'};
 if(films[url.pathname])return `/deep-learning/terms/spring-2026/${films[url.pathname]}/slides/`;
 const match=url.pathname.match(/^\/deep-learning\/terms\/spring-2026\/(s01|s03|s05|s13)\/(?:slides|practice)\//);
 return match?`/deep-learning/terms/spring-2026/${match[1]}/slides/`:null;
};
const hex=bytes=>Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{
 if(event.data?.type!=='snapshot'||!event.ports[0])return;
 const port=event.ports[0];
 if(snapshotBusy){port.postMessage({ok:false,error:'snapshot busy'});return;}
 snapshotBusy=true;
 event.waitUntil((async()=>{
  const {entries,id}=event.data;
  const marker=event.source?.url&&markerFor(event.source.url);
  if(!marker)throw Error('unsupported session');
  if(!/^[a-f0-9]{64}$/.test(id)||!Array.isArray(entries)||!entries.length)throw Error('invalid manifest');
  const canonical=JSON.stringify(entries.map(({sha256,url})=>({sha256,url})));
  if(hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical)))!==id)throw Error('manifest identity mismatch');
  const name=prefix+id;
  const metadata=await caches.open(metaName);
  const prior=await metadata.match(new Request(new URL(marker,self.location.origin)));
  if(prior && await prior.text()===name)throw Error('snapshot already active');
  await caches.delete(name);
  const cache=await caches.open(name);
  try{
   let written=0;
   for(const {url,sha256} of entries){
    if(event.data.testFailureAfter===written)throw new DOMException('Simulated failure',event.data.testFailureName||'QuotaExceededError');
    const target=new URL(url,self.location.origin);
    if(target.origin!==self.location.origin||!/^([a-f0-9]{64})$/.test(sha256)||!target.pathname.startsWith('/'))throw Error('invalid entry');
    const response=await fetch(target.href,{cache:'no-store'});
    if(!response.ok||response.status!==200||response.type==='opaque')throw Error('asset unavailable');
    const bytes=await response.clone().arrayBuffer();
    if(hex(await crypto.subtle.digest('SHA-256',bytes))!==sha256)throw Error('asset identity mismatch');
    await cache.put(target.href,response);written++;
   }
   await metadata.put(new Request(new URL(marker,self.location.origin)),new Response(name));
   port.postMessage({ok:true,id});
  }catch(error){await caches.delete(name);port.postMessage({ok:false,error:String(error)});}
 })().catch(error=>port.postMessage({ok:false,error:String(error)})).finally(()=>{snapshotBusy=false;}));
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.endsWith('.pdf')||request.headers.has('range'))return;
 event.respondWith((async()=>{
  try{return await fetch(request);}catch{
   const client=event.clientId?await self.clients.get(event.clientId):null;
   const marker=request.mode==='navigate'?markerFor(request.url):client?.url&&markerFor(client.url);
   if(!marker)return Response.error();
   const metadata=await caches.open(metaName);
   const pointer=await metadata.match(new Request(new URL(marker,self.location.origin)));
   if(!pointer)return Response.error();
   const cache=await caches.open(await pointer.text());
   return await cache.match(request)||Response.error();
  }
 })());
});
