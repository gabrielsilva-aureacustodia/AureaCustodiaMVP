import 'server-only'

import { after } from 'next/server'

/**
 * Dispara o envio dos e-mails da fila logo depois da operação que os pediu, sem segurar a resposta ao cliente.
 *
 * É o espelho exato de `agendarEmissaoNfse` (src/server/nfse/agendar.ts): `after()` roda depois que a resposta
 * sai — numa Server Action ou num Route Handler. Fora desse escopo (dentro de outro `after()`, em script) ele
 * lança; aí o envio segue solto, e o que ele não terminar a PRÓXIMA mutação (ou o cron) reenvia: a fila no banco
 * é a garantia, isto aqui é só a pressa.
 *
 * `NODE_ENV === 'test'` não envia: a suíte exerce a fila direto (`despacharPendentes`) com um provedor falso, e
 * um envio "solto" no meio dos testes escreveria no registro local sem ninguém pedir.
 */
export function agendarEnvioDeEmails(): void {
  if (process.env.NODE_ENV === 'test') return
  const rodar = async (): Promise<void> => {
    try {
      const { despacharEmailsPendentes } = await import('./despacho')
      await despacharEmailsPendentes()
    } catch (err) {
      console.error('[aurea] e-mails: falha no envio logo após a operação (a fila reenvia):', err)
    }
  }
  try {
    after(rodar)
  } catch {
    void rodar()
  }
}
