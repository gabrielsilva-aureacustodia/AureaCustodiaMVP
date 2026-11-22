# MD de execução — QA Davi 22-11 · R4 Texto legal e usabilidade (22/11/2026)

## RETOMADA
**⛔ NÃO publicar Termos 2.2 sem aprovação do Gabriel/jurídico (decisão de 22/11, após a Auditoria).** Publicar nova versão obriga todo cliente a aceitar de novo, e `garantirDocumentosVigentes` publica sozinho a versão que estiver no código no primeiro acesso ao painel/aceite — então subir o texto novo já é publicar. Por isso **voltei os Termos para a 2.1 com o hash original** (`2cf7ee93…`) e mantive só a correção de FORMA (a)) e numeração na tela, que não muda o texto canônico nem o hash. As correções de texto (concordância "Estes Termos de Uso regem"/"os Termos de Uso", 14.5.4 "A arbitragem observará", "1 (uma) moeda", "restabelecer") estão guardadas, prontas, em `garantias/TERMOS_v2.2_PATCH_AGUARDANDO_APROVACAO.diff`. Se aprovado: `git apply` do patch + atualizar hash/versão nos 3 testes (canonico, admin/documentos, db) para 2.2 / `11f9d6b7…5159` e publicar. As linhas sobre "v2.2" abaixo descrevem esse patch, não o código atual.

Tudo do tema R4 foi codificado, sem commit e sem build local. `tsc --noEmit` limpo; vitest dos arquivos tocados verde (middleware, plural, documentos-legais, documentos admin, home, landing). **Pendente**: publicar a v2.2 dos Termos (ver abaixo), conferência visual do Tester (375/768/1280, claro/escuro), decisões do Gabriel/jurídico em `garantias/TERMOS_CLAUSULAS_PARA_O_JURIDICO.md`.

## Por item
- **B04** `tutorial.css`: `body:has(.modal-bg.show) .dicas-camada{visibility:hidden}` — números e painel somem com janela aberta e voltam ao fechar.
- **S05** botão "Ver tutorial" vira ícone de 44px ≤640px (aria-label); folga no fim da página 104→140px (`atendimento.css`).
- **S06** `Modal.tsx`: Esc/clique fora só em janelas que declaram `<FechaComEscEClique ativo>`. Declaradas: Depositar e Sacar (só com campo vazio/sem enviar), Notificações, Dados pessoais (só sem alteração). Senha, definir senha, cadastro formal, confirmações de compra/venda/retirada: **continuam como estavam**.
- **B10** `src/app/not-found.tsx` (PT, header/rodapé públicos, links logado × deslogado, status 404). Middleware: deslogado + endereço sem segmento conhecido → rewrite 404 (`ehSegmentoProtegido`, lista em `rotas-publicas.ts`); rotas logadas inexistentes e `/admin/*` seguem para login/`/painel`. Log `[404] <caminho>` sem query. Testes novos no `middleware.test.ts` (inclui varredura: segmento novo em `(app)/(admin)` sem entrar na lista reprova).
- **B05** `até{' '}` na Academy. **A15** "quatro soluções". **A14** Academy lê o e-mail de `carregarCanaisDeAtendimento()` — mesmo canal do SAC (/admin/configuracao); não confirmei o valor gravado no banco (default do código: suporte@).
- **A11** login: "Entre com o e-mail e a senha da sua conta." **A12** Academy no menu (link para /academy). **A13** tirei "Decisão F-1 e Cláusula 7.3.3", "(RA-26)" e "banco de dados" das telas do cliente.
- **A07** "Mediana dos anúncios à venda" (home/Início/landing; é o que `medianSellPrice` calcula), "Média das negociações — 7 dias" (Compras/Mercado), "Moedas em custódia" (Início). **A17** Início e landing usam a composição do catálogo (landing dizia "Cuproníquel"; catálogo diz Bimetálica 27mm · 7,84g — **Gabriel confirma o fato**).
- **S07** `src/domain/plural.ts` (+teste); aplicado em compras, mercado, vender, envios, recibos, auditoria. **S08** frase do Pix/cartão reescrita.
- **B08** "a))" corrigido (Termos e Política); número da cláusula aparece na tela; erros materiais dos Termos corrigidos → **Termos 2.1 → 2.2** (hash novo atualizado em canonico.test, admin/documentos.test, db.test). Política sem alteração de texto. Lista para o jurídico: `garantias/TERMOS_CLAUSULAS_PARA_O_JURIDICO.md`.

## Não feito / atenção
- Publicar 2.2: `garantirDocumentosVigentes` (portas.ts/aceites) publica a versão do código; se não rodar sozinho no deploy, usar "publicar a versão vigente" em /admin/configuracao. Quem publica: Merge/Deploy ou Gabriel. A faixa de aceite pedirá o aceite de novo.
- Falhas de teste que **não são minhas**: `AvisoDoGoogleNoApp.test.ts` e `FormulariosDeAcesso.test.ts` (importação server-only em componente cliente — tema R2, LoginForm/AvisoDoGoogleNoApp).
- Arquivos compartilhados que editei pontualmente: AccountModals (R2/R3), compras/vender/envios/mercado (R3), LoginForm (R2) — só linhas de texto/marcador.
- Rotina CronCreate de 5 min não criada (execução curta, sem espera).

## Item a item com arquivo:linha (conferido em 22/11/2026)
| Item | Onde |
|---|---|
| B04 | `src/styles/tutorial.css:32` |
| S05 | `src/styles/tutorial.css:24` (ícone ≤640px), `src/styles/atendimento.css:26` (folga 140px) |
| S06 | `src/components/ui/Modal.tsx:54` (marcador), `:108` (Esc); marcadores em `src/components/account/AccountModals.tsx:142,415,517,675` |
| B05 | `src/app/academy/page.tsx:195` |
| B08 | `src/app/termos/page.tsx:56,127` (a)) e numeração); `src/domain/documentos-legais/termos-de-uso-v1.ts:27` (v2.2) e erros de texto (`:328` "1 (uma) moeda", `:527` "restabelecer"); `src/app/privacidade/page.tsx` (letras e numeração) |
| B10 | `src/app/not-found.tsx`; `src/middleware.ts:56`; `src/server/rotas-publicas.ts` (SEGMENTOS_PROTEGIDOS); `src/middleware.test.ts` |
| A07 | `src/components/home/BlocosDeMoedas.tsx:81`, `src/components/landing/DestaqueDoCard.tsx:35`, `src/app/(app)/compras/page.tsx:322`, `src/components/market/ComoPrecoEFormado.tsx:63`, `src/components/home/HomeStats.tsx:63` |
| A11 | `src/components/login/LoginForm.tsx:154` |
| A12 | `src/components/shell/Sidebar.tsx:362` |
| A13 | `src/app/taxas/page.tsx:57`; SAC (`src/app/suporte/page.tsx`, "RA-26" removido); Segurança (`src/app/(app)/conta/configuracoes/page.tsx`, "banco de dados" removido) |
| A14 | `src/app/academy/page.tsx:223` (lê `canais.email`, o do SAC) |
| A15 | `src/app/academy/page.tsx:95` |
| A17 | `src/components/home/BlocosDeMoedas.tsx` (ficha vem de `tipo.detail`), `src/components/landing/LandingPage.tsx` (Bimetálica 27mm · 7,84g) |
| S07 | `src/domain/plural.ts` (+`.test.ts`); compras, mercado, vender, envios, recibos, recibos/auditoria |
| S08 | `src/app/(app)/mercado/page.tsx:765` |

## Perguntas ao Gabriel — NADA codificado (Controle leva)
Itens do relatório: **A01** prazo da retirada (30 dias úteis nos Termos × 30 corridos para postar na Academy/Retiradas); **A02** seguro contratado ou não (Academy × Tabela de Taxas); **A03** "seu item" na home × guarda por moeda equivalente; **A05** Política "cadastro progressivo" × formulário da 1ª compra; **A08** receita da empresa visível a todo cliente em Recibos → auditoria, é intencional?; **A09** banner de cookies/Meta Pixel e menção na Política; **A10** comparativo com BTC/ETH/USDT no Mercado (manter? fonte e período?).
As 13 perguntas de negócio (p. 36–37): guarda individual × equivalente e laudo; seguro (previsão, incluso na taxa?); Sicoob (parceria formal, autorização de uso do nome); Retirada Comum R$ 50 × Segura R$ 180; que planos de custódia existem; compra que falha (valor ao saldo + R$ 5 de saque, no boleto); arbitragem opcional no cadastro × obrigatória ≥ R$ 100 mil; verificação de identidade (Termos cap. 6 × Política cap. 3); avisos sem e-mail ativo; auditoria aberta de propósito; comparativo com cripto; depósito mínimo; outros itens de coleção planejados.
Extras do R4: composição da moeda Direitos Humanos (catálogo diz Bimetálica; landing dizia Cuproníquel — alinhei ao catálogo); publicar Termos 2.2 em produção; lista do jurídico em `garantias/TERMOS_CLAUSULAS_PARA_O_JURIDICO.md`.
