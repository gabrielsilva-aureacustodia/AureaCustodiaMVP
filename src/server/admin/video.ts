/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Lê SUPABASE_SERVICE_ROLE_KEY para assinar a leitura de um vídeo de análise no
 * Storage. A chave nunca sai daqui: o navegador recebe uma URL que vale para UM
 * arquivo, por poucos minutos. Não importe de Client Component.
 * ==========================================================================*/

import 'server-only'

import { createClient } from '@supabase/supabase-js'

import { VideoNaoConfigurado, urlDeUploadDeVideo, videoConfigurado } from '@/server/estacao/video'

/**
 * O vídeo da análise, para a auditoria de moedas assistir.
 *
 * POR QUE UMA URL ASSINADA E CURTA. O balde `analises` é privado de propósito — o vídeo mostra a
 * mesa, as mãos do operador e, se o ritual falhar, a etiqueta com o endereço do cliente
 * (src/server/estacao/video.ts). Tornar o balde público para o painel assistir seria o incidente
 * de LGPD que aquele arquivo evita. Dez minutos bastam para abrir o vídeo; o link copiado e
 * esquecido num chat deixa de valer sozinho.
 *
 * O upload continua sendo o de src/server/estacao/video.ts — este arquivo só reexporta, para a
 * bancada web não duplicar a assinatura.
 */

const VALIDADE_S = 600
const BUCKET_PADRAO = 'analises'

export { VideoNaoConfigurado, urlDeUploadDeVideo, videoConfigurado }

export function variaveisDoVideoFaltando(): string[] {
  const faltando: string[] = []
  if (!(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)) faltando.push('SUPABASE_URL')
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) faltando.push('SUPABASE_SERVICE_ROLE_KEY')
  return faltando
}

/** Caminho gravado na análise → URL de leitura que vale por dez minutos. */
export async function urlDeLeituraDoVideo(caminho: string): Promise<string> {
  const faltando = variaveisDoVideoFaltando()
  if (faltando.length > 0) throw new VideoNaoConfigurado(faltando)
  const url = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) as string
  const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? BUCKET_PADRAO
  // A estação grava o caminho sem o balde ("RO-ENV-0001/RO-ENV-0001-2.webm"); o exemplo do
  // contrato traz "analises/…". Os dois formatos abrem.
  const dentroDoBalde = caminho.startsWith(`${bucket}/`) ? caminho.slice(bucket.length + 1) : caminho
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(dentroDoBalde, VALIDADE_S)
  if (error || !data) throw new Error(error?.message ?? 'O Supabase não devolveu a URL de leitura.')
  return new URL(data.signedUrl, url).toString()
}
