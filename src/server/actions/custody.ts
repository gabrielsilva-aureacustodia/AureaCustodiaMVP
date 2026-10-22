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
import { moedaEmReservaAberta } from '@/domain/reserva-de-compra'
import { mkCoin } from '@/domain/seed'
import { ETAPAS_ENVIO } from '@/domain/types'
import type { ActionResult, Coin, Envio, EtapaEnvio, FaturaCustodia, FreteEnvio, StatusRecibo, User } from '@/domain/types'
import { alimentarPlanoNaAnalise } from '@/domain/plano-custodia'
import { cobrarEntradaNoAcervo } from '@/domain/cobranca-de-entrada'
import { carregarRegrasDoMercado } from '@/server/config/carregar'
import { pagarFaturaCustodiaComSaldo } from '@/server/custodia/faturamento'
import {
  normalizarRastreio,
  RASTREIO_INVALIDO,
  rastreioValido,
} from '@/domain/rastreio'
import { desconsiderarEnvio, isEnvioDesconsiderado, prePostagemAtiva } from '@/domain/envios'
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
import { sincronizarAssinaturaCustodia } from '@/server/custodia/assinatura'

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

/** Protocolo desconsiderado após 3 dias sem postagem. */
const PROTOCOLO_EXPIRADO = 'Este protocolo foi desconsiderado após 3 dias sem postagem. Gere um novo protocolo.'

/** Envio com pré-postagem dos Correios: o código não se digita (22/10/2026). */
const TEM_ETIQUETA_OFICIAL =
  'Este envio tem etiqueta oficial dos Correios: a postagem é reconhecida sozinha pelo rastreio, sem digitar código.'

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
 * Carimba a postagem com o código de rastreio REAL — `markPostado` (2153-2163).
 *
 * O CÓDIGO NÃO É MAIS GERADO PELO SISTEMA (21/09/2026). Até esta data a ação
 * gravava `'BR' + Math.random() + 'BR'` e respondia "Código de rastreio
 * gerado" — um número que passava por rastreio de verdade e que, colado no site
 * dos Correios, dá objeto não encontrado. Emitir código válido exige contrato e
 * a API de pré-postagem (CWS), que o projeto não tem.
 *
 * Agora o cliente posta no balcão e digita o código impresso no comprovante. É
 * o mesmo desenho que a RETIRADA sempre teve: `avancarStatusRetirada` exige o
 * código do operador e recusa a postagem sem ele.
 *
 * O formato é conferido aqui, e não só na tela: Server Action é endpoint HTTP.
 */
export async function markPosted(
  protocolo: string,
  codigoRastreio: string,
): Promise<ActionResult> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  const codigo = normalizarRastreio(codigoRastreio ?? '')
  if (!rastreioValido(codigo)) return { ok: false, error: RASTREIO_INVALIDO }

  try {
    const { result } = await mutateState((state) => {
      // A conferência de dono é o acréscimo que justifica a ação estar no
      // servidor: sem ela, qualquer um postaria o envio alheio.
      const envio = state.envios.find(
        (e) => e.protocolo === protocolo && e.userEmail === session,
      )
      if (!envio) return 'nao-encontrado' as const

      // Envio não postado é desconsiderado em até 3 dias. Se o frete foi pago no site e a
      // etiqueta não chegou a sair, ele volta ao saldo aqui, na mesma transação (22/10/2026).
      if (isEnvioDesconsiderado(envio)) {
        const { freteEstornadoCents } = desconsiderarEnvio(state, envio, Date.now())
        return freteEstornadoCents > 0
          ? ({ tipo: 'expirado-com-estorno', valor: freteEstornadoCents } as const)
          : ('expirado' as const)
      }

      // Envio com etiqueta oficial dos Correios não aceita código digitado: o código já é o da
      // pré-postagem, e quem reconhece a postagem é o rastreio do contrato (22/10/2026).
      if (prePostagemAtiva(envio)) return 'tem-etiqueta' as const

      // Reentrância: o botão só aparece antes da postagem, mas um duplo clique
      // (ou um F5 no meio) mandaria a ação duas vezes, e a segunda sobrescreveria
      // o rastreio que o usuário já anotou.
      if (envio.etapaAtual !== 'Protocolo gerado' || envio.dataPostagem !== null) {
        return 'ja-postado' as const
      }

      envio.codigoRastreio = codigo
      envio.dataPostagem = Date.now()
      envio.etapaAtual = 'Envio postado'
      return 'ok' as const
    })

    if (result === 'nao-encontrado') return { ok: false, error: PROTOCOLO_NAO_ENCONTRADO }
    if (result === 'ja-postado') return { ok: false, error: JA_POSTADO }
    if (result === 'expirado') return { ok: false, error: PROTOCOLO_EXPIRADO }
    if (result === 'tem-etiqueta') return { ok: false, error: TEM_ETIQUETA_OFICIAL }
    if (typeof result === 'object') {
      return { ok: false, error: `${PROTOCOLO_EXPIRADO} O frete pago (${brl(result.valor)}) voltou ao seu saldo.` }
    }
    return { ok: true, message: `Envio marcado como postado com o rastreio ${codigo}.` }
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

  const { catalogo, taxas } = await carregarRegrasDoMercado()

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

        // A guarda começa aqui, então a cobrança também. Quem contratou o
        // plano na tela de Envios já pagou pela contratação, e
        // `cobrarEntradaNoAcervo` reconhece isso e não cobra de novo — a função
        // só emite fatura para a moeda que não tem a competência resolvida.
        // Ver src/domain/cobranca-de-entrada.ts.
        cobrarEntradaNoAcervo(state, session, envio.codigosAtivosGerados, { ...taxas }, Date.now())
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
import { correiosConfigurado } from '@/lib/shipping/cws/config'
import {
  cotacaoVencida,
  cotarFreteDoServidor,
  emitirPrePostagemDoEnvio,
  recusaDoEnvioParaFrete,
  SEM_CONTRATO_CORREIOS,
  valorDeclaradoDoEnvio,
} from '@/server/shipping/frete-envio'

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
 * Estimativa de prazo e frete do passo 1, antes de existir protocolo (PAC ou SEDEX).
 *
 * É o serviço de ENTRADA do contrato (logística reversa, cliente → custódia), com o pacote do tamanho
 * da quantidade e o valor declarado de R$ 150,00 por moeda — o mesmo que o frete de verdade vai usar.
 * Devolve `origem`: `'tabela'` é estimativa local, sem contrato neste ambiente, e a tela precisa dizer.
 * Não grava nada: o frete que se paga é o de `cotarFreteDoEnvio`, sobre o protocolo.
 */
export async function cotarFreteEnvio(
  cepOrigem: string,
  modalidade: ModalidadeEnvio,
  quantidade: number = 1,
): Promise<ActionResult<CotacaoFreteResult>> {
  if (modalidade !== 'PAC' && modalidade !== 'SEDEX') return { ok: false, error: MODALIDADE_FRETE_INVALIDA }
  const qtd = Number.isInteger(quantidade) && quantidade >= 1 && quantidade <= QTD_MAX ? quantidade : 1
  try {
    const cotacao = await calcularFreteCorreios({
      cepOrigem,
      cepDestino: ENDERECO_CENTRAL_AUREA.cep,
      modalidade,
      valorDeclaradoCents: valorDeclaradoDoEnvio(qtd),
      sentido: 'entrada',
      quantidade: qtd,
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
 * 4b. Frete do envio pago no site e etiqueta oficial dos Correios (22/10/2026)
 * ------------------------------------------------------------------------- */

/*
 * O cliente paga o frete do envio aqui, pelo preço do contrato e sem margem (decisão do Gabriel), e
 * recebe a etiqueta de logística reversa: posta de graça em qualquer agência, com o código de
 * rastreio que nasceu nos Correios. A regra mora em src/server/shipping/frete-envio.ts; o que estas
 * ações acrescentam é o que toda Server Action precisa conferir de novo — sessão, dono do protocolo,
 * estado do envio — e o dinheiro.
 *
 * O VALOR É SEMPRE DO SERVIDOR. Nenhuma destas ações recebe valor: cotar grava o frete, pagar lê o
 * frete gravado. Cotação com mais de 24 h é refeita antes de cobrar; se o preço mudou, a cobrança
 * não acontece e o cliente vê o valor novo antes de pagar.
 */

const MODALIDADE_FRETE_INVALIDA = 'Modalidade de envio inválida. Escolha PAC ou SEDEX.'

const SEM_ENDERECO_PARA_FRETE = 'Complete o cadastro com o seu endereço para calcular o frete.'

/** O que a tela recebe de uma cotação sobre o protocolo. */
export interface CotacaoFreteDoEnvio {
  modalidade: ModalidadeEnvio
  valorCents: number
  prazoDiasUteis: number
  cotadoEm: number
  /** `'tabela'` = estimativa local, sem contrato: não se paga no site. */
  origem: 'correios' | 'tabela'
}

/** Envio da sessão — `null` se não existe ou é de outra conta (o protocolo alheio é "não encontrado"). */
async function envioDaSessao(
  session: string,
  protocolo: string,
): Promise<{ envio: Envio; dono: User | undefined } | null> {
  const state = await getState()
  const envio = state.envios.find((e) => e.protocolo === protocolo && e.userEmail === session)
  return envio ? { envio, dono: state.users[session] } : null
}

/**
 * Cota o frete do envio (PAC ou SEDEX reverso) e GRAVA a cotação no protocolo, com status `cotado`.
 * É ela que as ações de pagamento cobram. Estimativa local (sem contrato) volta para a tela mas não
 * é gravada: um frete tabelado não pode ficar à espera de ser pago como se fosse o dos Correios.
 */
export async function cotarFreteDoEnvio(
  protocolo: string,
  modalidade: ModalidadeEnvio,
): Promise<ActionResult<CotacaoFreteDoEnvio>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }
  if (modalidade !== 'PAC' && modalidade !== 'SEDEX') return { ok: false, error: MODALIDADE_FRETE_INVALIDA }

  try {
    const achado = await envioDaSessao(session, protocolo)
    if (!achado) return { ok: false, error: PROTOCOLO_NAO_ENCONTRADO }
    const recusa = recusaDoEnvioParaFrete(achado.envio)
    if (recusa) return { ok: false, error: recusa }

    const cep = achado.dono?.cadastro?.endereco?.cep
    if (!cep) return { ok: false, error: SEM_ENDERECO_PARA_FRETE }

    let cot: Awaited<ReturnType<typeof cotarFreteDoServidor>>
    try {
      cot = await cotarFreteDoServidor(achado.envio, cep, modalidade)
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Os Correios não responderam. Tente de novo.' }
    }

    if (cot.origem === 'correios') {
      const { result } = await mutateState((state) => {
        const envio = state.envios.find((e) => e.protocolo === protocolo && e.userEmail === session)
        if (!envio) return PROTOCOLO_NAO_ENCONTRADO
        const r = recusaDoEnvioParaFrete(envio)
        if (r) return r
        envio.frete = cot.frete
        envio.modalidadeEnvio = modalidade
        return null
      })
      if (result) return { ok: false, error: result }
    }

    return {
      ok: true,
      data: {
        modalidade,
        valorCents: cot.frete.valorCents,
        prazoDiasUteis: cot.frete.prazoDiasUteis,
        cotadoEm: cot.frete.cotadoEm,
        origem: cot.origem,
      },
    }
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

/**
 * O frete gravado, pronto para cobrar: contrato configurado, envio da sessão, nada que impeça, e a
 * cotação dentro das 24 h. Vencida, é refeita aqui; se o preço mudou, a nova fica gravada e a
 * cobrança é recusada com o valor novo — cobrar diferente do que a tela mostrou não pode.
 */
async function freteParaCobrar(
  session: string,
  protocolo: string,
): Promise<{ ok: true; frete: FreteEnvio } | { ok: false; error: string }> {
  if (!correiosConfigurado()) return { ok: false, error: SEM_CONTRATO_CORREIOS }

  const achado = await envioDaSessao(session, protocolo)
  if (!achado) return { ok: false, error: PROTOCOLO_NAO_ENCONTRADO }
  const recusa = recusaDoEnvioParaFrete(achado.envio)
  if (recusa) return { ok: false, error: recusa }

  const frete = achado.envio.frete
  if (!frete || frete.status !== 'cotado') return { ok: false, error: 'Calcule o frete antes de pagar.' }
  if (!cotacaoVencida(frete)) return { ok: true, frete }

  const cep = achado.dono?.cadastro?.endereco?.cep
  if (!cep) return { ok: false, error: SEM_ENDERECO_PARA_FRETE }
  let nova: Awaited<ReturnType<typeof cotarFreteDoServidor>>
  try {
    nova = await cotarFreteDoServidor(achado.envio, cep, frete.modalidade)
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Os Correios não responderam. Tente de novo.' }
  }
  if (nova.origem !== 'correios') return { ok: false, error: SEM_CONTRATO_CORREIOS }

  const { result } = await mutateState((state) => {
    const envio = state.envios.find((e) => e.protocolo === protocolo && e.userEmail === session)
    if (!envio) return PROTOCOLO_NAO_ENCONTRADO
    const r = recusaDoEnvioParaFrete(envio)
    if (r) return r
    envio.frete = nova.frete
    return null
  })
  if (result) return { ok: false, error: result }

  if (nova.frete.valorCents !== frete.valorCents) {
    return {
      ok: false,
      error: `A cotação tinha mais de 24 horas e os Correios recalcularam o frete: agora ${brl(nova.frete.valorCents)}. Confira o valor novo e pague de novo.`,
    }
  }
  return { ok: true, frete: nova.frete }
}

/** Texto do resultado da emissão, para a mensagem do pagamento. */
function avisoDaEmissao(emissao: Awaited<ReturnType<typeof emitirPrePostagemDoEnvio>>): string {
  if (emissao.ok) {
    return `Etiqueta dos Correios emitida — rastreio ${emissao.prePostagem.codigoObjeto}. Imprima e poste em qualquer agência: o frete já está pago.`
  }
  return `A etiqueta dos Correios não saiu agora (${emissao.erro}). O frete continua pago: use "Emitir etiqueta" de novo em instantes.`
}

/**
 * Paga o frete com o saldo em conta e, em seguida, emite a etiqueta oficial.
 *
 * A emissão vem DEPOIS da transação do pagamento e não a desfaz se falhar: o dinheiro saiu do saldo
 * para um frete que continua `pago`, e a etiqueta pode ser pedida de novo (`emitirEtiquetaDoEnvio`).
 */
export async function pagarFreteComSaldo(
  protocolo: string,
): Promise<ActionResult<{ codigoRastreio: string | null }>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  try {
    const pronto = await freteParaCobrar(session, protocolo)
    if (!pronto.ok) return { ok: false, error: pronto.error }

    const { result } = await mutateState((state) => {
      const u = state.users[session]
      if (!u) return { ok: false, error: SESSAO_EXPIRADA } as const
      const envio = state.envios.find((e) => e.protocolo === protocolo && e.userEmail === session)
      if (!envio) return { ok: false, error: PROTOCOLO_NAO_ENCONTRADO } as const
      const recusa = recusaDoEnvioParaFrete(envio)
      if (recusa) return { ok: false, error: recusa } as const

      const frete = envio.frete
      // O frete conferido lá fora precisa ser o mesmo que está aqui dentro: outra aba pode ter
      // recotado no meio, e o cliente aprovou o valor que viu.
      if (!frete || frete.status !== 'cotado' || frete.valorCents !== pronto.frete.valorCents) {
        return { ok: false, error: 'O frete mudou desde que você abriu a tela. Confira o valor e pague de novo.' } as const
      }
      if (u.balance < frete.valorCents) {
        return {
          ok: false,
          error: `Saldo insuficiente para o frete (${brl(frete.valorCents)}). Seu saldo atual é ${brl(u.balance)}.`,
        } as const
      }

      // O débito e a transição para 'pago' juntos: é a transição que o ledger lê para lançar o
      // `frete` (derivar.ts), e sem ela o débito viraria um `ajuste` sem explicação.
      u.balance -= frete.valorCents
      envio.frete = { ...frete, status: 'pago', pagoEm: Date.now(), forma: 'saldo', paymentIntentRef: null }
      return { ok: true, valor: frete.valorCents } as const
    })

    if (!result.ok) return { ok: false, error: result.error }

    const emissao = await emitirPrePostagemDoEnvio(protocolo)
    return {
      ok: true,
      message: `Frete de ${brl(result.valor)} pago com saldo. ${avisoDaEmissao(emissao)}`,
      data: { codigoRastreio: emissao.ok ? emissao.prePostagem.codigoObjeto : null },
    }
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

/** Grava no frete a cobrança aberta no gateway — só se ele ainda for o mesmo, ainda não pago. */
async function anotarCobrancaNoFrete(
  session: string,
  protocolo: string,
  valorCents: number,
  externalReference: string,
  forma: 'pix' | 'cartao',
): Promise<void> {
  await mutateState((state) => {
    const envio = state.envios.find((e) => e.protocolo === protocolo && e.userEmail === session)
    const frete = envio?.frete
    if (!envio || !frete || frete.status !== 'cotado' || frete.valorCents !== valorCents) return
    envio.frete = { ...frete, paymentIntentRef: externalReference, forma }
  })
}

/**
 * Abre a cobrança Pix do frete. Quem marca o frete como pago é a conciliação do gateway
 * (`liquidarFreteEnvio`), e é ela que pede a etiqueta depois de liquidar.
 */
export async function iniciarPixFrete(
  protocolo: string,
): Promise<ActionResult<CobrancaPix & { forma: 'pix' }>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  try {
    const pronto = await freteParaCobrar(session, protocolo)
    if (!pronto.ok) return { ok: false, error: pronto.error }
    const { frete } = pronto

    const externalReference = `FRT-${randomUUID()}`
    const agora = Date.now()
    const intencoes = repositorioIntencoes()
    await intencoes.criar({
      externalReference,
      userEmail: session,
      valor: frete.valorCents,
      metodo: 'pix',
      status: 'pendente',
      tipoOperacao: 'frete_envio',
      parcelasMax: 1,
      metadata: { protocolo },
      paymentId: null,
      motivoRecusa: null,
      createdAt: agora,
      updatedAt: agora,
    })

    const pix = await criarCobrancaPix({
      externalReference,
      userEmail: session,
      valorCents: frete.valorCents,
      titulo: `Frete dos Correios — Real Olímpico (${protocolo})`,
      descricao: `Frete ${frete.modalidade} do envio ${protocolo} para a custódia`,
      parcelasMax: 1,
    })
    await intencoes.anotarPagamento(externalReference, pix.paymentId)
    await anotarCobrancaNoFrete(session, protocolo, frete.valorCents, externalReference, 'pix')

    return { ok: true, data: { ...pix, forma: 'pix' } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha ao gerar Pix do frete.' }
  }
}

/** Abre o Checkout Pro do frete (cartão, à vista — frete não se parcela). */
export async function iniciarCartaoFrete(
  protocolo: string,
): Promise<ActionResult<CobrancaCartao & { forma: 'cartao' }>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  try {
    const pronto = await freteParaCobrar(session, protocolo)
    if (!pronto.ok) return { ok: false, error: pronto.error }
    const { frete } = pronto

    const externalReference = `FRT-${randomUUID()}`
    const agora = Date.now()
    await repositorioIntencoes().criar({
      externalReference,
      userEmail: session,
      valor: frete.valorCents,
      metodo: 'checkout_pro',
      status: 'pendente',
      tipoOperacao: 'frete_envio',
      parcelasMax: 1,
      metadata: { protocolo },
      paymentId: null,
      motivoRecusa: null,
      createdAt: agora,
      updatedAt: agora,
    })

    const cartao = await criarCobrancaCartao({
      externalReference,
      userEmail: session,
      valorCents: frete.valorCents,
      titulo: `Frete dos Correios — Real Olímpico (${protocolo})`,
      descricao: `Frete ${frete.modalidade} do envio ${protocolo} para a custódia`,
      parcelasMax: 1,
      voltarPara: { sucesso: '/envios', pendente: '/envios', falha: '/envios' },
    })
    await anotarCobrancaNoFrete(session, protocolo, frete.valorCents, externalReference, 'cartao')

    return { ok: true, data: { ...cartao, forma: 'cartao' } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha ao abrir o pagamento do frete no cartão.' }
  }
}

/**
 * Pede de novo a etiqueta de um frete já pago — para quando os Correios falharam logo depois do
 * pagamento. Idempotente: com a etiqueta já emitida, devolve a mesma.
 */
export async function emitirEtiquetaDoEnvio(
  protocolo: string,
): Promise<ActionResult<{ codigoRastreio: string }>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  try {
    const achado = await envioDaSessao(session, protocolo)
    if (!achado) return { ok: false, error: PROTOCOLO_NAO_ENCONTRADO }

    const emissao = await emitirPrePostagemDoEnvio(protocolo)
    if (!emissao.ok) return { ok: false, error: emissao.erro }
    return {
      ok: true,
      message: `Etiqueta dos Correios emitida — rastreio ${emissao.prePostagem.codigoObjeto}.`,
      data: { codigoRastreio: emissao.prePostagem.codigoObjeto },
    }
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
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

      // MOEDA EM RESERVA ABERTA NÃO SAI PARA RETIRADA (28/09/2026, achado do
      // Gabriel na mesma família do buraco da RO-000101). Uma oferta pós-paga
      // que casou tira a moeda de `sellOffers` — ela some do mercado, mas
      // continua prometida a um comprador que pode pagar a qualquer segundo
      // dentro dos dez minutos. Sem esta trava, o dono podia pedir a retirada
      // física dessa mesma moeda nesse intervalo: se o comprador pagasse
      // depois, a transferência encontraria uma moeda que já tinha saído do
      // Real Olímpico pelos Correios.
      if (moedaEmReservaAberta(state, coinId)) {
        return {
          ok: false,
          error: 'Esta moeda está reservada para um comprador que pode confirmar o pagamento a qualquer momento. Aguarde a reserva vencer ou ser paga antes de solicitar a retirada.',
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

    void sincronizarAssinaturaCustodia(session)

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
 * Exige a permissão `logistica.expedir` para avançar a expedição; o próprio dono só pode cancelar.
 * (Até 14/10/2026 a conferência era `ehAdmin()`, a lista binária anterior aos papéis.)
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

  const admin = temPermissao(await carregarMembro(session), 'logistica.expedir')
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
