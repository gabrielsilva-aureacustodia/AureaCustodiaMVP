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
 * O QUE ENTRA NO EXTRATO E POR QUÊ
 * -------------------------------
 *  - Depósitos, compras e vendas MOVEM saldo, e cada um traz o próprio impacto
 *    já com sinal. Somados ao saldo inicial da conta, reconstroem o saldo atual.
 *  - Envios e cobranças de custódia NÃO movem saldo — entram com impacto zero,
 *    porque o extrato também responde "o que aconteceu com as minhas moedas",
 *    e um envio concluído é o evento que criou os recibos NFT da conta.
 *
 * A COMISSÃO SAI DO LADO DO VENDEDOR. É a mesma regra do motor de casamento e
 * das ações de compra e venda: o comprador paga o preço cheio, e é do vendedor
 * que a plataforma retém 0,5% + R$ 1,00 por moeda. Por isso `taxa` só aparece
 * preenchida nas linhas de venda.
 */

import { fdate } from '@/domain/dates'
import { tradeFee } from '@/domain/fees'
import type { AppState, Cents, DateBR, Timestamp, UserEmail } from '@/domain/types'

/** As categorias de linha do extrato. O texto é o que vai para a planilha. */
export type StatementKind =
  | 'Depósito'
  | 'Compra'
  | 'Venda'
  | 'Envio para custódia'
  | 'Taxa de custódia'

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
  /** Comissão retida nesta linha. Só vendas têm. */
  taxa: Cents | null
  /**
   * Efeito no saldo, com sinal: positivo entrou, negativo saiu, zero não mexeu.
   * É o que permite conferir o saldo somando o extrato.
   */
  impacto: Cents
}

/** Totais do período, para o cabeçalho da tela e a última aba da planilha. */
export interface StatementTotals {
  depositado: Cents
  compradoValor: Cents
  compradoQtd: number
  vendidoValor: Cents
  vendidoQtd: number
  taxasPagas: Cents
  /** Soma de todos os `impacto` — a variação líquida de saldo do extrato. */
  variacaoSaldo: Cents
}

/**
 * Monta o extrato de um usuário, do evento mais ANTIGO para o mais recente.
 *
 * A ordem crescente é deliberada: extrato se lê de cima para baixo somando, e é
 * assim que ele bate com o saldo. A tela inverte para exibição quando quer
 * mostrar o mais recente primeiro; o arquivo exportado mantém esta ordem.
 */
export function userStatement(state: AppState, email: UserEmail): StatementRow[] {
  const rows: StatementRow[] = []

  /* ---------- depósitos ---------- */
  state.deposits
    .filter((d) => d.userEmail === email)
    .forEach((d) => {
      rows.push({
        date: d.date,
        dateBR: fdate(d.date),
        kind: 'Depósito',
        tipoMoeda: '—',
        descricao: 'Depósito simulado em conta',
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
      const vendedor = state.users[t.seller]
      rows.push({
        date: t.date,
        dateBR: fdate(t.date),
        kind: 'Compra',
        tipoMoeda: t.tipoMoeda,
        // Nome da contraparte, com o e-mail como reserva: uma conta pode ter
        // saído do estado, e o extrato não pode ficar com um campo vazio.
        descricao: `Compra de ${vendedor ? vendedor.name : t.seller}`,
        quantidade: qty,
        valorUnitario: t.price,
        taxa: null,
        impacto: -bruto,
      })
    }

    if (t.seller === email) {
      const comprador = state.users[t.buyer]
      // A comissão é POR MOEDA, recalculada aqui do mesmo jeito que na execução
      // — ela não é gravada no Trade justamente para não poder divergir.
      const taxa = tradeFee(t.price) * qty
      rows.push({
        date: t.date,
        dateBR: fdate(t.date),
        kind: 'Venda',
        tipoMoeda: t.tipoMoeda,
        descricao: `Venda para ${comprador ? comprador.name : t.buyer}`,
        quantidade: qty,
        valorUnitario: t.price,
        taxa,
        impacto: bruto - taxa,
      })
    }
  })

  /* ---------- envios para custódia ---------- */
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
        // Envio não move saldo: a custódia é cobrada à parte, e no MVP essa
        // cobrança nunca chega a ser debitada (ver abaixo).
        impacto: 0,
      })
    })

  /* ---------- cobrança de custódia vigente ---------- */
  const cobranca = state.custodyCharges[email]
  if (cobranca) {
    /*
     * LIMITAÇÃO CONHECIDA, e é honesto registrá-la aqui: o estado guarda UMA
     * cobrança por usuário, sobrescrita a cada recibo emitido. Não há histórico
     * de cobranças a listar — o extrato mostra a vigente.
     *
     * O impacto é ZERO porque nenhuma ação do sistema debita a taxa de custódia
     * do saldo: ela nasce 'Pendente' em custody.ts e não existe ação de
     * pagamento. Lançar o valor como saída aqui faria o extrato não fechar com
     * o saldo real da conta.
     */
    const dt = parseDateBR(cobranca.dataCobranca)
    rows.push({
      date: dt,
      dateBR: cobranca.dataCobranca,
      kind: 'Taxa de custódia',
      tipoMoeda: '—',
      descricao: `Custódia anual de ${cobranca.totalMoedas} moeda(s) — ${cobranca.statusPagamento}`,
      quantidade: cobranca.totalMoedas,
      valorUnitario: null,
      taxa: cobranca.valorCobrado,
      impacto: 0,
    })
  }

  return rows.sort((a, b) => a.date - b.date)
}

/**
 * 'dd/mm/aaaa' de volta para timestamp, só para ordenar a linha da cobrança
 * junto das demais.
 *
 * Data malformada devolve 0 (a linha vai para o topo) em vez de NaN, que
 * envenenaria o comparador do sort e deixaria a ordem do extrato inteiro
 * indefinida.
 */
function parseDateBR(s: DateBR): Timestamp {
  const partes = s.split('/')
  if (partes.length !== 3) return 0
  const [d, m, a] = partes.map((x) => parseInt(x, 10))
  if (!d || !m || !a) return 0
  return new Date(a, m - 1, d).getTime()
}

/** Soma as linhas do extrato. Percorre uma vez só — a lista pode ser longa. */
export function statementTotals(rows: readonly StatementRow[]): StatementTotals {
  const t: StatementTotals = {
    depositado: 0,
    compradoValor: 0,
    compradoQtd: 0,
    vendidoValor: 0,
    vendidoQtd: 0,
    taxasPagas: 0,
    variacaoSaldo: 0,
  }

  rows.forEach((r) => {
    t.variacaoSaldo += r.impacto
    if (r.kind === 'Depósito') t.depositado += r.impacto
    if (r.kind === 'Compra') {
      t.compradoValor += -r.impacto
      t.compradoQtd += r.quantidade ?? 0
    }
    if (r.kind === 'Venda') {
      // Valor BRUTO da venda: o líquido já está em `impacto`, e mostrar os dois
      // separados é o que deixa a comissão visível em vez de embutida.
      t.vendidoValor += r.impacto + (r.taxa ?? 0)
      t.vendidoQtd += r.quantidade ?? 0
      t.taxasPagas += r.taxa ?? 0
    }
  })

  return t
}
