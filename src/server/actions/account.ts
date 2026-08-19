'use server'

/**
 * Conta e preferências — port de aurea-mvp-teste.html: savePassword (2772-2786),
 * savePersonal (2747-2756), toggle2FA (2725-2732) e toggleNotif (2804-2810).
 *
 * O QUE MUDA DE LUGAR (e é o motivo de existir esta camada)
 * --------------------------------------------------------
 * No monolito estas quatro rotinas rodavam no navegador em cima da global
 * `state`. A pior delas era savePassword: a senha efetiva vinha de ACCOUNTS, que
 * estava no bundle, e a comparação `cur !== effective` era uma linha que
 * qualquer pessoa reescrevia pelo console — trocar a senha de uma conta alheia
 * era questão de editar `session` antes. Aqui o e-mail vem do cookie assinado
 * (getSessionEmail) e a senha atual é conferida contra o estado do SERVIDOR.
 *
 * O QUE NÃO MUDA (port fiel, dívidas conhecidas e deliberadas)
 * ------------------------------------------------------------
 *  - A senha continua em texto puro, tanto em ACCOUNTS quanto em `user.pass`.
 *    Hash é a Etapa 2 da migração (Seção 4.4 do documento técnico); mexer agora
 *    quebraria a paridade de comportamento com o login já portado em auth.ts.
 *  - `user.pass` tem precedência sobre ACCOUNTS — mesma regra do login. Sem ela,
 *    trocar a senha aqui não teria efeito nenhum na próxima entrada.
 *  - A ordem das validações da troca de senha é a do original: senha atual,
 *    depois tamanho, depois confirmação. Trocar a ordem muda qual mensagem
 *    aparece quando há mais de um erro ao mesmo tempo.
 *  - toggleNotif NÃO emite mensagem: o original apenas reabria a modal para
 *    redesenhar o interruptor, sem toast. ActionResult sem `message` faz o
 *    run() do AppProvider ficar calado, que é exatamente esse comportamento.
 */

import { ACCOUNTS, DEPOSITO_MAX } from '@/domain/constants'
import { brl } from '@/domain/money'
import { getSettings } from '@/domain/selectors'
import type { ActionResult, Cents } from '@/domain/types'
import { getSessionEmail } from '@/server/session'
import { mutateState } from '@/server/state'

/** Cookie ausente, expirado ou com assinatura que não bate. */
const SESSAO_EXPIRADA = 'Sessão expirada.'

/**
 * Mensagem do saveState do MVP (linha 915). getState/mutateState PROPAGAM
 * exceção; o original engolia a falha e avisava com este texto. Sem o catch, o
 * cliente veria um erro 500 genérico do Next no lugar da mensagem do produto.
 */
const FALHA_GRAVACAO = 'Falha ao salvar dados. Tente novamente.'

/**
 * Chaves de preferência de notificação aceitas.
 *
 * Escritas por extenso na assinatura (e não importadas de um tipo compartilhado)
 * porque um arquivo 'use server' só pode exportar funções assíncronas. A tela
 * 3.2 declara a mesma união do lado dela; se as duas divergirem, a chamada
 * quebra em tempo de compilação, que é onde se quer descobrir isso.
 */
type NotifKey = 'notifEnvios' | 'notifNegociacoes' | 'notifNovidades'

/** Lista em tempo de execução — o tipo some na compilação e o cliente é dado. */
const NOTIF_KEYS: readonly string[] = ['notifEnvios', 'notifNegociacoes', 'notifNovidades']

/**
 * Troca a senha de acesso (savePassword, linhas 2772-2786).
 *
 * Toda a regra roda DENTRO de mutateState: a senha atual é comparada com o que
 * está gravado no banco no mesmo instante em que a nova é escrita. Conferir
 * antes, fora da transação, abriria uma janela entre a checagem e a gravação.
 *
 * Consequência aceita: a validação reprovada também grava (o store não tem como
 * cancelar a escrita no meio do ciclo). Gravar um documento idêntico é inócuo, e
 * aqui — diferente do login — quem chama já está autenticado, então não existe a
 * superfície de força bruta anônima que fez auth.ts evitar escrever.
 */
export async function changePassword(
  atual: string,
  nova: string,
  confirmacao: string,
): Promise<ActionResult> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  try {
    const { result } = await mutateState<ActionResult>((s) => {
      const u = s.users[email]
      // Sessão assinada apontando para usuário que já não existe no estado
      // (banco recriado, seed trocado). O original estouraria TypeError.
      if (!u) return { ok: false, error: SESSAO_EXPIRADA }

      // O original escrevia `u.pass || ACCOUNTS[session].pass`, sem guarda: uma
      // conta fora do catálogo derrubava a função. Com `null` no lugar, nenhuma
      // string digitada bate e a resposta vira 'Senha atual incorreta.' — que é
      // a verdade para quem não tem senha conhecida.
      const conta = ACCOUNTS[email]
      const senhaEfetiva = u.pass || (conta ? conta.pass : null)

      if (atual !== senhaEfetiva) return { ok: false, error: 'Senha atual incorreta.' }
      if (nova.length < 8)
        return { ok: false, error: 'A nova senha precisa de pelo menos 8 caracteres.' }
      if (nova !== confirmacao)
        return { ok: false, error: 'A confirmação da nova senha não confere.' }

      u.pass = nova
      return {
        ok: true,
        message: 'Senha alterada com sucesso. Use a nova senha no próximo login.',
      }
    })
    return result
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

/**
 * Atualiza os dados cadastrais (savePersonal, linhas 2747-2756).
 *
 * O `trim()` e o mínimo de 2 caracteres rodavam no navegador; aqui rodam no
 * servidor, porque o nome digitado é a única coisa que o cliente manda e
 * aparece em toda a interface (topbar, auditoria pública, recibo). A mensagem
 * de recusa é a mesma da linha 2749.
 *
 * O e-mail continua imutável: no original o campo já vinha `disabled` e nem era
 * lido de volta. Aqui ele nem chega como parâmetro — a chave do usuário é a da
 * sessão, então não há como renomear a conta de outra pessoa.
 */
export async function updatePersonal(nome: string): Promise<ActionResult> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  const nv = nome.trim()
  if (nv.length < 2) return { ok: false, error: 'Informe um nome válido.' }

  try {
    const { result } = await mutateState<ActionResult>((s) => {
      const u = s.users[email]
      if (!u) return { ok: false, error: SESSAO_EXPIRADA }
      u.name = nv
      return { ok: true, message: 'Dados pessoais atualizados.' }
    })
    return result
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

/**
 * Liga/desliga a verificação em duas etapas (linhas 2725-2732).
 *
 * É um interruptor puro: o cliente não manda o valor desejado, manda só a
 * intenção de alternar. Isso elimina a corrida em que duas abas abertas na
 * mesma conta mandariam `true` e `false` e o último a chegar venceria — aqui o
 * estado do servidor é sempre a base do próximo valor.
 *
 * As duas mensagens são as do original, inclusive o "(simulada neste ambiente
 * de teste)": não existe segundo fator nenhum por trás disso.
 */
export async function toggle2FA(): Promise<ActionResult> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  try {
    const { result } = await mutateState<ActionResult>((s) => {
      const u = s.users[email]
      if (!u) return { ok: false, error: SESSAO_EXPIRADA }

      // getSettings cria o objeto de preferências na primeira leitura — as
      // contas do seed nascem sem ele. Por isso a chamada precisa acontecer
      // dentro do mutate: é aqui que o padrão criado fica gravado.
      const s2 = getSettings(u)
      s2.twoFA = !s2.twoFA
      return {
        ok: true,
        message: s2.twoFA
          ? 'Verificação em duas etapas ativada (simulada neste ambiente de teste).'
          : 'Verificação em duas etapas desativada.',
      }
    })
    return result
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

/**
 * Deposita saldo na própria conta. NÃO É PORT — é funcionalidade nova.
 *
 * SIMULADO, E ISSO É REQUISITO, NÃO LIMITAÇÃO PROVISÓRIA
 * -----------------------------------------------------
 * Não há Pix, cartão, boleto nem qualquer integração de pagamento. A ação soma
 * um número ao saldo e registra o aporte para o extrato. A tela precisa dizer
 * isso em texto — um botão "Depositar" que parece movimentar dinheiro de
 * verdade num ambiente onde nada é cobrado seria enganoso mesmo entre sócios.
 *
 * POR QUE A REGRA MORA NO SERVIDOR
 * --------------------------------
 * É a ação mais perigosa da plataforma inteira: ela cria dinheiro. Se rodasse
 * no navegador — como TUDO rodava no monolito — bastaria o console para
 * inventar saldo e varrer o livro de ordens das outras seis contas.
 *
 * O valor chega em centavos; quem digita é a tela, e parsePrice() converte. O
 * servidor aceita apenas inteiro positivo até DEPOSITO_MAX.
 */
export async function deposit(valorCents: Cents): Promise<ActionResult> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  // Number.isFinite antes de qualquer conta: uma server action é um endpoint
  // HTTP e NaN/Infinity chegam se alguém quiser mandar. Infinity somado ao
  // saldo o transformaria em Infinity, e daí em `null` na serialização JSON.
  const valor = Number.isFinite(valorCents) ? Math.floor(valorCents) : 0
  if (valor <= 0) return { ok: false, error: 'Informe um valor de depósito válido.' }
  if (valor > DEPOSITO_MAX) {
    return { ok: false, error: `O depósito máximo por operação é ${brl(DEPOSITO_MAX)}.` }
  }

  try {
    const { result } = await mutateState<ActionResult>((s) => {
      const u = s.users[email]
      if (!u) return { ok: false, error: SESSAO_EXPIRADA }

      u.balance += valor
      s.deposits.push({ userEmail: email, valor, date: Date.now() })

      return {
        ok: true,
        message: `Depósito simulado de ${brl(valor)} concluído. Novo saldo: ${brl(u.balance)}.`,
      }
    })
    return result
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

/**
 * Alterna uma preferência de notificação por e-mail (linhas 2804-2810).
 *
 * Sem `message` no sucesso, como no original — a confirmação visual é o próprio
 * interruptor mudando de lado quando o estado volta do servidor.
 */
export async function toggleNotif(key: NotifKey): Promise<ActionResult> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  // O tipo NotifKey desaparece na compilação: quem chama a server action pela
  // rede pode mandar qualquer string. Sem esta lista, um nome arbitrário criaria
  // um campo novo dentro de user.settings a cada chamada.
  if (!NOTIF_KEYS.includes(key)) {
    return { ok: false, error: 'Preferência de notificação desconhecida.' }
  }

  try {
    const { result } = await mutateState<ActionResult>((s) => {
      const u = s.users[email]
      if (!u) return { ok: false, error: SESSAO_EXPIRADA }
      const prefs = getSettings(u)
      prefs[key] = !prefs[key]
      return { ok: true }
    })
    return result
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}
