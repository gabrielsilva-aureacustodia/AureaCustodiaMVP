# Benchmark e decisões — painel administrativo (frente 2)

```
Feito em:  30/10/2026 (sessão 1 desta frente), branch polish/aurea-admin, base origin/main @ d29727a
Citado por: src/components/admin/navegacao.tsx ("o desenho dos painéis de finanças e marketplace estudados em
            docs/polimento/admin/BENCHMARK.md"). O arquivo não existia; esta é a primeira versão versionada.
Método:    Distilla lido direto, sem API: agentes/distilla/DISTILLA.md §4 (cinco lentes), §7–§8 (regras), design/mapa.md,
            conceitos 21 (densidade), 23 (dados densos), 27 (ações), 29 (estados), 30 (erro), 32 (busca e filtros),
            toolkits/direcao-de-design/taxonomia-de-componentes.md, topicos/29 e 35–36, docs 17 e 20.
```

## 1. O que este benchmark é — e o que não é

Em 25/10/2026 o painel foi redesenhado com o brandbook (`3f50da6`) e remodelado por tarefa (3 grupos de menu, abas por URL, duas zonas).
As decisões daquela rodada foram escritas num benchmark que nunca entrou no Git; aqui o que vale é **o estado do código hoje**.

Nesta sessão **não houve navegação em sites externos**: a comparação é com o que o repositório do Distilla já estudou e mediu
(docs 17 e 20, conceito 23 com NN/g, Carbon, GOV.UK e Cloudscape para tabelas e painéis), e a medição é do próprio painel
(INVENTARIO §5–§6). Onde faltou dado — papéis `socio` e `operacao`, tela com dados reais — está dito.

## 2. Passada das cinco lentes (DISTILLA.md §4)

Evidência: **[MEDIDO]** no navegador local (INVENTARIO §6), **[CÓDIGO]** lido no repositório, **[NÃO MEDIDO]** precisa de dado ou de outro navegador.

| Lente | O que o painel já tem | Achado e decisão |
|---|---|---|
| 1 Estrutura e hierarquia | Menu por tarefa, Central de trabalho com "Pede ação agora" × "Em dia", abas por URL, uma primária por tela [CÓDIGO] | Título do documento igual em todas as 17 telas medidas (`Painel administrativo — Real Olímpico`): quem navega por leitor de tela, histórico ou várias abas não distingue a página (R3) |
| 2 Responsividade e toque | Alvo de 44 px (32 regras), gaveta ≤ 1080 px, bloco "Celular e tablet" no `admin.css` [CÓDIGO]; **0 rolagem horizontal em 108 combinações** [MEDIDO] | `100vh` sem `dvh` na coluna do menu (R7). Tabela de 7 colunas com linha de 63–88 px: no celular cada linha vira um bloco alto (R5) |
| 3 Componentes e peças | `Pecas.tsx` (`Secao`, `Indicador`, `Selo`, `Abas`, `Vazio`) e os componentes de marca (`Selo`, `EstadoVazio`, `Aviso`, `Esqueleto`) [CÓDIGO] | **46** `div.table-scroll` repetidos à mão: o padrão "tabela que rola" pede um componente (R2). 48 `style={{}}` (R6); parte é valor dinâmico de gráfico, parte é layout que deveria ser classe |
| 4 Movimento, som e estados | `loading.tsx` e `error.tsx` do painel, `ConfirmarAcao` em dois passos, `prefers-reduced-motion` [CÓDIGO] | Sem som (painel interno). Estados vazios e de aviso conferidos nas 9 telas sem banco [MEDIDO]. Estados com dado real **[NÃO MEDIDO]** |
| 5 Acabamento | axe: 15 das 18 rotas sem violação; 3 achados reais (R1, R2) e 1 de boa prática (R4, `heading-order` em Bancada e Notas fiscais) [MEDIDO] | Sem `@media print`: o DRE e a ficha da moeda saem com menu e topbar no Ctrl+P (R8) |

## 3. Tabelas e painéis contra o conceito 23 (dados densos)

Critérios do conceito 23 ("medidas") aplicados às 8 tabelas que existem nas telas sem banco [MEDIDO em 1440 px, `adm-extra.mjs`]:

| Critério (fonte) | Resultado |
|---|---|
| Cabeçalho fixo (`position: sticky`) quando a tabela passa da tela (NN/g, Carbon) | **8 de 8** |
| Com rolagem lateral, 1ª coluna fixa (doc 35 §5) | **8 de 8** |
| Números alinhados à direita (GOV.UK `--numeric`) | **sim** em todas as colunas numéricas (Saldo, Moedas, Valor, Volume, Comissões, Quantidade); "Código" do DRE é texto e fica à esquerda, correto |
| `<caption>` em 100% das tabelas (GOV.UK, axe) | **8 de 8** (e 0 `<table>` sem caption no código) |
| Uma altura de linha por tabela (Carbon: 24/32/40/48/64) | **não**: Usuários 63; Acervo 88; Receita por linha 85/63/42; Receita de comissão 86/42. Linhas altas por quebra de célula, não por desenho (R5) |
| Região que rola alcançável por teclado (WCAG 2.1.1; axe `scrollable-region-focusable`) | **não** em 3 telas (R2) |
| Gráfico de painel só em barra ou linha; sem pizza, rosca, medidor ou 3D (NN/g) | [CÓDIGO] `GraficoMensal` é de colunas, sem JS; nenhuma pizza no painel |
| Todo gráfico com tabela equivalente e título que diz a conclusão (doc 24 Y18) | [NÃO MEDIDO] — depende de série real |

## 4. Brief curto do painel (princípios em ordem de desempate)

1. **A ação sensível pede o nome do objeto** — "Confirmar: pagar o saque de R$ X a Fulano". Vence qualquer ganho de espaço.
2. **O que pede ação vem antes do que informa** — "Pede ação agora" no topo; número que pede ação é link.
3. **Quem não pode, não vê o botão; quem vê, pode** — o menu esconde, o servidor recusa. Esta frente não toca nisso.
4. **Teclado e leitor de tela primeiro** — `button`/`a` de verdade, região rolável alcançável, página com título próprio.
5. **O sistema vence a exceção** — componente e classe em vez de `style={{}}`; cor só de `--ro-*`.

> Desempate: se "o que pede ação vem antes" (2) brigar com "uma altura de linha" (densidade), vence a ação.

## 5. Decisões (cada uma com a referência)

| # | Decisão | Referência |
|---|---|---|
| D1 | `TabelaRolavel` em `Pecas.tsx`: região (`role="region"`, `tabIndex=0`, nome = legenda da tabela), usada nos 46 lugares | conceito 23 (WCAG 1.4.10 / 2.1.1); taxonomia: padrão composto sobre primitivo |
| D2 | Cada rota com `metadata.title` próprio, no modelo "`Saques — Painel Real Olímpico`" | WCAG 2.4.2; conceito 25 (arquitetura de informação) |
| D3 | Recibo da rota "ver como o cliente vê" com contraste AA (`ouro-800` e `pergaminho-600` locais ao `.cert`) | WCAG 1.4.3; mesma correção da frente 1 (PR #13) |
| D4 | Ordem de títulos sem salto em Bancada e Notas fiscais | axe `heading-order`; conceito 14 (hierarquia) |
| D5 | Célula "Recibo" do acervo sem quebra no meio do código (`REC-000001` em uma peça só); uma altura de linha | conceito 23 e 21 (densidade) |
| D6 | `dvh` no menu lateral | topicos/35 passo 3 |
| D7 | Impressão do DRE e das fichas: só o conteúdo | topicos/29 §J |
| D8 | Nenhuma feature removida; nenhuma permissão, texto de título de página ou rótulo de botão do §4 do INVENTARIO muda | regra da frente |

## 6. Propostas que **não** apliquei (dependem de decisão)

| # | Proposta | Por que ficou de fora |
|---|---|---|
| P1 | Atalho de tecla única `/` para a busca (além do Ctrl K): o tópico 35 passo 15 e a WCAG 2.1.4 pedem opção de desligar ou remapear atalho de tecla única | Tirar ou condicionar um atalho é mudar comportamento pedido; o Gabriel decide |
| P2 | Filtros ativos como chips-link removíveis e "Limpar filtros" nas listas (doc 17 P2) | Componente novo de filtro em 4 telas; só faz sentido com dado real para ver o efeito |
| P3 | Visibilidade de colunas por `<details>` na tabela de acervo (doc 17 P3) | Mesma razão, e mexe no contrato de URL das tabelas |
| P4 | Gráficos em SVG/`<meter>` no lugar de barras com `style={{width}}` (doc 17 P4) | Depende de ver os gráficos com série real; entra nos 48 `style` se houver dado |

## 7. Peças visuais e textos para workers

**Nenhuma até aqui.** O painel usa só os componentes e a marca existentes (`src/components/ui/`, `/brand/`); não pedi ilustração, ícone nem revisão
de texto. Se aparecer, o pedido vai para `/workspace/aurea-polimento/pedidos_workers.md` (uma linha por pedido) e não é gerado aqui.

## 8. Fontes

- `agentes/distilla/DISTILLA.md` §4, §7–§8; `design/mapa.md`; `design/conceitos/{14,21,23,27,29,30,32}`; `toolkits/direcao-de-design/taxonomia-de-componentes.md`.
- `topicos/29-checklist-qa-final.md` (A, B, J), `topicos/35` (passos 3 e 15), `topicos/36` passo 14; docs 17 (P2–P4) e 20.
- Medição própria em `docs/polimento/admin/INVENTARIO.md` §5–§6.
