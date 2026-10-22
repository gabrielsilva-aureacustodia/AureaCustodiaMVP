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
 *
 * Módulo puro: sem I/O, sem dependências de framework ou servidor.
 */

import type { AppState, Cents, Envio, PrePostagemRegistro, Timestamp } from '@/domain/types'

/** Prazo limite para postagem nos Correios: 3 dias corridos (72 horas). */
export const PRAZO_DESCARTE_ENVIO_MS = 3 * 24 * 60 * 60 * 1000

export type FaseEnvio =
  | 'nao_postado'
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

/**
 * Calcula o prazo de postagem de um envio e o tempo restante antes do descarte.
 */
export function prazoPostagemEnvio(envio: Envio, agora: number = Date.now()): InfoPrazoPostagem {
  const expiraEm = envio.createdAt + PRAZO_DESCARTE_ENVIO_MS

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

export interface ResultadoDesconsideracao {
  /** Quanto voltou ao saldo do dono (frete pago e não usado). Zero quando não havia frete pago. */
  freteEstornadoCents: Cents
  /** A pré-postagem que precisa ser cancelada nos Correios — I/O, fica para quem chamou, FORA da transação. */
  prePostagemACancelar: PrePostagemRegistro | null
}

/**
 * Grava a desconsideração do envio e devolve o frete pago ao saldo do dono (22/10/2026).
 *
 * O frete foi pago para um pacote que não saiu de casa: a pré-postagem não postada não gera cobrança
 * dos Correios, então o dinheiro do cliente não pagou nada e volta inteiro. O status do frete vira
 * `estornado` na MESMA mutação que credita o saldo — é essa transição que o ledger lê para gravar o
 * `estorno`, e sem ela o crédito cairia na rede de segurança como `ajuste`.
 *
 * Idempotente: envio já desconsiderado não estorna de novo. Muta `state` — chame dentro do `mutateState`.
 */
export function desconsiderarEnvio(
  state: AppState,
  envio: Envio,
  agora: Timestamp,
  motivo = 'Prazo limite de 3 dias para postagem expirado.',
): ResultadoDesconsideracao {
  if (envio.desconsideradoEm) return { freteEstornadoCents: 0, prePostagemACancelar: null }

  envio.desconsideradoEm = agora
  envio.motivoDesconsideracao = motivo

  let freteEstornadoCents: Cents = 0
  const frete = envio.frete
  const dono = state.users[envio.userEmail]
  if (frete && frete.status === 'pago' && dono) {
    dono.balance += frete.valorCents
    frete.status = 'estornado'
    frete.estornadoEm = agora
    freteEstornadoCents = frete.valorCents
  }

  return { freteEstornadoCents, prePostagemACancelar: prePostagemAtiva(envio) }
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
