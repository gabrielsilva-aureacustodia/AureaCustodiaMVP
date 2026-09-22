'use client'

/**
 * 1.0 — Painel Real Olímpico. Port de aurea-mvp-teste.html, renderHome
 * (linhas 1187-1233).
 *
 * O QUE SUMIU DAQUI, E POR QUÊ
 * ----------------------------
 * As duas primeiras linhas do renderHome original escreviam o cabeçalho da
 * página (`pageTitle.innerHTML = '<h1 class="serif">Painel Real Olímpico</h1>
 * <p>Olá, ${primeiro nome} — ...'`). Neste port o cabeçalho é da topbar, que o
 * deriva da rota — ver a nota longa no topo de components/shell/Topbar.tsx. Se
 * esta página escrevesse o título também, ele apareceria duas vezes.
 *
 * Sumiu junto o `<div id="viewHome" class="view">` que embrulhava tudo: os onze
 * contêineres escondidos do monolito eram um roteador feito à mão, e quem faz
 * esse papel agora é o App Router. O conteúdo entra direto no <main class="main">
 * do layout.
 *
 * CLIENT COMPONENT
 * ----------------
 * Client Component integrado aos providers do layout (AppProvider e ModalProvider),
 * permitindo que os indicadores e os blocos de ação (incluindo o atalho de depósito
 * via modal) operem em sintonia com o estado da aplicação.
 */

import type { ReactNode } from 'react'

import { HomeBlocks } from '@/components/home/HomeBlocks'
import { HomeStats } from '@/components/home/HomeStats'

export default function InicioPage(): ReactNode {
  return (
    <>
      <HomeStats />

      {/* Filete com a estrela: separa os indicadores dos blocos de ação. As
          duas hastes são ::before/::after de .title-rule — só o ★ é conteúdo. */}
      <div className="title-rule">
        <span>★</span>
      </div>

      <HomeBlocks />
    </>
  )
}
