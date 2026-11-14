/**
 * Contrato dos eventos do Pixel da Meta — o que o navegador e o servidor precisam combinar entre si.
 *
 * Vive em `src/lib/` porque é importado dos dois lados (Client Component e Server Action) e não tem segredo nem I/O.
 * O segredo da API de Conversões (`META_CAPI_ACCESS_TOKEN`) mora só em `src/server/meta/`.
 *
 * POR QUE O MESMO EVENTO CHEGA PELOS DOIS CAMINHOS. A Meta recebe o evento pelo navegador (Pixel) e pelo servidor (API
 * de Conversões) e só conta UM, desde que o `eventID` do navegador seja igual ao `event_id` do servidor e os nomes
 * batam (janela de 48 h, developers.facebook.com/docs/marketing-api/conversions-api/parameters/server-event). O
 * servidor cobre o que o navegador perde: bloqueador de anúncios, Safari/ITP, aba fechada antes de o script rodar.
 * O `eventID` nasce no servidor e vai ao navegador junto da resposta — nunca o contrário —, para que o par exista
 * mesmo que o navegador nunca chegue a disparar.
 */

/** Nome do cookie curto que carrega um evento do servidor até o navegador (cadastro pelo Google, que sai do site e volta). */
export const COOKIE_EVENTO_PENDENTE = 'ro_meta_evt'

/**
 * Eventos padrão da Meta usados aqui. Só os que a documentação lista (developers.facebook.com/docs/meta-pixel/reference);
 * a Meta otimiza e mede pelos nomes padrão, e um nome fora da lista vira evento "personalizado".
 */
export type EventoPadrao = 'PageView' | 'CompleteRegistration'

/**
 * Eventos personalizados — descrevem o funil do Real Olímpico e não têm equivalente padrão.
 *  - `CliqueCriarConta`: clique em qualquer botão que leva a /cadastrar (a Meta não tem "início de cadastro").
 */
export type EventoPersonalizado = 'CliqueCriarConta'

/** Como a conta nasceu — vai em `content_name` do CompleteRegistration, para separar os dois caminhos no relatório. */
export type MetodoDeCadastro = 'cadastro_email' | 'cadastro_google'

export type ParametrosDoEvento = Record<string, string | number | boolean>

/** Parâmetros do CompleteRegistration. `status: true` é o campo oficial do evento; `value` fica de fora de propósito. */
export function parametrosDoCadastro(metodo: MetodoDeCadastro): ParametrosDoEvento {
  return { status: true, content_name: metodo }
}

/** Identificador único do evento, para deduplicar o Pixel contra a API de Conversões. */
export function novoEventId(): string {
  return crypto.randomUUID()
}

/**
 * Devolve o ID do Pixel só se for um número de verdade. O valor é interpolado dentro de um <script> inline e de uma URL
 * de <noscript>; aceitar texto livre ali seria abrir uma porta de injeção por variável de ambiente.
 */
export function lerPixelId(valor: string | undefined | null): string | null {
  const limpo = (valor ?? '').trim()
  return /^\d{8,20}$/.test(limpo) ? limpo : null
}

/** Evento que o servidor deixou no cookie para o navegador disparar (formato `Nome.eventId.metodo`). */
export interface EventoPendente {
  nome: 'CompleteRegistration'
  eventId: string
  metodo: MetodoDeCadastro
}

export function serializarEventoPendente(e: EventoPendente): string {
  return `${e.nome}.${e.eventId}.${e.metodo}`
}

export function lerEventoPendente(valor: string | undefined | null): EventoPendente | null {
  if (!valor) return null
  const [nome, eventId, metodo] = valor.split('.')
  if (nome !== 'CompleteRegistration') return null
  if (!eventId || !/^[A-Za-z0-9-]{8,64}$/.test(eventId)) return null
  if (metodo !== 'cadastro_email' && metodo !== 'cadastro_google') return null
  return { nome, eventId, metodo }
}
