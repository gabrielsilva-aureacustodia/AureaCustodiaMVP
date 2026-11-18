/**
 * DOMÍNIO — Regras de negócio e status dos envios para custódia física.
 *
 * Branch: exec/ag7-envios-status (21/09/2026).
 *
 * REGRAS DE NEGÓCIO INEGOCIÁVEIS:
 * 1. Envio que não for reconhecido como postado é desconsiderado em até 3 dias.
 * 2. O vencimento é avaliado na leitura comparando `dataPostagem` com `createdAt + 3 dias`,
 *    não dependendo de cron nem de abertura prévia de tela para ter vigência.
 * 3. Um protocolo desconsiderado nunca é apagado (preservando o histórico para auditoria)
 *    e nunca volta a ser reutilizado.
 * 4. Fases oficiais:
 *    - 'Ainda não postado' (protocolo gerado sem confirmação de postagem)
 *    - 'Desconsiderado' (prazo de 3 dias expirado sem postagem)
 *    - 'Postado' (cliente confirmou o código de rastreio SRO)
 *    - 'Em trânsito' (quando a consulta aos Correios atesta encaminhamento)
 *    - 'Recebido pela custódia'
 *    - 'Em análise física'
 *    - 'Analisado' (recibo de custódia emitido)
 *
 * 5. Desde 22/10/2026 o cliente paga o frete no site e recebe a etiqueta oficial dos Correios
 *    (pré-postagem de logística reversa). Envio com etiqueta não é desconsiderado na leitura —
 *    o servidor pergunta aos Correios antes —, e envio desconsiderado com frete pago devolve o
 *    frete ao saldo (`desconsiderarEnvio`).
 * 6. Desde 17/11/2026 (frente H) o envio desconsiderado devolve TAMBÉM o primeiro mês de custódia pago
 *    antes de a moeda chegar, e a nota dele é cancelada: o desconsiderar de 3 dias devolvia só o frete,
 *    e o R$ 30,00 do Rogério (15 moedas × R$ 2,00) ficou preso num envio que nunca saiu de casa. O envio
 *    também pode ser CANCELADO a pedido (`canceladoEm`, regra em `cancelar-envio.ts`); o cancelamento
 *    grava `desconsideradoEm` junto, para toda guarda que já olha esse campo valer para ele.
 *
 * Módulo puro: sem I/O, sem dependências de framework ou servidor.
 */

import { estornarFaturaPaga } from '@/domain/quitar-fatura'
import type {
  AppState,
  Cents,
  Envio,
  FaturaCustodia,
  PlanoCustodia,
  PrePostagemRegistro,
  Timestamp,
} from '@/domain/types'

/** Prazo limite para postagem nos Correios: 3 dias corridos (72 horas). */
export const PRAZO_DESCARTE_ENVIO_MS = 3 * 24 * 60 * 60 * 1000

export type FaseEnvio =
  | 'nao_postado'
  | 'cancelado'
  | 'desconsiderado'
  | 'postado'
  | 'em_transito'
  | 'recebido'
  | 'em_analise'
  | 'analisado'

export interface InfoPrazoPostagem {
  /** Se o prazo de 3 dias já venceu. */
  expirado: boolean
  /** Tempo restante em milissegundos até o descarte (0 se expirado). */
  restanteMs: number
  /** Horas restantes inteiras (arredondadas para cima). */
  horasRestantes: number
  /** Dias restantes inteiros. */
  diasRestantes: number
  /** Timestamp do momento exato do vencimento. */
  expiraEm: number
  /** Mensagem clara pronta para exibição em avisos de interface. */
  mensagemAlerta: string | null
}

/**
 * A pré-postagem dos Correios que ainda vale (emitida e não cancelada).
 *
 * Com ela, o código de rastreio nasceu nos Correios e a postagem é reconhecida
 * pelo rastreio — não pelo cliente digitando o código (22/10/2026).
 */
export function prePostagemAtiva(envio: Envio): PrePostagemRegistro | null {
  const p = envio.prePostagem
  return p && !p.canceladaEm ? p : null
}

/** O envio foi cancelado a pedido do cliente ou da equipe (e não pelo prazo de 3 dias). */
export function envioCancelado(envio: Envio): boolean {
  return Boolean(envio.canceladoEm)
}

/**
 * Calcula o prazo de postagem de um envio e o tempo restante antes do descarte.
 */
export function prazoPostagemEnvio(envio: Envio, agora: number = Date.now()): InfoPrazoPostagem {
  const expiraEm = envio.createdAt + PRAZO_DESCARTE_ENVIO_MS

  // Cancelado não tem prazo correndo, e a frase "prazo de 3 dias expirado" seria falsa: o envio foi
  // encerrado por uma pessoa, não pelo relógio.
  if (envioCancelado(envio)) {
    return {
      expirado: true,
      restanteMs: 0,
      horasRestantes: 0,
      diasRestantes: 0,
      expiraEm,
      mensagemAlerta: 'Envio cancelado.',
    }
  }

  // Se já foi postado, já avançou de etapa ou é cadastro direto sem envio, não há contagem de postagem.
  if (
    envio.dataPostagem !== null ||
    envio.origem === 'cadastro_sem_envio' ||
    envio.etapaAtual !== 'Protocolo gerado'
  ) {
    const jaDesconsiderado = Boolean(envio.desconsideradoEm)
    return {
      expirado: jaDesconsiderado,
      restanteMs: 0,
      horasRestantes: 0,
      diasRestantes: 0,
      expiraEm,
      mensagemAlerta: jaDesconsiderado
        ? 'Envio desconsiderado: prazo de 3 dias para postagem expirado.'
        : null,
    }
  }

  const jaDesconsiderado = Boolean(envio.desconsideradoEm)
  const restanteMs = Math.max(0, expiraEm - agora)

  // Com etiqueta oficial, o prazo vencido NÃO desconsidera na leitura: o cliente pode ter postado e o
  // rastreio ainda não ter passado por aqui. Quem decide é o servidor, depois de perguntar aos Correios
  // (`desconsiderarEnviosVencidos`). Até lá a tela avisa, sem anunciar um descarte que pode não valer.
  if (!jaDesconsiderado && restanteMs === 0 && prePostagemAtiva(envio)) {
    return {
      expirado: false,
      restanteMs: 0,
      horasRestantes: 0,
      diasRestantes: 0,
      expiraEm,
      mensagemAlerta:
        'O prazo de 3 dias para postar terminou. Se você já postou, a confirmação chega pelo rastreio dos Correios; se não, o protocolo será desconsiderado e o frete volta ao seu saldo.',
    }
  }

  const expirado = jaDesconsiderado || restanteMs === 0

  if (expirado) {
    return {
      expirado: true,
      restanteMs: 0,
      horasRestantes: 0,
      diasRestantes: 0,
      expiraEm,
      mensagemAlerta: 'Envio desconsiderado: prazo de 3 dias para postagem expirado.',
    }
  }

  const horasRestantes = Math.max(1, Math.ceil(restanteMs / (60 * 60 * 1000)))
  const diasRestantes = Math.floor(horasRestantes / 24)
  const horasFracionarias = horasRestantes % 24

  let mensagemAlerta: string
  if (diasRestantes >= 1) {
    mensagemAlerta =
      horasFracionarias > 0
        ? `Envio ainda não postado. Restam ${diasRestantes} dia(s) e ${horasFracionarias} hora(s) para postagem nos Correios antes do protocolo ser desconsiderado.`
        : `Envio ainda não postado. Resta(m) ${diasRestantes} dia(s) para postagem nos Correios antes do protocolo ser desconsiderado.`
  } else {
    mensagemAlerta = `Envio ainda não postado. Resta(m) menos de ${horasRestantes} hora(s) para postagem antes do protocolo ser desconsiderado.`
  }

  return {
    expirado: false,
    restanteMs,
    horasRestantes,
    diasRestantes,
    expiraEm,
    mensagemAlerta,
  }
}

/**
 * Determina se o envio deve ser tratado como desconsiderado.
 * Avaliado na leitura: `true` se já marcado no registro ou se passaram 3 dias sem postagem.
 */
export function isEnvioDesconsiderado(envio: Envio, agora: number = Date.now()): boolean {
  if (envio.desconsideradoEm) return true
  if (envio.origem === 'cadastro_sem_envio') return false
  if (envio.dataPostagem !== null) return false
  if (envio.etapaAtual !== 'Protocolo gerado') return false
  // Envio com etiqueta oficial dos Correios só cai com a marca gravada. A leitura não sabe se o
  // pacote já está na agência — o rastreio pode estar um dia atrasado —, e desconsiderar um envio
  // postado faria a moeda chegar à custódia sem protocolo válido. Ver `desconsiderarEnvio`.
  if (prePostagemAtiva(envio)) return false
  return agora >= envio.createdAt + PRAZO_DESCARTE_ENVIO_MS
}

/**
 * O envio passou do prazo de postagem e pode ser desconsiderado AGORA, sem perguntar nada a ninguém?
 *
 * Diferente de `isEnvioDesconsiderado`, ignora a pré-postagem: é a pergunta que o servidor faz antes
 * de consultar os Correios. Envio com etiqueta só é desconsiderado depois de os Correios dizerem que
 * ele não foi postado.
 */
export function envioVenceuPrazoDePostagem(envio: Envio, agora: number = Date.now()): boolean {
  if (envio.desconsideradoEm) return false
  if (envio.origem === 'cadastro_sem_envio') return false
  if (envio.dataPostagem !== null) return false
  if (envio.etapaAtual !== 'Protocolo gerado') return false
  return agora >= envio.createdAt + PRAZO_DESCARTE_ENVIO_MS
}

/**
 * Devolve ao saldo o frete pago e não usado (22/10/2026). O status do frete vira `estornado` na MESMA
 * mutação que credita o saldo — é essa transição que o ledger lê para gravar o `estorno`, e sem ela o
 * crédito cairia na rede de segurança como `ajuste`. Devolve o TOTAL cobrado (`valorCents`, com o
 * acréscimo da K, se houver). Idempotente: frete já `estornado` não volta de novo.
 */
export function estornarFreteDoEnvio(state: AppState, envio: Envio, agora: Timestamp): Cents {
  const frete = envio.frete
  const dono = state.users[envio.userEmail]
  if (!frete || frete.status !== 'pago' || !dono) return 0
  dono.balance += frete.valorCents
  frete.status = 'estornado'
  frete.estornadoEm = agora
  return frete.valorCents
}

/**
 * O primeiro mês de custódia ligado a um envio: o plano e a fatura de `origem: 'contratacao'`.
 *
 * É O ÚNICO LUGAR que sabe como o 1º mês se liga ao envio (`PlanoCustodia.protocoloEnvio` +
 * `FaturaCustodia.planoId`) — se a frente B mudar o desenho, muda aqui. A frente B terá o helper
 * `faturasDoEnvio(state, protocolo)` em `src/domain/primeiro-mes-do-envio.ts` (arquivo dela, ainda fora desta
 * branch): NO MERGE, TROCAR ESTA FUNÇÃO POR ELE. Contrato confirmado pela B: mesma ligação, e mais de uma fatura
 * de contratação para o mesmo protocolo é tratada fatura a fatura (um estorno por fatura). Planos já cancelados entram:
 * o cliente pode ter cancelado a assinatura (que cancela o plano e só as faturas em aberto) e a fatura
 * PAGA do 1º mês continuar de pé num envio que nunca virou moeda.
 */
export function primeiroMesDoEnvio(
  state: AppState,
  envio: Pick<Envio, 'protocolo'>,
): { planos: PlanoCustodia[]; faturas: FaturaCustodia[] } {
  const planos = (state.planosCustodia ?? []).filter((p) => p.protocoloEnvio === envio.protocolo)
  const ids = new Set(planos.map((p) => p.id))
  const faturas = (state.faturasCustodia ?? []).filter(
    (f) => f.origem === 'contratacao' && f.planoId != null && ids.has(f.planoId) && f.status !== 'cancelada',
  )
  return { planos, faturas }
}

/** O 1º mês ainda tem o que devolver? Fatura paga (dinheiro + nota) ou em aberto (só cancelar). */
export function temPrimeiroMesADevolver(state: AppState, envio: Pick<Envio, 'protocolo'>): boolean {
  const { planos, faturas } = primeiroMesDoEnvio(state, envio)
  return faturas.length > 0 || planos.some((p) => p.status !== 'cancelado')
}

/** O 1º mês pago, com dinheiro e nota emitida — é o que justifica varrer um envio sem frete nem etiqueta. */
export function temPrimeiroMesPago(state: AppState, envio: Pick<Envio, 'protocolo'>): boolean {
  return primeiroMesDoEnvio(state, envio).faturas.some((f) => f.status === 'paga')
}

/**
 * D-H5 — O CORTE DA DEVOLUÇÃO AUTOMÁTICA DO 1º MÊS (ordem do Controle, decisão de cobrança e fiscal do Gabriel,
 * 17/11/2026). A devolução AUTOMÁTICA (a regra dos 3 dias: `desconsiderarEnvio`, na leitura do cliente e na
 * varredura diária) e o cancelamento da nota dela valem só para envio CRIADO a partir deste instante. Envio
 * criado antes continua como sempre foi: só o frete volta; fatura do 1º mês, plano e nota ficam como estão.
 * Sem o corte, o primeiro deploy devolveria, sozinho, o 1º mês de envio antigo já parado há semanas (o
 * `RO-ENV-0017`, R$ 2,00 pago em 20/10 sem nota) — dinheiro e nota que ninguém decidiu mexer.
 *
 * O cancelamento MANUAL (cliente, equipe, bancada — `cancelarEnvio`) NÃO tem corte: a equipe precisa dele
 * para tratar os antigos à mão. Só a devolução automática tem.
 *
 * O VALOR (ordem do Controle, 17/11/2026): 1794967250154 = 2026-11-17 23:00:50.154 em Brasília
 * (2026-11-18T02:00:50.154Z) — o instante em que o fluxo novo da frente B foi ao ar (deploy
 * dpl_AobxfJMcQB8WvCPxJcVFJmLwYwM4, commit e67bfc0). Escolhido assim para que o envio criado entre 23:00 e a
 * meia-noite também tenha a devolução automática. Para ligar o retroativo, troque para `0` — uma linha, e o
 * teste que lê esta constante diz o que mudou.
 */
export const DEVOLUCAO_AUTOMATICA_DO_PRIMEIRO_MES_VALE_PARA_ENVIO_CRIADO_A_PARTIR_DE: Timestamp = 1794967250154

/**
 * O 1º mês deste envio entra na devolução AUTOMÁTICA? Há 1º mês a devolver E o envio é novo (D-H5).
 *
 * A comparação do corte vive SÓ AQUI: a varredura diária (candidatos), `desconsiderarEnvio` e o texto do
 * motivo perguntam a esta função, e ninguém espalha a data em vários `if`. O padrão é a data de CRIAÇÃO do
 * envio. Se o Gabriel preferir a data de PAGAMENTO do 1º mês (o `RO-ENV-0045` foi criado em 16/11 e pode
 * ser pago depois do deploy), a troca é uma linha: compare `dataPagamento` das faturas de
 * `primeiroMesDoEnvio(state, envio).faturas` em vez de `envio.createdAt`.
 */
export function primeiroMesEntraNaDevolucaoAutomatica(state: AppState, envio: Envio): boolean {
  return (
    envio.createdAt >= DEVOLUCAO_AUTOMATICA_DO_PRIMEIRO_MES_VALE_PARA_ENVIO_CRIADO_A_PARTIR_DE &&
    temPrimeiroMesADevolver(state, envio)
  )
}

export interface ResultadoPrimeiroMes {
  /** Quanto voltou ao saldo (fatura PAGA estornada). A NFS-e dela é cancelada pela transição `paga → cancelada`. */
  estornadoCents: Cents
  /** Valor de fatura EM ABERTO que foi só cancelada: não saiu dinheiro, então nada volta ao saldo e não há nota. */
  canceladoCents: Cents
  faturaIds: string[]
  planoIds: string[]
  /** Débitos recorrentes no cartão ainda ativos (I/O no gateway — quem chama cancela, FORA da transação). */
  assinaturaIds: string[]
  /** Quando a fatura paga foi paga — é a data da nota, para o aviso de "nota de outro mês". */
  pagaEm: Timestamp | null
}

export const SEM_PRIMEIRO_MES: ResultadoPrimeiroMes = {
  estornadoCents: 0,
  canceladoCents: 0,
  faturaIds: [],
  planoIds: [],
  assinaturaIds: [],
  pagaEm: null,
}

/**
 * Devolve o primeiro mês de custódia de um envio que não virou moeda (17/11/2026).
 *
 *  - fatura PAGA → `estornarFaturaPaga` (o MESMO caminho do 03/11): saldo += valor, fatura `cancelada`. O
 *    ledger lança o `estorno` dessa transição e `cancelamentosDeNfse` marca a nota para cancelar;
 *  - fatura EM ABERTO → só `cancelada`: sem dinheiro, não há o que devolver, e fatura em aberto nunca teve nota;
 *  - plano → `cancelado`.
 *
 * NÃO MEXE em `plano.estornadoCents`: aquele campo é só do estorno de moeda recusada na análise
 * (`alimentarPlanoNaAnalise`), e o `derivar.ts` lança `estorno` quando ele sobe. Subi-lo aqui, além da
 * transição da fatura, devolveria o mesmo dinheiro duas vezes no ledger.
 *
 * Idempotente por peça: só devolve o que ainda está pago/aberto. Não chame para envio com moeda aceita
 * (a fatura já cobre o ciclo delas): quem decide isso é `cancelarEnvio`, e o desconsiderar de 3 dias só
 * vale para envio que não saiu de "Protocolo gerado". Muta `state` — chame dentro do `mutateState`.
 */
export function devolverPrimeiroMesDoEnvio(state: AppState, envio: Envio, agora: Timestamp): ResultadoPrimeiroMes {
  const { planos, faturas } = primeiroMesDoEnvio(state, envio)
  const r: ResultadoPrimeiroMes = { ...SEM_PRIMEIRO_MES, faturaIds: [], planoIds: [], assinaturaIds: [] }

  for (const fatura of faturas) {
    if (fatura.status === 'paga') {
      const valor = fatura.valorCents
      const pagaEm = fatura.dataPagamento ?? null
      if (!estornarFaturaPaga(state, fatura.id).ok) continue
      r.estornadoCents += valor
      r.pagaEm = r.pagaEm === null || (pagaEm !== null && pagaEm < r.pagaEm) ? pagaEm : r.pagaEm
      r.faturaIds.push(fatura.id)
    } else {
      fatura.status = 'cancelada'
      r.canceladoCents += fatura.valorCents
      r.faturaIds.push(fatura.id)
    }
  }

  for (const plano of planos) {
    if (plano.assinaturaId) r.assinaturaIds.push(plano.assinaturaId)
    if (plano.status === 'cancelado') continue
    plano.status = 'cancelado'
    plano.atualizadoEm = agora
    r.planoIds.push(plano.id)
  }
  return r
}

/** O que o envio ANTIGO (anterior ao corte D-H5) diz sobre o 1º mês: a devolução dele não é automática. */
export const AVISO_PRIMEIRO_MES_COM_A_EQUIPE =
  'O 1º mês de custódia ligado a este envio não é cancelado nem devolvido automaticamente: peça o cancelamento à equipe do Real Olímpico.'

export interface ResultadoDesconsideracao {
  /** Quanto voltou ao saldo do dono (frete pago e não usado). Zero quando não havia frete pago. */
  freteEstornadoCents: Cents
  /** A pré-postagem que precisa ser cancelada nos Correios — I/O, fica para quem chamou, FORA da transação. */
  prePostagemACancelar: PrePostagemRegistro | null
  /** O 1º mês de custódia devolvido junto (17/11/2026). Zerado quando não havia 1º mês ligado ao envio. */
  primeiroMes: ResultadoPrimeiroMes
}

/**
 * Grava a desconsideração do envio e devolve ao saldo do dono o que ele pagou por um pacote que não saiu
 * de casa: o frete (22/10/2026) e — só para envio criado a partir do corte D-H5 — o primeiro mês de custódia,
 * com a nota dele cancelada (17/11/2026).
 *
 * A pré-postagem não postada não gera cobrança dos Correios, então o frete volta inteiro (ver
 * `estornarFreteDoEnvio`). O 1º mês foi cobrado pela guarda de moedas que nunca chegaram: o serviço não
 * foi prestado (ver `devolverPrimeiroMesDoEnvio`).
 *
 * Idempotente: envio já desconsiderado não estorna de novo. Muta `state` — chame dentro do `mutateState`.
 */
export function desconsiderarEnvio(
  state: AppState,
  envio: Envio,
  agora: Timestamp,
  motivo = 'Prazo limite de 3 dias para postagem expirado.',
): ResultadoDesconsideracao {
  if (envio.desconsideradoEm) {
    return { freteEstornadoCents: 0, prePostagemACancelar: null, primeiroMes: { ...SEM_PRIMEIRO_MES } }
  }

  envio.desconsideradoEm = agora
  envio.motivoDesconsideracao = motivo

  const freteEstornadoCents = estornarFreteDoEnvio(state, envio, agora)
  // O frete volta para qualquer envio; o 1º mês e a nota só para envio criado a partir do corte (D-H5).
  const devolveOPrimeiroMes = primeiroMesEntraNaDevolucaoAutomatica(state, envio)
  const primeiroMes = devolveOPrimeiroMes
    ? devolverPrimeiroMesDoEnvio(state, envio, agora)
    : { ...SEM_PRIMEIRO_MES, faturaIds: [], planoIds: [], assinaturaIds: [] }
  // Envio antigo com 1º mês de custódia ligado a ele: o cliente lê o motivo na lista de envios e precisa saber a quem pedir.
  if (!devolveOPrimeiroMes && temPrimeiroMesADevolver(state, envio)) {
    envio.motivoDesconsideracao = `${motivo} ${AVISO_PRIMEIRO_MES_COM_A_EQUIPE}`
  }

  return { freteEstornadoCents, prePostagemACancelar: prePostagemAtiva(envio), primeiroMes }
}

export interface StatusFaseEnvio {
  fase: FaseEnvio
  rotulo: string
  descricao: string
  badgeVariant: 'warning' | 'danger' | 'info' | 'primary' | 'success' | 'neutral'
}

/**
 * Identifica a fase do ciclo de custódia em que o envio se encontra e produz
 * textos descritivos explícitos para o cliente.
 */
export function statusFaseEnvio(
  envio: Envio,
  rastreio?: { statusAtual?: string; etapaDescricao?: string } | null,
  agora: number = Date.now(),
): StatusFaseEnvio {
  // Cancelado ANTES de desconsiderado: o cancelamento grava `desconsideradoEm` também, e o texto de
  // "3 dias sem postagem" seria falso para um envio que uma pessoa encerrou.
  if (envioCancelado(envio)) {
    const quem = envio.canceladoPor === 'equipe' ? 'pela equipe do Real Olímpico' : 'a pedido do cliente'
    return {
      fase: 'cancelado',
      rotulo: 'Cancelado',
      descricao: envio.motivoCancelamento
        ? `Envio cancelado ${quem}: ${envio.motivoCancelamento}`
        : `Envio cancelado ${quem}.`,
      badgeVariant: 'neutral',
    }
  }

  if (isEnvioDesconsiderado(envio, agora)) {
    return {
      fase: 'desconsiderado',
      rotulo: 'Desconsiderado',
      descricao:
        envio.motivoDesconsideracao ||
        'Envio desconsiderado: o código de postagem não foi informado no prazo limite de 3 dias.',
      badgeVariant: 'danger',
    }
  }

  if (envio.etapaAtual === 'Protocolo gerado' && !envio.dataPostagem) {
    const prazo = prazoPostagemEnvio(envio, agora)
    return {
      fase: 'nao_postado',
      rotulo: 'Ainda não postado',
      descricao:
        prazo.mensagemAlerta ??
        'Ainda não postado — o sistema ainda não reconheceu nenhum código de postagem.',
      badgeVariant: 'warning',
    }
  }

  if (envio.etapaAtual === 'Envio postado') {
    const statusSro = rastreio?.statusAtual
    if (statusSro === 'em_transito' || statusSro === 'saiu_para_entrega') {
      return {
        fase: 'em_transito',
        rotulo: 'Em trânsito',
        descricao: rastreio?.etapaDescricao || 'Objeto em trânsito para a Central de Custódia.',
        badgeVariant: 'info',
      }
    }
    return {
      fase: 'postado',
      rotulo: 'Postado',
      descricao: envio.codigoRastreio
        ? `Postado com o rastreio ${envio.codigoRastreio}. Aguardando triagem dos Correios.`
        : 'Objeto postado pelo remetente.',
      badgeVariant: 'primary',
    }
  }

  if (envio.etapaAtual === 'Recebido pela custódia') {
    return {
      fase: 'recebido',
      rotulo: 'Recebido pela custódia',
      descricao: 'Pacote recebido com segurança no cofre da Central de Custódia.',
      badgeVariant: 'primary',
    }
  }

  if (envio.etapaAtual === 'Em análise física') {
    return {
      fase: 'em_analise',
      rotulo: 'Em análise física',
      descricao: 'Moeda em análise física na bancada de validação técnica.',
      badgeVariant: 'primary',
    }
  }

  if (envio.etapaAtual === 'Recibo emitido') {
    return {
      fase: 'analisado',
      rotulo: 'Analisado / Concluído',
      descricao:
        envio.codigosAtivosGerados.length > 0
          ? `Análise concluída com sucesso. Moeda(s) emitida(s): ${envio.codigosAtivosGerados.join(', ')}.`
          : 'Análise concluída e recibo de custódia emitido.',
      badgeVariant: 'success',
    }
  }

  return {
    fase: 'postado',
    rotulo: envio.etapaAtual,
    descricao: '',
    badgeVariant: 'neutral',
  }
}
