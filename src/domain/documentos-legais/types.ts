/**
 * DOMÍNIO — Tipagem estruturada de documentos legais e contratuais.
 *
 * Módulo puro: sem I/O, determinístico, serializável e testável isoladamente.
 */

export type ChaveDocumento =
  | 'termos_de_uso'
  | 'politica_privacidade'
  | 'tabela_de_taxas'
  | 'clausula_arbitragem'

export type CanalAceite =
  | 'cadastro_email'
  | 'cadastro_google'
  | 'entrada'
  | 'banner_atualizacao'
  | 'conta_documentos'
  | 'admin'

export type MetodoAceite =
  | 'clique_no_botao'
  | 'caixa_e_nome_digitado'
  | 'certificado_digital'

export interface Alinea {
  letra: string
  texto: string
  subalineas?: Alinea[]
  negrito?: boolean
}

export interface Paragrafo {
  numero?: string
  titulo?: string
  texto?: string
  alineas?: Alinea[]
  negrito?: boolean
}

export interface Capitulo {
  numero: number
  titulo: string
  paragrafos: Paragrafo[]
  negrito?: boolean
}

export interface DocumentoLegalEstruturado {
  chave: ChaveDocumento
  versao: string
  titulo: string
  vigenteDesde: string
  preambulo?: string[]
  capitulos: Capitulo[]
  posambulo?: string[]
}

