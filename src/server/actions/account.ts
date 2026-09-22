'use server'

/**
 * Conta e preferências — port de aurea-mvp-teste.html: savePassword (2772-2786),
 * savePersonal (2747-2756), toggle2FA (2725-2732) e toggleNotif (2804-2810).
 *
 * O QUE MUDA DE LUGAR (e é o motivo de existir esta camada)
 * --------------------------------------------------------
 * No monolito estas quatro rotinas rodavam no navegador em cima da global
 * `state`. Aqui o e-mail vem do cookie assinado e a troca de senha é validada
 * pelo Supabase Auth. A comparação com o seed resta somente como contingência
 * para ambientes locais sem as variáveis de Auth (RA-17).
 *
 * O QUE NÃO MUDA (port fiel, dívidas conhecidas e deliberadas)
 * ------------------------------------------------------------
 *  - `user.pass` tem precedência sobre ACCOUNTS apenas na contingência local.
 *  - A ordem das validações da troca de senha é a do original: senha atual,
 *    depois tamanho, depois confirmação. Trocar a ordem muda qual mensagem
 *    aparece quando há mais de um erro ao mesmo tempo.
 *  - toggleNotif NÃO emite mensagem: o original apenas reabria a modal para
 *    redesenhar o interruptor, sem toast. ActionResult sem `message` faz o
 *    run() do AppProvider ficar calado, que é exatamente esse comportamento.
 */

import { ACCOUNTS } from '@/domain/constants'
import { calcularDataLimiteSaque, PRAZO_SAQUE_DIAS } from '@/domain/dates'
import { temDadosBancarios } from '@/domain/cadastro'
import { brl } from '@/domain/money'
import { getSettings } from '@/domain/selectors'
import { limparCpf, validarCpf } from '@/domain/cpf'
import type { ActionResult, Cadastro, Cents, Saque } from '@/domain/types'
import { emailValido, ehEmailProtegido, normalizarEmail } from '@/domain/admin/permissoes'
import { createAuthClient } from '@/server/auth/client'
import { AuthConfigurationError } from '@/server/auth/config'
import { carregarRegrasDoMercado } from '@/server/config/carregar'
import { portaDeIdentidadeDoAmbiente } from '@/server/admin/portas'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { renomearEmailNoAppState, renomearEmailUsuarioNoBanco } from '@/server/db/repositories/users'
import { getSessionEmail, setSession } from '@/server/session'
import { getState, mutateState } from '@/server/state'

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
async function changePasswordContingencia(
  email: string,
  atual: string,
  nova: string,
  confirmacao: string,
): Promise<ActionResult> {
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

export async function changePassword(
  atual: string,
  nova: string,
  confirmacao: string,
): Promise<ActionResult> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  try {
    const client = await createAuthClient()
    const { error: loginError } = await client.auth.signInWithPassword({
      email,
      password: atual,
    })
    if (loginError) return { ok: false, error: 'Senha atual incorreta.' }
    if (nova.length < 8)
      return { ok: false, error: 'A nova senha precisa de pelo menos 8 caracteres.' }
    if (nova !== confirmacao)
      return { ok: false, error: 'A confirmação da nova senha não confere.' }

    const { error: updateError } = await client.auth.updateUser({ password: nova })
    if (updateError) return { ok: false, error: FALHA_GRAVACAO }

    return {
      ok: true,
      message: 'Senha alterada com sucesso. Use a nova senha no próximo login.',
    }
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return changePasswordContingencia(email, atual, nova, confirmacao)
    }
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

export interface InfoTrocaEmail {
  requerSenha: boolean
}

/**
 * Valida a intenção de troca de e-mail antes de abrir o pop-up de senha (para login Google)
 * ou de confirmar a alteração.
 */
export async function verificarTrocaEmail(
  novoEmail: string,
): Promise<ActionResult<InfoTrocaEmail>> {
  const antigo = await getSessionEmail()
  if (!antigo) return { ok: false, error: SESSAO_EXPIRADA }

  const de = normalizarEmail(antigo)
  const para = normalizarEmail(novoEmail)
  if (de === para) return { ok: true, data: { requerSenha: false } }

  if (ehEmailProtegido(de)) {
    return { ok: false, error: 'Este e-mail é protegido e não pode ser alterado.' }
  }

  if (!emailValido(para)) {
    return { ok: false, error: 'Informe um e-mail válido.' }
  }

  if (ehEmailProtegido(para)) {
    return { ok: false, error: 'Este e-mail é reservado para uso institucional da plataforma.' }
  }

  const s = await getState()
  if (s.users[para]) {
    return { ok: false, error: 'Já existe uma conta com este e-mail.' }
  }

  const porta = portaDeIdentidadeDoAmbiente()
  if (porta.configurada) {
    const existenteAuth = await porta.buscar(para).catch(() => null)
    if (existenteAuth) {
      return { ok: false, error: 'Já existe uma conta com este e-mail.' }
    }
    const identAtual = await porta.buscar(de).catch(() => null)
    const ehGoogle = identAtual?.provedores.includes('google') ?? false
    return { ok: true, data: { requerSenha: ehGoogle } }
  }

  // Contingência sem Supabase Auth: conta sem senha definida é tratada como Google
  const u = s.users[de]
  const semSenha = !u?.pass && !(de in ACCOUNTS)
  return { ok: true, data: { requerSenha: semSenha } }
}

/**
 * Atualiza os dados cadastrais (nome e opcionalmente e-mail).
 *
 * Se o e-mail mudar:
 *  1. Valida proteções institucionais e unicidade;
 *  2. Se a conta usava Google, exige definição de senha e desvincula o Google;
 *  3. Atualiza o e-mail no Supabase Auth;
 *  4. Atualiza o registro em cascata no banco de dados / estado em memória;
 *  5. Atualiza o cookie de sessão para manter a pessoa conectada.
 */
export async function updatePersonal(
  nome: string,
  novoEmail?: string,
  senha?: string,
): Promise<ActionResult<{ emailAlterado: boolean; novoEmail?: string }>> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  const nv = nome.trim()
  if (nv.length < 2) return { ok: false, error: 'Informe um nome válido.' }

  const de = normalizarEmail(email)
  const para = novoEmail ? normalizarEmail(novoEmail) : de
  const mudouEmail = para !== de

  if (!mudouEmail) {
    try {
      const { result } = await mutateState<ActionResult<{ emailAlterado: boolean }>>((s) => {
        const u = s.users[de]
        if (!u) return { ok: false, error: SESSAO_EXPIRADA }
        u.name = nv
        return { ok: true, message: 'Dados pessoais atualizados.', data: { emailAlterado: false } }
      })
      return result
    } catch {
      return { ok: false, error: FALHA_GRAVACAO }
    }
  }

  // Mudança de e-mail
  if (ehEmailProtegido(de)) {
    return { ok: false, error: 'Este e-mail é protegido e não pode ser alterado.' }
  }
  if (!emailValido(para)) {
    return { ok: false, error: 'Informe um e-mail válido.' }
  }
  if (ehEmailProtegido(para)) {
    return { ok: false, error: 'Este e-mail é reservado para uso institucional da plataforma.' }
  }

  const s = await getState()
  if (s.users[para]) {
    return { ok: false, error: 'Já existe uma conta com este e-mail.' }
  }

  const porta = portaDeIdentidadeDoAmbiente()
  let ehGoogle = false
  let identidadeId: string | null = null

  if (porta.configurada) {
    const existenteAuth = await porta.buscar(para).catch(() => null)
    if (existenteAuth) {
      return { ok: false, error: 'Já existe uma conta com este e-mail.' }
    }
    const identAtual = await porta.buscar(de).catch(() => null)
    if (identAtual) {
      identidadeId = identAtual.id
      ehGoogle = identAtual.provedores.includes('google')
    }
  } else {
    const u = s.users[de]
    ehGoogle = !u?.pass && !(de in ACCOUNTS)
  }

  if (ehGoogle) {
    if (!senha || senha.length < 8) {
      return { ok: false, error: 'A nova senha precisa de pelo menos 8 caracteres.' }
    }
  }

  // Atualiza no Supabase Auth se configurado
  if (porta.configurada && identidadeId) {
    const resp = await porta.atualizarLogin(identidadeId, {
      email: para,
      senha: senha ? senha : undefined,
      removerVinculoGoogle: ehGoogle,
    })
    if (!resp.ok) {
      return { ok: false, error: resp.erro }
    }
  }

  // Atualiza no banco de dados e/ou estado da aplicação
  try {
    if (bancoConfigurado()) {
      await executarNoBanco(async (tx) => {
        await renomearEmailUsuarioNoBanco(tx, de, para, nv, senha)
      })
    } else {
      await mutateState((st) => {
        renomearEmailNoAppState(st, de, para, nv, senha)
      })
    }

    // Atualiza o cookie de sessão para manter o usuário conectado com o novo e-mail
    await setSession(para)

    return {
      ok: true,
      message: 'Dados pessoais atualizados com sucesso.',
      data: { emailAlterado: true, novoEmail: para },
    }
  } catch (err) {
    console.error('[account] erro ao renomear e-mail:', err)
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

/*
 * `deposit()` FOI REMOVIDA EM 20/09/2026, e é bom saber que ela existiu.
 *
 * Era uma Server Action que somava um número ao saldo da própria conta, sem
 * pagamento nenhum, até o teto de DEPOSITO_MAX (R$ 100.000 por operação). Num
 * ambiente de teste fechado era o jeito de dar dinheiro às sete contas de sócios
 * para exercitar o mercado. Publicada no domínio oficial, virou a pior porta da
 * plataforma: qualquer pessoa logada criava saldo do nada, comprava moeda de
 * verdade no marketplace e pedia saque contra a conta real da empresa.
 *
 * A tela já não a chamava — o botão de depósito usa `iniciarDeposito`
 * (src/server/actions/payments.ts), que abre Pix ou Checkout Pro no Mercado
 * Pago. Mas um arquivo com 'use server' no topo publica TODA função exportada
 * como endpoint, então código morto aqui continuava sendo uma porta aberta.
 *
 * Saldo agora entra por um caminho só: pagamento confirmado pelo webhook, que
 * `src/server/payments/conciliacao.ts` credita depois de conferir a assinatura.
 * Não recriar esta função nem uma variante dela.
 */

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

/**
 * Payload de entrada para preenchimento do cadastro formal progressivo (sessão B-1 / B-2).
 */
export interface CadastroInput {
  cpf: string
  nomeCompleto: string
  dataNascimento: string // YYYY-MM-DD
  telefone: string
  endereco: {
    logradouro: string
    numero: string
    complemento?: string
    bairro: string
    cidade: string
    uf: string
    cep: string
  }
  dadosBancarios: {
    chavePix?: string
    tipoChavePix?: 'cpf' | 'email' | 'telefone' | 'aleatoria'
    banco?: string
    agencia?: string
    conta?: string
    tipoConta?: 'corrente' | 'poupanca'
  }
}

/**
 * Salva ou atualiza o cadastro formal progressivo do usuário autenticado (sessão B-1).
 *
 * Exigido no primeiro movimento de dinheiro (depósito, compra direta, saque).
 * Não pede upload de documento nem biometria (dispensados pelo jurídico).
 */
export async function salvarCadastro(input: CadastroInput): Promise<ActionResult> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  if (!input) return { ok: false, error: 'Dados cadastrais não informados.' }

  if (!validarCpf(input.cpf)) {
    return { ok: false, error: 'CPF inválido.' }
  }

  const nomeCompleto = (input.nomeCompleto || '').trim()
  if (nomeCompleto.length < 3) {
    return { ok: false, error: 'Informe seu nome completo.' }
  }

  const dataNascimento = (input.dataNascimento || '').trim()
  if (!dataNascimento || !/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) {
    return { ok: false, error: 'Data de nascimento inválida (use o formato AAAA-MM-DD).' }
  }

  const telefone = (input.telefone || '').replace(/\D/g, '')
  if (telefone.length < 10 || telefone.length > 11) {
    return { ok: false, error: 'Informe um telefone válido com DDD (10 ou 11 dígitos).' }
  }

  const end = input.endereco
  if (
    !end ||
    !end.logradouro?.trim() ||
    !end.numero?.trim() ||
    !end.bairro?.trim() ||
    !end.cidade?.trim() ||
    !end.uf?.trim() ||
    !end.cep?.trim()
  ) {
    return { ok: false, error: 'Endereço incompleto. Preencha todos os campos obrigatórios.' }
  }

  const cep = end.cep.replace(/\D/g, '')
  if (cep.length !== 8) {
    return { ok: false, error: 'CEP inválido (deve conter 8 dígitos).' }
  }

  const db = input.dadosBancarios
  const temPix = Boolean(db?.chavePix?.trim() && db?.tipoChavePix)
  const temConta = Boolean(db?.banco?.trim() && db?.agencia?.trim() && db?.conta?.trim() && db?.tipoConta)
  if (!temPix && !temConta) {
    return {
      ok: false,
      error: 'Informe uma chave Pix válida ou os dados bancários completos para recebimento.',
    }
  }

  try {
    const { result } = await mutateState<ActionResult>((s) => {
      const u = s.users[email]
      if (!u) return { ok: false, error: SESSAO_EXPIRADA }

      const cadastroAtualizado: Cadastro = {
        cpf: limparCpf(input.cpf),
        nomeCompleto,
        dataNascimento,
        telefone,
        endereco: {
          logradouro: end.logradouro.trim(),
          numero: end.numero.trim(),
          complemento: end.complemento?.trim() || undefined,
          bairro: end.bairro.trim(),
          cidade: end.cidade.trim(),
          uf: end.uf.trim().toUpperCase(),
          cep,
        },
        dadosBancarios: {
          chavePix: db?.chavePix?.trim() || undefined,
          tipoChavePix: db?.tipoChavePix,
          banco: db?.banco?.trim() || undefined,
          agencia: db?.agencia?.trim() || undefined,
          conta: db?.conta?.trim() || undefined,
          tipoConta: db?.tipoConta,
        },
        completadoEm: Date.now(),
        confirmadoEm: Date.now(),
      }

      u.cadastro = cadastroAtualizado
      return {
        ok: true,
        message: 'Cadastro concluído com sucesso.',
      }
    })
    return result
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

/**
 * Consulta os dados cadastrais do usuário autenticado.
 */
export async function obterCadastro(): Promise<ActionResult<Cadastro | null>> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  try {
    const s = await getState()
    const u = s.users[email]
    if (!u) return { ok: false, error: SESSAO_EXPIRADA }
    return { ok: true, data: u.cadastro ?? null }
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

/* ============================================================================
 * SAQUE DE RECURSOS (Sessão B-4, Bloco 7b do Plano Executivo)
 * ==========================================================================*/

export interface SolicitacaoSaqueResult {
  saqueId: string
  valorTotal: Cents
  taxa: Cents
  valorLiquido: Cents
  previsaoPagamento: string
}

/**
 * Solicita o saque de saldo disponível para a conta bancária/Pix cadastrada.
 *
 * Travas e regras:
 * 1. Exige dados bancários ou chave Pix confirmados (`temDadosBancarios(u)`).
 *    Sem eles, o prazo D+3 não começa a contar.
 * 2. Taxa fixa de R$ 5,00 debitada do valor sacado (`TAXA_SAQUE_FIXA_CENTS = 500`).
 * 3. Valor mínimo de R$ 5,01 para cobrir a tarifa.
 * 4. Valida saldo suficiente (`user.balance >= valorCents`).
 * 5. Debita o saldo imediatamente e registra a solicitação com prazo D+3 (72h).
 * 6. Lançamento no ledger + auditoria na mesma transação atômica.
 */
export async function solicitarSaque(
  valorCents: number,
): Promise<ActionResult<SolicitacaoSaqueResult>> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  // A tarifa vem da Tabela de Taxas vigente (C3); sem banco, é TAXA_SAQUE_FIXA_CENTS.
  const { taxas } = await carregarRegrasDoMercado()
  const tarifaSaque = taxas.taxaSaqueFixa
  if (!Number.isInteger(valorCents) || valorCents <= tarifaSaque) {
    return {
      ok: false,
      // O mínimo sai com espaço comum depois do "R$", como o texto fixo que existia antes da C3.
      error: `O valor mínimo para saque é de ${brl(tarifaSaque + 1).replace(/\s/g, ' ')} (para cobrir a tarifa fixa de ${brl(tarifaSaque)}).`,
    }
  }

  try {
    const { result } = await mutateState<ActionResult<SolicitacaoSaqueResult>>((s) => {
      const u = s.users[email]
      if (!u) return { ok: false, error: SESSAO_EXPIRADA }

      if (!temDadosBancarios(u)) {
        return {
          ok: false,
          error:
            'Dados bancários para recebimento não cadastrados ou incompletos. Sem eles, o prazo D+3 não começa a contar.',
        }
      }

      if (u.balance < valorCents) {
        return { ok: false, error: 'Saldo insuficiente para saque.' }
      }

      const agora = Date.now()
      const taxa = tarifaSaque
      const valorLiquido = valorCents - taxa
      const prazo = calcularDataLimiteSaque(agora, PRAZO_SAQUE_DIAS)
      const saqueId = `SAQ-${agora}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

      const saque: Saque = {
        id: saqueId,
        userEmail: email,
        valorTotal: valorCents,
        taxa,
        valorLiquido,
        dadosBancarios: structuredClone(u.cadastro!.dadosBancarios),
        status: 'solicitado',
        criadoEm: agora,
        previsaoPagamentoEm: prazo.timestamp,
        atualizadoEm: agora,
      }

      u.balance -= valorCents
      if (!Array.isArray(s.saques)) s.saques = []
      s.saques.push(saque)

      return {
        ok: true,
        data: {
          saqueId,
          valorTotal: valorCents,
          taxa,
          valorLiquido,
          previsaoPagamento: prazo.formatada,
        },
        message: `Solicitação de saque registrada com sucesso. Previsão de crédito até ${prazo.formatada} (prazo D+3).`,
      }
    })

    return result
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

/**
 * Lista o histórico de saques do usuário logado, ordenado do mais recente para o mais antigo.
 */
export async function listarMeusSaques(): Promise<ActionResult<Saque[]>> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  try {
    const s = await getState()
    const saques = (s.saques ?? [])
      .filter((sq) => sq.userEmail === email)
      .sort((a, b) => b.criadoEm - a.criadoEm)
    return { ok: true, data: saques }
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

/**
 * Marca um saque como liquidado/pago (gesto do sócio na liquidação manual RA-30).
 */
export async function confirmarLiquidacaoSaque(
  saqueId: string,
  comprovanteRef?: string,
): Promise<ActionResult> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  try {
    const { result } = await mutateState<ActionResult>((s) => {
      const saques = s.saques ?? []
      const saque = saques.find((sq) => sq.id === saqueId)
      if (!saque) return { ok: false, error: 'Solicitação de saque não encontrada.' }

      if (saque.status === 'pago') {
        return { ok: false, error: 'Este saque já foi liquidado.' }
      }
      if (saque.status === 'falhou') {
        return { ok: false, error: 'Não é possível liquidar um saque marcado como falho.' }
      }

      const agora = Date.now()
      saque.status = 'pago'
      saque.pagoEm = agora
      saque.atualizadoEm = agora
      if (comprovanteRef?.trim()) {
        saque.comprovanteRef = comprovanteRef.trim()
      }

      return {
        ok: true,
        message: `Saque ${saqueId} marcado como pago com sucesso.`,
      }
    })

    return result
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

/**
 * Rejeita ou marca um saque como falho, estornando o valor total para o saldo do usuário.
 */
export async function rejeitarSaque(
  saqueId: string,
  motivo: string,
): Promise<ActionResult> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  if (!motivo?.trim()) {
    return { ok: false, error: 'Informe o motivo da recusa do saque.' }
  }

  try {
    const { result } = await mutateState<ActionResult>((s) => {
      const saques = s.saques ?? []
      const saque = saques.find((sq) => sq.id === saqueId)
      if (!saque) return { ok: false, error: 'Solicitação de saque não encontrada.' }

      if (saque.status === 'pago') {
        return { ok: false, error: 'Não é possível recusar um saque já pago.' }
      }
      if (saque.status === 'falhou') {
        return { ok: false, error: 'Este saque já foi marcado como falho.' }
      }

      const agora = Date.now()
      saque.status = 'falhou'
      saque.motivoFalha = motivo.trim()
      saque.atualizadoEm = agora

      // Estorna o valor debitado de volta para o saldo da conta do usuário
      const u = s.users[saque.userEmail]
      if (u) {
        u.balance += saque.valorTotal
      }

      return {
        ok: true,
        message: `Saque ${saqueId} cancelado/recusado. O saldo de ${brl(saque.valorTotal)} foi estornado para o cliente.`,
      }
    })

    return result
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}


