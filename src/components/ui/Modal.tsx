'use client'

/**
 * Modal única e reutilizada — port de aurea-mvp-teste.html, linhas 735-737,
 * 1406-1408 e as sete chamadas de `modalBg.classList.add('show')`.
 *
 * O original tinha UM par <div class="modal-bg"><div class="modal"></div></div>
 * fixo no fim do <body>. Cada tela jogava HTML dentro de #modalBox e ligava a
 * classe .show. Aqui a mesma estrutura existe uma vez só, e o que muda é o nó
 * React guardado no contexto.
 *
 * FIDELIDADE DE COMPORTAMENTO — o original NÃO fechava a modal com clique no
 * fundo nem com Escape (procure: não há listener nenhum em #modalBg). A única
 * saída é um botão do próprio conteúdo chamando closeModal(). Isso está mantido:
 * várias modais do sistema confirmam compra e venda com dinheiro real de teste,
 * e fechar por clique acidental no fundo mudaria a experiência.
 *
 * POR QUE O HOST É SEPARADO DO PROVIDER
 * -------------------------------------
 * `ModalProvider` guarda o estado e mora no layout raiz (precisa envolver login
 * e app). `ModalHost` desenha a caixa e mora DENTRO do casco autenticado, junto
 * do <AppProvider>. Contexto no React é resolvido pela posição onde o nó é
 * RENDERIZADO, não onde foi criado: se o host ficasse na raiz, um conteúdo de
 * modal que chamasse useApp() explodiria com 'fora de <AppProvider>'. Com o host
 * lá dentro, o conteúdo enxerga estado, sessão e run() normalmente.
 */

import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

interface ModalActions {
  open(node: ReactNode): void
  close(): void
}

/**
 * Dois contextos e não um: as AÇÕES precisam de identidade estável (quem as põe
 * numa lista de dependências de useEffect não pode ver o objeto mudar a cada
 * abertura), enquanto o NÓ muda toda vez. Num contexto só, abrir a modal
 * invalidaria `open` e `close` junto.
 */
const ActionsCtx = createContext<ModalActions | null>(null)
const NodeCtx = createContext<ReactNode>(null)

export function useModal(): ModalActions {
  const ctx = useContext(ActionsCtx)
  if (!ctx) throw new Error('useModal() precisa estar dentro de <ModalProvider>.')
  return ctx
}

export function ModalProvider({ children }: { children: ReactNode }): ReactNode {
  const [node, setNode] = useState<ReactNode>(null)

  const actions = useMemo<ModalActions>(
    () => ({
      // A função de atualização é obrigatória aqui: setNode(node) trataria um nó
      // React (que é um objeto, não uma função) como valor normal — mas se algum
      // dia alguém passasse um componente-função direto, o React o CHAMARIA em
      // vez de guardá-lo. O wrapper elimina a ambiguidade.
      open: (n: ReactNode) => setNode(() => n),
      close: () => setNode(null),
    }),
    [],
  )

  return (
    <ActionsCtx.Provider value={actions}>
      <NodeCtx.Provider value={node}>{children}</NodeCtx.Provider>
    </ActionsCtx.Provider>
  )
}

/**
 * A caixa em si. Renderize UMA vez, dentro do casco autenticado (ver a nota do
 * topo). É posição fixa com inset:0 e z-index:50, então o lugar dela na árvore
 * não muda nada visualmente — muda só quais contextos o conteúdo enxerga.
 */
export function ModalHost(): ReactNode {
  const node = useContext(NodeCtx)
  const aberta = Boolean(node)

  return (
    // O elemento fica sempre no DOM, como o #modalBg do original: .modal-bg sem
    // .show é display:none. O papel de diálogo só é anunciado quando há conteúdo
    // — um role="dialog" permanentemente vazio confunde leitor de tela.
    <div
      className={aberta ? 'modal-bg show' : 'modal-bg'}
      role={aberta ? 'dialog' : undefined}
      aria-modal={aberta ? true : undefined}
      aria-hidden={aberta ? undefined : true}
    >
      <div className="modal">{node}</div>
    </div>
  )
}
