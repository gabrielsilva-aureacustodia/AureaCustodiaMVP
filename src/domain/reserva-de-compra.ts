/**
 * DOMÍNIO — A janela de pagamento da oferta de compra pós-paga.
 *
 * Pedido do Gabriel em 22/09/2026. Até então, publicar oferta de compra exigia
 * saldo em conta, e a quantidade era cortada ao que o caixa aguentava
 * (`publishBid`). A regra era coerente com o casamento automático — o débito
 * acontece sozinho, então o dinheiro precisa existir —, mas trancava quem não
 * quer deixar dinheiro parado na plataforma esperando uma venda aparecer.
 *
 * Passaram a existir três modalidades (`ModalidadeOfertaCompra`). Este módulo
 * cuida só da terceira, que é a única que muda o mecanismo do mercado:
 *
 *   saldo    dinheiro em conta, debitado no casamento — o comportamento antigo
 *   prepago  pago antes e preso à oferta; no casamento age como saldo
 *   pospago  nada pago; o casamento abre uma RESERVA com prazo
 *
 * A REGRA QUE DEFINE O PÓS-PAGO
 * -----------------------------
 * "quando a oferta for aceita no automático por outra oferta de venda, o
 * usuário tem até 10 minutos para pagar a oferta; se não pagar, a fila anda e
 * o próximo que fez oferta como ele pega a moeda."
 *
 * Então, no casamento de um bid pós-pago, a moeda **não troca de dono**. Ela
 * sai do livro e fica reservada. Quem continua dono é o VENDEDOR — transferir
 * antes de receber abriria a porta para o comprador revender uma moeda que
 * nunca pagou, e o recibo mudaria de mãos sem contrapartida.
 *
 * Expirado o prazo: a oferta de venda volta ao livro, a reserva vira
 * `expirada` e o bid **perde a vez**. Perder a vez é reescrever
 * `prioridadeEm` para agora, o que joga o bid para o fim da fila do próprio
 * preço — a mesma mecânica que a decisão F-3 já usava quando alguém edita o
 * preço ou aumenta a quantidade. Sem isso, o caloteiro reservaria a mesma
 * moeda para sempre, e a fila nunca andaria.
 *
 * O prazo não é varrido por rotina agendada: dez minutos são curtos demais
 * para depender de cron, e a plataforma não tem um rodando a esse ritmo. Quem
 * expira é `expirarReservasVencidas`, chamada no começo de todo casamento —
 * ou seja, a fila anda exatamente quando alguém tenta usar o mercado, que é
 * quando isso importa.
 *
 * Módulo puro: sem I/O, sem async. Muta os arrays que recebe, como o resto do
 * domínio, e quem chama já está dentro de `mutateState`.
 */

import type {
  AppState,
  BuyOrder,
  Cents,
  ModalidadeOfertaCompra,
  ReservaDeCompra,
  SellOffer,
  Timestamp,
  UserEmail,
} from '@/domain/types'

/** Dez minutos, em milissegundos — o prazo que o Gabriel definiu. */
export const PRAZO_DA_RESERVA_MS = 10 * 60 * 1000

export const MENSAGEM_RESERVA_EXPIRADA =
  'O prazo de pagamento desta reserva venceu e a moeda voltou ao mercado.'

export const MENSAGEM_RESERVA_DE_OUTRO =
  'Esta reserva pertence a outro usuário.'

/** A modalidade de um bid, tratando a ausência do campo como `saldo`. */
export function modalidadeDoBid(bo: Pick<BuyOrder, 'modalidade'>): ModalidadeOfertaCompra {
  return bo.modalidade ?? 'saldo'
}

/**
 * Quanto este bid tem de dinheiro disponível para gastar AGORA.
 *
 * No saldo é o caixa da conta. No pré-pago é o que já entrou preso à oferta —
 * e de propósito não é somado ao saldo: dinheiro de pré-pago é daquela oferta,
 * e deixá-lo no caixa geral permitiria gastá-lo em outra compra qualquer,
 * deixando a oferta bancada por nada.
 *
 * No pós-pago é zero, sempre: ele não paga antes, é essa a ideia.
 */
export function fundosDoBid(bo: BuyOrder, saldoDaConta: Cents): Cents {
  const modalidade = modalidadeDoBid(bo)
  if (modalidade === 'saldo') return saldoDaConta
  if (modalidade === 'prepago') return bo.pagoAntecipadoCents ?? 0
  return 0
}

let contador = 0

/** `RSV-1790095` + contador, único dentro do processo. */
export function novoIdDeReserva(agora: Timestamp = Date.now()): string {
  contador += 1
  return `RSV-${agora.toString(36)}-${contador.toString(36)}`
}

export interface AberturaDeReserva {
  bo: BuyOrder
  oferta: SellOffer
  comissaoCompradorCents: Cents
  agora: Timestamp
}

/**
 * Abre a reserva de uma moeda para um bid pós-pago que acabou de casar.
 *
 * Quem chama já removeu a oferta do livro — é o casamento que decide isso, e
 * manter a remoção lá evita que a mesma oferta seja reservada duas vezes na
 * mesma volta do laço.
 */
export function abrirReserva(e: AberturaDeReserva): ReservaDeCompra {
  return {
    id: novoIdDeReserva(e.agora),
    bidId: e.bo.id,
    comprador: e.bo.buyer,
    vendedor: e.oferta.seller,
    coinId: e.oferta.coinId,
    tipoMoeda: e.oferta.tipoMoeda,
    precoCents: e.oferta.price,
    // Congelada no casamento: a Tabela de Taxas pode mudar dentro dos dez
    // minutos, e o comprador paga o que viu quando a reserva abriu.
    comissaoCompradorCents: e.comissaoCompradorCents,
    totalCents: e.oferta.price + e.comissaoCompradorCents,
    // Cópia rasa: a oferta some do livro agora e precisa voltar idêntica.
    oferta: { ...e.oferta },
    criadaEm: e.agora,
    expiraEm: e.agora + PRAZO_DA_RESERVA_MS,
    status: 'aguardando_pagamento',
    paymentIntentRef: null,
    avisadoEm: null,
  }
}

/**
 * Este bid já deixou expirar uma reserva DESTA moeda?
 *
 * Rebaixar `prioridadeEm` põe o caloteiro atrás de quem já estava na fila, e
 * resolve o caso que o Gabriel descreveu — "o próximo que fez oferta como ele
 * pega a moeda". Mas não resolve o caso em que ele é o ÚNICO da fila: aí ele
 * reserva a mesma moeda de novo no instante seguinte e a trava para sempre,
 * dez minutos por vez, sem nunca pagar.
 *
 * Então uma segunda regra: o par (bid, moeda) só tem uma chance. A moeda volta
 * ao mercado de verdade, disponível para qualquer outro comprador e para
 * qualquer outra oferta do mesmo comprador — mas não para a oferta que já
 * falhou com ela.
 *
 * Não precisa de campo novo: a reserva expirada já está gravada e é a própria
 * memória do que aconteceu.
 */
export function bidJaFalhouComAMoeda(
  state: AppState,
  bidId: string,
  coinId: string,
): boolean {
  return (state.reservas ?? []).some(
    (r) => r.bidId === bidId && r.coinId === coinId && r.status === 'expirada',
  )
}

/** As reservas de uma conta que ainda estão correndo. */
export function reservasEmAberto(
  state: AppState,
  email: UserEmail,
  agora: Timestamp = Date.now(),
): ReservaDeCompra[] {
  return (state.reservas ?? []).filter(
    (r) => r.comprador === email && r.status === 'aguardando_pagamento' && r.expiraEm > agora,
  )
}

/**
 * A moeda está presa numa reserva ainda em aberto?
 *
 * ESTA É A CHECAGEM QUE `publishOffer` NUNCA FEZ (28/09/2026, achado do
 * Gabriel). Quando uma oferta pós-paga casa, a moeda SAI de `sellOffers` e
 * fica guardada dentro da reserva por dez minutos — o vendedor continua dono
 * dela, mas ela não está mais anunciada. `publishOffer` só recusava moeda que
 * já estivesse EM `sellOffers`; uma moeda reservada não está, então parecia
 * livre para anunciar de novo. Foi assim que a Rozâne conseguiu publicar a
 * RO-000101 a R$ 400,00 enquanto ela ainda estava reservada para o comprador
 * do bid de R$ 200,00 — dezenove segundos depois de casar.
 *
 * `availableCoinsForSell` (src/domain/market.ts) já usava esta regra desde a
 * primeira correção do dia; esta função existe para que `publishOffer`, que
 * tem o próprio filtro de moedas e nunca chamava `availableCoinsForSell`,
 * passe a checar exatamente a mesma coisa.
 */
export function moedaEmReservaAberta(
  state: AppState,
  coinId: string,
  agora: Timestamp = Date.now(),
): boolean {
  // O PRAZO CONTA, NÃO Só O STATUS. `expirarReservasVencidas` é quem muda o
  // status para 'expirada' — e ela só roda dentro de `matchOrders`. Uma
  // reserva com o prazo já vencido mas ainda marcada 'aguardando_pagamento'
  // (porque a varredura ainda não passou nesta transação) precisa contar como
  // LIVRE aqui, senão `publishOffer` recusaria republicar uma moeda cujo
  // comprador já perdeu o prazo há muito tempo.
  return (state.reservas ?? []).some(
    (r) => r.coinId === coinId && r.status === 'aguardando_pagamento' && r.expiraEm > agora,
  )
}

/**
 * Fecha as reservas cujo prazo venceu e devolve as moedas ao mercado.
 *
 * Devolve as reservas que expiraram nesta passagem, para quem chamou poder
 * avisar o comprador. Roda no começo de todo casamento; é barata quando não há
 * reserva nenhuma, que é o caso comum.
 */
export function expirarReservasVencidas(
  state: AppState,
  agora: Timestamp = Date.now(),
): ReservaDeCompra[] {
  const reservas = state.reservas
  if (!reservas || reservas.length === 0) return []

  const expiradas: ReservaDeCompra[] = []

  for (const r of reservas) {
    if (r.status !== 'aguardando_pagamento') continue
    if (r.expiraEm > agora) continue

    r.status = 'expirada'
    expiradas.push(r)

    // A moeda volta ao livro — mas só se o vendedor ainda a tiver. Ele pode
    // tê-la retirado fisicamente ou vendido por fora nesses dez minutos, e
    // ressuscitar a oferta criaria anúncio de moeda que não existe mais.
    const vendedor = state.users[r.vendedor]
    const aindaEDele = vendedor?.coins.some((c) => c.id === r.coinId) ?? false
    const jaNoLivro = state.sellOffers.some((o) => o.coinId === r.coinId)

    if (aindaEDele && !jaNoLivro) {
      // A oferta volta como era, inclusive `obs` e `lotId` — é o `lotId` que
      // reagrupa a moeda no mesmo anúncio na vitrine.
      //
      // Ela NÃO perde a vez: quem não cumpriu foi o comprador. Com
      // `prioridadeEm` intacto, o vendedor volta ao lugar que já era dele na
      // fila de vendas.
      state.sellOffers.push({ ...r.oferta })
    }

    // O bid, esse sim, vai para o fim da fila do próprio preço.
    const bo = state.buyOrders.find((b) => b.id === r.bidId)
    if (bo) bo.prioridadeEm = agora
  }

  return expiradas
}

/**
 * Marca a reserva como paga. Quem move moeda e dinheiro é quem chama — este
 * módulo é puro e não conhece `transferirMoedaVendida`.
 *
 * Recusa reserva vencida mesmo que ninguém a tenha expirado ainda: o relógio
 * manda, não a passagem do varredor.
 */
export function marcarReservaPaga(
  r: ReservaDeCompra,
  agora: Timestamp = Date.now(),
): { ok: true } | { ok: false; erro: string } {
  if (r.status === 'paga') return { ok: false, erro: 'Esta reserva já foi paga.' }
  if (r.status === 'cancelada') return { ok: false, erro: 'Esta reserva foi cancelada.' }
  if (r.status === 'expirada' || r.expiraEm <= agora) {
    return { ok: false, erro: MENSAGEM_RESERVA_EXPIRADA }
  }
  r.status = 'paga'
  return { ok: true }
}

/** Quanto falta, em milissegundos, para a reserva vencer. Nunca negativo. */
export function tempoRestante(r: ReservaDeCompra, agora: Timestamp = Date.now()): number {
  return Math.max(0, r.expiraEm - agora)
}

/**
 * Devolve ao saldo o dinheiro que ficou preso numa oferta pré-paga.
 *
 * DINHEIRO PRESO NÃO PODE SUMIR COM A OFERTA (28/09/2026)
 * -------------------------------------------------------
 * O pré-pago guarda o valor em `pagoAntecipadoCents`, fora do caixa da conta.
 * Até aqui, apagar o bid — pelo botão "Cancelar" do dono ou pelo painel —
 * apagava junto o dinheiro: ele não estava no saldo, não estava em lugar
 * nenhum, e simplesmente deixava de existir. O pop-up de pagamento chega a
 * prometer o contrário ("se você cancelar a oferta antes de ela executar, o
 * dinheiro volta como saldo em conta"), e era uma promessa que o código não
 * cumpria.
 *
 * Não grava em `deposits`: o dinheiro já entrou na plataforma quando o gateway
 * confirmou, e registrá-lo de novo contaria a mesma entrada duas vezes no
 * livro-razão. A volta ao caixa é movimento interno, e o ledger a deriva como
 * `ajuste` — que é justamente o lançamento que existe para saldo que muda sem
 * negociação nem depósito.
 *
 * Devolve quanto foi devolvido, para quem chama poder contar na mensagem.
 */
export function devolverLastroDoBid(state: AppState, bo: BuyOrder): Cents {
  if (modalidadeDoBid(bo) !== 'prepago') return 0
  const preso = bo.pagoAntecipadoCents ?? 0
  if (preso <= 0) return 0

  const comprador = state.users[bo.buyer]
  if (!comprador) return 0

  comprador.balance += preso
  bo.pagoAntecipadoCents = 0
  return preso
}

/**
 * Tira do livro as ordens de compra que não conseguem pagar nem uma moeda.
 *
 * POR QUE O MOTOR DEIXOU DE SÓ "PULAR" (28/09/2026)
 * -------------------------------------------------
 * `matchOrders` pula a ordem sem fundos e segue — a nota ao lado da conta
 * dizia, com razão, que não se cancela um bid por "falta de caixa momentânea".
 * O efeito colateral é que o livro acumula ordens que nunca vão executar, e
 * elas parecem vivas para todo mundo: o dono acha que está na fila, o vendedor
 * vê demanda que não existe.
 *
 * O Gabriel pediu o contrário, e a razão dele é a que vale: "toda oferta na
 * fila que casar, acontecer". Ordem que não pode pagar sai da fila.
 *
 * O PÓS-PAGO NÃO ENTRA AQUI, e não é exceção esquecida: ele não tem lastro por
 * definição — casa primeiro e paga depois, dentro da reserva. Purgá-lo seria
 * apagar a modalidade inteira.
 *
 * O que sobra de pré-pago volta para o saldo antes de a ordem sair.
 */
export function expurgarOrdensSemLastro(
  state: AppState,
  precoMaisComissao: (preco: Cents) => Cents,
): BuyOrder[] {
  const removidas: BuyOrder[] = []

  state.buyOrders = state.buyOrders.filter((bo) => {
    if (modalidadeDoBid(bo) === 'pospago') return true
    if (bo.qty <= 0) return true

    const comprador = state.users[bo.buyer]
    if (!comprador) {
      removidas.push(bo)
      return false
    }

    const podePagarUma = fundosDoBid(bo, comprador.balance) >= precoMaisComissao(bo.price)
    if (!podePagarUma) {
      devolverLastroDoBid(state, bo)
      removidas.push(bo)
    }
    return podePagarUma
  })

  return removidas
}
