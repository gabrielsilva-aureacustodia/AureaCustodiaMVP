# Plano hiperdetalhado | Manutenção — Pendências do docx + pedidos de 22/11/2026

```
Dono:       Controle (este chat)      Garantia: GARANTIA_DE_EXECUCAO__Manutencao_Pendencias_22-11.md (mesma pasta)
Lido antes: método v2.2 (inteiro) · Sintetica 00_INDICE e 06_REGRAS (inteiros) · Central: README + os 5 índices (01–05) · LEIA_PRIMEIRO_AGENTE · INDICE_VEGA · CLAUDE.md
            + os planos que tocam este pedido: 00_MD_EXECUTIVO, MD de execução das frentes F e L, ESTADO-GERAL (RETOMADA)
NÃO lido:   os ~300 arquivos listados nos índices 01–05 além dos acima (fichas A–E, G–K e M; MD/log/relatórios de A–E, G–K; as 47 memórias uma a uma;
            transcrição dos 69 chats; planos das ondas de setembro). Cada chat de tema lê os da sua lista abaixo antes de agir.
Estado Git: main, sem commit nenhum desta tarefa. Nada desta tarefa foi enviado ao GitHub.
```

## 0. Cruzamento com 02_planos_de_execucao/ (o que cada plano já diz sobre este pedido)

| Pedido de 22/11 | Plano da Central que já cobre | O que ele diz / o que muda |
|---|---|---|
| Docx, itens 1–15 | `00_MD_EXECUTIVO` §1 (os 16 itens → frentes A–L) | Todas as frentes A–L estão mescladas na main (ESTADO-GERAL, 18/11). **Falta:** bateria pesada, push, conferência em produção, `RESEND_API_KEY`/`EMAIL_REMETENTE`, teste no iPhone, pergunta nº 21, decisão da L. Tema T4 confere cada item **em produção** em vez de refazer. |
| Item 15 / saldos do Rogério (prints 4 e 5) | Frente F (`…manut-f…MD_EXECUCAO.md`) | F entregou o extrato do **cliente** com invariante "saldo = soma das linhas". O print 5 é a **ficha do admin** (`AbaFinanceiro`), que a F declarou fora da sua Touch e que **não** ganhou "Saldo depois" nem custódia em "Taxas pagas". Logo: não é erro de cálculo; é visualização da ficha (T1). |
| Vídeos no Storage (L) | Frente L (`…manut-l…MD_EXECUCAO.md`) | 32 arquivos, 328,77 MB, 6 vídeos sem análise (66,67 MB, **não apagados**). Hoje: 4 desses 6 foram ligados às análises (22/11, esta tarefa, sem Garantia). Restam 2 órfãos (RO-ENV-0006-9, RO-ENV-0154-2) e 80 análises da bancada sem vídeo — ver T3-N1. Decisão de trocar armazenamento continua do Gabriel. |
| Isenção, PJ | **Nenhum plano** (decisão nova de 22/11) | `00_MD_EXECUTIVO` §5: cobrança e fiscal só com o Gabriel; aqui a ordem veio do Gabriel. `fees.ts`/`market.ts`/`types.ts` são superfície protegida: o pedido do Gabriel autoriza o recorte descrito; nada além. |
| Cancelar fatura R$ 52 + nota | Frente H (`MAPA_DO_CANCELAMENTO.md`) e `estornarFaturaPaga` | Fatura **pendente** não gera NFS-e (CLAUDE.md); não existia nota (consulta feita: 0 linhas). Cancelada em produção em 22/11. |
| Código × posição × hash | Memória R11 de 05/10 (`mover-moedas-para-as-caixas-certas.cjs`) e 28/09 (`corrigir-peso-dos-laudos.cjs`) | A regra de 05/10 é "por ordem do código, dentro de cada tipo" → posição pode pular número quando há moeda de outro tipo no meio; **isso não é erro**. Há 18 posições fora da ordem do código (decisão do Gabriel, Garantia §4.1). |

## 1. Fatos medidos em produção (22/11/2026, `BEGIN READ ONLY`)

- `analises`: 257 (253 aprovadas). `peso_mg`: 7000 (244), 7840 (8), 7890 (1) — **o peso gravado está certo**; o "0,007 g" só aparece quando `Envio.pesoInicialMg` vem como 7 (cadastro sem envio digitado em mg) e a bancada o pré-preenche em gramas dividindo por 1000.
- Vídeos: 150 análises com `caminho_video`, 80 da bancada sem vídeo (a bancada permite fechar "sem vídeo", gravado no hash), 27 do cadastro direto (sem vídeo por natureza). Storage: 32 objetos, 26 caminhos distintos, **nenhum caminho do banco aponta para objeto inexistente**; 6 objetos sem análise (4 ligados em 22/11).
- Caixas: EB-001 (1–100), EB-002 (1–100, com DH no meio dos códigos), EB003 (1–44, caixa criada com nome fora do padrão, vizinha de EB-004 "GANDEIRA CAIXA 4" vazia), DH-001 (9). Sem posição repetida. RO-000183 → EB-002/75 **está de acordo** com a regra de 05/10.
- Contas: Áurea = `rogeriosiqueira@pbh.gov.br` ("Áurea Custódia Lta.", 26 moedas, saldo 0); CEO = `siqueiraroger1@gmail.com`.
- Rogério (CEO): 1200 − 1600 + 1140 − 26,70 − 528 = **185,30** = saldo. O que fecha na conta está certo; o erro é o cartão "Taxas pagas" mostrar só as comissões.

## 2. Temas, branches e o passo a passo de cada um

Cada Execução: (a) lê só a lista "Ler"; (b) cria o MD de execução `docs/diario/execucoes/2026-11-22--manut2-<tema>-<n>--MD_EXECUCAO.md` com bloco RETOMADA; (c) edita só o "Touch"; (d) atualiza o MD a cada tópico; (e) NÃO faz build local; (f) entrega "pronto" ao chat de tema com o estado do Git na primeira linha.

### T1 · Financeiro e saldos (prints 2, 3, 4, 5)
**Ler:** `src/domain/statement.ts` (+ `statement-invariante.test.ts`), `src/components/admin/usuarios/AbaFinanceiro.tsx`, `src/components/admin/resultados/Financeiro.tsx`, `src/domain/admin/financeiro.ts`, `src/server/admin/resultados.ts`, `src/server/db/derivar.ts`, `src/domain/ledger.ts`, `docs/diario/execucoes/2026-11-18--manut-f-…ANALISE_EXTRATO_X_SALDO.md`.
- **N1 Financeiro do admin:** (1) cartão **Saldo dos clientes** (dinheiro que a Áurea guarda de terceiros = Σ `users.balance` + reservas de ofertas pré-pagas + saques a caminho; **excluindo** a conta da Áurea e contas da equipe só se o Gabriel mandar) em `resumirFinanceiro`/`Financeiro.tsx`, com texto de cliente leigo; (2) terminologia: Saldo (disponível) × Em reserva × Receita bruta (comissões + custódia paga + tarifas) × Recebido do gateway × Depósitos de clientes × Saldo anterior, cada cartão com uma linha dizendo o que é e o que não é; (3) investigar o aviso "A cadeia de hashes do livro-razão não confere" (print 3): ler `verificarLedgerNoPainel`, achar o primeiro lançamento divergente **só em leitura**, relatar; correção só com o "sim" do Gabriel (ledger é append-only); (4) reconciliação: tabela "Saldo dos clientes = Depósitos − Saques pagos − Comissões − Custódia − Tarifas + Ajustes" para o período, fechando com a soma dos saldos (se não fechar, mostrar a diferença com o nome "diferença a explicar", nunca esconder).
- **N2 Extrato e ficha do cliente:** (1) `AbaFinanceiro` (ficha do admin): cartões Comissões, Custódia paga, Total de taxas pagas (já editado localmente), mais "Saldo depois" na tabela e o mesmo cabeçalho de `resumoDaConta`; (2) extrato do cliente e export (já editados localmente): conferir que `statement-invariante.test.ts` continua verde (rodar **só esse arquivo** depois do deploy, não build); (3) teste novo `statement-totais.test.ts` com a conta do Rogério (depósito 1200, compras 1600, vendas 1140, comissões 26,70, custódia 528 → taxas 554,70, saldo 185,30); (4) ficha do admin e extrato do cliente usam **as mesmas** palavras.
- **Aceite T1:** admin mostra o saldo dos clientes; ficha do Rogério mostra Taxas pagas = R$ 554,70 com a composição; saldo = 1200 − 1600 + 1140 − 554,70; ledger investigado e explicado; teste verde.

### T2 · Isenção Áurea e CEO + conta PJ (print 1)
**Ler:** `src/domain/isencao.ts` (novo, local), `fees.ts`, `market.ts`, `custodia-da-moeda.ts`, `cobranca-de-entrada.ts`, `custodia-da-compra.ts`, `server/actions/{market,sell,payments,reserva}.ts`, `server/payments/conciliacao.ts`, `domain/cadastro.ts`, `domain/cpf.ts`, `components/account/ModalCadastro.tsx`, `server/actions/account.ts` (salvarCadastro), `domain/admin/usuarios.ts`, `server/nfse` (como a nota nasce do diff), CLAUDE.md (seções comissão, custódia, NFS-e).
- **N1 Taxas e custódia isentas:** (1) Reconhecer as duas contas por **e-mail em variável** (`NEXT_PUBLIC_AUREA_CONTA_PROPRIA_EMAIL`, `NEXT_PUBLIC_AUREA_CONTA_CEO_EMAIL`; nunca por CNPJ do cadastro: o cliente escreve o próprio cadastro) — **ligar só depois do Gabriel confirmar os dois e-mails** (Garantia §4.4); gravar as variáveis na Vercel pelo CLI/MCP e no `.env.local`, com registro em `RISCOS_ASSUMIDOS`/MD de infraestrutura e push na hora; (2) `taxasDaNegociacao(comprador, vendedor, taxas)` aplicada em `matchOrders`, `buyLot`, `sellToBid`, compra direta Pix/cartão, reserva e conciliação (já editado localmente — **revisar e provar**); (3) custódia: conta da Áurea não gera fatura de ciclo, de entrada nem de compra, e `custodiaImpedeNegociar` devolve falso para moeda dela; moeda dela comprada por cliente: o cliente paga o 1º mês e o ciclo dele normalmente (a função só olha o **dono atual**); (4) NFS-e: comissão zero não gera pedido de nota; conferir `derivar.ts`/`diff.ts` para não criar nota de R$ 0,00; (5) testes de domínio: Áurea compra de cliente (cliente paga normal, Áurea sem comissão e sem custódia), Áurea vende a cliente (cliente paga comissão e custódia), Áurea ↔ CEO (nenhuma comissão), CEO ↔ cliente (normal), cliente ↔ cliente (normal), variável vazia (ninguém isento); (6) impedir que o cron emita de novo a fatura R$ 52 da conta Áurea (já cancelada em produção): isenção ligada resolve; antes dela o cron a reemite no próximo ciclo; (7) telas de compra/venda calculam o custo no navegador com a mesma função (variável `NEXT_PUBLIC`).
- **N2 Conta PJ:** (1) `validarDocumento` (CPF **ou** CNPJ, com dígitos verificadores) em `domain/cpf.ts`/`cadastro.ts`; (2) `ModalCadastro` e `salvarCadastro` aceitam 11 ou 14 dígitos, rótulo "CPF ou CNPJ"; (3) admin: criação e edição na ficha (`domain/admin/usuarios.ts` + componente) com o mesmo campo; (4) o que mais depende de "CPF" (etiquetas, NFS-e do tomador `domain/nfse/dps.ts`, saques `domain/saques.ts`) **só se lê e se lista**; PJ no tomador da NFS-e e Pix de PJ são decisão fiscal/de cobrança → pergunta ao Gabriel, nada codificado.
- **Aceite T2:** a tabela de testes acima verde; fatura da conta Áurea inexistente; nenhuma nota nova; PJ cadastrável pelo cliente e pelo admin; superfície protegida tocada listada no MD.

### T3 · Balcão: vídeos, peso, caixas e hashes (prints 6 e 7)
**Ler:** `src/server/estacao/video.ts`, `src/server/admin/video.ts`, `src/components/admin/bancada/{BancadaWeb,GravadorDeVideo}.tsx`, `src/server/admin/bancada.ts`, `src/app/(admin)/admin/moedas/[codigo]/page.tsx`, `BotaoVideo`, `src/domain/admin/{bancada,moedas,caixas}.ts`, `src/domain/analise.ts`, `corrigir-videos-e-posicoes.cjs`, `alinhar-videos.cjs`, `mover-moedas-para-as-caixas-certas.cjs`, `docs/RELATORIO_ARMAZENAMENTO_VIDEOS.md`, `docs/TUTORIAL_BALDE_SUPABASE.md`.
- **N1 Vídeos:** (1) já provado: vídeos **estão** no Supabase Storage (`analises`, 32 objetos) e os caminhos do banco apontam para objetos reais; (2) por que não aparecem na auditoria: 80 análises fechadas "sem vídeo" (permitido pela bancada) + 4 envios com vídeo no Storage e caminho nulo no banco (**ligados em produção em 22/11**) — descobrir **a causa** de o fechamento não carregar o caminho (ler `GravadorDeVideo` → `setVideo` → `fecharAnaliseNoPainel`: hipótese = upload termina depois do clique em fechar ou `naoSubiu`) e corrigir o fluxo para o botão "Fechar" esperar o upload ou exigir confirmação explícita; (3) conferir **no admin, em produção**, o botão de vídeo da ficha das moedas ligadas (RO-ENV-0012/0024/0037/0044) e do cliente; (4) 2 órfãos restantes (RO-ENV-0006-9, RO-ENV-0154-2): identificar o envio; **não apagar** (decisão do Gabriel); (5) registrar a operação feita em produção em `docs/` (migration/script = push na hora).
- **N2 Peso padrão:** (já editado localmente) `pesoPadraoOuInicial` ignora peso inicial < 1 g; `cadastro-direto`/`cadastro-sem-envio` aceitam só ≥ 1000 mg, senão usam o padrão do tipo; formulário do cadastro direto pede **gramas** (vírgula ou ponto) e converte; **corrigir os dados:** `envios.peso_inicial_mg` < 1000 → padrão do tipo (consulta de leitura primeiro: quantos e quais; `peso_inicial_mg` **não** entra no hash); testes novos em `bancada.test.ts` (7 g = "7"; 7 mg → "7").
- **N3 Código × posição × hash:** (1) explicar ao Gabriel por escrito a regra vigente (05/10) e por que RO-000183 está em EB-002/75; (2) com a decisão do Gabriel (§4.1), reordenar as 18 posições **por script** `corrigir-videos-e-posicoes.cjs --aplicar` (já escrito; refaz a cadeia do GENESIS e `recibos.hash`, aborta se a fórmula não reproduzir os hashes atuais); **só rodar depois do "sim" dele sobre o lugar físico**; (3) padronizar as caixas "EB003"/"EB-004" (nome fora do padrão) — decisão dele; (4) conferir, depois, na ficha do admin e no recibo do cliente (dois aparelhos) que caixa, posição e hash batem; (5) teste de domínio: por caixa, a posição segue a ordem do código dentro do tipo.
- **Aceite T3:** causa do "sem vídeo" documentada e corrigida; peso certo na bancada e no cadastro; posições alinhadas **se o Gabriel autorizar**; hash chain confere (`verificar cadeia` do admin).

### T4 · Pendências do docx (itens 1–15)
**Ler:** `00_MD_EXECUTIVO` §1, `ESTADO-GERAL` RETOMADA, `docs/manutencao-2026-11/registro/_QUADRO.md` e `_CONTROLE.md`, `docs/PENDENCIAS_ABERTAS.md`, `docs/fiscal-contabil/LACUNAS_E_PERGUNTAS.md`.
- **N1 Itens 1–15 em produção:** para cada item, estado = (no código? na main? em produção? provado?) lido em MD e **conferido no ar pelo Tester**; o que estiver pronto e sem commit vai ao Merge/Deploy; lista de ações do Gabriel: `RESEND_API_KEY` e `EMAIL_REMETENTE` na Vercel (variável é trabalho do Controle por CLI/MCP — tentar antes de pedir), teste no iPhone (roteiro `docs/pwa/ROTEIRO_IPHONE_REAL.md`), pergunta nº 21 ao contador, decisão da frente L, aprovação do texto do frete (D5). Item 5 (fornecedores) é operacional: `OPERACIONAL_FORNECEDORES.md`.
- **N2 Auditoria de marketing (frente M):** adiada por ordem do Gabriel (17/11): **não executar** até ele abrir.
- **Aceite T4:** quadro "item × estado em produção × quem falta" publicado; nada refeito sem necessidade.

## 3. Ordem, rotinas e portões

1. Agora: Controle cria a árvore (sessões) e cada chat de tema/branch cria o seu MD de execução e Garantia de Branch **antes** de editar.
2. Rotinas: Controle e Branches 5 min; Auditorias 3 min; Merge/Deploy e Processo Padrão 15 min; Higienização 30 min (só depois do aviso do Merge/Deploy). Ligar com `CronCreate`/`/loop` (expiram em 7 dias).
3. **Merge, Push, Deploy:** `gh auth switch --user gabrielsilva-aureacustodia`; `git add <caminhos>` (nunca `-A`); **sem build local**; verificação só em produção pelo Tester; migration/env tocados → commit e push na hora; plano e Garantias não se commitam antes de executar (depois do fim: vão à main como log). Commit só de MD vai direto.
4. Antes do push de T2: confirmação do Gabriel sobre §4.2–§4.4 da Garantia.
5. Antes de qualquer escrita nova em produção (T3-N3, T1 ledger): "sim" do Gabriel com a lista exata do que muda.
6. Fechamento: cada chat cruza o seu plano com a Garantia **de novo** e só então diz "feito"; resposta começa pelo estado do Git.

## 4. Cruzamento final (a preencher no fim; "feito" só depois disto)

| Item do pedido | Tema | Feito? | Prova |
|---|---|---|---|
| gh auth switch | — | sim | `gh auth status`: ativa `gabrielsilva-aureacustodia` |
| Docx 1–15 | T4 | não | — |
| Vídeos no Storage e na auditoria | T3-N1 | parcial | 4 ligados; causa e 80 sem vídeo pendentes |
| Peso padrão | T3-N2 | parcial | código local, sem teste, sem dado corrigido |
| Código × posição × hash | T3-N3 | não | decisão do Gabriel |
| Fatura R$ 52 / nota | T2 | parcial | fatura cancelada; isenção não ligada |
| Isenção Áurea/CEO | T2-N1 | parcial | código local, sem teste, variáveis não criadas |
| Conta PJ (CNPJ) | T2-N2 | não | — |
| Saldos no admin / terminologia | T1-N1 | parcial | taxas pagas na ficha; saldo dos clientes não feito |
| Contas do Rogério | T1-N2 | parcial | diagnóstico feito (visualização, não cálculo); teste novo pendente |
