/**
 * O serviço dos casos de atendimento: o que o cliente e a equipe fazem, e em que estado o caso fica.
 *
 * SEM `server-only`, pelo mesmo motivo de src/server/admin/cs.ts: recebe o `Executor`, não lê ambiente,
 * e por isso roda na suíte contra o Postgres embutido. As Server Actions (src/server/actions/atendimento.ts
 * e actions/admin/casos.ts) decidem QUEM é o ator; aqui só se aplica a regra.
 *
 * Cada gesto da equipe grava `admin.casos.<verbo>` na MESMA transação da escrita. O que o cliente
 * escreve não grava trilha da equipe: não é gesto do painel.
 */

import {
  estadoDepoisDe,
  paginaDeOrigemSegura,
  tituloDoRelato,
  validarAnexo,
  validarTexto,
  ehTipoDeCaso,
  type EstadoDoCaso,
  type FiltroDeCasos,
  type Gesto,
} from '@/domain/atendimento/casos'
import * as repo from '@/server/db/repositories/casos'
import type { Executor } from '@/server/db/sql'
import { registrarAcaoAdmin } from '@/server/admin/auditar'
import type { ResultadoAdmin } from '@/server/admin/contabil'

export interface AnexoDeEntrada {
  nome: string
  bytes: Uint8Array
}

export interface CasoDetalhado {
  caso: repo.CasoGravado
  mensagens: repo.MensagemDeCaso[]
}

const NAO_ENCONTRADO = 'Caso não encontrado.'

/* ---------- o cliente ---------- */

export async function abrirCaso(
  executar: Executor,
  email: string,
  entrada: { tipo: unknown; texto: unknown; paginaOrigem: unknown; anexo?: AnexoDeEntrada | null },
  agora: number = Date.now(),
): Promise<ResultadoAdmin<{ casoId: number }>> {
  if (!ehTipoDeCaso(entrada.tipo)) return { ok: false, erro: 'Escolha o tipo do assunto.' }
  const texto = validarTexto(entrada.texto)
  if (!texto.ok) return { ok: false, erro: texto.erro }
  const anexo = entrada.anexo ? validarAnexo(entrada.anexo.nome, entrada.anexo.bytes) : null
  if (anexo && !anexo.ok) return { ok: false, erro: anexo.erro }
  const tipo = entrada.tipo

  const casoId = await executar(async (tx) => {
    const id = await repo.inserirCaso(tx, {
      userEmail: email,
      tipo,
      titulo: tituloDoRelato(texto.valor),
      paginaOrigem: paginaDeOrigemSegura(entrada.paginaOrigem),
      agora,
    })
    const anexoId = anexo?.ok ? await repo.inserirAnexo(tx, { casoId: id, nome: anexo.valor.nome, tipoMime: anexo.valor.tipoMime, bytes: anexo.valor.bytes, agora }) : null
    await repo.inserirMensagem(tx, { casoId: id, autor: 'cliente', autorEmail: email, texto: texto.valor, anexoId, agora })
    return id
  })
  return { ok: true, mensagem: 'Recebemos o seu pedido. A resposta aparece aqui em Atendimento.', dados: { casoId } }
}

export async function responderComoCliente(
  executar: Executor,
  email: string,
  casoId: number,
  textoBruto: unknown,
  agora: number = Date.now(),
): Promise<ResultadoAdmin> {
  const texto = validarTexto(textoBruto)
  if (!texto.ok) return { ok: false, erro: texto.erro }
  return executar(async (tx) => {
    const c = await repo.buscarCaso(tx, casoId, email)
    if (!c) return { ok: false, erro: NAO_ENCONTRADO } as const
    await repo.inserirMensagem(tx, { casoId, autor: 'cliente', autorEmail: email, texto: texto.valor, anexoId: null, agora })
    await repo.atualizarCaso(tx, casoId, { estado: estadoDepoisDe(c.estado, 'cliente_escreveu'), agora, doCliente: true })
    return { ok: true, mensagem: 'Mensagem enviada.' } as const
  })
}

/** Abre o caso para o cliente e marca as respostas como vistas. Caso de outro cliente é "não encontrado". */
export async function verCasoComoCliente(executar: Executor, email: string, casoId: number, agora: number = Date.now()): Promise<CasoDetalhado | null> {
  return executar(async (tx) => {
    const c = await repo.buscarCaso(tx, casoId, email)
    if (!c) return null
    await repo.marcarVistoPeloCliente(tx, casoId, email, agora)
    return { caso: { ...c, clienteViuAte: agora }, mensagens: await repo.mensagensDoCaso(tx, casoId) }
  })
}

export async function listarMeusCasos(executar: Executor, email: string): Promise<{ casos: repo.CasoGravado[]; novas: number }> {
  return executar(async (tx) => ({ casos: await repo.listarCasosDoCliente(tx, email), novas: await repo.contarRespostasNaoVistas(tx, email) }), { somenteLeitura: true })
}

/* ---------- a equipe ---------- */

export async function listarParaEquipe(executar: Executor, filtro: FiltroDeCasos, limite = 200) {
  return executar(async (tx) => ({ casos: await repo.listarCasosDaEquipe(tx, filtro, limite), abertos: await repo.contarCasosAbertos(tx) }), { somenteLeitura: true })
}

export async function abertosParaOMenu(executar: Executor): Promise<number> {
  return executar((tx) => repo.contarCasosAbertos(tx), { somenteLeitura: true })
}

export async function verCasoComoEquipe(executar: Executor, casoId: number): Promise<CasoDetalhado | null> {
  return executar(
    async (tx) => {
      const c = await repo.buscarCaso(tx, casoId)
      return c ? { caso: c, mensagens: await repo.mensagensDoCaso(tx, casoId) } : null
    },
    { somenteLeitura: true },
  )
}

export async function responderComoEquipe(
  executar: Executor,
  ator: string,
  casoId: number,
  textoBruto: unknown,
  agora: number = Date.now(),
): Promise<ResultadoAdmin<{ clienteEmail: string; titulo: string }>> {
  const texto = validarTexto(textoBruto)
  if (!texto.ok) return { ok: false, erro: texto.erro }
  return executar(async (tx) => {
    const c = await repo.buscarCaso(tx, casoId)
    if (!c) return { ok: false, erro: NAO_ENCONTRADO } as const
    await repo.inserirMensagem(tx, { casoId, autor: 'equipe', autorEmail: ator, texto: texto.valor, anexoId: null, agora })
    // `fechadoPor` acompanha o estado: caso encerrado continua como a equipe o deixou.
    const estado = estadoDepoisDe(c.estado, 'equipe_respondeu')
    await repo.atualizarCaso(tx, casoId, { estado, agora, daEquipe: true, fechadoPor: estado === c.estado ? c.fechadoPor : null })
    await registrarAcaoAdmin(tx, { ator, area: 'casos', verbo: 'responder', entidade: 'caso', entidadeId: String(casoId), usuariosAfetados: [c.userEmail], agora })
    return { ok: true, mensagem: 'Resposta enviada ao cliente.', dados: { clienteEmail: c.userEmail, titulo: c.titulo } } as const
  })
}

const GESTOS_DE_ESTADO: Record<'resolvido' | 'nao_resolvido' | 'reabrir', { gesto: Gesto; verbo: string; mensagem: string }> = {
  resolvido: { gesto: 'marcar_resolvido', verbo: 'resolver', mensagem: 'Caso marcado como resolvido.' },
  nao_resolvido: { gesto: 'marcar_nao_resolvido', verbo: 'nao_resolver', mensagem: 'Caso marcado como não resolvido.' },
  reabrir: { gesto: 'reabrir', verbo: 'reabrir', mensagem: 'Caso reaberto.' },
}

export async function mudarEstadoDoCaso(
  executar: Executor,
  ator: string,
  casoId: number,
  gesto: unknown,
  agora: number = Date.now(),
): Promise<ResultadoAdmin<{ estado: EstadoDoCaso }>> {
  if (gesto !== 'resolvido' && gesto !== 'nao_resolvido' && gesto !== 'reabrir') return { ok: false, erro: 'Escolha o que fazer com o caso.' }
  const g = GESTOS_DE_ESTADO[gesto]
  return executar(async (tx) => {
    const c = await repo.buscarCaso(tx, casoId)
    if (!c) return { ok: false, erro: NAO_ENCONTRADO } as const
    const estado = estadoDepoisDe(c.estado, g.gesto)
    await repo.atualizarCaso(tx, casoId, { estado, agora, fechadoPor: ator })
    await registrarAcaoAdmin(tx, { ator, area: 'casos', verbo: g.verbo, entidade: 'caso', entidadeId: String(casoId), usuariosAfetados: [c.userEmail], detalhes: { de: c.estado, para: estado }, agora })
    return { ok: true, mensagem: g.mensagem, dados: { estado } } as const
  })
}
