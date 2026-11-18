# Número da moeda no recibo — memória do agente

- **Data:** 2026-11-17 · **Agente:** claude-code (Auditoria da frente I) · **Projeto/branch:** manut-numero-da-moeda (`claude/manut-numero-da-moeda-3dedde`)

## 1. Estado em uma tela
O recibo do cliente mostra "Moeda nº RO-000042" na folha da tela, no cartão da lista e no PDF, sem alterar o hash. Código e 15 testes prontos na branch (0 commits, base `9e21fe1`). Faltam: `npm test` completo, ESLint dos 7 arquivos, linha do Admin (Controle, no merge) e conferência visual em produção.

## 2. Decisões e o porquê
- "Número da moeda" = `Coin.id` (`RO-000042`), não `Recibo.codigo` (`REC-000042`, mesmo número com outro prefixo) — evidência em `types.ts`, `codes.ts`, `renumerar-acervo.cjs`. Padrão "Moeda nº RO-000042"; o Gabriel muda o texto numa linha (`src/components/recibo/numero-da-moeda.ts`).
- Sub-linha no cabeçalho do PDF (y=185), não sexta linha em `fields` — a sexta linha empurraria selo e rodapé 30 pt; a sub-linha custa 8 pt.
- Prop `numeroDaMoeda?` opcional em `FolhaDoRecibo` — o Admin também desenha a folha e fica fora do Touch; o Controle encaixa 1 linha no merge (decisão do Controle, 17/11/2026).
- Ordens do Gabriel no dia: sem Docker; servidor local só pontual e com memória liberada; conferência visual em produção após o deploy.

## 3. O que aprendi (armadilhas, comandos, caminhos)
- O `include` do vitest é só `src/**/*.test.ts`: um `.test.tsx` nunca roda. Componente se testa com `createElement` + `renderToStaticMarkup`.
- Para ler o PDF em teste, dividir `baixarReciboPdf` em `montarReciboPdf` (o `doc.save` depende do DOM) e ler os operadores `Td`/`Tj`.
- O espaço inseparável (U+00A0) segura a linha na tela de 320 px; no PDF vira espaço comum (métrica do jsPDF).
- Sem memória (RAM ~0,3 GB): `tsc` via `node node_modules\typescript\bin\tsc --noEmit` sozinho funcionou; `npm test`/ESLint morreram.
- `.env.test.local` ignorado pelo git foi criado para um preview e removido (desvio (k) do dia); pasta `.claude/` da worktree é rastreada e não é desvio.
- Mojibake visto no console do PowerShell não é do arquivo (UTF-8 está certo).

## 4. Como continuar (próximos passos exatos)
1. Controle: no merge, em `src/app/(admin)/admin/moedas/[codigo]/cliente/page.tsx`, depois da linha 78, acrescentar `numeroDaMoeda={linha.codigo}`.
2. Rodar `npm test` uma vez e ESLint dos 7 arquivos da frente quando houver memória.
3. Depois do deploy: conferir em produção `/recibos`, `/recibos/[coinId]` (320–430 px, claro/escuro) e abrir um PDF no leitor real.

## 5. Pendências e riscos
- **Suíte completa e ESLint não rodaram.** **Visual de 375–430 px e PDF real só em produção.** Carimbos Bloqueado/Extinto no PDF sobrepõem os mesmos campos de antes (não piorou).

## 6. Ligações
MD de execução `docs/diario/execucoes/2026-11-17--manut-i-numero-da-moeda--MD_EXECUCAO.md`, LOG e CONTINUIDADE ao lado, ficha `docs/manutencao-2026-11/frentes/I-numero-da-moeda-no-recibo.md`. `[[terminologia-juridica-aurea]]`, `[[teste-visual-nunca-vai-para-producao]]`.
