const sections=[['terms','Terms'],['disclaimer','Disclaimer'],['privacy','Privacy'],['responsible-use','Safer use']] as const;
export default function LegalLinks({compact=false,onNavigate}:{compact?:boolean;onNavigate?:(section:string)=>void}){
 return <nav className={'legal-links'+(compact?' compact':'')} aria-label="Legal and safety information">{sections.map(([section,label])=><a key={section} href={'/legal#'+section} onClick={onNavigate?(event)=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();onNavigate(section);}:undefined}>{label}</a>)}</nav>;
}
