/**
 * Porta de entrada do futuro package da marca Real Olímpico (ver README.md).
 *
 * As fontes NÃO saem daqui: next/font só pode ser chamado em módulo carregado
 * pelo app, então quem precisa delas importa '@/brand/fontes' (no package:
 * '@real-olimpico/marca/fontes'). O CSS também não: entra por app/globals.css.
 */

export { ATIVOS, FOTO_REAL, ILUSTRACOES, RENDER_TRES_QUARTOS, srcDe, srcsetDe } from './ativos'
export type { AtivoRaster, AtivoVetor, IdDaIlustracao, IdDoAtivo, MoedaNegociavel, SituacaoDoAtivo } from './ativos'
export { ImagemDaMarca } from './componentes/ImagemDaMarca'
export { contraste, papeis, primitivos } from './tokens'
export type { Tema } from './tokens'
export {
  ARQUIVO_LOGO_EMBLEMA,
  ARQUIVO_LOGO_MARCA,
  LARGURA_MINIMA_EMBLEMA,
  LARGURA_MINIMA_MARCA,
  LogoEmblema,
  LogoMarca,
} from './componentes/Logo'
