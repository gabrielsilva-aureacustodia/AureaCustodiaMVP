/**
 * Administração de usuários — as regras puras da lista, da ficha e das ações do painel
 * (frente C, C2; plano do Admin, seção 2.6).
 *
 * O PAINEL NÃO REIMPLEMENTA REGRA DE OUTRA FRENTE. O que diz se o cadastro está completo
 * é `temCadastroCompleto` (src/domain/cadastro.ts); quem diz se a conta está inadimplente é
 * `isInadimplente` (src/domain/custody.ts); o ajuste de saldo vira o lançamento `ajuste`
 * que src/server/db/derivar.ts já deriva de toda variação de saldo sem negociação. Este
 * arquivo só decide o que é próprio do painel: a busca, os filtros, o formato do que o
 * atendente digitou e as recusas que protegem o dado.
 *
 * AS RECUSAS SÃO DE DADO, NÃO DE FLUXO. O painel edita "qualquer campo, inclusive CPF e
 * dados bancários" — um CPF que não confere com os dígitos verificadores é gravado, com
 * aviso. O que se recusa é o que corromperia a gravação: saldo negativo (a coluna tem
 * CHECK) e cadastro sem os quatro campos que a leitura do banco exige para remontá-lo
 * (src/server/db/repositories/users.ts descarta o cadastro inteiro se faltar um).
 */

import { cpfValido, temCadastroCompleto } from '@/domain/cadastro'
import { isInadimplente, verificarStatusFatura } from '@/domain/custody'
import type {
  AppState,
  Cadastro,
  Cents,
  DadosBancarios,
  Endereco,
  EtapaEnvio,
  Retirada,
  StatusRecibo,
  StatusRetirada,
  TipoChavePix,
  TipoContaBancaria,
  Timestamp,
  UserEmail,
} from '@/domain/types'

import { LANCAMENTO_MAX, type Validacao } from './contabil'
import { primeiroValor, type ParametrosDaUrl } from './periodo'
import { emailValido, normalizarEmail } from './permissoes'

/* ---------- a situação da conta (ativar e desativar) ---------- */

export interface SituacaoConta {
  ativa: boolean
  motivo: string
  autor: string | null
  em: Timestamp | null
}

/** Sem registro nenhum, a conta está ativa — é o estado de toda conta até alguém mudar. */
export const CONTA_ATIVA: SituacaoConta = { ativa: true, motivo: '', autor: null, em: null }

/* ---------- a lista ---------- */

export interface LinhaUsuario {
  email: UserEmail
  nome: string
  cpf: string | null
  telefone: string | null
  saldo: Cents
  /** Moedas com recibo que não foi extinto — as que estão na custódia. */
  moedas: number
  comCadastro: boolean
  inadimplente: boolean
  /** Do lançamento de abertura no ledger; `null` sem banco. */
  criadoEm: Timestamp | null
  ultimoAcesso: Timestamp | null
  ativa: boolean
}

export interface FiltroUsuarios {
  busca: string
  cadastro: 'com' | 'sem' | null
  inadimplente: boolean
  comSaldo: boolean
  comMoeda: boolean
  /** 'aaaa-mm-dd', como o `<input type="date">` manda e a URL guarda. */
  criadoDe: string | null
  criadoAte: string | null
}

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/

/** O filtro mora na URL: `?busca=&cadastro=com|sem&inadimplente=1&saldo=1&moeda=1&de=&ate=`. */
export function lerFiltroUsuarios(params: ParametrosDaUrl): FiltroUsuarios {
  const cadastro = primeiroValor(params.cadastro)
  const de = primeiroValor(params.de)
  const ate = primeiroValor(params.ate)
  return {
    busca: (primeiroValor(params.busca) ?? '').trim().slice(0, 100),
    cadastro: cadastro === 'com' || cadastro === 'sem' ? cadastro : null,
    inadimplente: primeiroValor(params.inadimplente) === '1',
    comSaldo: primeiroValor(params.saldo) === '1',
    comMoeda: primeiroValor(params.moeda) === '1',
    criadoDe: de && DATA_ISO.test(de) ? de : null,
    criadoAte: ate && DATA_ISO.test(ate) ? ate : null,
  }
}

/**
 * 'aaaa-mm-dd' → o primeiro milissegundo daquele dia em Brasília. O Brasil não tem horário
 * de verão desde 2019, então o fuso é UTC−3 o ano inteiro — e o servidor da Vercel, que
 * roda em UTC, chega ao mesmo instante que o navegador de quem filtrou.
 */
export function inicioDoDiaEmBrasilia(iso: string): Timestamp | null {
  const m = DATA_ISO.exec(iso) ? iso.split('-').map(Number) : null
  if (!m) return null
  const [ano, mes, dia] = m
  const t = Date.UTC(ano, mes - 1, dia, 3, 0, 0)
  const d = new Date(t - 3 * 3_600_000)
  if (d.getUTCFullYear() !== ano || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null
  return t
}

export function linhasDeUsuarios(
  state: AppState,
  criacao: Readonly<Record<UserEmail, Timestamp>>,
  inativas: ReadonlySet<UserEmail>,
  agora: Timestamp,
): LinhaUsuario[] {
  const faturas = state.faturasCustodia ?? []
  return Object.entries(state.users).map(([email, u]) => ({
    email,
    nome: u.name,
    cpf: u.cadastro?.cpf ?? null,
    telefone: u.cadastro?.telefone ?? null,
    saldo: u.balance,
    moedas: u.coins.filter((c) => c.recibo.status !== 'Extinto').length,
    comCadastro: temCadastroCompleto(u),
    // A marca manual do painel OU fatura vencida — a regra da fatura é da frente B.
    inadimplente: Boolean(u.inadimplente) || isInadimplente(u, faturas.filter((f) => f.userEmail === email), agora),
    criadoEm: criacao[email] ?? null,
    ultimoAcesso: u.lastAccess ?? null,
    ativa: !inativas.has(email),
  }))
}

export function filtrarUsuarios(linhas: readonly LinhaUsuario[], f: FiltroUsuarios): LinhaUsuario[] {
  const texto = f.busca.toLowerCase()
  const digitos = f.busca.replace(/\D/g, '')
  const de = f.criadoDe ? inicioDoDiaEmBrasilia(f.criadoDe) : null
  const fimDoDia = f.criadoAte ? inicioDoDiaEmBrasilia(f.criadoAte) : null
  const ate = fimDoDia === null ? null : fimDoDia + 86_400_000

  return linhas
    .filter((l) => {
      if (texto) {
        const porTexto = l.nome.toLowerCase().includes(texto) || l.email.includes(texto)
        // CPF só pelos dígitos, e só com 3 ou mais: '1' acharia metade da base.
        const porCpf = digitos.length >= 3 && (l.cpf ?? '').includes(digitos)
        if (!porTexto && !porCpf) return false
      }
      if (f.cadastro === 'com' && !l.comCadastro) return false
      if (f.cadastro === 'sem' && l.comCadastro) return false
      if (f.inadimplente && !l.inadimplente) return false
      if (f.comSaldo && l.saldo <= 0) return false
      if (f.comMoeda && l.moedas <= 0) return false
      // Sem data de criação conhecida (ambiente sem banco), o filtro de período não esconde a conta.
      if (de !== null && l.criadoEm !== null && l.criadoEm < de) return false
      if (ate !== null && l.criadoEm !== null && l.criadoEm >= ate) return false
      return true
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

/* ---------- criar ---------- */

export interface NovoUsuario {
  email: UserEmail
  nome: string
  /** Senha provisória para o Supabase Auth; `null` = a pessoa define pelo link. */
  senha: string | null
  demonstracao: boolean
}

export function validarNovoUsuario(
  entrada: { email: unknown; nome: unknown; senha: unknown; demonstracao: unknown },
  existentes: Readonly<Record<string, unknown>>,
): Validacao<NovoUsuario> {
  const email = typeof entrada.email === 'string' ? normalizarEmail(entrada.email) : ''
  if (!emailValido(email)) return { ok: false, erro: 'Informe um e-mail válido.' }
  if (email in existentes) return { ok: false, erro: 'Já existe uma conta com este e-mail.' }
  const nome = typeof entrada.nome === 'string' ? entrada.nome.trim() : ''
  // O mesmo mínimo do "Salvar dados pessoais" da conta (src/server/actions/account.ts).
  if (nome.length < 2) return { ok: false, erro: 'O nome precisa de pelo menos 2 caracteres.' }
  // A senha não é validada aqui: quem valida é o Supabase, e a mensagem dele é mais
  // precisa do que a nossa (RA-18).
  const senha = typeof entrada.senha === 'string' && entrada.senha.length > 0 ? entrada.senha : null
  return { ok: true, valor: { email, nome: nome.slice(0, 120), senha, demonstracao: entrada.demonstracao === true } }
}

/* ---------- editar cadastro ---------- */

export interface EntradaCadastro {
  nome: unknown
  cpf: unknown
  nomeCompleto: unknown
  dataNascimento: unknown
  telefone: unknown
  endereco: unknown
}

export interface CadastroMontado {
  nome: string
  cadastro: Cadastro
  avisos: string[]
}

function texto(v: unknown, max = 200): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

function enderecoDe(v: unknown): Endereco {
  const e = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
  const complemento = texto(e.complemento)
  return {
    logradouro: texto(e.logradouro),
    numero: texto(e.numero, 20),
    ...(complemento ? { complemento } : {}),
    bairro: texto(e.bairro),
    cidade: texto(e.cidade),
    uf: texto(e.uf, 2).toUpperCase(),
    cep: texto(e.cep, 20).replace(/\D/g, ''),
  }
}

/**
 * Monta o cadastro que o painel grava. Os dados bancários NÃO vêm por aqui: têm permissão
 * própria (`usuarios.dados_bancarios`) e ação própria, e o cadastro montado preserva os que
 * já existem.
 */
export function montarCadastroDoPainel(entrada: EntradaCadastro, atual: Cadastro | undefined, agora: Timestamp): Validacao<CadastroMontado> {
  const nome = texto(entrada.nome, 120)
  if (nome.length < 2) return { ok: false, erro: 'O nome de exibição precisa de pelo menos 2 caracteres.' }

  const cpf = texto(entrada.cpf, 20).replace(/\D/g, '')
  const nomeCompleto = texto(entrada.nomeCompleto)
  const dataNascimento = texto(entrada.dataNascimento, 10)
  const telefone = texto(entrada.telefone, 30).replace(/\D/g, '')
  if (!cpf || !nomeCompleto || !dataNascimento || !telefone) {
    return {
      ok: false,
      erro: 'CPF, nome completo, data de nascimento e telefone precisam estar preenchidos: o cadastro é gravado inteiro.',
    }
  }
  if (!DATA_ISO.test(dataNascimento)) return { ok: false, erro: 'Data de nascimento no formato AAAA-MM-DD.' }

  const cadastro: Cadastro = {
    cpf,
    nomeCompleto,
    dataNascimento,
    telefone,
    endereco: enderecoDe(entrada.endereco),
    dadosBancarios: atual?.dadosBancarios ?? {},
    completadoEm: atual?.completadoEm ?? agora,
    ...(atual?.confirmadoEm !== undefined ? { confirmadoEm: atual.confirmadoEm } : {}),
  }

  const avisos: string[] = []
  if (!cpfValido(cpf)) avisos.push('o CPF não confere com os dígitos verificadores')
  if (telefone.length < 10 || telefone.length > 11) avisos.push('o telefone não tem DDD e número (10 ou 11 dígitos)')
  if (!temCadastroCompleto({ cadastro })) avisos.push('com estes dados o cadastro não libera depósito, compra e saque')
  return { ok: true, valor: { nome, cadastro, avisos } }
}

const TIPOS_PIX: readonly TipoChavePix[] = ['cpf', 'email', 'telefone', 'aleatoria']
const TIPOS_CONTA: readonly TipoContaBancaria[] = ['corrente', 'poupanca']

export function montarDadosBancarios(entrada: unknown): Validacao<DadosBancarios> {
  const e = (entrada && typeof entrada === 'object' ? entrada : {}) as Record<string, unknown>
  const chavePix = texto(e.chavePix)
  const tipoChavePix = TIPOS_PIX.find((t) => t === e.tipoChavePix)
  if (chavePix && !tipoChavePix) return { ok: false, erro: 'Escolha o tipo da chave Pix.' }
  const banco = texto(e.banco, 120)
  const agencia = texto(e.agencia, 20)
  const conta = texto(e.conta, 30)
  const tipoConta = TIPOS_CONTA.find((t) => t === e.tipoConta)
  const dados: DadosBancarios = {}
  if (chavePix) {
    dados.chavePix = chavePix
    dados.tipoChavePix = tipoChavePix
  }
  if (banco) dados.banco = banco
  if (agencia) dados.agencia = agencia
  if (conta) dados.conta = conta
  if (tipoConta && (banco || agencia || conta)) dados.tipoConta = tipoConta
  return { ok: true, valor: dados }
}

/* ---------- ajuste de saldo ---------- */

export type SentidoAjuste = 'credito' | 'debito'

export interface AjusteValidado {
  /** Com sinal: positivo credita, negativo debita. */
  delta: Cents
  saldoDepois: Cents
  motivo: string
}

/**
 * O ajuste pede MOTIVO porque ele é a única variação de saldo que não se explica sozinha:
 * negociação, depósito e saque carregam a própria referência no ledger, e o ajuste só tem
 * a linha `admin.usuarios.ajustar_saldo` para dizer por quê.
 */
export function validarAjusteDeSaldo(saldoAtual: Cents, valor: unknown, sentido: unknown, motivo: unknown): Validacao<AjusteValidado> {
  if (sentido !== 'credito' && sentido !== 'debito') return { ok: false, erro: 'Escolha se o ajuste credita ou debita.' }
  if (typeof valor !== 'number' || !Number.isSafeInteger(valor) || valor <= 0) return { ok: false, erro: 'Informe um valor maior que zero.' }
  if (valor > LANCAMENTO_MAX) return { ok: false, erro: 'Valor acima de R$ 10.000.000,00 — confira os zeros.' }
  const m = texto(motivo, 500)
  if (m.length < 3) return { ok: false, erro: 'Escreva o motivo do ajuste: é ele que explica o lançamento no livro-razão.' }
  const delta = sentido === 'credito' ? valor : -valor
  const saldoDepois = saldoAtual + delta
  if (saldoDepois < 0) return { ok: false, erro: 'O débito deixaria o saldo negativo.' }
  return { ok: true, valor: { delta, saldoDepois, motivo: m } }
}

/* ---------- motivo curto (situação, inadimplência) ---------- */

export function motivoOpcional(v: unknown): string {
  return texto(v, 500)
}

/* ---------- o resumo da conta: o cartão do CS e o topo da ficha ---------- */

const RETIRADA_ENCERRADA: readonly StatusRetirada[] = ['entregue', 'cancelada']

export interface ResumoConta {
  email: UserEmail
  nome: string
  telefone: string | null
  saldo: Cents
  moedasCustodiadas: number
  recibosBloqueados: number
  enviosEmAndamento: Array<{ protocolo: string; etapa: EtapaEnvio; tipoMoeda: string; quantidade: number; codigoRastreio: string | null }>
  faturasEmAberto: Array<{ id: string; competencia: string; valor: Cents; vencimento: Timestamp; atrasada: boolean }>
  valorEmAberto: Cents
  retiradasEmCurso: Array<{ id: string; coinId: string; status: StatusRetirada; modalidade: string }>
  ultimoAcesso: Timestamp | null
  acessoAnterior: Timestamp | null
  comCadastro: boolean
  /** Marca manual do painel ou fatura vencida. */
  inadimplente: boolean
  marcaManual: boolean
}

/**
 * O que o atendente precisa ver ao lado da conversa (plano do Admin, seção 2.5): saldo,
 * moedas, envios em andamento com a etapa, faturas em aberto, retiradas e últimos acessos.
 * As retiradas vêm de fora do AppState (src/server/shipping/retiradas.ts) e chegam prontas.
 */
export function resumirConta(state: AppState, email: UserEmail, retiradas: readonly Retirada[], agora: Timestamp): ResumoConta | null {
  const u = state.users[email]
  if (!u) return null
  const faturas = (state.faturasCustodia ?? []).filter((f) => f.userEmail === email)
  const abertas = faturas
    .map((f) => ({ f, situacao: verificarStatusFatura(f, agora) }))
    .filter(({ situacao }) => situacao === 'pendente' || situacao === 'atrasada')
  const naCustodia = u.coins.filter((c) => c.recibo.status !== 'Extinto')
  return {
    email,
    nome: u.name,
    telefone: u.cadastro?.telefone ?? null,
    saldo: u.balance,
    moedasCustodiadas: naCustodia.length,
    recibosBloqueados: naCustodia.filter((c) => c.recibo.status === 'Bloqueado').length,
    enviosEmAndamento: state.envios
      .filter((e) => e.userEmail === email && e.etapaAtual !== 'Recibo emitido')
      .map((e) => ({ protocolo: e.protocolo, etapa: e.etapaAtual, tipoMoeda: e.tipoMoeda, quantidade: e.quantidade, codigoRastreio: e.codigoRastreio })),
    faturasEmAberto: abertas.map(({ f, situacao }) => ({ id: f.id, competencia: f.competencia, valor: f.valorCents, vencimento: f.dataVencimento, atrasada: situacao === 'atrasada' })),
    valorEmAberto: abertas.reduce((s, { f }) => s + f.valorCents, 0),
    retiradasEmCurso: retiradas
      .filter((r) => r.userEmail === email && !RETIRADA_ENCERRADA.includes(r.status))
      .map((r) => ({ id: r.id, coinId: r.coinId, status: r.status, modalidade: r.modalidade })),
    ultimoAcesso: u.lastAccess ?? null,
    acessoAnterior: u.prevAccess ?? null,
    comCadastro: temCadastroCompleto(u),
    inadimplente: Boolean(u.inadimplente) || isInadimplente(u, faturas, agora),
    marcaManual: Boolean(u.inadimplente),
  }
}

/* ---------- o acervo da conta ---------- */

export interface MoedaDoAcervo {
  id: string
  tipoMoeda: string
  ano: number
  statusFisico: string
  valorEstimado: Cents
  protocoloEnvio: string
  entrada: string
  transferida: boolean
  recibo: { codigo: string; hash: string; status: StatusRecibo; dataEmissao: string }
  /** O laudo que aprovou a moeda — de onde vêm caixa, posição e o hash da corrente. */
  analise: { protocolo: string; caixa: string | null; posicao: number | null; pesoMg: number; operador: string; validadoEm: Timestamp; hash: string } | null
  retirada: { id: string; status: StatusRetirada } | null
}

export function acervoDaConta(state: AppState, email: UserEmail, retiradas: readonly Retirada[]): MoedaDoAcervo[] {
  const u = state.users[email]
  if (!u) return []
  return u.coins.map((c) => {
    // A lista de análises é append-only; a última aprovação da moeda é a que vale.
    const analise = [...state.analises].reverse().find((a) => a.codigoMoeda === c.id && a.veredito === 'aprovada') ?? null
    const retirada = retiradas.find((r) => r.coinId === c.id && r.status !== 'cancelada') ?? null
    return {
      id: c.id,
      tipoMoeda: c.tipoMoeda,
      ano: c.ano,
      statusFisico: c.statusFisico,
      valorEstimado: c.valorEstimado,
      protocoloEnvio: c.protocolo,
      entrada: c.entrada,
      transferida: Boolean(c.transferido),
      recibo: { codigo: c.recibo.codigo, hash: c.recibo.hash, status: c.recibo.status, dataEmissao: c.recibo.dataEmissao },
      analise: analise
        ? { protocolo: analise.protocolo, caixa: analise.caixa, posicao: analise.posicao, pesoMg: analise.pesoMg, operador: analise.operador, validadoEm: analise.validadoEm, hash: analise.hash }
        : null,
      retirada: retirada ? { id: retirada.id, status: retirada.status } : null,
    }
  })
}
