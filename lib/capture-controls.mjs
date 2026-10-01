export function isCaptureShortcut(event){
 const key=String(event.key||'').toLowerCase(),code=String(event.code||'').toLowerCase();
 return ['printscreen','snapshot','screencapture'].includes(key)||code==='printscreen'||
  !!event.shiftKey&&!!event.metaKey&&['3','4','5','s'].includes(key)||
  !!event.shiftKey&&!!event.ctrlKey&&key==='s';
}
