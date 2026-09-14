# `src/server/config/` — a configuração do site, lida do banco

Frente C, sub-branch C3. É o que faz as taxas, o catálogo de moedas, os limites e os prazos
editados em `/admin/configuracao` valerem no resto da plataforma.

> **Módulos exclusivos de servidor.** Os três arquivos têm `import 'server-only'`. O cliente recebe
> os valores prontos — pelo layout de `(app)` e por `GET /api/state` —, nunca este código.

---

## Os arquivos

| Arquivo | O que faz |
|---|---|
| `carregar.ts` | `carregarConfiguracaoDoSite()`: lê `aurea.config_plataforma` e `aurea.tipos_moeda` e monta taxas, parâmetros operacionais, parâmetros dos Termos, canais de atendimento e catálogo. `carregarRegrasDoMercado()` é o recorte que as Server Actions usam; `configDoCliente()` é o que vai ao navegador |
| `documentos.ts` | A versão vigente de cada documento contratual (a mais recente publicada no banco) e o texto que a configuração produz; `documentosPendentesDeAceite(email)` alimenta a faixa de versão nova |
| `integracoes.ts` | Pergunta ao ambiente quais variáveis **existem** — nunca devolve valor — para a aba Integrações |
| `ATALHOS.md` | RA-46 e RA-47 |

---

## As três coisas que explicam o desenho

### 1. O código é o padrão; o banco é a verdade

Chave que nunca foi mudada pelo painel não tem linha no banco e vale o que o código diz —
`TAXAS_PADRAO`, `COIN_TYPES`, `DEPOSITO_MAX`, `SYNC_MS`, `PARAMETROS_LEGAIS`. Por isso a migration 024
nasce vazia e nenhuma taxa muda com ela. As regras de cada chave (tipo, intervalo, rótulo) moram em
`src/domain/admin/configuracao.ts`.

### 2. O domínio continua puro

`src/domain/fees.ts` e `src/domain/constants.ts` não leem banco: as funções recebem a tabela e o
catálogo por parâmetro, com o padrão do código quando ninguém passa nada. Quem carrega é este
módulo, e quem passa é a Server Action — o mesmo desenho que a A1 deu à `TabelaDeTaxas`.

### 3. Falha de leitura não derruba o site

Sem banco, antes da migration ou com o banco oscilando, a leitura devolve o padrão do código e o
erro vai para o log. Uma tela de mercado que não abre porque a configuração não respondeu seria
pior (RA-47).

---

## Quem chama

- Server Actions de mercado, venda, custódia, conta, pagamento e plano (`src/server/actions/`), e o
  faturamento mensal (`src/server/custodia/faturamento.ts`).
- `src/app/(app)/layout.tsx` e `src/app/api/state/route.ts`, que entregam `ConfigDoCliente` e a
  pendência de aceite ao `AppProvider`.
- As páginas públicas `/taxas`, `/termos` e `/suporte`, e o registro de aceite
  (`src/server/documentos/aceites.ts`).
- O painel: `src/app/(admin)/admin/configuracao` e `logistica`.

A escrita não mora aqui: é `src/server/admin/configuracao.ts`, chamado pelas Server Actions de
`src/server/actions/admin/config.ts`.
