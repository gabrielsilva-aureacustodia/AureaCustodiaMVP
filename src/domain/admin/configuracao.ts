/**
 * A configuração do site editável pelo painel — o catálogo das chaves, a leitura do que foi
 * digitado e a montagem dos valores vigentes (frente C, C3 — plano do Admin, 3.1 a 3.3).
 *
 * O CÓDIGO É O PADRÃO, O BANCO É A VERDADE. Cada chave nasce com o valor que o código já usa —
 * `TAXAS_PADRAO`, `DEPOSITO_MAX`, `SYNC_MS`, `PARAMETROS_LEGAIS` — e só passa a valer outra coisa
 * quando alguém muda pelo painel e a linha entra em `aurea.config_plataforma` (migration 024). Um
 * valor gravado que não passa na validação daqui é ignorado e cai no padrão: um banco editado à mão
 * com lixo não pode zerar a comissão.
 *
 * AS CHAVES DE TAXA SÃO OS CAMPOS DE `TabelaDeTaxas`, UM PARA UM (tabela 6.1 do plano de
 * finalizações). Não existe "fee_pct" separado do lado do comprador: a A1 separou comprador e
 * vendedor, e a configuração segue a tabela dela.
 *
 * NENHUMA TRAVA. O intervalo de cada chave é anteparo de digitação — um zero a mais digitado sem
 * querer —, não política comercial. Comissão zero é aceita.
 *
 * Regra pura: sem I/O. O relógio entra por parâmetro.
 */

import { COIN_TYPES, SYNC_MS, DEPOSITO_MAX } from '@/domain/constants'
import { PARAMETROS_LEGAIS } from '@/domain/documentos-legais/parametros'
import { comissaoPorMoeda, TAXAS_PADRAO, type TabelaDeTaxas } from '@/domain/fees'
import { brl } from '@/domain/money'
import type { Cents, CoinType } from '@/domain/types'

import type { PrazosLogistica } from './logistica'
import { emailValido } from './permissoes'
import { formatarTelefoneE164, normalizarTelefone } from './telefone'

/* ---------- o catálogo ---------- */

export type GrupoConfig = 'taxas' | 'operacional' | 'termos' | 'sac' | 'sistema'
export type TipoConfig = 'bp' | 'centavos' | 'inteiro' | 'texto'
export type FormatoTexto = 'data' | 'email' | 'telefone' | 'prazo'
export type ValorConfig = number | string

interface DefinicaoBase {
  chave: string
  grupo: GrupoConfig
  rotulo: string
  descricao: string
}

export interface DefinicaoNumero extends DefinicaoBase {
  tipo: 'bp' | 'centavos' | 'inteiro'
  padrao: number
  min: number
  max: number
  /** Sufixo de exibição do inteiro: "x", "dias". */
  unidade?: string
}

export interface DefinicaoTexto extends DefinicaoBase {
  tipo: 'texto'
  padrao: string
  formato: FormatoTexto
  /** Campo que pode ficar vazio (canal de atendimento que ainda não existe). */
  opcional?: boolean
}

export type DefinicaoConfig = DefinicaoNumero | DefinicaoTexto

const T = TAXAS_PADRAO

export const DEFINICOES_CONFIG: readonly DefinicaoConfig[] = [
  // Taxas — os campos de TabelaDeTaxas (src/domain/fees.ts), na ordem da Tabela de Taxas publicada.
  { chave: 'comissaoCompradorBp', grupo: 'taxas', tipo: 'bp', padrao: T.comissaoCompradorBp, min: 0, max: 2000, rotulo: 'Comissão de compra — percentual', descricao: 'Sobre o preço de cada moeda comprada.' },
  { chave: 'comissaoCompradorFixa', grupo: 'taxas', tipo: 'centavos', padrao: T.comissaoCompradorFixa, min: 0, max: 100_000, rotulo: 'Comissão de compra — fixa por moeda', descricao: 'Somada ao percentual, por moeda comprada.' },
  { chave: 'comissaoVendedorBp', grupo: 'taxas', tipo: 'bp', padrao: T.comissaoVendedorBp, min: 0, max: 2000, rotulo: 'Comissão de venda — percentual', descricao: 'Sobre o preço de cada moeda vendida.' },
  { chave: 'comissaoVendedorFixa', grupo: 'taxas', tipo: 'centavos', padrao: T.comissaoVendedorFixa, min: 0, max: 100_000, rotulo: 'Comissão de venda — fixa por moeda', descricao: 'Somada ao percentual, por moeda vendida.' },
  { chave: 'custodiaMensalPorMoeda', grupo: 'taxas', tipo: 'centavos', padrao: T.custodiaMensalPorMoeda, min: 0, max: 100_000, rotulo: 'Custódia — ciclo mensal, por moeda', descricao: 'Cobrada por mês de quem tem moeda guardada sem plano vigente. Não é plano: os planos são o anual e o de 24 meses.' },
  { chave: 'custodiaAnualPorMoeda', grupo: 'taxas', tipo: 'centavos', padrao: T.custodiaAnualPorMoeda, min: 0, max: 1_000_000, rotulo: 'Custódia — plano anual, por moeda', descricao: 'Valor dos 12 meses, por moeda sob guarda.' },
  { chave: 'custodiaAnualParcelasMax', grupo: 'taxas', tipo: 'inteiro', padrao: T.custodiaAnualParcelasMax, min: 1, max: 12, unidade: 'x', rotulo: 'Custódia anual — parcelas no cartão', descricao: 'Máximo de parcelas do plano anual.' },
  { chave: 'taxaSaqueFixa', grupo: 'taxas', tipo: 'centavos', padrao: T.taxaSaqueFixa, min: 0, max: 100_000, rotulo: 'Saque — tarifa fixa', descricao: 'Descontada de cada saque para conta bancária.' },
  { chave: 'taxaRetiradaComum', grupo: 'taxas', tipo: 'centavos', padrao: T.taxaRetiradaComum, min: 0, max: 1_000_000, rotulo: 'Retirada comum', descricao: 'Por envio da moeda ao cliente.' },
  { chave: 'taxaRetiradaSegura', grupo: 'taxas', tipo: 'centavos', padrao: T.taxaRetiradaSegura, min: 0, max: 1_000_000, rotulo: 'Retirada segura', descricao: 'Por envio com cobertura especial.' },
  { chave: 'retiradaSeguraParcelasMax', grupo: 'taxas', tipo: 'inteiro', padrao: T.retiradaSeguraParcelasMax, min: 1, max: 12, unidade: 'x', rotulo: 'Retirada segura — parcelas no cartão', descricao: 'Máximo de parcelas da retirada segura.' },

  // Operacional — anteparos e alertas; nada aqui entra em documento contratual.
  { chave: 'depositoMaxCents', grupo: 'operacional', tipo: 'centavos', padrao: DEPOSITO_MAX, min: 100, max: 100_000_000, rotulo: 'Limite por depósito', descricao: 'Teto de cada depósito em conta. Anteparo contra um zero a mais digitado sem querer.' },
  { chave: 'syncSegundos', grupo: 'operacional', tipo: 'inteiro', padrao: Math.round(SYNC_MS / 1000), min: 3, max: 120, unidade: 's', rotulo: 'Ciclo de sincronização', descricao: 'De quanto em quanto tempo a tela de cada cliente relê o estado da plataforma.' },
  { chave: 'prazoValidacaoDiasUteis', grupo: 'operacional', tipo: 'inteiro', padrao: 2, min: 1, max: 30, unidade: 'dia(s) útil(eis)', rotulo: 'Alerta de validação na bancada', descricao: 'Envio recebido há mais que isso, sem recibo, aparece em vermelho na logística.' },
  { chave: 'prazoTransitoEnvioDias', grupo: 'operacional', tipo: 'inteiro', padrao: 15, min: 1, max: 120, unidade: 'dias', rotulo: 'Alerta de envio em trânsito', descricao: 'Envio postado há mais que isso, sem chegar ao cofre, aparece em vermelho na logística.' },

  // Termos — mudar qualquer um publica versão nova dos Termos de Uso.
  { chave: 'termosVigencia', grupo: 'termos', tipo: 'texto', formato: 'data', padrao: PARAMETROS_LEGAIS.vigencia, rotulo: 'Entrada em vigor', descricao: 'Data que o texto dos Termos declara (dd/mm/aaaa).' },
  { chave: 'termosPrazoValidacaoCustodia', grupo: 'termos', tipo: 'texto', formato: 'prazo', padrao: PARAMETROS_LEGAIS.prazoValidacaoCustodia, rotulo: 'Prazo de validação e emissão do recibo (7.2.5)', descricao: 'Como o prazo aparece escrito na cláusula.' },
  { chave: 'termosPrazoRecebimentoVenda', grupo: 'termos', tipo: 'texto', formato: 'prazo', padrao: PARAMETROS_LEGAIS.prazoRecebimentoVenda, rotulo: 'Prazo de recebimento da venda (7.3.3)', descricao: 'Como o prazo aparece escrito na cláusula.' },
  { chave: 'termosPrazoDisponibilizacaoDeposito', grupo: 'termos', tipo: 'texto', formato: 'prazo', padrao: PARAMETROS_LEGAIS.prazoDisponibilizacaoDeposito, rotulo: 'Prazo do depósito virar saldo (7.6.2)', descricao: 'Como o prazo aparece escrito na cláusula.' },

  // Canais de atendimento — a página /suporte lê daqui. Não mudam o texto dos Termos.
  { chave: 'sacEmail', grupo: 'sac', tipo: 'texto', formato: 'email', padrao: PARAMETROS_LEGAIS.sac.email, rotulo: 'E-mail do SAC', descricao: 'Canal oficial de atendimento.' },
  { chave: 'sacWhatsapp', grupo: 'sac', tipo: 'texto', formato: 'telefone', opcional: true, padrao: '', rotulo: 'WhatsApp do SAC', descricao: 'O número do atendimento do painel (/admin/cs). Vazio = não aparece.' },
  { chave: 'sacTelefone', grupo: 'sac', tipo: 'texto', formato: 'telefone', opcional: true, padrao: '', rotulo: 'Telefone do SAC', descricao: 'Vazio = não aparece.' },

  // Sistema — gravada pelo próprio painel ao publicar a Tabela de Taxas, nunca digitada.
  { chave: 'tabelaDeTaxasVigencia', grupo: 'sistema', tipo: 'texto', formato: 'data', padrao: PARAMETROS_LEGAIS.vigencia, rotulo: 'Vigência da Tabela de Taxas', descricao: 'Data da última versão publicada pela mudança de taxa.' },
]

export type ChaveConfig = (typeof DEFINICOES_CONFIG)[number]['chave']

export function definicaoDe(chave: string): DefinicaoConfig | undefined {
  return DEFINICOES_CONFIG.find((d) => d.chave === chave)
}

export function definicoesDoGrupo(grupo: GrupoConfig): DefinicaoConfig[] {
  return DEFINICOES_CONFIG.filter((d) => d.grupo === grupo)
}

export const ROTULO_GRUPO: Record<GrupoConfig, string> = {
  taxas: 'Taxas e comissões',
  operacional: 'Operacional',
  termos: 'Parâmetros dos Termos de Uso',
  sac: 'Canais de atendimento',
  sistema: 'Sistema',
}

/** Grupos que o painel deixa editar. `sistema` é gravado pelo próprio fluxo. */
export const GRUPOS_EDITAVEIS: readonly GrupoConfig[] = ['taxas', 'operacional', 'termos', 'sac']

/* ---------- ler o que foi digitado ---------- */

export type LeituraValor = { ok: true; valor: ValorConfig } | { ok: false; erro: string }

/** "0,5" → 50 pontos-base. Até duas casas decimais de percentual. */
export function lerPercentual(texto: string): number | null {
  const t = String(texto ?? '').trim().replace('%', '').trim().replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null
  return Math.round(Number(t) * 100)
}

/** "1.234,56", "1234,56", "1234.56", "5" → centavos. Aceita zero; recusa negativo e lixo. */
export function lerReais(texto: string): number | null {
  const t = String(texto ?? '').trim().replace(/^R\$\s*/i, '')
  let normal: string
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(t) || /^\d+(,\d{1,2})?$/.test(t)) normal = t.replace(/\./g, '').replace(',', '.')
  else if (/^\d+\.\d{1,2}$/.test(t)) normal = t
  else return null
  return Math.round(Number(normal) * 100)
}

function dataValida(texto: string): boolean {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto)
  if (!m) return false
  const [d, mes, ano] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const dt = new Date(Date.UTC(ano, mes - 1, d))
  return ano >= 2000 && ano <= 2100 && dt.getUTCFullYear() === ano && dt.getUTCMonth() === mes - 1 && dt.getUTCDate() === d
}

export function lerValorDigitado(def: DefinicaoConfig, bruto: string): LeituraValor {
  const texto = String(bruto ?? '')
  if (def.tipo === 'texto') {
    const t = texto.trim()
    if (t === '') return def.opcional ? { ok: true, valor: '' } : { ok: false, erro: `${def.rotulo}: preencha o campo.` }
    switch (def.formato) {
      case 'data':
        return dataValida(t) ? { ok: true, valor: t } : { ok: false, erro: `${def.rotulo}: use dd/mm/aaaa, como 14/09/2026.` }
      case 'email':
        return emailValido(t) ? { ok: true, valor: t.toLowerCase() } : { ok: false, erro: `${def.rotulo}: e-mail inválido.` }
      case 'telefone': {
        const e164 = normalizarTelefone(t)
        return e164 ? { ok: true, valor: e164 } : { ok: false, erro: `${def.rotulo}: telefone com DDD, como (31) 99999-8888.` }
      }
      case 'prazo':
        return t.length >= 3 && t.length <= 80 && !/[\r\n]/.test(t) ? { ok: true, valor: t } : { ok: false, erro: `${def.rotulo}: escreva o prazo em uma linha, até 80 caracteres.` }
    }
  }

  const n = def.tipo === 'bp' ? lerPercentual(texto) : def.tipo === 'centavos' ? lerReais(texto) : /^\s*\d+\s*$/.test(texto) ? Number(texto.trim()) : null
  if (n === null) {
    const exemplo = def.tipo === 'bp' ? 'como 0,5' : def.tipo === 'centavos' ? 'como 1,00' : 'um número inteiro'
    return { ok: false, erro: `${def.rotulo}: valor inválido — use ${exemplo}.` }
  }
  if (n < def.min || n > def.max) return { ok: false, erro: `${def.rotulo}: fora do intervalo aceito (${formatarValor(def, def.min)} a ${formatarValor(def, def.max)}).` }
  return { ok: true, valor: n }
}

/** Um valor vindo do banco vale? Mesmas regras da digitação, sobre o valor já convertido. */
export function valorGravadoValido(def: DefinicaoConfig, valor: unknown): valor is ValorConfig {
  if (def.tipo === 'texto') {
    if (typeof valor !== 'string') return false
    if (valor === '') return def.opcional === true
    const r = lerValorDigitado(def, valor)
    return r.ok && r.valor === (def.formato === 'email' ? valor.toLowerCase() : valor)
  }
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= def.min && valor <= def.max
}

/* ---------- exibir ---------- */

function percentualTexto(bp: number): string {
  const pct = bp / 100
  return `${pct.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`
}

export function formatarValor(def: DefinicaoConfig, valor: ValorConfig): string {
  if (def.tipo === 'texto') {
    if (valor === '') return '—'
    return def.formato === 'telefone' ? formatarTelefoneE164(String(valor)) : String(valor)
  }
  const n = Number(valor)
  if (def.tipo === 'bp') return percentualTexto(n)
  if (def.tipo === 'centavos') return brl(n)
  return def.unidade ? `${n} ${def.unidade}`.replace(' x', 'x') : String(n)
}

/** O valor no formato do campo de edição: 50 bp → "0,5"; 100 centavos → "1,00". */
export function valorParaCampo(def: DefinicaoConfig, valor: ValorConfig): string {
  if (def.tipo === 'texto') return String(valor)
  const n = Number(valor)
  if (def.tipo === 'bp') return (n / 100).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2, useGrouping: false })
  if (def.tipo === 'centavos') return (n / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false })
  return String(n)
}

/* ---------- valores vigentes ---------- */

export type ValoresConfig = Record<string, ValorConfig>

/** Padrão de toda chave, sobrescrito por cada valor gravado que passa na validação. */
export function valoresVigentes(gravados: Readonly<Record<string, unknown>>): ValoresConfig {
  const v: ValoresConfig = {}
  for (const d of DEFINICOES_CONFIG) v[d.chave] = valorGravadoValido(d, gravados[d.chave]) ? (gravados[d.chave] as ValorConfig) : d.padrao
  return v
}

export function tabelaDeTaxasDe(v: ValoresConfig): TabelaDeTaxas {
  const n = (chave: keyof TabelaDeTaxas): number => (typeof v[chave] === 'number' ? (v[chave] as number) : TAXAS_PADRAO[chave])
  return {
    comissaoCompradorBp: n('comissaoCompradorBp'),
    comissaoCompradorFixa: n('comissaoCompradorFixa'),
    comissaoVendedorBp: n('comissaoVendedorBp'),
    comissaoVendedorFixa: n('comissaoVendedorFixa'),
    custodiaMensalPorMoeda: n('custodiaMensalPorMoeda'),
    custodiaAnualPorMoeda: n('custodiaAnualPorMoeda'),
    custodiaAnualParcelasMax: n('custodiaAnualParcelasMax'),
    taxaSaqueFixa: n('taxaSaqueFixa'),
    taxaRetiradaComum: n('taxaRetiradaComum'),
    taxaRetiradaSegura: n('taxaRetiradaSegura'),
    retiradaSeguraParcelasMax: n('retiradaSeguraParcelasMax'),
  }
}

export interface ParametrosOperacionais {
  depositoMaxCents: Cents
  syncMs: number
  prazos: PrazosLogistica
}

export function operacionalDe(v: ValoresConfig): ParametrosOperacionais {
  return {
    depositoMaxCents: Number(v.depositoMaxCents),
    syncMs: Number(v.syncSegundos) * 1000,
    prazos: { validacaoDiasUteis: Number(v.prazoValidacaoDiasUteis), transitoEnvioDias: Number(v.prazoTransitoEnvioDias) },
  }
}

export interface ParametrosDosTermos {
  vigencia: string
  prazoValidacaoCustodia: string
  prazoRecebimentoVenda: string
  prazoDisponibilizacaoDeposito: string
}

export function termosDe(v: ValoresConfig): ParametrosDosTermos {
  return {
    vigencia: String(v.termosVigencia),
    prazoValidacaoCustodia: String(v.termosPrazoValidacaoCustodia),
    prazoRecebimentoVenda: String(v.termosPrazoRecebimentoVenda),
    prazoDisponibilizacaoDeposito: String(v.termosPrazoDisponibilizacaoDeposito),
  }
}

export interface CanaisDeAtendimento {
  email: string
  /** E.164 ou vazio. */
  whatsapp: string
  telefone: string
  url: string
}

export function canaisDe(v: ValoresConfig): CanaisDeAtendimento {
  return { email: String(v.sacEmail), whatsapp: String(v.sacWhatsapp), telefone: String(v.sacTelefone), url: PARAMETROS_LEGAIS.sac.url }
}

/* ---------- mudanças ---------- */

export interface MudancaConfig {
  chave: string
  rotulo: string
  /** O valor vigente antes — padrão do código quando nunca foi gravado. */
  antes: ValorConfig
  depois: ValorConfig
  /** true quando a chave nunca tinha sido gravada. */
  eraPadrao: boolean
}

export type PreparacaoMudancas = { ok: true; mudancas: MudancaConfig[] } | { ok: false; erros: string[] }

/**
 * Lê o formulário de um grupo e devolve só o que mudou. Campo ausente no formulário é "não mexeu".
 * `sistema` não é editável por aqui.
 */
export function prepararMudancas(grupo: GrupoConfig, entrada: Readonly<Record<string, unknown>>, gravados: Readonly<Record<string, unknown>>): PreparacaoMudancas {
  if (!GRUPOS_EDITAVEIS.includes(grupo)) return { ok: false, erros: ['Este grupo de configuração não é editável pelo painel.'] }
  const vigentes = valoresVigentes(gravados)
  const erros: string[] = []
  const mudancas: MudancaConfig[] = []
  for (const def of definicoesDoGrupo(grupo)) {
    if (!(def.chave in entrada)) continue
    const bruto = entrada[def.chave]
    const r = lerValorDigitado(def, typeof bruto === 'string' || typeof bruto === 'number' ? String(bruto) : '')
    if (!r.ok) {
      erros.push(r.erro)
      continue
    }
    if (r.valor !== vigentes[def.chave]) {
      mudancas.push({ chave: def.chave, rotulo: def.rotulo, antes: vigentes[def.chave], depois: r.valor, eraPadrao: !valorGravadoValido(def, gravados[def.chave]) })
    }
  }
  return erros.length ? { ok: false, erros } : { ok: true, mudancas }
}

/* ---------- simulação ---------- */

export interface SimulacaoNegociacao {
  preco: Cents
  comissaoComprador: Cents
  compradorPaga: Cents
  comissaoVendedor: Cents
  vendedorRecebe: Cents
  aureaRecebe: Cents
}

/** "Com esta taxa, uma negociação de R$ 300 rende R$ X" — é o que torna a mudança explicável antes de salvar. */
export function simularNegociacao(taxas: TabelaDeTaxas, preco: Cents): SimulacaoNegociacao {
  const { comprador, vendedor } = comissaoPorMoeda(preco, taxas)
  return { preco, comissaoComprador: comprador, compradorPaga: preco + comprador, comissaoVendedor: vendedor, vendedorRecebe: preco - vendedor, aureaRecebe: comprador + vendedor }
}

/** "14/09/2026" no calendário de Brasília (sem horário de verão desde 2019). */
export function dataDeBrasilia(agora: number): string {
  const d = new Date(agora - 3 * 60 * 60 * 1000)
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`
}

/* ---------- o que o app do cliente recebe ---------- */

/**
 * A parte da configuração que as telas do cliente usam para mostrar a taxa certa antes de o cliente
 * clicar, listar os tipos do catálogo e saber o limite de depósito. Serializável: chega pelo layout
 * de `(app)` e é relida junto com o estado a cada ciclo de sincronização.
 */
export interface ConfigDoCliente {
  taxas: TabelaDeTaxas
  catalogo: CoinType[]
  depositoMaxCents: Cents
  syncMs: number
}

/** O padrão do código — o que valia antes da C3, e o que vale sem banco. */
export const CONFIG_DO_CLIENTE_PADRAO: ConfigDoCliente = {
  taxas: TAXAS_PADRAO,
  catalogo: COIN_TYPES,
  depositoMaxCents: DEPOSITO_MAX,
  syncMs: SYNC_MS,
}