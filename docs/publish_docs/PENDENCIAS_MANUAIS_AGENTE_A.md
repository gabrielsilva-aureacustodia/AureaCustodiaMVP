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

### D-6 · Endereço real de recebimento dos Correios 🔴

| | |
|---|---|
| **O que falta** | O endereço físico para onde o cliente manda a moeda |
| **Quem pode fazer** | **Gabriel** — é decisão da empresa, ninguém deduz |
| **O que está bloqueado** | O bloco 11 do plano executivo, e toda etiqueta de postagem real |
| **Como conferir que foi feito** | `src/lib/shipping/correios.ts:29` deixa de conter "Avenida Paulista" |

O endereço que está no código hoje é **fictício desde que o módulo nasceu**. Enquanto ele
estiver lá, **nenhuma etiqueta pode ser gerada de verdade — nem para teste**: a moeda do
cliente sairia para uma Avenida Paulista que não é da empresa.

Precisa vir **completo e literal**, com todos os campos, porque endereço pela metade vira
etiqueta pela metade:

```
Logradouro:
Número:
Complemento:
Bairro:
Cidade:
UF:
CEP:
Telefone:
Nome do responsável pelo recebimento:
```

---

### A-2 · O extrato ainda mostra o nome da contraparte 🟡

| | |
|---|---|
| **O que falta** | Decidir se `src/domain/statement.ts:113` e `:131` param de escrever "Compra de Rozane" / "Venda para Rogério Pena" |
| **Quem pode fazer** | **Gabriel e os sócios** — é extensão da decisão D-5, não implementação |
| **O que está bloqueado** | Nada trava. Mas o anonimato da vitrine fica furado enquanto isso |
| **Como conferir que foi feito** | `/conta/extrato` deixa de citar nome de terceiro na coluna DESCRIÇÃO |

Descoberto ao percorrer as telas em 10/09/2026. A D-5 falou da **vitrine**, e a vitrine está
resolvida: quem navega vê `Vendedor #D829`. Só que, ao concluir a compra, o extrato da conta
escreve o nome real de quem vendeu — e o mesmo vale para a planilha exportada. Na prática,
basta comprar uma moeda para descobrir quem é o `#D829`.

**Não mexi por conta própria** porque há argumento honesto dos dois lados, e ele é do
negócio, não do código:

- **A favor de tirar:** sem isso o anonimato da D-5 é decorativo.
- **A favor de manter:** o extrato é o registro financeiro *da própria pessoa*, e um extrato
  que não diz com quem você negociou é pior para ela e para a conferência contábil.

Um meio-termo possível é o extrato passar a mostrar o mesmo código (`Compra de #D829`),
mantendo o nome apenas no ledger contábil (`src/domain/ledger.ts:128`), que é interno e só
os administradores leem em `/relatorios`.

---

## Resolvidas

### A-1 · Aplicar as migrations 005 e 006 no Supabase ✅ FEITO em 10/09

Aplicadas durante a própria sessão, com autorização do Gabriel. A **005** renomeou
`aurea.nfts` para `aurea.recibos`; a **006** reescreveu o prefixo dos 149 códigos já
gravados, de `NFT-000001` para `REC-000001`. Conferido com `npm run db:check`: as 19 tabelas
presentes, RLS ligada em todas, nenhuma tabela em `public`.

**Cuidado para quem for repetir isso em outro ambiente:** aplicar as migrations **antes** de
o código correspondente estar no ar derruba a aplicação com
`relation "aurea.recibos" does not exist`. Código primeiro, migration depois.
