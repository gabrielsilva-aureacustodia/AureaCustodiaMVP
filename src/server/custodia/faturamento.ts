import 'server-only'

/**
 * Serviço de faturamento mensal de custódia e controle de inadimplência (Sessão B-5 / Bloco 8).
 *
 * Regras protegidas (Decisão D-3, 10/09/2026 e Cláusulas 3 e 4 dos Termos):
 * - R$ 2,00 por moeda guardada por mês.
 * - Ciclo de 30 dias por moeda, contado do dia em que ela foi aceita (ciclo-custodia.ts).
 * - Cobrança automática no saldo disponível caso o cliente possua saldo suficiente.
 * - Caso não haja saldo, fatura fica pendente para liquidação externa (Pix/cartão).
 * - A inadimplência POR FATURA é calculada na hora, a partir das próprias faturas, por quem lê:
 *   lista, ficha, indicadores e o bloqueio de venda e retirada. Nenhum processo automático grava
 *   `user.inadimplente` — essa coluna é só a marca manual do painel (`marcarInadimplencia`), e
 *   desde a E8 só a equipe a põe e só a equipe a tira.
 *
 * NÃO HÁ RENOVAÇÃO DE PLANO, NEM COBRANÇA NO DIA 1º (03/11/2026). Até essa data este cron tinha um
 * "bloco A" que renovava o plano de custódia por mês do calendário: em 01/11 ele cobrou o Sidnei pela
 * moeda que tinha pago em 27/10 e debitou do Rogério a renovação de um plano sem moeda nenhuma. O cron
 * faz uma coisa só: emite a fatura do ciclo de cada moeda que fez aniversário (src/domain/custodia-da-moeda.ts).
 */

import { competenciaAtual, isInadimplente, verificarStatusFatura } from '@/domain/custody'
import type { TabelaDeTaxas } from '@/domain/fees'
import type { ActionResult, AppState, FaturaCustodia, Timestamp, UserEmail } from '@/domain/types'
import { carregarRegrasDoMercado } from '@/server/config/carregar'
import { expurgarOfertasSemCustodia } from '@/domain/bloqueio-por-debito'
import { emitirFaturasDosCiclos } from '@/domain/cobranca-de-entrada'
import { pagarFaturaComSaldoNoEstado } from '@/domain/quitar-fatura'
import { getState, mutateState } from '@/server/state'

export interface RelatorioCicloFaturamento {
  competencia: string
  totalProcessados: number
  faturasGeradas: number
  faturasLiquidadasComSaldo: number
  faturasPendentes: number
  usuariosInadimplentes: number
  /**
   * Quantas ofertas de venda saíram do livro porque a custódia da moeda passou
   * a estar em aberto neste ciclo (AG8). Fica no relatório para a equipe ver o
   * efeito colateral da virada do mês em vez de descobrir por reclamação de
   * cliente que teve o anúncio retirado.
   */
  ofertasRetiradasPorCustodia: number
  /**
   * Contas cuja cobrança falhou nesta passada, com o motivo. As outras foram cobradas normalmente:
   * desde 26/10/2026 cada conta grava na sua própria transação (ver `processarCicloFaturamento`).
   * Vazio é o normal; qualquer linha aqui é para a equipe olhar.
   */
  falhas: string[]
}

/** O que a cobrança de UMA conta produziu — somado no relatório da passada. */
interface ResultadoDaConta {
  faturasGeradas: number
  faturasLiquidadasComSaldo: number
  faturasPendentes: number
  inadimplente: boolean
}

/**
 * Cobra as moedas cujo ciclo de custódia venceu e atualiza o status das faturas.
 * Chamado pelo cron DIÁRIO (`/api/cron/faturamento`) ou manualmente por rotina administrativa.
 *
 * Roda todo dia porque o ciclo é de cada moeda — começa no dia em que ela foi
 * aceita e renova todo mês no mesmo dia (src/domain/ciclo-custodia.ts). Até
 * 02/10/2026 rodava só no dia 1º e cobrava o acervo inteiro de uma vez. É
 * idempotente: no mesmo dia, a segunda passada não encontra nada a cobrar.
 *
 * UMA TRANSAÇÃO POR CONTA, DESDE 26/10/2026. Até então a passada inteira era um `mutateState` só, e
 * a recusa de UMA fatura pelo banco (o índice `faturas_ciclo_uniq`, corrigido pela migration 047)
 * desfez a cobrança de TODAS: de 21/10 a 26/10 ninguém foi cobrado, a cobertura das moedas acabou e o
 * expurgo tirou do livro as ofertas de quem nunca recebeu conta. Agora a conta que falha fica em
 * `falhas`, com o motivo, e as outras seguem — decisão do Gabriel ("é muito mais seguro").
 *
 * O que NÃO muda com a divisão: cada transação passa pelo mesmo `mutateState`, que grava na mesma
 * transação o ledger (custódia debitada do saldo), a trilha de auditoria e o pedido de NFS-e de cada
 * fatura paga — e agenda o envio delas à Sefin. Nada aqui fala com o Mercado Pago: a fatura pendente
 * continua sendo paga pela tela (Pix, cartão, saldo) e conciliada pelo webhook, como sempre.
 */
export async function processarCicloFaturamento(
  relogioReferencia?: Timestamp,
): Promise<RelatorioCicloFaturamento> {
  const agora = relogioReferencia ?? Date.now()
  const competencia = competenciaAtual(agora)
  // Valores por moeda da Tabela de Taxas vigente (C3); sem banco, TAXAS_PADRAO.
  const { taxas } = await carregarRegrasDoMercado()

  const relatorio: RelatorioCicloFaturamento = {
    competencia,
    totalProcessados: 0,
    faturasGeradas: 0,
    faturasLiquidadasComSaldo: 0,
    faturasPendentes: 0,
    usuariosInadimplentes: 0,
    ofertasRetiradasPorCustodia: 0,
    falhas: [],
  }

  // A lista de contas vem de uma leitura; cada conta é cobrada de novo DENTRO da sua transação, sobre o
  // estado travado — a leitura só diz quem existe e quem não tem nada a cobrar.
  const inicial = await getState()
  for (const [email, user] of Object.entries(inicial.users)) {
    relatorio.totalProcessados++

    // Conta sem moeda, sem plano e sem fatura não tem o que cobrar nem fatura para mudar de status:
    // abrir uma transação para ela seria carregar o estado inteiro à toa, dezenas de vezes por dia.
    if (!temOQueProcessar(inicial, email)) {
      if (user.inadimplente) relatorio.usuariosInadimplentes++
      continue
    }

    try {
      const { result } = await mutateState<ResultadoDaConta>((s) => cobrarConta(s, email, agora, taxas))
      relatorio.faturasGeradas += result.faturasGeradas
      relatorio.faturasLiquidadasComSaldo += result.faturasLiquidadasComSaldo
      relatorio.faturasPendentes += result.faturasPendentes
      if (result.inadimplente) relatorio.usuariosInadimplentes++
    } catch (erro) {
      const motivo = erro instanceof Error ? erro.message : String(erro)
      console.error(`[Faturamento] Falha ao cobrar ${email}; as outras contas seguem:`, erro)
      relatorio.falhas.push(`${email}: ${motivo}`)
    }
  }

  // AG8: o ciclo acabou de criar dívida, então há moeda anunciada que deixou
  // de poder ser vendida neste instante. Sem esta varredura a trava seria
  // contornável só pela ordem dos acontecimentos: quem anunciasse ANTES da
  // virada do mês continuaria com a oferta viva no livro, e a moeda sairia
  // vendida com a guarda em aberto. `publishOffer` barra a publicação nova;
  // é aqui que a oferta velha cai. Roda DEPOIS de todas as cobranças: a moeda
  // cujo dono acabou de pagar pelo saldo não pode perder a oferta.
  try {
    const { result } = await mutateState<number>((s) => {
      const ofertasAntes = s.sellOffers.length
      expurgarOfertasSemCustodia(s)
      return ofertasAntes - s.sellOffers.length
    })
    relatorio.ofertasRetiradasPorCustodia = result
  } catch (erro) {
    const motivo = erro instanceof Error ? erro.message : String(erro)
    console.error('[Faturamento] Falha na varredura de ofertas sem custódia:', erro)
    relatorio.falhas.push(`varredura de ofertas: ${motivo}`)
  }

  return relatorio
}

/** A conta tem moeda, plano ou fatura — algo que o ciclo pode cobrar ou cuja situação pode mudar? */
function temOQueProcessar(state: AppState, email: UserEmail): boolean {
  if ((state.users[email]?.coins.length ?? 0) > 0) return true
  if ((state.planosCustodia ?? []).some((p) => p.userEmail === email)) return true
  return (state.faturasCustodia ?? []).some((f) => f.userEmail === email)
}

/**
 * A cobrança de UMA conta, dentro da transação dela: o ciclo de cada moeda (com o débito automático em
 * saldo, que mora na emissão) e o status das faturas.
 */
function cobrarConta(
  s: AppState,
  email: UserEmail,
  agora: Timestamp,
  taxas: TabelaDeTaxas,
): ResultadoDaConta {
  const resultado: ResultadoDaConta = { faturasGeradas: 0, faturasLiquidadasComSaldo: 0, faturasPendentes: 0, inadimplente: false }
  const user = s.users[email]
  // A conta pode ter saído entre a leitura e a transação: não há o que cobrar.
  if (!user) return resultado
  s.faturasCustodia = s.faturasCustodia ?? []

  // Ciclo de cada moeda: cobra as moedas cujo aniversário de custódia chegou e cujo ciclo ainda não está
  // cobrado (pago, ou com fatura aberta do dono até o fim dele). Roda todo dia, e a cada dia só aparece o
  // que venceu naquele dia — ver src/domain/custodia-da-moeda.ts.
  for (const nova of emitirFaturasDosCiclos(s, email, 'ciclo_mensal', { ...taxas }, agora)) {
    resultado.faturasGeradas++
    if (nova.status === 'paga') resultado.faturasLiquidadasComSaldo++
    else resultado.faturasPendentes++
  }

  // 2. Atualização de status das faturas deste usuário e conferência de inadimplência
  const faturasDoUsuario = s.faturasCustodia.filter((f) => f.userEmail === email)
  for (const f of faturasDoUsuario) {
    f.status = verificarStatusFatura(f, agora)
  }

  // Não grava user.inadimplente: essa coluna é a marca manual do painel (marcarInadimplencia).
  // A inadimplência por fatura é calculada por quem lê (E8). O contador soma as duas origens.
  resultado.inadimplente = Boolean(user.inadimplente) || isInadimplente(user, faturasDoUsuario, agora)
  return resultado
}

/**
 * Liquida uma fatura de custódia pendente debitando o valor do saldo em conta do usuário.
 */
export async function pagarFaturaCustodiaComSaldo(
  faturaId: string,
  userEmail: UserEmail,
): Promise<ActionResult<{ fatura: FaturaCustodia }>> {
  try {
    const { result } = await mutateState<ActionResult<{ fatura: FaturaCustodia }>>((s) =>
      pagarFaturaComSaldoNoEstado(s, userEmail, faturaId, Date.now()),
    )
    return result
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Falha ao processar pagamento com saldo.'
    return { ok: false, error: msg }
  }
}
