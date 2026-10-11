const ISSUER='https://token.actions.githubusercontent.com';
const AUDIENCE='arata-odds-daily';
const REPOSITORY='etopat2/arata_odds';
const WORKFLOW=`${REPOSITORY}/.github/workflows/daily-refresh.yml@refs/heads/main`;
const JWKS_URL='https://token.actions.githubusercontent.com/.well-known/jwks';
let keys,keysUntil=0;

function decode(segment){if(!/^[A-Za-z0-9_-]+$/.test(segment))throw new Error('Invalid token encoding.');const raw=atob(segment.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-segment.length%4)%4));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
function parsed(segment){return JSON.parse(new TextDecoder().decode(decode(segment)));}
async function publicKeys(){if(keys&&Date.now()<keysUntil)return keys;const response=await fetch(JWKS_URL,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(4000)});if(!response.ok)throw new Error('GitHub signing keys unavailable.');const raw=await response.text();if(raw.length>100000)throw new Error('GitHub key set too large.');const body=JSON.parse(raw);if(!Array.isArray(body.keys)||body.keys.length>30)throw new Error('Invalid GitHub key set.');keys=body;keysUntil=Date.now()+300000;return keys;}

export async function verifySchedulerToken(token,{now=Date.now(),loadKeys=publicKeys}={}){
 try{
  if(typeof token!=='string'||token.length>8192)return false;
  const parts=token.split('.');if(parts.length!==3)return false;
  const header=parsed(parts[0]),claims=parsed(parts[1]),seconds=Math.floor(now/1000);
  if(header.alg!=='RS256'||typeof header.kid!=='string'||!header.kid)return false;
  if(claims.iss!==ISSUER||claims.aud!==AUDIENCE||claims.repository!==REPOSITORY||claims.ref!=='refs/heads/main'||claims.workflow_ref!==WORKFLOW||!['schedule','workflow_dispatch'].includes(claims.event_name))return false;
  if(!Number.isInteger(claims.iat)||!Number.isInteger(claims.exp)||claims.iat>seconds+60||claims.iat<seconds-900||claims.exp<=seconds||claims.exp-claims.iat>900||claims.nbf!=null&&(!Number.isInteger(claims.nbf)||claims.nbf>seconds+60))return false;
  const jwks=await loadKeys(),jwk=jwks?.keys?.find(key=>key.kid===header.kid&&key.kty==='RSA'&&key.alg==='RS256'&&(key.use==null||key.use==='sig'));
  if(!jwk)return false;
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  return crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
 }catch{return false;}
}

export async function schedulerAuthorized(request){const authorization=request.headers.get('authorization')||'';return authorization.startsWith('Bearer ')&&verifySchedulerToken(authorization.slice(7));}
