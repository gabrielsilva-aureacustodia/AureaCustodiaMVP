/**
 * O catálogo da D7 — a TABELA que diz quais movimentações viram e-mail e quando o cliente pode desligá-los.
 *
 * Mudar a lista de eventos, ou trocar um aviso de "sempre" para "respeita a preferência", é editar UMA linha
 * aqui. Nenhuma outra parte do módulo decide isso.
 *
 * A PREFERÊNCIA DO CLIENTE (`toggleNotif`, conta/configurações) tem três chaves: `notifEnvios` ("Atualizações
 * de envios e custódia"), `notifNegociacoes` ("Negociações e ofertas") e `notifNovidades` (marketing, fora
 * desta frente). Regra do aceite: compra, venda, saque e segurança saem SEMPRE; os avisos opcionais respeitam
 * a chave. O depósito foi decidido "sempre" (17/11/2026): é dinheiro entrando na conta, e quem pagou um Pix e
 * não vê aviso fica na pior dúvida do produto — nenhuma das duas chaves descreve isso. Para mudar, a linha
 * `deposito` passa a `{ sempre: false, preferencia: 'notifNegociacoes' }`.
 */

import type { UserSettings } from '@/domain/types'

import type { TipoCobertoPorOutroModulo, TipoDeEmail } from './tipos'

export type ChaveDePreferencia = 'notifEnvios' | 'notifNegociacoes'

export interface RegraDoEmail {
  /** Sai mesmo que o cliente tenha desligado os avisos. */
  sempre: boolean
  /** Qual chave de `settings` governa o aviso, quando ele não é "sempre". */
  preferencia: ChaveDePreferencia | null
  /** Uma frase para a equipe — é o que a tabela diz em voz alta. */
  descricao: string
}

export const CATALOGO: Readonly<Record<TipoDeEmail, RegraDoEmail>> = {
  compra: { sempre: true, preferencia: null, descricao: 'Compra concluída (comprador)' },
  venda: { sempre: true, preferencia: null, descricao: 'Venda concluída (vendedor)' },
  deposito: { sempre: true, preferencia: null, descricao: 'Depósito em conta confirmado' },
  envio_postado: { sempre: false, preferencia: 'notifEnvios', descricao: 'Envio para a custódia postado nos Correios' },
  envio_recebido: { sempre: false, preferencia: 'notifEnvios', descricao: 'Envio recebido pela custódia' },
  moeda_aceita: { sempre: false, preferencia: 'notifEnvios', descricao: 'Moeda aprovada na análise' },
  moeda_recusada: { sempre: false, preferencia: 'notifEnvios', descricao: 'Moeda não aprovada na análise' },
  fatura_paga: { sempre: false, preferencia: 'notifEnvios', descricao: 'Fatura de custódia paga' },
  retirada_postada: { sempre: false, preferencia: 'notifEnvios', descricao: 'Retirada de moeda postada' },
  seguranca_senha: { sempre: true, preferencia: null, descricao: 'Senha alterada' },
  seguranca_email: { sempre: true, preferencia: null, descricao: 'E-mail da conta alterado' },
  seguranca_pix: { sempre: true, preferencia: null, descricao: 'Chave Pix alterada' },
}

/**
 * Os e-mails que a central NÃO dispara porque outro módulo já cobre (decisão do Controle, 17/11/2026).
 * Um teste confere que a derivação não emite nada para eles — ninguém duplica o saque sem querer.
 */
export const COBERTOS_POR_OUTRO_MODULO: Readonly<Record<TipoCobertoPorOutroModulo, string>> = {
  saque_pedido: 'src/server/saques/avisos.ts',
  saque_pago: 'src/server/saques/avisos.ts',
  saque_recusado: 'src/server/saques/avisos.ts',
}

/**
 * O cliente quer este e-mail?
 *
 * `settings` ausente (conta antiga, sem a tela de preferências aberta) vale como o padrão do produto:
 * avisos de envio ligados — o mesmo default de `src/domain/selectors.ts`.
 */
export function deveEnviar(tipo: TipoDeEmail, settings: UserSettings | undefined): boolean {
  const regra = CATALOGO[tipo]
  if (regra.sempre || regra.preferencia === null) return true
  return settings?.[regra.preferencia] ?? true
}
