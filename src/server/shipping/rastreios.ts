/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Liga os envios do estado à biblioteca dos Correios e grava o último retrato
 * no banco. É chamado pelo job agendado, nunca por uma tela.
 *
 * Desde a E8 o job também acompanha a RETIRADA — a moeda que sai da custódia para o cliente. Antes
 * ele só olhava o que chega, e o código de rastreio de uma retirada ficava gravado sem nunca ser
 * consultado. O retrato da retirada vai para a mesma tabela, com `retirada_id` (migration 030).
 *
 * Desde 22/10/2026 (contrato com os Correios) o job também AVANÇA o que os Correios atestam. O
 * código de rastreio passou a nascer na pré-postagem, antes de o cliente ir à agência: o envio fica
 * em "Protocolo gerado" e a retirada em `separacao` com o código já gravado, e ninguém digita mais
 * nada no balcão. Sem o avanço automático, o envio ficaria em "Protocolo gerado" para sempre — e
 * cairia na regra dos 3 dias sem postagem — com o objeto já a caminho do cofre.
 *
 * Desde 30/10/2026 o "entregue" dos Correios também leva o envio a "Recebido pela custódia", que é
 * o que o põe na fila da bancada. Antes isso era manual (acordo 3 de `docs/EXECUCAO_CORREIOS_CWS.md`),
 * mas a tela que marcava à mão saiu na remodelação do painel e o envio RO-ENV-0019 do Sidnei,
 * entregue, nunca chegou à bancada. Nada aqui toca saldo, ledger ou fatura.
 * ==========================================================================*/

import 'server-only'

import {
  avancosDaRetiradaPeloRastreio,
  postagemDoEnvioPeloRastreio,
  recebimentoDoEnvioPeloRastreio,   type RetratoParaAvanco,
} from '@/domain/rastreio'
import { transicionarRetirada } from '@/domain/retirada'
import { ETAPAS_ENVIO, type Envio, type Retirada } from '@/domain/types'
import { atualizarRastreiosEmLote, normalizarCodigoRastreio, type RastreioObjetoResult } from '@/lib/shipping'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import {
  carregarRastreios,
  salvarRastreio,
  salvarRastreioDeRetirada,
  type RastreioGravado,
} from '@/server/db/repositories/rastreios'
import { repositorioRetiradas } from '@/server/shipping/retiradas'
import { getState, mutateState } from '@/server/state'

/** Quem aparece no histórico da retirada quando o avanço vem do rastreio, e não de uma pessoa. */
export const AUTOR_CORREIOS = 'correios'

export interface ResumoAtualizacao {
  verificados: number
  gravados: number
  persistido: boolean
  codigos: string[]
  /** Retiradas em separação ou postadas, com código, que entraram na consulta desta rodada (E8). */
  retiradasVerificadas: number
  /** Retiradas cujo retrato foi gravado no banco (E8). */
  retiradasGravadas: number
  /**
   * Retratos que NÃO foram regravados: a consulta falhou (`indisponivel`) e já havia um retrato bom
   * guardado. A falha de um minuto não apaga a linha do tempo que o cliente estava vendo.
   */
  retratosPreservados: number
  /** Envios que passaram sozinhos de "Protocolo gerado" para "Envio postado" nesta rodada. */
  enviosPostados: number
  /** Envios que passaram sozinhos para "Recebido pela custódia" porque os Correios registraram a entrega. */
  enviosRecebidos: number
  /** Retiradas que passaram sozinhas de `separacao` para `postada` nesta rodada. */
  retiradasPostadas: number
  /** Retiradas que passaram sozinhas de `postada` para `entregue` nesta rodada. */
  retiradasEntregues: number
}

/**
 * Quais envios ainda valem uma consulta.
 *
 * Objeto que chegou à última etapa não muda mais de estado, e continuar consultando os Correios
 * por ele é gastar requisição — a API tem limite, e o limite é o motivo de o rastreio ser um job
 * agendado em vez de uma consulta por visita.
 *
 * Envio DESCONSIDERADO também fica de fora: o protocolo foi encerrado e não volta. O filtro olha
 * só `desconsideradoEm` gravado, e não a regra de leitura dos 3 dias (`isEnvioDesconsiderado`): o
 * envio de pré-postagem que o cliente levou à agência no 4º dia ainda está, de fato, indo para o
 * cofre, e o rastreio é justamente o que prova isso.
 */
function pendentes(envios: readonly Envio[]): Envio[] {
  const ultimaEtapa = ETAPAS_ENVIO[ETAPAS_ENVIO.length - 1]
  return envios.filter((e) => e.codigoRastreio !== null && e.etapaAtual !== ultimaEtapa && !e.desconsideradoEm)
}

/**
 * Quais retiradas ainda valem uma consulta: em `separacao` ou `postada`, com código.
 *
 * `separacao` entrou em 22/10/2026: o código nasce na etiqueta do contrato, antes da postagem, e é
 * a consulta que descobre quando a agência recebeu o objeto. Entregue e cancelada ficam de fora
 * pelo mesmo motivo dos envios — objeto que não muda mais de estado só gasta requisição.
 */
function retiradasPendentes(retiradas: readonly Retirada[]): Retirada[] {
  return retiradas.filter((r) => (r.status === 'separacao' || r.status === 'postada') && Boolean(r.codigoRastreio))
}

/** Aplica os passos que o rastreio pede, pela máquina de estados do domínio. */
function aplicarAvancos(ret: Retirada, retrato: RetratoParaAvanco): Retirada | null {
  const passos = avancosDaRetiradaPeloRastreio(ret, retrato)
  if (passos.length === 0) return null
  let atual = ret
  for (const p of passos) {
    atual = transicionarRetirada(atual, p.para, {
      data: p.data,
      autor: AUTOR_CORREIOS,
      motivo:
        p.para === 'postada'
          ? `Postagem registrada pelos Correios (rastreio ${retrato.codigoRastreio})`
          : 'Entrega registrada pelos Correios',
    })
  }
  return { ...atual, updatedAt: Date.now() }
}

/**
 * Leva a retirada adiante, se o rastreio pedir. Relê do repositório antes de gravar: entre a
 * listagem do começo do job e este ponto a equipe pode ter mexido nela pelo painel, e a decisão é
 * refeita sobre o registro de agora — a máquina de estados recusaria um passo repetido, mas recusar
 * com erro no meio do job é pior do que não tentar.
 *
 * O espelho em `state.retiradas` segue o desenho de `src/server/actions/custody.ts`: o repositório é
 * a fonte, e o estado recebe a mesma transição quando a retirada também mora nele.
 */
async function avancarRetirada(
  id: string,
  retrato: RetratoParaAvanco,
  noEstado: boolean,
): Promise<{ postada: boolean; entregue: boolean }> {
  const repo = repositorioRetiradas()
  const atual = await repo.buscarPorId(id)
  if (!atual) return { postada: false, entregue: false }
  const atualizada = aplicarAvancos(atual, retrato)
  if (!atualizada) return { postada: false, entregue: false }

  await repo.atualizar(atualizada)

  if (noEstado) {
    await mutateState((s) => {
      const lista = s.retiradas ?? []
      const idx = lista.findIndex((r) => r.id === id)
      if (idx < 0) return
      // A transição refeita sobre a cópia do estado, e não a do repositório colada por cima: cada
      // um guarda os próprios campos, e o espelho não pode apagar o que só o estado tem.
      const espelho = aplicarAvancos(lista[idx], retrato)
      if (espelho) lista[idx] = espelho
    })
  }

  return {
    postada: atual.status === 'separacao' && (atualizada.status === 'postada' || atualizada.status === 'entregue'),
    entregue: atualizada.status === 'entregue',
  }
}

/**
 * Consulta os Correios para todos os envios e retiradas pendentes, grava o retrato e avança o que
 * os Correios atestam.
 *
 * Sem `POSTGRES_URL` a consulta acontece e o resultado é devolvido, mas o retrato não é gravado —
 * não há onde. O AVANÇO acontece mesmo assim, porque ele passa por `mutateState` e pelo repositório
 * de retiradas, que funcionam em memória: é o mesmo desenho do resto da plataforma.
 */
export async function atualizarRastreiosPendentes(): Promise<ResumoAtualizacao> {
  const state = await getState()
  const envios = pendentes(state.envios)
  const codigos = envios.map((e) => e.codigoRastreio as string)

  // A lista de retiradas mora no repositório, e não no estado. Se ela não vier, o job segue só com
  // os envios: perder o rastreio da saída é ruim, perder também o da entrada seria pior.
  let retiradas: Retirada[] = []
  try {
    retiradas = retiradasPendentes(await repositorioRetiradas().listarTodas())
  } catch (err) {
    console.error('[rastreio] retiradas indisponíveis; seguindo só com os envios:', err)
  }
  const codigosRetirada = retiradas.map((r) => r.codigoRastreio as string)

  const resumo: ResumoAtualizacao = {
    verificados: codigos.length,
    gravados: 0,
    persistido: bancoConfigurado(),
    codigos,
    retiradasVerificadas: codigosRetirada.length,
    retiradasGravadas: 0,
    retratosPreservados: 0,
    enviosPostados: 0,
    enviosRecebidos: 0,
    retiradasPostadas: 0,
    retiradasEntregues: 0,
  }
  if (codigos.length === 0 && codigosRetirada.length === 0) return resumo

  // Uma chamada só aos Correios para envios e retiradas: o lote é o que respeita o limite da API.
  const resultados = await atualizarRastreiosEmLote([...codigos, ...codigosRetirada])
  // A fundação devolve o mapa pela chave normalizada; o código gravado pode ter vindo digitado.
  const retratoDe = (codigo: string): RastreioObjetoResult | undefined => resultados[normalizarCodigoRastreio(codigo)]

  if (bancoConfigurado()) {
    // Uma transação para todas as gravações de envio: o job é um retrato de um instante, e meia
    // atualização gravada é pior de diagnosticar do que nenhuma.
    const envio = await executarNoBanco(async (tx) => {
      let gravados = 0
      let preservados = 0
      for (const e of envios) {
        const r = retratoDe(e.codigoRastreio as string)
        if (!r) continue
        const registro: RastreioGravado = { ...r, protocolo: e.protocolo }
        if (await salvarRastreio(tx, registro)) gravados += 1
        else preservados += 1
      }
      return { gravados, preservados }
    })
    resumo.gravados = envio.gravados
    resumo.retratosPreservados += envio.preservados

    // Transação separada para as retiradas, de propósito: uma gravação de retirada que falhe — por
    // exemplo com a migration 030 ainda não aplicada — não pode desfazer o retrato dos envios, que
    // já está certo e é o que a tela do cliente lê.
    if (retiradas.length > 0) {
      try {
        const ret = await executarNoBanco(async (tx) => {
          let gravados = 0
          let preservados = 0
          for (const r0 of retiradas) {
            const r = retratoDe(r0.codigoRastreio as string)
            if (!r) continue
            if (await salvarRastreioDeRetirada(tx, { ...r, retiradaId: r0.id })) gravados += 1
            else preservados += 1
          }
          return { gravados, preservados }
        })
        resumo.retiradasGravadas = ret.gravados
        resumo.retratosPreservados += ret.preservados
      } catch (err) {
        console.error('[rastreio] retrato das retiradas não gravou; os envios foram gravados:', err)
      }
    }
  }

  /* --- Avanço automático dos envios: "Protocolo gerado" → "Envio postado" --------------------- */
  const postagens = new Map<string, RetratoParaAvanco>()
  for (const e of envios) {
    const r = retratoDe(e.codigoRastreio as string)
    if (r && postagemDoEnvioPeloRastreio(e, r) !== null) postagens.set(e.protocolo, r)
  }
  if (postagens.size > 0) {
    try {
      const { result } = await mutateState((s) => {
        let n = 0
        for (const [protocolo, r] of postagens) {
          const envio = s.envios.find((e) => e.protocolo === protocolo)
          if (!envio) continue
          // Conferido DE NOVO dentro da mutação: o retrato acima é de antes da consulta, e no meio
          // dela o cliente pode ter informado a postagem à mão ou a equipe desconsiderado o envio.
          const dataPostagem = postagemDoEnvioPeloRastreio(envio, r)
          if (dataPostagem === null) continue
          envio.dataPostagem = dataPostagem
          envio.etapaAtual = 'Envio postado'
          n += 1
        }
        return n
      })
      resumo.enviosPostados = result
    } catch (err) {
      console.error('[rastreio] avanço dos envios não gravou; o retrato continua valendo:', err)
    }
  }

  /* --- Entrega dos Correios → "Recebido pela custódia" (entra na fila da bancada) --------------- */
  const entregas = new Map<string, RetratoParaAvanco>()
  for (const e of envios) {
    const r = retratoDe(e.codigoRastreio as string)
    if (r && recebimentoDoEnvioPeloRastreio(e, r) !== null) entregas.set(e.protocolo, r)
  }
  if (entregas.size > 0) {
    try {
      const { result } = await mutateState((s) => {
        let n = 0
        for (const [protocolo, r] of entregas) {
          const envio = s.envios.find((e) => e.protocolo === protocolo)
          if (!envio) continue
          // Conferido DE NOVO dentro da mutação (e é o que torna o reprocesso inofensivo): se a
          // equipe ou uma rodada anterior já levou o envio adiante, não há o que fazer.
          const rec = recebimentoDoEnvioPeloRastreio(envio, r)
          if (rec === null) continue
          envio.dataPostagem = rec.dataPostagem
          envio.dataRecebimento = rec.dataRecebimento
          envio.etapaAtual = 'Recebido pela custódia'
          n += 1
        }
        return n
      })
      resumo.enviosRecebidos = result
    } catch (err) {
      console.error('[rastreio] recebimento dos envios não gravou; o retrato continua valendo:', err)
    }
  }

  /* --- Avanço automático das retiradas: separacao → postada → entregue ------------------------ */
  const idsNoEstado = new Set((state.retiradas ?? []).map((r) => r.id))
  for (const ret of retiradas) {
    const r = retratoDe(ret.codigoRastreio as string)
    if (!r || avancosDaRetiradaPeloRastreio(ret, r).length === 0) continue
    // Uma retirada que falhe não segura as outras: cada uma é gravada por conta própria.
    try {
      const feito = await avancarRetirada(ret.id, r, idsNoEstado.has(ret.id))
      if (feito.postada) resumo.retiradasPostadas += 1
      if (feito.entregue) resumo.retiradasEntregues += 1
    } catch (err) {
      console.error(`[rastreio] avanço da retirada ${ret.id} não gravou:`, err)
    }
  }

  return resumo
}

/**
 * O que a tela de envios e o painel de logística mostram. Lê do banco, nunca dos Correios.
 *
 * A chave é a do dono: o protocolo, para envio; o id da retirada, para retirada (o mapeamento do
 * repositório já resolve isso). É a mesma chave que `/admin/logistica` procura.
 *
 * Sem banco configurado devolve vazio, e a tela cai no texto "rastreio ainda
 * não consultado" — que é a verdade, não uma falha.
 */
export async function rastreiosPorProtocolo(): Promise<Record<string, RastreioGravado>> {
  if (!bancoConfigurado()) return {}
  const linhas = await executarNoBanco((tx) => carregarRastreios(tx))
  const mapa: Record<string, RastreioGravado> = {}
  for (const l of linhas) mapa[l.protocolo] = l
  return mapa
}
