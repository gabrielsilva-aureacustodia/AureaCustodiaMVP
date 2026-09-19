/**
 * A lista do que é alcançável sem sessão.
 *
 * Vive fora do `middleware.ts` por um motivo de teste, não de organização: o
 * `middleware.test.ts` cruza esta lista com as rotas que existem no disco e
 * reprova quando aparece uma página fora dos grupos protegidos que ninguém
 * declarou como pública. É esse cruzamento que impede a brecha de voltar — sem
 * ele, a lista seria só mais um lugar para esquecer.
 *
 * REGRA PARA QUEM FOR MEXER: acrescentar uma entrada aqui é abrir a rota para
 * a internet inteira. O repositório é público (RA-02, RA-11), então a URL não
 * depende de ninguém adivinhar. Se a resposta muda conforme quem pergunta, a
 * rota não é pública.
 */

/**
 * Comparadas por igualdade exata.
 *
 * `/entrar` está aqui e `/entrar/nova-senha` NÃO: a tela de definir senha nova
 * exige a sessão de recuperação. Por isso igualdade, e não prefixo.
 */
export const ROTAS_PUBLICAS_EXATAS: readonly string[] = [
  '/', // landing — manda quem já está logado para /inicio
  '/entrar',
  '/cadastrar',
  '/painel', // porta da equipe — manda membro para /admin
  '/academy',
  '/termos',
  '/privacidade',
  '/suporte',
  '/taxas',
]

/**
 * Famílias inteiras liberadas.
 *
 * Os quatro primeiros não são "públicos" no sentido comum: eles se autenticam
 * por outro meio que não o cookie de sessão, e passam por aqui justamente para
 * que a rede não os barre antes de a verificação deles acontecer.
 */
export const ROTAS_PUBLICAS_PREFIXOS: readonly string[] = [
  '/api/webhooks/', // Mercado Pago e WhatsApp — conferem a assinatura do provedor
  '/api/cron/', // faturamento e rastreio — conferem CRON_SECRET
  '/api/estacao', // bancada física — confere o token do equipamento no header Authorization
  '/entrar/callback', // retorno do Supabase Auth: é aqui que a sessão nasce
  '/entrar/sair', // logout precisa funcionar mesmo com o cookie já inválido
  '/api/crypto', // cotações de BTC/ETH/USDT, sem dado de ninguém
]

export function ehRotaPublica(caminho: string): boolean {
  if (ROTAS_PUBLICAS_EXATAS.includes(caminho)) return true
  return ROTAS_PUBLICAS_PREFIXOS.some((p) => caminho === p || caminho.startsWith(p))
}
