/**
 * Extrato da conta do usuário — a linha do tempo do que ELE fez na plataforma.
 *
 * NÃO É PORT: o monolito não tinha extrato de nenhum tipo. Também não se
 * confunde com a auditoria pública (`allCoinsFlat` em domain/selectors.ts), que
 * é o inventário de TODAS as contas e existe para provar o estoque custodiado.
 * Aqui é o oposto: um recorte de uma conta só, com dinheiro à vista.
 *
 * FUNÇÃO PURA, como todo o resto de @/domain — recebe o estado e devolve
 * linhas. Ela não sabe o que é CSV nem XLSX; quem exporta é @/lib/export.
 *
 * O INVARIANTE (frente F, item 15 do Rogério, 18/11/2026)
 * -------------------------------------------------------
 * A SOMA DOS IMPACTOS DAS LINHAS É O SALDO DA CONTA, ao centavo, e a coluna `saldoApos` de cada linha é a soma
 * acumulada, terminando no mesmo número que a barra superior mostra. Até 17/11/2026 o extrato lia só depósito,
 * compra, venda, fatura paga com saldo e saque, e o cliente via dois números sem saber qual era o verdadeiro:
 *  - FALTAVAM AS SAÍDAS: frete do envio, taxa de retirada e fatura paga por Pix ou cartão (a entrada do
 *    pagamento aparecia, a saída que a consome não);
 *  - FALTAVAM OS ESTORNOS: frete devolvido, 1º mês devolvido (cancelar envio), plano estornado e saque recusado
 *    (o extrato continuava dizendo que o dinheiro tinha saído);
 *  - FALTAVA A CONTA INTEIRA: ajuste da equipe e saldo anterior só existem no livro-razão.
 * Agora cada fato que mexe no saldo vira linha pela MESMA regra do livro-razão (src/domain/ledger.ts e
 * src/server/db/derivar.ts, que fecham ao centavo por construção), e o que o estado não registra — ajuste da
 * equipe, saldo anterior — aparece como UMA linha explícita no começo, "Ajuste de saldo", em vez de sumir ou de
 * ser inventado. O teste `statement-invariante.test.ts` falha se uma fonte de movimento ficar de fora; o
 * Controle o reexecuta depois do merge de qualquer frente que crie ou devolva dinheiro.
 *
 * POR QUE NÃO LER O LIVRO-RAZÃO DIRETO: ele vive só no servidor (Postgres) e a descrição dele leva o NOME da
 * contraparte ("Compra de 1 moeda de Fulano"), o que a decisão dos sócios de 10/09/2026 proíbe — um cliente nunca
 * vê o nome do outro. O extrato é derivado do estado, com as mesmas regras e a descrição anônima.
 *
 * O QUE ENTRA NO EXTRATO E POR QUE
 * -------------------------------
 *  - Entradas de dinheiro (depósitos), compras e vendas MOVEM saldo, e cada um traz o próprio impacto já com sinal.
 *  - PAGAR UM SERVIÇO POR PIX OU CARTÃO são DUAS linhas, como no livro-razão: o dinheiro ENTRA na conta (linha de
 *    depósito, "Pagamento do frete do envio por Pix") e SAI na mesma hora para o serviço (a linha do frete, da
 *    fatura, da retirada). O saldo não muda, e as duas aparecem para a soma fechar.
 *  - Envios, faturas em aberto e fretes só cotados NÃO movem saldo — entram com impacto zero, porque o extrato
 *    também responde "o que aconteceu com as minhas moedas".
 *
 * A COMISSÃO É COBRADA DOS DOIS LADOS (A1, RA-06). Tanto comprador quanto
 * vendedor pagam comissão conforme a tabela de taxas. As comissões congeladas
 * gravadas no Trade (`feeComprador` e `feeVendedor`) são lidas diretamente,
 * garantindo que o histórico nunca seja reescrito por mudanças futuras de taxa.
 *
 * LIMITE CONHECIDO — OFERTA DE COMPRA PRÉ-PAGA. O dinheiro dela nunca esteve em `User.balance` e o estado só
 * guarda o que ainda está preso (`pagoAntecipadoCents`); não guarda quanto entrou nem em que compra foi gasto.
 * O que está preso aparece como "Em reserva" (`resumoDaConta`) e o já gasto cai na linha de ajuste — o mesmo
 * buraco que o livro-razão resolve com um `ajuste`. Fechar de vez exige registrar a entrada do pré-pago e a
 * modalidade no `Trade` (types.ts e conciliação: fora desta frente).
 */

import { fdate } from '@/domain/dates'
import { tradeFee } from '@/domain/fees'
import { descricaoDaFaturaDeCustodia } from '@/domain/custodia-texto'
import { descricaoDaEntrada } from '@/domain/ledger'
import type { AppState, Cents, DateBR, Envio, FaturaCustodia, Retirada, StatusSaque, Timestamp, UserEmail } from '@/domain/types'

/** As categorias de linha do extrato. O texto é o que vai para a planilha. */
export type StatementKind =
  | 'Depósito'
  | 'Compra'
  | 'Venda'
  | 'Saque'
  | 'Envio para custódia'
  | 'Taxa de custódia'
  | 'Frete do envio'
  | 'Taxa de retirada'
  | 'Estorno'
  | 'Ajuste de saldo'

export interface StatementRow {
  /** Instante do evento — é por ele que o extrato é ordenado. */
  date: Timestamp
  /** O mesmo instante em 'dd/mm/aaaa', que é o que a tela e o arquivo exibem. */
  dateBR: DateBR
  kind: StatementKind
  /** Tipo de moeda envolvido, ou '—' nos eventos que não têm um. */
  tipoMoeda: string
  descricao: string
  /** Moedas envolvidas. null quando o evento não conta moedas (depósito). */
  quantidade: number | null
  /** Preço por moeda. null quando não se aplica. */
  valorUnitario: Cents | null
  /** Comissão retida nesta linha. */
  taxa: Cents | null
  /**
   * Efeito no saldo, com sinal: positivo entrou, negativo saiu, zero não mexeu.
   * É o que permite conferir o saldo somando o extrato.
   */
  impacto: Cents
  /**
   * O saldo da conta DEPOIS desta linha (18/11/2026: a coluna "Saldo depois" do extrato). É a soma acumulada dos
   * impactos na ordem do extrato; a última linha é o saldo que a barra superior mostra.
   */
  saldoApos: Cents
  /**
   * Só nas linhas de `Estorno`: de que tipo de linha o dinheiro está voltando. Serve aos totais (um saque
   * recusado não conta como "sacado") e não aparece na tela.
   */
  estornoDe?: StatementKind
}

/** Totais do período, para o cabeçalho da tela e a última aba da planilha. */
export interface StatementTotals {
  depositado: Cents
  sacado: Cents
  compradoValor: Cents
  compradoQtd: number
  vendidoValor: Cents
  vendidoQtd: number
  /**
   * TUDO o que a conta pagou à plataforma, já devolvido o que foi estornado: comissões de compra e venda, tarifa de
   * saque, custódia e taxa de retirada (Rogério, 22/11/2026: "a custódia tem que entrar nas taxas pagas" — sem ela
   * a conta não fechava). É `comissoesPagas + custodiaPaga + outrasTarifas`.
   */
  taxasPagas: Cents
  /** Só as comissões de negociação (compra e venda). */
  comissoesPagas: Cents
  /** Custódia paga (faturas pagas menos as devolvidas). */
  custodiaPaga: Cents
  /** Tarifa de saque e taxa de retirada física. */
  outrasTarifas: Cents
  /** Soma de todos os `impacto` — a variação líquida de saldo do extrato. */
  variacaoSaldo: Cents
}

/** O texto da linha que cobre o que o estado não registra. É a única que não vem de um fato. */
export const DESCRICAO_DO_AJUSTE = 'Saldo anterior e ajustes feitos pela equipe'

/** Uma linha ainda sem `saldoApos` (o saldo corrente só se conhece depois de ordenar). */
type LinhaSolta = Omit<StatementRow, 'saldoApos'>

const SEGUNDO = 1_000

/** O nome do meio de pagamento, no jeito que o cliente fala. */
function porForma(forma: 'saldo' | 'pix' | 'cartao' | null | undefined): string {
  if (forma === 'pix') return ' por Pix'
  if (forma === 'cartao') return ' no cartão'
  if (forma === 'saldo') return ' com o saldo'
  return ''
}

/** O saque no jeito que o cliente lê, sem o vocabulário técnico do estado. */
function situacaoDoSaque(status: StatusSaque): string {
  switch (status) {
    case 'solicitado':
      return 'aguardando pagamento'
    case 'em_processamento':
      return 'em pagamento'
    case 'pago':
      return 'pago'
    case 'falhou':
      return 'recusado'
  }
}

/** A linha da retirada física: pagamento da taxa, que sai do saldo (ou entra e sai, se por Pix/cartão). */
function pagouTaxaDeRetirada(r: Retirada): boolean {
  return r.pagoEm != null || r.status === 'paga' || r.status === 'separacao' || r.status === 'postada' || r.status === 'entregue'
}

function quandoPagouARetirada(r: Retirada): Timestamp {
  if (r.pagoEm != null) return r.pagoEm
  const evento = r.historico.find((h) => h.para === 'paga')
  return evento?.data ?? r.updatedAt ?? r.solicitadoEm
}

/**
 * O instante em que uma fatura paga foi devolvida. O estado não grava a data do estorno da fatura, então ela
 * vem do envio que o 1º mês pagou (cancelado ou desconsiderado) e, sem envio, fica um segundo depois do
 * pagamento — nunca antes dele, para o extrato não mostrar a volta do dinheiro antes da saída.
 */
function quandoEstornouAFatura(state: AppState, f: FaturaCustodia): Timestamp {
  const pagou = f.dataPagamento || f.dataEmissao
  const plano = f.planoId ? (state.planosCustodia ?? []).find((p) => p.id === f.planoId) : undefined
  const envio: Envio | undefined = plano ? state.envios.find((e) => e.protocolo === plano.protocoloEnvio) : undefined
  const doEnvio = envio?.canceladoEm ?? envio?.desconsideradoEm ?? null
  return Math.max(doEnvio ?? 0, pagou + SEGUNDO)
}

/**
 * Monta o extrato de um usuário, do evento mais ANTIGO para o mais recente.
 *
 * A ordem crescente é deliberada: extrato se lê de cima para baixo somando, e é
 * assim que ele bate com o saldo. A tela inverte para exibição quando quer
 * mostrar o mais recente primeiro; o arquivo exportado mantém esta ordem.
 *
 * Dentro do mesmo segundo a ENTRADA vem antes da saída: o Pix que paga o frete cai na conta no mesmo instante
 * em que o frete sai, e o saldo corrente nunca pode passar por um número negativo que a conta nunca teve. A
 * tela só mostra o dia, então esta ordem fina não aparece como erro.
 *
 * `agora` só serve à data da linha de ajuste quando a conta não tem mais nada no extrato.
 */
export function userStatement(state: AppState, email: UserEmail, agora: Timestamp = Date.now()): StatementRow[] {
  const rows: LinhaSolta[] = []

  /* ---------- entradas de dinheiro ---------- */
  state.deposits
    .filter((d) => d.userEmail === email)
    .forEach((d) => {
      rows.push({
        date: d.date,
        dateBR: fdate(d.date),
        kind: 'Depósito',
        tipoMoeda: '—',
        // O que a entrada foi de verdade (03/11/2026): até então todas saíam como "Depósito simulado".
        descricao: descricaoDaEntrada(d),
        quantidade: null,
        valorUnitario: null,
        taxa: null,
        impacto: d.valor,
      })
    })

  /* ---------- negociações ---------- */
  state.trades.forEach((t) => {
    const qty = t.qty || 1
    const bruto = t.price * qty

    if (t.buyer === email) {
      const feeComprador = t.feeComprador ?? 0
      rows.push({
        date: t.date,
        dateBR: fdate(t.date),
        kind: 'Compra',
        tipoMoeda: t.tipoMoeda,
        // Decisão dos sócios (10/09/2026, extensão da D-5): o nome de um cliente
        // NUNCA aparece para outro cliente. O extrato não expõe nome nem e-mail
        // de contraparte; moeda, quantidade, valor e taxa já têm colunas próprias.
        descricao: 'Compra no marketplace',
        quantidade: qty,
        valorUnitario: t.price,
        taxa: feeComprador > 0 ? feeComprador : null,
        impacto: -(bruto + feeComprador),
      })
    }

    if (t.seller === email) {
      // Lê a comissão congelada gravada no Trade (RA-06). Mesma conta do livro-razão (derivar.ts): sem a
      // comissão do vendedor gravada, vale o total menos a do comprador, e sem nenhuma, a da tabela.
      const feeComprador = t.feeComprador ?? 0
      const taxa = t.feeVendedor ?? (t.fee !== undefined ? t.fee - feeComprador : tradeFee(t.price) * qty)
      rows.push({
        date: t.date,
        dateBR: fdate(t.date),
        kind: 'Venda',
        tipoMoeda: t.tipoMoeda,
        // Decisão dos sócios (10/09/2026, extensão da D-5): anonimato total.
        descricao: 'Venda no marketplace',
        quantidade: qty,
        valorUnitario: t.price,
        taxa,
        impacto: bruto - taxa,
      })
    }
  })

  /* ---------- envios para custódia e o frete deles ---------- */
  state.envios
    .filter((e) => e.userEmail === email)
    .forEach((e) => {
      rows.push({
        date: e.createdAt,
        dateBR: fdate(e.createdAt),
        kind: 'Envio para custódia',
        tipoMoeda: e.tipoMoeda,
        descricao: `Protocolo ${e.protocolo} · ${e.etapaAtual}`,
        quantidade: e.quantidade,
        valorUnitario: null,
        taxa: null,
        // O envio em si não move saldo: o frete e a custódia têm as suas próprias linhas.
        impacto: 0,
      })

      /*
       * O FRETE (22/10/2026): o cliente paga o preço do contrato dos Correios no site, e o dinheiro sai do saldo
       * — direto, quando paga com o saldo, ou na mesma hora em que o Pix/cartão entra. Frete só cotado não
       * saiu de lugar nenhum. Frete `estornado` já foi pago antes (o ledger só estorna a transição de pago),
       * e por isso gera as DUAS linhas: a saída e a volta.
       */
      const frete = e.frete
      if (frete && (frete.status === 'pago' || frete.status === 'estornado')) {
        const pagoEm = frete.pagoEm ?? e.createdAt
        rows.push({
          date: pagoEm,
          dateBR: fdate(pagoEm),
          kind: 'Frete do envio',
          tipoMoeda: e.tipoMoeda,
          descricao: `Frete do envio ${e.protocolo} (${frete.modalidade})${porForma(frete.forma)}`,
          quantidade: e.quantidade,
          valorUnitario: null,
          taxa: null,
          impacto: -frete.valorCents,
        })
      }
      if (frete?.status === 'estornado') {
        // Nunca antes da saída: o estorno que cai no mesmo segundo da saída ainda vem depois dela na tela.
        const voltouEm = Math.max(frete.estornadoEm ?? frete.pagoEm ?? e.createdAt, (frete.pagoEm ?? 0) + SEGUNDO)
        rows.push({
          date: voltouEm,
          dateBR: fdate(voltouEm),
          kind: 'Estorno',
          estornoDe: 'Frete do envio',
          tipoMoeda: e.tipoMoeda,
          descricao: `Estorno do frete do envio ${e.protocolo}: o envio não foi postado`,
          quantidade: e.quantidade,
          valorUnitario: null,
          taxa: null,
          impacto: frete.valorCents,
        })
      }
    })

  /* ---------- faturas de custódia ---------- */
  /*
   * Uma linha POR FATURA, com descrição própria para o 1º mês do envio, o da compra e o ciclo mensal.
   *
   * Até 11/09/2026 este trecho lia `state.custodyCharges`, que guardava uma cobrança por usuário, rotulada
   * "Custódia anual" e calculada pela tabela de faixas — três coisas que a decisão D-3 já tinha aposentado. O
   * mecanismo antigo saiu por decisão do Gabriel em 11/09/2026.
   *
   * FATURA PAGA SEMPRE SAI DO SALDO, seja qual for a forma (regra do livro-razão, ledger.ts): paga com saldo,
   * o débito é direto; paga por Pix ou cartão, o dinheiro entrou antes como linha de depósito e sai agora para
   * a fatura. Até 17/11/2026 só a paga com saldo saía, e o Pix de R$ 2,00 aparecia como +R$ 2,00 no extrato
   * enquanto o saldo não se mexia.
   *
   * Fatura paga e depois CANCELADA (`estornarFaturaPaga`, cancelar envio) é cobrança devolvida: as duas linhas,
   * a saída e o estorno. Fatura em aberto, atrasada ou cancelada sem nunca ter sido paga não move nada.
   */
  for (const f of state.faturasCustodia ?? []) {
    if (f.userEmail !== email) continue
    const plano = (state.planosCustodia ?? []).find((p) => p.id === f.planoId)
    const foiPaga = f.status === 'paga' || (f.status === 'cancelada' && Boolean(f.dataPagamento))
    const quando = f.dataPagamento || f.dataEmissao
    rows.push({
      date: quando,
      dateBR: fdate(quando),
      kind: 'Taxa de custódia',
      tipoMoeda: '—',
      // A linha do pagamento diz "paga" mesmo que a fatura tenha sido devolvida depois: a volta é a linha do estorno.
      descricao: descricaoDaFaturaDeCustodia(foiPaga ? { ...f, status: 'paga' } : f, plano),
      quantidade: f.quantidadeMoedas,
      valorUnitario: null,
      taxa: f.valorCents,
      impacto: foiPaga ? -f.valorCents : 0,
    })
    if (f.status === 'cancelada' && foiPaga) {
      const voltouEm = quandoEstornouAFatura(state, f)
      rows.push({
        date: voltouEm,
        dateBR: fdate(voltouEm),
        kind: 'Estorno',
        estornoDe: 'Taxa de custódia',
        tipoMoeda: '—',
        descricao: `Estorno da custódia: ${descricaoDaFaturaDeCustodia({ ...f, status: 'paga' }, plano)}`,
        quantidade: f.quantidadeMoedas,
        valorUnitario: null,
        taxa: f.valorCents,
        impacto: f.valorCents,
      })
    }
  }

  /* ---------- planos estornados na análise ---------- */
  // Moeda recusada na análise devolve o mês dela (`alimentarPlanoNaAnalise`). O ledger lê a variação de
  // `estornadoCents`; somada, é o total devolvido. O plano em si não tem outra data que a da última edição.
  for (const p of state.planosCustodia ?? []) {
    if (p.userEmail !== email || !(p.estornadoCents > 0)) continue
    rows.push({
      date: p.atualizadoEm,
      dateBR: fdate(p.atualizadoEm),
      kind: 'Estorno',
      estornoDe: 'Taxa de custódia',
      tipoMoeda: '—',
      descricao: `Estorno do 1º mês de custódia das moedas recusadas na análise (envio ${p.protocoloEnvio})`,
      quantidade: null,
      valorUnitario: null,
      taxa: p.estornadoCents,
      impacto: p.estornadoCents,
    })
  }

  /* ---------- taxa de retirada física ---------- */
  for (const r of state.retiradas ?? []) {
    if (r.userEmail !== email || !pagouTaxaDeRetirada(r)) continue
    const quando = quandoPagouARetirada(r)
    rows.push({
      date: quando,
      dateBR: fdate(quando),
      kind: 'Taxa de retirada',
      tipoMoeda: '—',
      descricao: `Retirada física da moeda ${r.coinId}: taxa${porForma(r.formaPagamento)}`,
      quantidade: 1,
      valorUnitario: null,
      taxa: r.valorTaxaCents,
      impacto: -r.valorTaxaCents,
    })
  }

  /* ---------- saques de recursos ---------- */
  // O valor TOTAL (líquido + tarifa) sai do saldo no PEDIDO, e volta inteiro se a equipe recusar.
  for (const s of Array.isArray(state.saques) ? state.saques : []) {
    if (s.userEmail !== email) continue
    rows.push({
      date: s.criadoEm,
      dateBR: fdate(s.criadoEm),
      kind: 'Saque',
      tipoMoeda: '—',
      descricao: `Saque de recursos (${s.id}): ${situacaoDoSaque(s.status)}`,
      quantidade: null,
      valorUnitario: null,
      taxa: s.taxa,
      impacto: -s.valorTotal,
    })
    if (s.status === 'falhou') {
      const voltouEm = Math.max(s.atualizadoEm, s.criadoEm + SEGUNDO)
      rows.push({
        date: voltouEm,
        dateBR: fdate(voltouEm),
        kind: 'Estorno',
        estornoDe: 'Saque',
        tipoMoeda: '—',
        descricao: `Saque ${s.id} recusado: o valor voltou para o seu saldo`,
        quantidade: null,
        valorUnitario: null,
        taxa: s.taxa,
        impacto: s.valorTotal,
      })
    }
  }

  /* ---------- o que o estado não registra: saldo anterior e ajuste da equipe ---------- */
  const conta = state.users[email]
  if (conta) {
    const explicado = rows.reduce((t, r) => t + r.impacto, 0)
    const diferenca = conta.balance - explicado
    if (diferenca !== 0) {
      const primeiro = rows.reduce((min, r) => Math.min(min, r.date), Number.POSITIVE_INFINITY)
      const quando = Number.isFinite(primeiro) ? primeiro - 2 * SEGUNDO : agora
      rows.push({
        date: quando,
        dateBR: fdate(quando),
        kind: 'Ajuste de saldo',
        tipoMoeda: '—',
        descricao: DESCRICAO_DO_AJUSTE,
        quantidade: null,
        valorUnitario: null,
        taxa: null,
        impacto: diferenca,
      })
    }
  }

  /* ---------- ordem e saldo corrente ---------- */
  const ordenadas = rows
    .map((linha, ordem) => ({ linha, ordem }))
    .sort((a, b) => {
      const porSegundo = Math.floor(a.linha.date / SEGUNDO) - Math.floor(b.linha.date / SEGUNDO)
      if (porSegundo !== 0) return porSegundo
      // Mesmo segundo: entrada primeiro (o Pix cai antes de pagar o serviço); o resto na ordem em que nasceu.
      const entradaA = a.linha.impacto > 0 ? 0 : 1
      const entradaB = b.linha.impacto > 0 ? 0 : 1
      return entradaA - entradaB || a.ordem - b.ordem
    })

  let corrente = 0
  return ordenadas.map(({ linha }) => {
    corrente += linha.impacto
    return { ...linha, saldoApos: corrente }
  })
}

/**
 * O dinheiro do cliente na plataforma, em duas partes: o que ele pode gastar agora e o que está guardado para
 * uma coisa só (frente F, 18/11/2026).
 *
 *  - `disponivel` é `User.balance`, o MESMO número da barra superior e do cabeçalho do extrato;
 *  - `emReserva` é o dinheiro que saiu do disponível e ainda não terminou o caminho: o valor preso em ofertas
 *    de compra PRÉ-PAGAS abertas e os saques pedidos que ainda não chegaram ao banco;
 *  - `total` é a soma, e é por ela que o cliente conta quanto tem de verdade.
 *
 * Só o que ainda está no estado entra: oferta pré-paga já casada ou cancelada, e saque pago ou recusado, não
 * são mais reserva de ninguém.
 */
export interface ResumoDaConta {
  disponivel: Cents
  emReserva: Cents
  total: Cents
  /** O que compõe `emReserva`, para a tela dizer de onde vem cada centavo. */
  reservas: { ofertasPrePagas: Cents; saquesACaminho: Cents }
}

export function resumoDaConta(state: AppState, email: UserEmail): ResumoDaConta {
  const ofertasPrePagas = state.buyOrders
    .filter((b) => b.buyer === email && b.modalidade === 'prepago')
    .reduce((t, b) => t + Math.max(0, b.pagoAntecipadoCents ?? 0), 0)
  const saquesACaminho = (Array.isArray(state.saques) ? state.saques : [])
    .filter((s) => s.userEmail === email && (s.status === 'solicitado' || s.status === 'em_processamento'))
    .reduce((t, s) => t + s.valorTotal, 0)
  const disponivel = state.users[email]?.balance ?? 0
  const emReserva = ofertasPrePagas + saquesACaminho
  return { disponivel, emReserva, total: disponivel + emReserva, reservas: { ofertasPrePagas, saquesACaminho } }
}

/** Soma as linhas do extrato. Percorre uma vez só — a lista pode ser longa. */
export function statementTotals(rows: readonly StatementRow[]): StatementTotals {
  const t: StatementTotals = {
    depositado: 0,
    sacado: 0,
    compradoValor: 0,
    compradoQtd: 0,
    vendidoValor: 0,
    vendidoQtd: 0,
    taxasPagas: 0,
    comissoesPagas: 0,
    custodiaPaga: 0,
    outrasTarifas: 0,
    variacaoSaldo: 0,
  }

  rows.forEach((r) => {
    t.variacaoSaldo += r.impacto
    if (r.kind === 'Depósito') t.depositado += r.impacto
    if (r.kind === 'Saque') {
      t.sacado += -r.impacto
      t.taxasPagas += r.taxa ?? 0
      t.outrasTarifas += r.taxa ?? 0
    }
    if (r.kind === 'Taxa de custódia') {
      // Só conta o que saiu do saldo: fatura em aberto tem impacto 0 e não é paga.
      t.custodiaPaga += -r.impacto
      t.taxasPagas += -r.impacto
    }
    if (r.kind === 'Taxa de retirada') {
      t.outrasTarifas += -r.impacto
      t.taxasPagas += -r.impacto
    }
    if (r.kind === 'Estorno' && r.estornoDe === 'Saque') {
      // Saque recusado: o valor e a tarifa voltaram, então não contam como sacado nem como tarifa paga.
      t.sacado -= r.impacto
      t.taxasPagas -= r.taxa ?? 0
      t.outrasTarifas -= r.taxa ?? 0
    }
    if (r.kind === 'Estorno' && r.estornoDe === 'Taxa de custódia') {
      t.custodiaPaga -= r.impacto
      t.taxasPagas -= r.impacto
    }
    if (r.kind === 'Compra') {
      // Valor das moedas compradas: o total debitado do saldo está em `impacto`
      // (-bruto - taxa). Subtrair a taxa devolve o valor das moedas compradas
      // sem distorcer `compradoValor`.
      t.compradoValor += -r.impacto - (r.taxa ?? 0)
      t.compradoQtd += r.quantidade ?? 0
      t.taxasPagas += r.taxa ?? 0
      t.comissoesPagas += r.taxa ?? 0
    }
    if (r.kind === 'Venda') {
      // Valor BRUTO da venda: o líquido já está em `impacto`, e mostrar os dois
      // separados é o que deixa a comissão visível em vez de embutida.
      t.vendidoValor += r.impacto + (r.taxa ?? 0)
      t.vendidoQtd += r.quantidade ?? 0
      t.taxasPagas += r.taxa ?? 0
      t.comissoesPagas += r.taxa ?? 0
    }
  })

  return t
}
