export const DEFAULT_SECURITY_SETTINGS=Object.freeze({
 maxSessionsPerUser:1,
 loginWhenFull:'replace-oldest',
 replaceOtherSessionsOnLogin:true,
 idleMinutes:60,
 sessionDays:3,
 blockContextMenu:true,
 blockCopy:true,
 blockPaste:false,
 blockPrint:true,
 blockShortcuts:true,
 blockScreenshotKeys:true,
 showWatermark:true
});

export function normalizeSecuritySettings(input){
 const value=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
 const integer=(key,min,max)=>{const n=Number(value[key]??DEFAULT_SECURITY_SETTINGS[key]);if(!Number.isInteger(n)||n<min||n>max)throw new Error(`${key} must be between ${min} and ${max}.`);return n;};
 const flag=key=>{const v=value[key]??DEFAULT_SECURITY_SETTINGS[key];if(typeof v!=='boolean')throw new Error(`${key} must be on or off.`);return v;};
 const loginWhenFull=value.loginWhenFull??DEFAULT_SECURITY_SETTINGS.loginWhenFull;
 if(!['replace-oldest','deny-new'].includes(loginWhenFull))throw new Error('Choose how to handle a full session limit.');
 return {
  maxSessionsPerUser:integer('maxSessionsPerUser',1,5),loginWhenFull,
  replaceOtherSessionsOnLogin:flag('replaceOtherSessionsOnLogin'),
  idleMinutes:integer('idleMinutes',15,1440),sessionDays:integer('sessionDays',1,7),
  blockContextMenu:flag('blockContextMenu'),blockCopy:flag('blockCopy'),blockPaste:flag('blockPaste'),
  blockPrint:flag('blockPrint'),blockShortcuts:flag('blockShortcuts'),
  blockScreenshotKeys:flag('blockScreenshotKeys'),showWatermark:flag('showWatermark')
 };
}

export function presentationSettings(settings){const {blockContextMenu,blockCopy,blockPaste,blockPrint,blockShortcuts,blockScreenshotKeys,showWatermark}=settings;return {blockContextMenu,blockCopy,blockPaste,blockPrint,blockShortcuts,blockScreenshotKeys,showWatermark};}
