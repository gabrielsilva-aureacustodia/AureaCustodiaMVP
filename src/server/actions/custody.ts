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
import { faixaValor, isNegociavel, tiposAtivos } from '@/domain/constants'
import { fdate } from '@/domain/dates'
import { medianSellPrice } from '@/domain/market'
import { mkCoin } from '@/domain/seed'
import { ETAPAS_ENVIO } from '@/domain/types'
import type { ActionResult, Coin, Envio, EtapaEnvio, FaturaCustodia, StatusRecibo, User } from '@/domain/types'
import { alimentarPlanoNaAnalise } from '@/domain/plano-custodia'
import { carregarRegrasDoMercado } from '@/server/config/carregar'
import { pagarFaturaCustodiaComSaldo } from '@/server/custodia/faturamento'
import { getSessionEmail } from '@/server/session'
import { mutateState, getState } from '@/server/state'
import {
  contaComPendenciaDeCustodia,
  contaComPendenciaNoEstado,
  MENSAGEM_RECIBO_BLOQUEADO_POR_PENDENCIA,
} from '@/domain/bloqueio-por-debito'
import { contaBloqueavel } from '@/server/custodia/isencao-da-equipe'
import { carregarMembro } from '@/server/admin/acesso'
import { temPermissao } from '@/domain/admin/permissoes'

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
 * A FOTO NÃO CHEGA AQUI, e é intencional: o envio pede uma foto do item (desde
 * 14/09/2026, uma só, sem frente e verso), e ela fica só na memória da aba, como
 * dataURL (ver o cabeçalho de components/custody/PhotoSlot.tsx e a Seção 4.6).
 * A assinatura desta função é o contrato que garante isso — nenhuma validação de
 * foto existe no servidor, e por isso nenhuma precisou mudar.
 *
 * A quantidade é congelada no protocolo neste instante. É ela que
 * `advanceAnalysis` vai usar para emitir as moedas, e por isso é aqui — não lá —
 * que precisa ser validada.
 */
export async function createProtocol(
  tipoMoeda: string,
  ano: number,
  quantidade: number,
  modalidadeEnvio?: 'PAC' | 'SEDEX',
): Promise<ActionResult<{ protocolo: string }>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  // O tipo tem de ser uma chave do catálogo: `coinTypeInfo` cairia no primeiro
  // item silenciosamente, e uma moeda de tipo inventado entraria no inventário.
  // Desde a C3 o catálogo é o do painel, e só tipo ativo aceita envio novo.
  const { catalogo } = await carregarRegrasDoMercado()
  if (!tiposAtivos(catalogo).some((t) => t.key === tipoMoeda)) return { ok: false, error: DADOS_INVALIDOS }
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
        modalidadeEnvio: modalidadeEnvio ?? 'SEDEX',
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
 * Ao chegar em 'Recibo emitido' acontecem as ações que dão valor ao
 * envio:
 *   1. as moedas são criadas com recibo e amarradas ao protocolo;
 *   2. a emissão alimenta o plano de custódia (`alimentarPlanoNaAnalise`); a cobrança mensal é do ciclo, ver o fim desta função.
 */
export async function advanceAnalysis(protocolo: string): Promise<ActionResult> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  // AVANÇAR ANÁLISE É DA BANCADA, NÃO DO DONO DO ENVIO.
  //
  // Até 20/09/2026 esta função conferia só a sessão e se o envio pertencia a quem
  // pediu — e a tela de envios tinha um botão "Simular avanço de etapa" que a
  // chamava. Num ambiente de teste era o jeito de demonstrar o fluxo sem a
  // bancada; publicado, qualquer pessoa podia aprovar a própria moeda e emitir um
  // recibo negociável sem que ninguém tivesse examinado nada. O botão saiu da tela
  // do cliente no mesmo commit; a permissão é o que garante que ele não volte por
  // uma chamada direta à Server Action.
  if (!temPermissao(await carregarMembro(session), 'bancada.analisar')) {
    return { ok: false, error: 'Ação restrita à equipe do Real Olímpico.' }
  }

  const { catalogo } = await carregarRegrasDoMercado()

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
        const negociavel = isNegociavel(envio.tipoMoeda, catalogo)
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

        // B2.5: A emissão dos recibos alimenta o plano de custódia e faturas
        const plano = (state.planosCustodia ?? []).find(
          (p) => p.protocoloEnvio === envio.protocolo && p.status !== 'cancelado',
        )
        alimentarPlanoNaAnalise({
          plano,
          faturas: state.faturasCustodia ?? [],
          user: u,
          moedaIdsAprovadas: envio.codigosAtivosGerados,
          quantidadeRecusadas: 0,
          agora: Date.now(),
        })

        // A custódia NÃO é cobrada aqui desde 11/09/2026. Quem cobra é o ciclo
        // mensal (`src/server/custodia/faturamento.ts`), que conta as moedas sob
        // guarda na virada da competência. Cobrar também na emissão do recibo
        // cobraria duas vezes pela mesma moeda.
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
import { randomUUID } from 'crypto'
import {
  calcularPrazoLimiteRetirada,
  criarSolicitacaoRetirada,
  transicionarRetirada,
  validarEnderecoRetirada,
} from '@/domain/retirada'
import { brl } from '@/domain/money'
import type { EnderecoEntrega, ModalidadeRetirada, Retirada, StatusRetirada } from '@/domain/types'
import { criarCobrancaCartao, criarCobrancaPix } from '@/lib/payments/cobranca'
import type { CobrancaCartao, CobrancaPix } from '@/lib/payments/types'
import { repositorioIntencoes } from '@/server/payments/repositorios'
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
 * 5. Pagamento de Fatura de Custódia com Saldo
 * ------------------------------------------------------------------------- */

/**
 * Paga uma fatura de custódia mensal pendente utilizando o saldo disponível em conta.
 */
export async function pagarFaturaCustodia(
  faturaId: string,
): Promise<ActionResult<{ fatura: FaturaCustodia }>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: 'Sessão expirada.' }
  return pagarFaturaCustodiaComSaldo(faturaId, session)
}

/* ---------------------------------------------------------------------------
 * 6. Retirada Física de Moedas da Custódia (Bloco 10 · Agente C · Sessão C-2)
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
): Promise<ActionResult<{ retiradaId: string; dataLimiteD30: number; reciboCodigo: string; valorTaxaCents: number }>> {
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

  // A taxa da retirada é a da Tabela de Taxas vigente (C3) e fica congelada na solicitação.
  const { taxas } = await carregarRegrasDoMercado()
  const bloqueavel = await contaBloqueavel(session)

  try {
    const { result } = await mutateState((state) => {
      const u = state.users[session]
      if (!u) return { ok: false, error: SESSAO_EXPIRADA } as const

      const coin = u.coins.find((c) => c.id === coinId)
      if (!coin) {
        return { ok: false, error: 'Moeda não encontrada no seu acervo.' } as const
      }

      const agora = Date.now()
      const faturasDaConta = (state.faturasCustodia ?? []).filter((f) => f.userEmail === session)
      if (bloqueavel && contaComPendenciaDeCustodia(u, faturasDaConta, agora)) {
        return { ok: false, error: MENSAGEM_RECIBO_BLOQUEADO_POR_PENDENCIA } as const
      }

      // Rejeita se anunciada no mercado
      const emOferta = state.sellOffers.some((o) => o.coinId === coinId)
      if (emOferta) {
        return {
          ok: false,
          error: 'Esta moeda está anunciada no mercado. Cancele o anúncio antes de solicitar a retirada.',
        } as const
      }

      // Rejeita se recibo já extinto ou bloqueado
      if (coin.recibo.status === 'Extinto') {
        return {
          ok: false,
          error: 'O recibo desta moeda já está extinto. A retirada já foi solicitada anteriormente.',
        } as const
      }
      if (coin.recibo.status === 'Bloqueado') {
        return {
          ok: false,
          error: 'O recibo desta moeda está bloqueado por pendência administrativa ou financeira. Regularize sua situação para solicitar retirada.',
        } as const
      }
      if (coin.recibo.status !== 'Ativo') {
        return {
          ok: false,
          error: 'O recibo desta moeda não está ativo.',
        } as const
      }

      state.retiradas = state.retiradas ?? []
      const retiradaAtiva = state.retiradas.find(
        (r) => r.coinId === coinId && r.status !== 'cancelada',
      )
      if (retiradaAtiva) {
        return {
          ok: false,
          error: `Esta moeda já possui uma retirada (${retiradaAtiva.id}) com status "${retiradaAtiva.status}".`,
        } as const
      }

      const solicitacao = criarSolicitacaoRetirada({
        id: `RET-${coin.id}-${agora}`,
        coinId: coin.id,
        reciboCodigo: coin.recibo.codigo,
        userEmail: session,
        modalidade,
        endereco,
        solicitadoEm: agora,
        taxas,
      })

      state.retiradas.push(solicitacao)

      return { ok: true, solicitacao } as const
    })

    if (!result.ok) {
      return { ok: false, error: result.error }
    }

    // Persiste na tabela aurea.retiradas (ou memória)
    await repositorioRetiradas().criar(result.solicitacao)

    return {
      ok: true,
      message: `Solicitação de retirada registrada com sucesso. Aguardando pagamento da taxa (${brl(result.solicitacao.valorTaxaCents)}).`,
      data: {
        retiradaId: result.solicitacao.id,
        dataLimiteD30: result.solicitacao.dataLimiteD30,
        reciboCodigo: result.solicitacao.reciboCodigo,
        valorTaxaCents: result.solicitacao.valorTaxaCents,
      },
    }
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

/**
 * Realiza o pagamento da taxa de retirada utilizando o saldo disponível em conta.
 */
export async function pagarRetiradaComSaldo(
  retiradaId: string,
): Promise<ActionResult<{ retiradaId: string; dataLimiteD30: number }>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }
  const bloqueavel = await contaBloqueavel(session)

  try {
    const { result } = await mutateState((state) => {
      const u = state.users[session]
      if (!u) return { ok: false, error: SESSAO_EXPIRADA } as const

      state.retiradas = state.retiradas ?? []
      const ret = state.retiradas.find((r) => r.id === retiradaId)
      if (!ret) {
        return { ok: false, error: 'Solicitação de retirada não encontrada.' } as const
      }

      if (ret.userEmail !== session) {
        return { ok: false, error: 'Acesso não autorizado a esta solicitação de retirada.' } as const
      }

      if (ret.status !== 'solicitada') {
        return {
          ok: false,
          error: `Esta retirada já está com status "${ret.status}" e não pode ser paga novamente.`,
        } as const
      }

      if (u.balance < ret.valorTaxaCents) {
        return {
          ok: false,
          error: `Saldo insuficiente para a taxa de retirada (${brl(ret.valorTaxaCents)}). Seu saldo atual é ${brl(u.balance)}.`,
        } as const
      }

      const coin = u.coins.find((c) => c.id === ret.coinId)
      if (!coin) {
        return { ok: false, error: 'Moeda correspondente não encontrada no acervo.' } as const
      }

      if (coin.recibo.status === 'Bloqueado') {
        return {
          ok: false,
          error: 'O recibo desta moeda está bloqueado por pendência administrativa ou financeira. Regularize sua situação para solicitar retirada.',
        } as const
      }

      const agora = Date.now()
      const faturasDaConta = (state.faturasCustodia ?? []).filter((f) => f.userEmail === session)
      if (bloqueavel && contaComPendenciaDeCustodia(u, faturasDaConta, agora)) {
        return { ok: false, error: MENSAGEM_RECIBO_BLOQUEADO_POR_PENDENCIA } as const
      }

      // Debita saldo da conta
      u.balance -= ret.valorTaxaCents

      // Extinção imediata do recibo (Regra inegociável do Bloco 10)
      coin.recibo.status = 'Extinto'

      // D+30 recalculado a partir da data de confirmação do pagamento
      const novoLimiteD30 = calcularPrazoLimiteRetirada(agora)

      const retPaga = transicionarRetirada(ret, 'paga', {
        data: agora,
        motivo: 'Taxa de retirada debitada do saldo em conta',
        autor: session,
      })

      retPaga.dataLimiteD30 = novoLimiteD30
      retPaga.formaPagamento = 'saldo'
      retPaga.parcelas = 1
      retPaga.updatedAt = agora

      const idx = state.retiradas.findIndex((r) => r.id === retiradaId)
      if (idx >= 0) state.retiradas[idx] = retPaga

      return { ok: true, retirada: retPaga } as const
    })

    if (!result.ok) {
      return { ok: false, error: result.error }
    }

    await repositorioRetiradas().atualizar(result.retirada)

    return {
      ok: true,
      message: `Taxa de retirada paga com saldo com sucesso. Recibo extinto. Prazo limite: ${fdate(result.retirada.dataLimiteD30)}.`,
      data: { retiradaId: result.retirada.id, dataLimiteD30: result.retirada.dataLimiteD30 },
    }
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

/**
 * Inicia cobrança Pix para pagamento da taxa de retirada física.
 */
export async function iniciarPixRetirada(
  retiradaId: string,
): Promise<ActionResult<CobrancaPix & { forma: 'pix' }>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  const repo = repositorioRetiradas()
  const ret = await repo.buscarPorId(retiradaId)
  if (!ret) return { ok: false, error: 'Solicitação de retirada não encontrada.' }
  if (ret.userEmail !== session) return { ok: false, error: 'Acesso não autorizado.' }
  if (ret.status !== 'solicitada') {
    return { ok: false, error: `Esta retirada já está com status "${ret.status}".` }
  }

  if (await contaBloqueavel(session)) {
    try {
      const s = await getState()
      if (contaComPendenciaNoEstado(s, session, Date.now())) {
        return { ok: false, error: MENSAGEM_RECIBO_BLOQUEADO_POR_PENDENCIA }
      }
    } catch {
      /* leitura falhou: libera */
    }
  }

  const externalReference = `RET-${randomUUID()}`
  const agora = Date.now()
  const intencoes = repositorioIntencoes()

  await intencoes.criar({
    externalReference,
    userEmail: session,
    valor: ret.valorTaxaCents,
    metodo: 'pix',
    status: 'pendente',
    tipoOperacao: 'retirada',
    parcelasMax: 1,
    metadata: { retiradaId: ret.id, coinId: ret.coinId },
    paymentId: null,
    motivoRecusa: null,
    createdAt: agora,
    updatedAt: agora,
  })

  try {
    const pix = await criarCobrancaPix({
      externalReference,
      userEmail: session,
      valorCents: ret.valorTaxaCents,
      titulo: `Retirada Física — Real Olímpico (Moeda ${ret.coinId})`,
      descricao: `Taxa de retirada ${ret.modalidade} - Moeda ${ret.coinId}`,
      parcelasMax: 1,
    })

    await intencoes.anotarPagamento(externalReference, pix.paymentId)

    ret.paymentIntentRef = externalReference
    ret.formaPagamento = 'pix'
    ret.updatedAt = agora
    await repo.atualizar(ret)

    await mutateState((state) => {
      state.retiradas = state.retiradas ?? []
      const rMem = state.retiradas.find((r) => r.id === retiradaId)
      if (rMem) {
        rMem.paymentIntentRef = externalReference
        rMem.formaPagamento = 'pix'
        rMem.updatedAt = agora
      }
    })

    return { ok: true, data: { ...pix, forma: 'pix' } }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Falha ao gerar Pix para retirada.'
    return { ok: false, error: msg }
  }
}

/**
 * Inicia preferência de Cartão (Checkout Pro) para pagamento da taxa de retirada.
 * Modalidade segura permite até 2x; modalidade comum apenas 1x.
 */
export async function iniciarCartaoRetirada(
  retiradaId: string,
  parcelas: number = 1,
): Promise<ActionResult<CobrancaCartao & { forma: 'cartao' }>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  const repo = repositorioRetiradas()
  const ret = await repo.buscarPorId(retiradaId)
  if (!ret) return { ok: false, error: 'Solicitação de retirada não encontrada.' }
  if (ret.userEmail !== session) return { ok: false, error: 'Acesso não autorizado.' }
  if (ret.status !== 'solicitada') {
    return { ok: false, error: `Esta retirada já está com status "${ret.status}".` }
  }

  if (await contaBloqueavel(session)) {
    try {
      const s = await getState()
      if (contaComPendenciaNoEstado(s, session, Date.now())) {
        return { ok: false, error: MENSAGEM_RECIBO_BLOQUEADO_POR_PENDENCIA }
      }
    } catch {
      /* leitura falhou: libera */
    }
  }

  const parcelasMax = ret.modalidade === 'segura' ? 2 : 1
  const parcelasFinal = Math.min(Math.max(1, parcelas), parcelasMax)

  const externalReference = `RET-${randomUUID()}`
  const agora = Date.now()
  const intencoes = repositorioIntencoes()

  await intencoes.criar({
    externalReference,
    userEmail: session,
    valor: ret.valorTaxaCents,
    metodo: 'checkout_pro',
    status: 'pendente',
    tipoOperacao: 'retirada',
    parcelasMax,
    metadata: { retiradaId: ret.id, coinId: ret.coinId, parcelas: parcelasFinal },
    paymentId: null,
    motivoRecusa: null,
    createdAt: agora,
    updatedAt: agora,
  })

  try {
    const cartao = await criarCobrancaCartao({
      externalReference,
      userEmail: session,
      valorCents: ret.valorTaxaCents,
      titulo: `Retirada Física — Real Olímpico (Moeda ${ret.coinId})`,
      descricao: `Taxa de retirada ${ret.modalidade} - Moeda ${ret.coinId}`,
      parcelasMax,
      voltarPara: {
        sucesso: '/retirada',
        pendente: '/retirada',
        falha: '/retirada',
      },
    })

    ret.paymentIntentRef = externalReference
    ret.formaPagamento = 'cartao'
    ret.parcelas = parcelasFinal
    ret.updatedAt = agora
    await repo.atualizar(ret)

    await mutateState((state) => {
      state.retiradas = state.retiradas ?? []
      const rMem = state.retiradas.find((r) => r.id === retiradaId)
      if (rMem) {
        rMem.paymentIntentRef = externalReference
        rMem.formaPagamento = 'cartao'
        rMem.parcelas = parcelasFinal
        rMem.updatedAt = agora
      }
    })

    return { ok: true, data: { ...cartao, forma: 'cartao' } }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Falha ao gerar cobrança de cartão para retirada.'
    return { ok: false, error: msg }
  }
}

/**
 * Ação unificada para pagamento da taxa de retirada física (saldo, pix ou cartao).
 */
export async function pagarRetirada(
  retiradaId: string,
  forma: 'saldo' | 'pix' | 'cartao',
  parcelas: number = 1,
): Promise<ActionResult<unknown>> {
  if (forma === 'saldo') {
    return pagarRetiradaComSaldo(retiradaId)
  }
  if (forma === 'pix') {
    return iniciarPixRetirada(retiradaId)
  }
  if (forma === 'cartao') {
    return iniciarCartaoRetirada(retiradaId, parcelas)
  }
  return { ok: false, error: 'Forma de pagamento inválida. Escolha saldo, pix ou cartao.' }
}

/**
 * Cancela uma solicitação de retirada pendente de pagamento, liberando a moeda no mercado.
 */
export async function cancelarSolicitacaoRetirada(
  retiradaId: string,
): Promise<ActionResult<{ retiradaId: string }>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  try {
    const { result } = await mutateState((state) => {
      state.retiradas = state.retiradas ?? []
      const ret = state.retiradas.find((r) => r.id === retiradaId)
      if (!ret) {
        return { ok: false, error: 'Solicitação de retirada não encontrada.' } as const
      }
      if (ret.userEmail !== session) {
        return { ok: false, error: 'Acesso não autorizado a esta solicitação de retirada.' } as const
      }
      if (ret.status !== 'solicitada') {
        return {
          ok: false,
          error: `Apenas retiradas aguardando pagamento podem ser canceladas. Status atual: "${ret.status}".`,
        } as const
      }

      const agora = Date.now()
      const retCancelada = transicionarRetirada(ret, 'cancelada', {
        data: agora,
        motivo: 'Solicitação cancelada pelo cliente antes do pagamento',
        autor: session,
      })
      retCancelada.updatedAt = agora

      const idx = state.retiradas.findIndex((r) => r.id === retiradaId)
      if (idx >= 0) state.retiradas[idx] = retCancelada

      return { ok: true, retirada: retCancelada } as const
    })

    if (!result.ok) {
      return { ok: false, error: result.error }
    }

    await repositorioRetiradas().atualizar(result.retirada)

    return {
      ok: true,
      message: 'Solicitação de retirada cancelada com sucesso. A moeda está disponível novamente para negociação.',
      data: { retiradaId: result.retirada.id },
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

/**
 * Bloqueia o recibo de uma moeda por inadimplência ou restrição administrativa (C-5 / B-5).
 * Enquanto bloqueado, o recibo não pode ser negociado no mercado nem retirado fisicamente.
 */
export async function bloquearReciboPorDebito(
  coinId: string,
): Promise<ActionResult<{ coinId: string; status: StatusRecibo }>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  // Fecha o furo onde qualquer usuário logado podia bloquear recibos.
  // Apenas a equipe com permissão pode alterar a restrição administrativa do recibo.
  if (!temPermissao(await carregarMembro(session), 'usuarios.editar')) {
    return { ok: false, error: 'Ação restrita à equipe do Real Olímpico.' }
  }

  try {
    const { result } = await mutateState((s) => {
      let donoEncontrado: User | undefined
      let moedaEncontrada: Coin | undefined

      for (const u of Object.values(s.users)) {
        const c = u.coins.find((m) => m.id === coinId)
        if (c) {
          donoEncontrado = u
          moedaEncontrada = c
          break
        }
      }

      if (!moedaEncontrada || !donoEncontrado) {
        return { ok: false, error: `Moeda ${coinId} não encontrada.` } as const
      }

      if (moedaEncontrada.recibo.status === 'Extinto') {
        return { ok: false, error: 'Não é possível bloquear recibo já extinto.' } as const
      }

      if (moedaEncontrada.recibo.status === 'Bloqueado') {
        return { ok: true, data: { coinId, status: 'Bloqueado' as const } } as const
      }

      // Se houver oferta de venda aberta para essa moeda, cancela e remove do mercado
      s.sellOffers = s.sellOffers.filter((o) => o.coinId !== coinId)

      moedaEncontrada.recibo.status = 'Bloqueado'

      return {
        ok: true,
        data: { coinId, status: 'Bloqueado' as const },
      } as const
    })

    return result
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Falha ao bloquear recibo.',
    }
  }
}

/**
 * Desbloqueia o recibo de uma moeda retornando-o ao status 'Ativo' (C-5 / B-5).
 */
export async function desbloquearRecibo(
  coinId: string,
): Promise<ActionResult<{ coinId: string; status: StatusRecibo }>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  // Fecha o furo onde qualquer usuário logado podia desbloquear qualquer recibo pelo console.
  // Ser dono do recibo não basta para desbloquear restrição administrativa.
  if (!temPermissao(await carregarMembro(session), 'usuarios.editar')) {
    return { ok: false, error: 'Ação restrita à equipe do Real Olímpico.' }
  }

  try {
    const { result } = await mutateState((s) => {
      let donoEncontrado: User | undefined
      let moedaEncontrada: Coin | undefined

      for (const u of Object.values(s.users)) {
        const c = u.coins.find((m) => m.id === coinId)
        if (c) {
          donoEncontrado = u
          moedaEncontrada = c
          break
        }
      }

      if (!moedaEncontrada || !donoEncontrado) {
        return { ok: false, error: `Moeda ${coinId} não encontrada.` } as const
      }

      if (moedaEncontrada.recibo.status === 'Extinto') {
        return { ok: false, error: 'Não é possível desbloquear recibo já extinto.' } as const
      }

      moedaEncontrada.recibo.status = 'Ativo'

      return {
        ok: true,
        data: { coinId, status: 'Ativo' as const },
      } as const
    })

    return result
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Falha ao desbloquear recibo.',
    }
  }
}
