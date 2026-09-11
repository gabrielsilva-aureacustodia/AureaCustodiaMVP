# Relatório do Agente C

**Acumulativo. Uma seção por sessão, a mais recente no topo.**
Responde sempre quatro coisas: o que entrou, o que foi testado e como, o que ficou de
manual, e o que o próximo agente precisa saber (regra 11 do
[`PROTOCOLO_DO_AGENTE.md`](PROTOCOLO_DO_AGENTE.md)).

---

# Sessão C-1 · Modelo e máquina de estados da retirada · 10/09/2026

**Branch:** `feat/retirada-logistica`.
**Base:** `f7a5e8c`, com typecheck, lint, 197 testes e build verdes antes de qualquer edição.

## 1. O que entrou

### Modelo de Domínio e Tipos
- **`src/domain/types.ts`**: Adicionado bloco anexado estritamente ao final do arquivo (`/* === Publicação · Agente C === */`) com os tipos:
  - `ModalidadeRetirada`: `'comum' | 'segura'` (D-1)
  - `StatusRetirada`: `'solicitada' | 'paga' | 'separacao' | 'postada' | 'entregue' | 'cancelada'`
  - `EnderecoEntrega`: snapshot completo congelado do destinatário no ato da solicitação
  - `EventoHistoricoRetirada`: registro de cada transição de estado, motivo e autor
  - `Retirada`: interface agregadora do ciclo de vida da saída do item

### Regras de Negócio e Máquina de Estados Pura
- **`src/domain/retirada.ts`**: Camada de domínio pura (sem dependências de servidor, I/O ou React):
  - **Preços fechados (D-1)**: `TAXA_RETIRADA_COMUM_CENTS = 5000` (R$ 50,00) e `TAXA_RETIRADA_SEGURA_CENTS = 18000` (R$ 180,00). Sem float, centavos inteiros (`Cents`).
  - **Prazo isolado (D-2)**: `PRAZO_RETIRADA_DIAS = 30`. Prazo D+30 mantido em constante única.
  - **Trava de Endereço (Trava 2)**: `validarEnderecoRetirada()` exige destinatário, documento válido (11 ou 14 dígitos), logradouro, número, bairro, cidade, UF de 2 letras, CEP de 8 dígitos e telefone com DDD. Sem endereço válido, o pedido não nasce e o prazo D+30 não começa a contar.
  - **Máquina de Estados**: `podeTransicionarRetirada()` e `transicionarRetirada()`. Fluxo estrito imutável (`solicitada -> paga -> separacao -> postada -> entregue`), suportando cancelamento em `solicitada` e `paga`. Bloqueia saltos e regressões ilegais. Exige código de rastreamento postal para atingir o estado `postada`.

### Banco de Dados
- **`src/server/db/migrations/009_retiradas.sql`**:
  - Tabela `aurea.retiradas` com campos tipados, foreign keys para `aurea.coins(id)` e `aurea.users(email)`, checks de modalidade/status, campos de auditoria e índices.
  - Row Level Security (RLS) habilitada por padrão.
- **`src/server/db/db.test.ts`**: Atualizado para incluir `retiradas` no `TRUNCATE` de limpeza da suíte de testes PGlite e na asserção alfabética de tabelas protegidas.

### Resolução da Decisão D-6 (Correios)
- **`src/lib/shipping/correios.ts`**: `ENDERECO_CENTRAL_AUREA` atualizado com o endereço oficial fornecido no **Termo de Assinatura de Caixa Postal dos Correios**:
  - AUREA CUSTODIA LTDA
  - CNPJ: 68.071.452/0001-06
  - Caixa Postal 7990
  - AGF Bandeirantes (Av. dos Bandeirantes)
  - Belo Horizonte - MG, CEP 30315-970
  - O endereço fictício da "Avenida Paulista" foi completamente eliminado do código.

## 2. O que foi testado, e como

### Comandos de Verificação
- `npm run typecheck`: OK (0 erros de tipagem).
- `npm run lint`: OK (código em conformidade).
- `npm test`: OK — **32 arquivos de teste, 228 testes passando** (24 testes novos em `src/domain/retirada.test.ts`).
- `npm run build`: OK — compilação Next.js completa com geração estática das rotas.

### Testes Automatizados da Retirada (`retirada.test.ts`)
- Cálculo de taxa comum e segura (5000 e 18000 cents).
- Cálculo exato da data-limite D+30 em milissegundos.
- Validação estrita de cada campo do endereço (rejeição de campos em branco, CEP incorreto, UF inválida, telefone curto).
- Fluxo de ponta a ponta: `solicitada -> paga -> separacao -> postada -> entregue`.
- Rejeição de transição para `postada` sem código de rastreio.
- Rejeição de saltos ou regressões inválidas.
- Acúmulo imutável do histórico de eventos em cada etapa.

## 3. O que ficou de manual

Registrado em [`PENDENCIAS_MANUAIS_AGENTE_C.md`](PENDENCIAS_MANUAIS_AGENTE_C.md):
- **D-6** ✅ — **RESOLVIDO**: Caixa Postal 7990 em Belo Horizonte/MG configurada em `correios.ts`.
- **D-2** 🟡 — Definição se o prazo exibido é D+30 total ou D+30 + D+5. (Isolado em constante, não trava desenvolvimento).
- **C-1** 🟡 — Aplicação da migration `009_retiradas.sql` no Supabase via `npm run db:migrate`.

## 4. O que o próximo agente precisa saber

1. **A migration da retirada é a 009.** As faixas reservadas no plano executivo (Agente B = 007 a 008, Agente C = 009 a 011) estão preservadas.
2. **`retirada.ts` é 100% puro.** Qualquer integração com persistência, Server Actions ou envio de e-mails deve ser feita na camada `src/server/` (Sessão C-2).
3. **Endereço da Central de Custódia é a Caixa Postal 7990 em Belo Horizonte/MG.** Não recriar mock da Paulista em testes ou novas rotas.
