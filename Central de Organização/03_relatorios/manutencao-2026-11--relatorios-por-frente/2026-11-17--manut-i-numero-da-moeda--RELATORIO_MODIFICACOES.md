# Relatório de Modificações (detalhado) — frente I

Base comparada: `9e21fe1` · branch `claude/manut-numero-da-moeda-3dedde`

| Item | Tipo | Path | Consequência |
|---|---|---|---|
| Helper do número da moeda | crítico (texto único) | `src/components/recibo/numero-da-moeda.ts` (novo) | Tela, cartão e PDF leem o mesmo rótulo; trocar o texto é mexer numa linha |
| Prop opcional na folha | contrato de componente | `src/components/recibo/FolhaDoRecibo.tsx` | `numeroDaMoeda?` opcional: o Admin compila sem mudar |
| PDF: sub-linha e `montarReciboPdf` | crítico (layout) | `src/lib/pdf/recibo-pdf.ts` | Primeiro campo, selo e rodapé 8 pt mais abaixo; `baixarReciboPdf` mantém a assinatura |
| Tela e cartão | UI | `Certificate.tsx`, `ReciboCard.tsx` | Mostram "Moeda nº RO-…" |

## O que NÃO mudou de estrutura
Sem pasta nova na raiz, sem integração, sem env, sem migration, sem CSS novo. `hash.ts`, `types.ts` e a fórmula do hash intactos (o número só é exibido); sem QR.

## MDs de pasta / environment table
Nenhum MD de pasta existente foi alterado (B5). **Pendência para o Controle:** linha de encaixe no Admin, `src/app/(admin)/admin/moedas/[codigo]/cliente/page.tsx`, depois da linha 78: `numeroDaMoeda={linha.codigo}`.
