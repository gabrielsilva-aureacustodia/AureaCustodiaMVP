/**
 * Identidade de e-mail — a ÚNICA definição de "este e-mail é o mesmo que aquele".
 *
 * POR QUE EXISTE. O e-mail é a chave de `state.users` e a chave estrangeira de quase toda tabela
 * `aurea.*`. Até 01/10/2026 cada ponto de entrada (cadastro público, callback do Google,
 * provisionamento, Admin > Usuários, troca de e-mail, estação) fazia o seu próprio
 * `trim().toLowerCase()` em linha. Funcionava enquanto todos lembravam; bastava um esquecer e
 * "Teste@x.com" e "teste@x.com" virariam duas contas da mesma pessoa, cada uma com o seu saldo.
 * No banco a chave é `text` simples, então nada além do código impede isso.
 */

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Acha a chave de `users` que corresponde a este e-mail — mesmo que a chave tenha sido gravada
 * antes da normalização existir (com maiúscula ou espaço). Sem isso, o guarda "já existe?"
 * olharia só a chave exata e deixaria uma conta legada ser duplicada pela versão normalizada.
 * Devolve `null` quando a conta não existe.
 */
export function chaveDeUsuario(users: Readonly<Record<string, unknown>>, email: string): string | null {
  const alvo = normalizarEmail(email)
  if (Object.prototype.hasOwnProperty.call(users, alvo)) return alvo
  for (const chave of Object.keys(users)) {
    if (normalizarEmail(chave) === alvo) return chave
  }
  return null
}
