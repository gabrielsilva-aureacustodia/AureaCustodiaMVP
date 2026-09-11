# Pendências manuais — Agente C

**O que só uma pessoa pode fazer, porque está fora do repositório.**
Arquivo exclusivo do Agente C (regra 8 do [`PROTOCOLO_DO_AGENTE.md`](PROTOCOLO_DO_AGENTE.md)).
Os Agentes A e B têm os seus; ninguém escreve no arquivo do outro.

> **Para o Rogério.** Cada linha aqui é uma coisa que o código não consegue resolver
> sozinho — depende de alguém abrir um site, preencher um cadastro ou tomar uma decisão.
> Enquanto a linha estiver aberta, a parte da plataforma que depende dela não funciona de
> verdade, mesmo que a tela pareça pronta.

Item resolvido **não some**: é marcado `✅ FEITO em dd/mm`, para o próximo agente não refazer.

---

## Abertas

### D-2 · Prazo de retirada: D+30 total ou D+30 postagem + D+5 trânsito? 🟡

| | |
|---|---|
| **O que falta** | Decidir se o prazo exibido ao cliente e nos termos é de 30 dias corridos totais até a chegada da moeda ou 30 dias para expedição + 5 dias de trânsito postal |
| **Quem pode fazer** | **Gabriel e sócios** (alinhamento operacional e jurídico) |
| **O que está bloqueado** | Nada no código trava: o valor está isolado na constante `PRAZO_RETIRADA_DIAS = 30` em `src/domain/retirada.ts` |
| **Como conferir que foi feito** | Definição formal por escrito para sincronizar com os termos de uso do Agente A |

A máquina de estados calcula o prazo a partir de `PRAZO_RETIRADA_DIAS`. Alterar essa constante em um único lugar atualiza toda a regra e telas da plataforma.

---

### C-1 · Aplicação da migration 009 no Supabase de produção/staging 🟡

| | |
|---|---|
| **O que falta** | Executar a migration `009_retiradas.sql` no banco Supabase |
| **Quem pode fazer** | **Gabriel** (via terminal ou SQL Editor do Supabase) |
| **O que está bloqueado** | Persistência real em banco da tabela `aurea.retiradas` em staging/produção |
| **Como conferir que foi feito** | `npm run db:check` ou conferir tabela `aurea.retiradas` no Supabase |

**Instruções para rodar no terminal (PowerShell no Windows):**
```powershell
cd C:\dev\AureaCustodiaMVP
npm run db:migrate
```

---

### C-2 · Aplicação da migration 010 no Supabase de produção/staging 🟡

| | |
|---|---|
| **O que falta** | Executar a migration `010_retiradas_ledger.sql` no banco Supabase (atualiza constraint CHECK do ledger para incluir `'taxa_retirada'`) |
| **Quem pode fazer** | **Gabriel** (via terminal ou SQL Editor do Supabase) |
| **O que está bloqueado** | Inserção de lançamentos contábeis de taxa de retirada em produção/staging |
| **Como conferir que foi feito** | `npm run db:check` ou conferir constraint `ledger_entries_tipo_check` no Supabase |

**Instruções para rodar no terminal (PowerShell no Windows):**
```powershell
cd C:\dev\AureaCustodiaMVP
npm run db:migrate
```

---

## Resolvidas

### D-6 · Endereço oficial de recebimento dos Correios ✅ FEITO em 10/09

Recebido o **Termo de Assinatura de Caixa Postal dos Correios** oficial da Aurea Custódia:
- **Destinatário:** AUREA CUSTODIA LTDA
- **CNPJ:** 68.071.452/0001-06
- **Caixa Postal:** 7990
- **Agência:** AGF Bandeirantes (Avenida dos Bandeirantes)
- **Bairro / Cidade / UF:** Mangabeiras / Belo Horizonte - MG
- **CEP da Caixa Postal:** 30315-970

**Ação no código:**
`src/lib/shipping/correios.ts` foi atualizado na constante `ENDERECO_CENTRAL_AUREA`, eliminando o endereço fictício da "Avenida Paulista, 1500" de São Paulo. Toda etiqueta gerada pelo sistema agora aponta para a Caixa Postal oficial em Belo Horizonte/MG.
