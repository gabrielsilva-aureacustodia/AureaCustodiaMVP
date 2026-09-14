/**
 * Telefone do atendimento em E.164 canônico — a chave que casa o WhatsApp com a conta.
 *
 * O PROBLEMA QUE ESTE ARQUIVO RESOLVE. O mesmo celular chega em três formas:
 *  - no cadastro do site, só DDD e número: '11999998888' (src/server/actions/account.ts);
 *  - no WhatsApp, com o país e sem o '+': '5511999998888@s.whatsapp.net';
 *  - no WhatsApp de conta antiga, SEM O NONO DÍGITO: '551199998888'. O Brasil acrescentou
 *    o 9 aos celulares entre 2012 e 2016, e o identificador de quem já tinha WhatsApp
 *    continuou com oito dígitos.
 * Comparar os textos crus faria a conversa nunca achar a ficha do cliente, e a mesma
 * pessoa viraria dois contatos. Por isso todo telefone passa por `normalizarTelefone`
 * antes de ser gravado ou comparado, e a forma canônica do celular brasileiro é SEMPRE a
 * de nove dígitos.
 *
 * Regra pura: sem I/O. O número canônico é o que vai para `aurea.cs_contatos.telefone_e164`.
 */

const DDI_BRASIL = '55'

/**
 * Celular brasileiro gravado sem o nono dígito: país (2) + DDD (2) + 8 dígitos começando
 * por 6, 7, 8 ou 9 — a faixa dos celulares antes da mudança. Fixo começa por 2 a 5 e não
 * ganha dígito nenhum.
 */
function celularSemNono(digitos: string): boolean {
  return digitos.length === 12 && digitos.startsWith(DDI_BRASIL) && /[6-9]/.test(digitos[4])
}

/**
 * Qualquer forma de telefone → '+5511999998888', ou `null` se não parece telefone.
 *
 *  - Com '+' na frente: já tem o país; só limpa e, se for Brasil, completa o nono dígito.
 *  - Sem '+' e com 10 ou 11 dígitos: é o formato do cadastro do site (DDD + número), e
 *    ganha o 55. A plataforma é brasileira; um número estrangeiro de 10 ou 11 dígitos
 *    precisa vir com '+'.
 *  - Sem '+' e com 12 ou 13 dígitos começando por 55: Brasil com o país, como o WhatsApp
 *    manda.
 *  - Sem '+' e com menos de 10 dígitos: número sem DDD, que não dá para completar — `null`.
 *  - Qualquer outra coisa entre 8 e 15 dígitos (o limite do E.164): internacional como veio.
 */
export function normalizarTelefone(texto: string | null | undefined): string | null {
  if (typeof texto !== 'string') return null
  const bruto = texto.trim()
  if (!bruto) return null
  let digitos = bruto.replace(/\D/g, '')
  if (!digitos) return null

  if (!bruto.startsWith('+')) {
    if (digitos.length < 10) return null
    if (digitos.length === 10 || digitos.length === 11) digitos = DDI_BRASIL + digitos
  }
  if (celularSemNono(digitos)) digitos = `${digitos.slice(0, 4)}9${digitos.slice(4)}`
  if (digitos.length < 8 || digitos.length > 15) return null
  return `+${digitos}`
}

/**
 * O identificador do WhatsApp ('5511999998888@s.whatsapp.net') → telefone canônico.
 * Grupo ('…@g.us'), lista de transmissão e status ('status@broadcast') devolvem `null`:
 * o atendimento é conversa de uma pessoa só.
 */
export function telefoneDoJid(jid: string | null | undefined): string | null {
  if (typeof jid !== 'string') return null
  const [usuario, dominio] = jid.split('@')
  if (dominio !== 's.whatsapp.net' && dominio !== 'c.us') return null
  // 'numero:dispositivo@s.whatsapp.net' aparece em mensagem vinda de aparelho vinculado.
  const numero = (usuario ?? '').split(':')[0]
  return /^\d{8,15}$/.test(numero) ? normalizarTelefone(`+${numero}`) : null
}

/** O número que o provedor recebe no envio: só dígitos, com o país. */
export function digitosParaEnvio(e164: string): string {
  return e164.replace(/\D/g, '')
}

/** Os dois telefones são a mesma linha? Compara as formas canônicas. */
export function mesmoTelefone(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizarTelefone(a)
  return na !== null && na === normalizarTelefone(b)
}

/**
 * A conta dona do telefone, pelo cadastro. Duas contas com o mesmo número (um casal, uma
 * conta de teste) é ambíguo: devolve `null`, e o atendente vincula à mão — ligar a conversa
 * à ficha errada mostraria saldo de outra pessoa.
 */
export function contaDoTelefone(contas: ReadonlyArray<{ email: string; telefone: string }>, telefone: string): string | null {
  const alvo = normalizarTelefone(telefone)
  if (!alvo) return null
  const donos = new Set(contas.filter((c) => normalizarTelefone(c.telefone) === alvo).map((c) => c.email))
  return donos.size === 1 ? [...donos][0] : null
}

/** '+5511999998888' → '+55 (11) 99999-8888'; estrangeiro fica '+<dígitos>'. */
export function formatarTelefoneE164(e164: string | null | undefined): string {
  if (!e164) return '—'
  const d = e164.replace(/\D/g, '')
  if (d.startsWith(DDI_BRASIL) && (d.length === 12 || d.length === 13)) {
    const ddd = d.slice(2, 4)
    const numero = d.slice(4)
    const corte = numero.length - 4
    return `+55 (${ddd}) ${numero.slice(0, corte)}-${numero.slice(corte)}`
  }
  return `+${d}`
}
