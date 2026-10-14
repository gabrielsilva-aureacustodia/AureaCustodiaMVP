/**
 * Avisos do saque, por e-mail (14/10/2026): à equipe quando o pedido chega, e ao cliente quando ele
 * pede, quando é pago e quando é recusado.
 *
 * O AVISO À EQUIPE É O QUE FALTAVA. O saque do Sidnei ficou parado porque nada avisava ninguém — a
 * linha entrava no banco e só quem abrisse a ficha dele por acaso a veria. Agora o pedido chega ao
 * e-mail de quem tem `saques.pagar`, além de aparecer como alerta no painel inicial.
 *
 * NUNCA DERRUBA O SAQUE. Todo aviso é feito depois que o estado foi gravado, dentro de try/catch: um
 * provedor de e-mail fora do ar não pode desfazer nem travar um saque que já foi pedido ou pago.
 * Sem `RESEND_API_KEY` o e-mail só vai para o log do servidor (`simulado`), e o alerta no painel
 * continua sendo o aviso que vale.
 */

import { brl } from '@/domain/money'
import { fdate as dataBR } from '@/domain/dates'
import type { Saque } from '@/domain/types'
import { enviarEmail } from '@/lib/email'
import { emailsDaEquipeCom } from '@/server/admin/destinatarios'
import { getState } from '@/server/state'

function base(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
}

function chaveLegivel(s: Saque): string {
  const d = s.dadosBancarios
  if (d.chavePix) return `Pix (${d.tipoChavePix ?? 'chave'}): ${d.chavePix}`
  return [d.banco, d.agencia && `ag. ${d.agencia}`, d.conta && `conta ${d.conta}`].filter(Boolean).join(' · ') || 'dados bancários cadastrados'
}

/** À equipe: um pedido novo está esperando. */
export async function avisarEquipeDoNovoSaque(saque: Saque, nomeDoCliente: string): Promise<void> {
  try {
    const para = await emailsDaEquipeCom('saques.pagar')
    if (para.length === 0) {
      console.warn(`[saques] ninguém da equipe a avisar sobre o saque ${saque.id}`)
      return
    }
    const assunto = `Novo pedido de saque — ${brl(saque.valorLiquido)} (${nomeDoCliente})`
    const texto = [
      `${nomeDoCliente} (${saque.userEmail}) pediu um saque.`,
      '',
      `Valor líquido a pagar: ${brl(saque.valorLiquido)}`,
      `Total debitado do saldo: ${brl(saque.valorTotal)} (tarifa ${brl(saque.taxa)})`,
      `Destino: ${chaveLegivel(saque)}`,
      `Previsão prometida ao cliente: ${dataBR(saque.previsaoPagamentoEm)}`,
      '',
      `Aprovar ou recusar: ${base()}/admin/saques`,
    ].join('\n')
    await Promise.all(para.map((p) => enviarEmail({ para: p, assunto, texto })))
  } catch (err) {
    console.error('[saques] falha ao avisar a equipe do novo saque:', err)
  }
}

type Momento = 'solicitado' | 'pago' | 'recusado'

/** Ao cliente: o pedido foi recebido (com o prazo), pago ou recusado (com o motivo). */
export async function avisarClienteDoSaque(saqueId: string, momento: Momento): Promise<void> {
  try {
    const state = await getState()
    const saque = (state.saques ?? []).find((s) => s.id === saqueId)
    if (!saque) return
    const nome = state.users[saque.userEmail]?.name?.split(' ')[0] ?? 'Olá'

    let assunto: string
    let corpo: string
    if (momento === 'solicitado') {
      assunto = 'Recebemos o seu pedido de saque'
      corpo = [
        `Recebemos o seu pedido de saque de ${brl(saque.valorTotal)}.`,
        '',
        `Você vai receber ${brl(saque.valorLiquido)} (já descontada a tarifa de ${brl(saque.taxa)}) na chave Pix cadastrada.`,
        `Prazo: até ${dataBR(saque.previsaoPagamentoEm)} (3 dias úteis). Cada pedido é conferido pela nossa equipe antes do envio.`,
        '',
        'O valor já saiu do seu saldo e fica reservado para este saque. Se o pedido for recusado, ele volta integralmente para o seu saldo.',
      ].join('\n')
    } else if (momento === 'pago') {
      assunto = 'Seu saque foi pago'
      corpo = `O Pix de ${brl(saque.valorLiquido)} foi enviado para a sua chave cadastrada. Se não encontrar o valor, fale com o nosso atendimento.`
    } else {
      assunto = 'Seu saque foi recusado'
      corpo = [
        `Não foi possível concluir o seu saque de ${brl(saque.valorTotal)}.`,
        saque.motivoFalha ? `Motivo: ${saque.motivoFalha}` : '',
        '',
        `O valor foi devolvido ao seu saldo. Confira os dados de recebimento em ${base()}/conta e solicite de novo.`,
      ]
        .filter((l, i) => l !== '' || i > 0)
        .join('\n')
    }
    await enviarEmail({ para: saque.userEmail, assunto, texto: `${nome},\n\n${corpo}\n\nReal Olímpico` })
  } catch (err) {
    console.error('[saques] falha ao avisar o cliente do saque:', err)
  }
}
