/**
 * O controle financeiro do painel no banco (migration 046): setores, custos e receitas
 * recorrentes, e o lançamento automático de cada ocorrência vencida.
 *
 * Mesmo desenho de `contabil.ts`: parametrizado pelo `Executor`, sem `server-only`, validação em
 * src/domain/financeiro/controle.ts e a linha `admin.financeiro.<verbo>` gravada NA MESMA
 * TRANSAÇÃO da escrita. Nada aqui mexe em saldo de cliente: é base contábil da empresa.
 *
 * QUEM LANÇA. `lancarVencidos` roda no job diário (/api/cron/faturamento, ator
 * `sistema:faturamento`), no botão "Lançar o que venceu" e logo depois de salvar um cadastro
 * (só aquele). Cada ocorrência vira um lançamento manual na conta escolhida — a DRE o soma como
 * soma qualquer despesa 4.1.xx ou receita 3.1.99. O índice único da 046 torna tudo idempotente.
 */

import {
  descricaoDaOcorrencia,
  diaDeBrasilia,
  meioDiaDeBrasilia,
  ocorrenciasAte,
  validarNomeDeSetor,
  validarRecorrente,
  type EntradaRecorrente,
} from '@/domain/financeiro/controle'
import { brl } from '@/domain/money'
import { garantirCatalogos } from '@/server/db/repositories/contabil'
import {
  alterarSetor,
  atualizarRecorrente,
  competenciasLancadas,
  criarSetor,
  definirRecorrenteAtivo,
  inserirRecorrente,
  lancarOcorrencia,
  listarRecorrentes,
  listarSetores,
  nomeDeSetorEmUso,
  type RecorrenteGravado,
} from '@/server/db/repositories/financeiro'
import type { Consulta, Executor } from '@/server/db/sql'

import { registrarAcaoAdmin } from './auditar'
import type { ResultadoAdmin } from './contabil'

export interface OcorrenciaLancada {
  id: number
  recorrenteId: number
  competencia: string
  valor: number
}

/** Lança, dentro da transação, toda ocorrência vencida e ainda não lançada (de um recorrente ou de todos). */
async function lancarVencidosNaTransacao(tx: Consulta, ator: string, agora: number, so?: number): Promise<OcorrenciaLancada[]> {
  const hoje = diaDeBrasilia(agora)
  const todos = (await listarRecorrentes(tx)).filter((r) => r.ativo && (so === undefined || r.id === so))
  const lancadas: OcorrenciaLancada[] = []
  for (const r of todos) {
    const ja = await competenciasLancadas(tx, r.id)
    for (const dia of ocorrenciasAte(r, hoje)) {
      if (ja.has(dia)) continue
      const id = await lancarOcorrencia(
        tx,
        {
          recorrenteId: r.id,
          competencia: dia,
          data: meioDiaDeBrasilia(dia),
          contaCodigo: r.contaCodigo,
          descricao: descricaoDaOcorrencia(r, dia),
          valor: r.valor,
          setorId: r.setorId,
          criadoPor: ator,
        },
        agora,
      )
      if (id !== null) lancadas.push({ id, recorrenteId: r.id, competencia: dia, valor: r.valor })
    }
  }
  if (lancadas.length) {
    await registrarAcaoAdmin(tx, {
      ator,
      area: 'financeiro',
      verbo: 'lancar_recorrentes',
      entidade: 'lancamento_manual',
      detalhes: { quantidade: lancadas.length, total: lancadas.reduce((t, l) => t + l.valor, 0), ocorrencias: lancadas.slice(0, 50) },
      agora,
    })
  }
  return lancadas
}

/** O job diário e o botão "Lançar o que venceu". */
export async function lancarVencidos(executar: Executor, ator: string, agora: number = Date.now()): Promise<ResultadoAdmin<{ lancadas: OcorrenciaLancada[] }>> {
  const lancadas = await executar(async (tx) => {
    await garantirCatalogos(tx)
    return lancarVencidosNaTransacao(tx, ator, agora)
  })
  const total = lancadas.reduce((t, l) => t + l.valor, 0)
  return {
    ok: true,
    mensagem: lancadas.length ? `${lancadas.length} lançamento(s) gerado(s), total ${brl(total)}.` : 'Nada vencido para lançar: tudo em dia.',
    dados: { lancadas },
  }
}

/** Cria (sem `id`) ou edita um recorrente e já lança o que dele estiver vencido. */
export async function salvarRecorrente(
  executar: Executor,
  ator: string,
  idBruto: unknown,
  entrada: EntradaRecorrente,
  agora: number = Date.now(),
): Promise<ResultadoAdmin<{ id: number; lancadas: number }>> {
  const v = validarRecorrente(entrada)
  if (!v.ok) return { ok: false, erro: v.erro }
  const editando = idBruto !== null && idBruto !== undefined
  if (editando && (typeof idBruto !== 'number' || !Number.isInteger(idBruto) || idBruto <= 0)) return { ok: false, erro: 'Lançamento recorrente inválido.' }
  const dados = v.valor

  return executar<ResultadoAdmin<{ id: number; lancadas: number }>>(async (tx) => {
    await garantirCatalogos(tx)
    if (dados.setorId !== null && !(await listarSetores(tx)).some((s) => s.id === dados.setorId)) return { ok: false, erro: 'Setor não encontrado.' }
    let id: number
    if (editando) {
      id = idBruto as number
      if (!(await atualizarRecorrente(tx, id, dados, ator, agora))) return { ok: false, erro: 'Lançamento recorrente não encontrado.' }
    } else {
      id = await inserirRecorrente(tx, dados, ator, agora)
    }
    await registrarAcaoAdmin(tx, {
      ator,
      area: 'financeiro',
      verbo: editando ? 'recorrente_editar' : 'recorrente_criar',
      entidade: 'lancamento_recorrente',
      entidadeId: String(id),
      detalhes: { ...dados },
      agora,
    })
    const lancadas = await lancarVencidosNaTransacao(tx, ator, agora, id)
    const sufixo = lancadas.length ? ` ${lancadas.length} ocorrência(s) já vencida(s) lançada(s) na DRE.` : ''
    return { ok: true, mensagem: `${dados.tipo === 'custo' ? 'Custo' : 'Receita'} "${dados.descricao}" salvo: ${brl(dados.valor)}.${sufixo}`, dados: { id, lancadas: lancadas.length } }
  })
}

/** Desativar = o job ignora o cadastro. Reativar lança, na hora, o que venceu enquanto estava desativado. */
export async function alternarRecorrente(
  executar: Executor,
  ator: string,
  idBruto: unknown,
  ativo: unknown,
  agora: number = Date.now(),
): Promise<ResultadoAdmin<{ lancadas: number }>> {
  if (typeof idBruto !== 'number' || !Number.isInteger(idBruto) || idBruto <= 0) return { ok: false, erro: 'Lançamento recorrente inválido.' }
  if (typeof ativo !== 'boolean') return { ok: false, erro: 'Situação inválida.' }
  return executar<ResultadoAdmin<{ lancadas: number }>>(async (tx) => {
    if (!(await definirRecorrenteAtivo(tx, idBruto, ativo, ator, agora))) return { ok: false, erro: 'Lançamento recorrente não encontrado.' }
    await registrarAcaoAdmin(tx, {
      ator,
      area: 'financeiro',
      verbo: ativo ? 'recorrente_reativar' : 'recorrente_desativar',
      entidade: 'lancamento_recorrente',
      entidadeId: String(idBruto),
      agora,
    })
    const lancadas = ativo ? await lancarVencidosNaTransacao(tx, ator, agora, idBruto) : []
    return {
      ok: true,
      mensagem: ativo ? `Reativado.${lancadas.length ? ` ${lancadas.length} ocorrência(s) vencida(s) lançada(s).` : ''}` : 'Desativado: nada mais é lançado dele até reativar.',
      dados: { lancadas: lancadas.length },
    }
  })
}

/** Cria (sem `id`) ou renomeia/ativa/desativa um setor. Setor não se apaga: lançamentos antigos apontam para ele. */
export async function salvarSetor(executar: Executor, ator: string, idBruto: unknown, nomeBruto: unknown, ativoBruto: unknown, agora: number = Date.now()): Promise<ResultadoAdmin<{ id: number }>> {
  const v = validarNomeDeSetor(nomeBruto)
  if (!v.ok) return { ok: false, erro: v.erro }
  const nome = v.valor
  const editando = idBruto !== null && idBruto !== undefined
  if (editando && (typeof idBruto !== 'number' || !Number.isInteger(idBruto) || idBruto <= 0)) return { ok: false, erro: 'Setor inválido.' }
  const ativo = ativoBruto === undefined ? true : ativoBruto === true

  return executar<ResultadoAdmin<{ id: number }>>(async (tx) => {
    if (await nomeDeSetorEmUso(tx, nome, editando ? (idBruto as number) : null)) return { ok: false, erro: `Já existe um setor chamado "${nome}".` }
    let id: number
    if (editando) {
      id = idBruto as number
      if (!(await alterarSetor(tx, id, { nome, ativo }, ator, agora))) return { ok: false, erro: 'Setor não encontrado.' }
    } else {
      const novo = await criarSetor(tx, nome, ator, agora)
      if (novo === null) return { ok: false, erro: `Já existe um setor chamado "${nome}".` }
      id = novo
    }
    await registrarAcaoAdmin(tx, { ator, area: 'financeiro', verbo: 'setor', entidade: 'setor', entidadeId: String(id), detalhes: { nome, ativo, criando: !editando }, agora })
    return { ok: true, mensagem: editando ? `Setor "${nome}" ${ativo ? 'salvo' : 'desativado'}.` : `Setor "${nome}" criado.`, dados: { id } }
  })
}

export type { RecorrenteGravado }
