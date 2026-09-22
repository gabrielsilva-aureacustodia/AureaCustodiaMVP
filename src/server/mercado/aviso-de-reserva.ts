import 'server-only'

/**
 * O aviso de que uma compra pós-paga está reservada e o relógio correndo.
 *
 * No pós-pago o comprador tem dez minutos para pagar depois que a oferta dele
 * casa com uma venda. Dez minutos sem aviso é o mesmo que prazo nenhum: quem
 * publicou a oferta não está com a tela aberta esperando — o casamento é
 * automático e pode acontecer horas depois.
 *
 * POR QUE ISTO NÃO ESTÁ DENTRO DO CASAMENTO
 * -----------------------------------------
 * O motor (`matchOrders`) é domínio puro: sem I/O, sem async. Mandar e-mail lá
 * dentro quebraria essa regra e, pior, faria uma falha de rede do provedor de
 * e-mail derrubar uma negociação que já aconteceu.
 *
 * Então o aviso roda DEPOIS da transação, olhando o estado já gravado: toda
 * reserva aberta que ainda não foi avisada (`avisadoEm` nulo) recebe o e-mail,
 * e só então é marcada. Isso tem três consequências boas:
 *
 *  - funciona para reserva aberta por QUALQUER caminho — publicar bid,
 *    publicar oferta de venda, comprar lote —, sem repetir a chamada em cada um;
 *  - é idempotente: rodar duas vezes não manda dois e-mails;
 *  - se o e-mail falhar, `avisadoEm` fica nulo e a próxima passagem tenta de
 *    novo, o que é o comportamento certo para um aviso com prazo.
 *
 * O envio NUNCA faz a operação falhar. Sem `RESEND_API_KEY`, o provedor é o
 * registro local (`src/lib/email/`) e a mensagem só vai para o log — o prazo
 * continua valendo do mesmo jeito.
 */

import { brl } from '@/domain/money'
import { PRAZO_DA_RESERVA_MS } from '@/domain/reserva-de-compra'
import type { ReservaDeCompra } from '@/domain/types'
import { enviarEmail } from '@/lib/email'
import { mutateState } from '@/server/state'

const MINUTOS = Math.round(PRAZO_DA_RESERVA_MS / 60000)

function corpo(r: ReservaDeCompra, nome: string): { assunto: string; texto: string } {
  const vence = new Date(r.expiraEm).toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  })
  return {
    assunto: `Sua oferta foi aceita — ${MINUTOS} minutos para pagar`,
    texto:
      `Olá, ${nome}.\n\n` +
      `A sua oferta de compra de 1 ${r.tipoMoeda} foi aceita por um vendedor, e a moeda ` +
      `está reservada no seu nome.\n\n` +
      `Valor a pagar: ${brl(r.totalCents)} ` +
      `(${brl(r.precoCents)} de preço + ${brl(r.comissaoCompradorCents)} de comissão de compra).\n` +
      `Prazo: até ${vence} (horário de Brasília), ou seja ${MINUTOS} minutos a partir de agora.\n\n` +
      `Se o pagamento não for concluído dentro do prazo, a moeda volta ao mercado e a sua ` +
      `oferta passa para o fim da fila do mesmo preço — quem ofertou depois de você assume a vez.\n\n` +
      `Para pagar, abra o Real Olímpico e vá em Compras.\n\n` +
      `Real Olímpico — AUREA CUSTODIA LTDA`,
  }
}

export interface ResumoDoAviso {
  avisadas: number
  falharam: number
  simulado: boolean
}

/**
 * Avisa quem tem reserva aberta e ainda não foi notificado.
 *
 * Chamada depois de toda ação que possa casar ordens. Barata quando não há
 * reserva nenhuma, que é o caso comum.
 */
export async function notificarReservasPendentes(
  agora: number = Date.now(),
): Promise<ResumoDoAviso> {
  const resumo: ResumoDoAviso = { avisadas: 0, falharam: 0, simulado: false }

  // Primeira transação: só LER quem precisa de aviso. O e-mail acontece fora
  // de qualquer transação — I/O de rede dentro de `mutateState` seguraria o
  // bloqueio da linha de estado pelo tempo do provedor responder.
  const { state } = await mutateState((s) => s)
  const pendentes = (state.reservas ?? []).filter(
    (r) => r.status === 'aguardando_pagamento' && r.expiraEm > agora && !r.avisadoEm,
  )
  if (pendentes.length === 0) return resumo

  const enviadas: string[] = []
  for (const r of pendentes) {
    const nome = state.users[r.comprador]?.name ?? r.comprador
    const { assunto, texto } = corpo(r, nome)
    const res = await enviarEmail({ para: r.comprador, assunto, texto })
    if (res.ok) {
      enviadas.push(r.id)
      resumo.avisadas += 1
      if (res.simulado) resumo.simulado = true
    } else {
      // `avisadoEm` fica nulo de propósito: a próxima passagem tenta de novo.
      // Para um aviso com prazo, insistir é melhor do que desistir em silêncio.
      resumo.falharam += 1
      console.warn(`[aviso-de-reserva] falha ao avisar ${r.comprador} sobre ${r.id}: ${res.erro}`)
    }
  }

  if (enviadas.length) {
    await mutateState((s) => {
      for (const r of s.reservas ?? []) {
        if (enviadas.includes(r.id)) r.avisadoEm = agora
      }
      return null
    })
  }

  return resumo
}
