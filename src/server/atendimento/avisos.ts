import 'server-only'

/**
 * O e-mail que avisa o cliente de que a equipe respondeu o caso dele.
 *
 * DEPOIS DA TRANSAÇÃO E NUNCA FAZ A RESPOSTA FALHAR, como o aviso de reserva (aviso-de-reserva.ts): a
 * resposta já está gravada e visível na área do cliente; e-mail é conveniência. Sem `RESEND_API_KEY`
 * o provedor é o registro local e o resultado volta com `simulado: true` — quem chamou diz isso na tela.
 * O texto da resposta NÃO vai no e-mail: o cliente entra na conta para lê-la, e conversa de atendimento
 * pode citar dado pessoal.
 */

import { enviarEmail } from '@/lib/email'

export async function avisarRespostaDoCaso(para: string, casoId: number, titulo: string): Promise<{ enviado: boolean; simulado: boolean }> {
  try {
    const r = await enviarEmail({
      para,
      assunto: 'O Real Olímpico respondeu o seu pedido',
      texto: [
        'Olá,',
        '',
        `A equipe respondeu o seu pedido "${titulo}" (caso ${casoId}).`,
        'Entre na sua conta e abra Atendimento para ler a resposta e continuar a conversa.',
        '',
        'Real Olímpico',
      ].join('\n'),
    })
    return { enviado: r.ok && r.simulado !== true, simulado: r.simulado === true }
  } catch (err) {
    console.error('[atendimento] falha ao avisar a resposta por e-mail:', err)
    return { enviado: false, simulado: false }
  }
}
