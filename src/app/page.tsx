/**
 * Landing pública do Real Olímpico.
 *
 * Visitantes sem sessão recebem a página institucional. Uma sessão válida e
 * já ligada aos dados mockados segue direto para o painel; sessão antiga ou
 * conta ainda não provisionada permanece na landing, sem laço de redirect.
 */

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { LandingPage } from '@/components/landing/LandingPage'
import { VISUAL_OG } from '@/components/landing/visuais'
import { carregarDestaquesDaLanding } from '@/server/mercado/destaques'
import { carregarTabelaDeTaxas } from '@/server/taxas/carregar'
import { getSessionEmail } from '@/server/session'
import { getState } from '@/server/state'

export const metadata: Metadata = {
  title: 'Real Olímpico | Guarda e marketplace de itens de coleção',
  description:
    'Proteja seus itens de coleção em cofre, receba um recibo no seu nome e venda quando quiser no marketplace, sem mandar nada pelo correio. Começamos pelas moedas comemorativas.',
  // Card de compartilhamento da Frente 2 (sem anéis olímpicos). Na Vercel, o Next completa o endereço absoluto.
  openGraph: {
    title: 'Real Olímpico — sua coleção protegida no cofre e pronta para virar dinheiro',
    description: 'Guarda e marketplace de itens de coleção. Começamos pelas moedas comemorativas.',
    images: [{ url: VISUAL_OG.url, width: VISUAL_OG.largura, height: VISUAL_OG.altura, alt: 'Real Olímpico' }],
    locale: 'pt_BR',
    type: 'website',
  },
}

export default async function HomePage(): Promise<ReactNode> {
  const session = await getSessionEmail()
  if (session) {
    const state = await getState()
    if (state.users[session]) redirect('/inicio')
  }

  // Só agregados do livro de ordens (maior oferta de compra e média por tipo): a vitrine não expõe ofertas nem pessoas.
  // As taxas são as VIGENTES (as mesmas de /taxas), nunca digitadas na landing. As duas leituras não dependem uma
  // da outra, então vão em paralelo (doc 35 §2 do aprendizado_frontend); só a sessão, que decide o redirect, vem antes.
  const [destaques, taxas] = await Promise.all([carregarDestaquesDaLanding(), carregarTabelaDeTaxas()])
  return <LandingPage destaques={destaques} taxas={taxas} />
}
