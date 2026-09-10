# Leitura do Repositório — RESUMO

**10/09/2026 · commit `31558c4` · leitura consolidada das cinco frentes**

> Versão detalhada e histórica: `LEITURA_REPOSITORIO_DETALHADO.md` (28/08) e as dez entradas
> de `VERSION_COMPARISON_DAILY.md`.

---

## O que li

Todas as execuções desde o começo: 10 entradas do Version Comparison, os relatórios de
execução das frentes A, B, C e D, o catálogo de features, as decisões D1 a D9 e o questionário
da estação. Mais o código de `src/domain`, `src/server` e `src/app/api`.

---

## O que existe hoje e funciona

- **20 rotas** no ar, Next.js 15 + React 19 + TypeScript strict
- **Estado em tabelas no Supabase Postgres** — não é mais um blob JSON (módulo M1)
- **Ledger append-only com hash SHA-256 encadeado** e trilha de auditoria na mesma transação
- **DRE sem nenhuma alíquota escrita em código** — os percentuais vêm da tabela que o contador
  preenche
- **Relatórios** em `/relatorios` e `/api/relatorios/*`, com integração para Sheets e Excel
- **Login com Supabase Auth e Google**, cadastro aberto, landing pública
- **Mercado Pago** com webhook assinado e conciliação fechada para administradores
- **Correios** com etiqueta, cotação de frete e rastreio por cron diário
- **Mercado multi-ativo**: um livro de ordens por tipo de moeda, casamento por preço-tempo
- **161 testes automatizados**, 27 arquivos, todos passando

---

## O que não existe

| Falta | Consequência |
|---|---|
| **A estação de análise física** | A moeda física não tem como virar ativo digital com prova. É a frente E, e é o gargalo do ciclo inteiro |
| Hash real no recibo | `genHash()` ainda sorteia com `Math.random()`; o rótulo "código simulado" no QR é deliberado até a frente E entrar |
| Termos de uso com aceite versionado | Pendência jurídica, registrada |
| Definição do regime tributário | Lucro Presumido × Simples com Fator R em aberto. Nenhuma lógica de imposto foi escrita, e é assim que deve ficar até o contador decidir |
| Papéis de usuário no banco | Quem é administrador ainda vem de variável de ambiente (RA-16.a) |

---

## O que achei nesta leitura

| Gravidade | O quê |
|---|---|
| 🟠 **Atenção** | O `tsconfig.json` da raiz compila `**/*.ts`. Criar a pasta `estacao/` com código de Electron quebra o `npm run typecheck` e o build da Vercel junto. Correção de uma linha, tem que vir antes |
| 🟢 **Bom achado** | Duas das cinco decisões da estação (D7a e D7d) já estavam implementadas. O bloqueio da frente E era menor do que se pensava |
| 🟢 **Bom achado** | O SHA-256 encadeado de `src/domain/hash.ts` foi escrito puro de propósito e serve à estação sem alteração. A frente E acrescenta a lista de campos, não o algoritmo |
| 🟢 **Bom achado** | A autorização por token em tempo constante de `src/server/relatorios/acesso.ts` é o molde pronto para a autenticação máquina-a-máquina da bancada |
| 🟡 **A avisar** | A frente E força `STORE_KEY` de `aurea-market-v6` para `v7`. O banco de teste recomeça do seed — aceito, mas precisa ser dito antes do deploy |

---

## Estado da sincronização

`origin/main` está seis commits à frente da branch local, e os seis são merges de pull request
vindas do fork `gabrielsilva-sintetica`. O conteúdo é idêntico — `git diff HEAD origin/main`
não retorna nada. É o método de publicação via fork funcionando, não divergência a resolver.

---

## Onde o trabalho continua

`docs/PLANO_EXECUTIVO_ESTACAO.md` — o software de análise de moedas, em 6 fases e cerca de 7
dias de trabalho. A Fase 0 não depende de comprar nada nem de ninguém responder nada.
