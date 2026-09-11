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

## Resolvidas

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
