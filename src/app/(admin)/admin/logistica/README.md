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
- **Expedição da retirada (22/10/2026, contrato com os Correios):** com `logistica.expedir`, cada
  retirada `paga` ou `separacao` ganha **Emitir etiqueta dos Correios** — a pré-postagem de saída
  (PAC 03298 na comum, SEDEX 03220 com AR na segura) é criada pela API e o código de rastreio nasce
  lá. A retirada vai para `separacao`, nunca para `postada`: quem marca a postagem é o rastreio,
  quando a agência registra o objeto. Depois aparecem o código, **Imprimir etiqueta** (o PDF oficial
  pela mesma rota, com `logistica.etiquetas`) e **Cancelar etiqueta** (cancela nos Correios; a
  retirada fica em `separacao` esperando outra). Sem o contrato configurado no ambiente, no lugar do
  botão vem o campo para digitar o código da postagem feita no balcão (`paga` → `separacao` →
  `postada`). As ações são de `src/server/actions/admin/logistica.ts`.
- `page.tsx` lê a pré-postagem ativa das retiradas visíveis direto do repositório, porque
  `LinhaRetirada` (`src/domain/admin/logistica.ts`) não a carrega.
