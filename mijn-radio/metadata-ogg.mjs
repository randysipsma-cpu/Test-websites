// Parse complete Vorbis comment packets and OpusTags packets.
export function parseOggComments(packet){
 const b=packet instanceof Uint8Array?packet:new Uint8Array(packet);
 const dec=new TextDecoder('utf-8');const prefix=dec.decode(b.subarray(0,8));
 let i=prefix==='OpusTags'?8:b[0]===3&&dec.decode(b.subarray(1,7))==='vorbis'?7:-1;
 if(i<0||b.length>262144)return null;
 const view=new DataView(b.buffer,b.byteOffset,b.byteLength);
 function read(){if(i+4>b.length)throw Error('truncated');const n=view.getUint32(i,true);i+=4;return n}
 function str(n){if(n>b.length-i)throw Error('truncated');const s=dec.decode(b.subarray(i,i+n));i+=n;return s}
 try{str(read());const count=read();if(count>1024)return null;const tags={};for(let j=0;j<count;j++){const s=str(read()),k=s.indexOf('=');if(k>0){const key=s.slice(0,k).toUpperCase();if(['ARTIST','TITLE','ALBUM'].includes(key)&&!tags[key])tags[key]=s.slice(k+1).trim().slice(0,250)}}return tags.TITLE?{title:[tags.ARTIST,tags.TITLE].filter(Boolean).join(' - '),album:tags.ALBUM||null,source:prefix==='OpusTags'?'opus-tags':'vorbis-comments'}:null}catch{return null}
}
export function extractOggMetadata(input){
 const b=input instanceof Uint8Array?input:new Uint8Array(input);
 const streams=new Map();let result=null;
 for(let i=0;i+27<=b.length;){
 if(b[i]!==79||b[i+1]!==103||b[i+2]!==103||b[i+3]!==83||b[i+4]!==0)break;
 const n=b[i+26];if(i+27+n>b.length)break;
 const serial=new DataView(b.buffer,b.byteOffset+i+14,4).getUint32(0,true);
 let parts=streams.get(serial)||[];if(!(b[i+5]&1))parts=[];
 let pos=i+27+n;let valid=true;
 for(let j=0;j<n;j++){const len=b[i+27+j];if(pos+len>b.length){valid=false;break}parts.push(b.subarray(pos,pos+len));pos+=len;if(parts.length>1029){parts=[];valid=false;break}if(len<255){const size=parts.reduce((a,p)=>a+p.length,0);if(size<=262144){const packet=new Uint8Array(size);let offset=0;for(const p of parts){packet.set(p,offset);offset+=p.length}result=parseOggComments(packet)||result}parts=[]}}
 if(!valid)break;streams.set(serial,parts);i=pos;
 }
 return result;
}
