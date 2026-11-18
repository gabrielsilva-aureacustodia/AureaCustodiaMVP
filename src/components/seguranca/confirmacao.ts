/* ============================================================================
 * CONTRATO ENTRE A AÇÃO DO SERVIDOR E O MODAL DE CONFIRMAÇÃO — sem `server-only`
 * de propósito.
 *
 * Este arquivo só tem TIPOS e funções puras (sem React, sem I/O), para as duas pontas
 * falarem a mesma língua: o servidor (`src/server/auth/reautenticacao.ts`) devolve um
 * `BloqueioDeConfirmacao` quando a ação sensível ainda não tem a prova da senha, e
 * o cliente (`ModalConfirmarSenha`, `useConfirmarSenha`) reconhece esse formato e
 * abre o modal. Nada daqui carrega segredo, e por isso o Client Component pode
 * importá-lo sem puxar `@/server/*` para o navegador.
 *
 * POR QUE NÃO UM CAMPO NOVO EM `ActionResult`. `src/domain/types.ts` é superfície
 * protegida. O bloqueio é um subtipo estrutural de `ActionResult` (`ok: false` e
 * `error` opcional), então toda ação que devolve `ActionResult<T>` pode devolvê-lo
 * sem mudar o contrato do domínio.
 * ==========================================================================*/

import type { ActionResult } from '@/domain/types'

/**
 * `sempre`: a confirmação vale para UMA ação (saque, troca de senha, e-mail, Pix e
 * dados, retirada de moeda). `janela`: vale por alguns minutos (compra e venda) —
 * a duração está em `src/server/auth/reautenticacao-config.ts`.
 */
export type NivelDeConfirmacao = 'sempre' | 'janela'

/**
 * `senha`: a conta tem senha. `codigo`: a conta só entra com Google, não há senha
 * para pedir, e a confirmação é um código de 6 dígitos enviado ao e-mail.
 */
export type MetodoDeConfirmacao = 'senha' | 'codigo'

/**
 * O que a guarda devolve no lugar da ação quando falta a confirmação (ou, no caso
 * da sessão vencida, quando nem há quem confirmar).
 */
export interface BloqueioDeConfirmacao {
  ok: false
  /** Só preenchido quando NÃO dá para confirmar (sessão vencida); o toast mostra. */
  error?: string
  /** `true` quando o modal deve abrir. Ausente na sessão vencida. */
  precisaSenha?: true
  nivel?: NivelDeConfirmacao
  metodo?: MetodoDeConfirmacao
}

/** Reconhece o pedido de confirmação na resposta de qualquer ação. */
export function pedeConfirmacao(
  res: unknown,
): res is BloqueioDeConfirmacao & { precisaSenha: true; nivel: NivelDeConfirmacao; metodo: MetodoDeConfirmacao } {
  if (typeof res !== 'object' || res === null) return false
  const r = res as Record<string, unknown>
  return (
    r.ok === false &&
    r.precisaSenha === true &&
    (r.nivel === 'sempre' || r.nivel === 'janela') &&
    (r.metodo === 'senha' || r.metodo === 'codigo')
  )
}

/**
 * Texto para a ação que continua pedindo confirmação DEPOIS de a pessoa ter confirmado
 * (cookie recusado pelo navegador, por exemplo). Em vez de abrir o diálogo em laço, a
 * tela avisa.
 */
export const CONFIRMACAO_NAO_RECONHECIDA = 'Não foi possível confirmar a sua identidade. Tente novamente.'

/**
 * O laço "chama a ação → pede a confirmação → chama de novo", sem React, para ser
 * testável sozinho. `perguntar` abre o diálogo e devolve `true` se a pessoa confirmou e
 * `false` se desistiu.
 *
 *  - ação que não pede confirmação (sucesso, erro de regra, sessão vencida): o resultado
 *    dela passa direto, e `perguntar` nem é chamada;
 *  - a pessoa desiste: `{ ok:false }` SEM texto, e a ação não é chamada de novo — nenhuma
 *    tela abre aviso de falha para uma desistência;
 *  - a pessoa confirma: a MESMA ação é chamada UMA vez mais; o resultado dessa chamada é o
 *    final. Se ela ainda pedir confirmação, devolve o erro acima (nunca um segundo diálogo).
 */
export async function executarComConfirmacao<T>(
  acao: () => Promise<ActionResult<T>>,
  perguntar: (nivel: NivelDeConfirmacao, metodo: MetodoDeConfirmacao) => Promise<boolean>,
): Promise<ActionResult<T>> {
  const primeira = await acao()
  if (!pedeConfirmacao(primeira)) return primeira

  const confirmou = await perguntar(primeira.nivel, primeira.metodo)
  if (!confirmou) return { ok: false }

  const segunda = await acao()
  if (pedeConfirmacao(segunda)) return { ok: false, error: CONFIRMACAO_NAO_RECONHECIDA }
  return segunda
}
