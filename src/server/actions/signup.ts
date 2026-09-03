'use server'

/**
 * Cadastro SIMULADO — cria uma conta de demonstração com dados fictícios.
 *
 * POR QUE ESTE ARQUIVO EXISTE, E POR QUE ELE É PROVISÓRIO
 * ------------------------------------------------------
 * O cadastro de verdade é da frente A (`feat/auth-landing`): Supabase Auth,
 * confirmação por e-mail, Google e aceite versionado dos documentos legais.
 * Enquanto aquela frente não entra, não havia como criar uma conta nova para
 * mostrar a plataforma — só dava para entrar com um dos sete e-mails do seed.
 *
 * Esta ação preenche esse buraco de demonstração e **não é caminho para
 * produção**: ela não verifica e-mail, não pede aceite de termos e grava a
 * senha em texto puro, como o resto do MVP faz hoje (RA-02). Está registrada
 * como RA-15 em `RISCOS_ASSUMIDOS.md` e em `src/server/ATALHOS.md`.
 *
 * O arquivo é NOVO de propósito, em vez de um trecho dentro de `auth.ts`: a
 * frente A reescreveu `auth.ts` inteiro, e um arquivo separado desaparece com
 * um `git rm` no dia do merge, sem conflito e sem deixar rastro na tela real.
 *
 * A REGRA QUE NÃO MUDA
 * --------------------
 * Toda a criação acontece dentro de `mutateState`, no servidor. O cliente manda
 * três strings e recebe um ActionResult; ele não escolhe saldo, não escolhe
 * moedas e não escreve no estado. É a mesma disciplina de `deposit()` — a ação
 * que cria valor mora no servidor porque, no navegador, qualquer pessoa com o
 * console aberto se daria um acervo.
 */

import { fdate } from '@/domain/dates'
import { brl } from '@/domain/money'
import { mkCoinsForUser } from '@/domain/seed'
import type { ActionResult, Cents, User } from '@/domain/types'
import { setSession } from '@/server/session'
import { mutateState } from '@/server/state'

/**
 * Saldo de cortesia da conta de demonstração: R$ 5.000,00 em centavos.
 *
 * Escolhido para caber com folga em uma compra no mercado (a Bandeira gira em
 * torno de R$ 290,00) sem destoar das contas do seed, que vão de R$ 35 mil a
 * R$ 97 mil. Conta nova com saldo maior que o dos sócios confundiria a leitura
 * dos gráficos de volume.
 */
const SALDO_INICIAL: Cents = 500_000

/** Quantas moedas a conta nova recebe em custódia. `mkCoinsForUser` garante a mistura de tipos. */
const MOEDAS_INICIAIS = 6

const FALHA_GRAVACAO = 'Falha ao salvar dados. Tente novamente.'
const EMAIL_EM_USO = 'Já existe uma conta com este e-mail. Use a tela de entrada.'

/**
 * Cria a conta e já abre a sessão.
 *
 * As validações rodam aqui e não só na tela: uma Server Action é um endpoint
 * HTTP, e o formulário do navegador é apenas a porta educada de entrada. Sem
 * esta repetição, um `fetch` montado à mão criaria conta com nome vazio ou
 * senha de um caractere.
 */
export async function criarContaSimulada(
  nome: string,
  email: string,
  senha: string,
  confirmacao: string,
): Promise<ActionResult> {
  const nomeLimpo = nome.trim()
  // Mesma normalização do login: as chaves de `state.users` são e-mails em
  // minúsculas, e 'Gabriel@...' e 'gabriel@...' precisam ser a mesma conta.
  const em = email.trim().toLowerCase()

  if (nomeLimpo.length < 2) return { ok: false, error: 'Informe seu nome.' }
  // Validação deliberadamente frouxa: o e-mail não é verificado neste ambiente,
  // então exigir formato estrito só criaria atrito numa demonstração. O
  // cadastro real da frente A é que confere de verdade, com link de confirmação.
  if (!em.includes('@') || !em.includes('.')) return { ok: false, error: 'Informe um e-mail válido.' }
  if (senha.length < 8) return { ok: false, error: 'A senha precisa ter pelo menos 8 caracteres.' }
  if (senha !== confirmacao) return { ok: false, error: 'A confirmação da senha não confere.' }

  try {
    const { result } = await mutateState<ActionResult>((s) => {
      // A checagem mora DENTRO da transação: entre conferir e gravar, outra
      // requisição poderia ter criado a mesma conta. Com o `mutateState`, a
      // segunda enxerga a primeira já gravada e recebe a recusa.
      if (s.users[em]) return { ok: false, error: EMAIL_EM_USO }

      const hoje = fdate(Date.now())
      const usuario: User = {
        name: nomeLimpo,
        balance: SALDO_INICIAL,
        // `mkCoinsForUser` consome os contadores de `s.seq`, e é por isso que
        // ela precisa rodar aqui dentro: os códigos RO- das moedas novas não
        // podem repetir os de ninguém.
        coins: mkCoinsForUser(s.seq, MOEDAS_INICIAIS, hoje),
        // Senha em texto puro, como em todo o MVP (RA-02). Some com o Supabase
        // Auth, no módulo M2.
        pass: senha,
        lastAccess: Date.now(),
      }

      s.users[em] = usuario
      return {
        ok: true,
        message: `Conta de demonstração criada com ${brl(SALDO_INICIAL)} e ${MOEDAS_INICIAIS} moedas fictícias.`,
      }
    })

    // A sessão só nasce depois de a gravação ter dado certo. Criar o cookie
    // antes deixaria o visitante "logado" numa conta que não existe, e o
    // (app)/layout o devolveria para o login sem explicar nada.
    if (result.ok) await setSession(em)
    return result
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}
