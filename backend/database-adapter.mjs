// Prepared statements stay on the API thread. Transactions receive only SQL data.
export function databaseAdapter({query,transaction}) {
 return {prepare(sql){return {sql,params:[],bind(...params){this.params=params;return this;},async all(){return {results:await query(sql,this.params),success:true};},async first(){return (await query(sql,this.params))[0]||null;},async run(){await query(sql,this.params);return {success:true};}};},batch:statements=>transaction(statements.map(({sql,params})=>({sql,params})))};
}
