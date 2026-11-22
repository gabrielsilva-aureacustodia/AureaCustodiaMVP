# Ficha da frente D — Cadastro: Google primeiro e demonstração

```
ID / branch:   D · manut-cadastro-google          Onda de merge: 1          Migration reservada: —
Itens do Rogério: 4 e 8       Prazo: 30/11/2026   Base: 9e21fe1
Aceite em uma frase: quem chega para se cadastrar vê "Continuar com o Google" como o caminho principal, o e-mail fica como alternativa, e existe uma demonstração do cadastro.
```

## Pedido do Rogério (as palavras dele)
Item 4: "Mudar a tela inicial para cadastro com Google antes do cadastro por e-mail, por ser mais rápido."
Item 8: "Fazer demonstração de como cadastrar no site inicial."

## Aceite
- [ ] **`/cadastrar` e `/entrar`** mostram o botão **"Continuar com o Google"** como ação principal (grande, no topo). E-mail e senha ficam atrás de **"Prefiro usar e-mail e senha"** (recolhido), **sem perder nenhum passo do fluxo atual**.
- [ ] Os botões de cadastro da landing já apontam para `/cadastrar`? **Conferir** (a landing **não é de nenhuma frente de código** nesta rodada; D **não a edita**). Se não apontarem, anote no registro para o Controle.
- [ ] **Aceite de termos e dados legais continuam obrigatórios** no caminho do Google (`registerWithGoogle`, `loginWithGoogle`; leia `docs/ENTREGA_AUTH_LANDING.md`).
- [ ] **Contrato D↔E:** o OAuth fecha o ciclo **na mesma janela** (sem popup), porque o app instalado no iPhone não segura popup. Registre no `registro/D.md` o que o iPhone instalado exige; a frente E confere e devolve o que quebrar.
- [ ] **Demonstração (D6):** um **vídeo/GIF curto, passo a passo**, gravado no navegador local **sem criar conta real em produção** e **sem dado de ninguém**, e um bloco **"Veja como se cadastrar"** em `/cadastrar` (leve: WebM ou GIF até ~1,5 MB em `public/demonstracao/`, com `<video>` mudo, sem autoplay com som, com legenda de texto).
- [ ] Texto em português, marca Real Olímpico, **sem** token/NFT/cripto/ativo digital/investimento/rentabilidade. Mobile de 320 a 430 px sem estouro, alvos de 44 px, claro e escuro.
- [ ] Testes dos formulários e do redirect; `npm run build`.

## Ler (e só isto)
`src/app/cadastrar/`, `src/app/entrar/`, `src/components/login/*` (`AuthShell`, `LoginForm`, `RegisterForm`) · `src/server/actions/auth.ts` · `src/server/auth/` (`README.md`, `destino.ts`, `origin.ts`, `provisioning.ts`) · `docs/ENTREGA_AUTH_LANDING.md`, `docs/RELATORIO_FINAL_BRANCH_A_LOGIN_LANDING.md` · `src/components/tutorial/README.md`, `docs/EXECUCAO_TUTORIAL_ONBOARDING.md` (para a demonstração) · CSS de login em `src/styles/`.

## Touch
`src/components/login/**` · `src/app/entrar/**`, `src/app/cadastrar/**` · CSS novo de login · `public/demonstracao/**` (novo).

## Do not touch
`src/components/landing/**` e `src/app/page.tsx` (M) · `src/app/layout.tsx`, PWA (E) · lógica de servidor de `auth.ts` além do mínimo para o fluxo novo.

## Fora de escopo
Novo provedor de login (Apple, Facebook), mudar regra de termos, tutorial do app logado.

## Decisões pendentes
**D6:** vídeo curto **e** bloco no site (padrão). Se o Gabriel quiser só um dos dois, remove-se o outro.

## Tópicos
| T | O quê | Aceite do tópico |
|---|---|---|
| T1 | Ler o fluxo atual e desenhar a tela (rascunho em texto no MD) | desenho no MD |
| T2 | Tela de cadastro e de entrada com Google primeiro | navegador local, 320–430 px e desktop |
| T3 | Ciclo OAuth na mesma janela + registro do que o iPhone exige | anotado para E |
| T4 | Demonstração (Específico grava) + bloco "Veja como se cadastrar" | arquivo leve no lugar, tela conferida |
| T5 | Testes e build | verdes |

## Específico (sim)
Grava a demonstração com o navegador em ambiente **local** (sem criar conta real; pare **antes** da tela de consentimento do Google). Entrega WebM/GIF e a versão para o WhatsApp (MP4) em `C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\entregas\` (fora do Git).

## Superfície protegida
Nenhuma esperada.
