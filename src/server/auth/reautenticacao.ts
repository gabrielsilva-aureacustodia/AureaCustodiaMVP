/* ============================================================================
 * CONFIRMAÇÃO POR SENHA (OU CÓDIGO) NAS AÇÕES SENSÍVEIS — módulo exclusivo de servidor.
 *
 * ESTE É O ÚNICO LUGAR QUE CONFERE SENHA PARA AUTORIZAR UMA AÇÃO. Nenhuma Server
 * Action implementa isso por conta própria: ela chama `exigirReautenticacao()` na
 * primeira linha e, se vier um bloqueio, devolve-o no lugar do resultado. Contrato
 * A → todas as frentes (docs/manutencao-2026-11/00_MD_EXECUTIVO.md, seção 4).
 *
 * O PROBLEMA (pedido do Rogério, WhatsApp de 02/11/2026). A senha só era pedida no
 * login, e o cookie de sessão vale 7 dias. Quem abrisse uma conta alheia — celular
 * emprestado, aba esquecida, cópia do acesso — trocava a senha e a chave Pix e
 * sacava sem digitar nada. Agora cada ação que mexe em dinheiro ou em dados de
 * acesso exige uma PROVA recente de que quem está na tela sabe a senha da conta.
 * Estudo completo: docs/diario/execucoes/ESTUDO_REAUTENTICACAO.md.
 *
 * COMO A PROVA FUNCIONA
 * ---------------------
 *  1. A ação chama `exigirReautenticacao(nivel)`. Sem prova válida, devolve
 *     `{ ok:false, precisaSenha:true, nivel, metodo }`; o modal abre.
 *  2. O modal chama `confirmarComSenha` (ou `enviarCodigoPorEmail` +
 *     `confirmarComCodigo`, para a conta que só entra com Google). Conferido, o
 *     servidor grava o cookie `aurea_reauth`, assinado (HMAC-SHA256 com o
 *     SESSION_SECRET), com e-mail, nível e hora.
 *  3. O modal reenvia a ação; a guarda lê o cookie, confere assinatura, e-mail da
 *     sessão, nível e idade, e libera.
 *
 * `janela` (compra e venda) vale por `JANELA_COMPRA_VENDA_MS` e pode ser usada
 * várias vezes. `sempre` (saque, senha, e-mail, Pix, dados, retirada) é de UM uso:
 * a guarda apaga o cookie ao liberar. Os números moram em `reautenticacao-config.ts`.
 *
 * A SENHA É CONFERIDA SEM TROCAR A SESSÃO DO CLIENTE. O cliente do Supabase criado
 * aqui não está ligado a `cookies()` e não persiste nada (`persistSession: false`):
 * o `signInWithPassword` devolve uma sessão que é descartada e revogada na hora
 * (`signOut({ scope: 'local' })`). A sessão do site — o cookie `aurea_session` e os
 * cookies do Supabase SSR — não é tocada. Usa a chave PUBLICÁVEL, nunca a de serviço.
 *
 * A CHAVE DE SERVIÇO SÓ ENTRA PARA SABER SE A CONTA TEM SENHA (lista de provedores,
 * por `portaDeIdentidadeDoAmbiente`, que a troca de e-mail já usa). Conta sem o
 * provedor `email` (só Google) confirma por código de 6 dígitos no e-mail.
 *
 * LIMITE DE TENTATIVAS: NÃO EXISTE AQUI DE PROPÓSITO (regra R10). O Supabase já
 * limita a conferência de senha (150 por 5 min por IP), a conferência de código
 * (30 por 5 min por IP) e o reenvio de código (1 por 60 s por usuário). Fica
 * registrado como fato; trava própria é decisão do Gabriel.
 *
 * LIMITES CONHECIDOS (assumidos): a prova é um cookie sem estado no servidor, então a
 * "uma vez só" do nível `sempre` vale para o navegador de quem a recebeu — o cookie
 * é httpOnly e dura no máximo 1 minuto. Uma cópia dele, mesmo roubada, só vale
 * junto com a sessão e dentro desse minuto.
 * ==========================================================================*/

import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

import type {
  BloqueioDeConfirmacao,
  MetodoDeConfirmacao,
  NivelDeConfirmacao,
} from '@/components/seguranca/confirmacao'
import { normalizarEmail } from '@/domain/email'
import type { ActionResult } from '@/domain/types'
import { portaDeIdentidadeDoAmbiente } from '@/server/admin/identidade'
import { AuthConfigurationError, getAuthConfig } from '@/server/auth/config'
import { getSessionEmail } from '@/server/session'

import {
  COOKIE_DA_PROVA,
  COOKIE_DO_CODIGO,
  INTERVALO_ENTRE_CODIGOS_MS,
  JANELA_COMPRA_VENDA_MS,
  TAMANHO_DO_CODIGO,
  TOLERANCIA_ACAO_SENSIVEL_MS,
  VALIDADE_DO_CODIGO_MS,
} from './reautenticacao-config'

const SESSAO_EXPIRADA = 'Sessão expirada.'
const SEM_CONFIGURACAO = 'A confirmação de segurança não está disponível neste ambiente.'
const SENHA_INCORRETA = 'Senha incorreta.'
/** Texto que a tela de troca de senha sempre mostrou para a senha atual errada. */
const SENHA_ATUAL_INCORRETA = 'Senha atual incorreta.'
const CODIGO_INCORRETO = 'Código incorreto ou vencido. Confira o e-mail ou peça um código novo.'
const FALHA_NO_ENVIO = 'Não foi possível enviar o código agora. Tente novamente em instantes.'

/** Segredo de desenvolvimento, só fora de produção (mesmo desenho de `legal.ts`). */
const DEV_SECRET = 'aurea-reauth-dev-only'

/** Tolerância a relógios levemente desencontrados entre instâncias do servidor. */
const FOLGA_DE_RELOGIO_MS = 5_000

/* ---------- cookie assinado ---------- */

function segredo(): string {
  const configurado = process.env.SESSION_SECRET?.trim()
  if (configurado) return configurado
  if (process.env.NODE_ENV !== 'production') return DEV_SECRET
  throw new Error('SESSION_SECRET é obrigatória em produção para confirmar ações sensíveis.')
}

/**
 * O "domínio" entra no HMAC para que o cookie da prova nunca valha como o cookie do
 * código (nem como o da sessão, que assina só o e-mail): mesmo segredo, assinaturas
 * que não se trocam.
 */
function assinar(dominio: 'prova' | 'codigo', payload: string): string {
  return createHmac('sha256', segredo()).update(`${dominio}|${payload}`).digest('hex')
}

function mesmaAssinatura(recebida: string, esperada: string): boolean {
  if (recebida.length !== esperada.length) return false
  return timingSafeEqual(Buffer.from(recebida), Buffer.from(esperada))
}

function empacotar(dominio: 'prova' | 'codigo', objeto: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(objeto), 'utf8').toString('base64url')
  return `${payload}.${assinar(dominio, payload)}`
}

function desempacotar(dominio: 'prova' | 'codigo', bruto: string | undefined): Record<string, unknown> | null {
  if (!bruto) return null
  const corte = bruto.lastIndexOf('.')
  if (corte <= 0) return null
  const payload = bruto.slice(0, corte)
  if (!mesmaAssinatura(bruto.slice(corte + 1), assinar(dominio, payload))) return null
  try {
    const lido: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return typeof lido === 'object' && lido !== null && !Array.isArray(lido)
      ? (lido as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

/* ---------- a prova ---------- */

export interface ProvaDeConfirmacao {
  email: string
  nivel: NivelDeConfirmacao
  emitidoEm: number
}

/** Monta o valor do cookie da prova. Exportada para os testes forjarem provas. */
export function valorDaProva(prova: ProvaDeConfirmacao): string {
  return empacotar('prova', { e: prova.email, n: prova.nivel, t: prova.emitidoEm })
}

/**
 * Lê a prova do cookie. Devolve `null` se não existir, se a assinatura não bater ou
 * se for de OUTRO e-mail que não o da sessão (cookie de uma conta anterior no mesmo
 * navegador não vale para a conta atual).
 */
export function lerProva(bruto: string | undefined, emailDaSessao: string): ProvaDeConfirmacao | null {
  const lido = desempacotar('prova', bruto)
  if (!lido) return null
  const { e, n, t } = lido
  if (typeof e !== 'string' || typeof t !== 'number' || !Number.isFinite(t)) return null
  if (n !== 'sempre' && n !== 'janela') return null
  if (normalizarEmail(e) !== normalizarEmail(emailDaSessao)) return null
  return { email: normalizarEmail(e), nivel: n, emitidoEm: t }
}

/**
 * A prova serve para a ação que exige `nivel`? Só se for do MESMO nível e estiver
 * dentro do prazo daquele nível. Os níveis não se misturam: a prova de compra (5
 * minutos) nunca libera um saque, e a de saque (1 uso) nunca vira janela de compra.
 */
export function provaServe(prova: ProvaDeConfirmacao | null, nivel: NivelDeConfirmacao, agora: number): boolean {
  if (!prova || prova.nivel !== nivel) return false
  const idade = agora - prova.emitidoEm
  const limite = nivel === 'janela' ? JANELA_COMPRA_VENDA_MS : TOLERANCIA_ACAO_SENSIVEL_MS
  return idade >= -FOLGA_DE_RELOGIO_MS && idade <= limite
}

async function emitirProva(email: string, nivel: NivelDeConfirmacao): Promise<void> {
  const jar = await cookies()
  const duracao = nivel === 'janela' ? JANELA_COMPRA_VENDA_MS : TOLERANCIA_ACAO_SENSIVEL_MS
  jar.set(COOKIE_DA_PROVA, valorDaProva({ email: normalizarEmail(email), nivel, emitidoEm: Date.now() }), {
    httpOnly: true,
    // strict: o cookie só viaja em requisição do próprio site, que é como as Server Actions chegam.
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.ceil(duracao / 1000),
  })
}

/* ---------- método: senha ou código ---------- */

/**
 * Como esta conta confirma. Conta com o provedor `email` tem senha; conta que só
 * entra com Google não tem, e confirma por código. Sem a chave de serviço (ambiente
 * sem a porta de identidade) não dá para olhar os provedores, e o padrão é `senha`.
 *
 * O servidor decide; o cliente nunca informa o método (senão uma conta com senha
 * pediria o código e escaparia da senha).
 */
export async function metodoDeConfirmacao(email: string): Promise<MetodoDeConfirmacao> {
  const porta = portaDeIdentidadeDoAmbiente()
  if (!porta.configurada) return 'senha'
  const identidade = await porta.buscar(email).catch(() => null)
  if (!identidade) return 'senha'
  return identidade.provedores.includes('email') ? 'senha' : 'codigo'
}

/* ---------- a guarda ---------- */

export interface OpcoesDaGuarda {
  /**
   * A senha que a PRÓPRIA ação já pede na tela (a "senha atual" da troca de senha).
   * Quando vem, ela é a confirmação: a guarda a confere aqui e NÃO abre o modal — senão
   * o cliente digitaria a mesma senha duas vezes. Só vale para conta com senha; a conta
   * que só entra com Google continua confirmando por código.
   */
  senhaDigitada?: string
}

/**
 * A guarda de uma linha de toda ação sensível:
 *
 *     const bloqueio = await exigirReautenticacao('sempre')
 *     if (bloqueio) return bloqueio
 *
 * Devolve `null` quando a ação pode seguir. Devolve o bloqueio quando falta a prova
 * (o modal abre) ou quando a sessão venceu. No nível `sempre`, liberar a ação gasta a
 * prova.
 *
 * A guarda lê a sessão por conta própria: nenhuma ação sensível chega aqui sem ela, e
 * assim a chamada não depende de a ação já ter lido o e-mail.
 *
 * ONDE ENTRA NA AÇÃO: depois da conferência barata dos argumentos (sem ler estado) e
 * ANTES de qualquer leitura de estado ou gravação. Entrar antes das conferências
 * baratas faria o cliente digitar a senha para ouvir "informe um valor válido".
 */
export async function exigirReautenticacao(
  nivel: NivelDeConfirmacao,
  opcoes: OpcoesDaGuarda = {},
): Promise<BloqueioDeConfirmacao | null> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  const jar = await cookies()
  const prova = lerProva(jar.get(COOKIE_DA_PROVA)?.value, email)
  if (provaServe(prova, nivel, Date.now())) {
    if (nivel === 'sempre') jar.delete(COOKIE_DA_PROVA)
    return null
  }

  const metodo = await metodoDeConfirmacao(email)

  if (metodo === 'senha' && typeof opcoes.senhaDigitada === 'string') {
    const conferida = await conferirSenha(email, opcoes.senhaDigitada)
    if (conferida === 'certa') return null
    return { ok: false, error: mensagemDaSenhaRecusada(conferida, SENHA_ATUAL_INCORRETA) }
  }

  return { ok: false, precisaSenha: true, nivel, metodo }
}

/* ---------- conferir senha e código, sem tocar na sessão do site ---------- */

/**
 * Cliente do Supabase que NÃO é o da sessão do site: sem cookies, sem persistência,
 * sem renovação automática. Tudo o que ele ganha do Supabase (a sessão do
 * `signInWithPassword` ou do `verifyOtp`) morre com ele.
 */
function clienteDescartavel(): SupabaseClient {
  const { url, anonKey } = getAuthConfig()
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

/** Revoga a sessão criada só para conferir. Falhar aqui não derruba a confirmação. */
async function descartarSessao(client: SupabaseClient): Promise<void> {
  await client.auth.signOut({ scope: 'local' }).catch(() => undefined)
}

type ResultadoDaSenha = 'certa' | 'errada' | 'sem_configuracao' | 'falha'

/**
 * A ÚNICA conferência de senha do módulo (e, por contrato, do site para autorizar ação).
 * Usada pela guarda (senha digitada na própria ação) e por `confirmarComSenha` (modal).
 */
async function conferirSenha(email: string, senha: string): Promise<ResultadoDaSenha> {
  try {
    const client = clienteDescartavel()
    const { data, error } = await client.auth.signInWithPassword({ email, password: senha })
    if (error || !data.session) return 'errada'
    await descartarSessao(client)
    return 'certa'
  } catch (erro) {
    return erro instanceof AuthConfigurationError ? 'sem_configuracao' : 'falha'
  }
}

function mensagemDaSenhaRecusada(resultado: Exclude<ResultadoDaSenha, 'certa'>, quandoErrada: string): string {
  if (resultado === 'errada') return quandoErrada
  if (resultado === 'sem_configuracao') return SEM_CONFIGURACAO
  return 'Não foi possível conferir a senha agora. Tente novamente.'
}

/**
 * Confere a senha da conta da sessão e, se certa, emite a prova do nível pedido.
 * Só funciona para conta com senha; a conta Google usa o código.
 */
export async function confirmarComSenha(senha: string, nivel: NivelDeConfirmacao): Promise<ActionResult> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }
  if (typeof senha !== 'string' || senha.length === 0) return { ok: false, error: 'Digite a sua senha.' }

  if ((await metodoDeConfirmacao(email)) !== 'senha') {
    return { ok: false, error: 'Esta conta confirma por um código enviado ao seu e-mail.' }
  }

  const conferida = await conferirSenha(email, senha)
  if (conferida !== 'certa') return { ok: false, error: mensagemDaSenhaRecusada(conferida, SENHA_INCORRETA) }

  await emitirProva(email, nivel)
  return { ok: true }
}

/**
 * Pede ao Supabase que envie o código de 6 dígitos ao e-mail da conta (conta que só
 * entra com Google). `shouldCreateUser: false`: o código nunca cria conta.
 *
 * O e-mail só traz o CÓDIGO se o modelo "Magic Link" do projeto tiver `{{ .Token }}`
 * (pendência do Gabriel, documentada no MD de execução da frente A).
 */
export async function enviarCodigoPorEmail(): Promise<ActionResult<{ reenvioEmMs: number }>> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  if ((await metodoDeConfirmacao(email)) !== 'codigo') {
    return { ok: false, error: 'Esta conta confirma com a senha, não com código.' }
  }

  const jar = await cookies()
  const anterior = lerPedidoDeCodigo(jar.get(COOKIE_DO_CODIGO)?.value, email)
  const agora = Date.now()
  if (anterior && agora - anterior.enviadoEm < INTERVALO_ENTRE_CODIGOS_MS) {
    const faltam = Math.ceil((INTERVALO_ENTRE_CODIGOS_MS - (agora - anterior.enviadoEm)) / 1000)
    return { ok: false, error: `Aguarde ${faltam} segundos para pedir outro código.` }
  }

  try {
    const client = clienteDescartavel()
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    if (error) {
      const limitado = (error as { status?: number }).status === 429
      return { ok: false, error: limitado ? 'Aguarde um minuto para pedir outro código.' : FALHA_NO_ENVIO }
    }
  } catch (erro) {
    if (erro instanceof AuthConfigurationError) return { ok: false, error: SEM_CONFIGURACAO }
    return { ok: false, error: FALHA_NO_ENVIO }
  }

  jar.set(COOKIE_DO_CODIGO, empacotar('codigo', { e: normalizarEmail(email), t: agora }), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.ceil(VALIDADE_DO_CODIGO_MS / 1000),
  })

  return {
    ok: true,
    message: `Enviamos um código de ${TAMANHO_DO_CODIGO} dígitos para o seu e-mail.`,
    data: { reenvioEmMs: INTERVALO_ENTRE_CODIGOS_MS },
  }
}

interface PedidoDeCodigo {
  enviadoEm: number
}

/** O pedido de código em andamento desta conta, ou `null` (ausente, adulterado, de outra conta). */
function lerPedidoDeCodigo(bruto: string | undefined, emailDaSessao: string): PedidoDeCodigo | null {
  const lido = desempacotar('codigo', bruto)
  if (!lido) return null
  const { e, t } = lido
  if (typeof e !== 'string' || typeof t !== 'number' || !Number.isFinite(t)) return null
  if (normalizarEmail(e) !== normalizarEmail(emailDaSessao)) return null
  return { enviadoEm: t }
}

/**
 * Confere o código enviado por e-mail e, se certo, emite a prova do nível pedido.
 * O prazo de 10 minutos é nosso (hora do envio no cookie assinado); o código só é
 * levado ao Supabase se o pedido ainda estiver dentro dele.
 */
export async function confirmarComCodigo(codigo: string, nivel: NivelDeConfirmacao): Promise<ActionResult> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  if ((await metodoDeConfirmacao(email)) !== 'codigo') {
    return { ok: false, error: 'Esta conta confirma com a senha, não com código.' }
  }

  const digitado = typeof codigo === 'string' ? codigo.replace(/\s/g, '') : ''
  if (!new RegExp(`^\\d{${TAMANHO_DO_CODIGO}}$`).test(digitado)) {
    return { ok: false, error: `Digite os ${TAMANHO_DO_CODIGO} números do código.` }
  }

  const jar = await cookies()
  const pedido = lerPedidoDeCodigo(jar.get(COOKIE_DO_CODIGO)?.value, email)
  if (!pedido || Date.now() - pedido.enviadoEm > VALIDADE_DO_CODIGO_MS) {
    return { ok: false, error: 'O código venceu ou não foi pedido. Peça um código novo.' }
  }

  try {
    const client = clienteDescartavel()
    const { data, error } = await client.auth.verifyOtp({ email, token: digitado, type: 'email' })
    if (error || !data.session) return { ok: false, error: CODIGO_INCORRETO }
    await descartarSessao(client)
  } catch (erro) {
    if (erro instanceof AuthConfigurationError) return { ok: false, error: SEM_CONFIGURACAO }
    return { ok: false, error: CODIGO_INCORRETO }
  }

  // O código já foi gasto no Supabase; o pedido não serve mais.
  jar.delete(COOKIE_DO_CODIGO)
  await emitirProva(email, nivel)
  return { ok: true }
}
