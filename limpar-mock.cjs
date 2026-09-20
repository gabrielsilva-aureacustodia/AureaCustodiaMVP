/**
 * LIMPEZA DOS DADOS DE DEMONSTRAÇÃO — rodar UMA VEZ, em 20/09/2026.
 *
 * Apaga tudo que era mockado no banco de produção e deixa a plataforma zerada
 * para a publicação: nenhuma moeda, nenhum saldo, nenhuma negociação, nenhum
 * recibo. As contas REAIS continuam existindo, zeradas; as oito contas de
 * demonstração são excluídas.
 *
 * SÓ RODE COM O DEPLOY 279a594 (ou posterior) NO AR. Antes dele, `db/estado.ts`
 * semeava o banco com `seedState()` sempre que ele estivesse vazio — e essa é a
 * rota do Postgres, ou seja, produção. Com o código antigo no ar, a primeira
 * requisição depois desta limpeza recriaria tudo sozinha.
 *
 * O backup de antes está em docs/privado/BACKUP_BANCO_20260920.json (47 tabelas).
 *
 * Tudo roda numa transação: ou passa inteiro, ou nada é gravado.
 */
const fs = require('fs')
const pg = require('pg')

const url = fs.readFileSync('.env.local', 'utf8').match(/^POSTGRES_URL="?([^"\n]+)/m)[1]

/** As oito contas do antigo catálogo local. Excluídas, não zeradas. */
const DEMO = [
  'rogerio@aureacustodia.com.br',
  'rogeriopena@testeaurea.com.br',
  'gabrielsilva@testeaurea.com.br',
  'alex@testeaurea.com.br',
  'pegge@testeaurea.com.br',
  'rozane@testeaurea.com.br',
  'goturuba@testeaurea.com.br',
  'solares@testeaurea.com.br',
]

/**
 * Ordem de filho para pai, para não esbarrar em chave estrangeira.
 *
 * NÃO ESTÃO AQUI, de propósito: admin_papeis, admin_permissoes,
 * admin_papel_permissoes (acesso da equipe ao painel), contas_contabeis e
 * parametros_contabeis (configuração do contador), documentos_legais (o texto
 * publicado dos Termos e da Política), tipos_moeda e config_plataforma
 * (catálogo e taxas vigentes) e schema_migrations. Nada disso é dado mockado.
 */
const LIMPAR = [
  'ofertas_historico', 'cs_notas', 'cs_mensagens', 'cs_conversa_etiquetas',
  'cs_conversas', 'cs_contatos', 'cs_canais',
  'admin_notas_usuario', 'admin_situacao_contas', 'lancamentos_manuais',
  'config_historico', 'exportacoes',
  'recebimentos_gateway', 'payment_events', 'payment_intents', 'rastreios', 'analises',
  'retiradas', 'saques', 'faturas_custodia', 'planos_custodia', 'envios',
  'trades', 'sell_offers', 'buy_orders', 'recibos', 'coins',
  'deposits', 'ledger_entries', 'eventos_uso', 'aceites_documentos',
  'audit_log', 'caixas',
]

;(async () => {
  const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await c.connect()
  await c.query('begin')
  try {
    for (const t of LIMPAR) {
      const r = await c.query('delete from aurea.' + t)
      if (r.rowCount) console.log('  apagadas ' + String(r.rowCount).padStart(5) + ' linhas de ' + t)
    }

    const m = await c.query('delete from aurea.admin_membros where email = any($1)', [DEMO])
    console.log('  removidos ' + m.rowCount + ' membros do painel que eram contas de demonstração')

    const u = await c.query('delete from aurea.users where email = any($1)', [DEMO])
    console.log('  excluídas ' + u.rowCount + ' contas de demonstração')

    // As contas reais ficam: só perdem saldo, cadastro e dados bancários.
    const z = await c.query(`update aurea.users set balance = 0, pass = null, cpf = null,
       nome_completo = null, data_nascimento = null, telefone = null, endereco = null,
       dados_bancarios = null, cadastro_completado_em = null, cadastro_confirmado_em = null,
       inadimplente = false`)
    console.log('  zeradas ' + z.rowCount + ' contas reais (saldo, cadastro e dados bancários)')

    await c.query('update aurea.seq set coin = 0, envio = 0, analise = 0, plano_custodia = 0')
    console.log('  contadores de id reiniciados')

    await c.query('commit')
    console.log('\nCOMMIT OK — banco limpo.')
  } catch (e) {
    await c.query('rollback')
    console.error('ROLLBACK — nada foi gravado. Motivo:', e.message)
    process.exitCode = 1
  }
  await c.end()
})()
