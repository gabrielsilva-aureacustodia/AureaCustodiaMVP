import 'server-only'

/**
 * O evento CompleteRegistration — o que a campanha de tráfego para o site mede.
 *
 * Dois caminhos de cadastro, dois momentos, uma regra: UM evento por pessoa, no instante em que a conta nasce.
 *
 *  - E-MAIL: no `registerWithEmail`, quando o Supabase aceita o cadastro. O ID do evento volta para o formulário, que
 *    dispara o Pixel com o mesmo ID. Não se espera a confirmação do e-mail: parte das pessoas nunca clica no link, e o
 *    algoritmo da Meta aprende melhor com o evento perto do anúncio. A confirmação depois NÃO dispara de novo.
 *  - GOOGLE: no callback, na PRIMEIRA vez que a identidade vira conta (`provisionAuthenticatedUser`). O navegador sai do
 *    site para o Google e volta por um redirecionamento do servidor, que não roda JavaScript — então o servidor deixa o
 *    ID num cookie de 2 minutos e o Pixel o dispara na página seguinte (`MetaPixel`), apagando o cookie.
 *
 * O servidor envia o mesmo evento pela API de Conversões, com o mesmo ID, e a Meta conta um só.
 */

import { cookies } from 'next/headers'

import {
  COOKIE_EVENTO_PENDENTE,
  novoEventId,
  parametrosDoCadastro,
  serializarEventoPendente,
  type MetodoDeCadastro,
} from '@/lib/meta/eventos'

import { consentimentoDoCookie } from '@/lib/cookies/consentimento'
import { contextoDaRequisicao, enviarEventoDoServidor } from './conversions-api'

const SITE_PADRAO = 'https://realolimpico.com.br'

interface RegistroDeCadastro {
  metodo: MetodoDeCadastro
  email: string
  nomeCompleto?: string
  cabecalhos: Headers
  /** Página de onde a pessoa veio quando o cabeçalho `referer` não existe. */
  paginaPadrao: string
}

function paginaDe(caminho: string): string {
  const base = process.env.AUREA_SITE_URL?.trim().replace(/\/$/, '') || SITE_PADRAO
  return `${base}${caminho}`
}

/** Registra o cadastro na API de Conversões e devolve o ID para o navegador disparar o par do Pixel. */
export function registrarCadastroNaMeta(r: RegistroDeCadastro): string {
  const eventId = novoEventId()
  const ctx = contextoDaRequisicao(r.cabecalhos, paginaDe(r.paginaPadrao))
  // A09 (22/11/2026): a API de Conversões também só manda com o "Aceitar" do visitante (cookie `ro_cookies`). Sem escolha
  // ou recusado, nada sai para a Meta — o cadastro segue normal, só o evento de publicidade é que não existe.
  if (consentimentoDoCookie(r.cabecalhos.get('cookie')) !== 'aceito') return eventId
  enviarEventoDoServidor({
    nome: 'CompleteRegistration',
    eventId,
    urlDaOrigem: ctx.url,
    usuario: {
      email: r.email,
      nomeCompleto: r.nomeCompleto,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      fbp: ctx.fbp,
      fbc: ctx.fbc,
    },
    dadosCustom: parametrosDoCadastro(r.metodo),
  })
  return eventId
}

/** Cadastro pelo Google: registra no servidor e deixa o ID num cookie curto para o Pixel do navegador. */
export async function registrarCadastroGoogleNaMeta(
  email: string,
  nomeCompleto: string | undefined,
  cabecalhos: Headers,
): Promise<void> {
  const eventId = registrarCadastroNaMeta({
    metodo: 'cadastro_google',
    email,
    nomeCompleto,
    cabecalhos,
    paginaPadrao: '/cadastrar',
  })
  const jar = await cookies()
  jar.set(
    COOKIE_EVENTO_PENDENTE,
    serializarEventoPendente({ nome: 'CompleteRegistration', eventId, metodo: 'cadastro_google' }),
    {
      // Legível pelo navegador DE PROPÓSITO: quem o consome é o Pixel. Guarda só um ID aleatório e o nome do caminho.
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 120,
    },
  )
}
