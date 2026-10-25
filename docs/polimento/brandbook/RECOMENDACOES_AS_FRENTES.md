# Recomendações às frentes 3, 4 e 5 — o que ajustar por causa do Brandbook

```
De:      Frente 1 (feat/brandbook-real-olimpico), 25/10/2026
Base:    contrato de tokens no commit 2088297 (merge primeiro dele); sistema completo no commit final da Frente 1
Ler:     docs/marca/BRANDBOOK_REAL_OLIMPICO.md §1 (princípios), §4.3 (papéis), §5.2 (escala), §9 (componentes), §12
Regra:   a Frente 1 NÃO edita os CSS de tela. Nada abaixo é obrigatório para o merge não quebrar — todo nome antigo
         continua existindo. É o que leva a tela ao nível do sistema novo.
```

## 0. Para as três frentes

### 0.1 O que muda sozinho no merge (sem vocês fazerem nada)
- **Fontes**: Newsreader nos `h1–h3`/`.serif`, Inter no resto. A Inter tem altura-x ~12% maior que o Source Sans 3: o
  mesmo `font-size` **parece maior**. Conferir quebra de linha em barra lateral, botão estreito e tabela a 375 px.
- **`.btn`, `.field`, `.tinput`, `.panel`, `.modal`, `.toast`, `.switch`, `.empty`, `.back-link`**: repaginados em
  `base.css` com os papéis novos (metal no botão dourado, borda de campo AA, anel de foco em todo controle, modal que
  "assenta").
- **16 variáveis fantasmas** passam a existir (`--border`, `--text-main`, `--card-bg`, `--bg-card*`, `--bg-subtle`,
  `--bg-alt`, `--card-subtle`, `--shadow-sm/md/lg`, `--gold-subtle`, `--gold-tint-30`, `--danger`, `--ff-serif`). No
  **tema claro**, `pagamento.css`, `MinhasOfertas`, `FaturasCustodia` e `compras/page.tsx` deixam de mostrar texto
  `#f8fafc` invisível — confiram essas telas no claro.
- `color-scheme` por tema: campos nativos, barra de rolagem e calendário do `<input type="date">` acompanham o tema.

### 0.2 Troca mecânica (busca e substitui, por arquivo seu)
| Antes | Depois | Por quê |
|---|---|---|
| `color:var(--gold)` (texto, link, ícone) | `color:var(--ro-primaria-texto)` | 2,40:1 → 6,16:1 no claro. Fundo dourado continua `--gold`/`--ro-primaria` |
| `color:var(--red)` em texto | `color:var(--ro-perigo-texto)` | 3,93:1 → 5,56:1 no escuro |
| `color:var(--green)` em texto | `color:var(--ro-sucesso-texto)` | par AA por tema |
| `border:1px solid var(--line-soft)` em **controle** (campo, select, checkbox) | `var(--ro-borda-campo)` | 1,6:1 → 3,9:1 (WCAG 1.4.11) |
| `body[data-theme="light"] .x{color:...}` para corrigir contraste | apagar a regra; usar o papel `--ro-*-texto` | o papel já troca com o tema |
| `font-size:13.5px`, `14.5px`, `12.5px`… | `var(--ro-tipo-corpo-sm)`, `--ro-tipo-legenda`, `--ro-tipo-corpo` | 17 tamanhos distintos só na landing |
| `rgba(201,162,75,.x)` e hex soltos | `--gold-tint-*`, `--ro-primaria-veu` ou `color-mix(in srgb,var(--ro-ouro-500) X%,transparent)` | cor com origem só |
| `transition:… .2s ease` | `var(--ro-dur-rapida) var(--ro-curva-saida)` | zera sozinho com movimento reduzido |
| `border-radius:9px/11px/12px` | `--ro-raio-sm/md/lg` | raio por elemento |
| `z-index:50/60` | `--ro-z-modal`, `--ro-z-toast` | |

Levantamento (`grep` em 25/10/2026) — **texto dourado** / **cores literais** por arquivo: landing 32 / 114 · market 13 / 7
· legal 12 / 28 · admin 5 / 0 · home 5 / 6 · shell 4 / 2 · tutorial 3 / 0 · login 2 / 3 · wizard 2 / 0 · account 2 / 0 ·
recibo 1 / 28 (o certificado é exceção: `--cert-*` fica) · reports 1 / 3 · pagamento 0 / 28.

### 0.3 Componentes novos para usar em vez de inventar
`<Selo tom>` (situação), `<Aviso tom titulo>` (recado ao lado da ação), `<EstadoVazio titulo arte acao>`,
`<Esqueleto>`, `<LogoMarca>`/`<LogoEmblema>`, **`<CartaoMoeda>`, `<FaixaAbertura>`, `<ImagemDaMarca>`** e
`<EstadoVazio ilustracao="semItens">` — imagem da Frente 2 **só pelo catálogo `src/brand/ativos.ts`**, nunca caminho
escrito à mão (o catálogo sabe o que está pendente e cai para a foto real); classes `.ro-sobretitulo`, `.ro-display(-xl)`, `.ro-titulo-1/2/3`,
`.ro-valor`, `.ro-tabela`, `.ro-abas`, `.ro-chip`, `.ro-passos`, `.ro-cartao(-interativo|-moeda)`, `.ro-vitrine-luz`,
`.ro-faixa` + `.ro-guilloche`, `.ro-filete`, `.ro-serrilha`, `.ro-container`, `.ro-secao`, `.ro-grade-auto`,
`.ro-revela`; variantes `.btn-ghost`, `.btn-danger`, `.btn-sm`, `.btn-lg`.

### 0.4 Vocabulário (achado no levantamento)
"Corretagem" aparece em `src/app/taxas/page.tsx` e `src/app/suporte/page.tsx` (e no título da Tabela de Taxas). O piso
jurídico proíbe "corretora/corretagem" para a plataforma: trocar por **"comissão de negociação"**. Se o texto vier de
`src/domain/` (Termos e Tabela versionados), é superfície protegida → `PROPOSTAS_BACKEND.md`.

---

## 1. Frente 3 — Landing (`landing.css`, `legal.css`, `login.css`, `src/app/page.tsx`, `/taxas`, `/termos`…)

Registro **vitrine** (Brandbook §1.2). Liberdade de reorganizar dada pelo Gabriel em 25/10/2026. Estrutura proposta:

1. **Herói** em `.ro-guilloche`, altura ≤ 100 svh: `.ro-sobretitulo` ("Custódia de moedas comemorativas") →
   `h1.ro-display-xl` com **uma** palavra em `<em>` (ex.: "Sua moeda no cofre. *Negociável* a qualquer hora.") →
   `.ro-corpo-lg` de 2 linhas → **um** `.btn.btn-gold.btn-lg` ("Criar conta") + `.btn.btn-ghost` ("Como funciona").
   À direita, `public/visuais/moedas/moedas-dupla-par-hero-*.avif` com `fetchpriority="high"` e `sizes` (é o LCP).
   O giro de 24 quadros (`public/visuais/animacoes/giro-bandeira/`) só aparece **depois** do LCP e só sem movimento
   reduzido.
2. **Faixa de confiança** — três `.ro-cartao` com ícone de traço: "Cofre físico" (foto `cenarios-cofre-custodia-hero`),
   "Recibo no seu nome", "Taxas abertas". Nada de "100% seguro".
   **Imagem de "a moeda fica guardada no cofre": use `<ImagemDaMarca id="jornadaCofre">`** (gaveta do cofre com forro
   de veludo). **Não use `cenarios-lacre-de-custodia`**: foi reprovado três vezes e retirado do catálogo por decisão do
   Gabriel (25/10/2026, Brandbook §13.4.3). Conferido em 25/10/2026: a worktree da landing só o cita num comentário de
   `src/components/landing/visuais.ts` (na lista do que não se usa) — nada a trocar em código; atenção só ao
   `public/visuais/README.md` da Frente 2, que ainda o indica para a "faixa de confiança". As worktrees da plataforma e do
   admin têm o catálogo antigo (com o ativo do lacre pendente) e recebem a remoção no próximo `git merge` desta branch.
3. **Como funciona** — `ol.ro-passos` com 4 passos (enviar → perícia e lacre → recibo → negociar/retirar).
4. **As duas moedas** — `.ro-grade-auto` de `.ro-cartao-moeda` com `.ro-vitrine-luz`, nome em serifa, "valor estimado"
   com `.ro-numero` (o número vem do servidor, nunca da imagem).
5. **Quanto custa** — `.ro-tabela` com comissão, custódia e tarifa lidas da configuração vigente; link para `/taxas`.
6. **Perguntas** — `<details>` nativos (funcionam sem JS).
7. **Rodapé** — `.ro-serrilha` no topo, `LogoMarca` 120 px, links, assinatura institucional (`AUREA CUSTODIA LTDA · CNPJ`).

`/entrar` e `/cadastrar`: cartão central sobre `.ro-guilloche`, `LogoMarca` 120 px (hoje 190), título `ro-titulo-2`, o
link "Criar conta" em `--ro-primaria-texto`. Páginas legais: largura `--ro-container-texto`, `h2` em `ro-titulo-2`,
`.ro-filete` entre seções, "Imprimir/Salvar PDF" como `.btn-outline.btn-sm`.

OG: `public/visuais/og/og-compartilhamento-padrao-1200.webp` + título em `next/og`.

**Medido no fechamento da Frente 1 (25/10/2026):** `.landing-specimen-btn` (40 px) e `.landing-sim-preset-btn` (36 px)
ficam abaixo do toque de 44 px — os únicos 5 de 9 botões visíveis da landing fora do piso. Subir para
`min-height:var(--ro-alvo-toque)` ou trocar por `.ro-abas` / `.ro-chip` dentro de um alvo de 44 px.

## 2. Frente 4 — Plataforma (`shell.css`, `home.css`, `market.css`, `wizard.css`, `recibo.css`, `reports.css`, `account.css`, `pagamento.css`, `tutorial.css`)

Registro **cofre**. Estrutura proposta:

- **Casco**: barra lateral em `--ro-superficie` com `LogoEmblema` 40 px + "Real Olímpico" escrito (o `logo-sidebar` de
  92 px vira emblema pequeno); item ativo com `aria-current="page"`, filete dourado de 2 px à esquerda e fundo
  `--ro-primaria-veu`. Abaixo de 1080 px, a gaveta atual (responsive.css) continua.
- **`/inicio`**: `.ro-faixa.ro-guilloche` no topo — saudação (`.ro-sobretitulo` com a data), saldo em `.ro-valor`
  (centavos em `<small>`), moedas no cofre e um `.btn-gold` ("Negociar"); abaixo, `.ro-grade-auto` de `.ro-kpi`
  (custódia paga até, ofertas abertas, envios em trânsito) e `<Aviso tom="aviso">` quando houver custódia a pagar.
- **Mercado / vender**: `.ro-abas` por tipo de moeda (um livro por tipo é regra de negócio — a aba só deixa isso
  visível); livro de ofertas em `.ro-tabela` com `.num`; situação em `<Selo>`; o "valor estimado" (mediana de 24 h) em
  `.ro-valor` com a palavra "estimado" sempre ao lado.
- **Recibos**: galeria de `.ro-cartao-moeda` com o render em ¾ (pedido 2.1/2.2 ao Antigravity); detalhe com o macro de
  serrilha; o certificado (`.cert`) **não muda** — `--cert-*` intactos.
- **Envios (wizard)**: `ol.ro-passos` como trilho; no "envio recebido", a imagem é `jornadaCofre` (o lacre foi retirado); foto de envio em `.ro-vitrine-luz`; etiqueta e frete com `<Aviso>`.
- **Estados vazios**: `<EstadoVazio arte="/visuais/onboarding/onboarding-vazio-sem-itens.svg">` e
  `onboarding-vazio-sem-ordens.svg`.
- **Carregamento**: `<Esqueleto>` no lugar de "Carregando…" onde o servidor demora (mercado, extrato).
- **Pagamento** (`pagamento.css`): é o arquivo com mais fallback escuro escrito à mão; trocar os 28 literais pelos
  papéis e conferir no tema claro.

**Medido nas telas logadas (25/10/2026, conta de teste, `/inicio`, `/mercado`, `/recibos`, `/conta`):** no escuro,
nenhum texto abaixo do AA e nenhuma rolagem lateral a 375 px. No **claro**, os únicos textos reprovados são os que ainda
usam `--gold` como cor de texto — exatamente a troca do §0.2:
- saldo da barra superior `.ubal` (2,20:1) e os links "Ler termos" / "Tabela de Taxas" da barra de aviso (2,20:1) —
  `shell.css`;
- `.tour-etapa` do tutorial (2,40:1) — `tutorial.css`.

Alvos de toque abaixo de 44 px: `.topbar-alert-btn` (36 e 40 px, `shell.css`), no `/mercado` 6 `.btn` de 32 px, 2–3 de
36 px, `.chart-tab` de 33 px e 4 botões de 28 px (`market.css`).

## 3. Frente 5 — Admin (`admin.css`, `src/app/(admin)/**`)

Registro **cofre, denso**. O admin não carrega o `AppState` do cliente, mas carrega `globals.css` — recebe tudo do §0.1.
- Tabelas em `.ro-tabela` dentro de `.table-scroll`, 1.ª coluna fixa (`position:sticky`, fundo `--ro-cartao-base`) a
  partir de 1080 px.
- `.btn-sm` liberado no desktop (36 px), mas **44 px** abaixo de 1080 (regra do toque).
- Toda situação de fila (saque, envio, análise, NFS-e) em `<Selo>`: solicitado → aviso, pago/emitida → sucesso,
  recusado/cancelada → perigo, em análise → info.
- Ação irreversível (recusar saque, cancelar nota) em `.btn-danger` + confirmação na própria modal.
- Spots `public/visuais/admin/*.svg` só em estado vazio de fila; nada de vitrine nem guilhoché no admin.
- Painel inicial do admin: `.ro-grade-auto` de `.ro-kpi` (saques a pagar, envios a receber, faturas vencidas).

---

## 4. Ordem sugerida
1. `git merge feat/brandbook-real-olimpico` (depois do commit final da Frente 1).
2. Conferir as telas no **claro e no escuro**, desktop e 375 px (as fontes mudaram de métrica).
3. Troca mecânica do §0.2 no seu CSS.
4. Reorganização da sua seção acima.
5. Skill `revisao-de-design` (aprendizado_frontend) na tela antes de fechar a branch.
