/**
 * 3.1 RECIBO NFT (CERTIFICADO) — rota do certificado de uma moeda.
 *
 * No monolito esta tela não tinha endereço: `openNftDetail(ownerEmail, coinId)`
 * (linha 1179) guardava a moeda na global `viewingCoin` e trocava a view. Um F5
 * perdia o recibo aberto e devolvia o painel. Aqui o código do ativo é segmento
 * de rota, então o certificado é linkável, recarregável e compartilhável.
 *
 * SERVER COMPONENT, E O QUE ELE DECIDE
 * ------------------------------------
 * Só a guarda. Quem monta a tela é o <Certificate>, no cliente, para acompanhar
 * o ciclo de sincronização de 10s. A conferência acontece aqui porque este é o
 * único lado que pode confiar em si mesmo: o `coinId` chega da URL, ou seja, é
 * entrada do usuário — quem digita /recibos/RO-000999 está pedindo um documento
 * que talvez não seja seu.
 *
 * ESCOPO: SÓ O DONO. Esta é uma DIVERGÊNCIA DELIBERADA do original, decidida no
 * escopo desta fase e registrada nas issues: lá o certificado era público
 * (`findCoinAnywhere`, linha 1899) e a interface escondia apenas o botão de
 * vender quando a moeda era de outro. Na prática nenhuma tela do MVP chegava a
 * abrir o recibo alheio — as duas chamadas de openNftDetail (linhas 1871 e 2607)
 * passavam a própria sessão —, então restringir não fecha caminho existente,
 * mas fecha a enumeração de inventário de terceiros pela barra de endereços.
 */

import { notFound, redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { Certificate } from '@/components/nft/Certificate'
import { getSessionEmail } from '@/server/session'
import { getState } from '@/server/state'

export default async function RecibosCertificadoPage({
  params,
}: {
  // No Next 15 `params` é uma Promise — precisa ser aguardada antes do uso.
  params: Promise<{ coinId: string }>
}): Promise<ReactNode> {
  const { coinId } = await params

  // O (app)/layout já barra quem não está logado; a repetição não é zelo
  // excessivo: sem sessão não há de quem checar a posse, e devolver 404 aqui
  // esconderia do visitante deslogado que o problema é falta de login.
  const session = await getSessionEmail()
  if (!session) redirect('/')

  const state = await getState()
  const me = state.users[session]
  if (!me) redirect('/')

  // Moeda inexistente e moeda de outra pessoa dão a MESMA resposta, de propósito:
  // um 404 distinto de um 403 confirmaria a existência do ativo alheio.
  const coin = me.coins.find((c) => c.id === coinId)
  if (!coin) notFound()

  // Passa só o identificador: o certificado relê a moeda do estado vivo do
  // cliente, e é isso que faz a tela reagir quando a moeda é anunciada ou some
  // do inventário com a página aberta.
  return <Certificate coinId={coinId} />
}
