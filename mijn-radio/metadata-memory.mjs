const methods=new Set(['icecast-chat-json','icy','shoutcast-v2','shoutcast-v1','azuracast-nowplaying','station-api','timed-id3','ogg-tags']);
export function createMetadataMemory({storage,now=Date.now,ttl=7*86400000,limit=500}={}){
 const key='mijn-radio-metadata-memory-v1';let entries={};
 try{const raw=JSON.parse(storage?.getItem(key)||'{}');if(raw&&typeof raw==='object'&&!Array.isArray(raw))entries=Object.assign(Object.create(null),raw)}catch{}
 function save(){try{storage?.setItem(key,JSON.stringify(entries))}catch{}}
 function stream(url){try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}}
 function prune(){for(const [k,v] of Object.entries(entries))if(!v||!methods.has(v.method)||!Number.isFinite(v.at)||now()-v.at>ttl||v.at>now()||v.failures>=3)delete entries[k];const keys=Object.keys(entries).sort((a,b)=>entries[b].at-entries[a].at);for(const k of keys.slice(limit))delete entries[k]}
 return {
 get(url){prune();return entries[stream(url)]?.method||null},
 success(url,method){const k=stream(url);if(!k||!methods.has(method))return;entries[k]={method,at:now(),failures:0};prune();save()},
 failure(url,method){const k=stream(url);if(entries[k]?.method!==method)return;entries[k].failures=(entries[k].failures||0)+1;prune();save()},
 clear(){entries=Object.create(null);save()}
 };
}
