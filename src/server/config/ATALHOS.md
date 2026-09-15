# Atalhos assumidos em `src/server/config/`

Cada item também está em [`RISCOS_ASSUMIDOS.md`](../../../RISCOS_ASSUMIDOS.md), na raiz.

---

## RA-46 🟠 — taxa e prazo mudados no painel valem na hora

**Arquivos:** `carregar.ts`, `documentos.ts`

- `carregarRegrasDoMercado()` é chamada por cada ação de mercado, custódia e conta antes da
  transação: a taxa gravada no painel vale a partir da próxima operação.
- `documentosPendentesDeAceite()` compara o hash do último aceite de cada documento com o hash
  vigente. A faixa do app mostra o que falta aceitar e não bloqueia nada.
- A versão vigente de um documento é a mais recente de `aurea.documentos_legais`; o texto exibido é
  o que a configuração vigente produz, e `confere` diz se os dois batem.

**Como se paga:** regra comercial de antecedência para mudança de taxa, se os sócios quiserem.

---

## RA-47 🟡 — leitura que falha cai no padrão do código

**Arquivos:** `carregar.ts` (`carregarConfiguracaoDoSite`)

- Sem banco, antes da migration 024 ou com o banco oscilando, a configuração volta a
  `TAXAS_PADRAO`, `COIN_TYPES` e `DEPOSITO_MAX`, e o erro vai para o log (`[config]`). Durante uma
  falha, uma taxa mudada no painel deixa de valer.
- Não há cópia em memória entre requisições (mesmo motivo do `AppState`): cada leitura é uma
  transação curta de três consultas, também no ciclo de sincronização do app.

**Como se paga:** se a leitura por operação pesar, um cache curto com invalidação na gravação.

---

## O que NÃO é atalho nesta pasta

- **O intervalo aceito por chave** (`src/domain/admin/configuracao.ts`) é anteparo de digitação —
  comissão zero é aceita. Não é política comercial.
- **Canais de atendimento vazios não aparecem em `/suporte`.** É o comportamento pedido desde a A3
  (RA-26): a página mostra só o canal que existe.
