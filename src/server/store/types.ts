/**
 * Contrato da camada de persistência.
 *
 * No MVP monolítico existia um único ponto de gravação — `window.storage`, a
 * API do ambiente de artefatos (aurea-mvp-teste.html, linhas 905-916 para o
 * estado e 2236-2240 para as cotações). Esse objeto não existe na Vercel, e
 * substituí-lo por um `import` fixo de Redis ou Postgres travaria o projeto num
 * fornecedor antes da hora. Daí a interface: o domínio conversa com
 * `StateStore`, e qual backend responde é decisão de ambiente (ver index.ts).
 *
 * A superfície é deliberadamente mínima — get, set e mutate — porque o MVP
 * nunca precisou de mais que isso: uma chave, um documento JSON inteiro.
 */

/** Backends suportados. `memory` é o fallback de desenvolvimento, sem persistência. */
export type StoreKind = 'memory' | 'redis' | 'postgres'

export interface StateStore {
  /** Qual implementação está ativa — útil em diagnóstico e no rodapé de debug. */
  readonly kind: StoreKind

  /** Devolve o documento gravado na chave, ou null se ela nunca foi escrita. */
  get<T>(key: string): Promise<T | null>

  /** Grava o documento inteiro, sobrescrevendo o que houver. */
  set<T>(key: string, value: T): Promise<void>

  /**
   * Ciclo ler -> modificar -> gravar em uma única chamada.
   *
   * Existe como método próprio (em vez de get + set no chamador) porque só o
   * backend sabe se consegue proteger a janela entre a leitura e a escrita:
   * o Postgres tranca a linha com SELECT ... FOR UPDATE; o Redis não tranca
   * nada e assume "última gravação vence". Deixar isso a cargo do chamador
   * significaria escolher o pior dos dois em todos os casos.
   *
   * `mutator` recebe o estado atual (null na primeira vez) e devolve o estado
   * a gravar — pode ser o mesmo objeto mutado no lugar, como fazia o original.
   * `pick` é aplicado depois da gravação e extrai o valor de retorno da
   * operação, para que quem chamou receba estado e resultado de uma vez.
   */
  mutate<T, S>(
    key: string,
    mutator: (current: S | null) => S | Promise<S>,
    pick: (s: S) => T,
  ): Promise<{ state: S; result: T }>
}
