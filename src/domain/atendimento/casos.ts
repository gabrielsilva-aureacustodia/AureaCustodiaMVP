/**
 * As regras dos casos de atendimento — o que o servidor aceita e como o estado anda, sem I/O.
 *
 * O ESTADO É DECIDIDO AQUI, NÃO NA TELA. Quem responde "o caso fica como?" depois de cada gesto é
 * `estadoDepoisDe`: mensagem do cliente devolve o caso a `aberto` (a equipe precisa ver), resposta
 * da equipe tira de `aberto` para `em_andamento`, e `resolvido`/`nao_resolvido` só saem de um gesto
 * explícito da equipe. O contador do menu do painel conta `aberto`.
 */

export type TipoDeCaso = 'duvida' | 'pedido' | 'reclamacao' | 'erro'
export type EstadoDoCaso = 'aberto' | 'em_andamento' | 'resolvido' | 'nao_resolvido'
export type AutorDaMensagem = 'cliente' | 'equipe'

export const TIPOS_DE_CASO: ReadonlyArray<{ chave: TipoDeCaso; rotulo: string }> = [
  { chave: 'duvida', rotulo: 'Dúvida' },
  { chave: 'pedido', rotulo: 'Pedido' },
  { chave: 'reclamacao', rotulo: 'Reclamação' },
  { chave: 'erro', rotulo: 'Erro na plataforma' },
]

export const ESTADOS_DE_CASO: ReadonlyArray<{ chave: EstadoDoCaso; rotulo: string }> = [
  { chave: 'aberto', rotulo: 'Aberto' },
  { chave: 'em_andamento', rotulo: 'Em andamento' },
  { chave: 'resolvido', rotulo: 'Resolvido' },
  { chave: 'nao_resolvido', rotulo: 'Não resolvido' },
]

export const LIMITE_TEXTO = 4000
export const LIMITE_TITULO = 80
export const LIMITE_ANEXO_BYTES = 2 * 1024 * 1024
export const MIMES_DE_ANEXO = ['image/png', 'image/jpeg', 'image/webp'] as const
export type MimeDeAnexo = (typeof MIMES_DE_ANEXO)[number]

export function ehTipoDeCaso(x: unknown): x is TipoDeCaso {
  return TIPOS_DE_CASO.some((t) => t.chave === x)
}

export function ehEstadoDeCaso(x: unknown): x is EstadoDoCaso {
  return ESTADOS_DE_CASO.some((e) => e.chave === x)
}

export function rotuloDoTipo(t: TipoDeCaso): string {
  return TIPOS_DE_CASO.find((x) => x.chave === t)?.rotulo ?? t
}

export function rotuloDoEstado(e: EstadoDoCaso): string {
  return ESTADOS_DE_CASO.find((x) => x.chave === e)?.rotulo ?? e
}

/** Caso encerrado pela equipe (resolvido ou não): o cliente ainda pode escrever, e isso o reabre. */
export function estaEncerrado(e: EstadoDoCaso): boolean {
  return e === 'resolvido' || e === 'nao_resolvido'
}

export type Gesto = 'cliente_escreveu' | 'equipe_respondeu' | 'marcar_resolvido' | 'marcar_nao_resolvido' | 'reabrir'

/** O estado do caso depois de um gesto. Gestos da equipe sobre caso já encerrado só valem por `reabrir`. */
export function estadoDepoisDe(atual: EstadoDoCaso, gesto: Gesto): EstadoDoCaso {
  switch (gesto) {
    case 'cliente_escreveu':
      return 'aberto'
    case 'equipe_respondeu':
      // Responder a um caso encerrado não o reabre às escondidas: continua como a equipe o deixou.
      return atual === 'aberto' ? 'em_andamento' : atual
    case 'marcar_resolvido':
      return 'resolvido'
    case 'marcar_nao_resolvido':
      return 'nao_resolvido'
    case 'reabrir':
      return 'em_andamento'
  }
}

/** Só o caminho da rota: sem domínio, sem consulta (pode ter e-mail ou código) e sem fragmento. */
export function paginaDeOrigemSegura(bruto: unknown): string | null {
  if (typeof bruto !== 'string') return null
  const semResto = bruto.split(/[?#]/)[0]?.trim() ?? ''
  if (!semResto.startsWith('/') || semResto.startsWith('//')) return null
  return semResto.slice(0, 200)
}

export function tituloDoRelato(texto: string): string {
  const linha = texto.replace(/\s+/g, ' ').trim()
  return linha.length <= LIMITE_TITULO ? linha : `${linha.slice(0, LIMITE_TITULO - 1).trimEnd()}…`
}

export type ValidacaoDeCaso<T> = { ok: true; valor: T } | { ok: false; erro: string }

export function validarTexto(bruto: unknown): ValidacaoDeCaso<string> {
  if (typeof bruto !== 'string') return { ok: false, erro: 'Escreva a mensagem.' }
  const texto = bruto.trim()
  if (!texto) return { ok: false, erro: 'Escreva a mensagem.' }
  if (texto.length > LIMITE_TEXTO) return { ok: false, erro: `A mensagem passa de ${LIMITE_TEXTO} caracteres.` }
  return { ok: true, valor: texto }
}

export interface AnexoRecebido {
  nome: string
  tipoMime: MimeDeAnexo
  bytes: Uint8Array
}

/** Confere o tipo declarado E a assinatura dos primeiros bytes: o tipo declarado pelo navegador é só uma alegação. */
export function mimeDaAssinatura(b: Uint8Array): MimeDeAnexo | null {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp'
  return null
}

export function validarAnexo(nome: string, bytes: Uint8Array): ValidacaoDeCaso<AnexoRecebido> {
  if (bytes.length === 0) return { ok: false, erro: 'A imagem está vazia.' }
  if (bytes.length > LIMITE_ANEXO_BYTES) return { ok: false, erro: 'A imagem passa de 2 MB.' }
  const mime = mimeDaAssinatura(bytes)
  if (!mime) return { ok: false, erro: 'Envie uma imagem PNG, JPEG ou WebP.' }
  const limpo = nome.replace(/[^\w.\- ]+/g, '').slice(0, 80) || 'imagem'
  return { ok: true, valor: { nome: limpo, tipoMime: mime, bytes } }
}

/* ---------- filtro da lista da equipe ---------- */

export interface FiltroDeCasos {
  estado: EstadoDoCaso | 'todos'
  tipo: TipoDeCaso | 'todos'
  busca: string
}

export const FILTRO_DE_CASOS_PADRAO: FiltroDeCasos = { estado: 'todos', tipo: 'todos', busca: '' }

export function lerFiltroDeCasos(params: Record<string, string | string[] | undefined>): FiltroDeCasos {
  const um = (v: string | string[] | undefined): string => (Array.isArray(v) ? (v[0] ?? '') : (v ?? ''))
  const estado = um(params.estado)
  const tipo = um(params.tipo)
  return {
    estado: ehEstadoDeCaso(estado) ? estado : 'todos',
    tipo: ehTipoDeCaso(tipo) ? tipo : 'todos',
    busca: um(params.q).trim().slice(0, 80),
  }
}
