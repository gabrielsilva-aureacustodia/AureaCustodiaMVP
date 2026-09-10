# Protocolo do Agente — as onze regras de quem trabalha na publicação

**Áurea Custódia · contrato comum aos três agentes · 10/09/2026**

> **Leia isto antes de qualquer coisa.** Este arquivo não descreve uma tarefa; descreve
> *como* toda tarefa da publicação é executada. Os planos de cada agente
> ([`EXECUCAO_3_BRANCHES_PUBLICACAO.md`](EXECUCAO_3_BRANCHES_PUBLICACAO.md)) assumem que
> estas onze regras já foram lidas e não as repetem.

---

## 1. Abertura de sessão — o ritual, sem pular passo

Toda sessão começa por [`../diario/RITUAL_DE_SESSAO_RESUMO.md`](../diario/RITUAL_DE_SESSAO_RESUMO.md).
Em resumo executável:

```bash
git fetch && git status && git log --oneline -10 && git pull && npm install && npm run typecheck && npm test && npm run build && git branch --show-current
```

**Pare no primeiro que falhar.** Se a base já estava quebrada antes de você editar, o
trabalho da sessão é consertar isso e nada mais — e o relatório diz exatamente isso.

Só depois: `npm run dev`, abrir `localhost:3000`, entrar com qualquer conta de
`src/domain/seed.ts` e senha `12345678`, e clicar em duas ou três telas para ver o estado
real antes de mexer.

## 2. Uma tarefa por sessão

Terminou uma sessão do seu plano → `/commit` → `/clear` → próxima sessão. Não emende duas
sessões do plano num commit só: o histórico é o que permite desfazer uma coisa sem desfazer
a outra.

## 3. Planeje antes de editar

Em mudança que toca mais de um arquivo, descreva o plano — que arquivos, em que ordem, o
que pode quebrar — e espere aprovação antes de editar. A frase que abre a sessão é
literalmente: *"Sem editar nada: descreva o plano para tal tarefa."*

## 4. Não expanda o escopo — a regra do DNS

Em 06/09/2026 uma tarefa de *criar cadastro de clientes no site* levou à alteração do
registro MX do domínio e derrubou o e-mail corporativo do Gabriel por horas, junto com o
segundo fator de acesso dele ao GitHub. O cadastro não dependia de DNS nenhum.

**A regra:** antes de tocar em qualquer coisa que já funciona — DNS, e-mail, domínio,
autenticação, variável de ambiente de produção, configuração de painel — pergunte se aquilo
é **requisito do que foi pedido**. Se não for, não encoste. Nem de passagem, nem como
melhoria.

Corolário para esta publicação: quem for configurar o domínio na Vercel mexe **somente** nos
registros `A` do apex e `CNAME` do `www`. **Não toca em `MX`, `TXT`/SPF, DKIM ou DMARC** —
esses são do Google Workspace e derrubam o e-mail da empresa.

## 5. Superfície protegida — pare e pergunte

Estes arquivos mudam o produto, não o código:

```
src/domain/constants.ts     src/domain/fees.ts
src/domain/market.ts        src/domain/types.ts
src/server/store/types.ts   src/server/actions/*
```

Alterar qualquer um exige decisão registrada do Gabriel. Vários blocos desta publicação
**precisam** mexer aí (preços novos, cadastro no `User`, custódia mensal). Onde o plano
manda mexer, a autorização está escrita no plano, com o número da decisão. Onde não estiver,
**pare e pergunte** — não deduza.

## 6. Teste cada feature ao terminar, e varra bugs

Nenhuma sessão fecha sem os quatro comandos verdes:

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

**Além disso**, e não no lugar disso: exercite a feature no navegador. Suba `npm run dev`,
percorra o caminho feliz e pelo menos dois caminhos infelizes (valor zero, campo vazio,
conta sem saldo, banco ausente). Anote no relatório o que você clicou e o que apareceu —
"testei" sem o roteiro não é teste.

**Varredura de bugs ao final de cada bloco**, nesta ordem:

1. `npm run build` sem *warning* novo.
2. Console do navegador sem erro em cada tela tocada.
3. `grep` pela terminologia proibida (regra 1 do plano executivo) nos arquivos que você mexeu.
4. Teste automatizado novo para toda regra de negócio nova — dinheiro, prazo e taxa **sempre**
   ganham teste, porque errar centavo é o defeito que ninguém vê até virar processo.

## 7. Tutorial de ação manual — sempre, e com o layout de hoje

Toda vez que a entrega depender de o Gabriel clicar em algo fora do repositório — Vercel,
Supabase, Mercado Pago, Correios, HostGator, Google Cloud —, a sessão produz um tutorial em
`docs/tutoriais/TUTORIAL_<ASSUNTO>.md`.

**Antes de escrever qualquer sequência de menus, abra a documentação oficial vigente e
confira os rótulos.** Interfaces de SaaS mudam sem aviso; em 06/09/2026 três caminhos
descritos de memória (Cloudflare, HostGator, Supabase) não existiam mais, e cada um custou
uma rodada inteira de procura. Se não der para verificar, escreva **a função** a procurar,
não o rótulo, e diga que o nome pode ter mudado.

O tutorial precisa ter, para cada passo: **onde clicar**, **o valor literal e completo a
colar** (nunca "a mesma string de antes" — descrição vira colagem parcial e derruba
produção), **o que se espera ver** e **como voltar atrás**.

## 8. O que falta de manual fica escrito — em arquivo só seu

Cada agente mantém **um** arquivo, e só ele escreve nele:

```
docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_A.md
docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md
docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_C.md
```

Um arquivo por agente porque três agentes editando o mesmo arquivo produzem conflito de
merge em todo commit. Cada item registra: **o que falta**, **quem pode fazer** (Gabriel,
Rogério, Felipe, o contador, o Guilherme), **o que está bloqueado enquanto não for feito** e
**como conferir que foi feito**. Item resolvido não some — é marcado `✅ FEITO em dd/mm`, para
que o próximo agente não refaça.

## 9. Atalho tomado entra em dois lugares, no mesmo commit

Pular teste, adiar validação, aceitar risco conhecido — tudo isso é permitido para entregar
rápido, **desde que registrado**:

1. `RISCOS_ASSUMIDOS.md` na raiz, com número novo. O último em uso é **RA-23**; para dois
   agentes não criarem o mesmo número, as faixas são reservadas:
   **Agente A = RA-24 a RA-29**, **Agente B = RA-30 a RA-39**, **Agente C = RA-40 a RA-49**.
2. `ATALHOS.md` da pasta afetada.

Os dois, no mesmo commit que introduziu o atalho. Atalho não registrado vira defeito
esquecido.

## 10. Bloqueou por permissão? Entregue o comando, não o problema

Se um `git push`, um merge, um `gh pr create`, uma variável de ambiente ou qualquer outra
ação for barrada por permissão, modo automático ou classificador: **pare a execução e
entregue o comando pronto para colar**, num bloco de shell, com o diretório certo, sem
placeholder e com o valor literal completo. Junto vai **o que se espera ver como resposta**,
para o Gabriel saber se funcionou sem perguntar.

A máquina dele é **Windows com PowerShell**. `&&`, `printf` e here-strings de bash falham
ali — use a forma que funciona no PowerShell, ou `;` e `if ($?) { ... }` para encadear.

Anunciar o bloqueio e ficar esperando instrução é exatamente o que ele não quer.

## 11. Fechamento de sessão

```
/commit
```

E, se for para `main`, `/publicar`. O commit fecha com:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

O relatório da sessão vai para `docs/publish_docs/RELATORIO_AGENTE_<X>.md` (um por agente,
acumulativo) e responde quatro coisas: **o que entrou**, **o que foi testado e como**, **o
que ficou de manual** e **o que o próximo agente precisa saber**.

---

## Nunca, em nenhuma sessão

- Commitar `.env.local`, token, senha ou credencial.
- Importar `@/server/*` de Client Component — vaza segredo para o navegador.
- Escrever lógica de imposto antes de o contador definir o regime.
- Sugerir blockchain, contrato inteligente ou tokenização como arquitetura.
- Usar as palavras proibidas pelo jurídico em texto do produto (regra 1 do plano executivo).
- Inventar logo — são as duas em `/brand/`.
- Anéis olímpicos em arte de moeda.
- Acrescentar trava, *feature flag*, gate de ambiente ou confirmação obrigatória que
  ninguém pediu. As travas legítimas desta entrega são exatamente três, todas listadas no
  plano executivo: dados bancários para sacar, endereço para retirar a moeda, aceite dos
  termos para operar. Nenhuma outra.
