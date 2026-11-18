'use server'

/**
 * Server Actions das NOTAS FISCAIS do cliente (frente G, 18/11/2026 — "Notas fiscais" em Minha conta).
 *
 * Só LEITURA, e só do dono: as duas ações tiram o e-mail da SESSÃO (`getSessionEmail`) e o entregam à
 * consulta, que filtra por ele dentro do `WHERE` (`src/server/nfse/consulta.ts`). O navegador não manda
 * e-mail nenhum — só o id da nota e o formato —, então não há parâmetro que dê para trocar pelo de outra
 * conta. O XML traz CPF, nome e endereço do tomador: a conta A nunca recebe o da conta B.
 *
 * Emitir, reemitir, corrigir ou cancelar nota NÃO mora aqui (emissão é de `src/server/nfse/emissao.ts`;
 * cancelamento, da frente H). Esta ação nunca escreve.
 *
 * O PDF é montado no NAVEGADOR (jsPDF, como o recibo): a ação devolve os campos já lidos do XML. Os dois
 * formatos saem pela mesma ação para a regra "só o dono" existir num lugar só.
 */

import { formatoDeNotaValido, type FormatoDeNota, type NotaDoCliente } from '@/domain/nfse/notas-do-cliente'
import { lerDadosDaNota, type DadosDaNotaXml } from '@/domain/nfse/xml-da-nota'
import type { ActionResult } from '@/domain/types'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { listarNotasDoDono, notaDoDonoComXml } from '@/server/nfse/consulta'
import { getSessionEmail } from '@/server/session'

const SESSAO_EXPIRADA = 'Sessão expirada.'
const SEM_ARQUIVO = 'Esta nota ainda não tem arquivo para baixar.'
const FALHA = 'Não foi possível carregar as notas agora. Tente novamente em instantes.'

export type ArquivoDaNota =
  | { formato: 'xml'; nome: string; xml: string }
  | { formato: 'pdf'; nome: string; nota: NotaDoCliente; dados: DadosDaNotaXml }

/** As notas (e pedidos de nota) da conta logada, da mais recente para a mais antiga. */
export async function listarMinhasNotas(): Promise<ActionResult<NotaDoCliente[]>> {
  const sessao = await getSessionEmail()
  if (!sessao) return { ok: false, error: SESSAO_EXPIRADA }
  // Sem Postgres (desenvolvimento em memória) a fila de notas não existe: lista vazia, sem erro.
  if (!bancoConfigurado()) return { ok: true, data: [] }
  try {
    const notas = await executarNoBanco((tx) => listarNotasDoDono(tx, sessao), { somenteLeitura: true })
    return { ok: true, data: notas }
  } catch (err) {
    console.error('[notas] falha ao listar as notas do cliente:', err)
    return { ok: false, error: FALHA }
  }
}

/**
 * O arquivo de UMA nota da conta logada: o XML (documento fiscal oficial) ou os campos para montar o PDF.
 * Nota de outra conta e id que não existe respondem igual — o mesmo texto, sem pista.
 */
export async function baixarMinhaNota(id: number, formato: FormatoDeNota): Promise<ActionResult<ArquivoDaNota>> {
  const sessao = await getSessionEmail()
  if (!sessao) return { ok: false, error: SESSAO_EXPIRADA }
  if (!formatoDeNotaValido(formato)) return { ok: false, error: 'Formato inválido.' }
  if (!bancoConfigurado()) return { ok: false, error: SEM_ARQUIVO }

  try {
    const achada = await executarNoBanco((tx) => notaDoDonoComXml(tx, sessao, id), { somenteLeitura: true })
    if (!achada || !achada.xml || !achada.nota.podeBaixar) return { ok: false, error: SEM_ARQUIVO }

    const { nota, xml } = achada
    const base = `NFSe-${nota.chaveAcesso ?? nota.numero ?? nota.id}`
    if (formato === 'xml') return { ok: true, data: { formato: 'xml', nome: `${base}.xml`, xml } }

    const dados = lerDadosDaNota(xml)
    if (!dados) return { ok: false, error: SEM_ARQUIVO }
    return { ok: true, data: { formato: 'pdf', nome: `${base}.pdf`, nota, dados } }
  } catch (err) {
    console.error('[notas] falha ao entregar o arquivo da nota:', err)
    return { ok: false, error: FALHA }
  }
}
