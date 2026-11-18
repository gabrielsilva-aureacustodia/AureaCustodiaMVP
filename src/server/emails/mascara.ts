/**
 * Máscaras dos dados que um e-mail pode citar.
 *
 * Regra do aceite: nada sensível sai por e-mail. A chave Pix e o endereço de e-mail do cliente nunca saem
 * inteiros — quem lê só precisa reconhecer "a minha" e perceber se foi trocada. A máscara roda ao DERIVAR o
 * evento (eventos.ts), antes de ele ir para a fila, e não ao montar o texto: assim o banco da fila também
 * nunca guarda o dado inteiro.
 */

/** 'maria.silva@gmail.com' -> 'm***@gmail.com'. Sem '@', não há o que mostrar. */
export function mascararEmail(email: string): string {
  const e = email.trim()
  const arroba = e.lastIndexOf('@')
  if (arroba < 1) return '***'
  return `${e[0]}***${e.slice(arroba)}`
}

/**
 * 'terminada em 8909' para CPF/telefone/chave aleatória; e-mail usa `mascararEmail`.
 *
 * Só os quatro últimos caracteres úteis (letras e dígitos) aparecem. Chave curta demais para esconder
 * alguma coisa vira '***' — mostrar 4 de 4 seria mostrar tudo.
 */
export function mascararChavePix(chave: string): string {
  const c = chave.trim()
  if (c.includes('@')) return mascararEmail(c)
  const util = c.replace(/[^0-9a-zA-Z]/g, '')
  if (util.length <= 4) return '***'
  return `terminada em ${util.slice(-4)}`
}
