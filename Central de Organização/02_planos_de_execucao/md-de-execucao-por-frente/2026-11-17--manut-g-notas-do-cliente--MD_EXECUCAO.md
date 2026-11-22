# MD de execução — `claude/manut-notas-do-cliente-802669` (frente G · Notas fiscais acessíveis ao cliente)

```
Projeto:        Áurea Custódia / Real Olímpico — manutenção de novembro/2026 (item 9 do Rogério)
Branch:         claude/manut-notas-do-cliente-802669
Worktree:       C:\dev\AureaCustodiaMVP\.claude\worktrees\manut-notas-do-cliente-802669
Assignee:       chat de branch G (substitui a 1ª sessão, que falhou ao abrir) — faz a execução ele mesmo, sem filhos (memória do computador no limite)
Packet:         C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\frentes\G-notas-do-cliente.md
Ref_commit:     0f55132 (main, já com as frentes I, D, C, B, E, H e A)
Aberta em:      2026-11-18
Atualizada em:  2026-11-18
Estado da branch: PRONTA PARA MERGE (T1–T5 fechados; falta só o que é do Controle: typecheck completo, suíte, build, deploy e conferência visual em produção)
```

## RETOMADA (ler primeiro)

- **Estado:** T1–T5 FECHADOS. A frente está pronta para o merge do Controle.
- **Próximo ato (do Controle):** merge → `npm run typecheck`, `npm test`, `npm run build` completos → deploy → conferir `/conta/notas` e `/conta/faturas` em produção (320/375/430 px, claro e escuro).
- **Git:** branch sobre `0f55132`, **0 commits** (B1: o Controle commita). 4 arquivos alterados + 12 novos (lista na seção Sessões). `node_modules` (junção) e `.env.local` (cópia) estão na worktree e são ignorados pelo Git.
- **Regras de máquina (Controle, 18/11):** nada de `npm run build`, `typecheck` completo, suíte inteira, servidor local ou Docker; só `eslint` dos arquivos da frente e `vitest` de UM arquivo por vez; conferência visual só em produção, depois do deploy do Controle.

## Aceite

- [x] **T1** — o que existe de verdade: tabela no tópico T1 (49 notas autorizadas + 2 canceladas em produção; 13 pedidos só rejeitados por cadastro; PDF não existe em lugar nenhum).
- [x] Página `/conta/notas` ("Notas fiscais" no menu): só as notas do próprio cliente (competência, serviço, valor, número, data), com download do XML e do PDF; cancelada aparece como "Cancelada em…" e continua listada; fatura paga sem nota ainda aparece como "Nota em preparação".
- [x] Link "Ver nota" nas faturas pagas de `/conta/faturas`.
- [x] Segurança/LGPD: Server Action com sessão, filtrando pelo dono; teste prova que a conta A não lê a nota da conta B (`src/server/actions/notas.test.ts`, PGlite, 14 testes verdes: lista, id da outra conta, XML e PDF).
- [x] Texto sem vocabulário proibido (grep nos arquivos novos: nada); cartões em vez de tabela (320 px sem rolar de lado), alvo de 44 px (`min-height:44px` nos botões, no resumo da chave e nos links), cores só por tokens do tema (claro e escuro). **Conferência visual no navegador: só em produção, depois do deploy do Controle** — não feita aqui por regra de máquina.
- [x] eslint dos 14 arquivos (0 problemas) + vitest, um arquivo por vez (verdes). Typecheck LIMITADO aos arquivos da frente e suas importações (tsconfig temporário, apagado): 0 erros. `typecheck` completo, `npm test` inteiro e `build` ficam para o Controle, no merge.

## Ler (e só isto)

Já lido: `NFSE_INTEGRACAO_NO_SITE.md`, `src/server/nfse/README.md`, `sefin.ts`, `repositories/nfse.ts`, migrations 044/045, `domain/nfse/pedidos.ts` e `eventos.ts` (trechos), `conta/faturas/page.tsx`, `FaturasCustodia.tsx` (cabeça), `Sidebar.tsx` (lista do menu), `plano-custodia.ts` (`listarMinhasFaturas`, padrão de Server Action), `recibo-pdf.ts` (padrão de PDF com jsPDF).

## Touch

`src/app/(app)/conta/notas/**` (novo) · `src/server/nfse/consulta*.ts` (novo, leitura) · `src/server/actions/notas.ts` (novo) · `src/components/shell/Sidebar.tsx` (uma linha) · `conta/faturas` (o link).

**Extensões que a frente precisou (anotadas para o Controle confirmar):**
1. `src/components/custody/FaturasCustodia.tsx` — o link "Ver nota" vive aqui (é quem desenha cada fatura; `conta/faturas/page.tsx` só posiciona o componente). Edição mínima e aditiva.
2. `src/domain/nfse/notas-do-cliente.ts` e `xml-da-nota.ts` (+ testes) — arquivos NOVOS de domínio puro (estado da nota para o cliente; leitura do XML autorizado). `codigos.ts` e `dps.ts` não são tocados.
3. `src/lib/pdf/nota-pdf.ts` (+ teste) — arquivo NOVO. O PDF não existe em lugar nenhum (ver T1); o doc de integração já previa `src/lib/pdf/` para isso.

## Do not touch

Emissão, assinatura, certificado, `src/domain/nfse/codigos.ts` (decisão fiscal é do Gabriel), `src/server/nfse/emissao.ts` além de ler, cancelamento (H), `types.ts`, `repositories/nfse.ts` (a consulta nova é um arquivo à parte, só leitura).

## Fora de escopo

Emitir ou reemitir nota, corrigir nota, e-mail com a nota (C), nota de frete (não existe), emissão retroativa das faturas pagas antes de 23/10/2026 (decisão do Gabriel).

## Tópicos

### T1 — Medir o que existe em produção + como obter o PDF

Estado: **FECHADO** (leitura em 18/11/2026, `BEGIN READ ONLY … ROLLBACK`, nenhum `SET`, e-mails mascarados).
Aceite deste tópico: tabela no MD.
Arquivos deste tópico: nenhum (consulta feita por script no scratchpad).

**Conclusão sem rodeio:** a emissão à Sefin **roda em produção e as notas existem de verdade**: 49 autorizadas + 2 canceladas, todas no ambiente `producao`, todas com número, chave de acesso e XML guardados. A página pode listar e entregar o XML hoje. **O PDF não existe em lugar nenhum**: a plataforma nunca gerou DANFSe e a API oficial que gerava o PDF foi suspensa em 03/08/2026 (NT 008 v1.02, p. 6) — quem emite é quem desenha o PDF. A frente gera o PDF a partir do XML guardado.

| O que | Quantidade | Observação |
|---|---|---|
| Pedidos de nota em `aurea.nfse_emissoes` | **64**, de **26** clientes (tomadores) | |
| Autorizadas em produção (com `numero_nfse`, `chave_acesso`, `xml_nfse`) | **49** | custódia 34 · comissão de compra 7 · comissão de venda 7 · tarifa de saque 1; 1ª em 23/10/2026 09:51, última em 16/11/2026 15:15 |
| Canceladas (com `xml_cancelamento`) | **2** | nº 20 (04/11) e nº 41 (14/11, caso do Rogério), as duas de custódia, motivo 2 "serviço não prestado" |
| Só pedido, sem nota emitida | **13** | todas `rejeitada` por **CADASTRO** ("Cliente sem cadastro completo (CPF e nome)"), 5 tentativas cada (o limite automático): ficam paradas até alguém mandar **Reprocessar** no painel. Fatos de 07 a 10/11/2026 |
| Notas em ambiente de teste (`restrita`) ainda na tabela | 0 | (o envio em produção reenvia as de teste; hoje não sobra nenhuma) |
| Faixa de números das notas do sistema | nº 4 a nº 54 | (51 notas com número; as nº 1 a 3 são as do contador, abaixo) |
| Tamanho do XML | ~10,9 KB cada (máx. 10.963 bytes) | leve: cabe numa resposta de Server Action |

**Faturas de custódia pagas × notas:** 60 pagas = **34 com nota autorizada** + **13 com pedido rejeitado por cadastro** + **13 sem pedido nenhum** (todas pagas até 22/10/2026, antes da emissão automática de 23/10 — o mesmo achado da frente H: R$ 326,00 em 09/2026 e 10/2026). Todas as 33 pagas em novembro têm pedido. (As 2 notas canceladas são de faturas que a H/estorno já levou a `cancelada`, por isso não entram na conta das pagas.) **A página não promete nota para as 13 sem pedido** — "em preparação" seria falso, pois nada as emitirá sozinho (decisão do Gabriel sobre emissão retroativa).

| Origem da fatura paga | Pagas | Com pedido | Com nota autorizada |
|---|---|---|---|
| ciclo_mensal | 16 | 14 | 14 |
| compra | 9 | 7 | 7 |
| contratacao | 2 | 1 | 1 |
| entrada_no_acervo | 33 | 25 | 12 (as outras 13 são as rejeitadas por cadastro) |

**As notas de outubro (`Documentos\Real Olímpico\NFs e GOV`):** a pasta tem só **3 PDFs** (custódia, comissão de compra e comissão de venda, de 22/10/2026 12:11) — são as **nº 1, 2 e 3, emitidas à mão pelo contador no Emissor Web** (série 70000) como modelo, e o `.pfx` do e-CNPJ. **Não estão em `nfse_emissoes`** (nasceram fora do sistema). As do sistema começam em **23/10/2026 (nº 4)**. Resultado para o cliente: a página lista **só o que o sistema emitiu** (nº 4 em diante); as nº 1–3 não aparecem para ninguém.

**Como obter o PDF (fonte e data):**
- A NT 008 v1.02 (14/07/2026, https://fenacon.org.br/wp-content/uploads/2026/07/nt-008-se-cgnfse-danfse-20260714-v1-02.pdf, p. 6): a API de geração do DANFSe (`adn.nfse.gov.br/danfse`) foi **sobrestada (suspensa) em 03/08/2026**; sistemas emissores e ERPs geram o documento.
- A NT 008 (p. 14–15) manda o QR Code apontar para `https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=<chave de acesso>`; A4 retrato, uma só página.
- O modelo real do layout é o PDF do contador (DANFSe v2.0, 22/10/2026): identificação, prestador, tomador, serviço, tributação municipal/federal/IBS-CBS, valor total.
- **Decisão desta frente (para o Controle/Gabriel confirmar):** o PDF sai como **"Documento Auxiliar da NFS-e"**, montado do XML autorizado, em uma página A4, com o aviso de que o documento fiscal oficial é o XML e o endereço de consulta pública com a chave. **Sem QR Code** (não há biblioteca de QR no projeto e instalar dependência fica fora da frente). Isso NÃO é o DANFSe v2.0 completo da NT 008. Se o Gabriel quiser o layout oficial com QR, é uma tarefa à parte (dependência `qrcode` + conferência com o contador).

Próximo ato deste tópico: nenhum (fechado).

### T2 — Consulta de leitura + Server Action (só o dono)

Estado: **FECHADO**
Aceite deste tópico: teste de isolamento — a conta A não lê a nota da conta B (nem a lista, nem o XML, nem o PDF).
Arquivos deste tópico: `src/domain/nfse/notas-do-cliente.ts`(+test), `src/domain/nfse/xml-da-nota.ts`(+test), `src/server/nfse/consulta.ts`, `src/server/actions/notas.ts`(+test).
Log:
- `notas-do-cliente.ts`: 5 estados para o cliente (emitida, cancelada, cancelando, em preparação, falta cadastro); nunca expõe e-mail, DPS, tentativas, justificativa livre; nota de teste (`restrita`) vale "em preparação". 16 testes verdes.
- `xml-da-nota.ts`: lê o XML autorizado (chave, número, prestador, tomador, serviço, ISSQN, PIS/COFINS, IBS/CBS); ISSQN e IBS/CBS não se misturam (o `vBC` aparece nos dois). 10 testes verdes.
- `consulta.ts`: dois `SELECT` com o dono dentro do `WHERE` (`lower(tomador_email) = lower($1)`); `id` nunca basta.
- `notas.ts` ('use server'): `listarMinhasNotas` e `baixarMinhaNota(id, 'xml' | 'pdf')`; e-mail só da sessão; outra conta e id inexistente respondem igual. 14 testes verdes (PGlite com as migrations reais, dois clientes no mesmo banco).
Próximo ato deste tópico: nenhum (fechado).

### T3 — Página `/conta/notas` + menu

Estado: **FECHADO** (código e testes; conferência visual só em produção)
Aceite deste tópico: lista com estados, download de XML e PDF; item "Notas fiscais" no menu; mobile 320–430 px, alvo de 44 px, claro e escuro (conferência visual só em produção).
Arquivos deste tópico: `src/app/(app)/conta/notas/page.tsx`, `NotasDoCliente.tsx`, `src/lib/pdf/nota-pdf.ts`(+test), `Sidebar.tsx`, `Topbar.tsx` (título da rota), `src/styles/account.css` (bloco aditivo).
Log:
- `NotasDoCliente.tsx`: cartões (não tabela), âncora `#nota-<id>`, selos, chave de acesso recolhida, "Baixar PDF" (dourado) e "Baixar XML". PDF montado no navegador (import dinâmico do jsPDF).
- `nota-pdf.ts`: "Documento Auxiliar da NFS-e", 1 página A4, blocos na ordem do DANFSe (identificação, chave, prestador, tomador, serviço, ISSQN, federal e IBS/CBS, valores), faixa e marca d'água quando cancelada, endereço de consulta pública com a chave. Renderizei duas folhas (emitida e cancelada) com o pymupdf e conferi o desenho; arrumei um rótulo que invadia a célula vizinha. Teste temporário de conferência APAGADO. 7 testes verdes.
- `Sidebar.tsx`: item "Notas fiscais" (grupo Conta, antes de "Minha conta"); e o menu passou a acender UM item só (o de href mais específico) — sem isso `/conta/notas` acendia também "Minha conta".
- `Topbar.tsx`: título e subtítulo da rota (sem isso a tela cairia no cabeçalho do painel).
Próximo ato deste tópico: nenhum (fechado).

### T4 — Link nas faturas + nota cancelada/em preparação

Estado: **FECHADO**
Aceite deste tópico: fatura paga com nota → "Ver nota"; cancelada → continua listada como "Cancelada em…"; paga sem nota emitida → "Nota em preparação".
Arquivos deste tópico: `src/components/custody/FaturasCustodia.tsx` (aditivo, 23 linhas).
Log:
- A lista de faturas lê também `listarMinhasNotas()` (com `.catch`: falha nas notas nunca derruba as faturas) e liga cada nota à fatura pelo id (`faturaId`).
- Fatura não aberta com nota emitida, cancelando ou cancelada → "Ver nota" (leva a `/conta/notas#nota-<id>`; a nota cancelada pela frente H continua listada e com link); com nota ainda em preparação → "Nota em preparação"; sem nenhum pedido de nota (as 13 pagas até 22/10/2026) → "—", sem promessa.
Próximo ato deste tópico: nenhum (fechado).

### T5 — Verificação da branch

Estado: **FECHADO** (o que cabe à branch; o resto é do Controle)
Aceite deste tópico: eslint dos arquivos da frente sem problemas; vitest de cada arquivo novo, um por vez, verde. `typecheck` completo, `npm test` e `build` ficam para o Controle.
Arquivos deste tópico: —
Log:
- eslint nos 14 arquivos (7 novos de código, 4 testes novos, 3 editados): 0 problemas.
- vitest, um por vez: `xml-da-nota.test.ts` 10 · `notas-do-cliente.test.ts` 16 · `notas.test.ts` 14 · `nota-pdf.test.ts` 7 — todos verdes.
- Typecheck limitado (tsconfig temporário com só os arquivos da frente, que o tsc expande às importações), 0 erros; arquivo temporário apagado.
- NÃO rodados (ordem do Controle, memória da máquina): `npm run typecheck` completo, `npm test` inteiro, `npm run build`, servidor local.
Próximo ato deste tópico: nenhum (fechado).

## Sessões

### Sessão 2026-11-18 (chat de branch G, execução própria)

Tipo: E
Feito: Passo 0; leitura da ficha e do código; T1 (leitura em produção + como obter o PDF); T2 (domínio, consulta, Server Action, teste de isolamento); T3 (página, PDF, menu, título, CSS); T4 (link nas faturas); T5 (eslint, vitest por arquivo, typecheck limitado); rascunho da memória R11 em `docs/memorias/2026-11-17--claude-code--manut-notas-do-cliente.md`.
Não feito: conferência visual (só em produção); typecheck completo, suíte inteira e build (do Controle).
Bloqueios para o humano: nada.
Teste rodado? sim — por arquivo (ver T5).
Próximo ato (um): o Controle faz o merge e roda typecheck/suíte/build; depois confere as duas telas em produção.

**Arquivos da frente (sem commit):**
- novos (12 de código e docs): `src/domain/nfse/notas-do-cliente.ts` (+ `.test.ts`), `src/domain/nfse/xml-da-nota.ts` (+ `.test.ts`), `src/server/nfse/consulta.ts`, `src/server/actions/notas.ts` (+ `.test.ts`), `src/lib/pdf/nota-pdf.ts` (+ `.test.ts`), `src/app/(app)/conta/notas/page.tsx`, `src/app/(app)/conta/notas/NotasDoCliente.tsx`, este MD e `docs/memorias/2026-11-17--claude-code--manut-notas-do-cliente.md`.
- alterados (4): `src/components/shell/Sidebar.tsx` (+19/−1), `src/components/shell/Topbar.tsx` (+6), `src/components/custody/FaturasCustodia.tsx` (+23/−1), `src/styles/account.css` (+23).
- **Fora da lista Touch da ficha (anotado):** `Topbar.tsx`, `account.css`, `FaturasCustodia.tsx`, `src/lib/pdf/nota-pdf.ts`, `src/domain/nfse/notas-do-cliente.ts` e `xml-da-nota.ts` — todos aditivos ou novos.
- **Superfície protegida:** nada tocado. **Migration:** nada (as colunas já existem desde a 044/045).
