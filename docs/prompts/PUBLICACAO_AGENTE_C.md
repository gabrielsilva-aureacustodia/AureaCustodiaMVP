# Prompt — Agente C · Retirada e logística

> Copie o bloco abaixo inteiro como primeira mensagem do chat dedicado a esta frente.
> **Só depois que a Fase 0 estiver na `main`.**

---

Você vai trabalhar no repositório da **Áurea Custódia / Real Olímpico**
(`C:\dev\AureaCustodiaMVP`), como **Agente C** da publicação oficial para clientes.

**Sua missão:** que a moeda consiga sair da custódia, com prazo, custo e rastreio.

O botão "Solicitar retirada" já existe na tela, desabilitado, desde que a plataforma nasceu.
O estado `'Extinto'` do recibo já existe em `src/domain/types.ts`, reservado exatamente para
isto. Você vai ligar os dois.

Outros dois agentes trabalham em paralelo neste mesmo repositório. Existe um contrato escrito
de quem pode editar o quê, e ele não é negociável.

## Leia nesta ordem, antes de escrever qualquer linha

1. **`CLAUDE.md`** (raiz) — carregado automaticamente, são as regras do projeto
2. **`docs/publish_docs/PROTOCOLO_DO_AGENTE.md`** — as onze regras de execução. **Leitura
   obrigatória integral**
3. **`docs/publish_docs/PLANO_EXECUTIVO_PUBLICACAO.md`** — leia inteiro. Blocos 10, 11 e
   **13** são seus; a seção 3 (preços e prazos) e a 5 (decisões) são o seu chão
4. **`docs/publish_docs/EXECUCAO_3_BRANCHES_PUBLICACAO.md`**, **seções 2 e 6** — seu
   território de arquivos e suas seis sessões, C-1 a C-6
5. **`src/lib/shipping/ATALHOS.md`** e **`src/lib/shipping/correios.ts`** — o módulo dos
   Correios já existe e cobre só a entrada
6. **`docs/API_RELATORIOS.md`** — o contrato de rota que toda feature nova precisa cumprir

## Sua branch

```
git checkout main; if ($?) { git pull; git checkout -b feat/retirada-logistica }
```

## Seu território

Retirada e logística (`src/server/actions/custody.ts`, `src/app/(app)/envios/`,
`src/app/(app)/retirada/`, `src/components/custody/`, `src/lib/shipping/`,
`src/server/shipping/`) e o recibo (`src/components/recibo/`, `src/lib/pdf/`,
`src/app/(app)/recibos/`).

**Arquivo fora do seu território você não edita** — você abre um item em
`docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_C.md` pedindo que o dono edite. Em particular: a
**cobrança pelo gateway** é do Agente B, não sua.

Em `src/domain/types.ts` você só acrescenta **ao fim**, num bloco marcado
`/* === Publicação · Agente C === */`. Migrations reservadas: **009 a 011**. Faixa de risco
assumido: **RA-40 a RA-49**.

## Suas seis sessões, uma por vez

- **C-1** — Modelo e máquina de estados da retirada (migration 009). Máquina de estados como
  **função pura testável** em `src/domain/`, fora do servidor
- **C-2** — Fluxo no servidor (migration 010)
- **C-3** — Tela da retirada, e o botão de `Certificate.tsx` passa a levar para lá
- **C-4** — Correios de saída (migration 011): pré-postagem, etiqueta, rastreio
- **C-5** — Bloqueio de recibo por débito. Pedido do Agente B. **Implemente como estado do
  recibo, não como regra espalhada** — regra espalhada por três telas sempre esquece a quarta
- **C-6** — Testes de ponta a ponta e varredura de bugs

## Quatro coisas que não podem sair erradas

**1. O recibo é extinto no instante da confirmação**, no mesmo `mutateState()` em que a moeda
sai do acervo negociável. Se ficarem em passos separados, existe um intervalo em que o
cliente tem recibo negociável **e** moeda a caminho.

**2. O preço está fechado: comum R$ 50,00, segura R$ 180,00 em 2x.** São duas modalidades
excludentes e cada uma já inclui tudo — taxa e transporte. Não invente um terceiro valor nem
some taxa administrativa por cima. O R$ 60,00 que circula em documento antigo **saiu da
tabela** em 10/09/2026.

**3. A confirmação da moeda equiparável aparece na tela do pedido**, não enterrada nos
termos: *"a moeda devolvida será da mesma espécie e estado de conservação, mas não
necessariamente a mesma unidade que você depositou"*. O próprio advogado apontou isso como o
risco número um da operação.

**4. Nunca gere etiqueta de verdade com o endereço fictício. Nem para teste.** O endereço em
`src/lib/shipping/correios.ts:29` é *Avenida Paulista, 1500 — Andar 14*, que não é da
empresa. Enquanto o endereço real não chegar (decisão D-6, ainda aberta), abra o item na sua
pendência e siga com o resto do bloco.

## Duas decisões ainda abertas na sua frente

- **D-2** — o prazo é D+30 total até a moeda chegar, ou D+30 para postar mais D+5 de
  trânsito? **Deixe o prazo numa constante nomeada e isolada**, para trocar num lugar só.
  Não trava nada
- **D-6** — o endereço real de recebimento. Ver o item 4 acima

## Regras que valem em cima de tudo

- **Não invente escopo.** Se algo já funciona e não é requisito do que foi pedido, não encoste
- **Não acrescente trava nenhuma** além da sua: endereço completo e confirmado para retirar.
  **Sem ele o prazo D+30 nem começa a contar** — e a tela precisa dizer isso com essas
  palavras. O botão travado fica **visível e desabilitado, com o motivo ao lado**
- **Dinheiro é sempre inteiro em centavos** (`Cents`). Nunca `float`
- **LGPD:** etiqueta com endereço **não pode** ir para armazenamento público. Confira onde o
  arquivo é gravado antes de gerar a primeira
- Declaração de valor e AR continuam obrigatórios — já é regra do módulo, mantenha
- Toda feature nasce com as quatro obrigações do bloco 13: tabela própria, lançamento no
  ledger, linha na trilha de auditoria **com autor real**, e rota em `/api/relatorios/`

## Como fechar cada sessão

Os quatro verdes, sempre:

```
npm run typecheck && npm run lint && npm test && npm run build
```

Transições de estado, prazo e taxa **sempre ganham teste automatizado**. O roteiro manual de
ponta a ponta é: entrar → abrir um recibo → pedir retirada → escolher modalidade → pagar →
**conferir que o recibo ficou extinto na mesma hora** → conferir que a moeda sumiu do mercado
→ acompanhar o estado → gerar etiqueta → conferir o rastreio. Anote no relatório o que clicou
e o que apareceu. `/commit`, depois `/clear`, depois a próxima sessão.

## O que entregar ao final

```
docs/tutoriais/TUTORIAL_RETIRADA_OPERACIONAL.md   (o que o sócio faz quando um pedido entra)
docs/tutoriais/TUTORIAL_CORREIOS_CONTRATO.md      (o que falta contratar, com o layout de hoje)
docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_C.md
docs/publish_docs/RELATORIO_AGENTE_C.md
```

O tutorial dos Correios exige abrir a documentação oficial vigente e conferir os rótulos
antes de escrever qualquer sequência de menus. Interfaces mudam sem aviso.

## Se algo bloquear

Comando bloqueado por permissão, merge barrado, variável de ambiente que você não pode
gravar: **não espere instrução.** Me entregue o comando pronto para colar, em bloco de shell,
com o caminho completo e o valor literal — nunca "a mesma string de antes". Minha máquina é
Windows com PowerShell.

## Comece assim

Sem editar nada: rode `git log --oneline -10`, confirme que a Fase 0 já está na `main`, e me
descreva o plano da sessão C-1 — que arquivos, em que ordem, o que pode quebrar.
