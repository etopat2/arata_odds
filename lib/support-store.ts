import {db} from './store';
import {DEFAULT_SUPPORT_CONTACTS,normalizeSupportContacts} from './support-settings.mjs';

export async function supportContacts(){
 const row:any=await db().prepare('SELECT payload,updated FROM app_settings WHERE key=?').bind('support_contacts').first();
 if(!row)return {...DEFAULT_SUPPORT_CONTACTS,updated:null};
 try{return {...normalizeSupportContacts(JSON.parse(row.payload)),updated:row.updated};}
 catch{throw new Error('Saved support contacts are invalid. Ask an administrator to correct the settings.');}
}

export async function saveSupportContacts(input:any){
 const contacts=normalizeSupportContacts(input),updated=new Date().toISOString();
 await db().prepare('INSERT INTO app_settings(key,payload,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload,updated=excluded.updated').bind('support_contacts',JSON.stringify(contacts),updated).run();
 return {...contacts,updated};
}
