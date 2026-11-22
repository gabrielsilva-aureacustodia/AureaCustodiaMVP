# Prompt — Agente C · Painel Admin

> Copie o bloco abaixo inteiro como primeira mensagem do chat dedicado a esta frente.
> Os três agentes (A, B e C) podem abrir no mesmo dia.

---

Você vai trabalhar no repositório da **Áurea Custódia / Real Olímpico**
(`C:\dev\AureaCustodiaMVP`), como **Agente C** da rodada de finalizações de 13/09/2026.

**Sua missão:** o painel administrativo dos sócios e do desenvolvimento — Central de Resultados,
usuários, CS com WhatsApp, bancada de análise, auditoria de moedas, logística e configuração do
site.

Outros dois agentes trabalham ao mesmo tempo neste repositório — A (mercado e termos) e B
(cobrança e custódia). Existe um contrato escrito de quem edita o quê, e ele não se negocia.

## Leia nesta ordem, antes de escrever qualquer linha

1. **`CLAUDE.md`** (raiz) — as regras do projeto
2. **`docs/PLANO_EXECUCAO_ADMIN.md`** — **inteiro**. É o desenho que você executa
3. **`docs/finalizacoes/PLANO_FINALIZACOES_3_BRANCHES.md`** — seções **0, 1, 2 e 3 inteiras**, e
   a **seção 6, que é a sua**. A tabela 6.1 lista o que mudou no plano do Admin por causa das
   outras frentes, **e ela vale sobre o plano do Admin**
4. **`docs/referencia/TRANSFERENCIA_ARQUITETURA_ADMIN.md`** — a arquitetura de referência da
   IOCUS, adaptada no plano do Admin
5. **`docs/publish_docs/PROTOCOLO_DO_AGENTE.md`** — as regras de sessão (a regra 5 será
   reescrita pelo Agente A; siga o plano)
6. **`docs/API_RELATORIOS.md`** e **`estacao/CONTRATO.md`** — os dois contratos que o painel lê

**Estes dois planos são a aprovação do Gabriel para tudo o que está escrito neles.** Não pare
para pedir aprovação de passo que está no plano. Pergunte só quando surgir decisão que os
planos não cobrem — e, enquanto espera, siga com o que não depende dela.

Se algum desses documentos não estiver no seu worktree, leia da pasta principal
`C:\dev\AureaCustodiaMVP\`.

## Seu worktree e suas branches

Você trabalha numa pasta própria, para não trocar de branch debaixo dos outros agentes:

```bash
git -C C:/dev/AureaCustodiaMVP fetch origin
git -C C:/dev/AureaCustodiaMVP worktree add C:/dev/AureaCustodiaMVP-admin -b feat/c-painel-admin origin/main
cd C:/dev/AureaCustodiaMVP-admin
npm install
git checkout -b feat/c1-fundacao-e-resultados
```

O `.env.local` não existe no worktree: `scripts/env-local.mjs` já o encontra para os scripts de
banco, e para `npm run dev` você copia o arquivo da pasta principal (ele continua ignorado pelo
Git). Os testes não precisam dele.

## Seu território

`src/app/(admin)/`, `src/components/admin/`, `src/styles/admin.css`, `src/server/admin/`,
`src/server/actions/admin/`, `src/server/config/`, `src/domain/kpis.ts`, `src/domain/admin/`,
`src/lib/mensageria/`, `src/app/api/webhooks/whatsapp`, `src/app/api/eventos`, o item do Admin em
`src/components/shell/Sidebar.tsx`, `COIN_TYPES` e `isNegociavel` em `src/domain/constants.ts`
(só em C3) e `package.json` se precisar de dependência.

A tabela completa está na seção 3.1 do plano de finalizações. **Arquivo fora do seu território
você não edita** — escreve um item em `docs/finalizacoes/PENDENCIAS_AGENTE_C.md` pedindo que o
dono edite.

Em `src/domain/types.ts` você só acrescenta no fim, num bloco
`/* === Finalizações · Frente C === */`. Migrations: **020 a 025** (a seção 6 do plano do Admin,
que dizia 014 a 019, está substituída). Riscos assumidos: **RA-40 a RA-49**.

## Suas três sub-branches, uma por vez

- **C1 — Fundação e Central de Resultados** (`feat/c1-fundacao-e-resultados`, migrations 020 e
  021). Plano do Admin, seções 1.1 a 1.7. **A seção 1.8 não é sua** — o Agente A alinha a
  documentação em A1.7; você só acrescenta o parágrafo do módulo Admin ao `CLAUDE.md`.
  RBAC com bootstrap por `AUREA_ADMIN_EMAILS` e contas do seed, casco do painel com a sidebar
  **já declarando os itens de C2 e C3**, registro de uso, Financeiro, Contábil, KPIs e Uso.
- **C2 — Usuários e CS** (`feat/c2-usuarios-e-cs`, migrations 022 e 023). Plano do Admin,
  seções 2.1 a 2.6, com os ajustes da seção 6 do plano de finalizações: a ficha lê os aceites de
  A3, os planos e faturas de B2 e a posição na fila de A2. Adaptador de mensageria plugável;
  **sem provedor escolhido pelo Gabriel, o adaptador de registro local mantém a tela
  funcionando** e você segue.
- **C3 — Bancada, moedas, logística e configuração** (`feat/c3-bancada-e-configuracao`,
  migrations 024 e 025). Plano do Admin, seções 3.1 a 3.7, com os ajustes da seção 6.
  **Só com A1, A3 e B2 na `main`.** Taxas editáveis usam os campos de `TabelaDeTaxas` de A1;
  toda mudança de taxa grava `config_historico` e publica versão nova da Tabela de Taxas pela
  função de A3; a bancada web chama o serviço de análise que B2 conectou à cobrança.

## O ciclo de cada sub-branch

Ao terminar:

```bash
npm run typecheck
npm test
npm run build
git checkout feat/c-painel-admin
git merge --no-ff feat/c1-fundacao-e-resultados
git push origin feat/c-painel-admin feat/c1-fundacao-e-resultados
```

Escreva em `docs/finalizacoes/RELATORIO_AGENTE_C.md`: o que foi feito, os testes novos, o que
você clicou para conferir e o que apareceu, e a linha **"C1 pronta para main — merge <hash>"**.

**Você não faz merge na `main`.** Quem leva é o Gabriel. Antes de abrir a sub-branch seguinte:

```bash
git checkout feat/c-painel-admin
git fetch origin
git merge origin/main
git checkout -b feat/c2-usuarios-e-cs
```

## Três coisas que não podem sair erradas

**1. A recusa acontece no servidor.** Toda Server Action de `src/server/actions/admin/` confere
a permissão por conta própria, sempre. Esconder item de menu é conveniência, não barreira.

**2. O painel não reimplementa regra de outra frente.** Ajuste de saldo é lançamento `ajuste`;
pagamento manual de fatura é a ação de B2; análise pela bancada web é o serviço
`src/server/estacao/analise.ts`; taxa é `TabelaDeTaxas`. **A fórmula do hash da análise não
muda** — os quinze campos de `estacao/CONTRATO.md` e o vetor de `src/domain/analise.test.ts`
continuam valendo.

**3. Nada tranca o Gabriel para fora.** O bootstrap por `AUREA_ADMIN_EMAILS` e contas do seed
entra como papel `dev` quando a tabela de membros não conhece o e-mail. Nenhum segundo login,
nenhum segundo fator, nenhuma confirmação obrigatória que o plano não pede.

## Regras que valem em cima de tudo

- **Nenhuma trava que o Gabriel não pediu**: nem *feature flag*, nem gate de ambiente, nem
  confirmação obrigatória. Papéis e permissões são a funcionalidade pedida; `rank` ordena, não
  bloqueia operação.
- **Nada de `@/server/*` em Client Component.** A chave de serviço do Supabase nunca sai do
  servidor.
- **Dinheiro em centavos inteiros.**
- **Tabela de trilha é só `INSERT`**: `audit_log`, `config_historico`, `eventos_uso`, notas.
- **Toda ação do painel grava `audit_log`** com `ator` = e-mail do membro e `acao` =
  `admin.<area>.<verbo>`.
- **Registro de uso nunca interrompe navegação**, e não grava IP bruto nem user agent completo.
- **Palavras proibidas em texto do produto**: token, NFT, cripto, ativo digital, ativo,
  investimento, investidor, corretora, rentabilidade, retorno. O termo é **recibo**.
- **Não expanda o escopo, e não mexa em DNS, e-mail nem domínio.** O subdomínio
  `admin.aureacustodia.com.br` está em "fica para depois".
- **Provedor de WhatsApp e variáveis de ambiente**: você não cria conta nem gera credencial.
  Peça em `PENDENCIAS_AGENTE_C.md` com o **nome e o valor literal e completo** de cada variável.
- **Bloqueou por permissão?** Pare e entregue o comando pronto para colar, num bloco de código,
  com o que ele faz em uma frase.
- **Atalho tomado entra em dois lugares no mesmo commit**: `RISCOS_ASSUMIDOS.md` e o
  `ATALHOS.md` da pasta.
- **Pasta nova ganha `README.md`** descrevendo os arquivos e as conexões com as outras pastas.
- **Comentários em português**, explicando o porquê.
