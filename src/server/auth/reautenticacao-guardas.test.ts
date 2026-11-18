/**
 * NENHUM CAMINHO SENSÍVEL SEM GUARDA — o teste de varredura da frente A (17/11/2026).
 *
 * Por que ele existe. A confirmação por senha é uma linha dentro de cada Server Action, e
 * uma linha esquecida não dá erro de build, de tipo nem de teste: a ação continua
 * funcionando — sem pedir senha nenhuma. Este teste lê o código-fonte das ações e FALHA se
 * alguma ação sensível da lista abaixo estiver sem a chamada, se a chamada trouxer o nível
 * errado, ou se ela vier DEPOIS de uma gravação, de uma cobrança ou de uma troca no Supabase
 * (guarda tardia não protege nada).
 *
 * A lista é a do pedido do Rogério (WhatsApp de 02/11/2026) com as decisões D3 e D8:
 *  - `sempre`: saque, troca de senha, e-mail, Pix e dados, retirada física de moeda;
 *  - `janela`: compra, venda, oferta de compra e pagamento de reserva (5 minutos).
 *
 * Ação nova que mexe em dinheiro ou em dados de acesso entra aqui no mesmo commit.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

type Nivel = 'sempre' | 'janela'

interface AcaoSensivel {
  arquivo: 'account' | 'market' | 'sell' | 'payments' | 'reserva' | 'custody'
  funcao: string
  nivel: Nivel
}

const ACOES_SENSIVEIS: readonly AcaoSensivel[] = [
  // Saque e dados de acesso: sempre.
  { arquivo: 'account', funcao: 'solicitarSaque', nivel: 'sempre' },
  { arquivo: 'account', funcao: 'changePassword', nivel: 'sempre' },
  { arquivo: 'account', funcao: 'updatePersonal', nivel: 'sempre' },
  { arquivo: 'account', funcao: 'salvarCadastro', nivel: 'sempre' },
  // Retirada física (D8): sempre.
  { arquivo: 'custody', funcao: 'solicitarRetirada', nivel: 'sempre' },
  // Compra e venda: janela de 5 minutos (D3).
  { arquivo: 'market', funcao: 'buyLot', nivel: 'janela' },
  { arquivo: 'market', funcao: 'publishBid', nivel: 'janela' },
  { arquivo: 'sell', funcao: 'publishOffer', nivel: 'janela' },
  { arquivo: 'sell', funcao: 'sellToBid', nivel: 'janela' },
  { arquivo: 'payments', funcao: 'iniciarCompraDireta', nivel: 'janela' },
  { arquivo: 'reserva', funcao: 'pagarReservaComSaldo', nivel: 'janela' },
  { arquivo: 'reserva', funcao: 'iniciarPagamentoReserva', nivel: 'janela' },
  { arquivo: 'reserva', funcao: 'iniciarOfertaPrePaga', nivel: 'janela' },
  { arquivo: 'reserva', funcao: 'publicarOfertaPrePagaComSaldo', nivel: 'janela' },
]

/**
 * O que NÃO pode acontecer antes da guarda: tudo o que grava, cobra ou troca algo fora do
 * processo. Ler estado (`getState`) pode — salvarCadastro lê o cadastro gravado para saber
 * se o salvamento muda alguma coisa.
 */
const EFEITOS = [
  'mutateState(',
  'executar(',
  'executarNoBanco(',
  'atualizarLogin(',
  'repositorioIntencoes(',
  'criarCobrancaPix(',
  'criarCobrancaCartao(',
  'criarPixDeposito(',
  'criarPreferenciaDeposito(',
  'signInWithPassword(',
] as const

function lerAcoes(arquivo: AcaoSensivel['arquivo']): string {
  return readFileSync(fileURLToPath(new URL(`../actions/${arquivo}.ts`, import.meta.url)), 'utf8')
}

/** O corpo da ação exportada: do `export async function nome(` até o próximo `export` na coluna 0. */
function corpoDaAcao(codigo: string, funcao: string): string | null {
  const inicio = codigo.indexOf(`export async function ${funcao}(`)
  if (inicio === -1) return null
  const proximo = codigo.indexOf('\nexport ', inicio + 1)
  return codigo.slice(inicio, proximo === -1 ? undefined : proximo)
}

/** Sem os comentários: um comentário que cita `mutateState(` não é uma gravação. */
function semComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

describe('varredura: toda ação sensível chama a guarda', () => {
  for (const { arquivo, funcao, nivel } of ACOES_SENSIVEIS) {
    describe(`${arquivo}.ts › ${funcao}`, () => {
      const corpo = corpoDaAcao(lerAcoes(arquivo), funcao)

      it('existe como ação exportada (renomear sem atualizar a lista não passa em silêncio)', () => {
        expect(corpo, `${funcao} não foi encontrada em ${arquivo}.ts`).not.toBeNull()
      })

      it(`chama exigirReautenticacao('${nivel}', …)`, () => {
        const limpo = semComentarios(corpo ?? '')
        expect(limpo).toContain(`exigirReautenticacao('${nivel}'`)
        const outroNivel = nivel === 'sempre' ? 'janela' : 'sempre'
        expect(limpo, `nível trocado em ${funcao}`).not.toContain(`exigirReautenticacao('${outroNivel}'`)
      })

      it('devolve o bloqueio no lugar da ação (não só chama e ignora)', () => {
        const limpo = semComentarios(corpo ?? '')
        expect(limpo).toMatch(/if \(bloqueio\w*\) return bloqueio\w*/)
      })

      it('a guarda vem ANTES de qualquer gravação, cobrança ou troca no Supabase', () => {
        const limpo = semComentarios(corpo ?? '')
        const guarda = limpo.indexOf('exigirReautenticacao(')
        expect(guarda).toBeGreaterThan(-1)
        for (const efeito of EFEITOS) {
          const ocorrencias = [...limpo.matchAll(new RegExp(efeito.replace('(', '\\('), 'g'))]
          for (const o of ocorrencias) {
            expect(o.index, `${efeito} aparece antes da guarda em ${funcao}`).toBeGreaterThan(guarda)
          }
        }
      })

      it('a troca de login e a gravação no banco vêm depois da ÚLTIMA guarda (updatePersonal tem duas)', () => {
        // Em updatePersonal o caminho "só o nome" tem a sua guarda e o caminho "e-mail novo" tem outra,
        // mais abaixo. A regra acima só olha a primeira; esta garante que a troca de e-mail no Supabase
        // e a gravação em cascata não escapam por um caminho sem a segunda.
        const limpo = semComentarios(corpo ?? '')
        const ultimaGuarda = limpo.lastIndexOf('exigirReautenticacao(')
        for (const efeito of ['atualizarLogin(', 'executarNoBanco(']) {
          for (const o of limpo.matchAll(new RegExp(efeito.replace('(', '\\('), 'g'))) {
            expect(o.index, `${efeito} aparece antes da última guarda em ${funcao}`).toBeGreaterThan(ultimaGuarda)
          }
        }
      })
    })
  }
})

describe('toda troca de senha, e-mail ou Pix emite o evento de segurança (T5)', () => {
  // O mesmo risco da guarda esquecida: a linha de auditoria some e nenhum teste de comportamento reclama de uma
  // chamada que nunca existiu. Aqui se confere a chamada, o tipo e a POSIÇÃO — o evento só pode vir depois de
  // TODA gravação e troca da ação, senão registraria uma troca que ainda não aconteceu (ou que a ação recusou).
  const EVENTOS = [
    { funcao: 'changePassword', tipo: 'senha_alterada' },
    { funcao: 'updatePersonal', tipo: 'email_alterado' },
    { funcao: 'salvarCadastro', tipo: 'pix_alterado' },
  ] as const
  const DEPOIS_DE_TUDO = ['mutateState(', 'executarNoBanco(', 'atualizarLogin(', 'setSession(', 'updateUser('] as const

  for (const { funcao, tipo } of EVENTOS) {
    describe(`account.ts › ${funcao}`, () => {
      const limpo = semComentarios(corpoDaAcao(lerAcoes('account'), funcao) ?? '')

      it(`registra '${tipo}' uma única vez`, () => {
        expect(limpo.match(/registrarEventoDeSeguranca\(/g) ?? []).toHaveLength(1)
        expect(limpo).toContain(`tipo: '${tipo}'`)
      })

      it('o evento vem DEPOIS de toda gravação e de toda troca feita pela ação', () => {
        const evento = limpo.indexOf('registrarEventoDeSeguranca(')
        expect(evento).toBeGreaterThan(-1)
        for (const efeito of DEPOIS_DE_TUDO) {
          for (const o of limpo.matchAll(new RegExp(efeito.replace('(', '\\('), 'g'))) {
            expect(o.index, `${efeito} aparece depois do evento em ${funcao}`).toBeLessThan(evento)
          }
        }
      })
    })
  }
})

describe('a exceção documentada: verificarTrocaEmail', () => {
  // A ficha da frente A listava `verificarTrocaEmail`, mas ela só CONFERE se o e-mail novo é
  // possível e devolve `requerSenha`; quem troca é `updatePersonal`, que tem a guarda. Pôr a
  // guarda nela faria o cliente digitar a senha duas vezes (uma na conferência, outra na troca).
  // O teste existe para a exceção não virar buraco: se ela passar a gravar algo, perde a isenção.
  it('continua sendo só leitura (nenhuma gravação, nenhuma troca no Supabase)', () => {
    const corpo = corpoDaAcao(lerAcoes('account'), 'verificarTrocaEmail')
    expect(corpo).not.toBeNull()
    const limpo = semComentarios(corpo ?? '')
    for (const efeito of ['mutateState(', 'executarNoBanco(', 'atualizarLogin(', 'setSession(']) {
      expect(limpo, `verificarTrocaEmail passou a usar ${efeito} — ela precisa de guarda`).not.toContain(efeito)
    }
  })
})
