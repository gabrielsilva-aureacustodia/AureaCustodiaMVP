# Processo eficiente de branches 2.0

```
Projeto:     Áurea Custódia / Real Olímpico (vale para qualquer projeto do Gabriel)
Origem:      pedido do Gabriel, 17/11/2026, chat "Pendências da Manutenção do Site" (texto dele abaixo, sem edição)
Método base: C:\dev\Sintetica\processo\  (encontrado e lido em 17/11/2026 — ver seção 5)
Estado:      documento de trabalho LOCAL. Não se commita antes de a execução terminar (B2); vai ao GitHub depois, como log.
```

> Este MD não cria regra. A descrição abaixo é do Gabriel; a seção 2 é a minha compreensão dela; a seção 5 aponta o método da Sintetica que os chats de auditoria precisam ler. Divergência ou dúvida vai para a seção 6, nunca é resolvida por palpite (R13).

## 1. O texto do Gabriel, sem edição

> Eu quero que você monte um MD executivo disso tudo, muito detalhado, e separe a execução para começarmos imediatamente, em uma lógica de branches, como sempre fazemos. A lógica principal é a seguinte:
>
> * Você vai iniciar um novo chat, com o objetivo de absorver todo o contexto do repositório; ler os MDs todos que você fez agora; e ser então o chat de controle dessa tarefa; o nome dele será "Plataforma Parceiros -- LPs | Controle"; esse chat vai rodar uma tarefa de rotina (até terminarmos tudo) que vai de 5 em 5 minutos olhar tudo que está sendo executado em cada subchat principal de tarefa (vamos falar sobre eles); é com esse chat principal que eu vou falar; ele deve ser criado no modo de "ignorar permissões", assim como todos os demais subchats dele;
> * Dentro desse chat, haverão subchats , para cada branch de execução necessária; cada branch será uma das tarefas principais que você deve executar para fazer o projeto acontecer, e todas devem ser concomitantes e sem conflitos; essa branch terá todo o contexto e MDs, vai produzir um MD próprio de execução e passo a passo que precisa seguir até terminar; ela vai ter uma rotina de 5 em 5min que envia o MD de execução e um prompt de check-up (para saber se está sendo tudo executado, sem ser prolixo, focado no objetivo final da tarefa), de forma a manter os agentes todos (cada subchat dela que será criado) sempre cientes da tarefa que precisam executar e nunca deixar eles ficarem prolixos, perdidos ou confusos;
> * Para cada subchat (ou seja, cada branch de tarefa específica) você vai gerar um subchat dentro dele de execução, um subchat dentro dele de auditoria da tarefa e um específico (caso seja necessário, para alguma tarefa de pesquisa ou navegação ou compilação de programa, enfim, qualquer tarefa incomum que tome tempo e inteligência a mais para executar, para não parar o executor de código principal, entendeu ?); o auditor vai ter uma rotina que repete de 3 em 3min, com a tarefa de ver o que o subchat de execução e o subchat específico (se ele existir) estão fazendo e montar os logs de execução, os rituais de execução, corrigir se ele quebrar regras de execução, montar os MDs de continuidade, etc (veja os métodos que sempre usamos no repositório da Sintetica, já temos memória desse tipo de processo em vários projetos daqui e ELES DEVEM SEMPRE SER RESPEITADOS, não afirme que leu o repositório da Sintetica e encontrou o método se não encontrar, se não encontrar me avisa, precisar seguir o método e os subchats de auditoria precisam receber a leitura deles para montar todo MD necessário);
> * Ou seja, é uma estrutura de um chat principal de controle; subchats principais de tarefa focados em cada tarefa por branch, que envia a completude de cada parte para o chat de controle para fazer um check-up, merge, commit, push, deploy; subchats dentro dos subchats, focados em auditoria, execução e especificidades;
>
> Me confirme compreensão completa; salve essa descrição de como executar que eu defini em um MD e me envia imediatamente; salva esse tipo de processo na memória como "processo eficiente de branches 2.0" (vamos depois atualizar ele no painel a2a); e então, se tudo estiver pronto para começar, faça o que pedi e então continuamos do novo chat de controle que você criar

## 2. Compreensão (minhas palavras)

**Três níveis de chat, todos em "ignorar permissões":**

```
Nível 1   CONTROLE ──────────────── o único com quem o Gabriel fala
            │   rotina de 5 em 5 min: olha todos os chats de branch
            │   recebe a "completude" de cada branch → check-up, merge, commit, push, deploy
            │
Nível 2   CHAT DE BRANCH (um por tarefa, todas concomitantes, sem conflito)
            │   lê todo o contexto e os MDs; escreve o PRÓPRIO MD de execução (passo a passo até terminar)
            │   rotina de 5 em 5 min: reenvia o MD de execução + um prompt de check-up aos seus três filhos
            │   (curto, focado no objetivo final — a rotina existe para ninguém ficar prolixo, perdido ou confuso)
            │
Nível 3     ├─ EXECUÇÃO   escreve o código / faz a tarefa
            ├─ AUDITORIA  rotina de 3 em 3 min: vê o que Execução e Específico fazem → monta os logs de execução,
            │             os rituais, os MDs de continuidade; corrige se quebrarem regra de execução.
            │             Recebe a leitura do método da Sintetica para montar todo MD necessário.
            └─ ESPECÍFICO (só se precisar) pesquisa, navegação, compilação — qualquer coisa incomum que gaste
                          tempo e inteligência a mais, para não parar o executor principal.
```

**Regras de funcionamento que entendi:**
1. A rotina do Controle roda **até terminarmos tudo**; depois ela é encerrada.
2. O Controle é o chat de conversa com o Gabriel. Os chats de branch só falam com ele **por meio dele** (a completude sobe para o Controle).
3. Merge, commit, push e deploy são do Controle (um agente separado das branches) — coerente com B1 da Sintetica: nenhum commit durante a branch.
4. Toda branch tem contexto e MDs próprios, escreve o próprio MD de execução e não toca arquivo geral da raiz (B5).
5. Concomitância só onde a pasta de trabalho (`touch`) não se sobrepõe.
6. O auditor **não executa**: observa, registra, corrige o desvio de regra e mantém a continuidade (logs, rituais, MDs de continuidade, memória R11).
7. Se o método da Sintetica não existisse, eu avisaria em vez de afirmar que o li. **Existe e foi lido** (seção 5).
8. Salvar como memória "processo eficiente de branches 2.0"; mais tarde ele será atualizado no painel A2A.

## 3. Quem faz o quê (resumo operacional)

| Papel | Cadência | Lê | Produz | Fala com |
|---|---|---|---|---|
| **Controle** | rotina 5 min (olha todas as branches) | todo o contexto + todos os MDs do pacote | quadro de andamento, merge, commit, push, deploy, higiene (só com OK do Gabriel), relatório final | Gabriel; chats de branch |
| **Branch** (Nível 2) | rotina 5 min (reenvia MD + check-up aos filhos) | contexto da frente + lista "Ler" do seu MD | o MD de execução da frente (`<branch>--MD_EXECUCAO.md`), a "completude" para o Controle | Controle; seus 3 filhos |
| **Execução** | contínua | só o MD da branch e a lista "Ler" | código, testes da branch no fim | Branch |
| **Auditoria** | rotina 3 min | MD da branch + método da Sintetica (seção 5) + o que Execução/Específico fazem | logs de execução, rituais, MDs de continuidade, memória R11; correções de desvio | Branch |
| **Específico** | sob demanda | o pedido do Executor | pesquisa, medição, navegação, compilação | Execução |

## 4. Ciclo de vida de uma frente

1. **Nasce** com: worktree própria, MD de execução (modelo `templates/MD_EXECUCAO_BRANCH.md`), lista Ler/Touch/Do not touch, aceite.
2. **Executa** sem pedir aprovação de plano (B3); MD atualizado a cada tópico (E4); nada de commit, lint ou suíte por arquivo (E3, B1).
3. **Termina** quando o aceite está marcado: roda os testes **da branch**, escreve a completude (estado do Git primeiro — B4) e sobe ao Controle.
4. **Controle** confere (check-up), espera as demais, faz o merge em um agente só, roda a bateria pós-merge (typecheck, test, build), commit único, push, deploy.
5. **Exceção de commit imediato** (única): migration aplicada, variável de ambiente, banco, servidor, DNS — commit e push na hora, na branch da tarefa (R8).
6. **Fecha**: logs/MDs vão à `main` antes da higiene (B6); higiene de worktrees só depois do OK do Gabriel; branch de "revisar e melhorar" só depois do merge (E5).

## 5. O método da Sintetica — encontrado, lido e como entra no processo

**Encontrado:** `C:\dev\Sintetica\processo\` (índice normativo em `00_INDICE.md`, gerado em 27/10/2026, com a camada Sintetica sobre o Standard Process v2 em `base_standard_rituals_v2/`). O repositório da Áurea já herda parte dele (`docs/diario/LEIA_PRIMEIRO_AGENTE.md`).

**Arquivos que o chat de Auditoria (e o Controle) devem ler, nesta ordem** (E11 — MDs primeiro, repositório só do que a lista "Ler" mandar):

| # | Arquivo (em `C:\dev\Sintetica\processo\`) | Para quê |
|---|---|---|
| 1 | `00_INDICE.md` | mapa, precedência, conflitos já resolvidos (C1–C6) |
| 2 | `06_REGRAS_DO_GABRIEL_NA_INTEGRA.md` | **fonte primária**: as regras dele, sem edição; vale mais que os resumos |
| 3 | `01_REGRAS_DE_EXECUCAO.md` | R1–R13 (R7 "faça ou avise", R8 push de migration/env, R10 segurança combinada antes, R11 memória, R12 nome do chat bate com o trabalho, R13 não criar regra) |
| 4 | `02_EFFICIENCY_RULES.md` | E1–E12 (pedido exato, MD no lugar de rereler, teste no chunk, MD de execução, polish por último, sem subagentes) |
| 5 | `03_BRANCHES_E_COMMITS.md` | B1–B6 (nenhum commit até o fim, plano não se commita, branch não edita a raiz, logs vão à main) |
| 6 | `04_RITUAL_DE_SESSAO.md` | abertura, durante, fechamento (**Git primeiro**), higiene |
| 7 | `base_standard_rituals_v2/07_MD_DE_EXECUCAO_DE_BRANCH.md` + `templates/MD_EXECUCAO_BRANCH.md` | formato obrigatório do MD de execução |
| 8 | `base_standard_rituals_v2/13_RELATORIOS.md` | os relatórios de fim de execução (execuções, modificações, features) |
| 9 | `07_ORIENTACOES_DO_GABRIEL.md` | orientações que ele repete aos chats |
| 10 | `05_METODO_DE_EFICIENCIA.md` | código antes de IA; custo medido (consulta de contexto, não regra) |

Complementos do próprio projeto: `CLAUDE.md`, `docs/diario/LEIA_PRIMEIRO_AGENTE.md`, `docs/INDICE_VEGA.md`, `docs/memorias/README.md`.

**O que o método diz e que casa com o pedido:** uma frente = uma branch = um agente = um conjunto de pastas (`touch`); segmentar ao máximo; MD de execução nasce no ato 1; commit só depois do merge, por agente separado; plano de branch não se commita antes; branch não pede aprovação de plano; fechamento começa pelo estado do Git.

## 6. Pontos em que o pedido e o método/memórias se tocam (registrados, não resolvidos por palpite)

| # | Ponto | Como tratei | Quem decide |
|---|---|---|---|
| P1 | O nome "Plataforma Parceiros -- LPs \| Controle" é de **outro projeto**; esta tarefa é a manutenção do Real Olímpico. R12 exige que o nome bata com o trabalho | usei **"Manutenção Real Olímpico -- Pendências do Rogério \| Controle"** | Gabriel (renomear leva um comando) |
| P2 | E12 da Sintetica e a memória da Áurea proíbem subagente/sessão paralela **sem pedido expresso** | o pedido é expresso: este processo manda criar chats e subchats. Vale só para este processo e para as frentes listadas | já decidido por ele |
| P3 | "Subchat dentro de subchat" (3 níveis) | depende de o chat de nível 2 conseguir abrir sessões. Verifiquei na criação; se a ferramenta barrar, o nível 2 é montado pelo Controle e as rotinas continuam | técnico |
| P4 | Rotinas de 5 e 3 min × número de chats | cada ciclo é uma volta de modelo. Para não gastar à toa, o ciclo pergunta primeiro ao Git/ao MD se algo mudou (pré-checagem em código, como no método de eficiência) e responde "sem mudança" quando não mudou | Gabriel ajusta o intervalo |
| P5 | Segurança, cobrança e fiscal aparecem nos itens do Rogério | R10 e `CLAUDE.md`: decisão fiscal/de cobrança/segurança é do Gabriel. Cada item sensível vem com a decisão pendente explícita no MD da frente, e a função sai ligada para ele testar | Gabriel |
| P6 | "Ignorar permissões" em todos os chats | aplicado ao Controle e a cada chat criado; ações irreversíveis em produção (cancelar nota fiscal real, mexer em dado de cliente) continuam pedindo o aval do Gabriel por regra de segurança do próprio agente | Gabriel |
