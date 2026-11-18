import 'server-only'

/**
 * O acréscimo do frete VIGENTE — o que está em `/admin/configuracao` agora (frente K, 18/11/2026).
 *
 * É a única ponte entre `lib/shipping` e a configuração do site, e fica num arquivo à parte de propósito:
 * `calcularFreteCorreios` só a chama quando quem o chamou NÃO passou o acréscimo à mão, e o `import()` é dinâmico
 * para que um teste (ou um script) que informa o valor nunca carregue a camada de banco.
 *
 * Quem cota — a estimativa do passo 1 (`cotarFreteEnvio`) e o frete que se paga (`cotarFreteDoServidor`) — chama
 * `calcularFreteCorreios` sem saber do acréscimo, e é por isso que ele é aplicado aqui dentro: o valor cobrado,
 * a cotação e a tela nascem do mesmo número, sem nenhuma Server Action precisar mudar.
 *
 * `carregarParametrosOperacionais` nunca lança: sem banco, sem a tabela ou com o banco oscilando, devolve o
 * padrão do código (R$ 4,00) e o erro vai para o log (RA-47). Cobrar o padrão por um minuto é melhor do que
 * derrubar a cotação do frete.
 */

import type { Cents } from '@/domain/types'

import { acrescimoValido } from './acrescimo'

export async function acrescimoVigenteDoFreteCents(): Promise<Cents> {
  const { carregarParametrosOperacionais } = await import('@/server/config/carregar')
  const { acrescimoDoFreteCents } = await carregarParametrosOperacionais()
  return acrescimoValido(acrescimoDoFreteCents)
}
