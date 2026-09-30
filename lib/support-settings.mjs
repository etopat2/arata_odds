export const DEFAULT_SUPPORT_CONTACTS=Object.freeze({email:'etopat@gmail.com',whatsapp:'+256791170164'});

export function normalizeSupportContacts(input){
 const email=String(input?.email??'').trim().toLowerCase();
 const whatsapp=String(input?.whatsapp??'').trim().replace(/[\s().-]/g,'');
 if(email.length>254||!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email))throw new Error('Enter a valid support email address.');
 if(!/^\+[1-9]\d{7,14}$/.test(whatsapp))throw new Error('Enter the WhatsApp number in international format, such as +256791170164.');
 return {email,whatsapp};
}

export function whatsappUrl(number){return 'https://wa.me/'+number.replace(/\D/g,'');}
