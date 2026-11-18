/**
 * O despacho: tira da fila o que está pendente, monta o texto, manda e registra o resultado.
 *
 * O executor do banco e a função de envio chegam POR PARÂMETRO — o mesmo desenho de `mutarEstado` e do
 * processamento de NFS-e. Dois ganhos: a suíte roda tudo no PGlite com um "provedor" que só anota o que recebeu,
 * e este arquivo não tem `server-only` nem importa o provedor (quem o liga é `despacho.ts`).
 *
 * FALHA DE E-MAIL NUNCA DERRUBA NADA. O despacho roda DEPOIS da resposta (`after()` em agendar.ts) e cada linha é
 * tentada dentro de `try/catch`: provedor fora do ar, texto malformado ou erro de gravação viram `ultimo_erro` na
 * linha e uma linha de log — e a próxima linha segue. A linha que falha volta para a fila e é tentada de novo
 * (até `TENTATIVAS_MAXIMAS`, dentro da validade de 24 h).
 *
 * `despacharAgora` é o ramo SEM banco (Redis/memória, só desenvolvimento): não há fila durável, então envia na
 * hora e guarda as chaves já vistas na memória do processo para o mesmo evento não sair duas vezes. Em produção
 * há sempre `POSTGRES_URL`, e este ramo não roda.
 */

import type { MensagemDeEmail, ResultadoDeEnvio } from '@/lib/email/tipos'
import type { Executor } from '@/server/db/sql'

import { expirarAntigos, marcarEnviado, registrarFalha, reivindicar } from './fila'
import { montarEmail } from './modelos'
import type { DadosPorTipo, EventoDeEmail, TipoDeEmail } from './tipos'

export type Enviar = (m: MensagemDeEmail) => Promise<ResultadoDeEnvio>

export interface ResumoDoDespacho {
  /** O provedor aceitou. */
  enviados: number
  /** Não havia provedor configurado: o texto foi só para o log do servidor. */
  simulados: number
  /** O provedor recusou ou o texto não montou; a linha volta para a fila (ou desiste). */
  falhas: number
  /** Pendentes que passaram de 24 h e foram descartadas. */
  expirados: number
}

export interface OpcoesDoDespacho {
  agora?: number
  /** Linhas por lote. */
  limite?: number
  /** Teto de linhas por chamada: o `after()` de uma mutação não pode virar um processo longo. */
  maximo?: number
}

function mensagemDeErro(e: unknown): string {
  return e instanceof Error ? e.message : 'falha ao enviar e-mail'
}

/** Monta e manda um evento. `dados` chega solto do banco; o tipo diz qual modelo vale. */
async function mandar(
  enviar: Enviar,
  evento: { chave: string; tipo: TipoDeEmail; para: string; dados: unknown },
): Promise<ResultadoDeEnvio> {
  const montado = montarEmail(evento.tipo, evento.dados as DadosPorTipo[typeof evento.tipo])
  return enviar({ para: evento.para, assunto: montado.assunto, texto: montado.texto, idempotencyKey: evento.chave })
}

/** Esvazia a fila, um lote por vez, até `maximo` linhas. */
export async function despacharPendentes(
  executar: Executor,
  enviar: Enviar,
  opcoes: OpcoesDoDespacho = {},
): Promise<ResumoDoDespacho> {
  const agora = opcoes.agora ?? Date.now()
  const limite = opcoes.limite ?? 20
  const maximo = opcoes.maximo ?? 100
  const resumo: ResumoDoDespacho = { enviados: 0, simulados: 0, falhas: 0, expirados: 0 }

  resumo.expirados = await executar((tx) => expirarAntigos(tx, agora))

  let processadas = 0
  while (processadas < maximo) {
    const lote = await executar((tx) => reivindicar(tx, { limite: Math.min(limite, maximo - processadas), agora }))
    if (lote.length === 0) break
    for (const linha of lote) {
      processadas += 1
      let resultado: ResultadoDeEnvio
      try {
        resultado = await mandar(enviar, linha)
      } catch (e) {
        resultado = { ok: false, erro: mensagemDeErro(e) }
      }
      try {
        if (resultado.ok) {
          await executar((tx) =>
            marcarEnviado(tx, linha.id, { agora: Date.now(), idProvedor: resultado.id ?? null, simulado: Boolean(resultado.simulado) }),
          )
          if (resultado.simulado) resumo.simulados += 1
          else resumo.enviados += 1
        } else {
          resumo.falhas += 1
          await executar((tx) => registrarFalha(tx, linha.id, { erro: resultado.erro ?? 'erro desconhecido', agora: Date.now() }))
        }
      } catch (e) {
        // Não conseguir nem anotar o resultado: a reserva expira sozinha e a linha volta à fila.
        console.error(`[emails] não consegui registrar o resultado de ${linha.chave}:`, e)
      }
    }
    if (lote.length < limite) break
  }
  return resumo
}

/** As chaves que este processo já mandou sem fila. `globalThis`: o Next tem mais de um grafo de bundle por processo. */
function chavesVistas(): Set<string> {
  const g = globalThis as typeof globalThis & { __aureaEmailsEnviados?: Set<string> }
  g.__aureaEmailsEnviados ??= new Set<string>()
  return g.__aureaEmailsEnviados
}

/**
 * Sem fila durável: manda cada evento na hora e lembra a chave. Nunca lança.
 * Devolve quantos foram entregues ao provedor (ou ao registro local, que conta como entregue).
 */
export async function despacharAgora(eventos: readonly EventoDeEmail[], enviar: Enviar): Promise<number> {
  const vistas = chavesVistas()
  let entregues = 0
  for (const e of eventos) {
    if (vistas.has(e.chave)) continue
    vistas.add(e.chave)
    try {
      const r = await mandar(enviar, e)
      if (r.ok) entregues += 1
      else console.error(`[emails] ${e.chave} não saiu: ${r.erro ?? 'erro desconhecido'}`)
    } catch (err) {
      console.error(`[emails] ${e.chave} não saiu:`, err)
    }
  }
  return entregues
}

/** Só para a suíte: esquece as chaves do ramo sem banco. */
export function esquecerChavesEmMemoria(): void {
  chavesVistas().clear()
}
