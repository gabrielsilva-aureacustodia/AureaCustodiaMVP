# `/admin/logistica` — envios e retiradas de todas as contas

Plano do Admin, seção 3.6; frente C, sub-branch C3. Pede `logistica.ver`; os links de etiqueta
aparecem com `logistica.etiquetas`.

`page.tsx` lê o filtro da URL (`?ver=tudo|envios|retiradas&situacao=abertos|atrasados|todos&busca=`),
os prazos da aba Operacional da configuração e chama `carregarLogistica()`
(`src/server/admin/logistica.ts`). O desenho é `src/components/admin/logistica/PainelLogistica.tsx`.

- **Rastreio:** o último retrato gravado em `aurea.rastreios` pelo job — os mesmos eventos que o
  cliente vê. A tela nunca consulta os Correios.
- **Prazo estourado em vermelho:** validação na bancada (dias úteis), trânsito do envio (dias) e o
  D+30 da retirada. São alertas de tela, não travas (`src/domain/admin/logistica.ts`).
- **Retirada:** forma de pagamento e parcelas da B3.
- **Etiquetas:** as rotas que já existem, `/api/envios/etiqueta/[protocolo]` e
  `/api/retiradas/etiqueta/[id]`, que desde a C3 aceitam `logistica.etiquetas` além do dono.
