/**
 * Lê o XML da NFS-e autorizada pela Sefin Nacional (`NFSe` v1.01) e devolve os campos que o PDF auxiliar
 * imprime (frente G, 18/11/2026).
 *
 * POR QUE LER O XML E NÃO O BANCO — a nota emitida é o XML que a Sefin devolveu; o que a tabela
 * `nfse_emissoes` guarda (valor, descrição) é o PEDIDO. Imprimir o que o governo registrou, e não o que
 * pedimos, impede que o PDF diga uma coisa e a nota outra. Os campos de tributação (ISSQN, PIS/COFINS,
 * IBS/CBS) só existem no XML.
 *
 * POR QUE EXPRESSÃO REGULAR E NÃO UM PARSER — o XML vem assinado e sem prefixo de namespace nos
 * elementos, com a mesma forma desde a primeira nota; a leitura aqui é só de texto (nunca confia no
 * conteúdo para decidir nada), e um parser a mais é dependência a mais no bundle do navegador, onde o
 * PDF é montado. O que não é achado vira `null` e o PDF imprime "-", como o DANFSe do contador faz.
 *
 * Valores em centavos inteiros (`Cents`): "10.00" vira 1000 por texto, sem passar por `float`.
 * REGRA PURA.
 */

import type { Cents } from '@/domain/types'

export interface EnderecoDaNota {
  logradouro: string | null
  numero: string | null
  bairro: string | null
  cep: string | null
  uf: string | null
}

export interface PessoaDaNota {
  /** CNPJ, CPF ou NIF, só dígitos (ou como veio). */
  documento: string | null
  nome: string | null
  endereco: EnderecoDaNota
  telefone: string | null
  email: string | null
}

export interface DadosDaNotaXml {
  /** Os 50 caracteres depois de "NFS" no `Id` do `infNFSe`. */
  chaveAcesso: string | null
  numero: string | null
  /** `dhProc`, ISO com fuso ("2026-11-16T15:15:56-03:00"): quando a Sefin autorizou. */
  autorizadaEmIso: string | null
  /** `dCompet`, 'AAAA-MM-DD'. */
  competencia: string | null
  serieDps: string | null
  numeroDps: string | null
  /** `ambGer` e `tpAmb` — 2 = Sefin Nacional; 1 = produção. */
  ambienteGerador: string | null
  tipoDeAmbiente: string | null
  prestador: PessoaDaNota
  tomador: PessoaDaNota
  servico: {
    codigoNacional: string | null
    codigoMunicipal: string | null
    nbs: string | null
    textoNacional: string | null
    textoMunicipal: string | null
    textoNbs: string | null
    descricao: string | null
    localDaPrestacao: string | null
  }
  issqn: {
    baseCents: Cents | null
    /** Em percentual, como veio ("5.00" → 5). */
    aliquota: number | null
    valorCents: Cents | null
    /** `tpRetISSQN`: 1 = não retido. */
    retido: boolean | null
  }
  federal: { pisCents: Cents | null; cofinsCents: Cents | null }
  ibsCbs: {
    baseCents: Cents | null
    ibsCents: Cents | null
    cbsCents: Cents | null
  }
  valores: { servicoCents: Cents | null; liquidoCents: Cents | null }
}

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

function decodificar(texto: string): string {
  return texto.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (inteira, nome: string) => {
    if (nome.startsWith('#x') || nome.startsWith('#X')) return String.fromCodePoint(parseInt(nome.slice(2), 16))
    if (nome.startsWith('#')) return String.fromCodePoint(parseInt(nome.slice(1), 10))
    return ENTIDADES[nome.toLowerCase()] ?? inteira
  })
}

/** O texto de dentro da primeira ocorrência de `<tag>…</tag>` (sem elementos aninhados do mesmo nome). */
function bloco(xml: string, tag: string): string | null {
  const m = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`).exec(xml)
  return m ? (m[1] ?? null) : null
}

/** O valor de um elemento folha, sem espaços nas pontas e com as entidades XML desfeitas. */
function folha(xml: string | null, tag: string): string | null {
  if (!xml) return null
  const t = bloco(xml, tag)
  if (t === null) return null
  const limpo = decodificar(t).trim()
  return limpo === '' ? null : limpo
}

/** '10.00' → 1000. Só aceita o formato que a Sefin usa (ponto decimal), sem passar por `float`. */
export function centavosDoTexto(texto: string | null): Cents | null {
  if (!texto) return null
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(texto.trim())
  if (!m) return null
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0') || '0')
}

function numeroDoTexto(texto: string | null): number | null {
  if (!texto) return null
  const n = Number(texto)
  return Number.isFinite(n) ? n : null
}

function endereco(xml: string | null): EnderecoDaNota {
  return {
    logradouro: folha(xml, 'xLgr'),
    numero: folha(xml, 'nro'),
    bairro: folha(xml, 'xBairro'),
    cep: folha(xml, 'CEP'),
    uf: folha(xml, 'UF'),
  }
}

/**
 * Lê o XML. Devolve `null` quando o texto não é uma NFS-e (vazio, outro documento) — quem chama trata como
 * "nota sem arquivo". Não valida a assinatura: o XML vem do nosso banco, gravado no momento da autorização.
 */
export function lerDadosDaNota(xml: string | null | undefined): DadosDaNotaXml | null {
  if (!xml || !/<infNFSe[\s>]/.test(xml)) return null

  // A nota do governo (até `<DPS`) e o pedido que a originou (DPS) trazem elementos de mesmo nome
  // (`valores`, `serie`…): ler cada metade separadamente evita pegar o de lá no lugar do de cá.
  const corte = xml.indexOf('<DPS')
  const nfse = corte >= 0 ? xml.slice(0, corte) : xml
  const dps = corte >= 0 ? xml.slice(corte) : ''

  const emit = bloco(nfse, 'emit')
  const toma = bloco(dps, 'toma')
  const serv = bloco(dps, 'serv')
  const valoresIss = bloco(nfse.replace(/<IBSCBS[\s\S]*?<\/IBSCBS>/, ''), 'valores')
  const ibsCbs = bloco(nfse, 'IBSCBS')
  const totais = ibsCbs ? bloco(ibsCbs, 'totCIBS') : null
  const valoresDps = bloco(dps, 'valores')
  const pisCofins = valoresDps ? bloco(valoresDps, 'piscofins') : null
  const idInf = /<infNFSe[^>]*\sId="NFS(\d{50})"/.exec(nfse)

  const municipioPrestacao = folha(nfse, 'xLocPrestacao')

  return {
    chaveAcesso: idInf?.[1] ?? null,
    numero: folha(nfse, 'nNFSe'),
    autorizadaEmIso: folha(nfse, 'dhProc'),
    competencia: folha(dps, 'dCompet'),
    serieDps: folha(dps, 'serie'),
    numeroDps: folha(dps, 'nDPS'),
    ambienteGerador: folha(nfse, 'ambGer'),
    tipoDeAmbiente: folha(dps, 'tpAmb'),
    prestador: {
      documento: folha(emit, 'CNPJ') ?? folha(emit, 'CPF'),
      nome: folha(emit, 'xNome'),
      endereco: { ...endereco(emit), uf: folha(emit, 'UF') },
      telefone: folha(emit, 'fone'),
      email: folha(emit, 'email'),
    },
    tomador: {
      documento: folha(toma, 'CPF') ?? folha(toma, 'CNPJ') ?? folha(toma, 'NIF'),
      nome: folha(toma, 'xNome'),
      endereco: endereco(toma),
      telefone: folha(toma, 'fone'),
      email: folha(toma, 'email'),
    },
    servico: {
      codigoNacional: folha(serv, 'cTribNac'),
      codigoMunicipal: folha(serv, 'cTribMun'),
      nbs: folha(serv, 'cNBS'),
      textoNacional: folha(nfse, 'xTribNac'),
      textoMunicipal: folha(nfse, 'xTribMun'),
      textoNbs: folha(nfse, 'xNBS'),
      descricao: folha(serv, 'xDescServ'),
      localDaPrestacao: municipioPrestacao,
    },
    issqn: {
      baseCents: centavosDoTexto(folha(valoresIss, 'vBC')),
      aliquota: numeroDoTexto(folha(valoresIss, 'pAliqAplic')),
      valorCents: centavosDoTexto(folha(valoresIss, 'vISSQN')),
      retido: folha(dps, 'tpRetISSQN') === null ? null : folha(dps, 'tpRetISSQN') !== '1',
    },
    federal: {
      pisCents: centavosDoTexto(folha(pisCofins, 'vPis')),
      cofinsCents: centavosDoTexto(folha(pisCofins, 'vCofins')),
    },
    ibsCbs: {
      baseCents: centavosDoTexto(folha(ibsCbs ? bloco(ibsCbs, 'valores') : null, 'vBC')),
      ibsCents: centavosDoTexto(folha(totais, 'vIBSTot')),
      cbsCents: centavosDoTexto(folha(totais, 'vCBS')),
    },
    valores: {
      servicoCents: centavosDoTexto(folha(valoresDps, 'vServ')),
      liquidoCents: centavosDoTexto(folha(valoresIss, 'vLiq')),
    },
  }
}

/** CNPJ (14 dígitos) ou CPF (11) com a máscara de sempre; qualquer outra coisa volta como veio. */
export function documentoParaTela(documento: string | null): string {
  if (!documento) return '-'
  const d = documento.replace(/\D/g, '')
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
  return documento
}

/** O endereço de consulta pública da nota — o que o QR Code do DANFSe aponta (NT 008 v1.02, p. 14–15). */
export function enderecoDeConsultaDaNota(chaveAcesso: string): string {
  return `https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=${encodeURIComponent(chaveAcesso)}`
}
