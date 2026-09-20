/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Aqui o dinheiro entra no saldo ou liquida serviços (depósito, compra direta,
 * fatura de custódia, retirada física). É o passo 7 do fluxo do M5, e o único
 * lugar da plataforma em que um pagamento externo vira crédito interno.
 * ==========================================================================*/

import 'server-only'

import { contaComPendenciaNoEstado } from '@/domain/bloqueio-por-debito'
import { competenciaAtual } from '@/domain/custody'
import { comissaoPorMoeda, TAXAS_PADRAO, type TabelaDeTaxas } from '@/domain/fees'
import { transferCoin } from '@/domain/market'
import { brl } from '@/domain/money'
import { calcularPagoAte, mesesCobertos, somarMeses } from '@/domain/plano-custodia'
import { calcularPrazoLimiteRetirada } from '@/domain/retirada'
import type { AppState, FormaPagamentoFatura } from '@/domain/types'
import { consultarPagamentoMercadoPago, type DetalhesPagamento } from '@/lib/payments'
import type { IntencaoDeposito, TipoOperacaoPagamento } from '@/server/db/repositories/payments'
import { contaBloqueavel } from '@/server/custodia/isencao-da-equipe'
import { repositorioRetiradas } from '@/server/shipping/retiradas'
import { mutateState } from '@/server/state'
import { carregarTabelaDeTaxas } from '@/server/taxas/carregar'

import { gravarRecebimento } from './recebimentos'
import { repositorioIntencoes } from './repositorios'

export interface ResultadoLiquidacao {
  sucesso: boolean
  motivo: string
  compraConcluida?: boolean
}

/** O que a liquidação lê da configuração vigente ANTES da transação (C3 / P-C3-03). */
export interface RegrasDaLiquidacao {
  taxas: TabelaDeTaxas
  /**
   * A conta que a pendência de custódia pode travar nesta liquidação (o vendedor na compra direta, o
   * titular na retirada) está FORA da equipe. Perguntado antes do mutateState, porque carregarMembro é
   * assíncrono e não pode rodar com a linha do estado presa. Ausente ou false: liberado (E4).
   */
  contaBloqueavel?: boolean
}

export type Liquidador = (
  s: AppState,
  intencao: IntencaoDeposito,
  detalhes: DetalhesPagamento,
  regras: RegrasDaLiquidacao,
) => ResultadoLiquidacao

export interface ResultadoConciliacao {
  creditado: boolean
  motivo: string
  externalReference?: string
  valorCents?: number
  userEmail?: string
  tipoOperacao?: TipoOperacaoPagamento
  compraConcluida?: boolean
}

/* ------------------------------------------------------------------ *
 * Liquidadores por tipo de operação (Passo B1.4)                     *
 * ------------------------------------------------------------------ */

function liquidarDeposito(
  s: AppState,
  reivindicada: IntencaoDeposito,
): ResultadoLiquidacao {
  const buyer = s.users[reivindicada.userEmail]
  if (!buyer) throw new Error(`Usuário ${reivindicada.userEmail} não existe no estado.`)

  buyer.balance += reivindicada.valor
  s.deposits.push({
    userEmail: reivindicada.userEmail,
    valor: reivindicada.valor,
    date: Date.now(),
  })
  return { sucesso: true, motivo: 'creditado' }
}

function liquidarCompraDireta(
  s: AppState,
  reivindicada: IntencaoDeposito,
  _detalhes: DetalhesPagamento,
  regras: RegrasDaLiquidacao,
): ResultadoLiquidacao {
  const buyer = s.users[reivindicada.userEmail]
  if (!buyer) throw new Error(`Usuário ${reivindicada.userEmail} não existe no estado.`)

  // Compra direta de lote via gateway
  const lotId = (reivindicada.metadata?.lotId as string) || ''
  const qtyPedida = Number(reivindicada.metadata?.qty) || 1

  const offers = lotId ? s.sellOffers.filter((o) => o.lotId === lotId) : []
  const sellerId = offers[0]?.seller
  const seller = sellerId ? s.users[sellerId] : undefined

  // Comissão do comprador congelada na cobrança (E8, tarefa 1). Intenção aberta antes da E8 não tem o
  // campo: vale zero, que é exatamente o que o gateway cobrou dela.
  const bruta = Number(reivindicada.metadata?.comissaoCompradorPorMoeda)
  const feeCompradorUnit = Number.isInteger(bruta) && bruta > 0 ? bruta : 0

  // O anúncio de quem tem fatura de custódia vencida não vende, nem quando o pagamento já entrou
  // (RA-53). `regras.contaBloqueavel` foi perguntado ANTES da transação, porque a isenção da equipe
  // é assíncrona. Se o dono do anúncio for outro e-mail, a isenção perguntada não vale para ele e a
  // checagem libera.
  const vendedorPausado =
    Boolean(regras.contaBloqueavel) &&
    sellerId === reivindicada.metadata?.sellerEmail &&
    contaComPendenciaNoEstado(s, sellerId, Date.now())

  // O preço do lote pode ter subido entre abrir a cobrança e o pagamento cair. O que o gateway
  // cobrou precisa cobrir o preço de agora mais a comissão congelada; se não cobrir, a compra não
  // acontece — senão o comprador levaria a moeda pagando menos do que ela custa hoje.
  const precoAgora = offers[0]?.price ?? 0
  const cabeNoValorPago = (precoAgora + feeCompradorUnit) * qtyPedida <= reivindicada.valor

  const podeComprar =
    offers.length >= qtyPedida &&
    Boolean(seller) &&
    sellerId !== reivindicada.userEmail &&
    !vendedorPausado &&
    cabeNoValorPago

  if (podeComprar && seller) {
    const toBuy = offers.slice(0, qtyPedida)
    const price = offers[0].price
    const idsConsumidos = new Set<string>()
    let compradas = 0
    const feeVendedorUnit = comissaoPorMoeda(price, 'vendedor', regras.taxas)

    for (const o of toBuy) {
      idsConsumidos.add(o.id)
      if (!transferCoin(seller, buyer, o.coinId)) continue
      seller.balance += price - feeVendedorUnit
      compradas += 1
    }

    s.sellOffers = s.sellOffers.filter((o) => !idsConsumidos.has(o.id))

    if (compradas > 0) {
      // Grava fee, feeComprador e feeVendedor para que derivar.ts (ledger), diff.ts e statement.ts
      // não recalculem a comissão padrão, o que geraria um lançamento 'ajuste' no livro-razão.
      // A comissão do comprador é a congelada na cobrança (E8); a do vendedor, a da tabela vigente
      // na aprovação (E2). São propositalmente de momentos diferentes: o comprador já pagou, o
      // vendedor está recebendo agora.
      const feeCompradorTotal = feeCompradorUnit * compradas
      const feeVendedorTotal = feeVendedorUnit * compradas
      s.trades.push({
        price,
        qty: compradas,
        date: Date.now(),
        buyer: reivindicada.userEmail,
        seller: sellerId,
        tipoMoeda: offers[0].tipoMoeda,
        fee: feeCompradorTotal + feeVendedorTotal,
        feeComprador: feeCompradorTotal,
        feeVendedor: feeVendedorTotal,
      })

      // Para a contabilidade: entrada externa que cobriu a compra. Precisa cobrir o que o
      // livro-razão debita do comprador — preço mais comissão de compra —, senão derivarLancamentos
      // fecha a conta com um lançamento 'ajuste'.
      s.deposits.push({
        userEmail: reivindicada.userEmail,
        valor: (price + feeCompradorUnit) * compradas,
        date: Date.now(),
      })

      // Se apenas parte das moedas do lote pôde ser transferida, o troco fica no saldo
      const troco = reivindicada.valor - (price + feeCompradorUnit) * compradas
      if (troco > 0) {
        buyer.balance += troco
        s.deposits.push({
          userEmail: reivindicada.userEmail,
          valor: troco,
          date: Date.now(),
        })
      }

      return { sucesso: true, motivo: 'compra_direta_concluida', compraConcluida: true }
    } else {
      // Transferência falhou em todas as moedas: credita integralmente ao comprador
      buyer.balance += reivindicada.valor
      s.deposits.push({
        userEmail: reivindicada.userEmail,
        valor: reivindicada.valor,
        date: Date.now(),
      })
      return { sucesso: true, motivo: 'lote_indisponivel_creditado_em_saldo', compraConcluida: false }
    }
  } else {
    // A compra não acontece, por um de três motivos: o lote sumiu (corrida de compra ou anúncio
    // cancelado), o anúncio ficou pausado por pendência do vendedor (RA-53) ou o preço subiu depois
    // da cobrança e o valor pago não cobre mais o anúncio.
    //
    // Em todos, o VALOR INTEIRO vira saldo em conta, e não devolução pelo gateway: estornar exigiria
    // uma chamada de saída ao Mercado Pago, que a conta não tem credenciada, e deixaria o dinheiro
    // em trânsito por dias. Com saldo, o cliente compra de novo na hora ou pede saque (RA-56).
    //
    // Nenhuma oferta sai do livro nestes ramos: o anúncio pausado continua gravado (RA-52) e o que
    // subiu de preço continua à venda.
    buyer.balance += reivindicada.valor
    s.deposits.push({
      userEmail: reivindicada.userEmail,
      valor: reivindicada.valor,
      date: Date.now(),
    })
    const motivo = vendedorPausado
      ? 'vendedor_com_pendencia_creditado_em_saldo'
      : !cabeNoValorPago && offers.length >= qtyPedida
        ? 'valor_pago_nao_cobre_o_anuncio_creditado_em_saldo'
        : 'lote_indisponivel_creditado_em_saldo'
    return { sucesso: true, motivo, compraConcluida: false }
  }
}

/**
 * Liquidador de fatura de custódia (passo B2.4).
 * Marca a fatura como paga, ativa o plano correspondente (se origem 'contratacao')
 * ou renova (se origem 'renovacao_anual'), registra a entrada externa em deposits
 * e reavalia a inadimplência do usuário.
 */
function liquidarFaturaCustodia(
  s: AppState,
  reivindicada: IntencaoDeposito,
): ResultadoLiquidacao {
  const buyer = s.users[reivindicada.userEmail]
  if (!buyer) throw new Error(`Usuário ${reivindicada.userEmail} não existe no estado.`)

  const faturaId = (reivindicada.metadata?.faturaId as string) || ''
  s.faturasCustodia = s.faturasCustodia ?? []
  const fatura = s.faturasCustodia.find((f) => f.id === faturaId)

  if (!fatura) {
    buyer.balance += reivindicada.valor
    s.deposits.push({
      userEmail: reivindicada.userEmail,
      valor: reivindicada.valor,
      date: Date.now(),
    })
    return { sucesso: true, motivo: 'fatura_custodia_creditada_saldo' }
  }

  if (fatura.status === 'paga') {
    return { sucesso: true, motivo: 'fatura_ja_paga' }
  }

  const agora = Date.now()
  const metodoPagamento: FormaPagamentoFatura =
    reivindicada.metodo === 'pix' ? 'pix' : 'cartao'

  fatura.status = 'paga'
  fatura.dataPagamento = agora
  fatura.formaPagamento = metodoPagamento
  fatura.paymentIntentId = reivindicada.externalReference

  // Para a contabilidade: entrada externa que cobriu a fatura de custódia
  s.deposits.push({
    userEmail: reivindicada.userEmail,
    valor: fatura.valorCents,
    date: agora,
  })

  // Se a fatura é de contratação de plano, ativa o plano correspondente
  if (fatura.origem === 'contratacao' && fatura.planoId) {
    s.planosCustodia = s.planosCustodia ?? []
    const plano = s.planosCustodia.find((p) => p.id === fatura.planoId)
    if (plano) {
      plano.status = 'vigente'
      plano.pagoAteCompetencia = calcularPagoAte(plano.inicioCompetencia, plano.modalidade)
      plano.formaPagamento = metodoPagamento
      plano.paymentIntentRef = reivindicada.externalReference
      plano.atualizadoEm = agora
    }
  } else if (fatura.origem === 'renovacao_anual' && fatura.planoId) {
    s.planosCustodia = s.planosCustodia ?? []
    const plano = s.planosCustodia.find((p) => p.id === fatura.planoId)
    if (plano) {
      // Renovação estende pelo prazo do plano: 12 meses no anual, 24 no de 24 meses.
      plano.pagoAteCompetencia = somarMeses(plano.pagoAteCompetencia ?? plano.inicioCompetencia, mesesCobertos(plano.modalidade))
      plano.formaPagamento = metodoPagamento
      plano.atualizadoEm = agora
    }
  }

  // Não grava user.inadimplente: essa coluna é a marca manual do painel (marcarInadimplencia).
  // A inadimplência por fatura é calculada por quem lê (E8). Pagar a fatura já tira a conta da
  // inadimplência por fatura, porque ela sai das próprias faturas.
  return { sucesso: true, motivo: 'fatura_custodia_liquidada' }
}

/**
 * Liquidador de assinatura de custódia (passo B2.8).
 * Atualiza o plano de custódia com a assinaturaId, avança competência paga
 * e quita a fatura correspondente caso exista.
 */
function liquidarAssinaturaCustodia(
  s: AppState,
  reivindicada: IntencaoDeposito,
): ResultadoLiquidacao {
  const buyer = s.users[reivindicada.userEmail]
  if (!buyer) throw new Error(`Usuário ${reivindicada.userEmail} não existe no estado.`)

  const agora = Date.now()
  const planoId = (reivindicada.metadata?.planoId as string) || ''
  s.planosCustodia = s.planosCustodia ?? []
  const plano = s.planosCustodia.find((p) => p.id === planoId)

  s.deposits.push({
    userEmail: reivindicada.userEmail,
    valor: reivindicada.valor,
    date: agora,
  })

  if (plano) {
    if (reivindicada.metadata?.assinaturaId) {
      plano.assinaturaId = String(reivindicada.metadata.assinaturaId)
    }
    plano.status = 'vigente'
    // Um mês por cobrança: a assinatura do gateway é recorrente mensal. Nenhum plano
    // entra por aqui hoje — o plano anual é pago de uma vez (B2.8 continua de pé
    // para a cobrança recorrente do ciclo, se um dia for ligada).
    plano.pagoAteCompetencia = somarMeses(plano.pagoAteCompetencia ?? plano.inicioCompetencia, 1)
    plano.formaPagamento = 'cartao'
    plano.atualizadoEm = agora

    // Se houver fatura pendente para esta competência e este plano, marca como paga
    s.faturasCustodia = s.faturasCustodia ?? []
    const fatura = s.faturasCustodia.find(
      (f) => f.planoId === plano.id && f.status !== 'paga' && f.status !== 'cancelada',
    )
    if (fatura) {
      fatura.status = 'paga'
      fatura.dataPagamento = agora
      fatura.formaPagamento = 'cartao'
      fatura.paymentIntentId = reivindicada.externalReference
    }
  } else {
    // Failsafe: se plano não foi encontrado, credita no saldo
    buyer.balance += reivindicada.valor
  }

  return { sucesso: true, motivo: 'assinatura_custodia_liquidada' }
}

/**
 * Liquidador de retirada física (passo B3).
 * Transiciona status para 'paga', extingue recibo, recalcula D+30 a partir
 * da data de confirmação do pagamento e registra entrada externa no ledger.
 */
function liquidarRetirada(
  s: AppState,
  reivindicada: IntencaoDeposito,
  detalhes: DetalhesPagamento,
  regras: RegrasDaLiquidacao,
): ResultadoLiquidacao {
  const buyer = s.users[reivindicada.userEmail]
  if (!buyer) throw new Error(`Usuário ${reivindicada.userEmail} não existe no estado.`)

  const agora = Date.now()
  s.retiradas = s.retiradas ?? []

  const retiradaId = (reivindicada.metadata?.retiradaId as string) || ''
  const ret = s.retiradas.find(
    (r) => r.id === retiradaId || r.paymentIntentRef === reivindicada.externalReference,
  )

  if (!ret) {
    buyer.balance += reivindicada.valor
    s.deposits.push({
      userEmail: reivindicada.userEmail,
      valor: reivindicada.valor,
      date: agora,
    })
    return { sucesso: true, motivo: 'retirada_nao_localizada_creditada_saldo' }
  }

  if (ret.status === 'paga') {
    return { sucesso: true, motivo: 'retirada_ja_paga' }
  }

  const coin = buyer.coins.find((c) => c.id === ret.coinId)
  const comPendencia =
    Boolean(regras.contaBloqueavel) &&
    contaComPendenciaNoEstado(s, reivindicada.userEmail, agora)
  const reciboBloqueado = coin?.recibo.status === 'Bloqueado'

  if (comPendencia || reciboBloqueado) {
    // RA-53: o recibo só se extingue se a conta pudesse retirar AGORA. Entre abrir a cobrança e o
    // pagamento cair, a fatura de custódia pode ter vencido — e extinguir o recibo é irreversível.
    // O dinheiro não se perde: vira saldo, e a retirada continua esperando pagamento. Pagar com
    // saldo depois que a fatura for paga (ou o recibo, liberado) é o caminho de volta, já coberto
    // por pagarRetiradaComSaldo. O aviso na tela de pagamento fica no RA-56.
    const forma = reivindicada.metodo === 'pix' ? 'Pix' : 'Cartão de Crédito'
    const motivoEvento = comPendencia
      ? `Pagamento via ${forma} aprovado com fatura de custódia vencida: o valor entrou no saldo em conta e a retirada continua aguardando pagamento.`
      : `Pagamento via ${forma} aprovado com o recibo bloqueado: o valor entrou no saldo em conta e a retirada continua aguardando pagamento.`

    buyer.balance += reivindicada.valor
    s.deposits.push({
      userEmail: reivindicada.userEmail,
      valor: reivindicada.valor,
      date: agora,
    })
    ret.historico.push({
      de: ret.status,
      para: ret.status,
      data: agora,
      motivo: motivoEvento,
      autor: 'gateway',
    })
    ret.updatedAt = agora

    return {
      sucesso: true,
      motivo: comPendencia
        ? 'retirada_com_pendencia_creditada_em_saldo'
        : 'recibo_bloqueado_creditado_em_saldo',
    }
  }

  // 1. Atualiza status da retirada
  ret.status = 'paga'
  ret.pagoEm = agora
  ret.formaPagamento = reivindicada.metodo === 'pix' ? 'pix' : 'cartao'
  ret.paymentIntentRef = reivindicada.externalReference
  ret.parcelas = detalhes.parcelas || (reivindicada.metadata?.parcelas as number) || 1
  ret.dataLimiteD30 = calcularPrazoLimiteRetirada(agora)
  ret.historico.push({
    de: 'solicitada',
    para: 'paga',
    data: agora,
    motivo: `Taxa de retirada paga via ${reivindicada.metodo === 'pix' ? 'Pix' : 'Cartão de Crédito'}`,
    autor: 'gateway',
  })
  ret.updatedAt = agora

  // 2. Extinção do recibo da moeda (Regra inegociável do Bloco 10)
  if (coin) {
    coin.recibo.status = 'Extinto'
  }

  // 3. Registra entrada externa (depósito) para o valor da taxa
  // Fecha o livro-razão sem ajuste com o lançamento de taxa_retirada
  s.deposits.push({
    userEmail: reivindicada.userEmail,
    valor: ret.valorTaxaCents,
    date: agora,
  })

  return { sucesso: true, motivo: 'retirada_liquidada' }
}

export const LIQUIDADORES: Record<TipoOperacaoPagamento, Liquidador> = {
  deposito: liquidarDeposito,
  compra_direta: liquidarCompraDireta,
  fatura_custodia: liquidarFaturaCustodia,
  plano_custodia: liquidarFaturaCustodia,
  assinatura_custodia: liquidarAssinaturaCustodia,
  retirada: liquidarRetirada,
}

/**
 * Confere um pagamento no gateway e despacha a liquidação pelo tipo de operação.
 *
 * A ORDEM DAS TRAVAS É A REGRA, NÃO O ESTILO
 * ------------------------------------------
 *  1. **O status vem do gateway, nunca do webhook.** O corpo da notificação diz
 *     apenas "algo aconteceu com o pagamento X"; quem afirma que ele foi
 *     aprovado é a consulta autenticada à API. Confiar no payload seria aceitar
 *     que qualquer pessoa com a URL do webhook se credite.
 *  2. **O valor é conferido contra a intenção.** Se o que o gateway cobrou não
 *     bate com o que a plataforma pediu, o depósito é recusado e o motivo fica
 *     gravado. Creditar o valor do gateway sem conferir permitiria pagar R$ 1,00
 *     numa cobrança de R$ 1.000,00 e receber os mil.
 *  3. **A intenção é reivindicada antes do crédito**, com um UPDATE que só
 *     encontra `pendente` uma vez. É o que impede duas entregas simultâneas do
 *     mesmo evento de creditarem duas vezes — a idempotência do evento protege
 *     o caso comum, esta trava protege o caso simultâneo.
 *  4. **Despachante por tipo de operação (Passo B1.4)**:
 *     - `deposito`: credita `u.balance` e registra em `deposits`.
 *     - `compra_direta`: transfere as moedas e credita o vendedor líquido da comissão da tabela vigente.
 *     - `fatura_custodia` / `plano_custodia` / `assinatura_custodia`: B2.
 *     - `retirada`: B3.
 *  5. **Separação contábil do gateway (Passo B1.3 / B1.4, F-5, RA-30, RA-32)**:
 *     Após a mutação de estado, grava o recebimento em `aurea.recebimentos_gateway`
 *     com valor bruto, taxa do gateway, valor líquido e competência contábil.
 *
 * Se o crédito falhar depois da reivindicação, a intenção volta para `pendente`:
 * caso contrário ela ficaria travada em `creditando` para sempre, e o cliente
 * teria pago sem receber.
 */
export async function conciliarPagamento(paymentId: string): Promise<ResultadoConciliacao> {
  const detalhes = await consultarPagamentoMercadoPago(paymentId)

  if (detalhes.status !== 'approved') {
    return { creditado: false, motivo: `pagamento com status "${detalhes.status}"` }
  }

  const ref = detalhes.externalReference
  if (!ref) {
    return { creditado: false, motivo: 'pagamento sem referência externa' }
  }

  const intencoes = repositorioIntencoes()
  const intencao = await intencoes.buscar(ref)
  if (!intencao) {
    return { creditado: false, motivo: `nenhuma intenção de depósito para ${ref}`, externalReference: ref }
  }

  if (intencao.valor !== detalhes.valorCents) {
    const motivo = `valor divergente: cobrado ${brl(detalhes.valorCents)}, esperado ${brl(intencao.valor)}`
    await intencoes.recusar(ref, motivo)
    return { creditado: false, motivo, externalReference: ref }
  }

  const reivindicada = await intencoes.reivindicar(ref)
  if (!reivindicada) {
    return {
      creditado: false,
      motivo: `intenção ${ref} já estava com status "${intencao.status}"`,
      externalReference: ref,
    }
  }

  const tipo: TipoOperacaoPagamento =
    reivindicada.tipoOperacao || (ref.startsWith('CMP-') ? 'compra_direta' : 'deposito')
  const liquidador = LIQUIDADORES[tipo] ?? liquidarDeposito

  let resLiquidacao: ResultadoLiquidacao = { sucesso: true, motivo: 'creditado' }

  try {
    // A tabela é lida antes da transação, como em buyLot (executar, src/server/actions/market.ts).
    // Leitura que falha não pode deixar o pagamento sem liquidar: o cliente já pagou. Vale a
    // tabela padrão, a mesma regra de carregarConfiguracaoDoSite (RA-47).
    const taxas = await carregarTabelaDeTaxas().catch((err: unknown) => {
      console.error('[conciliarPagamento] tabela de taxas não leu; valendo o padrão do código:', err)
      return TAXAS_PADRAO
    })

    // Quem a pendência de custódia pode travar nesta liquidação, e se essa conta é da equipe
    // (RA-53). Pergunta assíncrona, por isso fora do mutateState. Checagem que falha libera: o
    // dinheiro já entrou, e a regra da E4 é "nada tranca a equipe para fora".
    const emailQuePodeTravar =
      tipo === 'compra_direta'
        ? String(reivindicada.metadata?.sellerEmail ?? '')
        : tipo === 'retirada'
          ? reivindicada.userEmail
          : ''
    const contaBloqueavelNaLiquidacao = emailQuePodeTravar
      ? await contaBloqueavel(emailQuePodeTravar).catch(() => false)
      : false

    await mutateState((s) => {
      resLiquidacao = liquidador(s, reivindicada, detalhes, {
        taxas,
        contaBloqueavel: contaBloqueavelNaLiquidacao,
      })
    })
  } catch (erro) {
    await intencoes.devolverParaPendente(ref)
    throw erro
  }

  // Gravação idempotente em aurea.recebimentos_gateway (Passo B1.3/B1.4, F-5, RA-30, RA-32).
  // Fica fora da transação do estado.
  try {
    const aprovadoEm = detalhes.dateApproved ?? Date.now()
    await gravarRecebimento({
      paymentId,
      externalReference: ref,
      tipoOperacao: tipo,
      userEmail: reivindicada.userEmail,
      metodo: detalhes.paymentMethodId || detalhes.paymentTypeId || 'desconhecido',
      parcelas: detalhes.parcelas || 1,
      valorBruto: detalhes.valorCents,
      valorPagoCliente: detalhes.totalPagoCents || detalhes.valorCents,
      tarifaGateway: detalhes.tarifaCents || 0,
      valorLiquido:
        detalhes.valorLiquidoCents || (detalhes.valorCents - (detalhes.tarifaCents || 0)),
      aprovadoEm,
      liberacaoPrevista: detalhes.dataLiberacao,
      competencia: competenciaAtual(aprovadoEm),
    })
  } catch (errRecebimento) {
    console.error('[conciliarPagamento] Erro ao gravar recebimento_gateway:', errRecebimento)
  }

  // Atualização da retirada no repositório persistente quando liquidada via gateway
  if (tipo === 'retirada') {
    try {
      const repo = repositorioRetiradas()
      const retId = (reivindicada.metadata?.retiradaId as string) || ''
      const ret = await repo.buscarPorId(retId)

      // O valor virou saldo em vez de liquidar a retirada (RA-53). O status NÃO muda — a retirada
      // continua esperando pagamento —, mas o histórico do repositório precisa contar o mesmo que o
      // do estado, porque é ele que /retirada e o painel leem.
      const creditadoEmSaldo =
        resLiquidacao.motivo === 'retirada_com_pendencia_creditada_em_saldo' ||
        resLiquidacao.motivo === 'recibo_bloqueado_creditado_em_saldo'

      if (ret && ret.status !== 'paga' && creditadoEmSaldo) {
        const agora = Date.now()
        const forma = reivindicada.metodo === 'pix' ? 'Pix' : 'Cartão de Crédito'
        ret.historico.push({
          de: ret.status,
          para: ret.status,
          data: agora,
          motivo:
            resLiquidacao.motivo === 'retirada_com_pendencia_creditada_em_saldo'
              ? `Pagamento via ${forma} aprovado com fatura de custódia vencida: o valor entrou no saldo em conta e a retirada continua aguardando pagamento.`
              : `Pagamento via ${forma} aprovado com o recibo bloqueado: o valor entrou no saldo em conta e a retirada continua aguardando pagamento.`,
          autor: 'gateway',
        })
        ret.updatedAt = agora
        await repo.atualizar(ret)
      } else if (ret && ret.status !== 'paga') {
        const agora = Date.now()
        ret.status = 'paga'
        ret.pagoEm = agora
        ret.formaPagamento = reivindicada.metodo === 'pix' ? 'pix' : 'cartao'
        ret.paymentIntentRef = reivindicada.externalReference
        ret.parcelas = detalhes.parcelas || (reivindicada.metadata?.parcelas as number) || 1
        ret.dataLimiteD30 = calcularPrazoLimiteRetirada(agora)
        ret.historico.push({
          de: 'solicitada',
          para: 'paga',
          data: agora,
          motivo: `Taxa de retirada paga via ${reivindicada.metodo === 'pix' ? 'Pix' : 'Cartão de Crédito'}`,
          autor: 'gateway',
        })
        ret.updatedAt = agora
        await repo.atualizar(ret)
      }
    } catch (errRet) {
      console.error('[conciliarPagamento] Erro ao atualizar retirada no banco:', errRet)
    }
  }

  await intencoes.concluir(ref, paymentId)
  return {
    creditado: true,
    motivo: resLiquidacao.motivo,
    externalReference: ref,
    valorCents: reivindicada.valor,
    userEmail: reivindicada.userEmail,
    tipoOperacao: tipo,
    compraConcluida: resLiquidacao.compraConcluida,
  }
}
