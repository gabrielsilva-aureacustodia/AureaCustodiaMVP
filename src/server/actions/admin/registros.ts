'use server'

/**
 * Server Actions de gestão de registros pelo painel: ofertas do mercado,
 * envios e planos de custódia.
 *
 * POR QUE ESTE ARQUIVO EXISTE (23/09/2026)
 * ----------------------------------------
 * Até aqui, apagar uma oferta publicada por engano ou um envio que o cliente
 * desistiu de fazer exigia escrever um script `.cjs` e rodá-lo contra o banco
 * de produção. Aconteceu três vezes em três dias. O Gabriel pediu que virasse
 * função do Admin, e listou as razões que recorrem: pedido de cliente, erro de
 * sistema e teste de função.
 *
 * A REGRA DESTA PASTA vale aqui como em toda ela: cada ação confere a permissão
 * POR CONTA PRÓPRIA e grava a trilha em `audit_log`. Esconder o botão não é
 * controle de acesso.
 *
 * `registros.editar` e `registros.excluir` são separadas: corrigir o preço de
 * um anúncio é rotina de atendimento; apagar o registro é irreversível e tem
 * outra gravidade.
 *
 * O QUE ESTE ARQUIVO SE RECUSA A FAZER
 * ------------------------------------
 * Apagar envio que já virou acervo. Se há moeda ou análise apontando para o
 * protocolo, a exclusão para com mensagem explicando — apagar o envio deixaria
 * a moeda órfã de origem e o laudo apontando para um protocolo inexistente, e
 * a corrente de hashes guarda `protocoloEnvio` no cálculo. Esvaziar o acervo
 * primeiro é decisão de quem opera, não efeito colateral de um clique.
 */

import type { ChavePermissao, MembroAdmin } from '@/domain/admin/permissoes'
import type { ActionResult, Cents } from '@/domain/types'
import { permissaoParaAcao } from '@/server/admin/acesso'
import { registrarAcaoAdmin } from '@/server/admin/auditar'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { mutateState } from '@/server/state'

/**
 * Grava a trilha do painel.
 *
 * `registrarAcaoAdmin` escreve dentro de uma transação de banco, então sem
 * `POSTGRES_URL` não há onde gravar — e a ação não pode falhar por isso: em
 * desenvolvimento sem banco o painel continua funcionando, só sem trilha. É o
 * mesmo arranjo que a bancada usa.
 */
async function auditar(
  membro: MembroAdmin,
  verbo: string,
  entidadeId: string,
  detalhes: Record<string, unknown>,
): Promise<void> {
  if (!bancoConfigurado()) return
  await executarNoBanco((tx) =>
    registrarAcaoAdmin(tx, {
      ator: membro.email,
      area: 'registros',
      verbo,
      entidade: 'registro',
      entidadeId,
      detalhes,
    }),
  )
}

const FALHA = 'Falha ao salvar dados. Tente novamente.'

async function comPermissao<T>(
  chave: ChavePermissao,
  acao: (membro: MembroAdmin) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  const acesso = await permissaoParaAcao(chave)
  if (!acesso.ok) return { ok: false, error: acesso.erro }
  try {
    return await acao(acesso.membro)
  } catch (err) {
    console.error(`[admin] falha na ação de registros que pede ${chave}:`, err)
    return { ok: false, error: FALHA }
  }
}

function texto(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function inteiro(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : 0
}

/* ------------------------------------------------------------------ *
 * Ofertas do mercado                                                  *
 * ------------------------------------------------------------------ */

/**
 * Remove do livro um ANÚNCIO inteiro de venda. As moedas continuam com o dono.
 *
 * Trabalha por `lotId` e não por oferta porque é assim que o anúncio existe
 * para quem publicou e para quem olha o painel: uma linha com N moedas. O livro
 * guarda uma oferta por moeda (`SellOffer`), mas apagar só uma delas deixaria
 * um anúncio pela metade, que ninguém pediu.
 */
export async function excluirLoteDeVenda(lotId: string): Promise<ActionResult> {
  return comPermissao('registros.excluir', async (membro) => {
    const id = texto(lotId)
    if (!id) return { ok: false, error: 'Anúncio não informado.' }

    const { result } = await mutateState<ActionResult>((s) => {
      const doLote = s.sellOffers.filter((x) => x.lotId === id)
      if (!doLote.length) return { ok: false, error: 'Anúncio não encontrado no livro.' }
      s.sellOffers = s.sellOffers.filter((x) => x.lotId !== id)
      return {
        ok: true,
        message: `Anúncio removido: ${doLote.length} ${doLote[0].tipoMoeda}.`,
        data: { seller: doLote[0].seller, moedas: doLote.length },
      }
    })

    if (result.ok) {
      await auditar(membro, 'excluir_lote_venda', id, { ...(result.data ?? {}) })
    }
    return result
  })
}

/** Remove uma oferta de COMPRA (bid) do livro. */
export async function excluirOrdemDeCompra(bidId: string): Promise<ActionResult> {
  return comPermissao('registros.excluir', async (membro) => {
    const id = texto(bidId)
    if (!id) return { ok: false, error: 'Ordem não informada.' }

    const { result } = await mutateState<ActionResult>((s) => {
      const b = s.buyOrders.find((x) => x.id === id)
      if (!b) return { ok: false, error: 'Ordem de compra não encontrada.' }
      s.buyOrders = s.buyOrders.filter((x) => x.id !== id)
      return {
        ok: true,
        message: `Ordem de compra de ${b.tipoMoeda} removida do livro.`,
        data: { buyer: b.buyer },
      }
    })

    if (result.ok) {
      await auditar(membro, 'excluir_ordem_compra', id, { ...(result.data ?? {}) })
    }
    return result
  })
}

/**
 * Corrige o preço de um anúncio de venda inteiro.
 *
 * O anúncio PERDE A VEZ na fila quando o preço muda, exatamente como acontece
 * quando o próprio cliente edita (decisão F-3): quem muda o preço entra de novo
 * na fila daquele preço. Se a correção do painel não rebaixasse, o atendimento
 * viraria um jeito de furar fila.
 */
export async function editarLoteDeVenda(lotId: string, precoCents: Cents): Promise<ActionResult> {
  return comPermissao('registros.editar', async (membro) => {
    const id = texto(lotId)
    const preco = inteiro(precoCents)
    if (!id) return { ok: false, error: 'Anúncio não informado.' }
    if (preco <= 0) return { ok: false, error: 'Informe um preço válido.' }

    const { result } = await mutateState<ActionResult>((s) => {
      const doLote = s.sellOffers.filter((x) => x.lotId === id)
      if (!doLote.length) return { ok: false, error: 'Anúncio não encontrado no livro.' }

      const precoAntes = doLote[0].price
      if (preco !== precoAntes) {
        const agora = Date.now()
        for (const o of doLote) {
          o.price = preco
          o.prioridadeEm = agora
        }
      }
      return {
        ok: true,
        message: `Anúncio atualizado: ${doLote.length} moeda(s) a ${preco / 100}.`,
        data: { precoAntes, seller: doLote[0].seller, moedas: doLote.length },
      }
    })

    if (result.ok) {
      await auditar(membro, 'editar_lote_venda', id, { precoDepois: preco, ...(result.data ?? {}) })
    }
    return result
  })
}

/* ------------------------------------------------------------------ *
 * Envios                                                              *
 * ------------------------------------------------------------------ */

/**
 * Apaga um envio, e SÓ se ele não tiver virado acervo.
 *
 * A recusa não é zelo excessivo: `protocoloEnvio` entra na fórmula do hash da
 * análise (`CAMPOS_DA_ANALISE`). Apagar o envio de uma moeda já analisada
 * deixaria o laudo apontando para um protocolo que não existe, sem quebrar a
 * corrente — ou seja, um furo que a auditoria não pegaria.
 */
export async function excluirEnvio(protocolo: string): Promise<ActionResult> {
  return comPermissao('registros.excluir', async (membro) => {
    const p = texto(protocolo)
    if (!p) return { ok: false, error: 'Protocolo não informado.' }

    const { result } = await mutateState<ActionResult>((s) => {
      const envio = s.envios.find((e) => e.protocolo === p)
      if (!envio) return { ok: false, error: 'Envio não encontrado.' }

      const moedas = Object.values(s.users).flatMap((u) => u.coins.filter((c) => c.protocolo === p))
      const analises = (s.analises ?? []).filter((a) => a.protocoloEnvio === p)
      if (moedas.length || analises.length) {
        return {
          ok: false,
          error:
            `Este envio já virou acervo: ${moedas.length} moeda(s) e ${analises.length} laudo(s) ` +
            'apontam para ele. Remova o acervo primeiro — apagar agora deixaria o laudo sem origem.',
        }
      }

      const dono = envio.userEmail
      s.envios = s.envios.filter((e) => e.protocolo !== p)
      // Plano contratado para este envio some junto: sem envio, ele cobra o quê?
      const planos = (s.planosCustodia ?? []).filter((x) => x.protocoloEnvio === p)
      if (planos.length) {
        const ids = new Set(planos.map((x) => x.id))
        s.faturasCustodia = (s.faturasCustodia ?? []).filter(
          (f) => !f.planoId || !ids.has(f.planoId) || f.status === 'paga',
        )
        s.planosCustodia = (s.planosCustodia ?? []).filter((x) => !ids.has(x.id))
      }

      return {
        ok: true,
        message: `Envio ${p} removido.`,
        data: { dono, planosRemovidos: planos.length },
      }
    })

    if (result.ok) {
      await auditar(membro, 'excluir_envio', p, { ...(result.data ?? {}) })
    }
    return result
  })
}

/** Corrige a quantidade declarada de um envio ainda não analisado. */
export async function editarEnvio(protocolo: string, quantidade: number): Promise<ActionResult> {
  return comPermissao('registros.editar', async (membro) => {
    const p = texto(protocolo)
    const qtd = inteiro(quantidade)
    if (!p) return { ok: false, error: 'Protocolo não informado.' }
    if (qtd <= 0) return { ok: false, error: 'A quantidade precisa ser pelo menos 1.' }

    const { result } = await mutateState<ActionResult>((s) => {
      const envio = s.envios.find((e) => e.protocolo === p)
      if (!envio) return { ok: false, error: 'Envio não encontrado.' }

      const analises = (s.analises ?? []).filter((a) => a.protocoloEnvio === p)
      if (analises.length) {
        return {
          ok: false,
          error: 'Envio já analisado: a quantidade declarada não pode mais mudar.',
        }
      }

      const antes = envio.quantidade
      envio.quantidade = qtd
      return { ok: true, message: `Envio ${p}: ${antes} → ${qtd} moeda(s).`, data: { antes } }
    })

    if (result.ok) {
      await auditar(membro, 'editar_envio', p, { quantidadeDepois: qtd, ...(result.data ?? {}) })
    }
    return result
  })
}

/* ------------------------------------------------------------------ *
 * Planos de custódia                                                  *
 * ------------------------------------------------------------------ */

/**
 * Apaga um plano de custódia e as faturas dele que ainda não foram pagas.
 *
 * Fatura PAGA não é apagada, nunca: dinheiro que entrou tem de continuar
 * aparecendo no livro-razão. Se o plano precisa sumir e há fatura paga, o
 * caminho é estorno, que é outra operação e outra decisão.
 */
export async function excluirPlanoCustodia(planoId: string): Promise<ActionResult> {
  return comPermissao('registros.excluir', async (membro) => {
    const id = texto(planoId)
    if (!id) return { ok: false, error: 'Plano não informado.' }

    const { result } = await mutateState<ActionResult>((s) => {
      const plano = (s.planosCustodia ?? []).find((p) => p.id === id)
      if (!plano) return { ok: false, error: 'Plano de custódia não encontrado.' }

      const pagas = (s.faturasCustodia ?? []).filter((f) => f.planoId === id && f.status === 'paga')
      if (pagas.length) {
        return {
          ok: false,
          error:
            `Este plano tem ${pagas.length} fatura(s) já paga(s). Apagá-lo apagaria dinheiro que ` +
            'entrou de verdade — o caminho aqui é estorno, não exclusão.',
        }
      }

      s.faturasCustodia = (s.faturasCustodia ?? []).filter((f) => f.planoId !== id)
      s.planosCustodia = (s.planosCustodia ?? []).filter((p) => p.id !== id)
      return { ok: true, message: `Plano ${id} removido.`, data: { dono: plano.userEmail } }
    })

    if (result.ok) {
      await auditar(membro, 'excluir_plano', id, { ...(result.data ?? {}) })
    }
    return result
  })
}

/**
 * Cancela um plano de custódia sem apagá-lo.
 *
 * É a operação que o atendimento quer na maior parte das vezes: o cliente
 * desistiu, a cobrança para, e o registro continua lá para explicar o que
 * houve. Exclusão é para erro de sistema e teste; cancelamento é para a vida
 * real.
 */
export async function cancelarPlanoCustodia(planoId: string): Promise<ActionResult> {
  return comPermissao('registros.editar', async (membro) => {
    const id = texto(planoId)
    if (!id) return { ok: false, error: 'Plano não informado.' }

    const { result } = await mutateState<ActionResult>((s) => {
      const plano = (s.planosCustodia ?? []).find((p) => p.id === id)
      if (!plano) return { ok: false, error: 'Plano de custódia não encontrado.' }
      if (plano.status === 'cancelado') return { ok: false, error: 'Este plano já está cancelado.' }

      plano.status = 'cancelado'
      plano.atualizadoEm = Date.now()
      for (const f of s.faturasCustodia ?? []) {
        if (f.planoId === id && f.status !== 'paga') f.status = 'cancelada'
      }
      return { ok: true, message: `Plano ${id} cancelado.`, data: { dono: plano.userEmail } }
    })

    if (result.ok) {
      await auditar(membro, 'cancelar_plano', id, { ...(result.data ?? {}) })
    }
    return result
  })
}
