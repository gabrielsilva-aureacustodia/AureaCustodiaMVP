/**
 * DOMÍNIO — a VISÃO do estado que cada cliente logado recebe (B01, relatório de QA do Davi, 22/11/2026).
 *
 * O PROBLEMA QUE ISTO FECHA
 * -------------------------
 * Até 22/11/2026 o `(app)/layout` e o `GET /api/state` entregavam o `AppState` INTEIRO a qualquer conta
 * logada: `users` de todos (CPF, Pix, banco, endereço, telefone), envios, depósitos, saques, faturas, planos e
 * reservas de terceiros. Ia no HTML (`self.__next_f`) e na resposta do polling de 10 s. O monolito original
 * tinha um só navegador por vez; no servidor isso virou vazamento.
 *
 * A REGRA
 * -------
 * O cliente recebe só o que é DELE, mais o que o mercado mostra a todos:
 *  - `users`: só a própria conta, sem o campo `pass`;
 *  - listas pessoais (`envios`, `deposits`, `saques`, `faturasCustodia`, `planosCustodia`, `retiradas`,
 *    `analises`, `reservas`): só as linhas da conta;
 *  - livro de ofertas (`sellOffers`, `buyOrders`) e histórico (`trades`): continuam completos, porque o preço
 *    é público — mas o e-mail do outro lado vira um PSEUDÔNIMO opaco (a ordem na fila e o "é meu?" seguem
 *    funcionando) e os dados financeiros de terceiros (comissão, valor pré-pago, códigos de moeda) saem;
 *  - `publico`: números já somados no servidor (estoque total, volume, auditoria) para as telas que antes
 *    somavam `state.users` de todo mundo.
 *
 * Quem decide de verdade continua sendo o servidor: esta visão só tira o que o navegador nunca precisou ver.
 * Função pura — o pseudônimo entra como parâmetro porque quem tem o segredo é `@/server`.
 */

import { coinStatusDigital, envioDateFor } from '@/domain/selectors'
import type {
  AppState,
  BuyOrder,
  EstoquePublico,
  ReservaDeCompra,
  SellOffer,
  Trade,
  User,
  UserEmail,
} from '@/domain/types'

/** Troca um e-mail por um identificador opaco e estável. Deve ser irreversível (HMAC com segredo). */
export type Pseudonimizar = (email: UserEmail) => string

export function estadoDoUsuario(
  state: AppState,
  email: UserEmail,
  pseudonimo: Pseudonimizar,
): AppState {
  const eu = state.users[email]
  // Fora da regra de ouro: quem não existe no estado não recebe nada de ninguém.
  const users: Record<UserEmail, User> = {}
  if (eu) {
    const { pass: _pass, ...semSenha } = eu
    void _pass
    users[email] = semSenha
  }

  const nome = (outro: UserEmail): UserEmail => (outro === email ? outro : pseudonimo(outro))

  const sellOffers: SellOffer[] = state.sellOffers.map((o) => ({ ...o, seller: nome(o.seller) }))

  const buyOrders: BuyOrder[] = state.buyOrders.map((b) => {
    if (b.buyer === email) return b
    const { pagoAntecipadoCents: _pago, ...publica } = b
    void _pago
    return { ...publica, buyer: pseudonimo(b.buyer) }
  })

  const trades: Trade[] = state.trades.map((t) => {
    // Negociação minha: fica inteira, mas a outra ponta continua sendo um pseudônimo, nunca o e-mail dela.
    if (t.buyer === email || t.seller === email) return { ...t, buyer: nome(t.buyer), seller: nome(t.seller) }
    // Comissão e códigos das moedas de terceiros são dado da empresa/da conta alheia, não do mercado.
    const { fee: _f, feeComprador: _fc, feeVendedor: _fv, coinIds: _ci, ...publica } = t
    void _f
    void _fc
    void _fv
    void _ci
    return { ...publica, buyer: pseudonimo(t.buyer), seller: pseudonimo(t.seller) }
  })

  const meusProtocolosDeEnvio = new Set(
    state.envios.filter((e) => e.userEmail === email).map((e) => e.protocolo),
  )

  const reservas: ReservaDeCompra[] = (state.reservas ?? [])
    .filter((r) => r.comprador === email || r.vendedor === email)
    .map((r) => ({
      ...r,
      comprador: nome(r.comprador),
      vendedor: nome(r.vendedor),
      oferta: { ...r.oferta, seller: nome(r.oferta.seller) },
    }))

  return {
    users,
    sellOffers,
    buyOrders,
    trades,
    envios: state.envios.filter((e) => e.userEmail === email),
    seq: state.seq,
    deposits: state.deposits.filter((d) => d.userEmail === email),
    analises: state.analises.filter((a) => meusProtocolosDeEnvio.has(a.protocoloEnvio)),
    saques: (state.saques ?? []).filter((s) => s.userEmail === email),
    faturasCustodia: (state.faturasCustodia ?? []).filter((f) => f.userEmail === email),
    planosCustodia: (state.planosCustodia ?? []).filter((p) => p.userEmail === email),
    retiradas: (state.retiradas ?? []).filter((r) => r.userEmail === email),
    reservas,
    publico: resumoPublico(state),
  }
}

/**
 * O que as telas públicas (Início, Mercado, Auditoria de estoque) somavam sobre o estado inteiro. Calculado
 * aqui, sobre o estado completo, e entregue como número — nunca como a lista de onde veio.
 *
 * `auditoria` (saldo, taxas e comissões da empresa) mantém o que a tela de auditoria já mostrava: se isso
 * deve continuar visível a todo cliente é pergunta aberta ao Gabriel (A08), e esta visão não decide por ele.
 */
export function resumoPublico(state: AppState): NonNullable<AppState['publico']> {
  const estoque: EstoquePublico[] = []
  for (const u of Object.values(state.users)) {
    for (const c of u.coins) {
      estoque.push({
        id: c.id,
        tipoMoeda: c.tipoMoeda,
        statusFisico: c.statusFisico,
        statusDigital: coinStatusDigital(state, c),
        entrada: c.entrada,
        dataEnvio: envioDateFor(state, c),
        reciboCodigo: c.recibo.codigo,
        reciboDataEmissao: c.recibo.dataEmissao,
        reciboAtivo: c.recibo.status === 'Ativo',
      })
    }
  }
  estoque.sort((a, b) => (a.id < b.id ? -1 : 1))

  const totalTaxas = (state.faturasCustodia ?? []).reduce(
    (acc, f) => acc + (f.status === 'cancelada' ? 0 : f.valorCents),
    0,
  )

  return {
    totalMoedas: estoque.length,
    volumeNegociadoCents: state.trades.reduce((s, t) => s + t.price * (t.qty || 1), 0),
    estoque,
    auditoria: {
      totalSaldoCents: Object.values(state.users).reduce((acc, u) => acc + (u.balance || 0), 0),
      totalTaxasCents: totalTaxas,
      totalComissoesCents: state.trades.reduce((acc, t) => acc + (t.fee || 0), 0),
      enviosEmTransito: state.envios.filter((e) => e.etapaAtual === 'Envio postado').length,
      enviosNaCentral: state.envios.filter(
        (e) =>
          e.etapaAtual !== 'Envio postado' &&
          e.etapaAtual !== 'Protocolo gerado' &&
          e.etapaAtual !== 'Recibo emitido',
      ).length,
    },
  }
}
