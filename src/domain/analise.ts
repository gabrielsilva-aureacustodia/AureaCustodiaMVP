/**
 * A análise física da bancada: código do procedimento e hash do recibo.
 *
 * NÃO É PORT. O monolito não tinha estação — o recibo nascia com `genHash()`,
 * que sorteia um texto com cara de hash e não prova nada (RA-05). Este arquivo
 * é a resposta: o recibo de uma moeda que passou pela bancada carrega o
 * SHA-256 determinístico e encadeado da análise que a aprovou.
 *
 * O ALGORITMO NÃO É NOVO
 * ----------------------
 * `hashEncadeado()` já existe em domain/hash.ts, escrito à mão a partir do
 * FIPS 180-4 e conferido contra os vetores oficiais e contra o `node:crypto`.
 * Ele foi escrito puro justamente para servir aos dois lados. Aqui só entra a
 * LISTA DE CAMPOS — o que é hasheado, em que ordem.
 *
 * A LISTA É CONGELADA
 * -------------------
 * Acrescentar um campo a `CAMPOS_DA_ANALISE`, trocar a ordem ou mudar a forma
 * canônica de um valor muda o hash de TODAS as análises seguintes. Depois de
 * haver recibo emitido, isso exige uma migration que recalcule a cadeia e
 * registre a troca — não é edição casual. Acrescentar campo em `Analise`
 * (types.ts) sem tocar nesta lista é seguro e não muda hash nenhum.
 *
 * `aprovador` já está na lista mesmo com papel único (D7c: quem analisa é quem
 * aprova). Ele repete o `operador` hoje. Isso parece redundante e é o que
 * permite a segregação de função chegar depois SEM mudar a fórmula.
 *
 * `validadoEm` é o relógio do servidor. Notebook de bancada tem relógio errado
 * com frequência, e um horário que depende da máquina destrói a única coisa
 * que o hash entrega: a reprodutibilidade.
 */

import { hashEncadeado, type CampoDeHash } from '@/domain/hash'
import type { Analise, Seq } from '@/domain/types'

/**
 * Próximo protocolo de análise: 'RO-ANL-0001'.
 *
 * MUTA `seq`, como `nextCoinCode` e `nextEnvioCode` — quem chama já está
 * dentro da transação de escrita. `seq.analise` pode vir ausente de um estado
 * gravado antes da frente E; `?? 0` é o que faz o contador nascer em 1 em vez
 * de NaN.
 */
export function nextAnaliseCode(seq: Seq): string {
  seq.analise = (seq.analise ?? 0) + 1
  return 'RO-ANL-' + String(seq.analise).padStart(4, '0')
}

/**
 * Os campos que entram no hash, NESTA ORDEM. Ver o cabeçalho antes de mexer.
 *
 * `hashAnterior` e `hash` não estão aqui: o primeiro é o argumento da função,
 * o segundo é o resultado dela.
 */
export const CAMPOS_DA_ANALISE = [
  'protocolo',
  'protocoloEnvio',
  'codigoMoeda',
  'codigoRecibo',
  'tipoMoeda',
  'ano',
  'pesoMg',
  'veredito',
  'motivoRecusa',
  'operador',
  'aprovador',
  'caixa',
  'posicao',
  'validadoEm',
  'caminhoVideo',
] as const

/** A análise sem os dois campos que a cadeia produz. */
export type AnalisePendente = Omit<Analise, 'hash' | 'hashAnterior'>

export function camposParaHash(a: AnalisePendente): CampoDeHash[] {
  return CAMPOS_DA_ANALISE.map((c) => a[c])
}

/** SHA-256 desta análise, encadeado na anterior. */
export function hashDaAnalise(a: AnalisePendente, hashAnterior: string): string {
  return hashEncadeado(hashAnterior, camposParaHash(a))
}

/**
 * Fecha a análise: calcula o hash e devolve o registro completo.
 *
 * Separado de `hashDaAnalise` porque quem grava precisa das duas pontas da
 * cadeia no mesmo objeto — o hash desta e o da anterior, que é o que permite
 * conferir a corrente sem recalcular o histórico inteiro.
 */
export function encadearAnalise(a: AnalisePendente, hashAnterior: string): Analise {
  return { ...a, hashAnterior, hash: hashDaAnalise(a, hashAnterior) }
}

/**
 * O hash da última análise gravada, ou `null` quando não há nenhuma.
 *
 * A cadeia segue a ordem da lista, que é a ordem em que as análises foram
 * fechadas — `analises` é append-only, então a última é a última.
 */
export function ultimoHashDeAnalise(analises: readonly Analise[]): string | null {
  const ultima = analises[analises.length - 1]
  return ultima ? ultima.hash : null
}

/**
 * Confere a corrente inteira e devolve o índice da primeira análise adulterada.
 * `-1` quando está íntegra.
 *
 * É o teste que dá sentido ao encadeamento: alterar um registro antigo muda o
 * hash dele, e o `hashAnterior` do seguinte deixa de bater. Existe para a
 * auditoria e para o teste — não roda em requisição.
 */
export function conferirCadeia(analises: readonly Analise[], genesis: string): number {
  let anterior = genesis
  for (let i = 0; i < analises.length; i++) {
    const a = analises[i]
    if (a.hashAnterior !== anterior) return i
    if (a.hash !== hashDaAnalise(a, a.hashAnterior)) return i
    anterior = a.hash
  }
  return -1
}
