# Relatório de Execuções (detalhado) | 22/11/2026 (janela 21 a 23/11)

```
Projeto:     Áurea Custódia / Real Olímpico (AUREA CUSTODIA LTDA)
Branch:      main (sem branch nova, pasta completa; Método Eficiente v2.2)
ref_commit:  base 5f76b36 → 8fb5e34 (53 commits, 22/11 18:00 a 23:03)
Janela:      21/11 a 23/11/2026. 21/11 e 23/11 sem commit; todo o trabalho é de 22/11
Gerado em:   23/11/2026
Público:     o próximo agente
```

Escopo do dia: duas Garantias de Execução, **Manutenção Pendências 22-11** (T1–T6) e **Relatório QA do Davi 22-11** (R1–R4), mais Auditoria, Polimento, Tester, Merge/Deploy, Relatórios, Higienização e Processo Padrão. O que cada MD de execução já cobre está em `docs/diario/execucoes/2026-11-22--*--MD_EXECUCAO.md`; aqui só a ordem real e o que mudou.

## 1. Tópicos na ordem real

| # | Hora | Tópico | Resultado | Commit |
|---|---|---|---|---|
| 1 | 18:00 | Central de Organização criada (índices de continuidade, planos, relatórios, chats, memórias) | pasta nova na raiz, só cópias | `66d6673` |
| 2 | ~20:11 | **T1 Financeiro**: saldo dos clientes, taxas pagas com custódia, ficha por conta, troca de e-mail sem reescrever o livro-razão | feito, migration 058 aplicada em produção antes do código | `d570215` |
| 3 | ~20:11 | **T2 Isenção Áurea/CEO** e **T3 Balcão** (peso padrão, gravador de vídeo) e **CPF ou CNPJ** | feito | `1e6b775` |
| 4 | 20:12–20:25 | Fechamento da Manutenção: RETOMADA, perguntas da frente B ao contador, índice, memórias | MD | `282e55d` |
| 5 | 20:29 | **T6 PWA/Google no app**: callback tolerante, aviso no login em modo app | feito | `019947c` |
| 6 | 20:34 | **T5 KPIs do conselho** (pagante, churn por motivo, margem por moeda) + código da moeda em cada negociação (migration 059) | feito | `6c3f79f`, `66e0dd2` |
| 7 | 20:38–20:42 | Pendências de e-mail para 23/11; variável `SUPABASE_SERVICE_ROLE_KEY` conferida | MD | `1e09864`, `cb259d3` |
| 8 | 20:39 | **R1 Segurança** (B01 visão por usuário, cookie Secure, CSP em relatório, fuso fixo nas datas) | feito | `4c2df93` |
| 9 | 20:39 | **R2 Cadastro** (validações B03/A16, Esqueci minha senha, e-mail pendente) | feito, depois parcialmente revertido (ver 17) | `4026823` |
| 10 | 20:39 | **R3 Dinheiro** (saque em dias úteis, validação do depósito, oferta sem saldo, ano travado) | feito | `6140f17` |
| 11 | 20:39 | **R4 Texto e usabilidade** (404 em português, plural, Esc/clique fora, tutorial) | feito | `4b2f48f` |
| 12 | 20:42–20:51 | Testes: regressão do B01, estorno do frete sem depender da data, editar cadastro com CPF/CNPJ | verdes | `e97a19e`, `2d25296`, `06bfba3` |
| 13 | 20:58–21:04 | A09 faixa de cookies + CSP bloqueante; A08/B09 no servidor; Termos 2.2, Arbitragem 2.2, Política 2.1, Taxas 2.4 | feito | `a4d5488`, `5a39b89`, `f8ede77`, `a267335` |
| 14 | 21:11–21:17 | CSP volta a Report-Only por suspeita de #310; reversão: era artefato do painel oculto do navegador de teste, CSP volta a bloquear | resolvido | `5c9e7da`, `ee28f3b` |
| 15 | 21:18–21:30 | Tabela de Taxas 2.5 (Retirada Segura sem seguro de valor); faixa de cookies baixa no celular; "Saiba mais" 44 px; executor de uso único publica os 4 documentos no banco | no ar | `e3f8958`, `18630a9`, `f484c6f`, `895b924`, `81f2cfa` |
| 16 | 21:36–21:50 | Status final do QA; Central atualizada | MD | `44db26f`, `ba50887`, `65db7a9` |
| 17 | 21:54–22:22 | **B02 encerrado por reversão** (conta nasce confirmada); cadastro por e-mail passa a **entrar direto**; cookies presumidos com selo que some, Termos 2.3; botão Ver tutorial vira bolinha; plural de moeda; Google sem aceite novo para conta existente | no ar | `91cccf2`, `d84f795`, `3219429`, `0a9deae`, `3734866`, `978bc60`, `e86252d` |
| 18 | 22:25–22:31 | Textos contraditórios corrigidos (link por e-mail, tutorial sem depósito simulado, "Pix ou cartão", "E-mail da conta: Ativo", "Código de exemplo") | no ar | `0a570eb`, `ad95fb1`, `6526e6f`, `00cfcfd` |
| 19 | 23:03 | Central e pendências com o estado verificado | MD | `8fb5e34` |

## 2. Escritas em produção feitas à mão (autorizadas pelo Gabriel; backups fora do repositório)

1. **Livro-razão:** hashes dos ids 493–624 recalculados (132 linhas) depois de uma troca de e-mail antiga ter quebrado a cadeia. Resultado: 382 lançamentos, 0 quebras; soma do ledger = saldo em todas as contas. Só hashes mudaram.
2. **Migration 058** (`email_historico`, sem a FK que forçava reescrever o livro) aplicada **antes** do código.
3. **T3 balcão:** 18 posições de caixa reordenadas pelo código e depois **revertidas** ao lugar físico (decisão "lugar físico vale"); cadeia de hashes das análises refeita do GENESIS (257) e `recibos.hash` (253); 11 envios de Bandeira com peso 7 mg corrigidos para 7000 mg; vídeos de 4 envios ligados (RO-ENV-0012, 0024, 0037, 0044); fatura de R$ 52 da Áurea cancelada.
4. **Documentos legais** publicados no banco pelo executor `scripts/publicar-documentos-legais.test.ts` (Termos 2.2→2.3, Arbitragem 2.2, Política 2.1, Taxas 2.5). Idempotente; não toca em aceites.
5. **Limpeza do Tester:** conta de teste `qa.teste.2211@…` criada e apagada (aceites, ledger, users e login do Supabase), cauda das correntes de hash conferida antes. Login de `a@a.co` removido do Supabase Auth.
6. **Variáveis na Vercel:** `NEXT_PUBLIC_AUREA_CONTA_PROPRIA_EMAIL` e `NEXT_PUBLIC_AUREA_CONTA_CEO_EMAIL` (production, preview, development).

## 3. Arquivos tocados (resumo; 169 arquivos de código, +4.747/−827)

Agrupados por porquê. Lista completa: `git diff --name-status 5f76b36 8fb5e34 -- src scripts next.config.mjs public`.

| Grupo | Caminhos principais | Porquê |
|---|---|---|
| Financeiro | `src/domain/admin/financeiro.ts`, `src/server/admin/{resultados,ficha}.ts`, `Financeiro.tsx`, `AbaFinanceiro.tsx`, `src/server/db/repositories/{users,ledger}.ts` | saldo dos clientes explicado centavo a centavo; troca de e-mail não toca o livro |
| Isenção e PJ | `src/domain/isencao.ts`, `cpf.ts`, `cadastro.ts`, `custodia-da-moeda.ts`, `cobranca-de-entrada.ts`, `market.ts` | Áurea e CEO sem custódia; CPF ou CNPJ |
| Balcão | `GravadorDeVideo.tsx`, `BancadaWeb`, `bancada.ts`, `cadastro-direto.ts`, `cadastro-sem-envio.ts` | peso mínimo 1 g; caminho do vídeo guardado por protocolo |
| KPIs | `src/domain/kpis.ts`, `kpis-conselho.ts`, `Conselho.tsx`, `types.ts` (`Trade.coinIds`), `diff.ts`, `repositories/trades.ts` | KPIs do conselho com comissão por moeda |
| Segurança | `estado-do-usuario.ts` (domínio e servidor), `(app)/layout.tsx`, `api/state/route.ts`, `csp.mjs`, `next.config.mjs`, `auth/client.ts`, `dates.ts` | B01: cliente só recebe o que é dele; CSP; cookie Secure; fuso fixo |
| Cadastro e login | `validacao-cadastro.ts`, `auth.ts`, `LoginForm.tsx`, `RegisterForm.tsx`, `callback/route.ts`, `AvisoDoGoogleNoApp.tsx` | validação no servidor e no navegador; entrar direto; Google no app |
| Dinheiro | `dias-uteis.ts`, `validacao-dinheiro.ts`, `AccountModals.tsx`, `compras/`, `envios/`, `vender/` | saque em dias úteis, depósito e oferta validados |
| Texto legal e interface | `termos-de-uso-v1.ts`, `tabela-de-taxas-v1.ts`, `politica-de-privacidade`, `Modal.tsx`, `not-found.tsx`, `middleware.ts`, `plural.ts`, `tutorial.css`, `cookies/` | versões novas, 404, plural, cookies |

## 4. Testes
- `tsc --noEmit` limpo em cada tópico; vitest dos arquivos tocados verde; **Controle informou 2.406 testes verdes em 211 arquivos** na foto de ~21:00 (informado, não reexecutado neste relatório).
- Testes novos de destaque: `estado-do-usuario.test.ts` e `estado-nao-vaza.test.ts` (6, varredura estática; provado que falha com rota vazando), `isencao.test.ts` (10), `validacao-cadastro.test.ts` (30), `dias-uteis`, `validacao-dinheiro`, `kpis.test.ts` (16 do conselho), `troca-email.test.ts`, `csp.test.ts` (6), `consentimento` (4+3), `middleware.test.ts` (varredura de segmentos).
- Build local: nenhum (regra do método; o deploy da Vercel valida). Deploys READY conferidos: `81f2cfa`, `f484c6f`, `00cfcfd` (status do commit no GitHub = success).
- Tester no ar (14 rodadas, 375/768/1280, claro e escuro): telas públicas, HTML, API e telas logadas na conta do Gabriel conferidas; ver `docs/manutencao-2026-11/garantias/TESTER_22-11.md`.

## 5. Bloqueios deixados para o humano

- **E-mail inteiro, 23/11:** Resend (`RESEND_API_KEY` ausente na Vercel), DNS de `avisos.realolimpico.com.br`, Esqueci minha senha. Documento único: `docs/manutencao-2026-11/PENDENCIAS_DE_EMAIL_PARA_AMANHA.md`.
- **Contador:** pergunta nº 21 (R$ 4,00 do frete); perguntas da frente B ainda fora de `LACUNAS_E_PERGUNTAS.md`.
- **Gabriel:** texto do frete R$ 4,00; validação de CPF por API (não aprovada); 3 pesos ambíguos (RO-ENV-0014, 0003, 0048) e 2 vídeos sem dono; horizonte do LTV; "moeda equivalente"; teste no iPhone/Android; plano do Supabase para vídeos.
- **Conferência logada não feita:** Financeiro do admin (aviso da cadeia, ficha do Rogério), isenção Áurea/CEO, botão de vídeo na ficha, e três textos só visíveis logado (rodada 15).
- Cadastro que entra direto (`d84f795`): o Tester viu /cadastrar no ar sem confirmação de e-mail; falta o teste com o Gabriel digitando a senha.

## 6. O que o MD de execução já cobre
Cada frente tem o seu em `docs/diario/execucoes/2026-11-22--manut2-t1…t6` e `…qa-r1…r4` (cópias em `Central de Organização/01_continuidade/manutencao-22-11/`). Não recopiado aqui.

## 7. Próximo ato (um)
Gabriel entra na conta no painel do navegador e o Tester relê Configurações, /conta e /inicio; em seguida começa a tarefa de e-mail de 23/11.
