/**
 * Monta o XML da DPS (Declaração de Prestação de Serviço) — o pedido de nota que vai à Sefin Nacional.
 *
 * NÃO É PORT. O leiaute é o do Anexo I v1.01 e do XSD oficial (gov.br/nfse), na ordem exata dos
 * elementos — a Sefin rejeita fora de ordem (E1235). A referência campo a campo e as três notas do
 * contador que este módulo reproduz estão em docs/fiscal-contabil/NFSE_MODELOS_DO_CONTADOR.md.
 *
 * TRÊS ARMADILHAS QUE ESTE ARQUIVO EVITA
 * --------------------------------------
 *  1. Espaço ou quebra de linha entre tags invalida a assinatura (Manual Integrado §6.1.1-d). O XML
 *     sai numa linha só, montado por concatenação — sem biblioteca que formate "bonito".
 *  2. O `TSString` do XSD só aceita Latin-1 (`[!-ÿ]`). Travessão, aspas curvas ou emoji no nome do
 *     cliente derrubariam a nota inteira. `textoFiscal` normaliza para maiúsculas sem acento, como o
 *     contador escreveu.
 *  3. A partir de 01/12/2026 vale a NT 009: CST e cClassTrib saem de dentro de `gIBSCBS`, `indDest`
 *     sobe para logo depois de `toma` e `finNFSe` vai para depois de `tpEmit` (Anexo VI v1.04.01).
 *     O leiaute é escolhido pela data de emissão, sem deploy no dia da virada — mas a forma NT 009
 *     só foi conferida contra o Anexo VI, não contra a Sefin: testar na produção restrita antes.
 *
 * O que NÃO vai na DPS, de propósito: a alíquota do ISS (E0617 — não optante em município
 * conveniado; a Sefin aplica a de BH) e os valores de IBS/CBS (quem calcula é a Sefin).
 *
 * REGRA PURA. Quem assina e envia é src/server/nfse/.
 */

import type { Cents, Timestamp } from '@/domain/types'

import {
  CODIGOS_POR_SERVICO,
  EMISSOR,
  INDICADOR_USO_PESSOAL,
  TRIBUTOS_FEDERAIS,
  exigeEnderecoDoTomador,
} from './codigos'
import type { PedidoNfse } from './pedidos'

export const NAMESPACE_NFSE = 'http://www.sped.fazenda.gov.br/nfse'
export const VERSAO_DPS = '1.01'
/** Dia em que a NT 009 entra em produção (Ato Técnico Conjunto RFB/CGIBS nº 7). */
export const INICIO_NT009 = Date.UTC(2026, 11, 1, 3, 0, 0) // 01/12/2026 00:00 em Brasília

export type Leiaute = 'v1.01' | 'nt009'

export function leiauteNaData(ts: Timestamp): Leiaute {
  return ts >= INICIO_NT009 ? 'nt009' : 'v1.01'
}

/**
 * As três mudanças de posição da NT 009, uma a uma. A produção restrita recebe a NT 009 em
 * "releases" (o 1º em 20/10/2026), então durante a transição ela pode aceitar uma mudança e ainda
 * não a outra. Os leiautes fechados ficam em `FORMATO_DO_LEIAUTE`; o envio pode sobrepor campo a campo.
 */
export interface FormatoDps {
  /** `finNFSe` na raiz de `infDPS`, logo depois de `tpEmit` (e não no grupo IBSCBS). */
  finNFSeNaRaiz: boolean
  /** `indDest` na raiz de `infDPS`, logo depois de `toma` (e não no grupo IBSCBS). */
  indDestNaRaiz: boolean
  /** CST e cClassTrib direto em `IBSCBS/valores/trib` (e não dentro de `gIBSCBS`). */
  cstForaDoGrupo: boolean
  /** `xDescServ` como último filho de `cServ`, depois do `cNBS` (Anexo VI, linhas 228–233). */
  descricaoNoFim: boolean
}

export const FORMATO_DO_LEIAUTE: Readonly<Record<Leiaute, FormatoDps>> = {
  'v1.01': { finNFSeNaRaiz: false, indDestNaRaiz: false, cstForaDoGrupo: false, descricaoNoFim: false },
  nt009: { finNFSeNaRaiz: true, indDestNaRaiz: true, cstForaDoGrupo: true, descricaoNoFim: true },
}

/** O tomador como a nota precisa dele. `cMun` vem do CEP (IBGE), resolvido no servidor. */
export interface TomadorNfse {
  cpf: string
  nome: string
  endereco?: {
    cMun: string
    cep: string
    logradouro: string
    numero: string
    complemento?: string
    bairro: string
  }
}

export interface ParametrosDps {
  pedido: PedidoNfse
  tomador: TomadorNfse
  /** 1 = produção, 2 = produção restrita (testes). */
  tpAmb: 1 | 2
  serie: number
  numero: number
  emitidoEm: Timestamp
  /** Até 20 caracteres: aparece no XML da nota, ajuda a rastrear qual versão emitiu. */
  verAplic: string
  leiaute?: Leiaute
  /** Sobrepõe posições do leiaute (transição da NT 009 na produção restrita). */
  formato?: Partial<FormatoDps>
  /**
   * Informar a inscrição municipal do prestador (padrão: sim, conselho do contador). `false` só quando a
   * Sefin recusou com E0120 — BH sem a IM no cadastro nacional complementar.
   */
  comInscricaoMunicipal?: boolean
}

/* ---------- formatação ---------- */

/** Maiúsculas, sem acento, só ASCII imprimível, espaços colapsados — o que o XSD aceita sempre. */
export function textoFiscal(s: string, max: number): string {
  const limpo = s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
  return limpo.slice(0, max).trim()
}

/** Centavos → "2.00" (padrão `TSDec15V2`: ponto decimal, duas casas, sem zero à esquerda). */
export function decimal(c: Cents): string {
  const sinal = c < 0 ? '-' : ''
  const abs = Math.abs(c)
  return `${sinal}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

/** Pontos-base → "0.65" / "11.33". */
export function percentual(bp: number): string {
  return decimal(bp)
}

function soDigitos(s: string): string {
  return s.replace(/\D/g, '')
}

function escapar(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function tag(nome: string, conteudo: string): string {
  return `<${nome}>${conteudo}</${nome}>`
}

function folha(nome: string, valor: string): string {
  return tag(nome, escapar(valor))
}

/** `2026-10-23T09:15:00-03:00` — horário de Brasília com o fuso, o formato `TSDateTimeUTC`. */
export function dataHoraBrasilia(ts: Timestamp): string {
  const d = new Date(ts - 3 * 3600_000)
  const p = (n: number): string => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}-03:00`
  )
}

/** Id da DPS: "DPS" + município (7) + tipo de inscrição (2 = CNPJ) + CNPJ (14) + série (5) + nº (15). */
export function idDaDps(serie: number, numero: number): string {
  return `DPS${EMISSOR.codigoMunicipio}2${EMISSOR.cnpj}${String(serie).padStart(5, '0')}${String(numero).padStart(15, '0')}`
}

/* ---------- valores derivados ---------- */

/** PIS e COFINS em apuração própria, arredondados ao centavo (R$ 2,00 → 0,01 e 0,06, como na nota nº 1). */
export function pisCofins(valor: Cents): { pis: Cents; cofins: Cents } {
  return {
    pis: Math.round((valor * TRIBUTOS_FEDERAIS.pisBp) / 10_000),
    cofins: Math.round((valor * TRIBUTOS_FEDERAIS.cofinsBp) / 10_000),
  }
}

/* ---------- validação ---------- */

/** O que impede a nota de sair — dito antes de gastar um número de DPS e uma ida à Sefin. */
export function problemasDoPedido(pedido: PedidoNfse, tomador: TomadorNfse | null): string[] {
  const problemas: string[] = []
  if (pedido.valorCents <= 0) problemas.push('Valor do serviço zerado.')
  if (!tomador) {
    problemas.push('Cliente sem cadastro completo (CPF e nome) — a nota precisa do tomador identificado.')
    return problemas
  }
  if (soDigitos(tomador.cpf).length !== 11) problemas.push('CPF do cliente ausente ou inválido.')
  if (!textoFiscal(tomador.nome, 150)) problemas.push('Nome do cliente ausente.')
  if (exigeEnderecoDoTomador(pedido.servico)) {
    const e = tomador.endereco
    if (!e || !e.cMun || soDigitos(e.cep).length !== 8 || !e.logradouro.trim() || !e.numero.trim() || !e.bairro.trim()) {
      problemas.push(
        'Endereço do cliente incompleto (logradouro, número, bairro, CEP e município) — obrigatório na nota de intermediação (regra E0187/E0234).',
      )
    }
  }
  return problemas
}

/* ---------- montagem ---------- */

function grupoTomador(t: TomadorNfse): string {
  let xml = folha('CPF', soDigitos(t.cpf)) + folha('xNome', textoFiscal(t.nome, 150))
  const e = t.endereco
  if (e && e.cMun && soDigitos(e.cep).length === 8) {
    xml += tag(
      'end',
      tag('endNac', folha('cMun', e.cMun) + folha('CEP', soDigitos(e.cep))) +
        folha('xLgr', textoFiscal(e.logradouro, 255)) +
        folha('nro', textoFiscal(e.numero, 60) || 'S/N') +
        (e.complemento && textoFiscal(e.complemento, 156) ? folha('xCpl', textoFiscal(e.complemento, 156)) : '') +
        folha('xBairro', textoFiscal(e.bairro, 60)),
    )
  }
  return tag('toma', xml)
}

function grupoValores(pedido: PedidoNfse): string {
  const codigos = CODIGOS_POR_SERVICO[pedido.servico]
  const { pis, cofins } = pisCofins(pedido.valorCents)
  const tribMun = tag('tribMun', folha('tribISSQN', '1') + folha('tpRetISSQN', '1'))
  const tribFed = tag(
    'tribFed',
    tag(
      'piscofins',
      folha('CST', TRIBUTOS_FEDERAIS.cstPisCofins) +
        folha('vBCPisCofins', decimal(pedido.valorCents)) +
        folha('pAliqPis', percentual(TRIBUTOS_FEDERAIS.pisBp)) +
        folha('pAliqCofins', percentual(TRIBUTOS_FEDERAIS.cofinsBp)) +
        folha('vPis', decimal(pis)) +
        folha('vCofins', decimal(cofins)) +
        folha('tpRetPisCofins', TRIBUTOS_FEDERAIS.tpRetPisCofins),
    ),
  )
  const totTrib = tag(
    'totTrib',
    tag(
      'pTotTrib',
      folha('pTotTribFed', percentual(TRIBUTOS_FEDERAIS.totTribFederalBp)) +
        folha('pTotTribEst', percentual(TRIBUTOS_FEDERAIS.totTribEstadualBp)) +
        folha('pTotTribMun', percentual(codigos.issBp)),
    ),
  )
  return tag('valores', tag('vServPrest', folha('vServ', decimal(pedido.valorCents))) + tag('trib', tribMun + tribFed + totTrib))
}

function grupoIbsCbs(pedido: PedidoNfse, f: FormatoDps): string {
  const c = CODIGOS_POR_SERVICO[pedido.servico]
  const situacao = folha('CST', c.cst) + folha('cClassTrib', c.cClassTrib)
  return tag(
    'IBSCBS',
    (f.finNFSeNaRaiz ? '' : folha('finNFSe', '0')) +
      folha('indFinal', INDICADOR_USO_PESSOAL) +
      folha('cIndOp', c.cIndOp) +
      (c.tpOper ? folha('tpOper', c.tpOper) : '') +
      (f.indDestNaRaiz ? '' : folha('indDest', '0')) +
      tag('valores', tag('trib', f.cstForaDoGrupo ? situacao : tag('gIBSCBS', situacao))),
  )
}

/** A DPS sem assinatura. A assinatura (XMLDSig sobre `infDPS`) entra como último filho de `DPS`. */
export function montarDps(p: ParametrosDps): { id: string; xml: string } {
  const { pedido, tomador } = p
  const formato: FormatoDps = { ...FORMATO_DO_LEIAUTE[p.leiaute ?? leiauteNaData(p.emitidoEm)], ...p.formato }
  const c = CODIGOS_POR_SERVICO[pedido.servico]
  const id = idDaDps(p.serie, p.numero)

  const prest = tag(
    'prest',
    folha('CNPJ', EMISSOR.cnpj) +
      (p.comInscricaoMunicipal === false ? '' : folha('IM', EMISSOR.inscricaoMunicipal)) +
      tag('regTrib', folha('opSimpNac', EMISSOR.opSimpNac) + folha('regEspTrib', EMISSOR.regEspTrib)),
  )
  const descricao = folha('xDescServ', textoFiscal(pedido.descricao, 1000))
  const serv = tag(
    'serv',
    tag('locPrest', folha('cLocPrestacao', EMISSOR.codigoMunicipio)) +
      tag(
        'cServ',
        folha('cTribNac', c.cTribNac) +
          folha('cTribMun', c.cTribMun) +
          (formato.descricaoNoFim ? folha('cNBS', c.cNBS) + descricao : descricao + folha('cNBS', c.cNBS)),
      ),
  )

  const corpo =
    folha('tpAmb', String(p.tpAmb)) +
    folha('dhEmi', dataHoraBrasilia(p.emitidoEm)) +
    folha('verAplic', p.verAplic.slice(0, 20)) +
    folha('serie', String(p.serie)) +
    folha('nDPS', String(p.numero)) +
    folha('dCompet', pedido.competencia) +
    folha('tpEmit', '1') +
    // NT 009: a finalidade sai do grupo IBSCBS e vem logo depois do emitente.
    (formato.finNFSeNaRaiz ? folha('finNFSe', '0') : '') +
    folha('cLocEmi', EMISSOR.codigoMunicipio) +
    prest +
    grupoTomador(tomador) +
    (formato.indDestNaRaiz ? folha('indDest', '0') : '') +
    serv +
    grupoValores(pedido) +
    grupoIbsCbs(pedido, formato)

  const xml = `<DPS xmlns="${NAMESPACE_NFSE}" versao="${VERSAO_DPS}"><infDPS Id="${id}">${corpo}</infDPS></DPS>`
  return { id, xml }
}
