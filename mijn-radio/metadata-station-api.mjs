// Explicit station API adapters; never guess an unrelated station from a multi-station response.
const clean=v=>typeof v==='string'?v.trim().slice(0,250):'';
export function parseStationApi(data,{stationId,format='auto'}={}){
 if(!data||typeof data!=='object')return null;
 let d=data;
 if(Array.isArray(d)){if(!stationId)return null;const matches=d.filter(x=>String(x?.station?.id??x?.station_id??x?.id??'')===String(stationId));if(matches.length!==1)return null;d=matches[0]}
 if(stationId&&d.station?.id!=null&&String(d.station.id)!==String(stationId))return null;
 const song=d.now_playing?.song??d.nowPlaying?.track??d.currentTrack??d.track;
 let artist='',title='',art='';
 if(song&&typeof song==='object'){artist=clean(song.artist?.name??song.artist);title=clean(song.title??song.name);art=clean(song.art??song.artwork)}
 else if(format==='flat'){artist=clean(d.artist);title=clean(d.song??d.title);art=clean(d.art??d.cover)}
 if(!title&&song&&typeof song==='object')title=clean(song.text);
 if(!title)return null;
 return {status:'ok',source:'station-api',title:[artist,title].filter(Boolean).join(' - '),artwork:/^https:\/\//i.test(art)?art:null};
}
export async function readStationApi(config,{approve,fetcher=fetch}={}){
 if(!config?.url||typeof approve!=='function'||!await approve(config.url))return null;
 const u=new URL(config.url);if(u.protocol!=='https:'||u.username||u.password)return null;
 const r=await fetcher(u.href,{redirect:'manual',signal:AbortSignal.timeout(2500),headers:{Accept:'application/json'}});
 if(!r.ok)return null;
 const body=await r.text();if(body.length>100000)return null;
 try{return parseStationApi(JSON.parse(body),config)}catch{return null}
}
