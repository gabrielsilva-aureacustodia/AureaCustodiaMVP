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
 * SEM 'use client' (25/10/2026)
 * -----------------------------
 * A página só compõe blocos; quem lê o estado são eles (ResumoDaConta, HomeBlocks, HomeStats,
 * BlocosDeMoedas), cada um já Client Component. Marcação que não usa hook não precisa ir ao bundle do
 * navegador (doc 35 §4 do aprendizado_frontend).
 */

import type { ReactNode } from 'react'

import { BlocosDeMoedas } from '@/components/home/BlocosDeMoedas'
import { HomeBlocks } from '@/components/home/HomeBlocks'
import { HomeStats } from '@/components/home/HomeStats'
import { ResumoDaConta } from '@/components/home/ResumoDaConta'

/**
 * ORDEM DOS BLOCOS (redesenho da Frente 4, 25/10/2026): o que é da pessoa → o que ela pode fazer →
 * como está o mercado. Antes os números da plataforma abriam a tela e os seis atalhos — o requisito
 * central dela, ver HomeBlocks — ficavam na metade de baixo. Nada saiu: só mudou de lugar, e cada
 * grupo ganhou um título de seção (h2) para quem lê com leitor de tela saltar entre eles.
 */
export default function InicioPage(): ReactNode {
  return (
    <>
      <ResumoDaConta />

      <section className="inicio-secao" aria-labelledby="inicio-atalhos">
        <h2 id="inicio-atalhos" className="secao-titulo">
          O que você quer fazer
        </h2>
        <HomeBlocks />
      </section>

      {/* Filete com a estrela: separa as ações do mercado. As duas hastes são
          ::before/::after de .title-rule — só o ★ é conteúdo. */}
      <div className="title-rule" aria-hidden="true">
        <span>★</span>
      </div>

      <section className="inicio-secao" aria-labelledby="inicio-mercado">
        <h2 id="inicio-mercado" className="secao-titulo">
          O mercado hoje
        </h2>
        <HomeStats />
        <BlocosDeMoedas />
      </section>
    </>
  )
}
