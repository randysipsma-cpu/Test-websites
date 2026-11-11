export default {
 async fetch(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
  const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
  if (request.method!=="POST"||url.pathname!=="/api/projects") return json({error:"Niet gevonden"},404);
  if (!env.GITHUB_TOKEN||!env.CF_ACCESS_TEAM_DOMAIN||!env.CF_ACCESS_AUD||!env.ADMIN_EMAIL) return json({error:"Beheerconfiguratie ontbreekt; geen project aangemaakt."},503);
  const origin=request.headers.get("origin");
  if(origin && origin!==url.origin) return json({error:"Ongeldige herkomst"},403);
  const jwt=request.headers.get("Cf-Access-Jwt-Assertion");
  if(!jwt) return json({error:"Log eerst in via Cloudflare Access."},401);
  try {
   const [h,p,s]=jwt.split(".");
   const decode=x=>Uint8Array.from(atob(x.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(x.length/4)*4,"=")),c=>c.charCodeAt(0));
   const header=JSON.parse(new TextDecoder().decode(decode(h)));
   const payload=JSON.parse(new TextDecoder().decode(decode(p)));
   const domain=env.CF_ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//,"").replace(/\/$/,"");
   const keys=await fetch("https://"+domain+"/cdn-cgi/access/certs");
   if(!keys.ok) return json({error:"Access-certificaten niet beschikbaar"},503);
   const jwks=await keys.json();
   const key=jwks.keys.find(k=>k.kid===header.kid&&k.kty==="RSA");
   if(!key||header.alg!=="RS256") return json({error:"Ongeldige identiteit"},403);
   const publicKey=await crypto.subtle.importKey("jwk",key,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
   const valid=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",publicKey,decode(s),new TextEncoder().encode(h+"."+p));
   const now=Math.floor(Date.now()/1000);
   if(!valid||payload.exp<=now||payload.nbf>now||payload.iss!=="https://"+domain||!(Array.isArray(payload.aud)?payload.aud:[payload.aud]).includes(env.CF_ACCESS_AUD)||payload.email?.toLowerCase()!==env.ADMIN_EMAIL.toLowerCase())return json({error:"Geen beheertoegang"},403);
  } catch {return json({error:"Identiteitscontrole mislukt"},403);}
  let data;try{data=await request.json()}catch{return json({error:"Ongeldige aanvraag"},400)}
  const name=String(data.name||"").trim().toLowerCase();
  if(!/^[a-z0-9][a-z0-9._-]{1,59}$/.test(name)||name.endsWith(".git"))return json({error:"Ongeldige repositorynaam"},400);
  if(typeof data.private!=="boolean")return json({error:"Kies privé of openbaar"},400);
  const gh=await fetch("https://api.github.com/user/repos",{method:"POST",headers:{"authorization":"Bearer "+env.GITHUB_TOKEN,"accept":"application/vnd.github+json","x-github-api-version":"2022-11-28","user-agent":"test-websites-projectassistent","content-type":"application/json"},body:JSON.stringify({name,private:data.private,auto_init:true,description:"Aangemaakt met Test-websites projectassistent"})});
  const result=await gh.json().catch(()=>({}));
  if(!gh.ok)return json({error:gh.status===422?"Repository bestaat mogelijk al.":"GitHub kon de repository niet aanmaken.",github_status:gh.status},gh.status===422?409:502);
  return json({created:true,repository:result.full_name,url:result.html_url,private:result.private,cloudflare_connected:false,next_step:"Verbind deze repository handmatig met Cloudflare; automatische Cloudflare-koppeling is nog niet ingeschakeld."},201);
 }
};
