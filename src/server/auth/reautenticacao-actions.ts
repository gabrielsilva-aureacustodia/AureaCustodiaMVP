'use server'

/**
 * Server Actions do modal de confirmação (`ModalConfirmarSenha`). São as TRÊS únicas
 * portas que o navegador tem para a confirmação; a regra inteira mora em
 * `./reautenticacao`, que não tem 'use server' (todo export de um arquivo 'use server'
 * é um endpoint, e a guarda `exigirReautenticacao` não pode ser um).
 *
 * O arquivo só valida o que veio da rede — `nivel` é texto livre para quem chama a
 * ação por fora — e repassa. Quem decide o método (senha ou código) é o servidor, em
 * `metodoDeConfirmacao`; o cliente nunca o informa.
 */

import type { NivelDeConfirmacao } from '@/components/seguranca/confirmacao'
import type { ActionResult } from '@/domain/types'

import {
  confirmarComCodigo,
  confirmarComSenha,
  enviarCodigoPorEmail,
} from './reautenticacao'

function nivelValido(nivel: unknown): nivel is NivelDeConfirmacao {
  return nivel === 'sempre' || nivel === 'janela'
}

const NIVEL_INVALIDO = 'Pedido de confirmação inválido.'

/** Confere a senha da conta logada e emite a prova do nível pedido. */
export async function confirmarSenhaAction(senha: string, nivel: NivelDeConfirmacao): Promise<ActionResult> {
  if (!nivelValido(nivel)) return { ok: false, error: NIVEL_INVALIDO }
  return confirmarComSenha(senha, nivel)
}

/** Pede o código de 6 dígitos por e-mail (conta que só entra com Google). */
export async function pedirCodigoPorEmailAction(): Promise<ActionResult<{ reenvioEmMs: number }>> {
  return enviarCodigoPorEmail()
}

/** Confere o código recebido por e-mail e emite a prova do nível pedido. */
export async function confirmarCodigoAction(codigo: string, nivel: NivelDeConfirmacao): Promise<ActionResult> {
  if (!nivelValido(nivel)) return { ok: false, error: NIVEL_INVALIDO }
  return confirmarComCodigo(codigo, nivel)
}
