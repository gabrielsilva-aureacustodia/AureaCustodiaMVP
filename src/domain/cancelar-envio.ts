/**
 * Cancelar um envio que não virou moeda — e devolver tudo o que ele gerou (frente H, 17/11/2026).
 *
 * POR QUE ISTO EXISTE
 * -------------------
 * O Rogério pagou o 1º mês de custódia de 15 moedas (R$ 30,00, com NFS-e emitida) e as moedas nunca foram
 * postadas. O desconsiderar de 3 dias só devolvia o frete; o 1º mês e a nota ficavam presos, e o contador
 * exige cancelar nota fiscal DENTRO DO MÊS. Faltava também um jeito de o cliente (ou a equipe) encerrar o
 * envio sem esperar o relógio, e de a bancada desistir de uma validação cujo pacote nunca chegou.
 *
 * O QUE O CANCELAMENTO DESFAZ (mapa em docs/MAPA_DO_CANCELAMENTO.md)
 * -------------------------------------------------------------------
 *  - o FRETE pago volta ao saldo, pelo valor total cobrado — mas só se o pacote NÃO foi postado: pré-postagem
 *    não postada não gera cobrança dos Correios, objeto postado já foi cobrado da Áurea (D-H1, abaixo);
 *  - o 1º MÊS de custódia volta ao saldo pelo caminho de `estornarFaturaPaga` (03/11), e é essa transição
 *    que cancela a NFS-e dele e lança o `estorno` no ledger;
 *  - a ETIQUETA dos Correios é cancelada — mas isso é I/O: este módulo só diz qual (`prePostagemACancelar`),
 *    e quem chama a cancela DEPOIS da transação (src/server/shipping/cancelar-envio.ts).
 *
 * O QUE ELE NÃO FAZ
 * -----------------
 *  - não cancela moeda já aceita: o envio virou acervo e o caminho é a retirada;
 *  - não toca na corrente de hash da análise: análise ABERTA não tem linha em `analises` (as linhas nascem
 *    em `fecharAnalise`), então "cancelar a validação" é um registro no próprio envio, nunca um
 *    registro novo na corrente. `CAMPOS_DA_ANALISE` e a fórmula do hash ficam como estão;
 *  - não devolve dinheiro ao banco nem ao cartão: tudo volta ao SALDO da conta (D-H4);
 *  - não estorna duas vezes: não mexe em `plano.estornadoCents` (ver `devolverPrimeiroMesDoEnvio`).
 *
 * D-H1 — FRETE DE ENVIO JÁ POSTADO. É decisão de cobrança, e do Gabriel: o padrão é NÃO devolver. Fica numa
 * constante só, lida num único `if` e travada por teste, para trocar em uma linha e o teste dizer o que mudou.
 *
 * Regra pura, sem I/O: muta `state` (chame dentro do `mutateState`), devolve o resumo.
 */

import { brl } from '@/domain/money'
import { competenciaDe } from '@/domain/nfse/pedidos'
import {
  devolverPrimeiroMesDoEnvio,
  envioCancelado,
  estornarFreteDoEnvio,
  prePostagemAtiva,
} from '@/domain/envios'
import type { AppState, Cents, Envio, PrePostagemRegistro, Timestamp, UserEmail } from '@/domain/types'

/** O frete pago de um envio JÁ POSTADO volta ao saldo no cancelamento? Padrão: não (D-H1). Decisão do Gabriel. */
export const DEVOLVE_FRETE_DE_ENVIO_JA_POSTADO = false

/**
 * D-H5 — o corte da devolução AUTOMÁTICA do 1º mês (só para envio criado a partir dele). Definido ao lado de
 * `desconsiderarEnvio`, em `envios.ts`, porque é lá que a regra dos 3 dias o lê — e `envios.ts` não pode
 * importar este módulo sem ciclo. Reexportado aqui para quem procura as regras do cancelamento num lugar só.
 * O cancelamento MANUAL (`cancelarEnvio`, abaixo) NÃO tem corte: a equipe trata os envios antigos à mão.
 */
export {
  DEVOLUCAO_AUTOMATICA_DO_PRIMEIRO_MES_VALE_PARA_ENVIO_CRIADO_A_PARTIR_DE,
  primeiroMesEntraNaDevolucaoAutomatica,
} from '@/domain/envios'

/** O motivo é o que explica ao cliente, ao contador e à auditoria por que o dinheiro voltou. */
export const MOTIVO_MINIMO_CARACTERES = 10
export const MOTIVO_MAXIMO_CARACTERES = 300

/** A lista curta da tela do cliente. O texto escolhido vira o motivo gravado no envio. */
export const MOTIVOS_DO_CLIENTE = [
  'Não vou mais enviar estas moedas.',
  'Criei o envio por engano.',
  'Quero refazer o envio com outra quantidade ou outro tipo de moeda.',
] as const

export const MOEDA_JA_ACEITA =
  'Este envio já virou moeda no cofre. Para tirar a moeda de lá o caminho é a retirada, não o cancelamento do envio.'
export const JA_POSTADO_PARA_O_CLIENTE =
  'Este envio já foi postado nos Correios e não pode mais ser cancelado por aqui. Fale com o atendimento se precisar.'

export type QuemCancela = 'cliente' | 'equipe'

export type CodigoDeRecusa = 'nao_encontrado' | 'motivo_invalido' | 'moeda_aceita' | 'ja_postado' | 'titular_ausente'

export interface PedidoDeCancelamento {
  agora: Timestamp
  por: QuemCancela
  motivo: string
  /** Cliente: só o dono cancela. Um protocolo de outra conta responde "não encontrado". */
  donoEsperado?: UserEmail
}

export interface ResumoCancelamento {
  protocolo: string
  por: QuemCancela
  motivo: string
  /** O envio já tinha sido postado (ou passado de "Protocolo gerado"): só a equipe cancela, e o frete não volta. */
  jaPostado: boolean
  /** Frete que voltou ao saldo. */
  freteEstornadoCents: Cents
  /** Frete pago que NÃO voltou, porque o pacote já foi postado (D-H1). */
  freteRetidoCents: Cents
  /** 1º mês que voltou ao saldo (fatura paga estornada; a NFS-e dela é cancelada). */
  primeiroMesEstornadoCents: Cents
  /** 1º mês em aberto que foi só cancelado: não saiu dinheiro e nunca houve nota. */
  primeiroMesCanceladoCents: Cents
  /** O que entrou de volta no saldo no total. */
  totalAoSaldoCents: Cents
  faturaIds: string[]
  planoIds: string[]
  /** Débitos recorrentes no cartão ainda ativos — quem chama cancela no gateway, fora da transação. */
  assinaturaIds: string[]
  /** A etiqueta a cancelar nos Correios (I/O fora da transação), ou `null`. */
  prePostagemACancelar: PrePostagemRegistro | null
  /** A nota do 1º mês é de outro mês: o contador pede o cancelamento dentro do mês da nota. */
  avisoDoMes: string | null
}

export type ResultadoCancelamento =
  | { ok: true; jaCancelado: boolean; resumo: ResumoCancelamento; mensagem: string }
  | { ok: false; codigo: CodigoDeRecusa; erro: string }

/** O pacote já saiu de "Protocolo gerado"? Então já está (ou esteve) com os Correios. */
export function envioJaPostado(envio: Envio): boolean {
  return envio.dataPostagem !== null || envio.etapaAtual !== 'Protocolo gerado'
}

/** A moeda já foi aceita na análise: o envio virou acervo. */
export function envioJaVirouMoeda(envio: Envio): boolean {
  return envio.codigosAtivosGerados.length > 0 || envio.etapaAtual === 'Recibo emitido'
}

/** Normaliza e valida o motivo. Devolve o texto limpo, ou `null` quando não serve. */
export function motivoValido(motivo: unknown): string | null {
  if (typeof motivo !== 'string') return null
  const limpo = motivo.replace(/\s+/g, ' ').trim()
  if (limpo.length < MOTIVO_MINIMO_CARACTERES) return null
  return limpo.slice(0, MOTIVO_MAXIMO_CARACTERES)
}

/**
 * Por que este envio NÃO pode ser cancelado por quem pede — ou `null` se pode.
 *
 * Uma regra só para a tela, as Server Actions e o núcleo (como `recusaDoEnvioParaFrete`). O cliente cancela
 * só o que não foi postado; a equipe cancela também o que está a caminho ou na bancada (envio perdido,
 * abandonado, pacote que nunca chegou). Moeda aceita não cancela para ninguém.
 */
export function recusaDoCancelamento(envio: Envio, por: QuemCancela): { codigo: CodigoDeRecusa; erro: string } | null {
  if (envioCancelado(envio)) return null
  if (envioJaVirouMoeda(envio)) return { codigo: 'moeda_aceita', erro: MOEDA_JA_ACEITA }
  if (por === 'cliente' && envioJaPostado(envio)) return { codigo: 'ja_postado', erro: JA_POSTADO_PARA_O_CLIENTE }
  return null
}

const SEM_DINHEIRO_NENHUM: Omit<ResumoCancelamento, 'protocolo' | 'por' | 'motivo' | 'jaPostado'> = {
  freteEstornadoCents: 0,
  freteRetidoCents: 0,
  primeiroMesEstornadoCents: 0,
  primeiroMesCanceladoCents: 0,
  totalAoSaldoCents: 0,
  faturaIds: [],
  planoIds: [],
  assinaturaIds: [],
  prePostagemACancelar: null,
  avisoDoMes: null,
}

/** 'AAAA-MM-DD' → 'MM/AAAA'. */
function mesDe(ts: Timestamp): string {
  const [ano, mes] = competenciaDe(ts).split('-')
  return `${mes}/${ano}`
}

/** A frase da tela: o que voltou, o que não voltou e o que acontece com a nota. */
function mensagemDoCancelamento(r: ResumoCancelamento): string {
  const partes: string[] = []
  if (r.primeiroMesEstornadoCents > 0) partes.push(`${brl(r.primeiroMesEstornadoCents)} do 1º mês de custódia`)
  if (r.freteEstornadoCents > 0) partes.push(`${brl(r.freteEstornadoCents)} do frete`)
  let msg = `Envio ${r.protocolo} cancelado.`
  if (partes.length > 0) {
    msg += ` Voltaram ao saldo da conta ${partes.join(' e ')} (${brl(r.totalAoSaldoCents)} no total).`
  } else {
    msg += ' Nenhum valor estava pago, então não há o que devolver ao saldo.'
  }
  if (r.primeiroMesEstornadoCents > 0) {
    // O envio do evento à Sefin NÃO sai na hora: a rodada que roda logo depois da operação pula a nota marcada há
    // menos de 60 s (`reivindicarCancelamentos`), então ela espera a próxima — o job das 05:00 de Brasília ou o
    // botão "Enviar fila agora" do painel fiscal. A equipe precisa saber, principalmente perto da virada do mês
    // (o contador exige o cancelamento dentro do mês da nota). O cliente só precisa saber que será cancelada.
    msg +=
      r.por === 'equipe'
        ? ' A nota fiscal do 1º mês foi marcada para cancelamento e fica "cancelando" até a próxima rodada da fila de notas (todo dia às 05:00 de Brasília); para apressar, use "Enviar fila agora" no painel fiscal.'
        : ' A nota fiscal do 1º mês será cancelada.'
  }
  if (r.primeiroMesCanceladoCents > 0) msg += ` A cobrança em aberto do 1º mês (${brl(r.primeiroMesCanceladoCents)}) também foi cancelada.`
  if (r.freteRetidoCents > 0) {
    msg += ` O frete (${brl(r.freteRetidoCents)}) NÃO voltou: o pacote já foi postado e os Correios já cobraram o serviço.`
  }
  if (r.avisoDoMes) msg += ` ${r.avisoDoMes}`
  return msg
}

/**
 * Cancela o envio e devolve ao saldo do dono tudo o que ele gerou. Muta `state` — chame DENTRO do
 * `mutateState`, na mesma transação que grava o saldo, o status do frete e o da fatura.
 *
 * Idempotente por construção: envio já cancelado responde `ok` sem mexer em nada, e cada peça (frete, fatura,
 * plano) só devolve o que ainda está pago ou em aberto — um duplo clique, dois operadores juntos ou uma
 * repetição depois da queda de rede não estornam duas vezes. Envio já DESCONSIDERADO pelo prazo de 3 dias
 * mas ainda não cancelado NÃO é "nada a fazer": o 1º mês pago antes de 17/11/2026 nunca foi devolvido, e é
 * esta chamada que o completa.
 */
export function cancelarEnvio(state: AppState, protocolo: string, pedido: PedidoDeCancelamento): ResultadoCancelamento {
  const motivo = motivoValido(pedido.motivo)
  if (!motivo) {
    return {
      ok: false,
      codigo: 'motivo_invalido',
      erro: `Informe o motivo do cancelamento (pelo menos ${MOTIVO_MINIMO_CARACTERES} caracteres).`,
    }
  }

  const envio = state.envios.find((e) => e.protocolo === protocolo)
  // Um protocolo de outra conta responde igual a um que não existe: não confirma o que não é do cliente.
  if (!envio || (pedido.donoEsperado !== undefined && envio.userEmail !== pedido.donoEsperado)) {
    return { ok: false, codigo: 'nao_encontrado', erro: 'Envio não encontrado.' }
  }

  const jaPostado = envioJaPostado(envio)
  const base = { protocolo: envio.protocolo, por: pedido.por, motivo, jaPostado }

  if (envioCancelado(envio)) {
    const resumo: ResumoCancelamento = { ...base, ...SEM_DINHEIRO_NENHUM }
    return { ok: true, jaCancelado: true, resumo, mensagem: `O envio ${envio.protocolo} já estava cancelado.` }
  }

  const recusa = recusaDoCancelamento(envio, pedido.por)
  if (recusa) return { ok: false, ...recusa }

  if (!state.users[envio.userEmail]) {
    return { ok: false, codigo: 'titular_ausente', erro: 'O titular do envio não existe mais; nada foi alterado.' }
  }

  // 1. FRETE. Só volta se o pacote não foi postado (D-H1): o `if` único da regra.
  let freteEstornadoCents: Cents = 0
  let freteRetidoCents: Cents = 0
  const frete = envio.frete
  if (frete && frete.status === 'pago') {
    if (!jaPostado || DEVOLVE_FRETE_DE_ENVIO_JA_POSTADO) freteEstornadoCents = estornarFreteDoEnvio(state, envio, pedido.agora)
    else freteRetidoCents = frete.valorCents
  }

  // 2. A marca de encerramento. `desconsideradoEm` já pode estar gravado (prazo de 3 dias): mantém o instante
  // original, que é o do fato. Gravá-lo também é o que faz as guardas antigas valerem para o cancelado.
  if (!envio.desconsideradoEm) {
    envio.desconsideradoEm = pedido.agora
    envio.motivoDesconsideracao = `Cancelado ${pedido.por === 'cliente' ? 'a pedido do cliente' : 'pela equipe'}: ${motivo}`
  }
  envio.canceladoEm = pedido.agora
  envio.canceladoPor = pedido.por
  envio.motivoCancelamento = motivo

  // 3. O 1º MÊS (e a nota dele, pela transição da fatura paga para cancelada).
  const primeiroMes = devolverPrimeiroMesDoEnvio(state, envio, pedido.agora)

  // 4. A etiqueta: só diz qual. Objeto já postado não se cancela nos Correios.
  const prePostagemACancelar = jaPostado ? null : prePostagemAtiva(envio)

  // 5. O contador exige cancelar nota DENTRO DO MÊS: nota de outro mês ainda é cancelada (a Sefin aceita até
  // 730 dias em BH), mas a equipe precisa saber.
  let avisoDoMes: string | null = null
  if (primeiroMes.pagaEm !== null && mesDe(primeiroMes.pagaEm) !== mesDe(pedido.agora)) {
    avisoDoMes = `Atenção: a nota do 1º mês é de ${mesDe(primeiroMes.pagaEm)} e o cancelamento é de ${mesDe(pedido.agora)}. O contador pede o cancelamento dentro do mês da nota — avise-o.`
  }

  const resumo: ResumoCancelamento = {
    ...base,
    freteEstornadoCents,
    freteRetidoCents,
    primeiroMesEstornadoCents: primeiroMes.estornadoCents,
    primeiroMesCanceladoCents: primeiroMes.canceladoCents,
    totalAoSaldoCents: freteEstornadoCents + primeiroMes.estornadoCents,
    faturaIds: primeiroMes.faturaIds,
    planoIds: primeiroMes.planoIds,
    assinaturaIds: primeiroMes.assinaturaIds,
    prePostagemACancelar,
    avisoDoMes,
  }
  return { ok: true, jaCancelado: false, resumo, mensagem: mensagemDoCancelamento(resumo) }
}
