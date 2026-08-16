'use server'

/**
 * Autenticação — port de aurea-mvp-teste.html, doLogin (1038-1064) e doLogout
 * (1065-1071).
 *
 * A MUDANÇA QUE JUSTIFICA O PORT INTEIRO
 * --------------------------------------
 * No monolito a conferência de senha rodava no NAVEGADOR: o objeto ACCOUNTS
 * estava no bundle e `if(ps !== effectivePass)` era uma linha de JavaScript que
 * qualquer pessoa reescrevia pelo console. Aqui a comparação acontece no
 * servidor e o que volta para o cliente é um ActionResult — nunca a senha, nunca
 * o estado do usuário.
 *
 * O QUE CONTINUA IGUAL (port fiel, e são dívidas conhecidas)
 * ----------------------------------------------------------
 *  - Senhas em texto puro, tanto em ACCOUNTS quanto em `user.pass`. A troca por
 *    hash é a Etapa 2 da migração (Seção 4.4) e mexer nisso agora quebraria a
 *    paridade que este port precisa demonstrar.
 *  - A senha gravada pelo usuário (user.pass) tem PRECEDÊNCIA sobre a de
 *    ACCOUNTS — é o `state.users[em].pass ? ... : acc.pass` da linha 1048. Sem
 *    isso, trocar a senha na tela 3.2 não teria efeito nenhum no login.
 *  - A mensagem de erro é uma só, idêntica para e-mail inexistente e senha
 *    errada. Isso é bom por acaso: não conta a um atacante quais e-mails existem.
 */

import { ACCOUNTS } from '@/domain/constants'
import type { ActionResult } from '@/domain/types'
import { clearSession, setSession } from '@/server/session'
import { getState, mutateState } from '@/server/state'

/** Texto exato da linha 1044/1050 do monolito. Um só para os dois casos. */
const CREDENCIAIS_INVALIDAS = 'E-mail ou senha incorretos. Verifique os dados e tente novamente.'

/**
 * Mensagem do saveState do MVP (linha 915). getState/mutateState PROPAGAM
 * exceção — o original engolia a falha e avisava com este texto. Sem o catch,
 * o cliente receberia um erro 500 genérico do Next em vez da mensagem do
 * produto.
 */
const FALHA_GRAVACAO = 'Falha ao salvar dados. Tente novamente.'

/**
 * Entra na plataforma.
 *
 * Devolve ActionResult sem `message`: o original não emitia toast no login bem
 * sucedido, e a tela de entrada mostra a falha no <div class="login-error">, não
 * num aviso flutuante.
 */
export async function login(email: string, senha: string): Promise<ActionResult> {
  // Normalização do original (linha 1039): as chaves de ACCOUNTS e de
  // state.users são e-mails em minúsculas.
  const em = email.trim().toLowerCase()

  const acc = ACCOUNTS[em]
  if (!acc) return { ok: false, error: CREDENCIAIS_INVALIDAS }

  try {
    // Leitura antes da escrita, na mesma sequência do original (loadState na
    // linha 1047, saveState só na 1058). Importa: senha errada não pode
    // disparar uma gravação, senão uma rajada de tentativas viraria uma rajada
    // de escritas no banco.
    const state = await getState()
    const usuario = state.users[em]

    // A conta existe no catálogo mas não no estado. No original isso estourava
    // um TypeError na linha 1056 (u.prevAccess de undefined). Aqui vira
    // credencial inválida: entrar sem inventário nem saldo deixaria metade das
    // telas quebrada.
    if (!usuario) return { ok: false, error: CREDENCIAIS_INVALIDAS }

    const senhaEfetiva = usuario.pass ? usuario.pass : acc.pass
    if (senha !== senhaEfetiva) return { ok: false, error: CREDENCIAIS_INVALIDAS }

    // Carimbo de acesso. `prevAccess` alimenta o 'Último acesso' da tela 3.2, e
    // por isso precisa ser gravado ANTES de lastAccess ser sobrescrito.
    await mutateState((s) => {
      const u = s.users[em]
      if (!u) return
      // O original escrevia `u.lastAccess || null`. Aqui fica undefined quando
      // é o primeiro acesso: o tipo Timestamp não admite null e, no JSON, a
      // chave ausente e a chave null significam a mesma coisa para a tela 3.2,
      // que testa `u.prevAccess ? ... : '—'`.
      u.prevAccess = u.lastAccess
      u.lastAccess = Date.now()
    })

    // A sessão só é criada depois de a senha bater e o carimbo ser gravado.
    await setSession(em)
    return { ok: true }
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

/**
 * Sai da plataforma.
 *
 * Só apaga o cookie: parar o ciclo de sincronização e esconder o casco, que o
 * doLogout original fazia na mão, acontece sozinho quando o cliente navega para
 * '/' e o (app)/layout deixa de existir.
 *
 * Não devolve `message` — o original não emitia toast ao sair.
 */
export async function logout(): Promise<ActionResult> {
  await clearSession()
  return { ok: true }
}
