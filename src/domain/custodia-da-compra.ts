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
