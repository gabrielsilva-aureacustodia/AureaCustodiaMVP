'use server'

/**
 * Server Actions do painel para a EXPEDIÇÃO da retirada física: emitir e cancelar a etiqueta oficial
 * dos Correios e, sem contrato, marcar a postagem feita no balcão.
 *
 * 22/10/2026 — contrato com os Correios. Até aqui a retirada dependia de o operador postar no balcão e
 * digitar o código, e nenhuma tela do painel fazia isso: `avancarStatusRetirada` (custody.ts) existia,
 * mas nenhum botão a chamava, e a retirada paga ficava parada em "Paga" até alguém mexer no banco.
 * Agora o painel pede a pré-postagem de SAÍDA à API dos Correios; o código de rastreio nasce lá, o
 * frete vai para a fatura do contrato e a etiqueta sai em PDF pela rota `/api/retiradas/etiqueta/[id]`.
 *
 * AS TRÊS REGRAS DESTE ARQUIVO
 *  1. Cada ação confere `logistica.expedir` por conta própria, antes de qualquer outra coisa — esconder
 *     o botão não protege nada, todo export daqui é um endpoint HTTP.
 *  2. A chamada aos Correios fica FORA de qualquer transação. Ela leva segundos e pode falhar; segurar
 *     o banco (ou o `mutateState`) esperando a API travaria o resto do site. O preço disso é uma
 *     janela entre "os Correios criaram" e "nós gravamos": se dois operadores clicarem juntos, o segundo
 *     encontra a etiqueta do primeiro gravada e CANCELA a sua nos Correios, em vez de deixar uma
 *     pré-postagem órfã na fatura do contrato.
 *  3. Emitir a etiqueta leva a retirada só até `separacao`. Quem marca `postada` é o rastreio, quando a
 *     agência registra o objeto (acordo 2 de docs/EXECUCAO_CORREIOS_CWS.md).
 *
 * A retirada vive no repositório (`aurea.retiradas` ou memória) e, sem Postgres, também em
 * `state.retiradas` — custody.ts mantém os dois, e este arquivo também, senão a tela do cliente e o
 * painel passariam a contar histórias diferentes.
 *
 * Toda ação grava `admin.logistica.<verbo>` em `audit_log`: `emitir_etiqueta`, `cancelar_etiqueta`,
 * `postar_manual`. Como em saques.ts, a trilha é gravada depois da ação e não a desfaz se falhar — a
 * etiqueta já existe nos Correios.
 */

import type { ChavePermissao, MembroAdmin } from '@/domain/admin/permissoes'
import { medianSellPrice } from '@/domain/market'
import { normalizarRastreio, RASTREIO_INVALIDO, rastreioValido } from '@/domain/rastreio'
import {
  etiquetaAtivaDaRetirada,
  registrarEtiquetaNaRetirada,
  removerEtiquetaDaRetirada,
  STATUS_QUE_ACEITAM_ETIQUETA,
  transicionarRetirada,
} from '@/domain/retirada'
import type { ActionResult, AppState, Cents, ModalidadeRetirada, PrePostagemRegistro, Retirada } from '@/domain/types'
import { RAZAO_SOCIAL_POSTAL, ENDERECO_CENTRAL_AUREA } from '@/lib/shipping/endereco-central'
import {
  cancelarPrePostagem,
  correiosConfigurado,
  criarPrePostagem,
  ErroCorreios,
  SERVICOS_CORREIOS,
  type CriarPrePostagemInput,
  type PessoaPostal,
} from '@/lib/shipping/cws'
import { DESCRICAO_CONTEUDO_PADRAO, dimensoesParaMoedas, type ModalidadeEnvio } from '@/lib/shipping/types'
import { permissaoParaAcao } from '@/server/admin/acesso'
import { registrarAcaoAdmin } from '@/server/admin/auditar'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { repositorioRetiradas } from '@/server/shipping/retiradas'
import { atualizarRastreiosPendentes } from '@/server/shipping/rastreios'
import { getState, mutateState } from '@/server/state'

const FALHA = 'Falha ao salvar dados. Tente novamente.'

/**
 * Valor declarado quando o tipo da moeda não tem mediana de mercado (nenhuma oferta nem negociação).
 * É o seguro do objeto: declarar zero deixaria a moeda viajar sem cobertura.
 */
const VALOR_DECLARADO_PADRAO_CENTS: Cents = 15000

/**
 * Modalidade da retirada → serviço dos Correios. A "segura" é o SEDEX com aviso de recebimento: é a
 * que o cliente pagou mais caro para ter prazo menor e a assinatura de quem recebeu.
 */
const SERVICO_DA_MODALIDADE: Record<ModalidadeRetirada, { modalidade: ModalidadeEnvio; avisoRecebimento: boolean }> = {
  comum: { modalidade: 'PAC', avisoRecebimento: false },
  segura: { modalidade: 'SEDEX', avisoRecebimento: true },
}

/**
 * O remetente da saída é a empresa, na caixa postal. Vai a RAZÃO SOCIAL e o CNPJ, nunca a marca: é o
 * nome do contrato e da caixa postal, e a pré-postagem confere o remetente com o cadastro do cartão.
 * Bairro "Comiteco" é o que a base dos Correios devolve para o CEP 30315-970.
 */
const REMETENTE_AUREA: PessoaPostal = {
  nome: RAZAO_SOCIAL_POSTAL,
  cpfCnpj: '68071452000106',
  email: ENDERECO_CENTRAL_AUREA.email,
  endereco: {
    cep: '30315970',
    logradouro: 'Caixa Postal 7990',
    numero: 'S/N',
    bairro: 'Comiteco',
    cidade: 'Belo Horizonte',
    uf: 'MG',
  },
}

/* ---------------------------------------------------------------------------
 * Infraestrutura comum
 * ------------------------------------------------------------------------- */

async function auditar(
  membro: MembroAdmin,
  verbo: string,
  retirada: Retirada | null,
  retiradaId: string,
  detalhes: Record<string, unknown>,
): Promise<void> {
  if (!bancoConfigurado()) return
  try {
    await executarNoBanco((tx) =>
      registrarAcaoAdmin(tx, {
        ator: membro.email,
        area: 'logistica',
        verbo,
        entidade: 'retirada',
        entidadeId: retiradaId,
        usuariosAfetados: retirada ? [retirada.userEmail] : [],
        detalhes,
      }),
    )
  } catch (err) {
    // A trilha é consequência da ação, não condição: a etiqueta já existe (ou já sumiu) nos Correios.
    console.error('[admin] falha ao gravar a trilha da logística:', err)
  }
}

async function comPermissao<T>(chave: ChavePermissao, acao: (membro: MembroAdmin) => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  const acesso = await permissaoParaAcao(chave)
  if (!acesso.ok) return { ok: false, error: acesso.erro }
  try {
    return await acao(acesso.membro)
  } catch (err) {
    console.error(`[admin] falha na ação de logística que pede ${chave}:`, err)
    return { ok: false, error: FALHA }
  }
}

function texto(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

/** A mensagem dos Correios ("ERP-054: …") é o que diz ao operador o que corrigir — não se esconde. */
function mensagemDosCorreios(err: unknown): string {
  if (err instanceof ErroCorreios) {
    const detalhe = err.mensagens.length ? err.mensagens.join(' · ') : err.message
    return `Os Correios recusaram: ${detalhe}`
  }
  return 'Os Correios não responderam. Tente de novo em instantes.'
}

/**
 * Grava a retirada nos dois lugares em que ela vive: o repositório (fonte do painel e da tela do
 * cliente) e, sem Postgres, `state.retiradas` (fonte do mercado — `moedaComRetiradaEmAndamento`).
 */
async function gravarRetirada(r: Retirada): Promise<void> {
  await repositorioRetiradas().atualizar(r)
  await mutateState((s) => {
    const idx = (s.retiradas ?? []).findIndex((x) => x.id === r.id)
    if (idx >= 0 && s.retiradas) s.retiradas[idx] = r
  })
}

/**
 * O valor declarado é a mediana de 24 h do tipo da moeda — o mesmo número que o recibo usa como
 * valor estimado. Sem mercado para o tipo, R$ 150,00.
 */
function valorDeclaradoDaRetirada(state: AppState, retirada: Retirada): Cents {
  const dono = state.users[retirada.userEmail]
  const coin =
    dono?.coins.find((c) => c.id === retirada.coinId) ??
    Object.values(state.users)
      .flatMap((u) => u.coins)
      .find((c) => c.id === retirada.coinId)
  const mediana = coin ? medianSellPrice(state, coin.tipoMoeda) : null
  return mediana && mediana > 0 ? mediana : VALOR_DECLARADO_PADRAO_CENTS
}

/**
 * Corpo da pré-postagem de saída. Não é exportado: num arquivo 'use server' todo export vira endpoint.
 * Os testes conferem remetente, serviço e valor pelo que chega ao dublê de `criarPrePostagem`.
 */
function pedidoDePrePostagemDaRetirada(retirada: Retirada, valorDeclaradoCents: Cents): CriarPrePostagemInput {
  const { modalidade, avisoRecebimento } = SERVICO_DA_MODALIDADE[retirada.modalidade]
  const e = retirada.endereco
  return {
    codigoServico: SERVICOS_CORREIOS.saida[modalidade],
    modalidade,
    logisticaReversa: false,
    avisoRecebimento,
    remetente: REMETENTE_AUREA,
    destinatario: {
      nome: e.nome,
      cpfCnpj: e.cpfOuCnpj,
      telefone: e.telefone,
      endereco: {
        cep: e.cep,
        logradouro: e.logradouro,
        numero: e.numero,
        complemento: e.complemento,
        bairro: e.bairro,
        cidade: e.cidade,
        uf: e.uf,
      },
    },
    dimensoes: dimensoesParaMoedas(1),
    valorDeclaradoCents,
    itens: [{ conteudo: DESCRICAO_CONTEUDO_PADRAO, quantidade: 1, valorUnitarioCents: valorDeclaradoCents }],
    observacao: retirada.id,
  }
}

/* ---------------------------------------------------------------------------
 * Ações
 * ------------------------------------------------------------------------- */

/**
 * Emite a etiqueta oficial dos Correios (pré-postagem de saída) para uma retirada paga ou em
 * separação, grava o código de rastreio e leva `paga` → `separacao`.
 */
export async function emitirEtiquetaRetirada(retiradaId: string): Promise<ActionResult<{ codigoObjeto: string }>> {
  return comPermissao('logistica.expedir', async (membro) => {
    const id = texto(retiradaId)
    if (!id) return { ok: false, error: 'Retirada não informada.' }
    if (!correiosConfigurado()) {
      return { ok: false, error: 'O contrato dos Correios não está configurado neste ambiente. Poste no balcão e informe o código.' }
    }

    const repo = repositorioRetiradas()
    const retirada = await repo.buscarPorId(id)
    if (!retirada) return { ok: false, error: 'Solicitação de retirada não encontrada.' }
    if (!STATUS_QUE_ACEITAM_ETIQUETA.includes(retirada.status)) {
      return { ok: false, error: `A etiqueta só é emitida para retirada paga ou em separação. Situação atual: "${retirada.status}".` }
    }
    const jaEmitida = etiquetaAtivaDaRetirada(retirada)
    if (jaEmitida) {
      return { ok: false, error: `Esta retirada já tem etiqueta emitida (${jaEmitida.codigoObjeto}). Cancele-a antes de emitir outra.` }
    }

    const valorDeclarado = valorDeclaradoDaRetirada(await getState(), retirada)
    const pedido = pedidoDePrePostagemDaRetirada(retirada, valorDeclarado)

    // Fora de transação, de propósito (regra 2 do topo).
    let criada: Awaited<ReturnType<typeof criarPrePostagem>>
    try {
      criada = await criarPrePostagem(pedido)
    } catch (err) {
      const erro = mensagemDosCorreios(err)
      console.error('[admin] pré-postagem da retirada recusada:', err)
      await auditar(membro, 'emitir_etiqueta', retirada, id, { ok: false, erro, codigoServico: pedido.codigoServico })
      return { ok: false, error: erro }
    }

    const agora = Date.now()
    const registro: PrePostagemRegistro = {
      id: criada.id,
      codigoObjeto: criada.codigoObjeto,
      codigoServico: pedido.codigoServico,
      criadaEm: agora,
      prazoPostagem: criada.prazoPostagem,
      canceladaEm: null,
    }

    // Relê: outro operador pode ter emitido enquanto esperávamos a API (regra 2).
    const atual = await repo.buscarPorId(id)
    let atualizada: Retirada
    try {
      if (!atual) throw new Error('Solicitação de retirada não encontrada.')
      atualizada = registrarEtiquetaNaRetirada(atual, registro, { data: agora, autor: membro.email })
    } catch (err) {
      await cancelarPrePostagem(criada.id).catch((e: unknown) =>
        console.error(`[admin] pré-postagem ${criada.id} ficou órfã nos Correios — cancele pelo portal:`, e),
      )
      return { ok: false, error: err instanceof Error ? err.message : FALHA }
    }

    await gravarRetirada(atualizada)
    await auditar(membro, 'emitir_etiqueta', atualizada, id, {
      ok: true,
      prePostagem: criada.id,
      codigoObjeto: criada.codigoObjeto,
      codigoServico: pedido.codigoServico,
      valorDeclaradoCents: valorDeclarado,
      de: retirada.status,
      para: atualizada.status,
    })
    return {
      ok: true,
      message: `Etiqueta emitida: ${criada.codigoObjeto}. Imprima, embale e poste — o rastreio marca a postagem sozinho.`,
      data: { codigoObjeto: criada.codigoObjeto },
    }
  })
}

/**
 * Cancela a etiqueta nos Correios e a tira da retirada. A retirada fica em `separacao`, pronta para
 * uma etiqueta nova (endereço corrigido, modalidade trocada, pacote refeito).
 */
export async function cancelarEtiquetaRetirada(retiradaId: string): Promise<ActionResult> {
  return comPermissao('logistica.expedir', async (membro) => {
    const id = texto(retiradaId)
    if (!id) return { ok: false, error: 'Retirada não informada.' }

    const repo = repositorioRetiradas()
    const retirada = await repo.buscarPorId(id)
    if (!retirada) return { ok: false, error: 'Solicitação de retirada não encontrada.' }
    const ativa = etiquetaAtivaDaRetirada(retirada)
    if (!ativa) return { ok: false, error: 'Esta retirada não tem etiqueta dos Correios emitida.' }
    if (!STATUS_QUE_ACEITAM_ETIQUETA.includes(retirada.status)) {
      return { ok: false, error: `A etiqueta não pode mais ser cancelada: a retirada está "${retirada.status}".` }
    }

    // Primeiro nos Correios: se lá falhar, a etiqueta continua valendo e a nossa ficha não pode dizer
    // o contrário — senão o objeto seria postado com um código que a tela já esqueceu.
    try {
      await cancelarPrePostagem(ativa.id)
    } catch (err) {
      const erro = mensagemDosCorreios(err)
      console.error('[admin] cancelamento da pré-postagem recusado:', err)
      await auditar(membro, 'cancelar_etiqueta', retirada, id, { ok: false, erro, prePostagem: ativa.id })
      return { ok: false, error: erro }
    }

    const atual = (await repo.buscarPorId(id)) ?? retirada
    if (etiquetaAtivaDaRetirada(atual)?.id !== ativa.id) {
      // Outra mão já mexeu na etiqueta enquanto os Correios respondiam — não sobrescreve.
      return { ok: false, error: 'A etiqueta desta retirada mudou enquanto o cancelamento corria. Recarregue a página.' }
    }
    const atualizada = removerEtiquetaDaRetirada(atual, { data: Date.now(), autor: membro.email })
    await gravarRetirada(atualizada)
    await auditar(membro, 'cancelar_etiqueta', atualizada, id, { ok: true, prePostagem: ativa.id, codigoObjeto: ativa.codigoObjeto })
    return { ok: true, message: `Etiqueta ${ativa.codigoObjeto} cancelada nos Correios.` }
  })
}

/**
 * Sem contrato (ou com a API fora do ar): o operador postou no balcão e informa o código. Usa a
 * máquina de estados de sempre — `paga` passa por `separacao` e chega a `postada`.
 */
export async function marcarRetiradaPostadaManual(retiradaId: string, codigo: string): Promise<ActionResult> {
  return comPermissao('logistica.expedir', async (membro) => {
    const id = texto(retiradaId)
    if (!id) return { ok: false, error: 'Retirada não informada.' }
    const rastreio = normalizarRastreio(texto(codigo))
    if (!rastreioValido(rastreio)) return { ok: false, error: RASTREIO_INVALIDO }

    const repo = repositorioRetiradas()
    const retirada = await repo.buscarPorId(id)
    if (!retirada) return { ok: false, error: 'Solicitação de retirada não encontrada.' }
    if (!STATUS_QUE_ACEITAM_ETIQUETA.includes(retirada.status)) {
      return { ok: false, error: `Só retirada paga ou em separação pode ser marcada como postada. Situação atual: "${retirada.status}".` }
    }
    const ativa = etiquetaAtivaDaRetirada(retirada)
    if (ativa) {
      // Dois códigos para a mesma moeda: o rastreio seguiria um e a caixa iria com o outro.
      return { ok: false, error: `Esta retirada tem etiqueta dos Correios emitida (${ativa.codigoObjeto}). Cancele-a antes de informar outro código.` }
    }

    const agora = Date.now()
    const motivo = `Postada no balcão; código informado pelo painel (${rastreio})`
    let atualizada: Retirada
    try {
      const separada =
        retirada.status === 'paga'
          ? transicionarRetirada(retirada, 'separacao', { data: agora, motivo: 'Separada para postagem no balcão', autor: membro.email })
          : retirada
      atualizada = { ...transicionarRetirada(separada, 'postada', { data: agora, motivo, autor: membro.email, codigoRastreio: rastreio }), updatedAt: agora }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : FALHA }
    }

    await gravarRetirada(atualizada)
    await auditar(membro, 'postar_manual', atualizada, id, { codigoRastreio: rastreio, de: retirada.status, para: 'postada' })
    return { ok: true, message: `Retirada ${id} marcada como postada (${rastreio}).` }
  })
}

/**
 * "Atualizar rastreio agora" (27/10/2026): roda na hora a mesma rodada do job diário das 06:00.
 *
 * O job é diário por limite do plano Hobby da Vercel, e o envio do Sidnei postado às 10:40 de 27/10 só
 * apareceria como "Envio postado" no dia seguinte. O botão não tem regra própria: chama
 * `atualizarRastreiosPendentes` (src/server/shipping/rastreios.ts), que consulta os Correios, grava o
 * retrato e avança envio e retirada exatamente como o job. Pede `logistica.expedir` — avançar envio e
 * retirada é o que essa permissão já permite — e grava `admin.logistica.atualizar_rastreio`, só com as
 * contagens (nenhum código de rastreio na trilha, como na resposta do job).
 */
export async function atualizarRastreiosAgora(): Promise<
  ActionResult<{ verificados: number; enviosPostados: number; retiradasPostadas: number; retiradasEntregues: number }>
> {
  return comPermissao('logistica.expedir', async (membro) => {
    const r = await atualizarRastreiosPendentes()
    const resumo = {
      verificados: r.verificados + r.retiradasVerificadas,
      enviosPostados: r.enviosPostados,
      retiradasPostadas: r.retiradasPostadas,
      retiradasEntregues: r.retiradasEntregues,
    }
    if (bancoConfigurado()) {
      try {
        await executarNoBanco((tx) =>
          registrarAcaoAdmin(tx, {
            ator: membro.email,
            area: 'logistica',
            verbo: 'atualizar_rastreio',
            detalhes: { ...resumo, gravados: r.gravados + r.retiradasGravadas, retratosPreservados: r.retratosPreservados },
          }),
        )
      } catch (err) {
        // A trilha é consequência da ação: o rastreio já foi gravado.
        console.error('[admin] falha ao gravar a trilha da atualização de rastreio:', err)
      }
    }
    const avancos = [
      resumo.enviosPostados ? `${resumo.enviosPostados} envio(s) passaram a postado` : '',
      resumo.retiradasPostadas ? `${resumo.retiradasPostadas} retirada(s) passaram a postada` : '',
      resumo.retiradasEntregues ? `${resumo.retiradasEntregues} retirada(s) entregue(s)` : '',
    ].filter(Boolean)
    return {
      ok: true,
      data: resumo,
      message:
        resumo.verificados === 0
          ? 'Nenhum objeto em trânsito para consultar nos Correios.'
          : `Rastreio atualizado: ${resumo.verificados} objeto(s) consultado(s) nos Correios${avancos.length ? `; ${avancos.join(', ')}` : ', sem mudança de etapa'}.`,
    }
  })
}
