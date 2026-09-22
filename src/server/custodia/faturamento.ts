import 'server-only'

/**
 * Serviço de faturamento mensal de custódia e controle de inadimplência (Sessão B-5 / Bloco 8).
 *
 * Regras protegidas (Decisão D-3, 10/09/2026 e Cláusulas 3 e 4 dos Termos):
 * - R$ 2,00 por moeda guardada por mês.
 * - Ciclo mensal com tolerância de 10 dias para pagamento.
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
  gerarFaturaDoCiclo,
  mesesCobertos,
  renovacaoDevida,
  somarMeses,
  valorDoPlano,
} from '@/domain/plano-custodia'
import type { ActionResult, FaturaCustodia, Timestamp, UserEmail } from '@/domain/types'
import { carregarRegrasDoMercado } from '@/server/config/carregar'
import { expurgarOfertasSemCustodia } from '@/domain/bloqueio-por-debito'
import { mutateState } from '@/server/state'

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
}

/**
 * Executa o ciclo mensal de faturamento para todos os usuários com moedas ativas sob guarda.
 * Chamado pelo cron mensal (`/api/cron/faturamento`) ou manualmente por rotina administrativa.
 */
export async function processarCicloFaturamento(
  competenciaAlvo?: string,
  relogioReferencia?: Timestamp,
): Promise<RelatorioCicloFaturamento> {
  const agora = relogioReferencia ?? Date.now()
  const competencia = competenciaAlvo ?? competenciaAtual(agora)
  // Valores por moeda da Tabela de Taxas vigente (C3); sem banco, TAXAS_PADRAO.
  const { taxas } = await carregarRegrasDoMercado()

  let ofertasRetiradasPorCustodia = 0

  const { result } = await mutateState<RelatorioCicloFaturamento>((s) => {
    s.faturasCustodia = s.faturasCustodia ?? []
    s.planosCustodia = s.planosCustodia ?? []
    const faturasExistentes = new Map<string, FaturaCustodia>()
    for (const f of s.faturasCustodia) {
      faturasExistentes.set(`${f.userEmail}#${f.competencia}#${f.origem || 'ciclo_mensal'}`, f)
    }

    let faturasGeradas = 0
    let faturasLiquidadasComSaldo = 0
    let faturasPendentes = 0
    let usuariosInadimplentes = 0
    let totalProcessados = 0

    // 1. Geração de faturas e tentativa de débito automático em saldo
    for (const [email, user] of Object.entries(s.users)) {
      totalProcessados++
      const planosDoUsuario = s.planosCustodia.filter((p) => p.userEmail === email)

      // A) Renovação dos planos que passaram do último mês coberto (13º do anual, 25º do de 24 meses)
      for (const plano of planosDoUsuario) {
        if (renovacaoDevida(plano, competencia)) {
          const chaveRenovacao = `${email}#${competencia}#renovacao_anual#${plano.id}`
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

            faturasGeradas++
            if (user.balance >= faturaRenovacao.valorCents) {
              user.balance -= faturaRenovacao.valorCents
              faturaRenovacao.status = 'paga'
              faturaRenovacao.dataPagamento = agora
              faturaRenovacao.formaPagamento = 'saldo'
              faturasLiquidadasComSaldo++
              plano.pagoAteCompetencia = somarMeses(plano.pagoAteCompetencia ?? plano.inicioCompetencia, mesesCobertos(plano.modalidade))
              plano.atualizadoEm = agora
            } else {
              faturaRenovacao.status = 'pendente'
              faturasPendentes++
            }

            s.faturasCustodia.push(faturaRenovacao)
            faturasExistentes.set(chaveRenovacao, faturaRenovacao)
          }
        }
      }

      // B) Ciclo mensal para moedas não cobertas
      const chaveCiclo = `${email}#${competencia}#ciclo_mensal`
      const faturaCicloExistente = faturasExistentes.get(chaveCiclo)

      if (!faturaCicloExistente) {
        const novaFatura = gerarFaturaDoCiclo(user, email, competencia, planosDoUsuario, { ...taxas }, agora)
        if (novaFatura) {
          faturasGeradas++
          // Débito automático se houver saldo suficiente
          if (user.balance >= novaFatura.valorCents) {
            user.balance -= novaFatura.valorCents
            novaFatura.status = 'paga'
            novaFatura.dataPagamento = agora
            novaFatura.formaPagamento = 'saldo'
            faturasLiquidadasComSaldo++
          } else {
            novaFatura.status = 'pendente'
            faturasPendentes++
          }
          s.faturasCustodia.push(novaFatura)
          faturasExistentes.set(chaveCiclo, novaFatura)
        }
      }

      // 2. Atualização de status das faturas deste usuário e conferência de inadimplência
      const faturasDoUsuario = s.faturasCustodia.filter((f) => f.userEmail === email)
      for (const f of faturasDoUsuario) {
        f.status = verificarStatusFatura(f, agora)
      }

      // Não grava user.inadimplente: essa coluna é a marca manual do painel (marcarInadimplencia).
      // A inadimplência por fatura é calculada por quem lê (E8). O contador soma as duas origens.
      const inadimplente = Boolean(user.inadimplente) || isInadimplente(user, faturasDoUsuario, agora)
      if (inadimplente) {
        usuariosInadimplentes++
      }
    }

    // AG8: o ciclo acabou de criar dívida, então há moeda anunciada que deixou
    // de poder ser vendida neste instante. Sem esta varredura a trava seria
    // contornável só pela ordem dos acontecimentos: quem anunciasse ANTES da
    // virada do mês continuaria com a oferta viva no livro, e a moeda sairia
    // vendida com a guarda em aberto. `publishOffer` barra a publicação nova;
    // é aqui que a oferta velha cai.
    const ofertasAntes = s.sellOffers.length
    expurgarOfertasSemCustodia(s)
    ofertasRetiradasPorCustodia = ofertasAntes - s.sellOffers.length

    return {
      competencia,
      totalProcessados,
      faturasGeradas,
      faturasLiquidadasComSaldo,
      faturasPendentes,
      usuariosInadimplentes,
      ofertasRetiradasPorCustodia,
    }
  })

  return result
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
