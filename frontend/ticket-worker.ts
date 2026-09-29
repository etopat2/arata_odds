import {buildTicketPlan} from '../lib/league-tickets.mjs';
import {searchMatches} from '../lib/live.mjs';
self.onmessage=({data})=>{try{const plan=buildTicketPlan(searchMatches(data.picks,data.query),data.quotes,data.options);self.postMessage({plan});}catch(error){self.postMessage({error:error instanceof Error?error.message:'Ticket calculation could not finish.'});}};
