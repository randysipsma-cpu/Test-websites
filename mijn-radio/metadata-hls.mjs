// Parse ID3v2.3/v2.4 text frames from a bounded, already extracted ID3 tag.
const syncsafe=(b,i)=>((b[i]&127)<<21)|((b[i+1]&127)<<14)|((b[i+2]&127)<<7)|(b[i+3]&127);
export function parseTimedId3(input){
 const b=input instanceof Uint8Array?input:new Uint8Array(input);
 if(b.length<10||b[0]!==73||b[1]!==68||b[2]!==51||![3,4].includes(b[3])||(b[5]&0xc0))return null;
 const end=10+syncsafe(b,6);if(end>b.length||end>262144)return null;
 let artist='',title='';
 for(let i=10;i+10<=end;){
 const id=String.fromCharCode(...b.subarray(i,i+4));
 const size=b[3]===4?syncsafe(b,i+4):new DataView(b.buffer,b.byteOffset+i+4,4).getUint32(0);
 if(!size||i+10+size>end)break;
 if((id==='TIT2'||id==='TPE1')&&b[i+9]===0){
 const payload=b.subarray(i+10,i+10+size);
 try{const enc=['windows-1252','utf-16','utf-16be','utf-8'][payload[0]];if(enc){const value=new TextDecoder(enc).decode(payload.subarray(1)).replace(/\0/g,'').trim().slice(0,250);if(id==='TIT2')title=value;else artist=value}}catch{}
 }
 i+=10+size;
 }
 return title?{title:[artist,title].filter(Boolean).join(' - '),source:'hls-id3'}:null;
}
export function hlsReferences(text,base){
 const lines=String(text).slice(0,100000).split(/\r?\n/).map(s=>s.trim());
 if(lines[0]!=='#EXTM3U'||!lines.some(s=>s.startsWith('#EXT-X-')))return null;
 const variants=[],segments=[];
 for(let i=0;i<lines.length;i++){
 const s=lines[i];if(!s||s.startsWith('#'))continue;
 try{const u=new URL(s,base);if(u.protocol!=='https:'||u.username||u.password||u.hash)continue;
 if(lines[i-1]?.startsWith('#EXT-X-STREAM-INF:'))variants.push(u.href);else segments.push(u.href)}catch{}
 }
 return {variants:variants.slice(0,10),segments:segments.slice(-3)};
}
