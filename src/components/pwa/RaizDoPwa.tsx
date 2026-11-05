'use client'

/**
 * A raiz do PWA, montada UMA vez no layout raiz (src/app/layout.tsx).
 *
 * Faz três coisas, e as três precisam viver acima de todas as rotas:
 *   1. liga a loja de instalação ao navegador (captura `beforeinstallprompt` e `appinstalled`);
 *   2. registra o service worker e liga a atualização automática;
 *   3. hospeda os dois elementos de interface compartilhados — o aviso flutuante e o painel de instruções —, que o botão
 *      da página inicial também abre.
 *
 * Mora no layout raiz porque o Chrome dispara o evento de instalação UMA vez por carregamento de página, e um ouvinte
 * montado só na tela que mostra o botão o perderia (ver src/lib/pwa/instalacao.ts). Como o módulo da loja sobrevive à
 * navegação, o evento pego em `/` ainda está lá em `/inicio`.
 */

import { useEffect } from 'react'
import type { ReactNode } from 'react'

import { registrarServiceWorker } from '@/lib/pwa/atualizacao'
import { iniciarInstalacao } from '@/lib/pwa/navegador'

import { AvisoDeInstalacao } from './AvisoDeInstalacao'
import { GuiaDeInstalacao } from './GuiaDeInstalacao'

export function RaizDoPwa(): ReactNode {
  useEffect(() => {
    const pararInstalacao = iniciarInstalacao()
    const pararServiceWorker = registrarServiceWorker()
    return () => {
      pararInstalacao()
      pararServiceWorker()
    }
  }, [])

  return (
    <>
      <AvisoDeInstalacao />
      <GuiaDeInstalacao />
    </>
  )
}
