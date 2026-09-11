/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Fala com o banco por `mutateState`. Não importe de Client Component.
 * ==========================================================================*/

import 'server-only'

import { encadearAnalise, nextAnaliseCode, ultimoHashDeAnalise, type AnalisePendente } from '@/domain/analise'
import { nextCodigoRecibo } from '@/domain/codes'
import { faixaValor, isNegociavel } from '@/domain/constants'
import { fdate } from '@/domain/dates'
import { GENESIS } from '@/domain/hash'
import { medianSellPrice } from '@/domain/market'
import { nextCoinCode } from '@/domain/codes'
import { ETAPAS_ENVIO } from '@/domain/types'
import type { Analise, AppState, Cents, Coin, Envio, VereditoAnalise } from '@/domain/types'
import { getState, mutateState } from '@/server/state'

/**
 * O lado servidor da bancada.
 *
 * POR QUE ISTO NÃO É UMA SERVER ACTION
 * ------------------------------------
 * Server Actions são chamadas pelo navegador com o cookie da sessão. Quem chama
 * aqui é um programa Electron rodando num notebook, autenticado por chave
 * própria (`acesso.ts`). Ele bate numa rota HTTP comum, e a rota chama estas
 * funções. `advanceAnalysis` em actions/custody.ts continua existindo e serve à
 * demonstração pela tela — as duas escrevem o mesmo estado, pela mesma
 * transação, e nenhuma sabe da outra.
 *
 * A DIFERENÇA QUE IMPORTA entre as duas: a da tela emite recibo com `genHash()`,
 * que sorteia. Esta emite com o hash real da análise, encadeado no anterior. É a
 * dívida RA-05 sendo paga onde ela importa — na moeda que existe de verdade.
 */

/* ---------------------------------------------------------------------------
 * 1. A fila
 * ------------------------------------------------------------------------- */

export interface ItemDaFila {
  protocolo: string
  cliente: string
  clienteEmail: string
  tipoMoeda: string
  ano: number
  quantidade: number
  etapaAtual: string
  codigoRastreio: string | null
  recebidoEm: number | null
}

/** Etapas em que a bancada pode pegar um envio para trabalhar. */
const ETAPAS_DA_BANCADA = ['Recebido pela custódia', 'Em análise física'] as const

/**
 * O que está esperando na bancada.
 *
 * Leitura pura: não trava e não muta. É o que a estação chama ao abrir e a cada
 * atualização manual do operador — não há polling aqui, porque envio chega
 * algumas vezes por dia, não por segundo.
 */
export async function filaDeAnalise(): Promise<ItemDaFila[]> {
  const state = await getState()
  const naBancada = state.envios.filter((e) =>
    (ETAPAS_DA_BANCADA as readonly string[]).includes(e.etapaAtual),
  )
  return naBancada.map((e) => ({
    protocolo: e.protocolo,
    cliente: state.users[e.userEmail]?.name ?? e.userEmail,
    clienteEmail: e.userEmail,
    tipoMoeda: e.tipoMoeda,
    ano: e.ano,
    quantidade: e.quantidade,
    etapaAtual: e.etapaAtual,
    codigoRastreio: e.codigoRastreio,
    recebidoEm: e.dataRecebimento,
  }))
}

/* ---------------------------------------------------------------------------
 * 2. Abrir o procedimento
 * ------------------------------------------------------------------------- */

export type ResultadoEstacao<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { dados?: undefined } : { dados: T }))
  | { ok: false; status: 404 | 409 | 422 | 500; erro: string }

/**
 * Move o envio para 'Em análise física'.
 *
 * Idempotente: chamar duas vezes num envio já aberto devolve ok. O operador que
 * clicou duas vezes, ou o programa que repetiu a chamada depois de uma queda de
 * rede, não pode receber erro por isso — a fila offline reenvia, e reenvio que
 * falha é reenvio que fica preso para sempre.
 */
export async function abrirAnalise(protocolo: string): Promise<ResultadoEstacao> {
  try {
    const { result } = await mutateState((state) => {
      const envio = state.envios.find((e) => e.protocolo === protocolo)
      if (!envio) return 'nao-encontrado' as const
      if (envio.etapaAtual === 'Em análise física') return 'ok' as const
      if (envio.etapaAtual !== 'Recebido pela custódia') return 'etapa-errada' as const
      envio.etapaAtual = 'Em análise física'
      return 'ok' as const
    })
    if (result === 'nao-encontrado') return naoEncontrado(protocolo)
    if (result === 'etapa-errada') {
      return {
        ok: false,
        status: 409,
        erro: `O envio ${protocolo} não está na etapa de recebimento. Atualize a fila.`,
      }
    }
    return { ok: true }
  } catch {
    return { ok: false, status: 500, erro: 'Falha ao gravar a abertura da análise.' }
  }
}

/* ---------------------------------------------------------------------------
 * 3. Fechar o procedimento — onde a moeda nasce
 * ------------------------------------------------------------------------- */

/** O veredito de UMA unidade do envio, como a bancada o envia. */
export interface VereditoRecebido {
  pesoMg: number
  veredito: VereditoAnalise
  motivoRecusa?: string | null
  caixa?: string | null
  posicao?: number | null
  caminhoVideo?: string | null
}

export interface EntradaFechamento {
  protocolo: string
  operador: string
  moedas: VereditoRecebido[]
}

export interface SaidaFechamento {
  protocolo: string
  aprovadas: number
  recusadas: number
  analises: Array<{ protocolo: string; codigoMoeda: string | null; hash: string }>
}

function naoEncontrado(protocolo: string): ResultadoEstacao<never> {
  return { ok: false, status: 404, erro: `Envio ${protocolo} não encontrado.` }
}

/**
 * O valor estimado com que a moeda nasce.
 *
 * Tipo negociável usa a mediana das ofertas abertas DELE; sem mercado, cai no
 * MEIO da faixa de referência do tipo. `advanceAnalysis` sorteia dentro da
 * faixa, e ali isso é aceitável porque a tela é demonstração. Aqui não: esta
 * moeda existe de verdade, e um valor sorteado num recibo de custódia é um
 * número que ninguém consegue explicar ao cliente que perguntar de onde veio.
 */
function valorDeEntrada(state: AppState, tipoMoeda: string): Cents {
  const mediana = isNegociavel(tipoMoeda) ? medianSellPrice(state, tipoMoeda) : null
  if (mediana !== null) return Math.round(mediana / 500) * 500
  const faixa = faixaValor(tipoMoeda)
  return Math.round((faixa.min + faixa.max) / 2 / 500) * 500
}

/** Texto obrigatório vira `null` quando vazio — ver o teste do vetor congelado. */
function textoOuNulo(v: string | null | undefined): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length > 0 ? t : null
}

/**
 * Grava o veredito do envio inteiro: cria as moedas aprovadas com recibo e hash
 * real, registra todas as análises na corrente e fecha o envio.
 *
 * D7b — O ENVIO INTEIRO, DE UMA VEZ. O número de vereditos precisa bater com
 * `envio.quantidade`. Não existe aprovação parcial nesta versão: o envio está
 * aberto ou fechado, e é o comportamento que `advanceAnalysis` já tinha. Moeda
 * recusada é devolvida ao cliente, com frete por conta dele (decisão de
 * 10/09/2026) — o registro da recusa é o que sustenta essa conversa.
 *
 * O `validadoEm` sai do relógio DESTE processo, não do notebook da bancada. É a
 * diferença entre um hash que qualquer pessoa reproduz e um que depende de o
 * relógio de uma máquina estar certo.
 */
export async function fecharAnalise(
  entrada: EntradaFechamento,
): Promise<ResultadoEstacao<SaidaFechamento>> {
  const { protocolo, operador, moedas } = entrada

  try {
    const { result } = await mutateState((state) => {
      const envio: Envio | undefined = state.envios.find((e) => e.protocolo === protocolo)
      if (!envio) return { tipo: 'nao-encontrado' as const }

      if (envio.etapaAtual === 'Recibo emitido') {
        return { tipo: 'ja-fechado' as const }
      }
      if (!(ETAPAS_DA_BANCADA as readonly string[]).includes(envio.etapaAtual)) {
        return { tipo: 'etapa-errada' as const, etapa: envio.etapaAtual }
      }
      if (moedas.length !== envio.quantidade) {
        return { tipo: 'quantidade' as const, esperada: envio.quantidade }
      }

      const dono = state.users[envio.userEmail]
      if (!dono) return { tipo: 'nao-encontrado' as const }

      const agora = Date.now()
      const entradaStr = fdate(agora)
      const valor = valorDeEntrada(state, envio.tipoMoeda)
      // A corrente continua de onde parou. Primeira análise do sistema encadeia
      // no GENESIS — 64 zeros, a mesma convenção do ledger.
      let anterior = ultimoHashDeAnalise(state.analises) ?? GENESIS

      const registradas: Analise[] = []

      for (const m of moedas) {
        const aprovada = m.veredito === 'aprovada'
        let coin: Coin | null = null

        if (aprovada) {
          const id = nextCoinCode(state.seq)
          coin = {
            id,
            tipoMoeda: envio.tipoMoeda,
            ano: envio.ano,
            entrada: entradaStr,
            // Nasce 'Recebido', como em advanceAnalysis. 'Armazenado' é o que a
            // auditoria mostra para o acervo antigo do seed.
            statusFisico: 'Recebido',
            statusDigital: 'Validado',
            valorEstimado: valor,
            protocolo: envio.protocolo,
            recibo: {
              codigo: nextCodigoRecibo(id),
              // Preenchido logo abaixo com o hash da análise: o recibo desta
              // moeda É a prova do procedimento que a aprovou.
              hash: '',
              dataEmissao: entradaStr,
              status: 'Ativo',
            },
          }
        }

        const pendente: AnalisePendente = {
          protocolo: nextAnaliseCode(state.seq),
          protocoloEnvio: envio.protocolo,
          codigoMoeda: coin ? coin.id : null,
          codigoRecibo: coin ? coin.recibo.codigo : null,
          tipoMoeda: envio.tipoMoeda,
          ano: envio.ano,
          pesoMg: Math.round(m.pesoMg),
          veredito: m.veredito,
          motivoRecusa: aprovada ? null : textoOuNulo(m.motivoRecusa),
          operador,
          // D7c — papel único: quem analisa é quem aprova. O campo existe
          // separado para que a segregação de função chegue depois sem mudar a
          // fórmula do hash e sem invalidar recibo já emitido.
          aprovador: operador,
          caixa: aprovada ? textoOuNulo(m.caixa) : null,
          posicao: aprovada && typeof m.posicao === 'number' ? Math.round(m.posicao) : null,
          validadoEm: agora,
          caminhoVideo: textoOuNulo(m.caminhoVideo),
        }

        const analise = encadearAnalise(pendente, anterior)
        anterior = analise.hash
        registradas.push(analise)
        state.analises.push(analise)

        if (coin) {
          coin.recibo.hash = analise.hash
          dono.coins.push(coin)
          envio.codigosAtivosGerados.push(coin.id)
        }
      }

      envio.etapaAtual = ETAPAS_ENVIO[ETAPAS_ENVIO.length - 1]

      const aprovadas = registradas.filter((a) => a.codigoMoeda !== null)

      // A custódia NÃO é cobrada aqui desde 11/09/2026. O mecanismo antigo
      // gravava uma cobrança por conta a cada envio aprovado; quem cobra agora
      // é o ciclo mensal (`src/server/custodia/faturamento.ts`), que conta as
      // moedas sob guarda na virada da competência. Cobrar nos dois lugares
      // cobraria duas vezes.

      return {
        tipo: 'ok' as const,
        saida: {
          protocolo: envio.protocolo,
          aprovadas: aprovadas.length,
          recusadas: registradas.length - aprovadas.length,
          analises: registradas.map((a) => ({
            protocolo: a.protocolo,
            codigoMoeda: a.codigoMoeda,
            hash: a.hash,
          })),
        },
      }
    })

    switch (result.tipo) {
      case 'nao-encontrado':
        return naoEncontrado(protocolo)
      case 'ja-fechado':
        return {
          ok: false,
          status: 409,
          erro: `O envio ${protocolo} já teve o recibo emitido. Não é possível analisar de novo.`,
        }
      case 'etapa-errada':
        return {
          ok: false,
          status: 409,
          erro: `O envio ${protocolo} está em "${result.etapa}" e não pode ser analisado agora.`,
        }
      case 'quantidade':
        return {
          ok: false,
          status: 422,
          erro: `O envio ${protocolo} tem ${result.esperada} moeda(s); vieram ${moedas.length} veredito(s). O envio inteiro é analisado de uma vez.`,
        }
      case 'ok':
        return { ok: true, dados: result.saida }
    }
  } catch {
    return { ok: false, status: 500, erro: 'Falha ao gravar a análise.' }
  }
}
