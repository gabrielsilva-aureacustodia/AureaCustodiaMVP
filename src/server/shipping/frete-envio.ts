/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Frete do envio à custódia, pago pelo cliente no site, e a pré-postagem de
 * logística reversa que ele compra (22/10/2026). Fala com a API CWS dos
 * Correios e com o estado; nada daqui pode chegar a um Client Component.
 * ==========================================================================*/

import 'server-only'

/**
 * POR QUE O FRETE PASSOU A SER PAGO NO SITE
 * -----------------------------------------
 * Até 22/10/2026 o cliente postava no balcão, pagando o preço de varejo, e digitava o código do
 * comprovante. A API de rastreio do contrato não enxerga objeto postado assim ("SRO-009: Objeto não
 * pertence ao contrato"), então nenhum envio era rastreado de verdade. Com o contrato, o servidor
 * gera a pré-postagem de LOGÍSTICA REVERSA: o código nasce nos Correios, já ligado ao nosso cartão de
 * postagem, a etiqueta é a oficial deles e o cliente posta de graça em qualquer agência. O frete cai
 * na fatura do contrato, e o cliente o paga aqui pelo mesmo preço, sem margem (decisão do Gabriel).
 *
 * A ORDEM QUE ESTE ARQUIVO PROTEGE
 * --------------------------------
 *  1. A cotação é SEMPRE do servidor: o cliente escolhe PAC ou SEDEX, nunca o valor.
 *  2. Primeiro o dinheiro, depois a etiqueta. A pré-postagem só nasce com o frete `pago` — etiqueta
 *     sem frete pago seria frete que a Áurea paga aos Correios sem ter recebido.
 *  3. A chamada aos Correios fica FORA do `mutateState`. A transação prende a linha do estado; segurá-la
 *     durante uma chamada de rede de um ou dois segundos travaria a plataforma inteira para todo mundo.
 *     Por isso a emissão é ler → chamar → gravar, e a gravação confere de novo se ninguém emitiu no
 *     meio (o webhook do Pix e o botão "Emitir etiqueta" podem chegar juntos). Quem perde a corrida
 *     cancela a pré-postagem que sobrou.
 *  4. Falha dos Correios não desfaz pagamento. O frete fica `pago`, sem etiqueta, e o cliente (ou o
 *     webhook, ou a equipe) tenta emitir de novo — `emitirPrePostagemDoEnvio` é idempotente.
 *  5. Sem contrato configurado (desenvolvimento local), nada disto roda: o envio segue o fluxo antigo,
 *     com postagem no balcão e código digitado. A tela diz que a cotação é estimativa local.
 */

import { desconsiderarEnvio, envioVenceuPrazoDePostagem, isEnvioDesconsiderado, prePostagemAtiva } from '@/domain/envios'
import type { Cents, Envio, FreteEnvio, PrePostagemRegistro, Timestamp, User } from '@/domain/types'
import { calcularFreteCorreios } from '@/lib/shipping/correios'
import { correiosConfigurado, SERVICOS_CORREIOS } from '@/lib/shipping/cws/config'
import {
  cancelarPrePostagem,
  consultarPrePostagem,
  criarPrePostagem,
  type PessoaPostal,
} from '@/lib/shipping/cws/prepostagem'
import { ENDERECO_CENTRAL_AUREA, RAZAO_SOCIAL_POSTAL } from '@/lib/shipping/endereco-central'
import { DESCRICAO_CONTEUDO_PADRAO, dimensoesParaMoedas, type ModalidadeEnvio } from '@/lib/shipping/types'
import { getState, mutateState } from '@/server/state'

/** Valor declarado por moeda — o mesmo R$ 150,00 que a etiqueta usava antes do contrato. */
export const VALOR_DECLARADO_POR_MOEDA_CENTS: Cents = 15_000

/**
 * Uma cotação vale 24 horas. Os Correios reajustam a tabela do contrato sem aviso; cobrar hoje o
 * preço de uma semana atrás faria a Áurea pagar a diferença na fatura do contrato.
 */
export const VALIDADE_COTACAO_FRETE_MS = 24 * 60 * 60 * 1000

/** CEP da agência da caixa postal, só dígitos — é ele que a pré-postagem leva no destino. */
const CEP_CAIXA_POSTAL = '30315970'

export const SEM_CONTRATO_CORREIOS =
  'O contrato dos Correios não está configurado neste ambiente: o frete não pode ser pago no site. Poste na agência e informe o código do comprovante.'

export function valorDeclaradoDoEnvio(quantidade: number): Cents {
  return Math.max(1, Math.floor(quantidade)) * VALOR_DECLARADO_POR_MOEDA_CENTS
}

/**
 * O destino da logística reversa: a caixa postal da Central de Custódia.
 *
 * Só caixa postal e CEP, como na etiqueta antiga (pedido do Gabriel, 18/09/2026): sem o complemento
 * com a agência e a avenida. O nome é a RAZÃO SOCIAL, que é quem assinou o Termo de Caixa Postal —
 * pacote endereçado à marca pode ser recusado na triagem. O bairro é o da base oficial dos Correios
 * para o CEP 30315-970 ('Comiteco'); divergir dela faz a pré-postagem ser recusada.
 */
export function destinatarioCentral(): PessoaPostal {
  return {
    nome: RAZAO_SOCIAL_POSTAL,
    cpfCnpj: ENDERECO_CENTRAL_AUREA.cpfOuCnpj,
    telefone: ENDERECO_CENTRAL_AUREA.telefone,
    endereco: {
      cep: CEP_CAIXA_POSTAL,
      logradouro: 'Caixa Postal 7990',
      numero: 'S/N',
      bairro: 'Comiteco',
      cidade: ENDERECO_CENTRAL_AUREA.cidade,
      uf: ENDERECO_CENTRAL_AUREA.uf,
    },
  }
}

/**
 * O remetente é o dono do envio, pelo cadastro formal. O e-mail é o da conta: na logística reversa
 * ele é OBRIGATÓRIO, porque é para ele que os Correios mandam as instruções de postagem.
 * Sem cadastro com endereço, não há remetente — e devolver `null` é melhor do que inventar um.
 */
export function remetenteDoEnvio(envio: Envio, dono: User | undefined): PessoaPostal | null {
  const c = dono?.cadastro
  if (!c || !c.nomeCompleto || !c.cpf || !c.endereco?.cep || !c.endereco.logradouro) return null
  return {
    nome: c.nomeCompleto,
    cpfCnpj: c.cpf,
    email: envio.userEmail,
    telefone: c.telefone,
    endereco: {
      cep: c.endereco.cep,
      logradouro: c.endereco.logradouro,
      numero: c.endereco.numero,
      complemento: c.endereco.complemento,
      bairro: c.endereco.bairro,
      cidade: c.endereco.cidade,
      uf: c.endereco.uf,
    },
  }
}

export function cotacaoVencida(frete: FreteEnvio, agora: Timestamp = Date.now()): boolean {
  return agora - frete.cotadoEm > VALIDADE_COTACAO_FRETE_MS
}

/**
 * Por que este envio não pode cotar nem pagar frete agora — ou `null` se pode.
 *
 * Uma regra só para a tela, as Server Actions e o liquidador do gateway: o pagamento que cai depois
 * de o envio mudar (desconsiderado, postado no balcão, já pago por outra forma) vira saldo em vez de
 * frete, e é esta função que diz quando.
 */
export function recusaDoEnvioParaFrete(envio: Envio, agora: Timestamp = Date.now()): string | null {
  if (envio.origem === 'cadastro_sem_envio') return 'Este cadastro não passa pelos Correios: não há frete a pagar.'
  if (isEnvioDesconsiderado(envio, agora)) {
    return 'Este protocolo foi desconsiderado após 3 dias sem postagem. Gere um novo protocolo.'
  }
  if (envio.dataPostagem !== null || envio.etapaAtual !== 'Protocolo gerado') return 'Este envio já foi postado.'
  if (prePostagemAtiva(envio)) return 'O frete deste envio já está pago e a etiqueta dos Correios, emitida.'
  if (envio.frete?.status === 'pago') return 'O frete deste envio já está pago.'
  return null
}

export interface CotacaoDoServidor {
  frete: FreteEnvio
  /** `'tabela'` = estimativa local, sem contrato configurado. Essa não se paga — ver `SEM_CONTRATO_CORREIOS`. */
  origem: 'correios' | 'tabela'
}

/**
 * Cota o frete de um envio pelo contrato (serviço de ENTRADA — PAC ou SEDEX reverso), com o pacote
 * do tamanho da quantidade congelada no protocolo. Lança o erro dos Correios: quem chama decide se
 * mostra ou tenta de novo.
 */
export async function cotarFreteDoServidor(
  envio: Envio,
  cepOrigem: string,
  modalidade: ModalidadeEnvio,
  agora: Timestamp = Date.now(),
): Promise<CotacaoDoServidor> {
  const valorDeclaradoCents = valorDeclaradoDoEnvio(envio.quantidade)
  const cot = await calcularFreteCorreios({
    cepOrigem,
    cepDestino: CEP_CAIXA_POSTAL,
    modalidade,
    valorDeclaradoCents,
    sentido: 'entrada',
    quantidade: envio.quantidade,
  })
  return {
    origem: cot.origem,
    frete: {
      modalidade,
      codigoServico: cot.codigoServico ?? SERVICOS_CORREIOS.entrada[modalidade],
      valorCents: cot.valorTotalCents,
      valorDeclaradoCents,
      prazoDiasUteis: cot.prazoDiasUteis,
      cotadoEm: agora,
      status: 'cotado',
      pagoEm: null,
      forma: null,
      paymentIntentRef: null,
      estornadoEm: null,
    },
  }
}

/* ------------------------------------------------------------------ *
 * Emissão da pré-postagem                                            *
 * ------------------------------------------------------------------ */

export type MotivoSemEmissao =
  | 'sem_contrato'
  | 'nao_encontrado'
  | 'frete_nao_pago'
  | 'envio_encerrado'
  | 'sem_cadastro'
  | 'falha_correios'

export type ResultadoEmissao =
  | { ok: true; prePostagem: PrePostagemRegistro; jaExistia: boolean }
  | { ok: false; motivo: MotivoSemEmissao; erro: string }

/**
 * Emite a pré-postagem de logística reversa do envio, com o frete já pago. IDEMPOTENTE: se o envio
 * já tem pré-postagem válida, devolve a mesma, sem chamar os Correios.
 *
 * Grava `envio.prePostagem` e `envio.codigoRastreio` (acordo 1 de docs/EXECUCAO_CORREIOS_CWS.md). A
 * etapa continua "Protocolo gerado" e `dataPostagem` continua `null`: quem marca a postagem é o
 * rastreio, quando os Correios registram o objeto — a etiqueta impressa ainda não é pacote na agência.
 *
 * Nunca lança: o chamador típico acabou de receber dinheiro (saldo debitado, webhook do gateway) e
 * não pode ver uma exceção desfazer aquilo.
 */
export async function emitirPrePostagemDoEnvio(protocolo: string): Promise<ResultadoEmissao> {
  if (!correiosConfigurado()) return { ok: false, motivo: 'sem_contrato', erro: SEM_CONTRATO_CORREIOS }

  let criada: Awaited<ReturnType<typeof criarPrePostagem>>
  let codigoServico: string
  try {
    const state = await getState()
    const envio = state.envios.find((e) => e.protocolo === protocolo)
    if (!envio) return { ok: false, motivo: 'nao_encontrado', erro: 'Protocolo não encontrado.' }

    const existente = prePostagemAtiva(envio)
    if (existente) return { ok: true, prePostagem: existente, jaExistia: true }

    const frete = envio.frete
    if (!frete || frete.status !== 'pago') {
      return { ok: false, motivo: 'frete_nao_pago', erro: 'O frete deste envio ainda não foi pago.' }
    }
    if (envio.desconsideradoEm || envio.dataPostagem !== null || envio.etapaAtual !== 'Protocolo gerado') {
      return { ok: false, motivo: 'envio_encerrado', erro: 'Este envio não aceita mais etiqueta: já foi postado ou desconsiderado.' }
    }

    const remetente = remetenteDoEnvio(envio, state.users[envio.userEmail])
    if (!remetente) {
      return {
        ok: false,
        motivo: 'sem_cadastro',
        erro: 'Complete o cadastro (nome, CPF e endereço) para emitir a etiqueta dos Correios.',
      }
    }

    // A chamada de rede, fora da transação (ver o cabeçalho, item 3).
    codigoServico = frete.codigoServico || SERVICOS_CORREIOS.entrada[frete.modalidade]
    criada = await criarPrePostagem({
      codigoServico,
      modalidade: frete.modalidade,
      remetente,
      destinatario: destinatarioCentral(),
      dimensoes: dimensoesParaMoedas(envio.quantidade),
      valorDeclaradoCents: frete.valorDeclaradoCents || valorDeclaradoDoEnvio(envio.quantidade),
      itens: [
        {
          conteudo: DESCRICAO_CONTEUDO_PADRAO,
          quantidade: envio.quantidade,
          valorUnitarioCents: VALOR_DECLARADO_POR_MOEDA_CENTS,
        },
      ],
      logisticaReversa: true,
      // Sai impresso na etiqueta: é como a equipe casa o pacote com o protocolo ao abrir a caixa postal.
      observacao: envio.protocolo,
    })
  } catch (err) {
    console.error(`[frete-envio] pré-postagem do ${protocolo} não saiu:`, err)
    return {
      ok: false,
      motivo: 'falha_correios',
      erro: err instanceof Error ? err.message : 'Os Correios não responderam. Tente de novo em instantes.',
    }
  }

  const registro: PrePostagemRegistro = {
    id: criada.id,
    codigoObjeto: criada.codigoObjeto,
    codigoServico,
    criadaEm: Date.now(),
    prazoPostagem: criada.prazoPostagem,
    canceladaEm: null,
  }

  try {
    const { result } = await mutateState((s) => {
      const e = s.envios.find((x) => x.protocolo === protocolo)
      if (!e) return { gravada: false as const, vencedora: null }
      const ja = prePostagemAtiva(e)
      if (ja) return { gravada: false as const, vencedora: ja }
      // O frete pode ter sido estornado (envio desconsiderado) enquanto os Correios respondiam.
      if (e.frete?.status !== 'pago' || e.desconsideradoEm) return { gravada: false as const, vencedora: null }
      e.prePostagem = registro
      e.codigoRastreio = registro.codigoObjeto
      return { gravada: true as const, vencedora: registro }
    })

    if (result.gravada) return { ok: true, prePostagem: registro, jaExistia: false }

    // Perdeu a corrida, ou o envio mudou no meio: a pré-postagem criada agora sobra nos Correios.
    // Não postada, ela não é cobrada — mas fica pendurada no contrato, então cancela.
    await cancelarSemLancar(criada.id, protocolo)
    if (result.vencedora) return { ok: true, prePostagem: result.vencedora, jaExistia: true }
    return { ok: false, motivo: 'envio_encerrado', erro: 'O envio mudou enquanto a etiqueta era emitida. Atualize a página.' }
  } catch (err) {
    console.error(`[frete-envio] pré-postagem ${criada.id} do ${protocolo} criada, mas não gravada:`, err)
    await cancelarSemLancar(criada.id, protocolo)
    return { ok: false, motivo: 'falha_correios', erro: 'Falha ao salvar a etiqueta. Tente de novo.' }
  }
}

async function cancelarSemLancar(id: string, protocolo: string): Promise<boolean> {
  try {
    await cancelarPrePostagem(id)
    return true
  } catch (err) {
    console.error(`[frete-envio] não cancelou a pré-postagem ${id} (${protocolo}):`, err)
    return false
  }
}

/* ------------------------------------------------------------------ *
 * Envio vencido sem postagem                                         *
 * ------------------------------------------------------------------ */

/**
 * Status da pré-postagem (API Pré-postagem) que provam que o pacote NÃO foi aos Correios:
 * 2 pré-postado, 4 expirado, 5 cancelado, 7 pendente. Os outros — 1 pré-atendido (o cliente está no
 * balcão), 3 postado, 6 estornado — ou um status ausente seguram o envio: na dúvida, não se desfaz
 * um envio que pode estar a caminho.
 */
const STATUS_NAO_POSTADO = new Set([2, 4, 5, 7])

export interface ResumoVarreduraDeEnvios {
  desconsiderados: string[]
  fretesEstornadosCents: Cents
  prePostagensCanceladas: string[]
  /** Envios vencidos com etiqueta cujo status nos Correios não deixou desconsiderar (postado, ou sem resposta). */
  aguardandoCorreios: string[]
}

/**
 * Desconsidera os envios que passaram de 3 dias sem postagem e TÊM dinheiro ou etiqueta envolvidos:
 * frete pago volta ao saldo (status `estornado`, que o ledger lê como `estorno`) e a pré-postagem é
 * cancelada nos Correios. Envio sem frete nem etiqueta não precisa de nada — a leitura já o trata
 * como desconsiderado.
 *
 * Envio com etiqueta só cai depois de os Correios confirmarem que ele não foi postado: o rastreio
 * pode estar um dia atrasado, e desconsiderar um pacote que já está a caminho faria a moeda chegar
 * à custódia sem protocolo válido.
 *
 * Feito para rodar no cron diário. A ordem é a do arquivo inteiro: perguntar aos Correios, gravar a
 * desconsideração e o estorno numa transação, e só depois cancelar a pré-postagem (I/O) e anotar o
 * cancelamento. Cancelamento que falha fica para a próxima volta.
 */
export async function desconsiderarEnviosVencidos(agora: Timestamp = Date.now()): Promise<ResumoVarreduraDeEnvios> {
  const resumo: ResumoVarreduraDeEnvios = {
    desconsiderados: [],
    fretesEstornadosCents: 0,
    prePostagensCanceladas: [],
    aguardandoCorreios: [],
  }

  const state = await getState()
  const candidatos = state.envios.filter(
    (e) => envioVenceuPrazoDePostagem(e, agora) && (e.frete?.status === 'pago' || prePostagemAtiva(e) !== null),
  )

  const liberados = new Set<string>()
  const jaCanceladasNosCorreios = new Set<string>()
  for (const e of candidatos) {
    const pp = prePostagemAtiva(e)
    if (!pp) {
      liberados.add(e.protocolo)
      continue
    }
    if (!correiosConfigurado()) {
      resumo.aguardandoCorreios.push(e.protocolo)
      continue
    }
    try {
      const situacao = await consultarPrePostagem(pp.codigoObjeto)
      if (situacao && situacao.statusAtual !== null && STATUS_NAO_POSTADO.has(situacao.statusAtual)) {
        liberados.add(e.protocolo)
        if (situacao.statusAtual === 5) jaCanceladasNosCorreios.add(e.protocolo)
      } else {
        resumo.aguardandoCorreios.push(e.protocolo)
      }
    } catch (err) {
      console.error(`[frete-envio] situação da pré-postagem do ${e.protocolo} não leu:`, err)
      resumo.aguardandoCorreios.push(e.protocolo)
    }
  }

  // Pré-postagens de envios já desconsiderados cujo cancelamento falhou numa volta anterior.
  const aCancelar = new Map<string, PrePostagemRegistro>()
  for (const e of state.envios) {
    const pp = prePostagemAtiva(e)
    if (e.desconsideradoEm && pp) aCancelar.set(e.protocolo, pp)
  }

  if (liberados.size > 0) {
    const { result } = await mutateState((s) => {
      const feitos: Array<{ protocolo: string; estornado: Cents; prePostagem: PrePostagemRegistro | null }> = []
      for (const e of s.envios) {
        if (!liberados.has(e.protocolo)) continue
        // Conferido de novo dentro da transação: o rastreio pode ter marcado a postagem no meio.
        if (!envioVenceuPrazoDePostagem(e, agora)) continue
        const r = desconsiderarEnvio(
          s,
          e,
          agora,
          e.frete?.status === 'pago'
            ? 'Prazo limite de 3 dias para postagem expirado sem postagem nos Correios. O frete pago voltou ao saldo.'
            : 'Prazo limite de 3 dias para postagem expirado sem postagem nos Correios.',
        )
        feitos.push({ protocolo: e.protocolo, estornado: r.freteEstornadoCents, prePostagem: r.prePostagemACancelar })
      }
      return feitos
    })
    for (const f of result) {
      resumo.desconsiderados.push(f.protocolo)
      resumo.fretesEstornadosCents += f.estornado
      if (f.prePostagem) aCancelar.set(f.protocolo, f.prePostagem)
    }
  }

  // Cancelar nos Correios e anotar. Sem contrato não há como cancelar: fica para quando houver.
  const cancelados: string[] = []
  for (const [protocolo, pp] of aCancelar) {
    if (jaCanceladasNosCorreios.has(protocolo)) {
      cancelados.push(protocolo)
      continue
    }
    if (!correiosConfigurado()) continue
    if (await cancelarSemLancar(pp.id, protocolo)) cancelados.push(protocolo)
  }
  if (cancelados.length > 0) {
    const quando = Date.now()
    await mutateState((s) => {
      for (const e of s.envios) {
        if (!cancelados.includes(e.protocolo) || !e.prePostagem || e.prePostagem.canceladaEm) continue
        e.prePostagem = { ...e.prePostagem, canceladaEm: quando }
      }
    })
    resumo.prePostagensCanceladas.push(...cancelados)
  }

  return resumo
}
