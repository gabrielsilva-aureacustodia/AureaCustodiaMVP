# Check-up geral do repositório — 03/09/2026

**O que foi conferido, o que foi encontrado, o que foi corrigido, e o que ficou provado**

```
Escrito em: 03/09/2026, madrugada
Base:       main em e612aaa (publicado), branches feat/auth-landing (c8ac503),
            feat/banco-supabase (f3bc05d, mergeada), feat/pagamentos-correios (560274f, mergeada)
Método:     leitura do código novo do último commit (ledger, DRE, auditoria, relatórios,
            "gold standard" da frente C); varreduras estáticas; suíte duas vezes; build;
            39 chamadas HTTP contra o servidor local; três telas no navegador
Resultado:  typecheck ✅ · lint ✅ · 154 testes ✅ (1 pulado) · build ✅ · 0 vulnerabilidades (npm audit)
```

---

# 1. Em uma frase, para o Rogério

O código está inteiro e passa em tudo; encontrei **um furo de acesso** (qualquer conta
logada abria o relatório financeiro da empresa), **uma métrica que mentia** (a conciliação
acusaria discrepância todo dia) e **três duplicações**; os três primeiros estão corrigidos
e testados, e o resto virou lista com dono e prazo.

---

# 2. Estado das branches

| Branch | Commits além do `main` | Situação |
|---|---|---|
| `main` | — | `e612aaa` publicado. Contém B, C, C-3, ledger/DRE/auditoria (M4/M7), demo local (RA-15) |
| `feat/banco-supabase` | 0 (mergeada em `4fbb0dc`) | Fechada em código. Falta a virada de produção |
| `feat/pagamentos-correios` | 0 (mergeada em `b3653cf`; C-3 e "gold standard" já no `main`) | Fechada em código. Falta credencial (Mercado Pago, Correios) e o D10 |
| `feat/auth-landing` | 2 (`0e2f1f4`, `c8ac503`) | Em andamento pelo Gabriel. Rebase sobre `main` tem **um conflito** previsto: `LoginForm.tsx` (fica a versão da A). Novidade no `c8ac503`: `/termos`, `/privacidade` (rascunho 0.1), `LegalDocument`, guia de configuração |

⚠️ O documento da frente A pedia "RA-16" para os atalhos dela; o RA-16 foi ocupado pelo
ledger. **Corrigido para RA-17** em `docs/EXECUCAO_FINAL_AGENTE_A.md`.

---

# 3. O que foi encontrado e corrigido

| # | Achado | Gravidade | Correção | Prova |
|---|---|---|---|---|
| 3.1 | **`/api/admin/conciliacao` exigia só sessão, não administrador.** Uma conta criada em `/criar-conta` lia o saldo total de todas as contas e a receita da empresa | 🔴 | Passa por `ehAdmin`, a mesma regra de `/relatorios`; 403 para não-admin; `Cache-Control: no-store` | 4 testes novos em `route.test.ts` (401, 403, 200 sócio, `AUREA_ADMIN_EMAILS`) |
| 3.2 | **Métrica de conciliação errada.** `discrepância = \|depósitos do gateway − saldo total\|`. O saldo total inclui saldos iniciais e negociações entre contas; o relatório acusaria "discrepância" sempre — alarme que dispara sempre é alarme que ninguém lê. E sem intenções o código somava depósitos simulados como se fossem do gateway | 🟠 | Discrepância passa a ser **saldo de cada conta × soma do ledger** (a conferência do M4); sem banco, `nao_verificavel` em vez de fingir; depósitos simulados e do gateway em campos separados; lista de contas divergentes | Rota testada; `curl` local devolve `nao_verificavel` com `contasDivergentes: []` |
| 3.3 | **Comissão zerada na conciliação sem banco.** `t.fee \|\| 0` — no seed em memória `fee` é `undefined` | 🟡 | `t.fee ?? tradeFee(price) × qty`, a mesma regra de `normalizarTrade` | idem |
| 3.4 | **Duas implementações do adaptador de idempotência em memória** (uma na biblioteca, outra no servidor), quase iguais | 🟡 | O servidor reusa `RepositorioIdempotenciaMemoria` da biblioteca; 40 linhas a menos | Suíte de conciliação e do webhook verdes |
| 3.5 | **Cópias de `docs/*.md` na raiz**, pela terceira vez — `EXECUCAO_FINAL_AGENTE_B.md` da raiz estava desatualizado em relação ao de `docs/` | 🟡 | Removidas; regra "nada na raiz" escrita em `docs/README.md` | `git ls-files` sem documento solto |
| 3.6 | Rotas de relatório sem teste de autorização (RA-16.c) | 🟡 | `acesso.test.ts`: 8 testes cobrindo `ehAdmin`, token e a matriz sessão × token | 8 testes novos |

Total de testes: **143 → 154** (1 pulado, o bloco contra Supabase real).

---

# 4. O que foi lido e está bem

- **Migration 003** (ledger, auditoria, parâmetros, plano de contas, lançamentos manuais,
  exportações): schema `aurea`, RLS em tudo, `CHECK`s, append-only por ausência de
  `UPDATE`/`DELETE` nos repositórios, `hash UNIQUE`.
- **`derivar.ts`**: o ledger sai do diff, dentro da mesma transação da mutação; invariante
  `saldo_antes + Σ(valor × sinal) = saldo_depois` garantida por construção; o que não fecha
  vira `ajuste` visível, nunca some. `ultimoHash` lido atrás da trava de `seq` — duas
  mutações não encadeiam do mesmo hash.
- **`hash.ts`**: SHA-256 puro (FIPS 180-4) para o domínio não depender de `node:crypto`,
  conferido contra vetores oficiais e contra o Node no teste. Fórmula congelada e documentada.
- **`dre.ts`**: nenhuma alíquota em código, aritmética em pontos-base inteiros, receita lida
  do ledger. O único `toFixed` é de exibição de percentual.
- **`relatorios/acesso.ts`**: comparação de token em tempo constante; sessão antes de
  token; 403 vs 401 corretos. `jwt.ts` separado de `sheets.ts` para ser testável.
- **`session.ts`**: `getSessionEmail` passou a engolir a exceção de `cookies()` fora do
  escopo de requisição — necessário para o `after()` do webhook e para o cron.
- **Fronteira cliente/servidor:** nenhum Client Component importa `@/server/*` fora de
  `actions/`. Nenhum `any`. `parseFloat` só nas bordas (digitação e API dos Correios).
- **Etiqueta** confere que o protocolo é do próprio usuário antes de gerar.

---

# 5. Rotas testadas ao vivo (servidor local, sem banco)

Método: `curl` com e sem o cookie de sessão obtido em `/entrar-demo`. Esperado = obtido em
todas.

| Rota | Sem sessão | Com sessão de sócio |
|---|---|---|
| `/` | 200 | — |
| `/criar-conta` | 200 | — |
| `/inicio`, `/relatorios` | 307 → `/` | 200 |
| `/conta`, `/conta/extrato`, `/conta/configuracoes`, `/mercado`, `/vender`, `/envios`, `/recibos`, `/graficos`, `/graficos/auditoria`, `/graficos/comparacoes` | — | 200 |
| `/entrar-demo` | 307 → `/inicio`, cookie gravado | — |
| `/api/state` | 401 | 200 JSON |
| `/api/rastreios` | 401 | 200 `{"rastreios":{}}` |
| `/api/relatorios` | 401 | 200 JSON (índice) |
| `/api/relatorios/dre` · `.csv` · `ledger.xlsx` · `tudo.xlsx` | 401 | 200 com `content-type` certo |
| `/api/relatorios/inexistente` | — | 404 |
| `/api/relatorios/sheets` (POST) | — | 400 "não configurado" |
| `/api/admin/conciliacao` | 401 | 200, `statusConciliacao: nao_verificavel` |
| `/api/envios/etiqueta/RO-ENV-9999` | 401 | 404 |
| `/api/crypto` | 200 | — |
| `/api/cron/shipping` | 200 em dev (sem `CRON_SECRET`; em produção fecha) | — |
| `/api/webhooks/mercadopago` POST `{}` | **400** (sem id) | — |
| `/api/webhooks/mercadopago` POST com id, sem assinatura | **401** | — |
| `/api/webhooks/mercadopago` POST com assinatura inválida | **401** | — |

**No navegador** (sem erro de console em nenhuma): `/entrar-demo` → `/inicio`; `/envios`
passo 1 com **modalidade PAC/SEDEX** e **Buscar CEP** funcionando (endereço e estimativa de
frete pelo adaptador); `/relatorios` renderiza para administrador, com o aviso de "sem
banco" e os botões de exportação; `/conta` → Depositar → **Pix** mostra QR, copia-e-cola e
referência, e o saldo **não** muda (correto: só o webhook credita).

---

# 6. O que NÃO pôde ser testado, e por quê

| O quê | Por quê | Quem destrava |
|---|---|---|
| Mercado Pago real (sandbox) | Sem `MP_ACCESS_TOKEN_TEST` — a conta é do Rogério | Bloco 5 das execuções manuais |
| Crédito de ponta a ponta no simulador | O simulador devolve um pagamento com referência própria, que não casa com a intenção. **Provado por 6 testes** (`conciliacao.test.ts`) | Item 5.3 de `ARQUITETURA_O_QUE_FALTA.md` |
| Assinatura HMAC válida ao vivo | Sem `MP_WEBHOOK_SECRET` no ambiente local. **Provado por teste com HMAC real** | Definir a variável no `.env.local` para o tutorial 6.3 |
| Supabase (tabelas, `FOR UPDATE` com duas conexões, ledger em banco real) | Conexão local recusa a senha | Bloco 1 das execuções manuais |
| Correios real | Sem contrato | Bloco 6 |
| Resend, Google OAuth, Supabase Auth | Configuração externa da frente A | Bloco 3 |
| Google Sheets (push) | Sem conta de serviço | Bloco 4 |
| Cron agendado pela Vercel | Só em deploy | Depois da virada |

---

# 7. Pendências que ficaram registradas (não corrigidas aqui)

Detalhadas em `docs/ARQUITETURA_O_QUE_FALTA.md`; as que mais importam:

1. `Envio` sem `modalidade` nem `remetente` → etiqueta sai com SEDEX fixo e endereço
   placeholder. Pede dois campos opcionais em `types.ts` (superfície protegida) e uma
   migration `004`.
2. `Deposit` sem `ref` → o ledger não distingue depósito do gateway de simulado; a
   conciliação gateway × ledger fica incompleta. Um campo opcional.
3. Intenção pode ficar presa em `creditando` se a aplicação cair entre o crédito e a
   conclusão → job de reconciliação.
4. Server Actions sem teste (RA-04) — o maior buraco de cobertura.
5. Utilitários de idempotência na biblioteca que só o próprio teste usa (7.1).

---

# 8. Comandos para repetir este check-up

```bash
# com o npm run dev PARADO
rm -rf .next && npm run typecheck && npm run lint && npm test && npm test && npm run build
```

Confira **"24 passed (24)"** e **"154 passed | 1 skipped"** — não só a ausência de erro.

Para as rotas: suba `npm run dev` e rode o script `rotas-check.sh` (o roteiro está na
seção 5; qualquer `curl` com `-c/-b` para o cookie reproduz).
