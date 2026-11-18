/**
 * O acréscimo do frete — regra pura (frente K, 18/11/2026, item 11 do Rogério: "somar 4 reais no
 * valor do faturamento dos Correios").
 *
 * ATÉ 17/11/2026 O CLIENTE PAGAVA O PREÇO DO CONTRATO, SEM MARGEM (decisão do Gabriel de 22/10/2026). Agora o
 * frete cobrado é o preço do contrato MAIS um valor fixo por objeto postado — R$ 4,00 de padrão, editável em
 * `/admin/configuracao` (grupo Operacional, chave `acrescimoDoFreteCents`, com histórico).
 *
 * O PREÇO DO CONTRATO CONTINUA GUARDADO À PARTE. A fatura que os Correios mandam cobra só o contrato; para o
 * Rogério conferir os dois lados, a cotação devolve `valorContratoCents` e `acrescimoCents` separados, e o
 * `Envio.frete` grava os dois ao lado do total cobrado (`valorCents`). Envio anterior a K não tem os campos:
 * ali o contrato é o próprio `valorCents` e o acréscimo é zero (`dividirFreteCobrado`).
 *
 * NÃO É TAXA DE NEGOCIAÇÃO. Não mexe em `TAXAS_PADRAO` nem em `fees.ts`, e por isso mudar o valor NÃO publica
 * versão nova da Tabela de Taxas. O tratamento fiscal do acréscimo (receita ou repasse) é pergunta ao contador:
 * ver `docs/fiscal-contabil/LACUNAS_E_PERGUNTAS.md`. Enquanto ele não responde, o acréscimo não gera NFS-e e a
 * DRE o lê, como o resto do frete, no balde "frete repassado", fora do resultado.
 *
 * Sem `server-only` de propósito: o padrão e o texto são lidos pela configuração (domínio) e pela tela.
 */

import { brl } from '@/domain/money'
import type { Cents } from '@/domain/types'

/** R$ 4,00 por objeto postado (envio). Pedido do Rogério, 11/11/2026; interpretação "por objeto" a confirmar (D5). */
export const ACRESCIMO_DO_FRETE_PADRAO_CENTS: Cents = 400

/** O frete cobrado e as duas partes dele. */
export interface FreteComAcrescimo {
  /** O que os Correios cobram no contrato (frete + seguro/serviços adicionais). */
  valorContratoCents: Cents
  /** O que o Real Olímpico soma por objeto postado. */
  acrescimoCents: Cents
  /** O que o cliente paga: contrato + acréscimo. */
  valorCobradoCents: Cents
}

/**
 * Valor de acréscimo aceitável: centavos inteiros, nunca negativo. Qualquer outra coisa (lixo no banco, `NaN`,
 * fração) vira zero — o acréscimo nunca pode reduzir o frete nem entrar quebrado no gateway.
 */
export function acrescimoValido(valor: unknown): Cents {
  return typeof valor === 'number' && Number.isInteger(valor) && valor > 0 ? valor : 0
}

/** Soma o acréscimo ao preço do contrato. Parâmetro zerado = frete igual ao contrato. */
export function somarAcrescimoAoFrete(valorContratoCents: Cents, acrescimo: unknown): FreteComAcrescimo {
  const acrescimoCents = acrescimoValido(acrescimo)
  return { valorContratoCents, acrescimoCents, valorCobradoCents: valorContratoCents + acrescimoCents }
}

/**
 * As duas partes de um frete JÁ COBRADO (`Envio.frete`). Envio anterior à frente K não gravou o contrato nem o
 * acréscimo: o total era o contrato. Para o novo, o acréscimo gravado manda e o contrato é o que sobra — assim as
 * duas partes sempre fecham com o total, mesmo que só um dos campos exista.
 */
export function dividirFreteCobrado(frete: {
  valorCents: Cents
  valorContratoCents?: Cents | null
  acrescimoCents?: Cents | null
}): { valorContratoCents: Cents; acrescimoCents: Cents } {
  const acrescimoCents = Math.min(acrescimoValido(frete.acrescimoCents), frete.valorCents)
  return { valorContratoCents: frete.valorCents - acrescimoCents, acrescimoCents }
}

/**
 * A frase que a tela mostra ao lado do frete. TEXTO A SER APROVADO PELO GABRIEL: é o texto padrão da ficha da
 * frente K e o número vem do parâmetro. Acréscimo zerado = sem frase.
 */
export function textoDoAcrescimoNoFrete(acrescimoCents: Cents): string {
  const a = acrescimoValido(acrescimoCents)
  return a > 0 ? `O valor do frete inclui ${brl(a)} de taxa de postagem` : ''
}
