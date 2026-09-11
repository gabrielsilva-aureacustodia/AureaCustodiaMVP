'use server'

/**
 * Custódia — port de aurea-mvp-teste.html: `generateProtocol` (2114-2127),
 * `markPostado` (2153-2163) e `advanceAnalysis` (2202-2230).
 *
 * POR QUE ESTAS TRÊS FUNÇÕES PRECISAVAM SAIR DO NAVEGADOR
 * ------------------------------------------------------
 * No monolito elas eram as mais perigosas do arquivo, e não por acaso: são as
 * únicas que CRIAM valor do nada. `advanceAnalysis` emite moedas com recibo
 * e escreve o inventário do usuário. Rodando no cliente, bastava chamar
 * `advanceAnalysis()` pelo console — ou mexer em `envio.quantidade` antes — para
 * fabricar acervo. Aqui a quantidade é congelada no protocolo, no servidor, e o
 * avanço só acontece sobre um envio que pertence à sessão.
 *
 * O QUE TODA AÇÃO DAQUI REVALIDA, SEM EXCEÇÃO
 * -------------------------------------------
 *  - a sessão existe (cookie assinado, não parâmetro);
 *  - o protocolo existe E é do usuário da sessão — o original achava o envio só
 *    pelo `activeEnvioId`, uma global do navegador, sem conferir dono;
 *  - a etapa atual permite a transição pedida. Sem isso, dois cliques seguidos
 *    em "Marcar como postado" gerariam dois códigos de rastreio, e dois cliques
 *    em "Simular avanço" na última etapa emitiriam as moedas duas vezes.
 *
 * Tudo dentro de um único `mutateState`, que é a transação: ler o envio, decidir
 * e escrever acontecem sem janela para uma segunda requisição entrar no meio.
 */

import { nextEnvioCode } from '@/domain/codes'
import { COIN_TYPES, faixaValor, isNegociavel } from '@/domain/constants'
import { fdate } from '@/domain/dates'
import { custodyFeeForCount } from '@/domain/fees'
import { medianSellPrice } from '@/domain/market'
import { mkCoin } from '@/domain/seed'
import { ETAPAS_ENVIO } from '@/domain/types'
import type { ActionResult, Envio, EtapaEnvio } from '@/domain/types'
import { getSessionEmail } from '@/server/session'
import { mutateState } from '@/server/state'

/* ---------------------------------------------------------------------------
 * Mensagens
 * ------------------------------------------------------------------------- */

/** Texto padronizado do contrato de UI para sessão ausente ou inválida. */
const SESSAO_EXPIRADA = 'Sessão expirada.'

/**
 * Mensagem do saveState do MVP (linha 915). getState/mutateState PROPAGAM
 * exceção; sem o catch, o cliente veria um 500 genérico do Next no lugar do
 * aviso do produto.
 */
const FALHA_GRAVACAO = 'Falha ao salvar dados. Tente novamente.'

/**
 * Texto já existente no original — é o `<div class="empty">` que os passos 3 e 4
 * mostram quando o protocolo some (linhas 2130 e 2176). Reaproveitado aqui em
 * vez de inventar frase nova.
 *
 * DIVERGÊNCIA REGISTRADA: `markPostado` e `advanceAnalysis` originais faziam
 * `if(!envio) return;` — silêncio absoluto, o usuário clicava e nada acontecia,
 * sem nenhuma explicação. Devolver o erro faz o toast dizer o que houve.
 */
const PROTOCOLO_NAO_ENCONTRADO = 'Protocolo não encontrado.'

/** Guarda de reentrância da postagem. Texto novo (ver "issues" do relatório). */
const JA_POSTADO = 'Este envio já foi marcado como postado.'

/** Guarda de reentrância do avanço de etapa. Texto novo. */
const JA_CONCLUIDO = 'Este envio já foi concluído.'

/** Recusa de dados adulterados na criação do protocolo. Texto novo. */
const DADOS_INVALIDOS = 'Dados do envio inválidos. Revise e tente novamente.'

/* ---------------------------------------------------------------------------
 * Limites de validação
 * ------------------------------------------------------------------------- */

/**
 * Faixa de anos oferecida pelo <select> do passo 1 (linha 2065: de 2016 até
 * 1980, decrescente). O servidor repete o limite porque o cliente pode mandar
 * qualquer número.
 */
const ANO_MAX = 2016
const ANO_MIN = 1980

/**
 * Teto de moedas por protocolo.
 *
 * ACRÉSCIMO DELIBERADO: o original não tinha teto — o campo era
 * `oninput="sendForm.quantidade=Math.max(1,parseInt(this.value,10)||1)"`, sem
 * limite superior, e `advanceAnalysis` fazia um laço `for(i<quantidade)` criando
 * uma moeda por volta. Uma requisição com quantidade 10.000.000 escreveria
 * dezenas de megabytes no documento de estado compartilhado pelas sete contas e
 * derrubaria a plataforma para todo mundo. Cem moedas num único envio já é mais
 * do que qualquer cenário real de teste.
 */
const QTD_MAX = 100

/* ---------------------------------------------------------------------------
 * 1. Gerar protocolo (passo 2 -> 3)
 * ------------------------------------------------------------------------- */

/**
 * Cria o registro de envio e devolve o protocolo — `generateProtocol` do
 * original (2114-2127).
 *
 * As FOTOS NÃO CHEGAM AQUI, e é intencional: ficam só na memória da aba, como
 * dataURL (ver o cabeçalho de components/custody/PhotoSlot.tsx e a Seção 4.6).
 * A assinatura desta função é o contrato que garante isso.
 *
 * A quantidade é congelada no protocolo neste instante. É ela que
 * `advanceAnalysis` vai usar para emitir as moedas, e por isso é aqui — não lá —
 * que precisa ser validada.
 */
export async function createProtocol(
  tipoMoeda: string,
  ano: number,
  quantidade: number,
): Promise<ActionResult<{ protocolo: string }>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  // O tipo tem de ser uma chave do catálogo: `coinTypeInfo` cairia no primeiro
  // item silenciosamente, e uma moeda de tipo inventado entraria no inventário.
  if (!COIN_TYPES.some((t) => t.key === tipoMoeda)) return { ok: false, error: DADOS_INVALIDOS }
  if (!Number.isInteger(ano) || ano < ANO_MIN || ano > ANO_MAX) {
    return { ok: false, error: DADOS_INVALIDOS }
  }
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > QTD_MAX) {
    return { ok: false, error: DADOS_INVALIDOS }
  }

  try {
    const { result } = await mutateState((state) => {
      // Cookie assinado apontando para um usuário que já não existe (banco
      // recriado, seed trocado): melhor recusar do que criar um envio órfão que
      // nenhuma tela conseguiria concluir.
      if (!state.users[session]) return null

      // nextEnvioCode MUTA state.seq — é o que garante protocolo único, e por
      // isso só pode ser chamado depois de todas as recusas acima.
      const protocolo = nextEnvioCode(state.seq)
      const envio: Envio = {
        protocolo,
        userEmail: session,
        tipoMoeda,
        ano,
        quantidade,
        codigoRastreio: null,
        dataPostagem: null,
        dataRecebimento: null,
        etapaAtual: 'Protocolo gerado',
        createdAt: Date.now(),
        codigosAtivosGerados: [],
      }
      state.envios.push(envio)
      return protocolo
    })

    if (!result) return { ok: false, error: SESSAO_EXPIRADA }
    // Texto exato da linha 2126.
    return {
      ok: true,
      message: `Protocolo ${result} gerado com sucesso.`,
      data: { protocolo: result },
    }
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

/* ---------------------------------------------------------------------------
 * 2. Marcar como postado (passo 3)
 * ------------------------------------------------------------------------- */

/**
 * Carimba a postagem e gera o código de rastreio — `markPostado` (2153-2163).
 *
 * O código é SIMULADO, com a mesma fórmula do original: 'BR' + um inteiro entre
 * 400.000.000 e 498.999.999 + 'BR'. Não consulta os Correios e não deve ser
 * confundido com um objeto real.
 */
export async function markPosted(protocolo: string): Promise<ActionResult> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  try {
    const { result } = await mutateState((state) => {
      // A conferência de dono é o acréscimo que justifica a ação estar no
      // servidor: sem ela, qualquer um postaria o envio alheio.
      const envio = state.envios.find(
        (e) => e.protocolo === protocolo && e.userEmail === session,
      )
      if (!envio) return 'nao-encontrado' as const

      // Reentrância: o botão só aparece antes da postagem, mas um duplo clique
      // (ou um F5 no meio) mandaria a ação duas vezes, e a segunda sobrescreveria
      // o rastreio que o usuário já anotou.
      if (envio.etapaAtual !== 'Protocolo gerado' || envio.dataPostagem !== null) {
        return 'ja-postado' as const
      }

      envio.codigoRastreio = 'BR' + Math.floor(400000000 + Math.random() * 99000000) + 'BR'
      envio.dataPostagem = Date.now()
      envio.etapaAtual = 'Envio postado'
      return 'ok' as const
    })

    if (result === 'nao-encontrado') return { ok: false, error: PROTOCOLO_NAO_ENCONTRADO }
    if (result === 'ja-postado') return { ok: false, error: JA_POSTADO }
    // Texto exato da linha 2162.
    return { ok: true, message: 'Envio marcado como postado. Código de rastreio gerado.' }
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

/* ---------------------------------------------------------------------------
 * 3. Avançar a análise (passo 4)
 * ------------------------------------------------------------------------- */

/**
 * Empurra o envio uma casa na máquina de estados — `advanceAnalysis`
 * (2202-2230). É o botão "Simular avanço de etapa (ambiente de teste)"; em
 * produção quem avança é a equipe de custódia.
 *
 * NÃO EMITE TOAST, e isso é port fiel: o original chamava `render()` e mais
 * nada. O retorno vem sem `message` justamente para que `run()` não abra aviso —
 * o retorno visual é a própria linha do tempo mudando.
 *
 * Ao chegar em 'Recibo emitido' acontecem as três coisas que dão valor ao
 * envio, na ordem do original:
 *   1. as moedas são criadas com recibo e amarradas ao protocolo;
 *   2. a taxa de custódia é RECALCULADA pela faixa da nova contagem total —
 *      não é a taxa do envio, é a do acervo inteiro depois dele;
 *   3. a cobrança nasce 'Pendente'.
 */
export async function advanceAnalysis(protocolo: string): Promise<ActionResult> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  try {
    const { result } = await mutateState((state) => {
      const envio = state.envios.find(
        (e) => e.protocolo === protocolo && e.userEmail === session,
      )
      if (!envio) return 'nao-encontrado' as const

      const u = state.users[session]
      if (!u) return 'nao-encontrado' as const

      // ETAPAS_ENVIO é a lista única; o índice + 1 é a "próxima". O original
      // redeclarava o array aqui (linha 2206) e no desenho da linha do tempo.
      const idx = ETAPAS_ENVIO.indexOf(envio.etapaAtual)
      const proxima: EtapaEnvio | undefined = ETAPAS_ENVIO[idx + 1]
      // Já estava na última (ou a etapa gravada é desconhecida, idx === -1):
      // nada a avançar. O original devolvia em silêncio.
      if (!proxima) return 'concluido' as const

      envio.etapaAtual = proxima
      if (proxima === 'Recebido pela custódia') envio.dataRecebimento = Date.now()

      if (proxima === 'Recibo emitido') {
        const entradaStr = fdate(Date.now())
        // Tipo negociável tem mercado: o valor estimado sai da mediana das
        // ofertas abertas DELE. Sem mercado — tipo não negociável, ou negociável
        // ainda sem nenhuma oferta — cai na faixa de referência do próprio tipo,
        // a mesma que o seed usa. Antes isto olhava só para COIN.name, o que
        // daria à Direitos Humanos um valor sorteado na faixa das olímpicas
        // comuns (R$ 140–360) mesmo com o mercado dela aberto e cotado.
        const negociavel = isNegociavel(envio.tipoMoeda)
        const med = negociavel ? medianSellPrice(state, envio.tipoMoeda) : null
        const faixa = faixaValor(envio.tipoMoeda)

        for (let i = 0; i < envio.quantidade; i++) {
          const baseVal =
            med ?? faixa.min + Math.floor(Math.random() * (faixa.max - faixa.min))
          // mkCoin consome DOIS contadores de seq (o do ativo e um de envio,
          // para o campo `protocolo`); o protocolo real é sobrescrito logo
          // abaixo. É assim no original — o seq de envio adiantado é efeito
          // colateral conhecido, não bug novo deste port.
          const coin = mkCoin(
            state.seq,
            envio.tipoMoeda,
            envio.ano,
            entradaStr,
            // Arredondamento para múltiplo de R$ 5,00, a mesma granularidade
            // dos preços digitados no mercado.
            Math.round(baseVal / 500) * 500,
          )
          coin.protocolo = envio.protocolo
          // Nasce 'Recebido'; as moedas antigas da auditoria é que aparecem
          // como 'Armazenado'.
          coin.statusFisico = 'Recebido'
          u.coins.push(coin)
          envio.codigosAtivosGerados.push(coin.id)
        }

        const totalMoedas = u.coins.length
        state.custodyCharges[session] = {
          totalMoedas,
          valorCobrado: custodyFeeForCount(totalMoedas),
          dataCobranca: entradaStr,
          statusPagamento: 'Pendente',
        }
      }

      return 'ok' as const
    })

    if (result === 'nao-encontrado') return { ok: false, error: PROTOCOLO_NAO_ENCONTRADO }
    if (result === 'concluido') return { ok: false, error: JA_CONCLUIDO }
    // Sem `message`: ver a nota do cabeçalho.
    return { ok: true }
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

/* ---------------------------------------------------------------------------
 * 4. Consulta de CEP e Cotação de Frete (Passo 1 do Envio)
 * ------------------------------------------------------------------------- */

import { consultarCep } from '@/lib/shipping/cep'
import { calcularFreteCorreios, ENDERECO_CENTRAL_AUREA } from '@/lib/shipping/correios'
import type { CotacaoFreteResult, EnderecoCep, ModalidadeEnvio } from '@/lib/shipping/types'
import {
  calcularTaxaRetirada,
  criarSolicitacaoRetirada,
  transicionarRetirada,
  validarEnderecoRetirada,
} from '@/domain/retirada'
import { brl } from '@/domain/money'
import type { EnderecoEntrega, ModalidadeRetirada, Retirada, StatusRetirada } from '@/domain/types'
import { repositorioRetiradas } from '@/server/shipping/retiradas'
import { ehAdmin } from '@/server/relatorios/acesso'

/**
 * Consulta CEP para preenchimento de endereço de remetente (zero persistência - LGPD).
 */
export async function consultarCepEnvio(cep: string): Promise<ActionResult<EnderecoCep>> {
  try {
    const endereco = await consultarCep(cep)
    if (!endereco.valido) {
      return { ok: false, error: 'CEP não encontrado ou inválido.' }
    }
    return { ok: true, data: endereco }
  } catch {
    return { ok: false, error: 'Erro ao consultar CEP. Tente novamente.' }
  }
}

/**
 * Cota prazo e frete para envio de moedas sob custódia (PAC ou SEDEX).
 */
export async function cotarFreteEnvio(
  cepOrigem: string,
  modalidade: ModalidadeEnvio,
  valorDeclaradoCents: number = 30000,
): Promise<ActionResult<CotacaoFreteResult>> {
  try {
    const cotacao = await calcularFreteCorreios({
      cepOrigem,
      cepDestino: ENDERECO_CENTRAL_AUREA.cep,
      modalidade,
      valorDeclaradoCents,
    })
    return { ok: true, data: cotacao }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Falha ao calcular frete.',
    }
  }
}

/* ---------------------------------------------------------------------------
 * 5. Retirada Física de Moedas da Custódia (Bloco 10 · Agente C · Sessão C-2)
 * ------------------------------------------------------------------------- */

/**
 * Solicita a saída física de uma moeda da custódia.
 *
 * REGRAS INEGOCIÁVEIS:
 * 1. Sem endereço completo e confirmado, o pedido recusa e o prazo D+30 NÃO COMEÇA.
 * 2. Valores excludentes conforme D-1: comum R$ 50,00 ou segura R$ 180,00 (tudo incluso).
 * 3. O recibo é extinto NO MESMO INSTANTE da confirmação (coin.recibo.status = 'Extinto').
 *    Não pode existir intervalo com recibo ativo e moeda a caminho.
 * 4. Débito da taxa no saldo do usuário, lançamento contábil no ledger e auditoria
 *    com o autor real da sessão.
 */
export async function solicitarRetirada(
  coinId: string,
  modalidade: ModalidadeRetirada,
  endereco: EnderecoEntrega,
): Promise<ActionResult<{ retiradaId: string; dataLimiteD30: number; reciboCodigo: string }>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  // Trava 2: Endereço completo e confirmado obrigatório. Sem isso o prazo nem começa.
  const validacao = validarEnderecoRetirada(endereco)
  if (!validacao.valido) {
    return {
      ok: false,
      error: `Endereço de entrega incompleto: ${validacao.erros.join(', ')}. Sem endereço completo e confirmado o prazo D+30 não começa.`,
    }
  }

  if (modalidade !== 'comum' && modalidade !== 'segura') {
    return { ok: false, error: 'Modalidade de retirada inválida. Escolha comum ou segura.' }
  }

  const taxaCents = calcularTaxaRetirada(modalidade)

  try {
    const { result } = await mutateState((state) => {
      const u = state.users[session]
      if (!u) return { ok: false, error: SESSAO_EXPIRADA } as const

      const coin = u.coins.find((c) => c.id === coinId)
      if (!coin) {
        return { ok: false, error: 'Moeda não encontrada no seu acervo.' } as const
      }

      // Rejeita se anunciada no mercado
      const emOferta = state.sellOffers.some((o) => o.coinId === coinId)
      if (emOferta) {
        return {
          ok: false,
          error: 'Esta moeda está anunciada no mercado. Cancele o anúncio antes de solicitar a retirada.',
        } as const
      }

      // Rejeita se recibo já extinto
      if (coin.recibo.status === 'Extinto') {
        return {
          ok: false,
          error: 'O recibo desta moeda já está extinto. A retirada já foi solicitada anteriormente.',
        } as const
      }

      // Verifica saldo suficiente
      if (u.balance < taxaCents) {
        return {
          ok: false,
          error: `Saldo insuficiente para a taxa de retirada (${brl(taxaCents)}). Seu saldo atual é ${brl(u.balance)}.`,
        } as const
      }

      const agora = Date.now()
      const solicitacao = criarSolicitacaoRetirada({
        id: `RET-${coin.id}-${agora}`,
        coinId: coin.id,
        reciboCodigo: coin.recibo.codigo,
        userEmail: session,
        modalidade,
        endereco,
        solicitadoEm: agora,
      })

      // Como o pagamento é debitado do saldo na confirmação imediata:
      const retiradaPaga = transicionarRetirada(solicitacao, 'paga', {
        data: agora,
        motivo: 'Taxa de retirada debitada do saldo em conta',
        autor: session,
      })

      // Debita saldo da conta
      u.balance -= taxaCents

      // Extinção imediata do recibo (Regra inegociável do Bloco 10)
      coin.recibo.status = 'Extinto'

      return { ok: true, solicitacao: retiradaPaga } as const
    })

    if (!result.ok) {
      return { ok: false, error: result.error }
    }

    // Persiste na tabela aurea.retiradas (ou memória)
    await repositorioRetiradas().criar(result.solicitacao)

    return {
      ok: true,
      message: `Solicitação de retirada registrada com sucesso. Recibo extinto e taxa debitada. Prazo limite: ${fdate(result.solicitacao.dataLimiteD30)}.`,
      data: {
        retiradaId: result.solicitacao.id,
        dataLimiteD30: result.solicitacao.dataLimiteD30,
        reciboCodigo: result.solicitacao.reciboCodigo,
      },
    }
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

/**
 * Consulta as solicitações de retirada do usuário logado.
 */
export async function obterMinhasRetiradas(): Promise<ActionResult<Retirada[]>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  try {
    const lista = await repositorioRetiradas().buscarPorUsuario(session)
    return { ok: true, data: lista }
  } catch {
    return { ok: false, error: 'Falha ao consultar retiradas.' }
  }
}

/**
 * Consulta a solicitação de retirada de uma moeda específica (apenas pelo proprietário).
 */
export async function obterRetiradaPorCoin(coinId: string): Promise<ActionResult<Retirada | null>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  try {
    const r = await repositorioRetiradas().buscarPorCoinId(coinId)
    if (r && r.userEmail !== session) {
      return { ok: false, error: 'Acesso não autorizado a esta retirada.' }
    }
    return { ok: true, data: r }
  } catch {
    return { ok: false, error: 'Falha ao consultar retirada.' }
  }
}

/**
 * Avança o status de uma solicitação de retirada física (separação, postagem, entrega ou cancelamento).
 * Exige permissão de operador/sócio (ehAdmin) para avançar a expedição, ou o próprio dono para cancelamento inicial.
 */
export async function avancarStatusRetirada(
  retiradaId: string,
  proximoStatus: StatusRetirada,
  codigoRastreio?: string,
): Promise<ActionResult<Retirada>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  const repo = repositorioRetiradas()
  const retirada = await repo.buscarPorId(retiradaId)
  if (!retirada) return { ok: false, error: 'Solicitação de retirada não encontrada.' }

  const admin = ehAdmin(session)
  if (!admin && retirada.userEmail !== session) {
    return { ok: false, error: 'Acesso não autorizado a esta retirada.' }
  }

  if (!admin && proximoStatus !== 'cancelada') {
    return { ok: false, error: 'Apenas operadores de custódia podem avançar a expedição física.' }
  }

  try {
    const agora = Date.now()
    const atualizada = transicionarRetirada(
      retirada,
      proximoStatus,
      {
        data: agora,
        motivo: `Status atualizado para ${proximoStatus}${codigoRastreio ? ` (Rastreio: ${codigoRastreio})` : ''}`,
        autor: session,
        codigoRastreio,
      },
    )

    await repo.atualizar(atualizada)
    return {
      ok: true,
      message: `Retirada ${retiradaId} atualizada para "${proximoStatus}".`,
      data: atualizada,
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Falha ao atualizar status da retirada.',
    }
  }
}


