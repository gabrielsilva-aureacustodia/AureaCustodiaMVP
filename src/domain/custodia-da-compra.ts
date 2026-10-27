/**
 * O primeiro mês de custódia, embutido na compra da moeda (21/10/2026).
 *
 * POR QUE ISTO EXISTE
 * -------------------
 * O Gerais (geraisseguros@gmail.com) comprou moeda duas vezes e a anunciou sem pagar custódia nenhuma. A
 * moeda tinha a custódia do mês paga pelo VENDEDOR, e o sistema tratava a cobertura como da moeda, não do
 * dono: "cobrar o comprador pelo mesmo mês seria cobrar duas vezes". O Gabriel revogou a ideia: TODA moeda —
 * enviada, cadastrada no admin ou comprada — precisa ter a custódia do DONO ATUAL paga, mesmo que outra
 * pessoa já tenha pago. E, para o erro não voltar por esquecimento de ninguém, o primeiro mês entra na
 * própria compra: o comprador paga preço + comissão + R$ 2,00, e a moeda já nasce com os próximos 30 dias
 * de guarda pagos em nome dele.
 *
 * COMO FUNCIONA
 * -------------
 * `transferirMoedaVendida` (src/domain/market.ts) chama esta função logo depois de passar a moeda ao
 * comprador. Como TODO caminho de venda passa por ela — casamento do livro, compra de lote, venda a uma
 * oferta de compra, compra direta (Pix e cartão) e as reservas —, nenhum caminho consegue entregar uma
 * moeda sem a fatura. E se algum dia um caminho novo esquecer o débito, o pior que acontece é a custódia
 * ser registrada como paga sem o dinheiro correspondente aparecer — que o ledger denuncia como `ajuste` —,
 * nunca uma moeda negociável sem custódia.
 *
 * QUEM DEBITA O DINHEIRO É O CAMINHO DE COMPRA, não esta função. O que o comprador paga é
 * `custoDeCompraPorMoeda` (preço + comissão + custódia), e cada caminho sabe de onde o dinheiro sai: do
 * saldo, do valor preso a uma oferta pré-paga ou do pagamento que o gateway acabou de confirmar. Esta
 * função só cria a FATURA, já paga, para o livro-razão e a DRE enxergarem a receita de custódia.
 *
 * O CICLO DA MOEDA RECOMEÇA NA COMPRA: `transferCoin` reescreve `entrada` com o dia da compra, e a
 * cobertura vai até o aniversário seguinte (o mesmo dia do mês que vem). A renovação, daí em diante, é a
 * do ciclo mensal de sempre.
 *
 * Regra pura, sem I/O.
 */

import { faturaDoGuardadoAtual, donoAtualDaMoeda } from '@/domain/bloqueio-por-debito'
import { cicloDaMoeda, dataBrasilia } from '@/domain/ciclo-custodia'
import { custodiaDaCompraPorMoeda, type TabelaDeTaxas, TAXAS_PADRAO } from '@/domain/fees'
import type { AppState, Coin, FaturaCustodia, Timestamp, UserEmail } from '@/domain/types'

export function registrarCustodiaDaCompra(
  state: AppState,
  compradorEmail: UserEmail,
  moeda: Coin,
  taxas: TabelaDeTaxas = TAXAS_PADRAO,
  agora: Timestamp = Date.now(),
): FaturaCustodia {
  state.faturasCustodia = state.faturasCustodia ?? []

  const ciclo = cicloDaMoeda(moeda.entrada, agora)
  const sufixo = compradorEmail.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)
  const dia = dataBrasilia(ciclo.inicio).slice(0, 2)
  const usados = new Set(state.faturasCustodia.map((f) => f.id))
  const base = `FAT-${ciclo.competencia}-${sufixo}-CMP-D${dia}-${agora}`
  let id = base
  for (let n = 2; usados.has(id); n++) id = `${base}-${n}`

  const fatura: FaturaCustodia = {
    id,
    userEmail: compradorEmail,
    competencia: ciclo.competencia,
    quantidadeMoedas: 1,
    moedaIds: [moeda.id],
    valorCents: custodiaDaCompraPorMoeda(taxas),
    // Nasce PAGA: o dinheiro entrou na mesma compra. É o que faz o ledger lançar a saída (`custodia`,
    // sinal -1) e a DRE contar a receita de custódia.
    status: 'paga',
    dataEmissao: agora,
    dataPagamento: agora,
    formaPagamento: 'saldo',
    paymentIntentId: null,
    planoId: null,
    // Os 30 dias seguintes à compra: do dia da compra ao dia anterior ao próximo aniversário.
    dataVencimento: ciclo.fim,
    coberturaAte: ciclo.fim - 1,
    origem: 'compra',
  }
  state.faturasCustodia.push(fatura)
  return fatura
}

/**
 * A moeda comprada ANTES de 21/10/2026 começa o ciclo do dono novo no dia em que ele paga pela primeira vez
 * (Gabriel, 26/10/2026).
 *
 * POR QUE ISTO EXISTE. Quem comprou antes da regra de 21/10 não pagou custódia nenhuma na compra: o primeiro
 * mês ainda não era embutido no preço. O ciclo da moeda seguia o dia da compra (`entrada`), e a primeira
 * fatura do dono novo cobria só o resto do ciclo em curso. O Rogério comprou a RO-000104 em 28/09, foi
 * cobrado em 26/10 e a tela já mostrava a próxima cobrança em 28/10: R$ 2,00 por dois dias de guarda. Agora,
 * no primeiro pagamento, o ciclo recomeça naquele dia e a fatura passa a cobrir o mês inteiro dali.
 *
 * QUEM SE QUALIFICA: moeda transferida (`transferido`) cujo dono atual não tem NENHUMA outra fatura paga nem
 * plano vigente cobrindo-a. Toda compra feita a partir de 21/10 já nasce com a fatura `compra`, então isto só
 * alcança as compras antigas. Fatura `compra`, de contratação ou de renovação de plano fica de fora.
 *
 * TODA moeda da fatura precisa se qualificar: a fatura tem um período só, e mudar o ciclo de uma moeda que
 * já estava em dia jogaria fora a data dela. Caso misto não acontece hoje (cada lote e cada aniversário é uma
 * fatura) e, se acontecer, a fatura segue como foi emitida.
 *
 * Chame logo DEPOIS de marcar a fatura como paga, na mesma mutação: é o que faz o ledger, a NFS-e e a tela
 * lerem o período novo. Devolve as moedas cujo ciclo recomeçou (vazio quando nada mudou).
 */
export function recomecarCicloNoPrimeiroPagamento(
  state: AppState,
  fatura: FaturaCustodia,
  agora: Timestamp = Date.now(),
): string[] {
  if (fatura.status !== 'paga') return []
  if (fatura.origem !== 'ciclo_mensal' && fatura.origem !== 'entrada_no_acervo') return []
  const ids = fatura.moedaIds ?? []
  if (ids.length === 0) return []

  const moedas: Coin[] = []
  for (const id of ids) {
    const dono = donoAtualDaMoeda(state, id)
    if (!dono || dono.email !== fatura.userEmail) return []
    const moeda = state.users[dono.email]?.coins.find((c) => c.id === id)
    if (!moeda?.transferido) return []
    const outraPaga = (state.faturasCustodia ?? []).some(
      (f) => f.id !== fatura.id && f.status === 'paga' && (f.moedaIds ?? []).includes(id) && faturaDoGuardadoAtual(f, dono),
    )
    const plano = (state.planosCustodia ?? []).some(
      (p) => p.userEmail === dono.email && p.status === 'vigente' && (p.moedaIds ?? []).includes(id),
    )
    if (outraPaga || plano) return []
    moedas.push(moeda)
  }

  const dia = dataBrasilia(agora)
  for (const moeda of moedas) moeda.entrada = dia
  const ciclo = cicloDaMoeda(dia, agora)
  fatura.competencia = ciclo.competencia
  fatura.dataVencimento = ciclo.fim
  fatura.coberturaAte = ciclo.fim - 1
  return moedas.map((m) => m.id)
}
