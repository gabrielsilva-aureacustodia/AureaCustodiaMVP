'use server'

/**
 * Ações contábeis — a escrita da tela `/relatorios` (módulos M4 e M7).
 *
 * NÃO É PORT: o monolito não tinha nada disso. São as quatro coisas que um
 * administrador (sócio ou contador) faz sobre a base contábil:
 *
 *  1. lançar uma despesa ou receita que não passa pela plataforma;
 *  2. estornar um lançamento errado — com outro lançamento, nunca apagando;
 *  3. preencher uma alíquota (a DRE nasce sem nenhuma, de propósito);
 *  4. mandar tudo para o Google Sheets.
 *
 * E uma leitura: conferir a integridade da cadeia de hashes do ledger.
 *
 * O QUE ESTAS AÇÕES NÃO FAZEM
 * ---------------------------
 * Nenhuma delas toca o AppState nem passa por `mutateState`: lançamento
 * manual e alíquota não mexem em saldo de ninguém. Elas escrevem nas tabelas
 * contábeis pelo `executarNoBanco` e deixam a própria linha na trilha de
 * auditoria, com o e-mail de quem fez. Sem `POSTGRES_URL` não há onde gravar,
 * e a ação diz isso em vez de fingir que gravou.
 *
 * A REGRA QUE NÃO MUDA: quem decide é o servidor. O cliente manda a intenção;
 * a sessão vem do cookie assinado; `ehAdmin` decide; o valor é validado aqui,
 * porque uma Server Action é um endpoint HTTP.
 */

import { CATALOGO_PARAMETROS, contaPorCodigo, type ChaveParametro } from '@/domain/dre'
import { GENESIS } from '@/domain/hash'
import { verificarCadeia } from '@/domain/ledger'
import { brl } from '@/domain/money'
import type { ActionResult, Cents } from '@/domain/types'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { registrarAuditoria } from '@/server/db/repositories/auditoria'
import {
  garantirCatalogos,
  gravarParametro,
  inserirLancamentoManual,
  listarLancamentosManuais,
} from '@/server/db/repositories/contabil'
import { listarLancamentos } from '@/server/db/repositories/ledger'
import { ehAdmin } from '@/server/relatorios/acesso'
import type { ParametrosPeriodo } from '@/server/relatorios/dados'
import { sincronizarSheetsComoAtor } from '@/server/relatorios/sincronizar'
import { getSessionEmail } from '@/server/session'

const SESSAO_EXPIRADA = 'Sessão expirada.'
const RESTRITO = 'Esta área é restrita aos administradores.'
const SEM_BANCO = 'Sem banco configurado (POSTGRES_URL): os lançamentos contábeis só existem com o Supabase.'
const FALHA_GRAVACAO = 'Falha ao salvar dados. Tente novamente.'

/** Teto de um lançamento manual: R$ 10.000.000,00. Anteparo contra o zero a mais, não regra de negócio. */
const LANCAMENTO_MAX: Cents = 1_000_000_000

async function administrador(): Promise<{ email: string } | { erro: string }> {
  const email = await getSessionEmail()
  if (!email) return { erro: SESSAO_EXPIRADA }
  if (!ehAdmin(email)) return { erro: RESTRITO }
  if (!bancoConfigurado()) return { erro: SEM_BANCO }
  return { email }
}

/** 'aaaa-mm-dd' (o `<input type="date">`) -> ms no meio-dia local, para não virar o dia anterior em UTC. */
function dataDeInput(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  const t = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0).getTime()
  return Number.isFinite(t) ? t : null
}

export async function registrarLancamentoManual(
  dataISO: string,
  contaCodigo: string,
  descricao: string,
  valorCents: Cents,
): Promise<ActionResult<{ id: number }>> {
  const adm = await administrador()
  if ('erro' in adm) return { ok: false, error: adm.erro }

  const data = dataDeInput(dataISO)
  if (data === null) return { ok: false, error: 'Informe uma data válida.' }
  const conta = contaPorCodigo(contaCodigo)
  if (!conta) return { ok: false, error: 'Conta contábil desconhecida.' }
  if (conta.automatica) return { ok: false, error: 'Esta conta é alimentada pelo ledger e não aceita lançamento manual.' }
  const desc = descricao.trim()
  if (desc.length < 3) return { ok: false, error: 'Descreva o lançamento (mínimo 3 caracteres).' }
  const valor = Number.isFinite(valorCents) ? Math.floor(valorCents) : 0
  if (valor <= 0) return { ok: false, error: 'Informe um valor válido.' }
  if (valor > LANCAMENTO_MAX) return { ok: false, error: `O lançamento máximo é ${brl(LANCAMENTO_MAX)}.` }

  try {
    const agora = Date.now()
    const id = await executarNoBanco(async (tx) => {
      await garantirCatalogos(tx)
      const novo = await inserirLancamentoManual(tx, { data, contaCodigo, descricao: desc, valor, criadoPor: adm.email }, agora)
      await registrarAuditoria(tx, {
        createdAt: agora,
        ator: adm.email,
        acao: 'contabil.lancamento',
        entidade: 'lancamento_manual',
        entidadeId: String(novo),
        usuariosAfetados: [],
        detalhes: { contaCodigo, valor, data },
      })
      return novo
    })
    return { ok: true, message: `Lançamento registrado em ${conta.nome}: ${brl(valor)}.`, data: { id } }
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

/**
 * Estorna com um lançamento espelho apontando para o original. Nada é apagado:
 * a DRE ignora o par, e o relatório de lançamentos mostra os dois com a
 * situação de cada um.
 */
export async function estornarLancamentoManual(id: number, motivo: string): Promise<ActionResult> {
  const adm = await administrador()
  if ('erro' in adm) return { ok: false, error: adm.erro }
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: 'Lançamento inválido.' }
  const mot = motivo.trim()
  if (mot.length < 3) return { ok: false, error: 'Informe o motivo do estorno.' }

  try {
    const resultado = await executarNoBanco(async (tx) => {
      const todos = await listarLancamentosManuais(tx)
      const alvo = todos.find((l) => l.id === id)
      if (!alvo) return 'nao-encontrado' as const
      if (alvo.estornaId !== null) return 'e-estorno' as const
      if (todos.some((l) => l.estornaId === id)) return 'ja-estornado' as const
      const agora = Date.now()
      await inserirLancamentoManual(
        tx,
        { data: alvo.data, contaCodigo: alvo.contaCodigo, descricao: `Estorno de #${id}: ${mot}`, valor: alvo.valor, criadoPor: adm.email, estornaId: id },
        agora,
      )
      await registrarAuditoria(tx, {
        createdAt: agora,
        ator: adm.email,
        acao: 'contabil.estorno',
        entidade: 'lancamento_manual',
        entidadeId: String(id),
        usuariosAfetados: [],
        detalhes: { motivo: mot, valor: alvo.valor },
      })
      return 'ok' as const
    })
    if (resultado === 'nao-encontrado') return { ok: false, error: 'Lançamento não encontrado.' }
    if (resultado === 'e-estorno') return { ok: false, error: 'Um estorno não pode ser estornado.' }
    if (resultado === 'ja-estornado') return { ok: false, error: 'Este lançamento já foi estornado.' }
    return { ok: true, message: `Lançamento #${id} estornado.` }
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

/**
 * Preenche (ou limpa, com `null`) uma alíquota. Pontos-base entre 0 e 10000;
 * centavos >= 0. A chave precisa estar no catálogo — o cliente pode mandar
 * qualquer string.
 */
export async function definirParametroContabil(chave: string, valor: number | null): Promise<ActionResult> {
  const adm = await administrador()
  if ('erro' in adm) return { ok: false, error: adm.erro }

  const item = CATALOGO_PARAMETROS.find((p) => p.chave === chave)
  if (!item) return { ok: false, error: 'Parâmetro desconhecido.' }
  let v: number | null = null
  if (valor !== null) {
    if (!Number.isFinite(valor) || !Number.isInteger(valor) || valor < 0) return { ok: false, error: 'Informe um valor inteiro não negativo.' }
    if (item.unidade === 'bp' && valor > 10000) return { ok: false, error: 'Percentual acima de 100%.' }
    v = valor
  }

  try {
    const agora = Date.now()
    await executarNoBanco(async (tx) => {
      await garantirCatalogos(tx)
      await gravarParametro(tx, chave as ChaveParametro, v, adm.email, agora)
      await registrarAuditoria(tx, {
        createdAt: agora,
        ator: adm.email,
        acao: 'contabil.parametro',
        entidade: 'parametro',
        entidadeId: chave,
        usuariosAfetados: [],
        detalhes: { valor: v, unidade: item.unidade },
      })
    })
    const legivel = v === null ? 'não configurado' : item.unidade === 'bp' ? `${v / 100}%` : brl(v)
    return { ok: true, message: `${item.rotulo}: ${legivel}.` }
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

export async function sincronizarGoogleSheets(periodo: ParametrosPeriodo): Promise<ActionResult> {
  const adm = await administrador()
  if ('erro' in adm) return { ok: false, error: adm.erro }
  const r = await sincronizarSheetsComoAtor(adm.email, periodo)
  return r.ok ? { ok: true, message: r.message } : { ok: false, error: r.message }
}

/** Reconfere a cadeia inteira do ledger. Leitura; registra na trilha porque alguém pediu a conferência. */
export async function verificarIntegridadeLedger(): Promise<ActionResult<{ lancamentos: number; ok: boolean }>> {
  const adm = await administrador()
  if ('erro' in adm) return { ok: false, error: adm.erro }
  try {
    const { livro, verificacao } = await executarNoBanco(async (tx) => {
      const livro = await listarLancamentos(tx)
      const verificacao = verificarCadeia(livro, GENESIS)
      await registrarAuditoria(tx, {
        createdAt: Date.now(),
        ator: adm.email,
        acao: 'ledger.verificacao',
        entidade: 'ledger',
        entidadeId: null,
        usuariosAfetados: [],
        detalhes: { lancamentos: livro.length, ok: verificacao.ok, primeiraQuebra: verificacao.primeiraQuebra },
      })
      return { livro, verificacao }
    })
    if (!verificacao.ok) {
      return {
        ok: false,
        error: `CADEIA QUEBRADA no lançamento ${verificacao.primeiraQuebra}: ${verificacao.motivo}. Alguém alterou o livro por fora.`,
        data: { lancamentos: livro.length, ok: false },
      }
    }
    return { ok: true, message: `Ledger íntegro: ${livro.length} lançamento(s), cadeia de hashes conferida.`, data: { lancamentos: livro.length, ok: true } }
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}
