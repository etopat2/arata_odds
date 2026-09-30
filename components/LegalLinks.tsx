export default function LegalLinks({compact=false}:{compact?:boolean}){
 return <nav className={'legal-links'+(compact?' compact':'')} aria-label="Legal and safety information"><a href="/legal#terms" target="_blank" rel="noopener noreferrer">Terms</a><a href="/legal#disclaimer" target="_blank" rel="noopener noreferrer">Disclaimer</a><a href="/legal#privacy" target="_blank" rel="noopener noreferrer">Privacy</a><a href="/legal#responsible-use" target="_blank" rel="noopener noreferrer">Safer use</a></nav>;
}
