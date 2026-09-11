# Version Comparison — RESUMO DO DIA · 11/09/2026

**O que mudou, em uma página.** A entrada completa é a **014** do
[`../VERSION_COMPARISON_DAILY.md`](../VERSION_COMPARISON_DAILY.md).

```
De:  f7a5e8c (10/09, Fase 0)
Para: ab3db39 (11/09, as três frentes mergeadas)
19 commits · 108 arquivos · +11.881 / −428 · 51 arquivos novos
Testes: 197 -> 343
```

---

## Entrou

| Frente | O que a plataforma passa a fazer |
|---|---|
| **B** | O cliente **tira dinheiro**: saque com taxa fixa e prazo D+3. Mais cadastro formal progressivo, compra direta pelo gateway e faturamento mensal da custódia |
| **C** | O cliente **tira a moeda**: retirada física em duas modalidades, prazo D+30, etiqueta dos Correios, rastreio e extinção do recibo no ato |
| **A** | Aceite dos termos por blocos, `/academy`, posicionamento institucional na landing e o extrato sem nome de contraparte |

O endereço dos Correios deixou de ser fictício — **Caixa Postal 7990, AGF Bandeirantes, Belo
Horizonte/MG**. Fecha a decisão D-6.

## Corrigido no merge, e não teria aparecido de outro jeito

**A restrição do ledger.** As frentes B e C reescreveram a mesma regra do banco, cada uma com
a própria lista de tipos. A da C rodaria por último e apagaria `saque` e `taxa_saque` — o
banco passaria a recusar todo saque, **em silêncio**, até um cliente real tentar. Corrigido
com a união dos onze tipos.

**A numeração.** As duas frentes criaram uma `009` e uma `010`. As da C viraram 011 e 012.

## Descoberto, e ainda aberto

**O preço da custódia está errado na tela** (CD-11 🔴). O modelo vigente é R$ 2,00 por moeda
por mês, mas o extrato diz "Custódia **anual** de 15 moeda(s) — R$ 25,00" — rótulo errado, e
valor de uma tabela de faixas que já foi aposentada. Precisa de decisão dos sócios.

## Números

```
typecheck ✓   lint ✓   test ✓ 343   build ✓ 25 páginas
banco: 12 migrations aplicadas, RLS em todas, nada em public
```

A soma fecha: 197 + 79 (B) + 45 (C) + 21 (A) = 342, mais 1 pulado. Nenhum teste se perdeu.
