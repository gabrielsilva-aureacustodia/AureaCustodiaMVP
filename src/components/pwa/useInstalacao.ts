'use client'

/**
 * O estado de instalação do PWA para uma tela: qual caminho o aparelho tem e as ações da loja.
 *
 * Por que `useSyncExternalStore` e não `useEffect` + `useState`: três fatos decidem o estado e NENHUM existe no
 * servidor — o evento guardado, o modo de exibição e o aparelho. `useSyncExternalStore` renderiza o instantâneo do
 * servidor (`pronto: false`) durante a hidratação e troca para os valores do navegador sem erro de hidratação e sem
 * `setState` dentro de efeito.
 *
 * `pronto` é a chave do uso: enquanto for falso, quem chama NÃO sabe se o app está instalado. O botão da página inicial
 * fica visível nesse intervalo (para não piscar no meio da página de quem nunca instalou); o aviso flutuante fica
 * escondido (para não aparecer e sumir).
 */

import { useSyncExternalStore } from 'react'

import { caminhoDoInstantaneo, type Caminho, type Instantaneo } from '@/lib/pwa/instalacao'
import { lojaDeInstalacao } from '@/lib/pwa/navegador'

export interface UsoDaInstalacao {
  instantaneo: Instantaneo
  /** Antes de `pronto`, sempre `indisponivel`. */
  caminho: Caminho
  pronto: boolean
  loja: typeof lojaDeInstalacao
}

export function useInstalacao(): UsoDaInstalacao {
  const instantaneo = useSyncExternalStore(
    lojaDeInstalacao.subscribe,
    lojaDeInstalacao.getSnapshot,
    lojaDeInstalacao.getServerSnapshot,
  )
  return {
    instantaneo,
    // `Date.now()` no render é aceitável aqui: só decide se uma marca com PRAZO (o "Já adicionei" do iPhone) venceu, e a
    // tela já é renderizada de novo a cada interação.
    caminho: caminhoDoInstantaneo(instantaneo, Date.now()),
    pronto: instantaneo.pronto,
    loja: lojaDeInstalacao,
  }
}
