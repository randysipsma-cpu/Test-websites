// Isolated metadata routing prototype. No network calls or player integration.
export function classifyStream({url='',headers={}}={}){
 const h=new Headers(headers);
 const server=(h.get('server')||'').toLowerCase();
 const type=(h.get('content-type')||'').toLowerCase().split(';')[0].trim();
 const u=new URL(url);
 const path=u.pathname.toLowerCase();
 const icy=Number(h.get('icy-metaint'))>0;
 const format=/\.m3u8$/.test(path)||/mpegurl/.test(type)&&!/\.m3u$/.test(path)?'hls':/\.pls$|\.m3u$/.test(path)||/scpls/.test(type)?'playlist':/ogg|opus/.test(type)?'ogg':/aac/.test(type)?'aac':/mpeg|mp3/.test(type)?'mp3':'unknown';
 const platform=/azuracast/.test(server)?'azuracast':/icecast/.test(server)?'icecast':/shoutcast/.test(server)?'shoutcast':'unknown';
 const sid=u.searchParams.get('sid')||path.match(/\/stream\/(\d+)\/?$/)?.[1]||null;
 const methods=[];
 const add=(...items)=>{for(const item of items)if(!methods.includes(item))methods.push(item)};
 if(format==='playlist')add('resolve-playlist');
 else if(format==='hls')add('hls-timed-id3','station-api');
 else{
 if(platform==='icecast')add('icecast-chat-json');
 if(platform==='shoutcast')add('shoutcast-v2','shoutcast-v1');
 if(platform==='azuracast')add('azuracast-nowplaying');
 if(icy)add('icy');
 if(format==='ogg')add('ogg-tags');
 add('icecast-chat-json','icy','shoutcast-v2','shoutcast-v1','azuracast-nowplaying','station-api');
 }
 return {platform,format,icy,sid,methods};
}
