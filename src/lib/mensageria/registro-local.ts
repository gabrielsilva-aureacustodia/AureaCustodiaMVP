/**
 * O adaptador de registro local — o "provedor" de quando nenhum WhatsApp está conectado.
 *
 * POR QUE ELE EXISTE. O plano manda a tela funcionar sem credencial nenhuma (plano do
 * Admin, seção 2.3: "nenhuma tela quebra por falta de credencial"), e o provedor ainda não
 * foi escolhido. Com ele, a caixa de conversas abre, mostra o histórico, recebe nota,
 * etiqueta e responsável — e a resposta digitada fica GRAVADA no painel, com o estado
 * 'registrada', que a tela descreve como "só no painel". Ela não chega ao cliente, e o
 * painel não finge que chegou.
 *
 * Não recebe webhook: sem provedor, não há quem mande evento. `conferirAssinatura` recusa
 * tudo, e a rota responde que nenhum provedor está configurado.
 */

import { randomUUID } from 'node:crypto'

import type { ProvedorMensageria } from './tipos'

export const NOME_REGISTRO_LOCAL = 'registro-local'

export function criarRegistroLocal(pendencias: readonly string[]): ProvedorMensageria {
  // O id tem prefixo próprio e é único: `cs_mensagens.id_no_provedor` é UNIQUE, e um id
  // local nunca pode colidir com um id de verdade que chegue depois pelo webhook.
  const registrar = async () => ({ idNoProvedor: `local:${randomUUID()}` })
  return {
    nome: NOME_REGISTRO_LOCAL,
    identificador: 'local',
    entregaDeVerdade: false,
    pendencias,
    enviarTexto: registrar,
    enviarMidia: registrar,
    conferirAssinatura: () => false,
    normalizarEvento: () => [],
  }
}
