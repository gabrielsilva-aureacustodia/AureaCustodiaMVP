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
 */

import {
  calcularVencimentoFatura,
  competenciaAtual,
  DIAS_TOLERANCIA_FATURA,
  isInadimplente,
  verificarStatusFatura,
} from '@/domain/custody'
import {
  calcularPagoAte,
  mesesCobertos,
  renovacaoDevida,
  somarMeses,
  valorDoPlano,
} from '@/domain/plano-custodia'
import type { TabelaDeTaxas } from '@/domain/fees'
import type { ActionResult, AppState, FaturaCustodia, Timestamp, UserEmail } from '@/domain/types'
import { carregarRegrasDoMercado } from '@/server/config/carregar'
import { expurgarOfertasSemCustodia } from '@/domain/bloqueio-por-debito'
import { emitirFaturasDosCiclos } from '@/domain/cobranca-de-entrada'
import { recomecarCicloNoPrimeiroPagamento } from '@/domain/custodia-da-compra'
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
      const { result } = await mutateState<ResultadoDaConta>((s) => cobrarConta(s, email, competencia, agora, taxas))
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
 * A cobrança de UMA conta, dentro da transação dela: renovação de plano, ciclo de cada moeda (com o
 * débito automático em saldo, que mora na emissão) e o status das faturas. É o corpo que até 26/10/2026
 * rodava no laço de todas as contas, sem mudança de regra.
 */
function cobrarConta(
  s: AppState,
  email: UserEmail,
  competencia: string,
  agora: Timestamp,
  taxas: TabelaDeTaxas,
): ResultadoDaConta {
  const resultado: ResultadoDaConta = { faturasGeradas: 0, faturasLiquidadasComSaldo: 0, faturasPendentes: 0, inadimplente: false }
  const user = s.users[email]
  // A conta pode ter saído entre a leitura e a transação: não há o que cobrar.
  if (!user) return resultado
  s.faturasCustodia = s.faturasCustodia ?? []
  s.planosCustodia = s.planosCustodia ?? []
  const planosDoUsuario = s.planosCustodia.filter((p) => p.userEmail === email)

  // A) Renovação dos planos que passaram do último mês coberto (13º do anual, 25º do de 24 meses)
  for (const plano of planosDoUsuario) {
    if (renovacaoDevida(plano, competencia)) {
      const jaTemRenovacao = s.faturasCustodia.some(
        (f) => f.planoId === plano.id && f.competencia === competencia && f.origem === 'renovacao_anual',
      )

      if (!jaTemRenovacao) {
        const moedasAtivasDoPlano = user.coins.filter(
          (c) => plano.moedaIds.includes(c.id) && c.recibo?.status !== 'Extinto',
        )
        const qtdRenovacao =
          moedasAtivasDoPlano.length > 0
            ? moedasAtivasDoPlano.length
            : (plano.moedaIds.length > 0 ? plano.moedaIds.length : plano.quantidadeContratada)

        // Renova na modalidade do próprio plano, e pelo preço vigente hoje.
        const { total } = valorDoPlano(plano.modalidade, qtdRenovacao, { ...taxas })
        const sanitizeEmail = email.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)
        const idRenovacao = `FAT-${competencia}-${sanitizeEmail}-REN-${agora}`

        const faturaRenovacao: FaturaCustodia = {
          id: idRenovacao,
          userEmail: email,
          competencia,
          quantidadeMoedas: qtdRenovacao,
          moedaIds: moedasAtivasDoPlano.map((c) => c.id),
          valorCents: total,
          status: 'pendente',
          dataEmissao: agora,
          dataVencimento: calcularVencimentoFatura(agora, DIAS_TOLERANCIA_FATURA),
          dataPagamento: null,
          formaPagamento: null,
          paymentIntentId: null,
          planoId: plano.id,
          origem: 'renovacao_anual',
        }

        resultado.faturasGeradas++
        if (user.balance >= faturaRenovacao.valorCents) {
          user.balance -= faturaRenovacao.valorCents
          faturaRenovacao.status = 'paga'
          faturaRenovacao.dataPagamento = agora
          faturaRenovacao.formaPagamento = 'saldo'
          resultado.faturasLiquidadasComSaldo++
          plano.pagoAteCompetencia = somarMeses(plano.pagoAteCompetencia ?? plano.inicioCompetencia, mesesCobertos(plano.modalidade))
          plano.atualizadoEm = agora
        } else {
          faturaRenovacao.status = 'pendente'
          resultado.faturasPendentes++
        }

        s.faturasCustodia.push(faturaRenovacao)
      }
    }
  }

  // B) Ciclo de cada moeda: cobra as moedas cujo aniversário de custódia chegou
  // e ainda não têm o ciclo resolvido (paga, ou com fatura aberta do ciclo).
  // Roda todo dia, e a cada dia só aparece o que venceu naquele dia — ver
  // src/domain/ciclo-custodia.ts. O débito automático em saldo mora na própria
  // emissão.
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
    const { result } = await mutateState<ActionResult<{ fatura: FaturaCustodia }>>((s) => {
      const u = s.users[userEmail]
      if (!u) {
        return { ok: false, error: 'Usuário não encontrado.' }
      }

      s.faturasCustodia = s.faturasCustodia ?? []
      const fatura = s.faturasCustodia.find((f) => f.id === faturaId)
      if (!fatura) {
        return { ok: false, error: 'Fatura de custódia não encontrada.' }
      }

      if (fatura.userEmail !== userEmail) {
        return { ok: false, error: 'Esta fatura pertence a outro usuário.' }
      }

      if (fatura.status === 'paga') {
        return { ok: false, error: 'Esta fatura já foi paga.' }
      }

      if (fatura.status === 'cancelada') {
        return { ok: false, error: 'Esta fatura foi cancelada.' }
      }

      if (u.balance < fatura.valorCents) {
        return {
          ok: false,
          error: `Saldo insuficiente para quitar a fatura (saldo: ${(u.balance / 100).toFixed(2)}, fatura: ${(fatura.valorCents / 100).toFixed(2)}).`,
        }
      }

      const agora = Date.now()
      u.balance -= fatura.valorCents
      fatura.status = 'paga'
      fatura.dataPagamento = agora
      fatura.formaPagamento = 'saldo'
      // Moeda comprada antes de 21/10 sem custódia do dono novo: o ciclo recomeça hoje (26/10/2026).
      recomecarCicloNoPrimeiroPagamento(s, fatura, agora)

      if (fatura.origem === 'contratacao' && fatura.planoId) {
        s.planosCustodia = s.planosCustodia ?? []
        const plano = s.planosCustodia.find((p) => p.id === fatura.planoId)
        if (plano) {
          plano.status = 'vigente'
          plano.pagoAteCompetencia = calcularPagoAte(plano.inicioCompetencia, plano.modalidade)
          plano.formaPagamento = 'saldo'
          plano.atualizadoEm = agora
        }
      } else if (fatura.origem === 'renovacao_anual' && fatura.planoId) {
        s.planosCustodia = s.planosCustodia ?? []
        const plano = s.planosCustodia.find((p) => p.id === fatura.planoId)
        if (plano) {
          plano.pagoAteCompetencia = somarMeses(plano.pagoAteCompetencia ?? plano.inicioCompetencia, mesesCobertos(plano.modalidade))
          plano.formaPagamento = 'saldo'
          plano.atualizadoEm = agora
        }
      }

      return { ok: true, data: { fatura } }
    })

    return result
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Falha ao processar pagamento com saldo.'
    return { ok: false, error: msg }
  }
}
