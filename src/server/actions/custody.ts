'use server'

/**
 * Custódia — port de aurea-mvp-teste.html: `generateProtocol` (2114-2127),
 * `markPostado` (2153-2163) e `advanceAnalysis` (2202-2230).
 *
 * POR QUE ESTAS TRÊS FUNÇÕES PRECISAVAM SAIR DO NAVEGADOR
 * ------------------------------------------------------
 * No monolito elas eram as mais perigosas do arquivo, e não por acaso: são as
 * únicas que CRIAM valor do nada. `advanceAnalysis` emite moedas com recibo NFT
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
import { COIN, COIN_TYPES } from '@/domain/constants'
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
 *   1. as moedas são criadas com recibo NFT e amarradas ao protocolo;
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
        // Só a moeda-referência tem mercado; para ela o valor estimado sai da
        // mediana das ofertas abertas. Os outros tipos não têm cotação nenhuma,
        // então recebem um valor fictício da mesma faixa usada pelo seed.
        const isBandeira = envio.tipoMoeda === COIN.name
        const med = medianSellPrice(state)

        for (let i = 0; i < envio.quantidade; i++) {
          const baseVal = isBandeira && med ? med : 14000 + Math.floor(Math.random() * 22000)
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
