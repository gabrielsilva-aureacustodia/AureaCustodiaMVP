/**
 * DOMÍNIO — Validação do código de rastreio dos Correios.
 *
 * Existe desde 21/09/2026, quando o Gabriel perguntou se o código que o site
 * mostrava era real. Não era: `markPosted` gravava
 * `'BR' + Math.random() + 'BR'` e respondia "Código de rastreio gerado", e a
 * etiqueta imprimia um segundo código inventado, em outro formato
 * (`SL`/`PB` + 9 dígitos + `BR`). Os dois passavam pelo olho como rastreio de
 * verdade e nenhum dos dois existe nos Correios: colado no site deles, dá
 * objeto não encontrado.
 *
 * Emitir código real exige contrato com os Correios e a API de pré-postagem
 * (CWS), que o projeto ainda não tem. Então o sistema parou de fabricar: quem
 * posta no balcão recebe o código impresso no comprovante e o digita aqui. É
 * exatamente como a RETIRADA já funcionava — `avancarStatusRetirada` sempre
 * exigiu o código do operador e recusou a postagem sem ele.
 *
 * Módulo puro: sem I/O. A mesma validação roda na tela e na Server Action,
 * porque Server Action é endpoint HTTP e o formulário é só a porta educada.
 */

/**
 * Formato oficial SRO: duas letras, nove dígitos e o código do país.
 *
 * Aceita qualquer par de letras de propósito. Os prefixos dizem o serviço
 * (`SL`/`SM` SEDEX, `PB`/`PA` PAC, `OA`, `JT`, `NX`…) e os Correios criam
 * prefixo novo sem avisar ninguém — uma lista fechada recusaria objeto legítimo
 * no balcão, que é pior do que aceitar um código malformado.
 *
 * O sufixo `BR` é exigido: objeto postado no Brasil termina em BR, e sem essa
 * âncora o padrão passaria a aceitar quase qualquer coisa.
 */
export const PADRAO_RASTREIO_SRO = /^[A-Z]{2}\d{9}BR$/

/** Mensagem única, para a tela e o servidor dizerem a mesma coisa. */
export const RASTREIO_INVALIDO =
  'Código de rastreio inválido. Ele tem 13 caracteres, no formato AA123456789BR, e está impresso no comprovante que os Correios entregam na postagem.'

/**
 * Tira espaços, hífens e pontos e passa para maiúsculas.
 *
 * O comprovante dos Correios imprime o código em grupos (`SL 123 456 789 BR`) e
 * é assim que a pessoa digita. Recusar por causa do espaço seria implicância
 * com quem está com o papel na mão.
 */
export function normalizarRastreio(codigo: string): string {
  return codigo.replace(/[\s.-]/g, '').toUpperCase()
}

/** true quando o código tem o formato de um objeto postado no Brasil. */
export function rastreioValido(codigo: string): boolean {
  return PADRAO_RASTREIO_SRO.test(normalizarRastreio(codigo))
}
