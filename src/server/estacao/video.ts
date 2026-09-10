/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Lê SUPABASE_SERVICE_ROLE_KEY, que dá acesso total ao projeto Supabase. Ela
 * NUNCA sai daqui: o que a bancada recebe é uma URL já assinada, válida para
 * um caminho só. Não importe de Client Component.
 * ==========================================================================*/

import 'server-only'

import { createClient } from '@supabase/supabase-js'

/**
 * A URL assinada de upload do vídeo da análise.
 *
 * POR QUE O VÍDEO NÃO SOBE PELA ROTA DA APLICAÇÃO
 * ----------------------------------------------
 * A Vercel recusa qualquer requisição com corpo acima de 4,5 MB. Um vídeo de
 * análise passa disso com folga, e a falha não se parece com a causa: a rota
 * devolve erro genérico e o operador conclui que "o sistema não salvou". O
 * caminho é o servidor assinar uma URL, a bancada subir DIRETO para o
 * armazenamento, e o servidor receber depois só o caminho do arquivo.
 *
 * Isto é a decisão D6, de 01/09/2026: Supabase Storage.
 */

const BUCKET_PADRAO = 'analises'

export class VideoNaoConfigurado extends Error {
  constructor(public readonly faltando: string[]) {
    super(`Upload de vídeo não configurado: falta ${faltando.join(', ')}.`)
    this.name = 'VideoNaoConfigurado'
  }
}

function configuracao(): { url: string; serviceKey: string; bucket: string } {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const faltando: string[] = []
  if (!url) faltando.push('SUPABASE_URL')
  if (!serviceKey) faltando.push('SUPABASE_SERVICE_ROLE_KEY')
  if (faltando.length > 0) throw new VideoNaoConfigurado(faltando)
  return {
    url: url as string,
    serviceKey: serviceKey as string,
    bucket: process.env.SUPABASE_STORAGE_BUCKET ?? BUCKET_PADRAO,
  }
}

export function videoConfigurado(): boolean {
  try {
    configuracao()
    return true
  } catch {
    return false
  }
}

/**
 * O caminho do arquivo dentro do balde.
 *
 * Organizado por PROTOCOLO DE ENVIO e não por nome de cliente: cliente muda de
 * nome, moeda troca de dono, código não muda (item E.7). O nome do arquivo é
 * saneado porque ele vem do programa da bancada — barra, `..` e acento viram
 * traço antes de virar caminho.
 */
export function caminhoDoVideo(protocoloEnvio: string, nomeArquivo: string): string {
  const sanear = (s: string): string =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/^[.-]+/, '')
      .slice(0, 120)
  const pasta = sanear(protocoloEnvio) || 'sem-protocolo'
  const arquivo = sanear(nomeArquivo) || `${Date.now()}.webm`
  return `${pasta}/${arquivo}`
}

export interface UrlDeUpload {
  /**
   * URL completa para onde a bancada envia o arquivo, com `?token=…` já dentro.
   *
   * A bancada faz `PUT` nela **sem cabeçalho de autorização**: a razão de existir
   * de uma URL assinada é o uploader não precisar de credencial. Mandar o token
   * como `Authorization: Bearer` faz o Storage tentar lê-lo como JWT e recusar.
   */
  url: string
  /** O mesmo token que já está na URL. Exposto só para diagnóstico. */
  token: string
  /** O caminho gravado na análise: 'RO-ENV-0001/RO-ENV-0001-1.webm'. */
  caminho: string
  bucket: string
}

/**
 * Assina a URL. O balde precisa existir e ser PRIVADO — vídeo de custódia
 * carrega a mesa, as mãos do operador e, se o ritual de bancada falhar, a
 * etiqueta com o endereço do cliente. Balde público aqui é incidente de LGPD,
 * não configuração inconveniente.
 */
export async function urlDeUploadDeVideo(
  protocoloEnvio: string,
  nomeArquivo: string,
): Promise<UrlDeUpload> {
  const { url, serviceKey, bucket } = configuracao()
  const caminho = caminhoDoVideo(protocoloEnvio, nomeArquivo)

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(caminho)
  if (error || !data) {
    throw new Error(error?.message ?? 'O Supabase não devolveu a URL assinada.')
  }

  return {
    // `signedUrl` vem relativo em algumas versões do SDK; resolver contra a URL
    // do projeto deixa a bancada com um endereço absoluto em qualquer uma.
    url: new URL(data.signedUrl, url).toString(),
    token: data.token,
    caminho,
    bucket,
  }
}
