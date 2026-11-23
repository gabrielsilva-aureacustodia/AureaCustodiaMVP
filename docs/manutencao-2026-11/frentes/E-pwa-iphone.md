# Ficha da frente E — App: PWA funcionando no iPhone

```
ID / branch:   E · manut-pwa-iphone               Onda de merge: 1          Migration reservada: —
Item do Rogério: 10b          Prazo: 30/11/2026   Base: 9e21fe1
Aceite em uma frase: o Real Olímpico instala e abre como app no iPhone (e continua no Android), ou o relatório diz com prova o que é limite da Apple e o que é defeito nosso — e o defeito nosso está corrigido.
```

## Pedido do Rogério (as palavras dele)
"Você mandou que o Real Olímpico pode ser visualizado como app, mas isto não está funcionando, principalmente no iPhone."

## Contexto
O PWA foi entregue em 05/11/2026 (`2b48b04`) e **nunca foi testado em aparelho real** (`docs/pwa/MD_EXECUCAO.md`, pendências). A decisão D5 do próprio MD já registra que o iPhone **não tem sinal de instalação** visto do Safari.

## Aceite
- [ ] **Diagnóstico** `DIAGNOSTICO_PWA.md`: causa(s) por evidência, separando **limite da Apple** de **defeito nosso**. Checar, no mínimo:
  1. `start_url` e `scope`: a URL inicial responde 200 sem redirecionar? (`/inicio` redireciona 307 para `/entrar` sem sessão) · 2. o **app instalado no iPhone não compartilha cookie com o Safari** (fato do iOS): o cliente precisa entrar **de novo dentro do app** — o fluxo prevê isso e a tela inicial do app é utilizável? · 3. **login Google dentro do app instalado** (popup/redirect; contrato D↔E) · 4. `apple-touch-icon` 180×180 e metatags iOS (`appleWebApp`, título, barra de status) realmente no `<head>` renderizado · 5. `display: standalone`, ícones 192/512 `any` e `maskable` · 6. o service worker controla a página e não serve HTML velho de saldo (D1 do MD do PWA) · 7. cabeçalhos de `/manifest.webmanifest` e `/sw.js` · 8. o botão/banner e o painel de instruções batem com o iOS **atual**.
- [ ] **Correções do que é defeito nosso** (manifest, metadados, SW, middleware/rotas públicas, fluxo de abertura do app instalado, painel de instruções do iPhone). Cada correção com o teste que a prova.
- [ ] **Painel "Como instalar no iPhone" revisado** com o passo a passo real do iOS de hoje (Safari → Compartilhar → Adicionar à Tela de Início; Chrome do iPhone a partir do iOS 16.4; o que muda no navegador do Instagram/Facebook).
- [ ] **Provas:** Lighthouse/instalabilidade no Chrome, emulação de WebKit (Playwright) do manifesto e do SW, e uma **tabela "o que testei aqui × o que só um aparelho real prova"**. O **teste no iPhone real fica com o Gabriel/Rogério**, com roteiro de até 10 linhas pronto no relatório.
- [ ] **Android:** reconfirmar que instala e abre (Chrome).
- [ ] `npm run typecheck`, `npm test`, `npm run build` ao fim da branch.

## Ler (e só isto)
`docs/pwa/MD_EXECUCAO.md` · `src/app/manifest.ts`, `src/app/sw.js/route.ts`, `src/app/apple-icon.png` · `src/lib/pwa/*` (`README.md`, `ATALHOS.md`, `service-worker.ts`, `instalacao.ts`, `navegador.ts`) · `src/components/pwa/*` · `src/app/layout.tsx` (**só** `metadata`/`viewport`) · `src/middleware.ts`, `src/server/rotas-publicas.ts` · `next.config.mjs` · `public/pwa/`, `public/offline.html` · `RISCOS_ASSUMIDOS.md` (RA-60).

## Touch
Arquivos de PWA acima · **o bloco `metadata`/`viewport` de `layout.tsx`** (dono) · `src/middleware.ts` e `rotas-publicas.ts` (dono; mudança **mínima**, protegida por teste: `src/middleware.test.ts`) · `public/pwa/**`.

## Do not touch
`src/components/login/**` e `src/app/entrar|cadastrar` (D — peça a D) · landing · qualquer regra de negócio.

## Fora de escopo
App nativo (Swift/Kotlin), publicação em App Store ou Play Store, notificações push, modo offline com dados.

## Tópicos
| T | O quê | Aceite do tópico |
|---|---|---|
| T1 | Diagnóstico estático (os 8 pontos) + pesquisa dos requisitos atuais do iOS (Específico) | `DIAGNOSTICO_PWA.md` v1 |
| T2 | Emulação WebKit/Chrome: manifest, SW, instalabilidade | tabela de evidências |
| T3 | Correções de defeito nosso + testes | verde |
| T4 | Painel de instruções do iPhone revisado + roteiro do aparelho real | texto aprovado no MD |
| T5 | Contrato com D (OAuth no app instalado) + suíte da branch | verde; pendência de D anotada |

## Específico (sim)
Pesquisa dos requisitos do iOS vigente para instalar e abrir PWA (cite versão do iOS, data e fonte) e a emulação com WebKit. Entrega o arquivo com a conclusão no topo.

## Superfície protegida
Nenhuma. **Atenção:** `middleware.ts` protege as rotas autenticadas; qualquer mudança nele precisa de teste que prove que nenhuma rota logada ficou pública.
