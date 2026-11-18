/**
 * NENHUMA TELA CHAMA UMA AÇÃO SENSÍVEL SEM `confirmar(...)` — frente A, 17/11/2026.
 *
 * O teste irmão (`src/server/auth/reautenticacao-guardas.test.ts`) garante que cada ação do servidor tem a guarda.
 * Este garante a outra ponta: toda tela que CHAMA uma dessas ações a chama por dentro de
 * `confirmar(() => ...)` (hook `useConfirmarSenha`). Sem isso a guarda do servidor funcionaria e a tela responderia
 * "{ ok:false, precisaSenha:true }" sem abrir o diálogo: o cliente clicaria em "Confirmar saque" e nada aconteceria.
 * Esquecer o `confirmar(` não dá erro de build nem de tipo — por isso o teste.
 *
 * Só olha componentes React (`.tsx` em `src/components` e `src/app`); a definição das ações mora em `src/server`.
 * Comentários são ignorados: citar `buyLot()` num comentário não é chamar a ação.
 *
 * `sellToBid` e `iniciarPagamentoReserva` não têm tela hoje; entram na lista para que a primeira tela que os chamar
 * já nasça com a confirmação.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const ACOES_SENSIVEIS = [
  'solicitarSaque',
  'changePassword',
  'updatePersonal',
  'salvarCadastro',
  'solicitarRetirada',
  'buyLot',
  'publishBid',
  'publishOffer',
  'sellToBid',
  'iniciarCompraDireta',
  'pagarReservaComSaldo',
  'iniciarPagamentoReserva',
  'iniciarOfertaPrePaga',
  'publicarOfertaPrePagaComSaldo',
] as const

const RAIZ_SRC = fileURLToPath(new URL('../../', import.meta.url))

function arquivosTsx(pasta: string): string[] {
  const achados: string[] = []
  for (const nome of readdirSync(pasta)) {
    const caminho = join(pasta, nome)
    if (statSync(caminho).isDirectory()) achados.push(...arquivosTsx(caminho))
    else if (nome.endsWith('.tsx')) achados.push(caminho)
  }
  return achados
}

// Sem comentários de bloco (inclui os do JSX, entre chaves) e sem linhas que só têm `//`.
function semComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

interface Chamada {
  arquivo: string
  acao: string
  dentroDeConfirmar: boolean
}

function chamadasDasAcoes(): Chamada[] {
  const chamadas: Chamada[] = []
  const arquivos = [...arquivosTsx(join(RAIZ_SRC, 'components')), ...arquivosTsx(join(RAIZ_SRC, 'app'))]
  for (const arquivo of arquivos) {
    const codigo = semComentarios(readFileSync(arquivo, 'utf8'))
    for (const acao of ACOES_SENSIVEIS) {
      for (const achado of codigo.matchAll(new RegExp(`\\b${acao}\\(`, 'g'))) {
        const antes = codigo.slice(0, achado.index)
        // A chamada tem de vir logo depois de `confirmar(() =>` (com espaço ou quebra de linha no meio). O nome pode
        // ter sufixo (`confirmarIdentidade(() =>`): uma tela que já tem uma função `confirmar` própria renomeia a do hook.
        chamadas.push({
          arquivo: arquivo.slice(RAIZ_SRC.length).replace(/\\/g, '/'),
          acao,
          dentroDeConfirmar: /\bconfirmar\w*\(\s*\(\)\s*=>\s*$/.test(antes),
        })
      }
    }
  }
  return chamadas
}

describe('toda tela que chama uma ação sensível usa confirmar(() => ...)', () => {
  const chamadas = chamadasDasAcoes()

  it('encontra as chamadas conhecidas (o teste não está olhando para o lugar errado)', () => {
    // Hoje são 14 chamadas em 8 arquivos; se a busca devolver muito menos, o caminho ou a regra quebrou.
    expect(chamadas.length).toBeGreaterThanOrEqual(14)
    const arquivos = new Set(chamadas.map((c) => c.arquivo))
    for (const esperado of [
      'components/account/AccountModals.tsx',
      'components/account/ModalCadastro.tsx',
      'app/(app)/mercado/page.tsx',
      'app/(app)/compras/page.tsx',
      'app/(app)/vender/page.tsx',
      'components/market/ModalOfertaPrePaga.tsx',
      'components/market/ReservasEmAberto.tsx',
      'components/recibo/ModalSolicitarRetirada.tsx',
    ]) {
      expect(arquivos, `${esperado} deixou de chamar uma ação sensível?`).toContain(esperado)
    }
  })

  it('nenhuma chamada fica fora de confirmar(...)', () => {
    const soltas = chamadas.filter((c) => !c.dentroDeConfirmar).map((c) => `${c.arquivo} → ${c.acao}(`)
    expect(soltas, 'chamada de ação sensível sem confirmar(() => ...): o diálogo não abriria').toEqual([])
  })

  it('cada arquivo que chama uma dessas ações também desenha o diálogo ({dialogo})', () => {
    const comChamada = new Set(chamadas.map((c) => join(RAIZ_SRC, c.arquivo)))
    for (const arquivo of comChamada) {
      const codigo = semComentarios(readFileSync(arquivo, 'utf8'))
      expect(codigo, `${arquivo} usa confirmar mas não renderiza {dialogo}`).toMatch(/\{dialogo\}|\breturn dialogo\b/)
      expect(codigo, `${arquivo} não chama useConfirmarSenha()`).toContain('useConfirmarSenha()')
    }
  })
})
