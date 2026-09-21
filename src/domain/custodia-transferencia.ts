/**
 * DOMÍNIO — A custódia acompanha a moeda, não a pessoa.
 *
 * Pedido do Gabriel em 21/09/2026. Até aqui, vender uma moeda em custódia
 * deixava dois buracos ao mesmo tempo: o VENDEDOR continuava com a moeda no
 * plano dele — e portanto continuava sendo cobrado por guardar coisa que não é
 * mais dele — e o COMPRADOR ficava com uma moeda guardada de graça, porque
 * ninguém criava cobrança nenhuma no nome dele. A empresa guarda o objeto o ano
 * inteiro; quem paga é quem é dono dele no mês.
 *
 * O EXEMPLO QUE DEFINIU A REGRA, nas palavras dele:
 *
 *   "eu enviei uma moeda e coloquei na custódia, paguei 24 reais (2 por mês,
 *   por 12 meses). Segurei a moeda por um mês. No mês 2, vendi para outro
 *   usuário. Agora faltam 11 meses de custódia. O Rogério, que comprou, tem
 *   que pagar a próxima parcela — ele será cobrado 22 reais em 11x."
 *
 * E a contrapartida: "se ele pagou a custódia no dia 21/09, e até o dia 21/10
 * vender a moeda, ele não deve ser cobrado a parcela do dia 21/10".
 *
 * COMO A CONTA É FEITA
 * --------------------
 * O vendedor cobre sempre, no mínimo, o mês em que contratou — essa parcela ele
 * pagou no ato e não tem como devolver. A partir daí o comprador assume: o
 * primeiro mês do comprador é o mês da venda, ou o mês seguinte ao início do
 * plano, o que vier DEPOIS. Vender no mesmo mês da contratação não faz o
 * comprador pagar de novo o mês que o vendedor já pagou.
 *
 *   início 2026-09, cobertura até 2027-08, venda em 2026-10
 *     -> comprador começa em 2026-10 e deve 11 meses = R$ 22,00 em 11x
 *   início 2026-09, cobertura até 2027-08, venda em 2026-09
 *     -> comprador começa em 2026-10 e deve 11 meses (o vendedor pagou setembro)
 *
 * O QUE ESTE MÓDULO NÃO FAZ
 * -------------------------
 * Não cancela a assinatura do vendedor no Mercado Pago. O plano dele é
 * encerrado aqui dentro e a fatura de renovação pendente é cancelada, o que
 * impede o sistema de cobrar de novo; mas se as parcelas restantes já estiverem
 * em uma assinatura recorrente no gateway, quem para aquilo é uma chamada à API
 * de assinaturas que o projeto ainda não tem. Está desenhado em
 * `docs/PLANO_CANCELAMENTO_COBRANCA_MERCADOPAGO.md`.
 *
 * Módulo puro: sem I/O, sem async. Muta os arrays que recebe, como o resto do
 * domínio, e quem chama já está dentro de `mutateState`.
 */

import { calcularVencimentoFatura, DIAS_TOLERANCIA_FATURA } from '@/domain/custody'
import {
  mesesDoPlano,
  somarMeses,
  valorDoPlano,
  type TabelaDeTaxasPlano,
} from '@/domain/plano-custodia'
import type {
  FaturaCustodia,
  PlanoCustodia,
  Timestamp,
  UserEmail,
} from '@/domain/types'

/** Distância em meses entre duas competências 'AAAA-MM' (a - b). */
export function diferencaEmMeses(a: string, b: string): number {
  const [anoA, mesA] = a.split('-').map((n) => parseInt(n, 10))
  const [anoB, mesB] = b.split('-').map((n) => parseInt(n, 10))
  if ([anoA, mesA, anoB, mesB].some((n) => !Number.isFinite(n))) {
    throw new Error(`Competência inválida: ${a} / ${b}`)
  }
  return anoA * 12 + mesA - (anoB * 12 + mesB)
}

/**
 * A primeira competência que passa a ser responsabilidade do comprador.
 *
 * Nunca antes do mês seguinte ao início do plano: a parcela do mês da
 * contratação foi paga pelo vendedor no ato.
 */
export function primeiraCompetenciaDoComprador(
  plano: Pick<PlanoCustodia, 'inicioCompetencia'>,
  competenciaDaVenda: string,
): string {
  const mesSeguinteAoInicio = somarMeses(plano.inicioCompetencia, 1)
  return competenciaDaVenda > mesSeguinteAoInicio ? competenciaDaVenda : mesSeguinteAoInicio
}

/**
 * Quantos meses de guarda ainda faltam quando a moeda muda de dono.
 *
 * Zero quando o plano não está vigente, quando não há cobertura gravada ou
 * quando a venda acontece depois do fim da cobertura — nesses casos a moeda
 * simplesmente entra descoberta na conta do comprador, e é o ciclo mensal que
 * passa a cobrá-la.
 */
export function mesesRestantesDeCustodia(
  plano: PlanoCustodia,
  competenciaDaVenda: string,
): number {
  if (plano.status !== 'vigente') return 0
  if (!plano.pagoAteCompetencia) return 0

  const inicioDoComprador = primeiraCompetenciaDoComprador(plano, competenciaDaVenda)
  if (inicioDoComprador > plano.pagoAteCompetencia) return 0

  return diferencaEmMeses(plano.pagoAteCompetencia, inicioDoComprador) + 1
}

export interface EntradaDaTransferencia {
  /** `state.planosCustodia` — mutado. */
  planos: PlanoCustodia[]
  /** `state.faturasCustodia` — mutado. */
  faturas: FaturaCustodia[]
  coinId: string
  vendedorEmail: UserEmail
  compradorEmail: UserEmail
  /** Competência da venda, 'AAAA-MM'. */
  competencia: string
  agora: Timestamp
  taxas?: TabelaDeTaxasPlano
  /** Gera o próximo código de plano ('PLC-000007'). Só é chamado se houver plano a criar. */
  novoPlanoId: () => string
}

export interface ResultadoDaTransferencia {
  /** O plano do vendedor de onde a moeda saiu, se havia um. */
  planoDoVendedor: PlanoCustodia | null
  /** O plano criado para o comprador, se sobraram meses a pagar. */
  planoDoComprador: PlanoCustodia | null
  /** A fatura pendente criada para o comprador. */
  faturaDoComprador: FaturaCustodia | null
  /** Quantos meses o comprador assumiu. */
  mesesTransferidos: number
}

/**
 * Move a obrigação de custódia de uma moeda do vendedor para o comprador.
 *
 * Devolve sempre um resultado, inclusive quando não havia plano nenhum — nesse
 * caso todos os campos vêm nulos e a moeda segue descoberta na conta do
 * comprador, que é o comportamento correto: o ciclo mensal a encontra e cobra.
 */
export function transferirCustodiaDaMoeda(
  e: EntradaDaTransferencia,
): ResultadoDaTransferencia {
  const vazio: ResultadoDaTransferencia = {
    planoDoVendedor: null,
    planoDoComprador: null,
    faturaDoComprador: null,
    mesesTransferidos: 0,
  }

  // O plano do vendedor que cobre esta moeda. Cancelado e encerrado ficam de
  // fora: não há o que transferir de um plano que já não vale.
  const doVendedor = e.planos.find(
    (p) =>
      p.userEmail === e.vendedorEmail &&
      p.moedaIds.includes(e.coinId) &&
      (p.status === 'vigente' || p.status === 'aguardando_pagamento'),
  )

  if (!doVendedor) return vazio

  const meses = mesesRestantesDeCustodia(doVendedor, e.competencia)

  // ---- 1. a moeda sai do plano do vendedor ------------------------------
  doVendedor.moedaIds = doVendedor.moedaIds.filter((id) => id !== e.coinId)
  doVendedor.atualizadoEm = e.agora

  if (doVendedor.moedaIds.length === 0) {
    // Plano sem moeda nenhuma não renova e não gera ciclo. `encerrado` e não
    // `cancelado` de propósito: cancelado é o plano que nunca valeu (todas as
    // moedas recusadas na bancada); este valeu, foi pago e chegou ao fim
    // porque o acervo dele foi vendido.
    doVendedor.status = doVendedor.status === 'vigente' ? 'encerrado' : 'cancelado'

    // E as cobranças futuras que ainda não foram pagas morrem junto — é a
    // parte do "não cobrar mais o vendedor" que dá para fazer sem tocar no
    // gateway. Fatura já paga NÃO é mexida: dinheiro que entrou tem de
    // continuar aparecendo no livro-razão.
    for (const f of e.faturas) {
      if (f.planoId === doVendedor.id && f.status === 'pendente') {
        f.status = 'cancelada'
      }
    }
  }

  if (meses <= 0) {
    return { ...vazio, planoDoVendedor: doVendedor }
  }

  // ---- 2. o comprador assume os meses que faltam ------------------------
  const inicioDoComprador = primeiraCompetenciaDoComprador(doVendedor, e.competencia)
  const { porMoeda, total, parcelasMax } = valorDoPlano(
    doVendedor.modalidade,
    1,
    e.taxas,
    meses,
  )

  const planoId = e.novoPlanoId()

  const planoDoComprador: PlanoCustodia = {
    id: planoId,
    userEmail: e.compradorEmail,
    // O protocolo é o do envio original: é por ele que a ficha do cliente e a
    // logística ligam plano e moeda, e a moeda física continua sendo aquela.
    protocoloEnvio: doVendedor.protocoloEnvio,
    modalidade: doVendedor.modalidade,
    quantidadeContratada: 1,
    moedaIds: [e.coinId],
    valorPorMoedaCents: porMoeda,
    valorTotalCents: total,
    parcelasMax,
    inicioCompetencia: inicioDoComprador,
    // Continua null: a cobertura só começa a valer quando a fatura for paga.
    pagoAteCompetencia: null,
    status: 'aguardando_pagamento',
    formaPagamento: null,
    paymentIntentRef: null,
    assinaturaId: null,
    estornadoCents: 0,
    criadoEm: e.agora,
    atualizadoEm: e.agora,
    mesesContratados: meses,
    origem: 'transferencia',
    planoOrigemId: doVendedor.id,
  }

  const faturaDoComprador: FaturaCustodia = {
    // O código do plano já é único (vem do contador `seq`), então serve de
    // sufixo: duas moedas transferidas no mesmo milissegundo geravam o mesmo
    // id quando ele era só competência + e-mail + timestamp.
    id: `FAT-TR-${planoId}`,
    userEmail: e.compradorEmail,
    competencia: inicioDoComprador,
    quantidadeMoedas: 1,
    moedaIds: [e.coinId],
    valorCents: total,
    status: 'pendente',
    dataEmissao: e.agora,
    dataVencimento: calcularVencimentoFatura(e.agora, DIAS_TOLERANCIA_FATURA),
    dataPagamento: null,
    formaPagamento: null,
    paymentIntentId: null,
    planoId,
    origem: 'transferencia',
  }

  e.planos.push(planoDoComprador)
  e.faturas.push(faturaDoComprador)

  return {
    planoDoVendedor: doVendedor,
    planoDoComprador,
    faturaDoComprador,
    mesesTransferidos: meses,
  }
}

/**
 * Recalcula um plano de transferência quando o comprador prefere outra coisa
 * que não os meses restantes.
 *
 * As três opções da tela, nas palavras do Gabriel: pagar "apenas pelos meses
 * restantes"; pagar "os 12 meses de custódia, normalmente, e aí claro, ele vai
 * pagar para os próximos 12 meses, e não retroativamente"; ou o mensal.
 *
 * Por isso o anual completo e o mensal RECOMEÇAM a competência no mês corrente:
 * são contratos novos, não a continuação do prazo do vendedor. Só a opção
 * proporcional mantém o início herdado.
 *
 * Só mexe em plano de transferência ainda não pago — um plano vigente já tem
 * dinheiro associado e cobertura contada.
 */
export function reescolherPlanoDaTransferencia(
  plano: PlanoCustodia,
  fatura: FaturaCustodia | undefined,
  opcao: 'proporcional' | 'anual' | 'mensal',
  competenciaAtualDoSistema: string,
  agora: Timestamp,
  taxas?: TabelaDeTaxasPlano,
): boolean {
  if (plano.origem !== 'transferencia') return false
  if (plano.status !== 'aguardando_pagamento') return false

  if (opcao === 'proporcional') {
    // Nada a fazer: é como o plano nasce. Chamar de novo não pode reabrir nada.
    return true
  }

  const modalidade = opcao === 'mensal' ? 'mensal' : 'anual'
  const { porMoeda, total, parcelasMax, meses } = valorDoPlano(
    modalidade,
    plano.quantidadeContratada,
    taxas,
  )

  plano.modalidade = modalidade
  plano.mesesContratados = meses
  plano.inicioCompetencia = competenciaAtualDoSistema
  plano.valorPorMoedaCents = porMoeda
  plano.valorTotalCents = total
  plano.parcelasMax = parcelasMax
  plano.atualizadoEm = agora

  if (fatura && fatura.status === 'pendente') {
    fatura.valorCents = total
    fatura.competencia = competenciaAtualDoSistema
  }

  return true
}

/** Rótulo curto para a tela: "11 meses restantes", "Plano anual", "Mensal". */
export function descricaoDoPlano(plano: PlanoCustodia): string {
  if (plano.origem === 'transferencia' && plano.status === 'aguardando_pagamento') {
    const meses = mesesDoPlano(plano)
    return meses === 1 ? '1 mês restante da custódia' : `${meses} meses restantes da custódia`
  }
  return plano.modalidade === 'mensal' ? 'Plano mensal' : 'Plano anual'
}
