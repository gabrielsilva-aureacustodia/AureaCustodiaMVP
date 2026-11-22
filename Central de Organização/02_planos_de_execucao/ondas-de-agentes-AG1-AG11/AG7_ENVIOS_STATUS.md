# AG7 — Envios: acompanhamento, descarte em 3 dias e a API dos Correios

Branch: `exec/ag7-envios-status`. Independente das outras.

## Contexto que você precisa saber antes

Em 21/09/2026 o sistema parou de **inventar** código de rastreio. Até então
`markPosted` gravava `'BR' + Math.random() + 'BR'`. Agora o cliente posta na
agência e **digita** o código do comprovante, validado no formato SRO
(`src/domain/rastreio.ts`) na tela e na Server Action. Esta branch parte daí.

## O que fazer

### 1. Bloco de acompanhamento dos envios

Na página de envios (`src/app/(app)/envios/page.tsx`), **abaixo** dos blocos que
já existem, um bloco listando **todos** os envios do cliente com o status de
cada um.

Se um bloco assim já existir, aproveite-o em vez de criar outro — o ponto não é
o bloco, é o que ele mostra.

A regra que define esta branch: **aparece mesmo o envio que ainda não foi
postado**. O cliente precisa ver, com todas as letras, que o status é "ainda não
postado — o sistema ainda não reconheceu nenhum código de postagem". Hoje um
envio parado nesse estado simplesmente não diz nada, e a pessoa não sabe se
esqueceu de postar ou se o sistema perdeu o registro.

As fases a mostrar são as que o envio já percorre — protocolo gerado, postado,
em trânsito (pelo rastreio), recebido, em análise, analisado. Leia
`Envio.etapaAtual` e o que `src/server/db/repositories/rastreios.ts` guarda; não
invente estado novo.

### 2. Envio não postado é descartado em 3 dias

Envio que não for reconhecido como postado é **desconsiderado em até 3 dias**.

Antes de expirar, o cliente vê o aviso na própria página de envios, dizendo que
o envio ainda não foi postado e quanto tempo resta.

Decida e **escreva no código** o que "desconsiderado" faz com o registro: o
envio some da lista ativa, mas o registro continua no banco com o estado que
explica o desfecho. Apagar linha é o que impede qualquer conversa futura sobre
o que aconteceu. Um protocolo já emitido não volta a ser reutilizado.

Como o prazo é avaliado: a plataforma não tem rotina agendada rodando hoje.
Calcular o vencimento **na leitura** — comparando `dataPostagem` com
`criadoEm + 3 dias` — é mais simples e não depende de cron. Se você preferir uma
rotina, diga no relatório por quê; o que não pode é o status depender de alguém
abrir a tela.

### 3. Conferir se a integração com os Correios funciona de verdade

`src/lib/shipping/tracking.ts` chama
`https://api.correios.com.br/sro/v1/objetos/{codigo}` e depende de
`process.env.CORREIOS_TOKEN`.

**Cheque se isso funciona**: se a variável existe no ambiente, se a chamada
responde, e o que acontece quando não há token. Diga o resultado no relatório —
com número de erro, se houver. Se não houver token configurado, o sistema
precisa dizer "não foi possível consultar os Correios agora" em vez de fingir
que o objeto não existe: as duas situações são diferentes e o cliente não pode
confundi-las.

O que o módulo já traz: cache em memória de 30 minutos, `normalizarCodigoRastreio`
e `mapearStatusSro`. O comentário do topo diz que a consulta é feita por rotina
agendada, **nunca** síncrona a cada visita de tela — respeite isso.

## Ordem de leitura

1. `CLAUDE.md`
2. `src/app/(app)/envios/page.tsx`
3. `src/server/actions/custody.ts` — `createProtocol`, `markPosted`
4. `src/domain/rastreio.ts`
5. `src/lib/shipping/tracking.ts` e `src/lib/shipping/types.ts`
6. `src/server/db/repositories/envios.ts` e `rastreios.ts`
7. `src/domain/types.ts` — `Envio`

## Cuidados

- Campo novo em `Envio` precisa entrar **também** em `src/server/db/diff.ts`
  (`normalizarEnvio`) e no repositório. Campo que o `diff` não copia é campo que
  nunca gera `atualizar` — foi assim que a `origem` de 60 moedas ficou errada.
- Migration nova em `src/server/db/migrations/`, numerada em sequência.
- Sem trava nova no caminho do cliente. O envio expirado sai da lista; não
  bloqueie login, cadastro nem qualquer outra coisa por causa disso.
- Nada de `@/server/*` dentro de Client Component.

## Fechamento

Sem commit. Rode typecheck, lint, teste e build **uma vez, no fim**, só para
confirmar que a branch está de pé, e **avise que terminou**, com o resultado do
teste da API dos Correios. O merge e o commit são feitos depois, por um agente
só, com todas as branches juntas.
