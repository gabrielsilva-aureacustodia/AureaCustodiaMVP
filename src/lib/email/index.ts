/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Lê RESEND_API_KEY e EMAIL_REMETENTE. Não importe de Client Component.
 * ==========================================================================*/

import 'server-only'

import type { MensagemDeEmail, ProvedorDeEmail, ResultadoDeEnvio } from './tipos'

export * from './tipos'

/**
 * E-mail transacional — o primeiro do projeto.
 *
 * Nasceu em 22/09/2026 com a oferta de compra pós-paga: quando a oferta casa,
 * o comprador tem dez minutos para pagar, e dez minutos sem aviso é o mesmo
 * que prazo nenhum — a pessoa não está olhando a tela. O `CLAUDE.md` já
 * listava "sem e-mail transacional" entre as pendências conhecidas; esta é a
 * peça que fecha essa lacuna, no tamanho de quem precisa dela.
 *
 * O DESENHO É O DE `src/lib/mensageria/`, DE PROPÓSITO
 * ---------------------------------------------------
 * Quem atende é escolhido pelo ambiente, sem interruptor e sem trava: com
 * `RESEND_API_KEY`, o Resend; sem ela, o registro local, que só escreve no log
 * do servidor e devolve `simulado: true`. Nada no produto para de funcionar
 * por falta de credencial de e-mail — o pós-pago continua valendo, o prazo
 * continua correndo, e quem chamou sabe que o aviso não saiu porque o
 * resultado diz.
 *
 * Por que Resend e não o Supabase: o Supabase só manda e-mail de autenticação
 * (convite, link mágico, recuperação), com templates dele. Aviso de prazo de
 * pagamento não é nada disso.
 */

const REMETENTE_PADRAO = 'Real Olímpico <nao-responda@realolimpico.com.br>'

function criarResend(chave: string, remetente: string): ProvedorDeEmail {
  return {
    nome: 'Resend',
    faltando: [],
    async enviar(m: MensagemDeEmail): Promise<ResultadoDeEnvio> {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${chave}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: remetente,
            to: [m.para],
            subject: m.assunto,
            text: m.texto,
            ...(m.html ? { html: m.html } : {}),
          }),
        })
        const corpo = await res.text()
        if (!res.ok) return { ok: false, erro: `HTTP ${res.status}: ${corpo.slice(0, 200)}` }
        return { ok: true, id: (JSON.parse(corpo) as { id?: string }).id }
      } catch (e) {
        // Falha de rede não pode derrubar a operação que pediu o aviso: quem
        // chama trata `ok: false` como "não avisei", nunca como "não vendi".
        return { ok: false, erro: e instanceof Error ? e.message : 'falha ao enviar e-mail' }
      }
    },
  }
}

function criarRegistroLocal(faltando: readonly string[]): ProvedorDeEmail {
  return {
    nome: 'registro local',
    faltando,
    async enviar(m: MensagemDeEmail): Promise<ResultadoDeEnvio> {
      console.info(
        `[email:registro-local] para=${m.para} assunto="${m.assunto}"\n${m.texto}\n` +
          `(não enviado: falta ${faltando.join(', ')})`,
      )
      return { ok: true, simulado: true }
    },
  }
}

/**
 * Qual provedor atende, decidido pelo ambiente — mesmo desenho de
 * `src/server/store/index.ts` e de `src/lib/mensageria/index.ts`.
 */
export function provedorDeEmail(
  env: Readonly<Record<string, string | undefined>> = process.env,
): ProvedorDeEmail {
  const chave = env.RESEND_API_KEY?.trim()
  const remetente = env.EMAIL_REMETENTE?.trim() || REMETENTE_PADRAO

  if (chave) return criarResend(chave, remetente)
  return criarRegistroLocal(['RESEND_API_KEY'])
}

/** Atalho para quem só quer mandar e seguir a vida. */
export async function enviarEmail(m: MensagemDeEmail): Promise<ResultadoDeEnvio> {
  return provedorDeEmail().enviar(m)
}
