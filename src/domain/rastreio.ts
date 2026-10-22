/**
 * DOMÍNIO — Validação do código de rastreio dos Correios.
 *
 * Existe desde 21/09/2026, quando o Gabriel perguntou se o código que o site
 * mostrava era real. Não era: `markPosted` gravava
 * `'BR' + Math.random() + 'BR'` e respondia "Código de rastreio gerado", e a
 * etiqueta imprimia um segundo código inventado, em outro formato
 * (`SL`/`PB` + 9 dígitos + `BR`). Os dois passavam pelo olho como rastreio de
 * verdade e nenhum dos dois existe nos Correios: colado no site deles, dá
 * objeto não encontrado.
 *
 * Emitir código real exige contrato com os Correios e a API de pré-postagem
 * (CWS), que o projeto ainda não tem. Então o sistema parou de fabricar: quem
 * posta no balcão recebe o código impresso no comprovante e o digita aqui. É
 * exatamente como a RETIRADA já funcionava — `avancarStatusRetirada` sempre
 * exigiu o código do operador e recusou a postagem sem ele.
 *
 * Módulo puro: sem I/O. A mesma validação roda na tela e na Server Action,
 * porque Server Action é endpoint HTTP e o formulário é só a porta educada.
 */

import type { EventoRastreio, StatusRastreioCorreios } from '@/lib/shipping/types'

import type { Envio, Retirada, StatusRetirada, Timestamp } from './types'

/**
 * Formato oficial SRO: duas letras, nove dígitos e o código do país.
 *
 * Aceita qualquer par de letras de propósito. Os prefixos dizem o serviço
 * (`SL`/`SM` SEDEX, `PB`/`PA` PAC, `OA`, `JT`, `NX`…) e os Correios criam
 * prefixo novo sem avisar ninguém — uma lista fechada recusaria objeto legítimo
 * no balcão, que é pior do que aceitar um código malformado.
 *
 * O sufixo `BR` é exigido: objeto postado no Brasil termina em BR, e sem essa
 * âncora o padrão passaria a aceitar quase qualquer coisa.
 */
export const PADRAO_RASTREIO_SRO = /^[A-Z]{2}\d{9}BR$/

/** Mensagem única, para a tela e o servidor dizerem a mesma coisa. */
export const RASTREIO_INVALIDO =
  'Código de rastreio inválido. Ele tem 13 caracteres, no formato AA123456789BR, e está impresso no comprovante que os Correios entregam na postagem.'

/**
 * Tira espaços, hífens e pontos e passa para maiúsculas.
 *
 * O comprovante dos Correios imprime o código em grupos (`SL 123 456 789 BR`) e
 * é assim que a pessoa digita. Recusar por causa do espaço seria implicância
 * com quem está com o papel na mão.
 */
export function normalizarRastreio(codigo: string): string {
  return codigo.replace(/[\s.-]/g, '').toUpperCase()
}

/** true quando o código tem o formato de um objeto postado no Brasil. */
export function rastreioValido(codigo: string): boolean {
  return PADRAO_RASTREIO_SRO.test(normalizarRastreio(codigo))
}

/* ===========================================================================
 * Status do rastreio e o avanço automático (22/10/2026, contrato com os Correios)
 *
 * Com o contrato, o código de rastreio nasce na pré-postagem — antes de o cliente ir à agência.
 * Por isso "tem código" deixou de querer dizer "foi postado": o objeto existe nos Correios desde a
 * etiqueta (evento FC/82, "aguardando postagem"), e só passa a estar COM eles quando a agência o
 * recebe. As funções abaixo dizem, a partir do retrato do SRO, quando isso aconteceu. Quem grava é
 * o job (`src/server/shipping/rastreios.ts`); aqui fica só a regra, pura, para a tela e o teste.
 * ========================================================================= */

/**
 * O texto em português de cada status. `Record` sobre a união inteira de propósito: se a fundação
 * ganhar um status novo, o typecheck aponta aqui antes de a tela mostrar `aguardando_postagem` cru.
 */
export const ROTULO_STATUS_RASTREIO: Readonly<Record<StatusRastreioCorreios, string>> = {
  postado: 'Objeto postado',
  em_transito: 'Em trânsito',
  saiu_para_entrega: 'Saiu para entrega',
  entregue: 'Entregue',
  aguardando_retirada: 'Aguardando retirada na agência',
  devolvido: 'Devolvido ao remetente',
  extraviado: 'Extraviado',
  aguardando_postagem: 'Etiqueta emitida — aguardando postagem',
  cancelado: 'Etiqueta cancelada',
  indisponivel: 'Correios indisponíveis no momento',
  nao_encontrado: 'Objeto ainda não consta nos Correios',
}

/** O rótulo de um status vindo do banco (texto livre): status desconhecido volta como chegou. */
export function rotuloStatusRastreio(status: string): string {
  return (ROTULO_STATUS_RASTREIO as Record<string, string>)[status] ?? status
}

/**
 * A linha que a tela mostra para um retrato gravado.
 *
 * Em geral vale a frase dos Correios, que é mais específica ("Objeto em transferência — por favor
 * aguarde"). Os dois status da pré-postagem são a exceção: a frase do SRO para eles ("Etiqueta
 * emitida", "Pré-postagem cancelada") muda de redação e não diz ao cliente o que fazer, e o rótulo
 * combinado diz.
 */
export function textoDoRastreio(r: { statusAtual: string; etapaDescricao?: string | null }): string {
  if (r.statusAtual === 'aguardando_postagem' || r.statusAtual === 'cancelado') {
    return rotuloStatusRastreio(r.statusAtual)
  }
  return r.etapaDescricao?.trim() || rotuloStatusRastreio(r.statusAtual)
}

/**
 * Os status que provam que o objeto já está nas mãos dos Correios (acordo 3 do plano CWS).
 *
 * `devolvido` e `extraviado` ficam de fora de propósito: para chegar a eles o objeto passou por
 * `postado`, e o job já o teria avançado; vê-los num envio ainda em "Protocolo gerado" é caso
 * estranho que a equipe precisa olhar, não avanço automático.
 */
export const STATUS_OBJETO_COM_OS_CORREIOS: readonly StatusRastreioCorreios[] = [
  'postado',
  'em_transito',
  'saiu_para_entrega',
  'aguardando_retirada',
  'entregue',
]

export function objetoJaComOsCorreios(status: string): boolean {
  return (STATUS_OBJETO_COM_OS_CORREIOS as readonly string[]).includes(status)
}

/**
 * Quando o objeto foi postado: o evento MAIS ANTIGO que não seja da etiqueta (FC/82 aguardando
 * postagem, FC/84 cancelada). Não é a hora da consulta — o job roda uma vez por dia, e gravar a
 * hora do job como data de postagem atrasaria em até 24h o prazo que a logística mede.
 */
export function instanteDaPostagem(
  eventos: readonly Pick<EventoRastreio, 'dataHora' | 'status'>[],
): Timestamp | null {
  let primeiro: Timestamp | null = null
  for (const e of eventos) {
    if (e.status === 'aguardando_postagem' || e.status === 'cancelado') continue
    if (primeiro === null || e.dataHora < primeiro) primeiro = e.dataHora
  }
  return primeiro
}

/** Quando o objeto foi entregue: o evento de entrega mais antigo, ou `null`. */
export function instanteDaEntrega(
  eventos: readonly Pick<EventoRastreio, 'dataHora' | 'status'>[],
): Timestamp | null {
  let primeiro: Timestamp | null = null
  for (const e of eventos) {
    if (e.status !== 'entregue') continue
    if (primeiro === null || e.dataHora < primeiro) primeiro = e.dataHora
  }
  return primeiro
}

/** O que o job precisa do retrato para decidir um avanço. */
export interface RetratoParaAvanco {
  codigoRastreio: string
  statusAtual: string
  dataUltimaAtualizacao: Timestamp
  eventos: readonly Pick<EventoRastreio, 'dataHora' | 'status'>[]
}

function mesmoCodigo(a: string | null | undefined, b: string): boolean {
  return (a ?? '').trim().toUpperCase() === b.trim().toUpperCase()
}

/**
 * A data de postagem a gravar no envio, ou `null` se o envio não deve avançar.
 *
 * Só avança quem está em "Protocolo gerado", sem data de postagem, não desconsiderado e com o MESMO
 * código que foi consultado — o job confere tudo de novo dentro da mutação, porque entre a consulta
 * e a gravação o cliente pode ter mexido no envio. "Recebido pela custódia" nunca sai daqui: quem
 * confirma que a moeda chegou ao cofre é a equipe, e não o "entregue" dos Correios.
 */
export function postagemDoEnvioPeloRastreio(
  envio: Pick<Envio, 'etapaAtual' | 'dataPostagem' | 'codigoRastreio'> & { desconsideradoEm?: Timestamp | null },
  retrato: RetratoParaAvanco,
): Timestamp | null {
  if (envio.etapaAtual !== 'Protocolo gerado' || envio.dataPostagem !== null) return null
  if (envio.desconsideradoEm) return null
  if (!mesmoCodigo(envio.codigoRastreio, retrato.codigoRastreio)) return null
  if (!objetoJaComOsCorreios(retrato.statusAtual)) return null
  return instanteDaPostagem(retrato.eventos) ?? retrato.dataUltimaAtualizacao
}

/** Um passo da máquina de estados da retirada, com a hora que os Correios registraram. */
export interface AvancoDeRetirada {
  para: Extract<StatusRetirada, 'postada' | 'entregue'>
  data: Timestamp
}

/**
 * Os passos que a retirada deve dar pelo rastreio, na ordem — vazio se nenhum.
 *
 * `separacao` → `postada` na mesma condição do envio; `postada` → `entregue` quando os Correios
 * entregam. Se o job só enxergar o objeto já entregue (a postagem e a entrega caíram entre duas
 * rodadas diárias), devolve os dois passos: a máquina de estados não permite pular `postada`, e o
 * histórico fica com as duas datas reais.
 */
export function avancosDaRetiradaPeloRastreio(
  retirada: Pick<Retirada, 'status' | 'codigoRastreio'>,
  retrato: RetratoParaAvanco,
): AvancoDeRetirada[] {
  if (!mesmoCodigo(retirada.codigoRastreio, retrato.codigoRastreio)) return []
  if (!objetoJaComOsCorreios(retrato.statusAtual)) return []
  const entregue = retrato.statusAtual === 'entregue'
  const dataEntrega = instanteDaEntrega(retrato.eventos) ?? retrato.dataUltimaAtualizacao
  const passos: AvancoDeRetirada[] = []
  if (retirada.status === 'separacao') {
    // O evento mais antigo fora da etiqueta nunca é posterior ao de entrega: as datas saem em ordem.
    passos.push({ para: 'postada', data: instanteDaPostagem(retrato.eventos) ?? retrato.dataUltimaAtualizacao })
  }
  if ((retirada.status === 'separacao' || retirada.status === 'postada') && entregue) {
    passos.push({ para: 'entregue', data: dataEntrega })
  }
  return passos
}
