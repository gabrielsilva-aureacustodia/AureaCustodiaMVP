---
name: site-de-apresentacao-real-olimpico
description: "Site de apresentação do Real Olímpico (6 partes, animado, para clientes) — pasta, projeto Vercel, URL, público, vocabulário liberado e a demonstração 'Na prática'"
metadata:
  node_type: memory
  type: project
  originSessionId: 5e2042a8-3fc8-4243-9453-5524639ada1e
  modified: 2026-11-07T01:06:14.237Z
---

Site de apresentação do sistema, publicado em 06/11/2026: https://real-olimpico-apresentacao.vercel.app
(projeto `real-olimpico-apresentacao`, time `aurea-custodia`, noindex). Código em `C:\dev\RealOlimpico-Apresentacao`
— **fora do repositório da Áurea e sem git**. Next 15 + React 19, CSS global por área, método Distilla/Sintetica.
Partes: capa, reserva de valor (cena fixa), marketplace + simulador (taxas reais), **04 Na prática** (demonstração
animada, abaixo), próximas peças (05), visão de futuro (06).
Republicar: `vercel deploy --prod --yes --scope aurea-custodia` de dentro da pasta (já linkada).

**04 · Na prática (publicada em 06/11/2026):** celular animado com 5 etapas — Entrar, Enviar, Custódia, Comprar, Vender
— de uma cliente fictícia ("Marina"), recriadas em código (`src/components/pratica/`, orquestrador `Pratica.tsx`): o
Claude não grava a plataforma real nem usa Google Omni, e a plataforma real tem dado verdadeiro dos sócios (nenhum
print entra no site). Os valores saem de `src/lib/jornada.ts` + `src/lib/taxas.ts` (espelho de `fees.ts`): saldo
500,00 → frete 461,10 → custódia 457,10 → compra 172,70 → venda 470,20; resultado do exemplo +R$ 13,10 (preços 280/300
e frete R$ 38,90 são EXEMPLOS marcados na tela; aviso de "não promete valorização"). Cada etapa = lista de tempos,
tela é função do tempo; cursor mede `[data-alvo]`; toque no botão que pulsa avança. Para trocar preços: só `jornada.ts`.
Para o app real a regra de custódia está em CLAUDE.md da Áurea (1º mês entra na compra, moeda só negocia paga).
No painel de navegador oculto o IntersectionObserver não dispara, então o autoplay não roda em teste automatizado.

**Público: clientes, em apresentação PRESENCIAL de lançamento do site e da plataforma.** A comunicação é sobre
possibilidades e conceitos — nunca regra de sociedade, "decisão dos sócios", "teste de entrada" ou qualquer critério
interno de aprovação (correção do Gabriel, 06/11/2026).

**Vocabulário liberado nesse contexto:** "tokenização" e "ativo digital" podem aparecer na apresentação (o Gabriel
confirmou, mesmo contra [[terminologia-juridica-aurea]]). Isso vale só para esse site presencial, não para o produto.
Na parte 5 ficam o selo "Visão de futuro" e o aviso, com o texto exato que o Gabriel ditou (06/11/2026): "A tokenização é
um conceito que pretendemos aplicar no nosso futuro. Hoje, o Real Olímpico opera com recibo de custódia — não com ativos
digitais." Não voltar a falar em "definição regulatória" nem "ainda não está em operação".

**Mensagem central (06/11/2026):** a moeda é a introdução e a **prova de conceito** — um colecionável de escassez bem
definida, valor de mercado conhecido e fácil de guardar — do marketplace de colecionáveis e, mais adiante, da
tokenização. O conceito não se prende só a moedas; a frase da capa diz "moedas comemorativas e de coleção … marketplace
feito para eles". Tom leve, de cliente, sem jargão de sócio ("Em estudo" virou "Possibilidades"/"Na mira").

**Why:** o Gabriel disse que vai corrigindo o site com o Claude depois de publicado.
**How to apply:** ao receber ajustes, editar nessa pasta e republicar; texto novo sempre pensado para cliente; não
confundir com o app principal.
