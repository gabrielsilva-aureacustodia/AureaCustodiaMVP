/**
 * O ciclo de vida do saque depois que o cliente o pede: aprovar (Pix pelo Mercado Pago ou registro de
 * um Pix feito por fora), conferir o resultado, recusar com estorno e reagir ao aviso do gateway.
 *
 * 14/10/2026. ATÉ AQUI `solicitarSaque` devolvia o saldo ao banco da plataforma e o pedido ficava
 * `solicitado` para sempre: o do Sidnei (R$ 196,00) parou assim. As duas ações de liquidar e recusar
 * que existiam em `account.ts` eram chamáveis por QUALQUER conta logada — nenhuma conferia que era da
 * equipe — e nenhuma tela as usava. Este módulo não decide quem pode: as Server Actions de
 * `src/server/actions/admin/saques.ts` conferem `saques.pagar` ANTES de chegar aqui, e nada daqui é
 * exportado por um arquivo 'use server'.
 *
 * AS TRÊS REGRAS QUE IMPEDEM PAGAR DUAS VEZES
 *  1. O saque vira `em_processamento` e é GRAVADO antes de chamar o Mercado Pago. Dois cliques
 *     seguidos (ou duas pessoas da equipe) encontram o estado já trocado e a segunda recusa.
 *  2. A referência do payout, que é também a chave de idempotência, sai do id do saque e do número da
 *     tentativa. Reenviar depois de uma resposta incerta (rede, 5xx) usa a MESMA referência: se o
 *     primeiro envio tinha passado, o Mercado Pago devolve o mesmo payout em vez de criar outro.
 *  3. Resposta incerta nunca vira "falhou" sozinha. O saque fica `em_processamento` com o aviso, e só
 *     uma pessoa, depois de olhar o painel do Mercado Pago, paga por fora ou reenvia.
 *
 * O ESTADO É O ÚNICO LUGAR ONDE O SALDO MUDA: recusar devolve `valorTotal` (líquido + tarifa) pelo
 * `mutateState`, e o ledger registra o `estorno` na mesma transação (`derivar.ts`).
 */

import { brl } from '@/domain/money'
import {
  aplicarResultadoDoPayout,
  chaveParaMercadoPago,
  descricaoDoPayout,
  referenciaDoPayout,
  type ResultadoDoPayout,
  type Veredito,
} from '@/domain/saques'
import type { ActionResult, Saque } from '@/domain/types'
import { configuracaoDePayouts, consultarPayout, criarPayoutPix } from '@/lib/payments/payouts'
import { avisarClienteDoSaque } from '@/server/saques/avisos'
import { mutateState } from '@/server/state'

const NAO_ENCONTRADO = 'Solicitação de saque não encontrada.'

function achar(saques: Saque[] | undefined, id: string): Saque | undefined {
  return (saques ?? []).find((s) => s.id === id)
}

export interface ResumoDoEnvio {
  saqueId: string
  userEmail: string
  valorLiquido: number
  situacao: Saque['status']
}

/* ------------------------------------------------------------------ *
 * Aprovar pelo Mercado Pago                                            *
 * ------------------------------------------------------------------ */

export async function aprovarPeloMercadoPago(saqueId: string, aprovador: string): Promise<ActionResult<ResumoDoEnvio>> {
  const cfg = configuracaoDePayouts()
  if (!cfg.ativo) {
    return {
      ok: false,
      error: `O envio automático de Pix está desligado (falta ${cfg.faltando.join(', ')}). Faça o Pix por fora e use "Marcar como pago".`,
    }
  }

  // PASSO 1 — reservar. Só `solicitado` entra; `em_processamento` sem id de payout é a retomada
  // depois de resposta incerta e mantém a tentativa (mesma chave de idempotência).
  const { result: reserva } = await mutateState<ActionResult<{ referencia: string; valorLiquido: number; userEmail: string; chave: NonNullable<ReturnType<typeof chaveParaMercadoPago>> }>>((s) => {
    const saque = achar(s.saques, saqueId)
    if (!saque) return { ok: false, error: NAO_ENCONTRADO }
    const retomada = saque.status === 'em_processamento' && !saque.payoutId && saque.canal === 'mercadopago'
    if (saque.status !== 'solicitado' && !retomada) {
      return {
        ok: false,
        error:
          saque.status === 'pago'
            ? 'Este saque já foi pago.'
            : saque.status === 'falhou'
              ? 'Este saque já foi recusado e estornado.'
              : 'Este saque já foi enviado ao Mercado Pago. Use "Conferir" para ver o resultado.',
      }
    }
    const chave = chaveParaMercadoPago(saque.dadosBancarios)
    if (!chave) {
      return {
        ok: false,
        error: 'A chave Pix cadastrada não bate com o tipo informado. Corrija na ficha do cliente (ou pague por fora) antes de enviar.',
      }
    }

    const agora = Date.now()
    if (!retomada) saque.tentativas = (saque.tentativas ?? 0) + 1
    saque.status = 'em_processamento'
    saque.canal = 'mercadopago'
    saque.aprovadoPor = aprovador
    saque.aprovadoEm = agora
    saque.atualizadoEm = agora
    saque.detalheGateway = 'enviando ao Mercado Pago…'
    return {
      ok: true,
      data: {
        referencia: referenciaDoPayout(saque.id, saque.tentativas ?? 1),
        valorLiquido: saque.valorLiquido,
        userEmail: saque.userEmail,
        chave,
      },
    }
  })
  if (!reserva.ok || !reserva.data) return { ok: false, error: reserva.error ?? NAO_ENCONTRADO }
  const r = reserva.data

  // PASSO 2 — chamar o Mercado Pago, fora de qualquer transação de banco.
  const envio = await criarPayoutPix({
    referencia: r.referencia,
    valorCents: r.valorLiquido,
    chave: r.chave,
    descricao: descricaoDoPayout(`Saque Real Olimpico ${saqueId}`),
  })

  // PASSO 3 — registrar o que aconteceu.
  const { result: final } = await mutateState<ActionResult<ResumoDoEnvio>>((s) => {
    const saque = achar(s.saques, saqueId)
    if (!saque) return { ok: false, error: NAO_ENCONTRADO }
    const agora = Date.now()
    saque.atualizadoEm = agora

    if (envio.ok) {
      saque.payoutId = envio.payoutId
      saque.payoutTransacaoId = envio.transacaoId
      saque.detalheGateway = 'aceito pelo Mercado Pago — aguardando confirmação do Pix'
      return {
        ok: true,
        data: { saqueId, userEmail: saque.userEmail, valorLiquido: saque.valorLiquido, situacao: saque.status },
        message: `Pix de ${brl(saque.valorLiquido)} enviado ao Mercado Pago. Use "Conferir" para ver a confirmação.`,
      }
    }

    if (envio.definitivo) {
      // Recusa clara: nada saiu. Volta para a fila para a equipe corrigir e tentar de novo.
      saque.status = 'solicitado'
      saque.canal = null
      saque.aprovadoPor = null
      saque.aprovadoEm = null
      saque.detalheGateway = `recusado pelo Mercado Pago: ${envio.erro}`
      return { ok: false, error: `O Mercado Pago recusou o envio: ${envio.erro}` }
    }

    // Incerto: pode ter saído. Fica em processamento, com o aviso.
    saque.detalheGateway = `resultado incerto (${envio.erro}) — confira o painel do Mercado Pago antes de reenviar ou pagar por fora`
    return {
      ok: false,
      error:
        'Não foi possível confirmar se o Mercado Pago recebeu o envio. O saque ficou "em processamento": confira o painel do Mercado Pago antes de reenviar ou de pagar por fora.',
    }
  })
  return final
}

/* ------------------------------------------------------------------ *
 * Conferir                                                             *
 * ------------------------------------------------------------------ */

export async function conferirNoMercadoPago(saqueId: string): Promise<ActionResult<{ veredito: Veredito }>> {
  const { result: alvo } = await mutateState<ActionResult<{ payoutId: string }>>((s) => {
    const saque = achar(s.saques, saqueId)
    if (!saque) return { ok: false, error: NAO_ENCONTRADO }
    if (saque.status !== 'em_processamento') {
      return { ok: false, error: saque.status === 'pago' ? 'Este saque já está pago.' : 'Este saque não está em processamento no Mercado Pago.' }
    }
    if (!saque.payoutId) {
      return {
        ok: false,
        error:
          'Este envio não tem o id do payout (a resposta do Mercado Pago foi incerta). Confira no painel do Mercado Pago; se o Pix saiu, use "Marcar como pago"; se não saiu, use "Enviar".',
      }
    }
    return { ok: true, data: { payoutId: saque.payoutId } }
  })
  if (!alvo.ok || !alvo.data) return { ok: false, error: alvo.error ?? NAO_ENCONTRADO }

  const consulta = await consultarPayout(alvo.data.payoutId)
  if (!consulta.ok) return { ok: false, error: `Não foi possível consultar o Mercado Pago: ${consulta.erro}` }
  return aplicarConsulta(saqueId, consulta.resultado)
}

async function aplicarConsulta(saqueId: string, resultado: ResultadoDoPayout): Promise<ActionResult<{ veredito: Veredito }>> {
  const { result } = await mutateState<ActionResult<{ veredito: Veredito }>>((s) => {
    const saque = achar(s.saques, saqueId)
    if (!saque) return { ok: false, error: NAO_ENCONTRADO }
    const veredito = aplicarResultadoDoPayout(saque, resultado, Date.now())
    return {
      ok: true,
      data: { veredito },
      message:
        veredito === 'pago'
          ? `Pix confirmado pelo Mercado Pago: saque pago (${brl(saque.valorLiquido)}).`
          : veredito === 'recusado'
            ? `O Mercado Pago não conseguiu enviar o Pix (${saque.detalheGateway}). O saque voltou para a fila.`
            : 'O Mercado Pago ainda está processando o Pix.',
    }
  })
  return result
}

/**
 * O aviso do Mercado Pago NÃO é assinado e por isso nunca decide nada: ele só aponta para um saque, e a
 * situação vem sempre da consulta que NÓS fazemos com o nosso token. Aviso que não aponta para um saque
 * em processamento é ignorado em silêncio.
 */
export async function reagirAoAvisoDoGateway(referencia: string | null, payoutId: string | null): Promise<void> {
  const { result: alvo } = await mutateState<ActionResult<{ saqueId: string }>>((s) => {
    const saque = (s.saques ?? []).find(
      (x) =>
        x.status === 'em_processamento' &&
        x.payoutId &&
        ((payoutId && x.payoutId === payoutId) || (referencia && referenciaDoPayout(x.id, x.tentativas ?? 1) === referencia)),
    )
    return saque ? { ok: true, data: { saqueId: saque.id } } : { ok: false, error: 'sem saque correspondente' }
  })
  if (alvo.ok && alvo.data) {
    const r = await conferirNoMercadoPago(alvo.data.saqueId)
    if (r.ok && r.data?.veredito === 'pago') await avisarClienteDoSaque(alvo.data.saqueId, 'pago')
  }
}

/* ------------------------------------------------------------------ *
 * Pagar por fora                                                       *
 * ------------------------------------------------------------------ */

export async function registrarPagamentoManual(saqueId: string, comprovante: string, aprovador: string): Promise<ActionResult<ResumoDoEnvio>> {
  const ref = comprovante.trim()
  if (ref.length < 3) return { ok: false, error: 'Informe o comprovante do Pix (código ou identificação da transferência).' }

  const { result } = await mutateState<ActionResult<ResumoDoEnvio>>((s) => {
    const saque = achar(s.saques, saqueId)
    if (!saque) return { ok: false, error: NAO_ENCONTRADO }
    if (saque.status === 'pago') return { ok: false, error: 'Este saque já foi pago.' }
    if (saque.status === 'falhou') return { ok: false, error: 'Este saque já foi recusado e estornado.' }
    if (saque.status === 'em_processamento' && saque.payoutId) {
      return { ok: false, error: 'Há um envio em andamento no Mercado Pago. Use "Conferir" — pagar por fora agora poderia pagar duas vezes.' }
    }

    const agora = Date.now()
    saque.status = 'pago'
    saque.canal = 'manual'
    saque.aprovadoPor = saque.aprovadoPor ?? aprovador
    saque.aprovadoEm = saque.aprovadoEm ?? agora
    saque.pagoEm = agora
    saque.comprovanteRef = ref.slice(0, 120)
    saque.motivoFalha = null
    saque.detalheGateway = null
    saque.atualizadoEm = agora
    return {
      ok: true,
      data: { saqueId, userEmail: saque.userEmail, valorLiquido: saque.valorLiquido, situacao: 'pago' },
      message: `Saque ${saqueId} registrado como pago (${brl(saque.valorLiquido)}).`,
    }
  })
  return result
}

/* ------------------------------------------------------------------ *
 * Recusar                                                              *
 * ------------------------------------------------------------------ */

export async function recusarSaque(saqueId: string, motivo: string): Promise<ActionResult<ResumoDoEnvio>> {
  const m = motivo.trim()
  if (m.length < 3) return { ok: false, error: 'Informe o motivo da recusa — o cliente vai ler.' }

  const { result } = await mutateState<ActionResult<ResumoDoEnvio>>((s) => {
    const saque = achar(s.saques, saqueId)
    if (!saque) return { ok: false, error: NAO_ENCONTRADO }
    if (saque.status === 'pago') return { ok: false, error: 'Não é possível recusar um saque já pago.' }
    if (saque.status === 'falhou') return { ok: false, error: 'Este saque já foi recusado.' }
    // Em processamento pode já ter saído dinheiro: só recusa depois de a situação ficar clara.
    if (saque.status === 'em_processamento') {
      return {
        ok: false,
        error: 'O envio ao Mercado Pago está em andamento. Use "Conferir"; se o Pix falhar, o saque volta para a fila e aí dá para recusar.',
      }
    }

    const u = s.users[saque.userEmail]
    if (!u) return { ok: false, error: 'A conta do cliente não existe mais.' }

    const agora = Date.now()
    saque.status = 'falhou'
    saque.motivoFalha = m.slice(0, 300)
    saque.atualizadoEm = agora
    u.balance += saque.valorTotal
    return {
      ok: true,
      data: { saqueId, userEmail: saque.userEmail, valorLiquido: saque.valorLiquido, situacao: 'falhou' },
      message: `Saque recusado. ${brl(saque.valorTotal)} voltaram ao saldo de ${u.name}.`,
    }
  })
  return result
}
