/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Lê AUREA_ADMIN_EMAILS, o cookie de sessão e o banco para decidir quem é membro do
 * painel e o que ele pode fazer. Não importe de Client Component: o cliente recebe o
 * membro já resolvido pelo layout do painel, nunca a regra.
 * ==========================================================================*/

import 'server-only'

import { redirect } from 'next/navigation'

import {
  PERMISSOES,
  ehEmailDeBootstrap,
  normalizarEmail,
  resolverMembro,
  temPermissao,
  type ChavePermissao,
  type MembroAdmin,
} from '@/domain/admin/permissoes'
import { ACCOUNTS } from '@/domain/constants'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { nomeDoSchema } from '@/server/db/sql'
import { getSessionEmail } from '@/server/session'

import { registrarAcaoAdmin } from './auditar'
import { abrePainelNoBanco, carregarMembroNoBanco, garantirCatalogosAdmin, type Ambiente } from './rbac'

/**
 * O serviço de acesso do painel (plano do Admin, seção 1.3).
 *
 * A RECUSA REAL ACONTECE AQUI. Esconder item de menu é conveniência; toda Server
 * Action de src/server/actions/admin/ chama `permissaoParaAcao` (ou `exigirPermissao`)
 * por conta própria, e é esta função que diz não.
 *
 * NADA TRANCA O GABRIEL PARA FORA. Três garantias, nesta ordem:
 *  1. sem banco configurado, vale o bootstrap do ambiente — o mesmo de `ehAdmin()`;
 *  2. com banco, e-mail que a tabela não conhece e que está no bootstrap entra como dev;
 *  3. se o banco FALHAR (tabela ainda não migrada, instabilidade), a leitura cai no
 *     bootstrap em vez de derrubar a tela. O custo aceito: durante a falha, um e-mail
 *     do ambiente que tinha sido rebaixado pela tela volta a entrar como dev. Só vale
 *     para quem está em AUREA_ADMIN_EMAILS, que é quem controla a Vercel.
 *
 * SEM SEGUNDO LOGIN. Quem entrou por /entrar e é membro abre /admin direto: a sessão é
 * o mesmo cookie assinado de src/server/session.ts.
 */

export function ambienteAtual(): Ambiente {
  return { listaDoAmbiente: process.env.AUREA_ADMIN_EMAILS, contasDoSeed: ACCOUNTS }
}

/* ---------- catálogo, uma vez por instância ---------- */

interface GlobalComCatalogo {
  __aureaCatalogoAdmin__?: Map<string, Promise<void>>
}

/**
 * O upsert do catálogo custa três consultas; não faz sentido repeti-lo a cada tela.
 * Guardamos a PROMESSA por schema em `globalThis` (mesmo motivo do pool em
 * db/client.ts: os dois grafos de bundle do Next dividem o processo). Falhou, esquece
 * — a próxima requisição tenta de novo.
 */
function garantirCatalogoUmaVez(): Promise<void> {
  const g = globalThis as unknown as GlobalComCatalogo
  g.__aureaCatalogoAdmin__ ??= new Map()
  const schema = nomeDoSchema()
  const existente = g.__aureaCatalogoAdmin__.get(schema)
  if (existente) return existente
  const promessa = executarNoBanco((tx) => garantirCatalogosAdmin(tx)).catch((err: unknown) => {
    g.__aureaCatalogoAdmin__?.delete(schema)
    throw err
  })
  g.__aureaCatalogoAdmin__.set(schema, promessa)
  return promessa
}

/* ---------- quem é o membro ---------- */

function soPeloAmbiente(email: string): MembroAdmin | null {
  const amb = ambienteAtual()
  const e = normalizarEmail(email)
  return resolverMembro({
    email: e,
    membro: null,
    papel: null,
    bootstrap: ehEmailDeBootstrap(e, amb.listaDoAmbiente, amb.contasDoSeed),
    nomeAlternativo: amb.contasDoSeed[e]?.name ?? null,
  })
}

/** Papel e permissões resolvidos, ou `null` para quem não é da equipe. */
export async function carregarMembro(email: string | null | undefined): Promise<MembroAdmin | null> {
  if (!email) return null
  if (!bancoConfigurado()) return soPeloAmbiente(email)
  try {
    await garantirCatalogoUmaVez()
    return await carregarMembroNoBanco(executarNoBanco, email, ambienteAtual())
  } catch (err) {
    console.error('[admin] papéis indisponíveis no banco; valendo só o bootstrap do ambiente:', err)
    return soPeloAmbiente(email)
  }
}

/** O membro da sessão atual, para páginas e layouts. Não registra nada. */
export async function membroDaSessao(): Promise<MembroAdmin | null> {
  const email = await getSessionEmail().catch(() => null)
  return carregarMembro(email)
}

/** A entrada própria do painel: login que volta para /admin e explica quem não tem acesso. */
export const ENTRADA_DO_PAINEL = '/painel'

/**
 * O guarda de toda página do painel: sem sessão, ou logado sem ser da equipe, a entrada do
 * painel. A página confere por conta própria mesmo com o layout fazendo o mesmo — no App
 * Router layout e página renderizam em paralelo, e dado carregado pela página antes de o
 * layout redirecionar seria dado entregue.
 *
 * ATÉ 14/09/2026 O DESTINO ERA /entrar E /inicio, e o painel parecia não existir: /entrar
 * sempre devolve para o site do cliente depois do login, e a conta fora da equipe era
 * mandada para /inicio sem uma palavra. /painel entra e volta para cá, e diz com qual conta
 * a pessoa está e por que ela não abre o painel.
 */
export async function membroDaPagina(): Promise<MembroAdmin> {
  const email = await getSessionEmail().catch(() => null)
  if (!email) redirect(ENTRADA_DO_PAINEL)
  const membro = await carregarMembro(email)
  if (!membro) redirect(ENTRADA_DO_PAINEL)
  return membro
}

/**
 * "Mostro o item Administração no menu do app?" — uma linha do banco, sem catálogo.
 * Roda no carregamento de toda tela do cliente, então falha vira bootstrap, nunca
 * exceção.
 */
export async function podeAbrirPainelAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email) return false
  const amb = ambienteAtual()
  const peloAmbiente = (): boolean => ehEmailDeBootstrap(email, amb.listaDoAmbiente, amb.contasDoSeed)
  if (!bancoConfigurado()) return peloAmbiente()
  try {
    return await abrePainelNoBanco(executarNoBanco, email, amb)
  } catch {
    return peloAmbiente()
  }
}

export { temPermissao }

/* ---------- a recusa ---------- */

export const SESSAO_EXPIRADA = 'Sessão expirada. Entre de novo.'
export const SO_EQUIPE = 'Esta área é restrita à equipe do Real Olímpico.'

export function semPermissao(chave: ChavePermissao): string {
  const rotulo = PERMISSOES.find((p) => p.chave === chave)?.rotulo ?? chave
  return `Seu papel no painel não inclui esta ação: ${rotulo.toLowerCase()}.`
}

export class ErroDeAcesso extends Error {
  readonly status: 401 | 403
  constructor(status: 401 | 403, mensagem: string) {
    super(mensagem)
    this.name = 'ErroDeAcesso'
    this.status = status
  }
}

export type Permissao = { ok: true; membro: MembroAdmin } | { ok: false; status: 401 | 403; erro: string }

/**
 * A recusa fica na trilha: quem tentou, e o quê. Nunca derruba a resposta — a trilha
 * é consequência da recusa, não condição para ela.
 */
async function registrarRecusa(email: string, chave: ChavePermissao): Promise<void> {
  if (!bancoConfigurado()) return
  try {
    await executarNoBanco((tx) =>
      registrarAcaoAdmin(tx, {
        ator: normalizarEmail(email),
        area: 'acesso',
        verbo: 'recusado',
        entidade: 'permissao',
        entidadeId: chave,
        detalhes: { permissao: chave },
      }),
    )
  } catch (err) {
    console.error('[admin] falha ao registrar recusa de acesso:', err)
  }
}

/** A versão que não lança — é a que as Server Actions usam para devolver `ActionResult`. */
export async function permissaoParaAcao(chave: ChavePermissao): Promise<Permissao> {
  const email = await getSessionEmail().catch(() => null)
  if (!email) return { ok: false, status: 401, erro: SESSAO_EXPIRADA }
  const membro = await carregarMembro(email)
  if (!membro) {
    await registrarRecusa(email, chave)
    return { ok: false, status: 403, erro: SO_EQUIPE }
  }
  if (!temPermissao(membro, chave)) {
    await registrarRecusa(email, chave)
    return { ok: false, status: 403, erro: semPermissao(chave) }
  }
  return { ok: true, membro }
}

/** A assinatura do plano: lança `ErroDeAcesso` quando não pode. */
export async function exigirPermissao(chave: ChavePermissao): Promise<MembroAdmin> {
  const r = await permissaoParaAcao(chave)
  if (!r.ok) throw new ErroDeAcesso(r.status, r.erro)
  return r.membro
}
