/**
 * O serviço do atendimento (CS): receber o que o webhook traduziu, montar a caixa de
 * conversas e executar os gestos do atendente — responder, anotar, etiquetar, atribuir,
 * mudar a situação (plano do Admin, seções 2.3 a 2.5).
 *
 * PARAMETRIZADO PELO `Executor` E PELO PROVEDOR, SEM `server-only`, pelo mesmo motivo de
 * rbac.ts: é o que deixa a suíte rodar exatamente este código contra o Postgres embutido,
 * com um provedor dublê. Quem lê o ambiente e escolhe o provedor é src/lib/mensageria/.
 *
 * TODO GESTO DO ATENDENTE GRAVA `admin.cs.<verbo>` NA MESMA TRANSAÇÃO da escrita. A
 * mensagem que chega pelo webhook não grava trilha: não é gesto de ninguém da equipe, e
 * uma linha por "oi" afogaria a trilha.
 *
 * O ENVIO NÃO SEGURA TRANSAÇÃO ABERTA. A chamada ao provedor é HTTP e pode demorar 15
 * segundos; ela acontece entre duas transações curtas — lê a conversa, envia, grava o
 * resultado. Uma transação aberta esperando a internet travaria o banco para todo mundo.
 */

import {
  ehCorEtiqueta,
  ehStatusConversa,
  ehTipoDeMidia,
  slugDeEtiqueta,
  statusAvanca,
  validarTexto,
  validarUrlDeMidia,
  type FiltroConversas,
  type StatusConversa,
  type StatusMensagem,
} from '@/domain/admin/cs'
import { emailValido, normalizarEmail } from '@/domain/admin/permissoes'
import { contaDoTelefone, normalizarTelefone } from '@/domain/admin/telefone'
import type { EventoMensageria, ProvedorMensageria } from '@/lib/mensageria/tipos'
import * as repo from '@/server/db/repositories/cs'
import { nomeDoSchema, type Consulta, type Executor } from '@/server/db/sql'

import { registrarAcaoAdmin } from './auditar'
import type { ResultadoAdmin } from './contabil'

/** Quem escreveu a saída que chegou pelo webhook: o próprio aparelho do atendimento. */
export const AUTOR_APARELHO = 'whatsapp-celular'
export const LIMITE_CONVERSAS = 200
export const LIMITE_MENSAGENS = 300

type ProvedorIdentificado = Pick<ProvedorMensageria, 'nome' | 'identificador'>

/* ---------- o que chega pelo webhook ---------- */

export interface ResumoRecebimento {
  mensagens: number
  repetidas: number
  status: number
}

/**
 * Grava o que o webhook traduziu, numa transação só. Mensagem nova cria (ou acha) contato e
 * conversa, tenta casar o telefone com uma conta e conta como não lida; mensagem repetida
 * não grava nada; estado de entrega só anda para a frente (`statusAvanca`).
 */
export async function receberEventos(
  executar: Executor,
  provedor: ProvedorIdentificado,
  eventos: readonly EventoMensageria[],
  agora: number = Date.now(),
): Promise<ResumoRecebimento> {
  const resumo: ResumoRecebimento = { mensagens: 0, repetidas: 0, status: 0 }
  if (!eventos.length) return resumo
  return executar(async (tx) => {
    const canalId = await repo.garantirCanal(tx, { tipo: 'whatsapp', provedor: provedor.nome, identificador: provedor.identificador }, agora)
    let telefones: Array<{ email: string; telefone: string }> | null = null

    for (const e of eventos) {
      if (e.tipo === 'status') {
        const m = await repo.buscarMensagemPorIdNoProvedor(tx, e.idNoProvedor)
        if (m && statusAvanca(m.status, e.status)) {
          await repo.definirStatusMensagem(tx, m.id, e.status)
          resumo.status += 1
        }
        continue
      }

      const contato = await repo.garantirContato(tx, e.telefone, e.nomeDoContato, agora)
      if (!contato.userEmail) {
        telefones ??= await repo.telefonesDasContas(tx)
        const conta = contaDoTelefone(telefones, e.telefone)
        if (conta) await repo.vincularContatoAConta(tx, contato.id, conta)
      }
      const conversaId = await repo.garantirConversa(tx, canalId, contato.id, agora)
      const em = e.em ?? agora
      const id = await repo.inserirMensagemRecebida(tx, {
        conversaId,
        direcao: e.direcao,
        corpo: e.corpo,
        midiaUrl: e.midiaUrl,
        midiaTipo: e.midiaTipo,
        idNoProvedor: e.idNoProvedor,
        status: e.direcao === 'entrada' ? 'entregue' : 'enviada',
        autor: e.direcao === 'saida' ? AUTOR_APARELHO : null,
        createdAt: em,
      })
      if (id === null) {
        resumo.repetidas += 1
        continue
      }
      await repo.registrarMovimento(tx, conversaId, e.direcao, em)
      resumo.mensagens += 1
    }
    return resumo
  })
}

/* ---------- a caixa ---------- */

export interface Caixa {
  conversas: repo.ConversaListada[]
  resumo: { porStatus: Record<StatusConversa, number>; naoLidas: number }
  etiquetas: repo.EtiquetaGravada[]
}

export async function carregarCaixa(executar: Executor, filtro: FiltroConversas): Promise<Caixa> {
  return executar(
    async (tx) => ({
      conversas: await repo.listarConversas(tx, filtro, LIMITE_CONVERSAS),
      resumo: await repo.resumoDaCaixa(tx),
      etiquetas: await repo.listarEtiquetas(tx),
    }),
    { somenteLeitura: true },
  )
}

export interface ConversaAberta {
  conversa: repo.ConversaListada
  mensagens: repo.MensagemGravada[]
  notas: repo.NotaGravada[]
}

/**
 * A thread de uma conversa. `marcarLida` zera as não lidas — é o que acontece quando o
 * atendente de fato abre a conversa, e não quando a lista só passa por ela.
 */
export async function abrirConversa(executar: Executor, conversaId: number, marcarLida: boolean): Promise<ConversaAberta | null> {
  return executar(async (tx) => {
    const conversa = await repo.buscarConversa(tx, conversaId)
    if (!conversa) return null
    if (marcarLida && conversa.naoLidas > 0) {
      await repo.zerarNaoLidas(tx, conversaId)
      conversa.naoLidas = 0
    }
    return {
      conversa,
      mensagens: await repo.listarMensagens(tx, conversaId, LIMITE_MENSAGENS),
      notas: await repo.listarNotasDaConversa(tx, conversaId),
    }
  })
}

/* ---------- responder ---------- */

export type Resposta = { tipo: 'texto'; texto: unknown } | { tipo: 'midia'; url: unknown; midiaTipo: unknown; legenda: unknown }

/**
 * Envia pelo provedor e grava o resultado. Três desfechos, e o atendente sabe qual foi:
 *  - provedor aceitou: 'enviada', e o webhook traz 'entregue' e 'lida' depois;
 *  - sem provedor (registro local): 'registrada', com o aviso de que não chegou ao cliente;
 *  - provedor recusou ou está fora: 'falhou', gravada assim mesmo — a tentativa fica na
 *    conversa e na trilha, com a causa.
 */
export async function responderConversa(
  executar: Executor,
  provedor: ProvedorMensageria,
  ator: string,
  conversaId: number,
  resposta: Resposta,
  agora: number = Date.now(),
): Promise<ResultadoAdmin<{ mensagemId: number; status: StatusMensagem }>> {
  let corpo = ''
  let midia: { url: string; tipo: string } | null = null
  if (resposta.tipo === 'texto') {
    const v = validarTexto(resposta.texto, 'a resposta')
    if (!v.ok) return v
    corpo = v.valor
  } else {
    const u = validarUrlDeMidia(resposta.url)
    if (!u.ok) return u
    if (!ehTipoDeMidia(resposta.midiaTipo)) return { ok: false, erro: 'Escolha o tipo do arquivo.' }
    corpo = typeof resposta.legenda === 'string' ? resposta.legenda.trim().slice(0, 1_000) : ''
    midia = { url: u.valor, tipo: resposta.midiaTipo }
  }

  const conversa = await executar((tx) => repo.buscarConversa(tx, conversaId), { somenteLeitura: true })
  if (!conversa) return { ok: false, erro: 'Conversa não encontrada.' }

  let idNoProvedor: string | null = null
  let status: StatusMensagem
  let falha: string | null = null
  try {
    const r = midia
      ? await provedor.enviarMidia(conversa.contato.telefone, midia.url, midia.tipo, corpo || undefined)
      : await provedor.enviarTexto(conversa.contato.telefone, corpo)
    idNoProvedor = r.idNoProvedor
    status = provedor.entregaDeVerdade ? 'enviada' : 'registrada'
  } catch (err) {
    status = 'falhou'
    falha = err instanceof Error ? err.message : 'Falha desconhecida no provedor.'
  }

  const mensagemId = await executar(async (tx) => {
    const { id, inserida } = await repo.gravarMensagemEnviada(tx, {
      conversaId,
      direcao: 'saida',
      corpo,
      midiaUrl: midia?.url ?? null,
      midiaTipo: midia?.tipo ?? null,
      idNoProvedor,
      status,
      autor: ator,
      createdAt: agora,
    })
    if (inserida) await repo.registrarMovimento(tx, conversaId, 'saida', agora)
    await registrarAcaoAdmin(tx, {
      ator,
      area: 'cs',
      verbo: midia ? 'enviar_midia' : 'responder',
      entidade: 'conversa',
      entidadeId: String(conversaId),
      usuariosAfetados: conversa.contato.userEmail ? [conversa.contato.userEmail] : [],
      detalhes: { mensagemId: id, status, provedor: provedor.nome, ...(falha ? { falha } : {}) },
      agora,
    })
    return id
  })

  if (status === 'falhou') return { ok: false, erro: `A mensagem não saiu e ficou marcada como falha na conversa. ${falha ?? ''}`.trim() }
  if (status === 'registrada') {
    return {
      ok: true,
      mensagem: 'Resposta registrada no painel. Sem WhatsApp conectado, ela não chega ao cliente.',
      dados: { mensagemId, status },
    }
  }
  return { ok: true, mensagem: midia ? 'Arquivo enviado.' : 'Mensagem enviada.', dados: { mensagemId, status } }
}

/**
 * Nova conversa começada pelo atendente, para um telefone digitado (ou o do cadastro, a
 * partir da ficha). Cria contato e conversa se preciso e manda a primeira mensagem.
 */
export async function iniciarConversa(
  executar: Executor,
  provedor: ProvedorMensageria,
  ator: string,
  entrada: { telefone: unknown; nome: unknown; texto: unknown },
  agora: number = Date.now(),
): Promise<ResultadoAdmin<{ conversaId: number; mensagemId: number; status: StatusMensagem }>> {
  const telefone = normalizarTelefone(typeof entrada.telefone === 'string' ? entrada.telefone : null)
  if (!telefone) return { ok: false, erro: 'Telefone inválido: use DDD e número, ou o formato internacional com +.' }
  const texto = validarTexto(entrada.texto, 'a primeira mensagem')
  if (!texto.ok) return texto
  const nome = typeof entrada.nome === 'string' && entrada.nome.trim() ? entrada.nome.trim().slice(0, 120) : null

  const conversaId = await executar(async (tx) => {
    const canalId = await repo.garantirCanal(tx, { tipo: 'whatsapp', provedor: provedor.nome, identificador: provedor.identificador }, agora)
    const contato = await repo.garantirContato(tx, telefone, nome, agora)
    if (!contato.userEmail) {
      const conta = contaDoTelefone(await repo.telefonesDasContas(tx), telefone)
      if (conta) await repo.vincularContatoAConta(tx, contato.id, conta)
    }
    return repo.garantirConversa(tx, canalId, contato.id, agora)
  })

  const r = await responderConversa(executar, provedor, ator, conversaId, { tipo: 'texto', texto: texto.valor }, agora)
  if (!r.ok) return r
  return { ok: true, mensagem: r.mensagem, dados: { conversaId, mensagemId: r.dados?.mensagemId ?? 0, status: r.dados?.status ?? 'enviada' } }
}

/* ---------- gestos sobre a conversa ---------- */

async function conversaOuErro(tx: Consulta, conversaId: number): Promise<repo.ConversaListada | null> {
  return Number.isSafeInteger(conversaId) && conversaId > 0 ? repo.buscarConversa(tx, conversaId) : null
}

const NAO_ENCONTRADA = { ok: false as const, erro: 'Conversa não encontrada.' }

export async function anotarConversa(executar: Executor, ator: string, conversaId: number, corpo: unknown, agora: number = Date.now()): Promise<ResultadoAdmin> {
  const v = validarTexto(corpo, 'a nota')
  if (!v.ok) return v
  return executar(async (tx) => {
    const conversa = await conversaOuErro(tx, conversaId)
    if (!conversa) return NAO_ENCONTRADA
    const notaId = await repo.inserirNotaDaConversa(tx, { conversaId, autor: ator, corpo: v.valor, createdAt: agora })
    await registrarAcaoAdmin(tx, { ator, area: 'cs', verbo: 'anotar', entidade: 'conversa', entidadeId: String(conversaId), detalhes: { notaId }, agora })
    return { ok: true, mensagem: 'Nota interna registrada.' }
  })
}

export async function mudarStatusConversa(executar: Executor, ator: string, conversaId: number, status: unknown, agora: number = Date.now()): Promise<ResultadoAdmin> {
  if (!ehStatusConversa(status)) return { ok: false, erro: 'Situação desconhecida.' }
  return executar(async (tx) => {
    const conversa = await conversaOuErro(tx, conversaId)
    if (!conversa) return NAO_ENCONTRADA
    if (conversa.status === status) return { ok: true, mensagem: 'A conversa já estava nessa situação.' }
    await repo.definirStatusConversa(tx, conversaId, status)
    await registrarAcaoAdmin(tx, { ator, area: 'cs', verbo: 'situacao', entidade: 'conversa', entidadeId: String(conversaId), detalhes: { de: conversa.status, para: status }, agora })
    return { ok: true, mensagem: `Conversa marcada como ${status}.` }
  })
}

export async function atribuirConversa(executar: Executor, ator: string, conversaId: number, responsavel: unknown, agora: number = Date.now()): Promise<ResultadoAdmin> {
  const email = typeof responsavel === 'string' && responsavel.trim() ? normalizarEmail(responsavel) : null
  if (email !== null && !emailValido(email)) return { ok: false, erro: 'E-mail do responsável inválido.' }
  return executar(async (tx) => {
    const conversa = await conversaOuErro(tx, conversaId)
    if (!conversa) return NAO_ENCONTRADA
    if (conversa.responsavel === email) return { ok: true, mensagem: 'Nada mudou.' }
    await repo.definirResponsavel(tx, conversaId, email)
    await registrarAcaoAdmin(tx, { ator, area: 'cs', verbo: 'atribuir', entidade: 'conversa', entidadeId: String(conversaId), detalhes: { de: conversa.responsavel, para: email }, agora })
    return { ok: true, mensagem: email ? `Responsável: ${email}.` : 'Conversa sem responsável.' }
  })
}

export async function criarEtiqueta(executar: Executor, ator: string, rotulo: unknown, cor: unknown, agora: number = Date.now()): Promise<ResultadoAdmin<{ slug: string }>> {
  const r = typeof rotulo === 'string' ? rotulo.trim().slice(0, 40) : ''
  const slug = slugDeEtiqueta(r)
  if (!slug) return { ok: false, erro: 'O nome da etiqueta precisa de pelo menos 2 letras ou números.' }
  const c = ehCorEtiqueta(cor) ? cor : 'cinza'
  return executar(async (tx) => {
    if (!(await repo.inserirEtiqueta(tx, { slug, rotulo: r, cor: c }))) return { ok: false, erro: 'Já existe uma etiqueta com esse nome.' }
    await registrarAcaoAdmin(tx, { ator, area: 'cs', verbo: 'criar_etiqueta', entidade: 'etiqueta', entidadeId: slug, detalhes: { rotulo: r, cor: c }, agora })
    return { ok: true, mensagem: `Etiqueta "${r}" criada.`, dados: { slug } }
  })
}

export async function etiquetarConversa(
  executar: Executor,
  ator: string,
  conversaId: number,
  slug: unknown,
  marcar: boolean,
  agora: number = Date.now(),
): Promise<ResultadoAdmin> {
  if (typeof slug !== 'string') return { ok: false, erro: 'Etiqueta desconhecida.' }
  return executar(async (tx) => {
    const conversa = await conversaOuErro(tx, conversaId)
    if (!conversa) return NAO_ENCONTRADA
    if (!(await repo.etiquetaExiste(tx, slug))) return { ok: false, erro: 'Etiqueta desconhecida.' }
    if (conversa.etiquetas.includes(slug) === marcar) return { ok: true, mensagem: 'Nada mudou.' }
    if (marcar) await repo.marcarEtiqueta(tx, conversaId, slug)
    else await repo.desmarcarEtiqueta(tx, conversaId, slug)
    await registrarAcaoAdmin(tx, { ator, area: 'cs', verbo: 'etiquetar', entidade: 'conversa', entidadeId: String(conversaId), detalhes: { etiqueta: slug, marcar }, agora })
    return { ok: true, mensagem: marcar ? 'Etiqueta aplicada.' : 'Etiqueta retirada.' }
  })
}

/**
 * Vincula (ou desvincula) o contato a uma conta, e troca o nome do contato. É o conserto do
 * casamento automático — telefone ausente no cadastro, número compartilhado, cliente que
 * escreve de outro aparelho.
 */
export async function atualizarContato(
  executar: Executor,
  ator: string,
  contatoId: number,
  alteracoes: { nome?: unknown; userEmail?: unknown },
  agora: number = Date.now(),
): Promise<ResultadoAdmin> {
  return executar(async (tx) => {
    const contato = Number.isSafeInteger(contatoId) && contatoId > 0 ? await repo.buscarContato(tx, contatoId) : null
    if (!contato) return { ok: false, erro: 'Contato não encontrado.' }
    const detalhes: Record<string, unknown> = {}

    if (alteracoes.userEmail !== undefined) {
      const email = typeof alteracoes.userEmail === 'string' && alteracoes.userEmail.trim() ? normalizarEmail(alteracoes.userEmail) : null
      if (email !== null) {
        const S = nomeDoSchema()
        const { rows } = await tx.query(`SELECT 1 FROM ${S}.users WHERE email = $1`, [email])
        if (!rows.length) return { ok: false, erro: 'Não existe conta com esse e-mail.' }
      }
      if (email !== contato.userEmail) {
        await repo.vincularContatoAConta(tx, contatoId, email)
        detalhes.conta = { de: contato.userEmail, para: email }
      }
    }
    if (alteracoes.nome !== undefined) {
      const nome = typeof alteracoes.nome === 'string' && alteracoes.nome.trim() ? alteracoes.nome.trim().slice(0, 120) : null
      if (nome !== contato.nome) {
        await repo.renomearContato(tx, contatoId, nome)
        detalhes.nome = { de: contato.nome, para: nome }
      }
    }
    if (!Object.keys(detalhes).length) return { ok: true, mensagem: 'Nada mudou.' }
    const afetados = [contato.userEmail, (detalhes.conta as { para?: string | null } | undefined)?.para].filter((x): x is string => typeof x === 'string')
    await registrarAcaoAdmin(tx, { ator, area: 'cs', verbo: 'contato', entidade: 'contato', entidadeId: String(contatoId), usuariosAfetados: afetados, detalhes, agora })
    return { ok: true, mensagem: 'Contato atualizado.' }
  })
}
