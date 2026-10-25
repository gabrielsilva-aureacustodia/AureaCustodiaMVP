/**
 * O controle financeiro (migration 046) contra um Postgres DE VERDADE (PGlite): setores semeados,
 * cadastro de recorrentes, o lançamento automático de cada ocorrência vencida na tabela que a DRE
 * lê, a idempotência do índice único, desativar e reativar, estorno, e a trilha
 * `admin.financeiro.<verbo>`. Instância própria, como `src/server/db/nfse-fila.test.ts`.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { listarAuditoria } from '@/server/db/repositories/auditoria'
import { listarLancamentosManuais } from '@/server/db/repositories/contabil'
import { lancamentosValidosDoPeriodo, listarRecorrentes, listarSetores, tarifasDoGatewayPorMeio } from '@/server/db/repositories/financeiro'
import type { Executor } from '@/server/db/sql'

import { estornarManual } from './contabil'
import { alternarRecorrente, lancarVencidos, salvarRecorrente, salvarSetor } from './financeiro'
import { bancoDeTeste, type BancoDeTeste } from './testing/pglite'

let banco: BancoDeTeste
let executar: Executor
const ator = 'gabriel.silva@aureacustodia.com.br'
/** 25/10/2026, meio-dia de Brasília. */
const AGORA = Date.UTC(2026, 9, 25, 15, 0, 0)

const hostgator = {
  tipo: 'custo',
  descricao: 'Hospedagem e e-mail',
  fornecedor: 'HostGator',
  contaCodigo: '4.1.04',
  setorId: null as number | null,
  valorCents: 4_990,
  periodicidade: 'mensal',
  inicio: '2026-08-05',
  fim: '',
  observacao: '',
}

beforeAll(async () => {
  banco = await bancoDeTeste()
  executar = banco.executar
}, 60_000)

afterAll(async () => {
  await banco.fechar()
})

beforeEach(async () => {
  await banco.db.exec(`
    DELETE FROM aurea.lancamentos_manuais;
    DELETE FROM aurea.lancamentos_recorrentes;
    TRUNCATE aurea.audit_log RESTART IDENTITY;
  `)
})

describe('setores', () => {
  it('nascem com a lista sugerida e não aceitam nome repetido', async () => {
    const setores = await executar(listarSetores)
    expect(setores.map((s) => s.nome)).toEqual(expect.arrayContaining(['Tecnologia', 'Marketing', 'Pessoal']))
    expect((await salvarSetor(executar, ator, null, 'marketing', true, AGORA)).ok).toBe(false)
    const novo = await salvarSetor(executar, ator, null, 'Infraestrutura em nuvem', true, AGORA)
    expect(novo.ok).toBe(true)
    const aud = await executar((tx) => listarAuditoria(tx, {}))
    expect(aud.some((a) => a.acao === 'admin.financeiro.setor')).toBe(true)
  })
})

describe('recorrentes', () => {
  it('salvar lança na hora toda ocorrência vencida, no dia de Brasília, na conta e no setor escolhidos', async () => {
    const tecnologia = (await executar(listarSetores)).find((s) => s.nome === 'Tecnologia')!
    const r = await salvarRecorrente(executar, ator, null, { ...hostgator, setorId: tecnologia.id }, AGORA)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.dados?.lancadas).toBe(3)
    const manuais = await executar(listarLancamentosManuais)
    expect(manuais.map((m) => new Date(m.data).toISOString().slice(0, 10))).toEqual(['2026-08-05', '2026-09-05', '2026-10-05'])
    expect(manuais.every((m) => m.contaCodigo === '4.1.04' && m.valor === 4_990)).toBe(true)
    expect(manuais[0]!.descricao).toBe('Hospedagem e e-mail — HostGator (08/2026)')
    const doPeriodo = await executar((tx) => lancamentosValidosDoPeriodo(tx, Date.UTC(2026, 9, 1), Date.UTC(2026, 10, 1)))
    expect(doPeriodo).toHaveLength(1)
    expect(doPeriodo[0]!.setorId).toBe(tecnologia.id)
    const acoes = (await executar((tx) => listarAuditoria(tx, {}))).map((a) => a.acao)
    expect(acoes).toEqual(expect.arrayContaining(['admin.financeiro.recorrente_criar', 'admin.financeiro.lancar_recorrentes']))
  })

  it('rodar de novo não duplica; o mês seguinte entra quando vence', async () => {
    await salvarRecorrente(executar, ator, null, hostgator, AGORA)
    const denovo = await lancarVencidos(executar, 'sistema:faturamento', AGORA)
    expect(denovo.ok && denovo.dados?.lancadas).toEqual([])
    const novembro = await lancarVencidos(executar, 'sistema:faturamento', Date.UTC(2026, 10, 5, 15))
    expect(novembro.ok && novembro.dados?.lancadas.map((l) => l.competencia)).toEqual(['2026-11-05'])
    expect((await executar(listarLancamentosManuais)).at(-1)!.criadoPor).toBe('sistema:faturamento')
  })

  it('desativado não lança; reativar lança o que venceu enquanto estava desativado', async () => {
    const r = await salvarRecorrente(executar, ator, null, { ...hostgator, inicio: '2026-11-05' }, AGORA)
    const id = r.ok ? r.dados!.id : 0
    expect((await alternarRecorrente(executar, ator, id, false, AGORA)).ok).toBe(true)
    const dez = Date.UTC(2026, 11, 10, 15)
    expect((await lancarVencidos(executar, 'sistema:faturamento', dez)).ok && (await executar(listarLancamentosManuais)).length).toBe(0)
    const volta = await alternarRecorrente(executar, ator, id, true, dez)
    expect(volta.ok && volta.dados?.lancadas).toBe(2)
  })

  it('estornar uma ocorrência não faz o job lançá-la de novo, e a DRE deixa de contar o par', async () => {
    await salvarRecorrente(executar, ator, null, { ...hostgator, inicio: '2026-10-05' }, AGORA)
    const [l] = await executar(listarLancamentosManuais)
    expect((await estornarManual(executar, ator, l!.id, 'cobrado em dobro')).ok).toBe(true)
    const denovo = await lancarVencidos(executar, 'sistema:faturamento', AGORA)
    expect(denovo.ok && denovo.dados?.lancadas).toEqual([])
    expect(await executar((tx) => lancamentosValidosDoPeriodo(tx, Date.UTC(2026, 9, 1), Date.UTC(2026, 10, 1)))).toHaveLength(0)
  })

  it('editar muda as próximas ocorrências e mantém as já lançadas', async () => {
    const r = await salvarRecorrente(executar, ator, null, hostgator, AGORA)
    const id = r.ok ? r.dados!.id : 0
    const editado = await salvarRecorrente(executar, ator, id, { ...hostgator, valorCents: 5_990 }, AGORA)
    expect(editado.ok && editado.dados?.lancadas).toBe(0)
    expect((await executar(listarRecorrentes))[0]).toMatchObject({ valor: 5_990, lancados: 3, ultimoLancado: '2026-10-05' })
    await lancarVencidos(executar, 'sistema:faturamento', Date.UTC(2026, 10, 5, 15))
    expect((await executar(listarLancamentosManuais)).at(-1)!.valor).toBe(5_990)
  })

  it('recusa conta automática, receita em conta de despesa e setor inexistente', async () => {
    expect((await salvarRecorrente(executar, ator, null, { ...hostgator, contaCodigo: '4.1.07' }, AGORA)).ok).toBe(false)
    expect((await salvarRecorrente(executar, ator, null, { ...hostgator, tipo: 'receita' }, AGORA)).ok).toBe(false)
    expect((await salvarRecorrente(executar, ator, null, { ...hostgator, setorId: 99_999 }, AGORA)).ok).toBe(false)
    expect((await salvarRecorrente(executar, ator, null, { ...hostgator, tipo: 'receita', contaCodigo: '3.1.99', descricao: 'Consultoria' }, AGORA)).ok).toBe(true)
  })
})

describe('leituras de apoio', () => {
  it('tarifas do Mercado Pago por meio de pagamento, no período', async () => {
    await banco.db.exec(`
      DELETE FROM aurea.recebimentos_gateway;
      INSERT INTO aurea.recebimentos_gateway (created_at, payment_id, external_reference, tipo_operacao, user_email, metodo, valor_bruto, valor_pago_cliente, tarifa_gateway, valor_liquido, aprovado_em, competencia)
      VALUES (0, 'p1', 'r1', 'deposito', 'a@x', 'pix', 10000, 10000, 99, 9901, ${Date.UTC(2026, 9, 10)}, '2026-10'),
             (0, 'p2', 'r2', 'deposito', 'a@x', 'pix', 20000, 20000, 198, 19802, ${Date.UTC(2026, 9, 11)}, '2026-10'),
             (0, 'p3', 'r3', 'compra', 'a@x', 'credit_card', 30000, 30000, 1494, 28506, ${Date.UTC(2026, 9, 12)}, '2026-10'),
             (0, 'p4', 'r4', 'compra', 'a@x', 'pix', 5000, 5000, 50, 4950, ${Date.UTC(2026, 8, 12)}, '2026-09');
    `)
    const t = await executar((tx) => tarifasDoGatewayPorMeio(tx, Date.UTC(2026, 9, 1), Date.UTC(2026, 10, 1)))
    expect(t).toEqual([
      { metodo: 'credit_card', pagamentos: 1, bruto: 30000, tarifa: 1494, liquido: 28506 },
      { metodo: 'pix', pagamentos: 2, bruto: 30000, tarifa: 297, liquido: 29703 },
    ])
  })
})
