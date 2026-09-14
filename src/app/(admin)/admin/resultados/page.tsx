/**
 * /admin/resultados — não é uma tela: a Central de Resultados abre no Financeiro.
 * Existe para quem digita o endereço do grupo não cair num 404.
 */

import { redirect } from 'next/navigation'

export default function ResultadosPage(): never {
  redirect('/admin/resultados/financeiro')
}
