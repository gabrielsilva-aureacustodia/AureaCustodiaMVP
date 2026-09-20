/**
 * EXECUTOR DE USO ÚNICO — 20/09/2026. Apague depois de rodar.
 *
 * Não é teste: roda pelo vitest porque o projeto não tem runner de TypeScript e
 * três das quatro etapas precisam das funções do domínio — em especial a do
 * hash, que não dá para replicar em SQL sem arriscar divergir.
 *
 * O que ele faz, em ordem:
 *
 *  1. REGRAVA O PESO DAS 60 MOEDAS. Elas foram cadastradas com `pesoMg: 0`, e
 *     zero num laudo de custódia se lê como "esta moeda não pesa nada". O peso
 *     correto é o de catálogo: 7000 mg (7 g) na Entrega da Bandeira Olímpica.
 *     `pesoMg` ESTÁ na fórmula do hash, então não basta um UPDATE: a corrente
 *     inteira é recalculada do GENESIS, elo por elo, e o hash de cada recibo é
 *     regravado com o hash do próprio laudo. Isso só é seguro porque as moedas
 *     nasceram hoje e nunca foram negociadas — nada aponta para os hashes
 *     antigos. Com recibo em circulação, a troca exigiria conversa antes.
 *
 *  2. ZERA OS REGISTROS. Movimentação, aceites, trilha de auditoria, eventos de
 *     uso, exportações e notas. Fica só o que não é registro de atividade: as
 *     contas, as 60 moedas, os recibos, os laudos, os papéis e permissões do
 *     painel, o plano de contas e os parâmetros do contador, os documentos
 *     legais publicados e o controle de migrations.
 *
 *  3. DEIXA A CUSTÓDIA PENDENTE DE PAGAMENTO nas duas contas: um plano anual em
 *     `aguardando_pagamento` cobrindo as moedas de cada uma, e a fatura de
 *     contratação correspondente em `pendente`. É o estado em que o cliente abre
 *     a conta e vê que só falta pagar a custódia.
 */
import fs from 'node:fs'
import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// O vitest não lê .env.local sozinho. CRLF: sem o trim, a regex não casa.
for (const bruta of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const linha = bruta.trim()
  const m = linha.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}

const CONTAS = ['siqueiraroger1@gmail.com', 'rozanebagli@gmail.com']

/** Tabelas de registro de atividade. Nenhuma delas é acervo nem configuração. */
const ZERAR = [
  'ofertas_historico', 'cs_notas', 'cs_mensagens', 'cs_conversa_etiquetas',
  'cs_conversas', 'cs_contatos', 'cs_canais',
  'admin_notas_usuario', 'admin_situacao_contas', 'lancamentos_manuais',
  'config_historico', 'exportacoes', 'recebimentos_gateway',
  'faturas_custodia', 'planos_custodia',
  'retiradas', 'saques', 'envios', 'rastreios',
  'trades', 'sell_offers', 'buy_orders',
  'deposits', 'ledger_entries', 'payment_events', 'payment_intents',
  'eventos_uso', 'aceites_documentos', 'audit_log',
]

describe('finalizacao do acervo', () => {
  beforeAll(() => {
    expect(process.env.POSTGRES_URL, 'POSTGRES_URL precisa estar no .env.local').toBeTruthy()
  })

  it('regrava peso e corrente, zera registros e deixa a custodia pendente', async () => {
    const pg = (await import('pg')).default
    const { hashDaAnalise } = await import('@/domain/analise')
    const { GENESIS } = await import('@/domain/hash')
    const { COIN_TYPES } = await import('@/domain/constants')
    const { valorDoPlano } = await import('@/domain/plano-custodia')
    const { calcularVencimentoFatura, competenciaAtual, DIAS_TOLERANCIA_FATURA } = await import('@/domain/custody')

    const c = new pg.Client({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false } })
    await c.connect()
    await c.query('begin')

    try {
      /* ---------- 1. peso de catálogo e corrente recalculada ---------- */
      const { rows: analises } = await c.query(
        `select protocolo, posicao, protocolo_envio, codigo_moeda, codigo_recibo, tipo_moeda,
                ano, peso_mg, veredito, motivo_recusa, operador, aprovador, caixa,
                posicao_caixa, validado_em, caminho_video
           from aurea.analises order by posicao`,
      )

      let anterior = GENESIS
      let regravadas = 0
      for (const r of analises) {
        const peso = COIN_TYPES.find((t) => t.key === r.tipo_moeda)?.pesoPadraoMg ?? Number(r.peso_mg)

        // `hashDaAnalise` é a MESMA função que a bancada e o cadastro direto usam.
        // Recalcular a fórmula à mão aqui seria o jeito de a corrente divergir.
        const pendente = {
          protocolo: r.protocolo,
          protocoloEnvio: r.protocolo_envio,
          codigoMoeda: r.codigo_moeda,
          codigoRecibo: r.codigo_recibo,
          tipoMoeda: r.tipo_moeda,
          ano: Number(r.ano),
          pesoMg: peso,
          veredito: r.veredito,
          motivoRecusa: r.motivo_recusa,
          operador: r.operador,
          aprovador: r.aprovador,
          caixa: r.caixa,
          posicao: r.posicao_caixa === null ? null : Number(r.posicao_caixa),
          validadoEm: Number(r.validado_em),
          caminhoVideo: r.caminho_video,
        }

        const hash = hashDaAnalise(pendente as never, anterior)
        await c.query(
          `update aurea.analises set peso_mg = $1, hash_anterior = $2, hash = $3 where protocolo = $4`,
          [peso, anterior, hash, r.protocolo],
        )
        if (r.codigo_recibo) {
          await c.query(`update aurea.recibos set hash = $1 where codigo = $2`, [hash, r.codigo_recibo])
        }
        anterior = hash
        regravadas++
      }
      console.log(`  1. ${regravadas} laudos regravados com peso de catálogo e corrente refeita`)

      /* ---------- 2. registros zerados ---------- */
      for (const t of ZERAR) {
        const r = await c.query('delete from aurea.' + t)
        if (r.rowCount) console.log(`  2. ${String(r.rowCount).padStart(4)} linhas apagadas de ${t}`)
      }

      /* ---------- 3. custódia pendente de pagamento ---------- */
      const agora = Date.now()
      const competencia = competenciaAtual(agora)
      const vencimento = calcularVencimentoFatura(agora, DIAS_TOLERANCIA_FATURA)
      let seqPlano = Number((await c.query('select plano_custodia from aurea.seq')).rows[0].plano_custodia)

      for (const email of CONTAS) {
        const { rows: moedas } = await c.query(
          `select id, protocolo from aurea.coins where owner_email = $1 order by id`, [email],
        )
        if (!moedas.length) continue

        seqPlano += 1
        const planoId = 'PLC-' + String(seqPlano).padStart(6, '0')
        const { porMoeda, total, parcelasMax } = valorDoPlano('anual', moedas.length)
        const ids = moedas.map((m) => m.id)
        const faturaId = `FAT-${competencia}-${email.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}-${agora}`

        await c.query(
          `insert into aurea.planos_custodia
             (id, user_email, protocolo_envio, modalidade, quantidade_contratada, moeda_ids,
              valor_por_moeda, valor_total, parcelas_max, inicio_competencia,
              pago_ate_competencia, status, forma_pagamento, payment_intent_ref, assinatura_id,
              estornado, criado_em, atualizado_em)
           values ($1,$2,$3,'anual',$4,$5,$6,$7,$8,$9,null,'aguardando_pagamento',null,null,null,0,$10,$10)`,
          [planoId, email, moedas[0].protocolo, moedas.length, ids,
           porMoeda, total, parcelasMax, competencia, agora],
        )

        await c.query(
          `insert into aurea.faturas_custodia
             (id, user_email, competencia, quantidade_moedas, moeda_ids, valor_cents, status,
              data_emissao, data_vencimento, data_pagamento, forma_pagamento, payment_intent_id,
              plano_id, origem)
           values ($1,$2,$3,$4,$5,$6,'pendente',$7,$8,null,null,null,$9,'contratacao')`,
          [faturaId, email, competencia, moedas.length, ids, total, agora, vencimento, planoId],
        )

        console.log(`  3. ${email}: ${planoId} aguardando pagamento · ${moedas.length} moedas · R$ ${(total / 100).toFixed(2)}`)
      }

      await c.query('update aurea.seq set plano_custodia = $1', [seqPlano])
      await c.query('commit')
      console.log('\nCOMMIT OK.')
    } catch (e) {
      await c.query('rollback')
      console.error('ROLLBACK — nada gravado. Motivo:', (e as Error).message)
      throw e
    } finally {
      await c.end()
    }
  }, 300_000)
})
