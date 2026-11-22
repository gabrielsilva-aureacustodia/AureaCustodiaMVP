# Relatório de Execuções (detalhado) — frente I · manut-numero-da-moeda

## 1. Cabeçalho
- Projeto: Áurea Custódia / Real Olímpico — manutenção de novembro/2026, item 12 do Rogério (prazo 30/11/2026).
- Branch: `claude/manut-numero-da-moeda-3dedde` · ref_commit: `9e21fe1` · commits: 0 (B1) · migration: nenhuma.
- Packet: `C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\frentes\I-numero-da-moeda-no-recibo.md`.
- Pedido: "Mostrar o número da moeda no recibo do cliente (WhatsApp de sábado 7/11)."
- Sessões: chat de branch local_2bb975f7… · Execução local_ec9c65fd… · Auditoria (esta).

## 2. Tópicos na ordem real
1. **T1** (~22:25): o "número da moeda" é `Coin.id` (`RO-000042`), não o código do recibo (`REC-000042`, só troca o prefixo). Evidência: `types.ts:68-82`, `codes.ts:30-50`, `renumerar-acervo.cjs:16-22`. Texto: "Moeda nº RO-000042", logo abaixo do código do recibo.
2. **T2** (~22:30): folha (prop opcional `numeroDaMoeda` na 2ª linha da `.cert-code`), `Certificate` e cartão da lista (`ReciboCard`). Sem CSS novo. Admin: encaixe de 1 linha fica com o Controle (decisão do Controle, 22:30).
3. **T3** (~22:32): PDF com sub-linha em y=185 (não sexta linha em `fields`); primeiro campo de y=198 para y=206; selo e rodapé acompanham (+8 pt). `baixarReciboPdf` dividida em `montarReciboPdf` + `save` para o teste ler o conteúdo.
4. **T4** (~22:37): 15 testes novos, `tsc --noEmit` exit 0.

## 3. Arquivos tocados
- `src/components/recibo/numero-da-moeda.ts` (novo): rótulo e função únicos para tela, cartão e PDF (muda o texto numa linha).
- `src/components/recibo/FolhaDoRecibo.tsx`: prop opcional e linha do número.
- `src/components/recibo/Certificate.tsx`: passa `numeroDaMoeda={coin.id}`.
- `src/components/recibo/ReciboCard.tsx`: 2ª `.recibo-code` com o número.
- `src/lib/pdf/recibo-pdf.ts`: linha do número, coordenadas +8 pt, `montarReciboPdf`.
- `src/components/recibo/numero-da-moeda.test.ts` (10 testes) e `src/lib/pdf/recibo-pdf.test.ts` (5 testes), novos.
- Total: 4 alterados (+57/−6) e 3 novos de código; fora do Touch: nada. `hash.ts`, `types.ts`, `src/styles/**`, `.claude/`, `.cjs`: intocados.

## 4. Testes
- Rodados: os 2 arquivos novos, 15/15 verdes; `node node_modules\typescript\bin\tsc --noEmit` exit 0 (22:35). Prova do hash: vetor fixo calculado à parte com `node:crypto` contra `hashDaAnalise`; renderizar não altera `recibo.hash`; `hash.ts`/`analise.ts` não importam o helper.
- **Pendentes (por falta de memória da máquina, alerta do Controle): suíte completa `npm test` e ESLint dos 7 arquivos.**
- **Pendente: conferência visual em produção** (375–430 px, PDF no leitor real) — por ordem do Gabriel, depois do deploy do Controle. Feito antes da ordem: preview a 320 px e PDFs desenhados com pdf.js em área temporária fora do repositório.

## 5. Bloqueios / desvios da Auditoria
- Desvio (k) 22:33: `.env.test.local` criado só para o preview; removido às 22:36 (confirmado ausente). Servidores de preview (3104, 3110) encerrados.
- Nenhum commit, migration, palavra proibida, trava nova ou superfície protegida tocada.
- **Para o Controle no merge:** em `src/app/(admin)/admin/moedas/[codigo]/cliente/page.tsx`, depois da linha 78, acrescentar `numeroDaMoeda={linha.codigo}` (`linha.codigo` = `Coin.id`, `src/domain/admin/moedas.ts:98`). Sem isso o Admin compila, só não mostra o número.

## 6. O que o MD de execução já cobre
Evidência de T1, medidas do PDF, os 15 testes: `docs\diario\execucoes\2026-11-17--manut-i-numero-da-moeda--MD_EXECUCAO.md`. LOG da Auditoria: `...--LOG_DE_EXECUCAO.md`.

## 7. Próximo ato
Controle: rodar `npm test` e ESLint dos 7 arquivos quando houver memória, aplicar a linha do Admin, mesclar e conferir em produção.
