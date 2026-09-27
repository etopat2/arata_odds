export function ticketList(tickets,query='',status='all'){
 const terms=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
 const searched=tickets.filter(t=>{const text=[t.name,...t.legs.flatMap(l=>[l.home,l.away])].join(' ').toLowerCase();return terms.every(term=>text.includes(term));});
 const counts={all:searched.length,pending:0,running:0,won:0,lost:0};
 for(const t of searched){if(t.status in counts)counts[t.status]++;if(t.running&&t.status==='pending')counts.running++;}
 const matches=searched.filter(t=>status==='all'||status==='running'?status==='all'||t.running&&t.status==='pending':status===t.status).sort((a,b)=>Number(b.status==='pending')-Number(a.status==='pending')||(Date.parse(b.created)||0)-(Date.parse(a.created)||0)||String(a.id).localeCompare(String(b.id)));
 return {matches,counts};
}
