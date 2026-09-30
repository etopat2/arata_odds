import {env} from 'cloudflare:workers';
import {db} from './store';
import {jsonResponse} from './transport.mjs';

const COOKIE='arata_session',SESSION_SECONDS=7*86400,CURRENT_ITERATIONS=100000;
const config=(key:string)=>String((env as any)?.[key]||(typeof process!=='undefined'?process.env[key]:'')||'');
const bytes=(size:number)=>crypto.getRandomValues(new Uint8Array(size));
const hex=(data:Uint8Array)=>[...data].map(n=>n.toString(16).padStart(2,'0')).join('');
const fromHex=(value:string)=>new Uint8Array(value.match(/.{2}/g)?.map(v=>parseInt(v,16))||[]);
const sha=async(value:string)=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))));
const newSalt=()=>`${CURRENT_ITERATIONS}:${hex(bytes(16))}`;
async function passwordHash(password:string,salt:string){const [rounds,raw]=salt.includes(':')?salt.split(':'):[String(210000),salt];const iterations=Number(rounds);if(!Number.isInteger(iterations)||iterations<100000||iterations>210000)throw new Error('Invalid password hash settings.');const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:fromHex(raw),iterations,hash:'SHA-256'},key,256)));}
function constantEqual(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
const visible=(u:any)=>({id:u.id,username:u.username,email:u.email,firstName:u.first_name,lastName:u.last_name,phone:u.phone,role:u.role,active:!!u.active,mustChangePassword:!!u.must_change_password,created:u.created,updated:u.updated});
function email(value:any){const s=String(value||'').trim().toLowerCase();if(s.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))throw new Error('Enter a valid email address.');return s;}
function name(value:any,label:string){const s=String(value||'').trim();if(!s||s.length>80)throw new Error(`${label} must be 1–80 characters.`);return s;}
function username(value:any){const s=String(value||'').trim().toLowerCase();if(!/^[a-z0-9._-]{3,80}$/.test(s))throw new Error('Use 3–80 letters, numbers, dots, hyphens or underscores for the login name.');return s;}
function phone(value:any){const s=String(value||'').trim();if(s&&!/^\+?[0-9 ()-]{7,24}$/.test(s))throw new Error('Enter a valid phone number.');return s;}
function newPassword(value:any){const s=String(value||'');if(s.length<12||s.length>128)throw new Error('Choose a password of 12–128 characters.');return s;}
const cookie=(request:Request,value:string,maxAge=SESSION_SECONDS)=>`${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(request.url).protocol==='https:'?'; Secure':''}`;
const reply=(data:any,status=200,headers?:HeadersInit)=>jsonResponse(data,{status,headers:{'Cache-Control':'no-store',...headers}});

export async function bootstrapAdmin(){
 const configured=config('ARATA_ADMIN_INITIAL_PASSWORD');if(!configured)return;
 if(await db().prepare('SELECT id FROM auth_users WHERE id=?').bind('admin').first())return;
 const id='admin',created=new Date().toISOString(),salt=newSalt(),hashed=await passwordHash(configured,salt);
 await db().prepare('INSERT INTO auth_users(id,username,email,first_name,last_name,phone,role,active,must_change_password,salt,password_hash,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,'etomet2patrick',config('ARATA_ADMIN_EMAIL')||'etomet2patrick@gmail.com','Patrick','Etomet','', 'admin',1,1,salt,hashed,created,created).run();
}
async function userByIdentity(identity:string){return db().prepare('SELECT * FROM auth_users WHERE (username=? OR email=?) AND deleted_at IS NULL').bind(identity,identity).first() as Promise<any>;}
async function sessionFor(request:Request){const token=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);if(!token||!/^[a-f0-9]{64}$/.test(token))return null;const digest=await sha(token);const record:any=await db().prepare('SELECT u.* FROM auth_sessions s JOIN auth_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1 AND u.deleted_at IS NULL').bind(digest,Date.now()).first();return record?visible(record):null;}
export async function actor(request:Request){await bootstrapAdmin();return sessionFor(request);}
export function unauthorised(){return reply({error:'Sign in to continue.'},401);}
export function forbidden(){return reply({error:'Administrator access is required.'},403);}
export function passwordChangeRequired(){return reply({error:'Change your temporary password to continue.'},403);}
export function requireOrigin(request:Request){const source=request.headers.get('origin');return request.method==='GET'||source===new URL(request.url).origin;}
async function issueSession(request:Request,user:any){const token=hex(bytes(32)),digest=await sha(token),now=Date.now();await db().prepare('INSERT INTO auth_sessions(token_hash,user_id,created,expires) VALUES(?,?,?,?)').bind(digest,user.id,now,now+SESSION_SECONDS*1000).run();return cookie(request,token);}
async function readBody(request:Request){if(!String(request.headers.get('content-type')||'').startsWith('application/json'))throw new Error('Send JSON data.');const raw=await request.text();if(raw.length>8192)throw new Error('Request too large.');return JSON.parse(raw||'{}');}
const failure=(error:any)=>reply({error:error instanceof Error?error.message:'Request failed.'},error?.status||400);
async function lockout(identity:string,request:Request){const key='login:'+await sha(identity+'|'+(request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')||'local'));const now=Date.now();const row:any=await db().prepare('SELECT expires,payload FROM api_cache WHERE key=?').bind(key).first();const prior=row&&row.expires>now?JSON.parse(row.payload):{data:{count:0}};if(prior.data.count>=5)throw Object.assign(new Error('Too many sign-in attempts. Try again in 15 minutes.'),{status:429});return {key,count:prior.data.count};}
async function failLogin(attempt:any){await db().prepare('INSERT INTO api_cache(key,expires,payload) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET expires=excluded.expires,payload=excluded.payload').bind(attempt.key,Date.now()+900000,JSON.stringify({data:{count:attempt.count+1}})).run();}
export async function authRoute(request:Request):Promise<Response|null>{
 const path=new URL(request.url).pathname;if(!path.startsWith('/api/auth/')&&!path.startsWith('/api/admin/users'))return null;
 try{
  if(!requireOrigin(request))return reply({error:'Request origin is not allowed.'},403);
  await bootstrapAdmin();
  if(path==='/api/auth/login'&&request.method==='POST'){
   const input=await readBody(request),identity=String(input.identity||'').trim().toLowerCase();if(identity.length>254)throw new Error('Invalid sign-in.');const attempt=await lockout(identity,request);const user=await userByIdentity(identity);const check=await passwordHash(String(input.password||''),user?.salt||`${CURRENT_ITERATIONS}:4aa927981b0463f11234567890abcdef`);
   if(!user||!user.active||!constantEqual(check,user.password_hash)){await failLogin(attempt);return reply({error:'Invalid sign-in.'},401);}
   await db().prepare('DELETE FROM api_cache WHERE key=?').bind(attempt.key).run();return reply({user:visible(user)},200,{'Set-Cookie':await issueSession(request,user)});
  }
  const current=await actor(request);if(!current)return unauthorised();
  if(path==='/api/auth/me'&&request.method==='GET')return reply({user:current});
  if(path==='/api/auth/logout'&&request.method==='POST'){const token=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);if(token)await db().prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(await sha(token)).run();return reply({ok:true},200,{'Set-Cookie':cookie(request,'',0)});}
  if(path==='/api/auth/password'&&request.method==='POST'){
   const input=await readBody(request),user:any=await db().prepare('SELECT * FROM auth_users WHERE id=?').bind(current.id).first(),old=await passwordHash(String(input.currentPassword||''),user.salt);
   if(!constantEqual(old,user.password_hash))return reply({error:'Current password is incorrect.'},400);
   const pass=newPassword(input.newPassword);if(pass===input.currentPassword)throw new Error('Choose a different password.');const salt=newSalt();await db().batch([db().prepare('UPDATE auth_users SET salt=?,password_hash=?,must_change_password=0,updated=? WHERE id=?').bind(salt,await passwordHash(pass,salt),new Date().toISOString(),current.id),db().prepare('DELETE FROM auth_sessions WHERE user_id=?').bind(current.id)]);return reply({ok:true},200,{'Set-Cookie':cookie(request,'',0)});
  }
  if(current.mustChangePassword)return passwordChangeRequired();
  if(path==='/api/auth/profile'&&request.method==='PATCH'){const input=await readBody(request),first=name(input.firstName,'First name'),last=name(input.lastName,'Last name'),mobile=phone(input.phone),login=username(input.username??current.username);await db().prepare('UPDATE auth_users SET username=?,first_name=?,last_name=?,phone=?,updated=? WHERE id=?').bind(login,first,last,mobile,new Date().toISOString(),current.id).run();return reply({user:{...current,username:login,firstName:first,lastName:last,phone:mobile}});}
  if(!path.startsWith('/api/admin/'))return reply({error:'Endpoint not found.'},404);
  if(current.role!=='admin')return forbidden();
  if(path==='/api/admin/users'&&request.method==='GET'){const rows=await db().prepare('SELECT * FROM auth_users WHERE deleted_at IS NULL ORDER BY created DESC').all();return reply({users:rows.results.map(visible)});}
  if(path==='/api/admin/users'&&request.method==='POST'){
   const input=await readBody(request),id=crypto.randomUUID(),now=new Date().toISOString(),address=email(input.email),first=name(input.firstName,'First name'),last=name(input.lastName,'Last name'),mobile=phone(input.phone),loginName=username(input.username||'u'+id.slice(0,12)),salt=newSalt();if(!mobile)throw new Error('A phone number is required to onboard a user.');const pass=config('ARATA_USER_INITIAL_PASSWORD')||'arataodds123';await db().prepare('INSERT INTO auth_users(id,username,email,first_name,last_name,phone,role,active,must_change_password,salt,password_hash,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,loginName,address,first,last,mobile,'user',1,1,salt,await passwordHash(pass,salt),now,now).run();return reply({user:{id,username:loginName,email:address,firstName:first,lastName:last,phone:mobile,role:'user',active:true,mustChangePassword:true,created:now,updated:now},temporaryPassword:pass},201);
  }
  const match=path.match(/^\/api\/admin\/users\/([a-zA-Z0-9-]+)(?:\/(reset-password))?$/);if(!match)return reply({error:'Endpoint not found.'},404);const id=match[1],target:any=await db().prepare('SELECT * FROM auth_users WHERE id=? AND deleted_at IS NULL').bind(id).first();if(!target)return reply({error:'User not found.'},404);
  if(match[2]==='reset-password'&&request.method==='POST'){const salt=newSalt(),pass=config('ARATA_USER_INITIAL_PASSWORD')||'arataodds123';await db().batch([db().prepare('UPDATE auth_users SET salt=?,password_hash=?,must_change_password=1,updated=? WHERE id=?').bind(salt,await passwordHash(pass,salt),new Date().toISOString(),id),db().prepare('DELETE FROM auth_sessions WHERE user_id=?').bind(id)]);return reply({ok:true,temporaryPassword:pass});}
  if(request.method==='PATCH'){
   const input=await readBody(request),first=name(input.firstName??target.first_name,'First name'),last=name(input.lastName??target.last_name,'Last name'),mobile=phone(input.phone??target.phone),address=email(input.email??target.email),loginName=username(input.username??target.username),active=input.active===undefined?!!target.active:input.active===true,role=input.role===undefined?target.role:input.role;
   if(!['admin','user'].includes(role))throw new Error('Invalid role.');if(id===current.id&&(!active||role!=='admin'))throw new Error('You cannot deactivate or demote your own administrator account.');await db().prepare('UPDATE auth_users SET username=?,first_name=?,last_name=?,phone=?,email=?,role=?,active=?,updated=? WHERE id=?').bind(loginName,first,last,mobile,address,role,active?1:0,new Date().toISOString(),id).run();if(!active)await db().prepare('DELETE FROM auth_sessions WHERE user_id=?').bind(id).run();return reply({user:{...visible(target),firstName:first,lastName:last,phone:mobile,email:address,username:loginName,role,active}});
  }
  if(request.method==='DELETE'){if(id===current.id)throw new Error('You cannot delete your own administrator account.');await db().batch([db().prepare('UPDATE auth_users SET active=0,deleted_at=?,updated=? WHERE id=?').bind(new Date().toISOString(),new Date().toISOString(),id),db().prepare('DELETE FROM auth_sessions WHERE user_id=?').bind(id)]);return reply({ok:true});}
  return reply({error:'Endpoint not found.'},404);
 }catch(error:any){if(String(error?.message||'').includes('UNIQUE'))return reply({error:'That email or login name is already in use.'},409);return failure(error);}
}
