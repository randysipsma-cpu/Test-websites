const SOURCE='https://www.radioviainternet.nl/radiocarousel';
function candidatesFrom(text,base){const found=new Set();const decoded=text.replaceAll('\\/','/').replaceAll('&amp;','&');const urls=decoded.match(/https?:[^\s"'<>\\]+/gi)||[];for(const raw of urls){try{const u=new URL(raw.replace(/[),;]+$/,''),base);if(u.protocol!=='https:')continue;if(/\.(mp3|aac|ogg|m3u8?|pls)(?:[?#]|$)|\/(stream|listen|live)(?:[/?#]|$)/i.test(u.href))found.add(u.href)}catch{}}return [...found].slice(0,20)}
async function icyNowPlaying(streamUrl){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10500);let reader;
 try{
  const response=await fetch(streamUrl,{headers:{'Icy-MetaData':'1','Accept':'*/*'},redirect:'manual',signal:controller.signal});
  if(!response.ok||!response.body)throw Error('Stream niet bereikbaar');
  const interval=Number(response.headers.get('icy-metaint'));
  if(!Number.isInteger(interval)||interval<1||interval>262144)return {status:'unsupported',source:'icy',code:'icy_header_missing',message:'Deze stream biedt geen ICY-metadatablokken aan.'};
  reader=response.body.getReader();
  let buffer=new Uint8Array(0),readBytes=0,empty=0,blocks=0;
  const maxBytes=Math.min(1600000,Math.max(interval*5+20480,327680));
  async function take(count){
   while(buffer.length<count){
    if(readBytes>=maxBytes)return null;
    const chunk=await reader.read();if(chunk.done)return null;
    readBytes+=chunk.value.length;
    if(readBytes>maxBytes)return null;
    const joined=new Uint8Array(buffer.length+chunk.value.length);joined.set(buffer);joined.set(chunk.value,buffer.length);buffer=joined;
   }
   const part=buffer.subarray(0,count);buffer=buffer.slice(count);return part;
  }
  for(let i=0;i<5;i++){
   if(!await take(interval))break;
   const len=await take(1);if(!len)break;
   blocks++;const size=len[0]*16;
   if(!size){empty++;continue}
   const bytes=await take(size);if(!bytes)break;
   const raw=new TextDecoder('utf-8').decode(bytes).replace(/\0+$/g,'');
   const match=raw.match(/StreamTitle=(['"])(.*?)\1(?:;|$)/i);
   const title=match?.[2]?.trim();
   if(title)return {status:'ok',source:'icy',title:title.slice(0,200),blocksChecked:blocks};
  }
  return {status:'unavailable',source:'icy',code:empty===blocks?'empty_icy_blocks':'no_stream_title',blocksChecked:blocks,message:blocks?'Geen actuele titel gevonden in '+blocks+' opeenvolgende ICY-blokken.':'Geen volledig ICY-metadatablok ontvangen.'};
 }finally{clearTimeout(timer);try{await reader?.cancel()}catch{}}
}
// Generic metadata adapters. Only probe the already-verified stream origin; never follow redirects.
async function jsonFromOrigin(url){const r=await fetch(url,{headers:{Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(8000)});if(!r.ok||r.status>=300||!String(r.headers.get('content-type')||'').includes('json'))return null;const body=await r.text();if(body.length>90000)return null;try{return JSON.parse(body)}catch{return null}}
function cleanTitle(value){return typeof value==='string'&&value.trim()&&value.trim().length<250?value.trim():null}
function icecastTitle(json,mount){const sources=json?.icestats?.source;if(!sources)return null;const list=Array.isArray(sources)?sources:[sources];const match=list.find(x=>{try{return new URL(x.listenurl).pathname===mount}catch{return false}});if(!match)return null;const title=cleanTitle(match.title)||cleanTitle(match.yp_currently_playing)||cleanTitle([match.artist,match.song].filter(Boolean).join(' - '));return title?{title,listeners:Number.isFinite(Number(match.listeners))&&match.listeners!=null?Number(match.listeners):null,bitrate:Number(match.bitrate)||null}:null}
async function alternateNowPlaying(streamUrl){const stream=new URL(streamUrl);if(!['https:'].includes(stream.protocol)||stream.username||stream.password)return null;const origin=stream.origin;
 // Restrict probes to the exact origin of the verified stream, on standard TLS port only.
 // Icecast status is also available on verified nonstandard radio ports.
 const ice=await jsonFromOrigin(origin+'/status-json.xsl').catch(()=>null);
 const iceTitle=icecastTitle(ice,stream.pathname);
 if(iceTitle)return {status:'ok',source:'icecast-json',...iceTitle};
 const shout=await jsonFromOrigin(origin+'/stats?sid=1&json=1').catch(()=>null);
 const shoutTitle=cleanTitle(shout?.songtitle||shout?.songTitle);
 if(shoutTitle)return {status:'ok',source:'shoutcast-stats',title:shoutTitle};
 const azura=await jsonFromOrigin(origin+'/api/nowplaying').catch(()=>null);
 const stations=Array.isArray(azura)?azura:[azura];
 const matches=stations.filter(x=>x?.now_playing?.song&&Array.isArray(x?.station?.mounts)&&x.station.mounts.some(m=>{try{return new URL(m.url).pathname===stream.pathname}catch{return false}}));
 if(matches.length===1){const song=matches[0].now_playing.song;const title=cleanTitle(song.text)||cleanTitle([song.artist,song.title].filter(Boolean).join(' - '));if(title)return {status:'ok',source:'azuracast',title}}
 return null;
}
async function isListedStream(url){let error='directory_no_match';for(const host of ['https://de1.api.radio-browser.info','https://nl1.api.radio-browser.info']){try{const endpoint=host+'/json/stations/byurl?url='+encodeURIComponent(url);const r=await fetch(endpoint,{headers:{'Accept':'application/json','User-Agent':'MijnRadio/2.3'},signal:AbortSignal.timeout(4000)});if(!r.ok){error='directory_http_'+r.status;continue}const entries=await r.json();if(Array.isArray(entries)&&entries.some(x=>x.url_resolved===url||x.url===url))return {ok:true,error:null}}catch(e){error=e?.name==='TimeoutError'?'directory_timeout':'directory_request_failed'}}return {ok:false,error}}
// Restrict generic probes to plausible public DNS hosts; reject IP literals and local names.
function safeStreamUrl(value){try{const u=new URL(value);const h=u.hostname.toLowerCase();if(u.protocol!=='https:'||u.username||u.password||u.hash||!h.includes('.')||h.endsWith('.local')||h.endsWith('.internal')||h.endsWith('.localhost')||h==='localhost'||/^\[|^[0-9.]+$/.test(h)||/^(?:metadata|169\.254|127\.|10\.|192\.168)/.test(h))return null;return u}catch{return null}}
async function verifyPublicStream(url){
 const target=safeStreamUrl(url);if(!target)return false;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);
 try{
  const response=await fetch(target.href,{headers:{'Icy-MetaData':'1','Accept':'*/*'},redirect:'manual',signal:controller.signal});
  if(response.status>=300&&response.status<400)return false;
  const type=String(response.headers.get('content-type')||'').toLowerCase();
  const icy=response.headers.has('icy-metaint')||response.headers.has('icy-name');
  const audioType=/^(audio\/|application\/(?:ogg|vnd\.apple\.mpegurl|x-mpegurl|octet-stream))/.test(type);
  const ok=response.ok&&(icy||audioType);
  try{await response.body?.cancel()}catch{}
  return ok;
 }catch{return false}finally{clearTimeout(timer)}
}
// Exact RadioCarousel Chat metadata extraction, restricted to its known stream.
async function chatStyleMetadata(streamUrl){
 const stream=new URL(streamUrl);
 const data=await jsonFromOrigin(stream.origin+'/status-json.xsl');
 if(!data||typeof data!=='object')return null;
 const source=Array.isArray(data.icestats?.source)?data.icestats.source.find(item=>{try{return new URL(item.listenurl).pathname===stream.pathname}catch{return false}}):data.icestats?.source;
 if(data.icestats?.source&&!source)return null;
 if(source?.listenurl){try{if(new URL(source.listenurl).pathname!==stream.pathname)return null}catch{return null}}
 const title=[source?.title,source?.yp_currently_playing,data.song,data.title,data.now_playing?.song?.text].map(cleanTitle).find(Boolean);
 if(!title)return null;
 const listeners=source?.listeners??data.icestats?.listeners??data.listeners;
 return {status:'ok',source:'icecast-chat-parser',title,listeners:listeners!=null&&Number.isFinite(Number(listeners))?Number(listeners):null,bitrate:Number(source?.bitrate??data.bitrate)||null,metadataCheck:'preferred-source'};
}
async function metadataResponse(request){try{const params=new URL(request.url).searchParams,candidate=params.get('url'),id=params.get('id');if(!candidate||candidate.length>1800)return Response.json({status:'unavailable',message:'Geen stream geselecteerd.'},{status:400});const target=new URL(candidate);if(target.protocol!=='https:'||target.username||target.password)return Response.json({status:'unsupported',message:'Deze stream is niet geschikt voor veilige HTTPS-metadata-uitlezing.'});const safe=safeStreamUrl(candidate);if(!safe)return Response.json({status:'unsupported',stage:'verification',verified:false,code:'unsafe_url',message:'Gebruik een publieke HTTPS-radiostream.'},{headers:{'cache-control':'no-store'}});
if(safe.href==='https://cast.accessweb.be:3245/stream'){const preferred=await chatStyleMetadata(safe.href).catch(()=>null);if(preferred)return Response.json({...preferred,stage:'metadata',verified:true,code:'ok'},{headers:{'cache-control':'no-store'}})}
let approved=false,verifiedUrl=safe.href,reason='not_verified';
if(id&&/^[0-9a-f-]{36}$/i.test(id)){
 for(const host of ['https://de1.api.radio-browser.info','https://nl1.api.radio-browser.info']){
  try{const r=await fetch(host+'/json/stations/byuuid/'+id,{signal:AbortSignal.timeout(3500)});if(!r.ok)continue;const list=await r.json();const entry=Array.isArray(list)?list.find(x=>x.stationuuid===id):null;const source=entry&&safeStreamUrl(entry.url_resolved||entry.url);if(source&&source.href===safe.href){approved=true;break}}catch{}
 }
}
if(!approved){const check=await isListedStream(safe.href);approved=check.ok;reason=check.error||reason}
if(!approved){approved=await verifyPublicStream(safe.href);if(approved)reason='public_stream_probe'}
if(!approved)return Response.json({status:'unsupported',stage:'verification',verified:false,code:reason,message:'Stream kon niet veilig als publieke audiostream worden bevestigd. Muziek afspelen blijft mogelijk.'},{headers:{'cache-control':'no-store'}});
try{const preferred=await chatStyleMetadata(verifiedUrl).catch(()=>null);if(preferred)return Response.json({...preferred,stage:'metadata',verified:true,code:'ok'},{headers:{'cache-control':'no-store'}});let result;try{result=await icyNowPlaying(verifiedUrl)}catch(e){result={status:'unavailable',source:'icy',code:e?.name==='AbortError'?'timeout':'stream_unreachable',message:'De stream kon niet door de metadataserver worden gelezen.'}}const alternative=await alternateNowPlaying(verifiedUrl).catch(()=>null);if(alternative){if(result.status!=='ok')result={...alternative,metadataCheck:'fallback'};else{const normalize=s=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();result={...result,listeners:alternative.listeners??null,bitrate:alternative.bitrate??null,metadataCheck:normalize(result.title)===normalize(alternative.title)?'confirmed':'different',secondarySource:alternative.source,secondaryTitle:alternative.title}}}else result={...result,metadataCheck:'single-source'};return Response.json({...result,stage:'metadata',verified:true,code:result.code||result.status},{headers:{'cache-control':'no-store'}})}catch(e){const reason=e?.name==='AbortError'?'timeout':String(e?.message||'').includes('Stream niet bereikbaar')?'stream_unreachable':'stream_request_failed';return Response.json({status:'unavailable',stage:'metadata',verified:true,code:reason,message:'Metadata kon niet worden gelezen ('+reason+'). Audio blijft beschikbaar.'},{headers:{'cache-control':'no-store'}})}}catch{return Response.json({status:'unavailable',message:'Metadata tijdelijk niet beschikbaar.'},{headers:{'cache-control':'no-store'}})}}
export default {async fetch(request,env){const url=new URL(request.url);if(url.pathname==='/api/metadata' || url.pathname==='/api/radiocarousel-metadata')return metadataResponse(request);if(url.pathname!=='/api/radiocarousel-diagnose')return env.ASSETS.fetch(request);try{const response=await fetch(SOURCE,{headers:{'User-Agent':'Mozilla/5.0 (compatible; MijnRadio/1.7)','Accept':'text/html'},redirect:'follow',signal:AbortSignal.timeout(9000)});if(!response.ok)throw Error('Bronpagina niet beschikbaar');const html=(await response.text()).slice(0,1000000);const results=candidatesFrom(html,SOURCE);return new Response(JSON.stringify({results,source:SOURCE,notice:results.length?'Mogelijke streams uit de openbare pagina; nog niet geverifieerd.':'Geen directe stream zichtbaar in de openbare HTML. Een dynamische player kan deze later laden.'}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}catch{return new Response(JSON.stringify({results:[],notice:'Serveronderzoek kon de luisterpagina niet uitlezen.'}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'},status:502})}}};