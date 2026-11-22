# Prompt — Agente B · Cadastro e financeiro

> Copie o bloco abaixo inteiro como primeira mensagem do chat dedicado a esta frente.
> **Só depois que a Fase 0 estiver na `main`.**

---

Você vai trabalhar no repositório da **Áurea Custódia / Real Olímpico**
(`C:\dev\AureaCustodiaMVP`), como **Agente B** da publicação oficial para clientes.

**Sua missão:** que o dinheiro entre, saia e seja cobrado — e que cada centavo tenha
lançamento contábil.

Sua frente contém o bloco mais importante da publicação inteira: **o saque**. Hoje o cliente
consegue pôr dinheiro na plataforma e não consegue tirar. Enquanto isso for verdade, a Áurea
guarda dinheiro de terceiro sem devolução.

Outros dois agentes trabalham em paralelo neste mesmo repositório. Existe um contrato escrito
de quem pode editar o quê, e ele não é negociável.

## Leia nesta ordem, antes de escrever qualquer linha

1. **`CLAUDE.md`** (raiz) — carregado automaticamente, são as regras do projeto
2. **`docs/publish_docs/PROTOCOLO_DO_AGENTE.md`** — as onze regras de execução. **Leitura
   obrigatória integral**
3. **`docs/publish_docs/PLANO_EXECUTIVO_PUBLICACAO.md`** — leia inteiro. Blocos 6, 7, 8, 9 e
   **13** são seus; a seção 3 (preços e prazos) e a 5 (decisões) são o seu chão
4. **`docs/publish_docs/EXECUCAO_3_BRANCHES_PUBLICACAO.md`**, **seções 2 e 5** — seu
   território de arquivos e suas seis sessões, B-1 a B-6
5. **`RISCOS_ASSUMIDOS.md`** (raiz) — em especial **RA-01** (operação em sandbox até parecer
   jurídico) e **RA-14** (os atalhos do módulo de pagamentos)
6. **`src/lib/payments/ATALHOS.md`** — o que já existe e o que foi adiado
7. **`docs/API_RELATORIOS.md`** — o contrato de rota que toda feature nova precisa cumprir

## Sua branch

```
git checkout main; if ($?) { git pull; git checkout -b feat/cadastro-financeiro }
```

## Seu território

Cadastro, conta e dinheiro (`src/server/actions/account.ts`,
`src/server/actions/payments.ts`, `src/app/(app)/conta/`, `src/components/account/`,
`src/lib/payments/`, `src/server/payments/`) e custódia e contábil (`src/domain/fees.ts`,
`src/domain/dre.ts`, `src/server/actions/contabil.ts`, `src/app/api/cron/faturamento/`).

**Arquivo fora do seu território você não edita** — você abre um item em
`docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md` pedindo que o dono edite. Em particular:
o **bloqueio do recibo por débito** é do Agente C, não seu.

Em `src/domain/types.ts` você só acrescenta **ao fim**, num bloco marcado
`/* === Publicação · Agente B === */`. Migrations reservadas: **005 a 008**. Faixa de risco
assumido: **RA-30 a RA-39**.

## Suas seis sessões, uma por vez

- **B-1** — Modelo do cadastro (migration 005). CPF, nome completo, data de nascimento,
  telefone, endereço completo, dados bancários/Pix. **Opcional em `User`** — conta sem
  cadastro continua entrando e navegando
- **B-2** — Tela e travas do cadastro. O modal aparece no **primeiro movimento de dinheiro**,
  nunca no login nem no cadastro inicial
- **B-3** — Compra direta pelo gateway (migration 006)
- **B-4** — **Saque** (migration 007). Taxa fixa de R$ 5,00, prazo D+3, trava por dados
  bancários, ledger e auditoria na mesma transação, rota `/api/relatorios/saques`
- **B-5** — Custódia mensal (migration 008). **R$ 2,00 por moeda por mês** substitui
  `custodyFeeForCount()` inteiro, sem transição — decidido em 10/09/2026. Plano anual de
  R$ 24,00 por moeda em até 12x, mesmo dinheiro parcelado, sem desconto
- **B-6** — DRE enxergando as três receitas novas, separadas da comissão

## Três coisas que não podem sair erradas

**1. Documento com foto: NÃO.** O jurídico foi consultado diretamente e dispensou. Não
implemente upload de documento, nem selfie, nem prova de vida. A diretriz do Gabriel é
*"quanto menos dados eu tiver desse cara, melhor"*.

**2. Antes de codar o Pix de saída, abra a documentação vigente do gateway** e verifique se a
API de transferência está disponível para a conta da Áurea. **Não deduza de memória.** Se não
estiver disponível, o saque nasce assim mesmo, com **fila de liquidação manual** — o pedido
entra, o prazo corre, um sócio paga pelo aplicativo do banco e marca como pago. O cliente não
vê diferença e nada fica bloqueado. Isso vira **RA-30**, registrado nos dois lugares.

**3. Não saia do sandbox.** Ligar dinheiro real depende de decisão dos sócios (RA-01) e dos
termos assinados. É o único erro desta lista que não tem desfazer.

## Regras que valem em cima de tudo

- **Não invente escopo.** Se algo já funciona e não é requisito do que foi pedido, não encoste
- **Não acrescente trava nenhuma** além das duas suas: dados bancários para sacar, e cadastro
  completo no primeiro movimento de dinheiro. O botão travado fica **visível e desabilitado,
  com o motivo escrito ao lado** — nunca escondido
- **Dinheiro é sempre inteiro em centavos** (`Cents`). Nunca `float`
- `src/domain/fees.ts` é superfície protegida. Você tem autorização **apenas** para a troca da
  custódia que a decisão D-3 fechou
- **Nenhuma alíquota de imposto em código.** O regime tributário continua indefinido
- Toda feature que mexe em dinheiro nasce com as quatro obrigações do bloco 13: tabela
  própria, lançamento no ledger, linha na trilha de auditoria **com autor real**, e rota em
  `/api/relatorios/`
- LGPD: CPF e endereço não podem aparecer em log, em URL nem em armazenamento público

## Como fechar cada sessão

Os quatro verdes, sempre:

```
npm run typecheck && npm run lint && npm test && npm run build
```

**Dinheiro, prazo e taxa sempre ganham teste automatizado** — errar centavo é o defeito que
ninguém vê até virar processo. Some a isso o roteiro manual: saldo insuficiente, valor zero,
sem dados bancários, com dados bancários. Anote no relatório o que clicou e o que apareceu.
`/commit`, depois `/clear`, depois a próxima sessão.

## O que entregar ao final

```
docs/tutoriais/TUTORIAL_GATEWAY_SAQUE.md          (como o sócio liquida um saque manual)
docs/tutoriais/TUTORIAL_FATURAMENTO_CUSTODIA.md
docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md
docs/publish_docs/RELATORIO_AGENTE_B.md
```

## Se algo bloquear

Comando bloqueado por permissão, merge barrado, variável de ambiente que você não pode
gravar: **não espere instrução.** Me entregue o comando pronto para colar, em bloco de shell,
com o caminho completo e o valor literal — nunca "a mesma string de antes". Minha máquina é
Windows com PowerShell.

## Comece assim

Sem editar nada: rode `git log --oneline -10`, confirme que a Fase 0 já está na `main`, e me
descreva o plano da sessão B-1 — que arquivos, em que ordem, o que pode quebrar.
