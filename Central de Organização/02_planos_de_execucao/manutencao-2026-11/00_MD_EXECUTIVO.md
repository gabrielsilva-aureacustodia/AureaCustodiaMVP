# MD EXECUTIVO — Manutenção do Site, novembro/2026 (pendências do Rogério)

```
Projeto:      Áurea Custódia / Real Olímpico — C:\dev\AureaCustodiaMVP
Origem:       "Pendencias a resolver da Manutenção do Site.docx" (Rogério, 11/11/2026), repassado pelo Gabriel em 17/11/2026
Prazo:        1º pagamento do contrato de manutenção em 30/11/2026. Item da nota fiscal: URGENTE (contador: cancelar dentro do mês).
Base Git:     main = origin/main = 9e21fe1 (15/11/2026). Todas as frentes cortam deste commit (ref_commit).
Processo:     docs/processo/PROCESSO_EFICIENTE_DE_BRANCHES_2.0.md (Controle → Branch → Execução/Auditoria/Específico)
Método base:  C:\dev\Sintetica\processo\ (R1–R13, E1–E12, B1–B6) — encontrado e lido em 17/11/2026
Estado:       documento de trabalho LOCAL. Não se commita antes do fim (B2); vai à main depois, como log.
```

> Este MD não cria regra. Onde ele propõe um padrão ("default"), é para a frente andar enquanto o Gabriel decide; o Gabriel muda o padrão quando quiser e a frente ajusta numa linha. Decisão de segurança, de cobrança e fiscal é do Gabriel (R10, CLAUDE.md).

## 1. Os 16 itens do Rogério, como estão no documento, e para onde vão

O documento numera dois itens como "10". Aqui eles viram 10a (nota fiscal) e 10b (app).

| # | O que o Rogério pediu (resumo fiel) | Frente | Tipo |
|---|---|---|---|
| 1 | Senha para retirar dinheiro, comprar, vender e mudar dados pessoais (alguém pode invadir e mudar senha e Pix); estudar jeito seguro | **A** | código + estudo |
| 2 | Cobrar o 1º mês de custódia junto com o pagamento do envio ou da compra | **B** | código |
| 3 | E-mail de confirmação de compra e de movimentação (ver quanto custa) | **C** | código + pesquisa de custo |
| 4 | Tela inicial com cadastro pelo Google antes do e-mail | **D** | código |
| 5 | Manter em dia os pagamentos dos fornecedores de internet e IA; enviar faturas e boletos | **Controle** | operacional, sem código |
| 6 | Espaço para gravar os vídeos de autenticidade; se faltar, comprar ou achar armazenamento barato | **L** | medição + proposta |
| 7 | Proposta de KPIs indicada pelo conselho, automatizada no sistema de gestão (WhatsApp de 3/11) | **J** | código |
| 8 | Fazer demonstração de como cadastrar no site inicial | **D** | demonstração |
| 9 | Notas fiscais acessíveis aos clientes (WhatsApp de 5/11) | **G** | código |
| 10a | Cancelar a NF de R$ 30 emitida para o Rogério (15 moedas não enviadas): cancelar serviço, faturamento, envio e NF. "Tulio disse que é sempre urgente cancelar as notas dentro do mês" | **H** | código + operação em produção |
| 10b | O Real Olímpico como app não funciona, principalmente no iPhone | **E** | diagnóstico + código |
| 11 | Somar R$ 4 no valor do faturamento dos Correios | **K** | código |
| 12 | Mostrar o número da moeda no recibo do cliente (WhatsApp de 7/11) | **I** | código |
| 13 | Opção de cancelar a validação na bancada quando o envio não foi feito (WhatsApp de 9/11) | **H** | código |
| 14 | Cancelar envios que não foram postados; achar uma opção (WhatsApp de 9/11) | **H** | código |
| 15 | O extrato tem que refletir o saldo real da conta; hoje confunde o cliente (extrato × saldo no topo) | **F** | código |
| — | "Na auditoria de marketing aparecem algumas sugestões para o site, favor ver lá" | **M** (sem branch) | **redefinida pelo Gabriel (17/11):** análise do tráfego pago no gerenciador de anúncios, pelo navegador interno, só leitura; feita pelo chat de preparação, não pelo Controle. **ADIADA (17/11): fica por último e fora desta rodada; a melhoria do site com base na auditoria será uma branch específica que o Gabriel abrirá depois** |

**Por que 12 frentes e não 16:** (a) 10a + 13 + 14 são o **mesmo fluxo** (cancelar envio e tudo que ele gerou) e mexem nos mesmos arquivos — separar criaria o conflito mais caro; (b) 4 + 8 dependem uma da outra (a demonstração é da tela nova); (c) o item 5 não é código. Cada frente tem uma branch, um chat e um conjunto de pastas próprio.

## 2. O que já existe no código (verificado em 17/11/2026 só por MDs e por nomes de arquivo; a frente confirma antes de agir)

| Fato | Onde | Consequência |
|---|---|---|
| Compra **já** cobra o 1º mês junto (custoDeCompraPorMoeda + fatura paga `origem:'compra'`), desde 21/10 | `CLAUDE.md`, `src/domain/custodia-da-compra.ts`, `transferirMoedaVendida` | Frente **B**: a metade "compra" do item 2 é **verificar e fechar lacunas** (Pix, cartão, reserva/pré-paga), não construir |
| Envio tem plano opcional de 1º mês no wizard (`contratarPlanoCustodia`, `alimentarPlanoNaAnalise`) e frete pago no site | `src/app/(app)/envios/page.tsx`, `src/server/actions/plano-custodia.ts`, `custody.ts` | Frente **B**: tornar o 1º mês parte do pagamento do envio |
| Envio sem postar por 3 dias é "desconsiderado" e **só o frete** volta ao saldo (`desconsiderarEnvio`); fatura do 1º mês paga e NFS-e **não** voltam | `src/domain/envios.ts`, `src/server/shipping/frete-envio.ts` | Frente **H**: estender; o R$ 30 do Rogério é exatamente esse caso |
| `estornarFaturaPaga` já estorna no ledger e cancela a NFS-e | `src/domain/quitar-fatura.ts`, `src/domain/nfse/eventos.ts`, `src/server/nfse/` | **H** reaproveita; não reescreve |
| Pré-postagem dos Correios guarda `id` "usado para cancelar" e `canceladaEm` | `src/domain/types.ts` (`PrePostagemRegistro`), `src/lib/shipping/cws` | **H** cancela a etiqueta quando existir |
| Extrato do cliente nasce de `userStatement(state, email)`; o saldo vem de `user.balance` | `src/domain/statement.ts`, `src/app/(app)/conta/extrato/page.tsx` | **F** prova a diferença com teste de invariante |
| NFS-e: tabela `aurea.nfse_emissoes` guarda `numero_nfse`, `chave_acesso`, `xml_nfse` (migrations 044/045) | `src/server/db/repositories/nfse.ts`, `src/server/nfse/` | **G** lê daí; antes confere em produção (somente leitura) se há notas **emitidas** de verdade ou só pedidos |
| PWA existe desde 05/11 e **nunca foi testado em aparelho real** | `docs/pwa/MD_EXECUCAO.md` (pendências), `src/app/manifest.ts`, `src/lib/pwa/`, `src/components/pwa/` | **E** diagnostica pelo ponto fraco conhecido (iPhone) |
| Envio de e-mail existe (Resend) e há avisos de saque, atendimento e reserva | `src/lib/email/index.ts`, `src/server/saques/avisos.ts`, `src/server/mercado/aviso-de-reserva.ts` | **C** generaliza; precisa de `RESEND_API_KEY` na Vercel |
| Ações sensíveis do cliente e onde moram | `account.ts` (`changePassword`, `verificarTrocaEmail`, `updatePersonal`, `salvarCadastro`, `solicitarSaque`), `market.ts` (`buyLot`, `publishBid`…), `sell.ts` (`publishOffer`, `sellToBid`…), `payments.ts` (`iniciarCompraDireta`), `custody.ts` (`solicitarRetirada`) | **A** coloca a confirmação por senha na entrada de cada uma |
| Vídeos de autenticidade: gravador na bancada web e envio ao Supabase Storage | `src/components/admin/bancada/GravadorDeVideo.tsx`, `src/server/estacao/video.ts`, `src/server/admin/video.ts`, `docs/TUTORIAL_BALDE_SUPABASE.md` | **L** mede o balde (leitura) e projeta |
| KPIs de negócio já existem (comissão por lado, acervo, funil, tempos) | `src/domain/kpis.ts`, `/admin/resultados/kpis` | **J** acrescenta os do conselho |

## 3. Matriz de propriedade de arquivos (quem pode editar o quê)

Regra: **uma frente = uma branch = um conjunto de pastas**. Arquivo no mesmo cruzamento de duas frentes tem **um dono**; a outra frente cria arquivo novo e pede a ligação por uma linha no seu MD (o Controle faz o encaixe no merge).

| Arquivo "quente" | Dono | Quem só toca com cuidado |
|---|---|---|
| `src/server/actions/custody.ts` (1.548 linhas) | **B** (região de frete/plano/`createProtocol`) | **A**: 1 linha de guarda em `solicitarRetirada`. **H**: nenhuma edição — usa arquivo novo. **K**: nenhuma — mexe em `lib/shipping` |
| `src/app/(app)/envios/page.tsx` | **B** (wizard) | **H**: 1 componente novo + 1 linha na lista de envios |
| `src/server/actions/account.ts`, `market.ts`, `sell.ts`, `payments.ts` | **A** | ninguém mais. **C não edita ação**: liga o e-mail por ponto central |
| `src/domain/statement.ts`, `src/app/(app)/conta/extrato/page.tsx` | **F** | **H** e **B** entregam o dado; **F** garante que aparece |
| `src/domain/envios.ts`, `src/server/shipping/frete-envio.ts`, `src/server/actions/admin/bancada.ts`, `admin/logistica.ts`, `src/components/admin/bancada/*` | **H** | — |
| `src/lib/shipping/**` | **K** | **H** usa o cancelamento de pré-postagem que já existe; se faltar, pede a **K** ou cria arquivo novo em `src/server/shipping/` |
| `src/components/recibo/*`, `src/lib/pdf/recibo-pdf.ts` | **I** | — |
| `src/components/login/*`, `src/app/entrar/**`, `src/app/cadastrar/**` | **D** | **E** (fluxo OAuth no iPhone): só lê e pede a **D** |
| `src/app/layout.tsx` | **E** (somente o bloco de `metadata`/`viewport`) | **D**: não edita |
| `src/app/manifest.ts`, `src/app/sw.js/**`, `src/lib/pwa/**`, `src/components/pwa/**`, `public/pwa/**` | **E** | — |
| `src/lib/email/**`, `src/server/emails/**` (novo) | **C** | — |
| `src/server/nfse/**` (leitura), `src/app/(app)/conta/notas/**` (novo) | **G** | `Sidebar.tsx`: 1 linha de menu — **G** é o dono dessa linha |
| `src/domain/kpis.ts`, `src/server/admin/resultados.ts`, `src/components/admin/resultados/**`, `src/app/(admin)/admin/resultados/**` | **J** | — |
| `docs/manutencao-2026-11/registro/<ID>.md` | cada frente escreve só o seu | Controle lê todos |
| `src/domain/types.ts`, `constants.ts`, `fees.ts`, `market.ts`, `store/types.ts` | **superfície protegida** | ver seção 5 |

## 4. Contratos entre frentes (o que uma promete à outra)

1. **B ↔ H — "tudo o que um envio gerou se acha pelo protocolo".** Frete (`Envio.frete`), plano e fatura do 1º mês (`PlanoCustodia.protocoloEnvio`, fatura de contratação) e a NFS-e correspondente. **B não cria nenhuma cobrança do envio que H não consiga localizar pelo protocolo.** H escreve o estorno contra esse contrato e testa com fixture; B confirma no seu MD, em uma linha, como ligou a cobrança.
2. **B/H → F — todo evento que mexe no saldo aparece no extrato.** B e H devolvem dinheiro e criam cobrança; **F** valida com teste de invariante: *saldo da conta = soma dos impactos do extrato*, para contas com depósito, compra, venda, frete, fatura, estorno, ajuste e saque. O Controle **roda de novo o teste da F depois do merge de B e H**.
3. **D ↔ E — Google no iPhone instalado.** O login por Google precisa fechar o ciclo **dentro do app instalado no iPhone** (redirect na mesma janela, sem popup). **D** entrega o botão; **E** confere o ciclo e devolve a D o que quebrar.
4. **A → todos — confirmação por senha é um serviço único.** Um módulo novo (`src/server/auth/reautenticacao.ts`) que as ações chamam em **uma linha**. Nenhuma outra frente implementa checagem de senha por conta própria.
5. **C → todos — o e-mail liga num ponto central.** O envio nasce do mesmo diff que já gera o ledger e os pedidos de NFS-e (`src/server/db/derivar.ts`, `diff.ts`) ou de um módulo novo chamado depois do commit da mutação. **C não edita Server Action de outra frente.**
6. **Migrations — numeração reservada** (a última é `050`): A=051, B=052, C=053, F=054, G=055, H=056, J=057, K=058. Frente que não precisa de migration não usa o número. **Migration é escrita na branch e aplicada no banco só pelo Controle, junto com o commit** (memória do Gabriel `migration-nova-se-aplica-no-commit`).

## 5. Superfície protegida, segurança, cobrança e fiscal

- **Superfície protegida** (`constants.ts`, `fees.ts`, `market.ts`, `types.ts`, contrato de `store/types.ts`, Server Actions): o `CLAUDE.md` manda parar e decidir. **Interpretação adotada (a confirmar pelo Gabriel):** o pedido dele de implementar estes itens autoriza editar as Server Actions e acrescentar campos opcionais em `types.ts` **dentro do escopo descrito em cada ficha**. Tudo o que passar disso para e vira pergunta. Toda edição em arquivo protegido é anotada no MD da frente (seção "Superfície protegida tocada") e listada pelo Controle no check-up.
- **Segurança (item 1):** é decisão do Gabriel e é combinada antes (R10). A frente **A** começa pelo estudo, entrega o estudo e deixa a função **ligada e funcional** para ele testar (memória `entregar-ligado-para-testar`). Os parâmetros (janela de validade, o que fazer com conta só Google) têm padrão e se mudam depois.
- **Cobrança e fiscal (itens 2, 10a, 11):** o que o Rogério pede está escrito; o **tratamento fiscal** (nota na data do pagamento antecipado; acréscimo de R$ 4 como receita ou repasse) é pergunta ao contador (Tulio) e vai para `docs/fiscal-contabil/LACUNAS_E_PERGUNTAS.md`. Nenhuma frente inventa alíquota nem emite nota fora da regra vigente.
- **Operação em produção (10a):** o código do cancelamento é entregue testado. **Cancelar a NFS-e real e o envio real do Rogério é o Controle quem executa, pelo painel, com o "sim" do Gabriel na conversa** (nota fiscal e saldo de cliente não se desfazem sem ele ver o que será desfeito).

## 6. Decisões que dependem do Gabriel (com o padrão que as frentes usam até ele dizer)

| # | Pergunta | Padrão adotado | Frente |
|---|---|---|---|
| D1 | ~~Onde está a auditoria de marketing?~~ **Resolvida em 17/11:** o Gabriel disse que ela não é parte do sistema e liberou a análise do **tráfego** pelo gerenciador de anúncios no navegador interno (ficha M). Se ele tiver o documento, entra como complemento | M **não bloqueia** nenhuma frente de código e não tem branch | M |
| D2 | Qual é a lista de **KPIs do conselho** (WhatsApp de 3/11)? Só achei o slide "3.1 Cronograma, Números e Metrificação" (CAC diário/semanal, análise analógica e digital, atendimento comercial semanal) em `Documentos\Real Olímpico\Apresentação MKT Conselho` | J usa o slide + KPIs existentes e deixa a lista final em uma tabela para ele completar | J |
| D3 | Janela da confirmação por senha: sempre pedir, ou lembrar por alguns minutos? E conta que só entra com Google (sem senha)? | pedir em **saque e troca de Pix/senha/e-mail/dados**, e em compra/venda com **janela de 5 min**; conta só Google confirma por **código no e-mail** | A |
| D4 | O 1º mês no envio é **obrigatório** (sem opção) e entra no **mesmo pagamento** do frete? Se a moeda for recusada na análise, o mês volta? | obrigatório; recusa estorna o mês das moedas recusadas | B |
| D5 | O acréscimo de **R$ 4,00** é por envio/retirada (objeto) ou por moeda? Vale para o envio, para a retirada ou os dois? | **por objeto postado**, nos **dois** fluxos, parâmetro editável em `/admin/configuracao` | K |
| D6 | "Demonstração de como cadastrar" é um **vídeo/GIF** para mostrar ao Rogério e aos clientes, ou um **guia dentro do site**? | os dois: um vídeo curto e um bloco "Veja como se cadastrar" em `/cadastrar` | D |
| D7 | Quais movimentações disparam e-mail? | compra, venda, depósito confirmado, saque pedido/pago/recusado, envio postado/recebido, moeda aceita/recusada, fatura paga, retirada postada. Respeita `toggleNotif` do cliente | C |
| D8 | A retirada física de moedas (`solicitarRetirada`) também pede senha? O Rogério falou de "retirar dinheiro" | **sim**, por ser a mesma classe de risco | A |
| D9 | Posso dar **push e deploy** logo depois do merge e dos testes, ou você quer testar antes? | Controle faz merge, testes e commit; **pede o seu OK uma vez** com o resultado antes do push/deploy (ritual de higiene) | Controle |

## 7. Ordem de merge e bateria de testes (Controle)

1. **Onda 1 — isoladas:** L, I, K, E, D, J (não dividem arquivo quente).
2. **Onda 2:** A, C, G (A e C tocam muitas ações, mas em linhas diferentes).
3. **Onda 3 — cobrança e cancelamento:** B, depois H.
4. **Onda 4:** F (por último das frentes de código; reexecutar o teste de invariante saldo = extrato).
5. **2ª onda de frentes (M):** só depois do merge acima e com o documento em mãos (E5: melhoria nunca no meio).

Depois de cada onda: `npm run typecheck`, `npm test`, `npm run build` (CLAUDE.md, ritual do projeto). Conflito de merge: para, não "resolve no feeling" fora do `touch` da branch — packet de reconciliação, um agente só (06 da base v2). Migrations: aplicar na ordem numérica junto com o commit. Depois do OK do Gabriel: logs e MDs de execução vão para a `main` **antes** da higiene dos worktrees (B6).

## 8. Riscos conhecidos

| Risco | Mitigação |
|---|---|
| Custo e limite de uso: 12 chats de branch + até 36 filhos, cada um com rotina de 3 e 5 min | o ciclo faz pré-checagem em código (arquivo/Git mudou?) e responde "sem mudança" em uma linha; o Gabriel pode alongar o intervalo |
| Sessões abrirem sessões (3 níveis) podem ser barradas pelo aplicativo | se o nível 2 não conseguir, o Controle monta os filhos dele; as rotinas continuam |
| Worktree nasce sem `node_modules` e sem `.env.local` | passo 0 de toda frente: junção de `node_modules` e cópia de `.env.local` da pasta principal (nunca commitar) |
| Arquivos deste pacote estão **sem commit**, então não existem nas worktrees | todos leem pelo **caminho absoluto** `C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\…`; o registro vivo de cada frente fica em `registro/<ID>.md` |
| Dado de produção | leitura só com `BEGIN READ ONLY`, nunca `SET` de sessão; script que grava em produção nunca entra na suíte |
| Vocabulário jurídico: proibido token, NFT, cripto, ativo digital, investimento, rentabilidade | vale para e-mail (C), landing (D, M), KPIs (J) e qualquer texto novo |
| Marca | "Real Olímpico" (masculino) em todo texto; logos só de `public/brand/` |

## 9. Aceite geral do pacote

- Cada frente: aceite marcado no próprio MD, testes da branch verdes, completude entregue ao Controle (estado do Git na primeira linha).
- Controle: merge + typecheck + test + build verdes; relatório final com **o que deu certo e o que deu errado** por item do Rogério (os 16), em linguagem de negócio, para o Gabriel levar ao Rogério.
- Sem item "feito pela metade" escondido: o que não pôde ser feito vira linha em negrito no relatório (R7).
