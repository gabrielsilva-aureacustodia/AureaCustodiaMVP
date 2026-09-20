/* ============================================================================
 * CADASTRO DIRETO DE MOEDA — somente servidor.
 *
 * Registra no acervo de um cliente uma moeda que JÁ está no armazém e JÁ foi
 * conferida fora do sistema, sem passar pelo envio postal nem pela fila da
 * bancada. É o caminho para o acervo que a empresa recebeu antes de a
 * plataforma existir, para moeda entregue em mãos e para acervo próprio.
 *
 * A MOEDA NASCE IDÊNTICA À DA BANCADA, E ISSO É O PONTO
 * -----------------------------------------------------
 * Nada aqui é atalho de dado: a moeda recebe código sequencial da mesma série,
 * recibo derivado do código, e o hash do recibo é o hash de um registro de
 * `Analise` encadeado na MESMA corrente SHA-256 que `fecharAnalise()` alimenta.
 * Quem auditar a corrente depois não encontra buraco, e a moeda é negociável no
 * marketplace como qualquer outra. A fórmula do hash não muda: `origem` entra em
 * `Analise` sem entrar em `CAMPOS_DA_ANALISE`, que é o caminho que o próprio
 * `domain/analise.ts` documenta como seguro.
 *
 * O QUE DENUNCIA A ORIGEM, DE DENTRO DO HASH
 * ------------------------------------------
 * `protocoloEnvio` ESTÁ na fórmula do hash, e aqui ele vale `RO-DIR-0001` em vez
 * de `RO-ENV-0001`. Ou seja: a origem não é um rótulo solto que alguém edita no
 * banco sem quebrar nada — ela está assada dentro do hash da análise e de todos
 * os hashes seguintes da corrente. Uma auditoria distingue moeda de bancada de
 * moeda de cadastro direto sem depender de boa-fé.
 *
 * `pesoMg` vai 0 quando ninguém pesou, e é honesto que vá: zero num laudo de
 * cadastro direto se lê como "não aferido aqui", enquanto um peso inventado se
 * leria como medição que nunca houve.
 *
 * QUEM PODE
 * ---------
 * Não há checagem de permissão nesta função, de propósito: ela é o serviço, e
 * quem cobra a permissão é a Server Action que a chama
 * (`src/server/actions/admin/cadastro-direto.ts`), do mesmo jeito que o resto do
 * painel. Chamar este módulo de outro lugar sem conferir permissão é bug.
 * ==========================================================================*/

import 'server-only'

import { encadearAnalise, nextAnaliseCode, ultimoHashDeAnalise, type AnalisePendente } from '@/domain/analise'
import { nextCodigoRecibo, nextCoinCode } from '@/domain/codes'
import { COIN_TYPES, coinTypeInfo, faixaValor, isNegociavel } from '@/domain/constants'
import { fdate } from '@/domain/dates'
import { GENESIS } from '@/domain/hash'
import { medianSellPrice } from '@/domain/market'
import type { Analise, AppState, Cents, Coin, CoinType } from '@/domain/types'
import { carregarCatalogo } from '@/server/config/carregar'
import { mutateState } from '@/server/state'

/** Teto por operação. Não é regra de negócio: é freio contra zero a mais na digitação. */
export const MAX_POR_CADASTRO_DIRETO = 500

export interface EntradaCadastroDireto {
  /** Dono da moeda. Precisa existir no estado. */
  userEmail: string
  /** Chave do catálogo vigente. */
  tipoMoeda: string
  ano: number
  quantidade: number
  /** E-mail de quem está registrando — vai para `operador` e `aprovador` da análise. */
  operador: string
  /** Peso aferido, em miligramas inteiros. 0 quando não houve pesagem aqui. */
  pesoMg?: number
  /** Caixa física onde as cápsulas estão, quando se sabe. */
  caixa?: string | null
  /** Motivo do cadastro direto, para a trilha. Ex.: "acervo anterior à plataforma". */
  observacao?: string | null
}

export type ResultadoCadastroDireto =
  | { tipo: 'ok'; protocolo: string; moedas: string[]; recibos: string[] }
  | { tipo: 'usuario-nao-encontrado' }
  | { tipo: 'tipo-invalido'; tipoMoeda: string }
  | { tipo: 'quantidade-invalida'; max: number }

/**
 * O valor estimado com que a moeda nasce — a MESMA regra de `fecharAnalise`.
 *
 * Tipo negociável usa a mediana das ofertas abertas dele; sem mercado, cai no
 * meio da faixa de referência. Nunca sorteio: esta moeda existe de verdade, e
 * um número sorteado num recibo de custódia é um número que ninguém consegue
 * explicar ao cliente que perguntar de onde veio.
 */
function valorDeEntrada(state: AppState, tipoMoeda: string, catalogo: readonly CoinType[]): Cents {
  const mediana = isNegociavel(tipoMoeda, catalogo) ? medianSellPrice(state, tipoMoeda) : null
  if (mediana !== null) return Math.round(mediana / 500) * 500
  const faixa = faixaValor(tipoMoeda)
  return Math.round((faixa.min + faixa.max) / 2 / 500) * 500
}

/**
 * Próximo protocolo de cadastro direto: 'RO-DIR-0001'.
 *
 * Conta os protocolos `RO-DIR-` já presentes na corrente em vez de usar um
 * contador em `seq`: assim não é preciso mexer no schema da tabela `seq`, e o
 * número continua único porque a corrente é a fonte da verdade.
 */
function proximoProtocoloDireto(analises: readonly Analise[]): string {
  const usados = new Set(analises.map((a) => a.protocoloEnvio).filter((p) => p.startsWith('RO-DIR-')))
  return 'RO-DIR-' + String(usados.size + 1).padStart(4, '0')
}

/**
 * Registra `quantidade` moedas no acervo do cliente, cada uma com recibo e hash.
 *
 * Todas as moedas do lote compartilham um protocolo `RO-DIR-nnnn`, do mesmo jeito
 * que as moedas de um envio compartilham o `RO-ENV-nnnn` dele.
 */
export async function cadastrarMoedasDiretamente(
  entrada: EntradaCadastroDireto,
): Promise<ResultadoCadastroDireto> {
  const quantidade = Math.floor(entrada.quantidade)
  if (!Number.isFinite(quantidade) || quantidade < 1 || quantidade > MAX_POR_CADASTRO_DIRETO) {
    return { tipo: 'quantidade-invalida', max: MAX_POR_CADASTRO_DIRETO }
  }

  // O catálogo editado no painel decide o tipo. Falha de leitura cai no catálogo
  // do código (RA-47) em vez de impedir um registro de moeda que já está na mão.
  const catalogo = await carregarCatalogo().catch((err: unknown) => {
    console.error('[cadastroDireto] catálogo não leu; valendo o do código:', err)
    return COIN_TYPES
  })
  if (!catalogo.some((t) => t.key === entrada.tipoMoeda)) {
    return { tipo: 'tipo-invalido', tipoMoeda: entrada.tipoMoeda }
  }

  const email = entrada.userEmail.trim().toLowerCase()
  const pesoMg = Number.isFinite(entrada.pesoMg) ? Math.max(0, Math.round(entrada.pesoMg as number)) : 0
  const caixa = entrada.caixa?.trim() || null
  const observacao = entrada.observacao?.trim() || null

  const { result } = await mutateState<ResultadoCadastroDireto>((state) => {
    const dono = state.users[email]
    if (!dono) return { tipo: 'usuario-nao-encontrado' }

    const agora = Date.now()
    const entradaStr = fdate(agora)
    const valor = valorDeEntrada(state, entrada.tipoMoeda, catalogo)
    const protocolo = proximoProtocoloDireto(state.analises)

    // A corrente continua de onde parou. A primeira análise do sistema encadeia
    // no GENESIS — 64 zeros, a mesma convenção do ledger.
    let anterior = ultimoHashDeAnalise(state.analises) ?? GENESIS

    const moedas: string[] = []
    const recibos: string[] = []

    for (let i = 0; i < quantidade; i++) {
      const id = nextCoinCode(state.seq)
      const coin: Coin = {
        id,
        tipoMoeda: entrada.tipoMoeda,
        ano: entrada.ano,
        entrada: entradaStr,
        // 'Armazenado', não 'Recebido': a moeda do cadastro direto já está no
        // armazém — foi por isso que ela não passou pelo envio postal.
        statusFisico: 'Armazenado',
        statusDigital: 'Validado',
        valorEstimado: valor,
        protocolo,
        recibo: {
          codigo: nextCodigoRecibo(id),
          // Preenchido logo abaixo com o hash da análise, exatamente como na
          // bancada: o recibo desta moeda É a prova do registro que a criou.
          hash: '',
          dataEmissao: entradaStr,
          status: 'Ativo',
        },
      }

      const pendente: AnalisePendente = {
        protocolo: nextAnaliseCode(state.seq),
        protocoloEnvio: protocolo,
        codigoMoeda: coin.id,
        codigoRecibo: coin.recibo.codigo,
        tipoMoeda: entrada.tipoMoeda,
        ano: entrada.ano,
        pesoMg,
        veredito: 'aprovada',
        motivoRecusa: null,
        operador: entrada.operador,
        aprovador: entrada.operador,
        caixa,
        posicao: null,
        validadoEm: agora,
        caminhoVideo: null,
        origem: 'cadastro_direto',
        observacao,
      }

      const analise = encadearAnalise(pendente, anterior)
      anterior = analise.hash
      state.analises.push(analise)

      coin.recibo.hash = analise.hash
      dono.coins.push(coin)

      moedas.push(coin.id)
      recibos.push(coin.recibo.codigo)
    }

    return { tipo: 'ok', protocolo, moedas, recibos }
  })

  return result
}
