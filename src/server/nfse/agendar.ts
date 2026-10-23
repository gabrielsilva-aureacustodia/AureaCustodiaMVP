import 'server-only'

import { after } from 'next/server'

/**
 * Dispara o envio das notas logo depois da operação que as pediu, sem segurar a resposta ao cliente.
 *
 * `after()` roda depois que a resposta sai — numa Server Action ou num Route Handler. Fora desse
 * escopo (dentro de outro `after()`, em script) ele lança; aí o envio segue solto, e o que ele não
 * terminar o cron diário reenvia: a fila no banco é a garantia, isto aqui é só a pressa.
 */
export function agendarEmissaoNfse(): void {
  if (process.env.NODE_ENV === 'test') return
  const rodar = async (): Promise<void> => {
    try {
      const { processarNotasPendentes } = await import('./emissao')
      await processarNotasPendentes()
    } catch (err) {
      console.error('[aurea] NFS-e: falha no envio logo após a operação (o cron diário reenvia):', err)
    }
  }
  try {
    after(rodar)
  } catch {
    void rodar()
  }
}
