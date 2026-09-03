/**
 * Repositório contábil: `parametros_contabeis`, `contas_contabeis`,
 * `lancamentos_manuais` e `exportacoes`.
 *
 * Quatro tabelas num arquivo porque contam uma história só — a da DRE: as
 * alíquotas que ela aplica, o plano de contas que ela lê, os lançamentos que
 * o contador faz à mão e o registro de cada vez que ela saiu da plataforma.
 *
 * OS CATÁLOGOS VÊM DO DOMÍNIO. `garantirCatalogos` upserta as chaves de
 * parâmetro (com valor NULO) e o plano de contas a partir de src/domain/dre.ts.
 * A migration só cria as tabelas; a lista de contas tem uma fonte só, e é o
 * código. Chamar de novo não sobrescreve valor preenchido pelo contador —
 * o upsert dos parâmetros é `DO NOTHING`, e o das contas só atualiza nome,
 * natureza e ordem.
 */

import {
  CATALOGO_PARAMETROS,
  PARAMETROS_VAZIOS,
  PLANO_DE_CONTAS,
  type ChaveParametro,
  type ContaContabil,
  type LancamentoManual,
  type NaturezaConta,
  type ParametrosContabeis,
} from '@/domain/dre'

import { nomeDoSchema, num, numOuNulo, type Consulta } from '../sql'

/* ---------- catálogos ---------- */

export async function garantirCatalogos(tx: Consulta): Promise<void> {
  const S = nomeDoSchema()
  for (const p of CATALOGO_PARAMETROS) {
    await tx.query(
      `INSERT INTO ${S}.parametros_contabeis (chave, valor, unidade, rotulo, descricao)
       VALUES ($1, NULL, $2, $3, $4)
       ON CONFLICT (chave) DO UPDATE SET unidade = EXCLUDED.unidade, rotulo = EXCLUDED.rotulo, descricao = EXCLUDED.descricao`,
      [p.chave, p.unidade, p.rotulo, p.descricao],
    )
  }
  let ord = 0
  for (const c of PLANO_DE_CONTAS) {
    ord += 1
    await tx.query(
      `INSERT INTO ${S}.contas_contabeis (codigo, nome, natureza, automatica, ord)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (codigo) DO UPDATE
         SET nome = EXCLUDED.nome, natureza = EXCLUDED.natureza, automatica = EXCLUDED.automatica, ord = EXCLUDED.ord`,
      [c.codigo, c.nome, c.natureza, c.automatica, ord],
    )
  }
}

/* ---------- parâmetros ---------- */

export interface ParametroGravado {
  chave: ChaveParametro
  valor: number | null
  unidade: 'bp' | 'centavos'
  rotulo: string
  descricao: string
  atualizadoEm: number | null
  atualizadoPor: string | null
}

type LinhaParametro = {
  chave: string
  valor: unknown
  unidade: string
  rotulo: string
  descricao: string
  atualizado_em: unknown
  atualizado_por: string | null
}

export async function listarParametros(tx: Consulta): Promise<ParametroGravado[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaParametro>(
    `SELECT chave, valor, unidade, rotulo, descricao, atualizado_em, atualizado_por
       FROM ${S}.parametros_contabeis`,
  )
  // Na ordem do catálogo, não na do banco: a tela lista nesta ordem.
  const porChave = new Map(rows.map((r) => [r.chave, r]))
  return CATALOGO_PARAMETROS.flatMap((p) => {
    const r = porChave.get(p.chave)
    if (!r) return []
    return [
      {
        chave: p.chave,
        valor: numOuNulo(r.valor),
        unidade: r.unidade as 'bp' | 'centavos',
        rotulo: r.rotulo,
        descricao: r.descricao,
        atualizadoEm: numOuNulo(r.atualizado_em),
        atualizadoPor: r.atualizado_por,
      },
    ]
  })
}

/** Os parâmetros na forma que `montarDre` consome. Chave ausente = nula. */
export async function carregarParametros(tx: Consulta): Promise<ParametrosContabeis> {
  const lista = await listarParametros(tx)
  const saida: ParametrosContabeis = { ...PARAMETROS_VAZIOS }
  for (const p of lista) saida[p.chave] = p.valor
  return saida
}

export async function gravarParametro(
  tx: Consulta,
  chave: ChaveParametro,
  valor: number | null,
  ator: string,
  agora: number,
): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `UPDATE ${S}.parametros_contabeis SET valor = $2, atualizado_em = $3, atualizado_por = $4 WHERE chave = $1`,
    [chave, valor, agora, ator],
  )
}

/* ---------- plano de contas ---------- */

type LinhaConta = { codigo: string; nome: string; natureza: string; automatica: boolean; ord: unknown }

export async function listarContas(tx: Consulta): Promise<ContaContabil[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaConta>(
    `SELECT codigo, nome, natureza, automatica, ord FROM ${S}.contas_contabeis ORDER BY ord`,
  )
  return rows.map((r) => ({
    codigo: r.codigo,
    nome: r.nome,
    natureza: r.natureza as NaturezaConta,
    automatica: r.automatica,
  }))
}

/* ---------- lançamentos manuais ---------- */

export interface LancamentoManualGravado extends LancamentoManual {
  id: number
  createdAt: number
  /** id do lançamento que este estorna, se for um estorno. */
  estornaId: number | null
}

type LinhaManual = {
  id: unknown
  data: unknown
  conta_codigo: string
  descricao: string
  valor: unknown
  criado_por: string
  created_at: unknown
  estorna_id: unknown
}

function paraManual(r: LinhaManual): LancamentoManualGravado {
  return {
    id: num(r.id),
    data: num(r.data),
    contaCodigo: r.conta_codigo,
    descricao: r.descricao,
    valor: num(r.valor),
    criadoPor: r.criado_por,
    createdAt: num(r.created_at),
    estornaId: numOuNulo(r.estorna_id),
  }
}

export async function inserirLancamentoManual(
  tx: Consulta,
  l: LancamentoManual & { estornaId?: number | null },
  agora: number,
): Promise<number> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ id: unknown }>(
    `INSERT INTO ${S}.lancamentos_manuais (data, conta_codigo, descricao, valor, criado_por, created_at, estorna_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [l.data, l.contaCodigo, l.descricao, l.valor, l.criadoPor, agora, l.estornaId ?? null],
  )
  return num(rows[0].id)
}

/** Todos, inclusive estornos e estornados — para a exportação e a tela. */
export async function listarLancamentosManuais(tx: Consulta): Promise<LancamentoManualGravado[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaManual>(
    `SELECT id, data, conta_codigo, descricao, valor, criado_por, created_at, estorna_id
       FROM ${S}.lancamentos_manuais ORDER BY data, id`,
  )
  return rows.map(paraManual)
}

/**
 * Só os que VALEM: exclui os estornados e os próprios estornos. É esta lista
 * que a DRE recebe — um par lançamento/estorno some por inteiro, em vez de
 * entrar como +X e −X.
 */
export async function listarLancamentosVigentes(tx: Consulta): Promise<LancamentoManualGravado[]> {
  const todos = await listarLancamentosManuais(tx)
  const estornados = new Set(todos.filter((l) => l.estornaId !== null).map((l) => l.estornaId))
  return todos.filter((l) => l.estornaId === null && !estornados.has(l.id))
}

/* ---------- exportações ---------- */

export interface RegistroExportacao {
  createdAt: number
  relatorio: string
  formato: string
  /** 'download' | 'api' | 'sheets' */
  destino: string
  ator: string
  linhas: number
  ok: boolean
  detalhe: string | null
}

export async function registrarExportacao(tx: Consulta, e: RegistroExportacao): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.exportacoes (created_at, relatorio, formato, destino, ator, linhas, ok, detalhe)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [e.createdAt, e.relatorio, e.formato, e.destino, e.ator, e.linhas, e.ok, e.detalhe],
  )
}

type LinhaExportacao = {
  id: unknown
  created_at: unknown
  relatorio: string
  formato: string
  destino: string
  ator: string
  linhas: unknown
  ok: boolean
  detalhe: string | null
}

export async function listarExportacoes(tx: Consulta, limite = 200): Promise<Array<RegistroExportacao & { id: number }>> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaExportacao>(
    `SELECT id, created_at, relatorio, formato, destino, ator, linhas, ok, detalhe
       FROM ${S}.exportacoes ORDER BY id DESC LIMIT $1`,
    [limite],
  )
  return rows.map((r) => ({
    id: num(r.id),
    createdAt: num(r.created_at),
    relatorio: r.relatorio,
    formato: r.formato,
    destino: r.destino,
    ator: r.ator,
    linhas: num(r.linhas),
    ok: r.ok,
    detalhe: r.detalhe,
  }))
}
