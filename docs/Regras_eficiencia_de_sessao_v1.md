# Regras de eficiência de sessão — v1

```
Definidas por: Gabriel, 15/09/2026
Valem para:    toda sessão de agente neste repositório (Claude, Codex ou outro), em qualquer chat
Prevalecem:    sobre qualquer instrução de plano, prompt ou documento que peça o contrário
```

Motivo: as branches E1–E7 gastaram o limite de tokens de dois agentes ao mesmo tempo com leituras
repetidas, lint e testes a cada escrita, commits picados e uma revisão rodando antes de haver o
que revisar.

## 1. Pedido exato, pergunta simples: faça só o que foi pedido

Execução exata e direta, pergunta simples ou informação com o lugar onde procurar já dito:
**não faça nada além disso.** Nada de analisar diff, commits, worktrees ou o repositório "para
confirmar".

## 2. O que está escrito não se relê no código

Se um MD, relatório, plano ou informação do Gabriel já responde a dúvida, **use o documento e não
releia o repositório.** Os relatórios e MDs existem justamente para ninguém precisar reler o código
a cada passo. Só abra código quando o documento não responder, e só o arquivo necessário.

## 3. Typecheck, lint, testes e build: no fim, não a cada escrita

- Rodam **ao final da branch** (preferência) ou, em branch grande, **ao final de cada grande tópico**.
- **Nunca** a cada arquivo escrito, a cada função ou a cada script.
- Teste de pedaço solto não prova nada: o que se testa é a feature, o conceito, o debug inteiro.

## 4. MD de execução desde o início da sessão

- Na primeira ação da branch, criar `docs/execucao-pendencias/relatorios/E<N>_EXECUCAO.md` (ou o
  equivalente da pasta do plano).
- A cada tópico fechado — função completa, arquivo modificado, tarefa terminada — **acrescentar uma
  linha** ali: o que foi feito, em quais arquivos, o que falta.
- Esse MD serve para passar a execução a outro agente ou mudar o rumo no meio sem perder o caminho.
- No fim, os testes são feitos **retroativamente** com base nesse MD e no relatório final.

## 5. Revisão e melhoria só depois do merge

Branch de "revisar, testar e melhorar" (busca de melhoria, não debug pré-definido) **nunca roda junto
com as outras.** Ela é a última etapa: revisa todas as branches **já mescladas e commitadas na main**.

## 6. Commit em blocos funcionais

Nada de commit a cada edição. Commit quando um bloco que funciona está pronto (uma tarefa ou um
conjunto de tarefas do plano). O ciclo de verificação da regra 3 roda antes desse commit, não antes
de cada um dos pequenos.

## 7. Todo plano executivo de branch traz, explicitamente

1. **Leitura necessária:** a lista exata de pastas, arquivos e MDs a ler — e nada fora dela.
2. **Contexto suficiente** para executar sem reler o repositório.
3. **Ordem de prioridade** das tarefas, para a sessão não se espalhar.
4. **Foco em feature que funciona e é commitada.** Perfeccionismo e melhorias vêm **sempre depois**
   de executar, commitar, testar e depurar.
5. Uma cópia do bloco "Regras de eficiência" (modelo abaixo) antes do objetivo.

## Modelo do bloco para colar no plano

```markdown
## Regras de eficiência (docs/Regras_eficiencia_de_sessao_v1.md) — prevalecem sobre o resto deste documento

- **Leia só:** este documento, `00_PLANO_MESTRE.md` e os arquivos citados em "O que o código faz hoje"
  e "Território". Não releia o repositório para confirmar o que o documento já diz.
- **Prioridade:** as Tarefas na ordem numérica. Feature funcionando e commitada primeiro; melhoria
  e acabamento só depois, se sobrar.
- **MD de execução:** crie `relatorios/E<N>_EXECUCAO.md` na primeira ação e acrescente uma linha a
  cada tarefa fechada (o que fez, arquivos, o que falta).
- **Verificação:** typecheck, lint, suíte e build só no fim da branch (ou no fim de um bloco grande
  de tarefas), nunca a cada escrita. Não rode a suíte para "medir a base": a contagem está no plano
  mestre.
- **Commits:** em blocos funcionais, não a cada edição.
```
