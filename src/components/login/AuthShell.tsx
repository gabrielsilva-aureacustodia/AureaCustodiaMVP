/**
 * Casco das telas de acesso (/entrar, /cadastrar, /entrar/nova-senha) no sistema visual da landing.
 *
 * Só apresentação: duas colunas — marca e o que o serviço é, à esquerda; o formulário de sempre, à direita.
 * Os formulários, campos, Server Actions e fluxos (Supabase Auth, Google, nova senha) não passam por aqui.
 *
 * Sem hooks e sem 'use client' próprio: é importado pelos formulários (que são de cliente) e renderiza igual
 * nos dois lados. A moeda é decorativa (alt vazio) e sem prioridade — o LCP destas telas é o formulário.
 * No celular a coluna da marca encolhe para uma faixa curta, para o formulário aparecer sem rolar.
 */

import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { LOGO_REAL_EMBLEMA } from '@/domain/constants'

interface AuthShellProps {
  titulo: string
  itens?: readonly string[]
  children: ReactNode
}

const ITENS_PADRAO = [
  'Sua coleção protegida em cofre especializado',
  'Um recibo no seu nome para cada item aceito',
  'Venda quando quiser, sem mandar nada pelo correio',
] as const

export function AuthShell({ titulo, itens = ITENS_PADRAO, children }: AuthShellProps): ReactNode {
  return (
    <main className="pub-page pub-auth">
      <aside className="pub-auth-lado" aria-label="Real Olímpico">
        <Link className="pub-brand" href="/" aria-label="Real Olímpico — página inicial">
          <Image src={LOGO_REAL_EMBLEMA} alt="" width={44} height={44} />
          <span>
            <strong>Real Olímpico</strong>
            <small>Guarda e marketplace de colecionáveis</small>
          </span>
        </Link>

        <div>
          <p className="pub-auth-titulo">{titulo}</p>
          <ul>
            {itens.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>

        <div className="pub-auth-moeda" aria-hidden="true">
          <Image src="/moedas/moeda-direitos-humanos-1998.png" alt="" width={300} height={300} />
        </div>

        <p className="pub-auth-legal">
          AUREA CUSTODIA LTDA · CNPJ 68.071.452/0001-06. Não é corretora, não é instituição financeira e não oferece
          investimento.
        </p>
      </aside>

      <div className="pub-auth-principal">{children}</div>
    </main>
  )
}
