/**
 * Remove os envios de aliancacei@gmail.com — 23/09/2026, pedido do Gabriel.
 *
 * Conferido antes: nenhum deles gerou moeda, análise, plano de custódia ou
 * rastreio. Apagar é seguro e não deixa órfão. Se algum tivesse gerado moeda,
 * este script recusaria — envio que virou acervo não se apaga sem decidir o
 * que fazer com a moeda e com a corrente de hashes do laudo.
 */
const fs=require('fs'),pg=require('pg')
const url=fs.readFileSync('.env.local','utf8').match(/^POSTGRES_URL="?([^"\r\n]+)/m)[1]
const EMAIL='aliancacei@gmail.com'
;(async()=>{const c=new pg.Client({connectionString:url,ssl:{rejectUnauthorized:false}});await c.connect()
const envios=(await c.query('select protocolo from aurea.envios where user_email=$1',[EMAIL])).rows.map(r=>r.protocolo)
if(!envios.length){console.log('nenhum envio para',EMAIL);await c.end();return}
console.log('ENVIOS:',envios.join(', '))

const moedas=await c.query('select count(*)::int n from aurea.coins where protocolo = any($1::text[])',[envios])
const anl=await c.query('select count(*)::int n from aurea.analises where protocolo_envio = any($1::text[])',[envios])
if(moedas.rows[0].n||anl.rows[0].n){
 console.error(`ABORTADO: ${moedas.rows[0].n} moeda(s) e ${anl.rows[0].n} analise(s) dependem desses envios.`)
 console.error('Envio que virou acervo nao se apaga sem decidir o destino da moeda e do laudo.')
 await c.end();process.exitCode=1;return}

await c.query('begin')
try{
 const r=await c.query('delete from aurea.rastreios where protocolo = any($1::text[])',[envios])
 if(r.rowCount)console.log(`  ${r.rowCount} rastreio(s)`)
 const p=await c.query('delete from aurea.planos_custodia where protocolo_envio = any($1::text[])',[envios])
 if(p.rowCount)console.log(`  ${p.rowCount} plano(s)`)
 const e=await c.query('delete from aurea.envios where protocolo = any($1::text[])',[envios])
 console.log(`  ${e.rowCount} envio(s)`)
 const resta=await c.query('select count(*)::int n from aurea.envios where user_email=$1',[EMAIL])
 console.log(`\n  CONFERENCIA: ${resta.rows[0].n} envio(s) restantes para ${EMAIL}`)
 await c.query('commit');console.log('\nCOMMIT OK')
}catch(err){await c.query('rollback');console.error('ROLLBACK:',err.message);process.exitCode=1}
await c.end()})()
