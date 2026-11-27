import {metadataPlan,parseIcecast,parseShoutcast,parseShoutcastV1,parseAzuraCast} from './metadata-adapters.mjs';
const parsers={'icecast-chat-json':parseIcecast,'shoutcast-v2':parseShoutcast,'shoutcast-v1':parseShoutcastV1,'azuracast-nowplaying':parseAzuraCast};
const preferred=new Map();
export async function discoverMetadata(url,headers,{fetcher=fetch,icyReader,timeout=2500,hint}={}){
 const plan=metadataPlan(url,headers),attempts=[];
 const methods=[...plan.methods];
 const remembered=preferred.get(url)||hint;
 if(remembered&&methods.includes(remembered)){methods.splice(methods.indexOf(remembered),1);methods.unshift(remembered)}
 for(const method of methods){
  try{
   let result=null;
   if(method==='icy'&&icyReader)result=await icyReader(url);
   else if(parsers[method]){
    // V1 has no reliable SID selection; never use it for an explicit non-default SID.
    if(method==='shoutcast-v1'&&plan.sid&&plan.sid!=='1')continue;
    const response=await fetcher(plan.endpoints[method],{redirect:'manual',signal:AbortSignal.timeout(timeout),headers:{Accept:method==='shoutcast-v1'?'text/html':'application/json'}});
    if(!response.ok)throw Error('http_'+response.status);
    const body=await response.text();
    if(body.length>100000)throw Error('response_too_large');
    result=parsers[method](method==='shoutcast-v1'?body:JSON.parse(body),url);
   }else{attempts.push({method,status:'not-implemented'});continue}
   if(result?.title&&(!result.status||result.status==='ok')&&!/^(unknown|onbekend|live stream|advertisement|reclame)$/i.test(result.title.trim())){
    preferred.set(url,method);if(preferred.size>500)preferred.delete(preferred.keys().next().value);
    return {...result,status:'ok',platform:plan.platform,format:plan.format,attempts:[...attempts,{method,status:'ok'}]};
   }
   attempts.push({method,status:'empty'});
  }catch(e){attempts.push({method,status:'failed',code:String(e?.message||'error').slice(0,80)})}
 }
 return {status:'unavailable',platform:plan.platform,format:plan.format,attempts};
}
