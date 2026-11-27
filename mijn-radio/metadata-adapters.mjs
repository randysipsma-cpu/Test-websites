import {classifyStream} from './metadata-routing.mjs';
// Pure parsers, isolated from playback and Spotify.
const clean=v=>typeof v==='string'?v.replace(/[\x00-\x1f]/g,' ').trim().slice(0,250):'';
const first=(...v)=>v.map(clean).find(Boolean)||'';
const pathOf=v=>{try{return new URL(v).pathname}catch{return null}};
export function parseIcecast(data,url){
 const mount=new URL(url).pathname;
 const raw=data?.icestats?.source;
 const list=Array.isArray(raw)?raw:raw?[raw]:[];
 const matches=list.filter(s=>pathOf(s.listenurl)===mount||s.mount===mount);
 const s=matches.length===1?matches[0]:list.length===1&&!list[0].listenurl&&!list[0].mount?list[0]:null;
 if(!s)return null;
 const title=first(s.title,s.yp_currently_playing,[s.artist,s.song].filter(Boolean).join(' - '),s.song);
 return title?{title,source:'icecast-json',listeners:s.listeners??null,bitrate:s.bitrate??null}:null;
}
export function parseShoutcast(data){
 const title=first(data?.songtitle,data?.songTitle,data?.streamtitle);
 return title?{title,source:'shoutcast-v2',listeners:data.currentlisteners??null,bitrate:data.bitrate??null}:null;
}
export function parseShoutcastV1(html){
 const body=String(html).replace(/<[^>]*>/g,'').trim();
 const fields=body.split(',');
 if(fields.length<7||!fields.slice(0,6).every(x=>/^\d+$/.test(x.trim())))return null;
 const title=clean(fields.slice(6).join(','));
 return title?{title,source:'shoutcast-v1',listeners:Number(fields[0]),bitrate:Number(fields[5])}:null;
}
export function parseAzuraCast(data,url){
 const mount=new URL(url).pathname;
 const matches=(Array.isArray(data)?data:[data]).filter(s=>s?.station?.mounts?.some(m=>pathOf(m.url)===mount||m.name===mount));
 if(matches.length!==1)return null;
 const song=matches[0].now_playing?.song;
 const title=first(song?.text,[song?.artist,song?.title].filter(Boolean).join(' - '));
 return title?{title,source:'azuracast',listeners:matches[0].listeners?.current??null}:null;
}
export function metadataPlan(url,headers){
 const info=classifyStream({url,headers});
 const origin=new URL(url).origin;
 const sid=info.sid||'1';
 return {...info,endpoints:{'icecast-chat-json':origin+'/status-json.xsl','shoutcast-v2':origin+'/stats?sid='+encodeURIComponent(sid)+'&json=1','shoutcast-v1':origin+'/7.html','azuracast-nowplaying':origin+'/api/nowplaying'}};
}
