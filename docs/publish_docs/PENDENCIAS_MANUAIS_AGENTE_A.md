# Pendências manuais — Agente A

**O que só uma pessoa pode fazer, porque está fora do repositório.**
Arquivo exclusivo do Agente A (regra 8 do [`PROTOCOLO_DO_AGENTE.md`](PROTOCOLO_DO_AGENTE.md)).
Os Agentes B e C têm os seus; ninguém escreve no arquivo do outro.

> **Para o Rogério.** Cada linha aqui é uma coisa que o código não consegue resolver
> sozinho — depende de alguém abrir um site, preencher um cadastro ou tomar uma decisão.
> Enquanto a linha estiver aberta, a parte da plataforma que depende dela não funciona de
> verdade, mesmo que a tela pareça pronta.

Item resolvido **não some**: é marcado `✅ FEITO em dd/mm`, para o próximo agente não refazer.

---

## Abertas

### A-4 · O preço da custódia informado ao cliente está errado 🔴

| | |
|---|---|
| **O que falta** | Decidir se o `custodyCharges` legado sai e as faturas mensais assumem, e se o texto passa a dizer "mensal" |
| **Quem pode fazer** | **Gabriel e os sócios** — é preço dito ao cliente, e `src/domain/fees.ts` é superfície protegida |
| **O que está bloqueado** | A publicação. A plataforma informa hoje um preço de custódia que não é o vigente |
| **Como conferir que foi feito** | `/conta/extrato` mostra período e valor que batem com a tabela do plano executivo, e a palavra "faixa" não aparece em tela nenhuma |

Descoberto na auditoria do merge, em 11/09/2026. A decisão **D-3** trocou a custódia de faixas
anuais por **R$ 2,00 por moeda por mês**. A frente B construiu o modelo novo, mas o antigo não
saiu — e é o antigo que o cliente lê:

> `Custódia anual de 15 moeda(s) — Pago · R$ 25,00`

Três erros numa linha: o período é mensal, não anual; o valor mensal de 15 moedas seria
R$ 30,00; e R$ 25,00 vem da tabela de faixas que foi aposentada. Em `/envios` aparece ainda
"nova **faixa**", palavra do modelo que deixou de existir.

Detalhe completo em `docs/diario/CRITICAL_DEBUGS.md`, item **CD-11**.

## Resolvidas

### D-6 · Endereço real de recebimento dos Correios ✅ FEITO em 10/09

Resolvida pelo **Agente C**, não por mim: o Gabriel passou o endereço direto para a frente que
ia usá-lo. O valor está em `src/lib/shipping/correios.ts` e vem de um Termo de Assinatura de
Caixa Postal dos Correios:

```
AUREA CUSTODIA LTDA — Caixa Postal 7990
AGF Bandeirantes — Av. dos Bandeirantes
Mangabeiras · Belo Horizonte · MG · CEP 30315-970
```

Com isso a etiqueta de postagem deixa de ser fictícia e o bloco 11 do plano executivo
desbloqueia.

### A-3 · Aceite por blocos dos Termos de Uso e Privacidade ✅ FEITO em 10/09

Implementados os 6 blocos de aceite operacional no domínio (`src/domain/legal.ts`), estendendo `src/server/auth/legal.ts` com validação de versões (`1.0-2026-09-10`), gravação de blocos marcados e trava `exigirAceiteLegal(email)`. Modal `ModalAceiteBlocos` e hook `useVerificarAceiteLegal` criados em `src/components/legal/ModalAceiteBlocos.tsx` com alvos de toque $\ge 44\text{px}$.

**Orientações de integração para o Agente B (Sessão B-2):**
- Quando o usuário tentar realizar sua primeira operação financeira (depósito ou compra direta), a interface pode utilizar o hook `useVerificarAceiteLegal()` para acionar a `ModalAceiteBlocos` caso `me.settings?.legalAcceptance` não esteja vigente.
- No servidor, antes de creditar saldo ou autorizar transações, basta invocar `await exigirAceiteLegal(email)` de `@/server/auth/legal`.

### A-2 · O extrato ainda mostra o nome da contraparte ✅ FEITO em 10/09

Decisão dos sócios em 10/09/2026 (extensão da D-5): o nome e o e-mail de um cliente nunca
aparecem para outro cliente no extrato pessoal nem nos arquivos CSV/XLSX exportados.
Implementada a **Opção (A)** em `src/domain/statement.ts:104-137`: descrições limpas como
`Compra no marketplace` e `Venda no marketplace`. As colunas de moeda, quantidade, valor e
taxa já identificam os dados da operação. O ledger interno (`src/domain/ledger.ts`) continua
preservando o nome para `/relatorios` administrativos, sem alterações. Testado e validado
com asserções dedicadas em `src/domain/statement.test.ts`.

### A-1 · Aplicar as migrations 005 e 006 no Supabase ✅ FEITO em 10/09

Aplicadas durante a própria sessão, com autorização do Gabriel. A **005** renomeou
`aurea.nfts` para `aurea.recibos`; a **006** reescreveu o prefixo dos 149 códigos já
gravados, de `NFT-000001` para `REC-000001`. Conferido com `npm run db:check`: as 19 tabelas
presentes, RLS ligada em todas, nenhuma tabela em `public`.

**Cuidado para quem for repetir isso em outro ambiente:** aplicar as migrations **antes** de
o código correspondente estar no ar derruba a aplicação com
`relation "aurea.recibos" does not exist`. Código primeiro, migration depois.
