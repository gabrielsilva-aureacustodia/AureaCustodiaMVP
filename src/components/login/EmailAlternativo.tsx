/**
 * "Prefiro usar e-mail e senha": o caminho por e-mail, recolhido atrás do Google (frente D).
 *
 * `<details>`/`<summary>` nativos, sem JS: teclado, leitor de tela e "voltar" do navegador já sabem lidar com eles.
 * O corpo (os campos de sempre, com os mesmos IDs, validações e chamadas de ação) é passado pelos formulários — este
 * componente só embrulha, não conhece regra de cadastro nem de login.
 *
 * `aberto` vale só na primeira renderização: o servidor devolveu um erro (ex.: o retorno do Google falhou) e quem
 * chega precisa ver o caminho alternativo à mão. Depois disso quem manda é o usuário; por isso o valor não é derivado
 * do estado de erro do formulário — fechar o bloco sozinho, no meio da digitação, seria pior que o problema.
 */

import type { ReactNode } from 'react'

interface EmailAlternativoProps {
  aberto?: boolean
  children: ReactNode
}

const IconeSeta = (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M6 9l6 6 6-6" />
  </svg>
)

export function EmailAlternativo({ aberto = false, children }: EmailAlternativoProps): ReactNode {
  return (
    <details className="auth-alt" open={aberto}>
      <summary>
        <span>Prefiro usar e-mail e senha</span>
        {IconeSeta}
      </summary>
      <div className="auth-alt-corpo">{children}</div>
    </details>
  )
}
