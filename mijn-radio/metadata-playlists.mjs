// Resolve playlist entries without trusting arbitrary redirects or private hosts.
export function playlistEntries(body,base){
 const text=String(body).slice(0,100000);
 if(/^\s*#EXTM3U/m.test(text)&&/#EXT-X-/i.test(text))return [];
 const lines=text.split(/\r?\n/);
 const entries=[];
 for(const line of lines){
  const s=line.trim();if(!s||s.startsWith('#')||s.startsWith('['))continue;
  const pls=s.match(/^File\d+\s*=\s*(.+)$/i);
  const raw=pls?pls[1]:s;
  if(!pls&&!/^https:\/\//i.test(raw)&&!/^\.{0,2}\//.test(raw))continue;
  try{const u=new URL(raw,base);if(u.protocol!=='https:'||u.username||u.password||u.hash)continue;if(!entries.includes(u.href))entries.push(u.href)}catch{}
  if(entries.length>=10)break;
 }
 return entries;
}
export async function resolvePlaylist(url,{fetcher=fetch,approve,maxDepth=2}={}){
 if(typeof approve!=='function')throw Error('Stream approval required');
 const seen=new Set();
 async function visit(u,depth){
  if(depth>maxDepth||seen.has(u)||!await approve(u))return null;
  seen.add(u);
  if(!/\.(m3u|pls)(?:\?|$)/i.test(u))return u;
  const r=await fetcher(u,{redirect:'manual',signal:AbortSignal.timeout(2500)});
  if(!r.ok)return null;
  for(const candidate of playlistEntries(await r.text(),u)){const result=await visit(candidate,depth+1);if(result)return result}
  return null;
 }
 return visit(url,0);
}
