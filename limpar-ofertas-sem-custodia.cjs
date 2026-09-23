/**
 * Tira do livro as ofertas que entraram pelo buraco da trava — 23/09/2026.
 *
 * A trava de venda perguntava "existe fatura em aberto para esta moeda?", e
 * moeda nunca cobrada não tem fatura nenhuma: respondia "sem dívida" e
 * liberava. O código já foi corrigido para exigir PROVA de pagamento; isto
 * limpa o que passou antes da correção.
 *
 * Só remove oferta cuja moeda não tem custódia paga até a competência
 * corrente. Oferta de moeda em dia continua no livro, inclusive a de quem
 * comprou no meio do mês — a custódia daquele mês já foi paga pelo vendedor.
 */
const fs=require('fs'),pg=require('pg')
const url=fs.readFileSync('.env.local','utf8').match(/^POSTGRES_URL="?([^"\r\n]+)/m)[1]
const hoje=new Date()
const COMPETENCIA=`${hoje.getUTCFullYear()}-${String(hoje.getUTCMonth()+1).padStart(2,'0')}`
;(async()=>{const c=new pg.Client({connectionString:url,ssl:{rejectUnauthorized:false}});await c.connect()
console.log('competência corrente:',COMPETENCIA)
const alvo=await c.query(`
 select o.id, o.seller, o.coin_id from aurea.sell_offers o
 where not exists (
   select 1 from aurea.faturas_custodia f
   where f.status='paga' and o.coin_id = any(f.moeda_ids) and f.competencia >= $1)
 and not exists (
   select 1 from aurea.planos_custodia p
   where p.status='vigente' and o.coin_id = any(p.moeda_ids) and p.pago_ate_competencia >= $1)
 order by o.seller`,[COMPETENCIA])
console.log(`\nOFERTAS SEM CUSTÓDIA COMPROVADA: ${alvo.rowCount}`)
for(const r of alvo.rows)console.log(`  ${r.seller}  ${r.coin_id}`)
if(!alvo.rowCount){console.log('nada a remover');await c.end();return}
await c.query('begin')
try{
 const d=await c.query('delete from aurea.sell_offers where id = any($1::text[])',[alvo.rows.map(r=>r.id)])
 const resta=await c.query('select count(*)::int n from aurea.sell_offers')
 console.log(`\n  ${d.rowCount} oferta(s) removida(s) · ${resta.rows[0].n} continuam no livro`)
 await c.query('commit');console.log('\nCOMMIT OK')
}catch(e){await c.query('rollback');console.error('ROLLBACK:',e.message);process.exitCode=1}
await c.end()})()
