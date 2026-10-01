import {db} from './store';
import {DEFAULT_SECURITY_SETTINGS,normalizeSecuritySettings,presentationSettings} from './security-settings.mjs';

let cache:{value:any;until:number}|null=null;
export async function securitySettings(){
 if(cache&&cache.until>Date.now())return cache.value;
 const row:any=await db().prepare('SELECT payload FROM app_settings WHERE key=?').bind('security_controls').first();
 let value:any=DEFAULT_SECURITY_SETTINGS;
 if(row){try{value=normalizeSecuritySettings(JSON.parse(row.payload));}catch{value=DEFAULT_SECURITY_SETTINGS;}}
 cache={value,until:Date.now()+1000};return value;
}
export async function saveSecuritySettings(input:any){
 const value=normalizeSecuritySettings(input),updated=new Date().toISOString();
 await db().prepare('INSERT INTO app_settings(key,payload,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload,updated=excluded.updated').bind('security_controls',JSON.stringify(value),updated).run();
 await db().prepare('DELETE FROM auth_sessions WHERE token_hash IN (SELECT token_hash FROM (SELECT s.token_hash,ROW_NUMBER() OVER (PARTITION BY s.user_id ORDER BY s.created DESC) AS position,CASE WHEN ? THEN 1 ELSE COALESCE(u.max_sessions,?) END AS session_limit FROM auth_sessions s JOIN auth_users u ON u.id=s.user_id) ranked WHERE position>session_limit)').bind(value.replaceOtherSessionsOnLogin?1:0,value.maxSessionsPerUser).run();
 cache={value,until:Date.now()+1000};return {...value,updated};
}
export async function publicSecuritySettings(){return presentationSettings(await securitySettings());}
