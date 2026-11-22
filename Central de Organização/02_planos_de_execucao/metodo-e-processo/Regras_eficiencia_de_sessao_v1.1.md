# Regras de eficiência de sessão — v1.1

```
Versão:     1.1 (substitui a v1)
Vale para:  toda sessão de agente (Claude, Codex ou outro), em qualquer projeto e em qualquer chat
Prevalece:  sobre qualquer plano, prompt ou documento que peça o contrário
```

Motivo: leituras repetidas, lint e testes a cada escrita, commits picados e revisões rodando antes
da hora esgotam o limite de tokens. E o pior: tiram o foco, e o agente termina sem entregar o que
foi pedido.

---

## A. Segmentação

### 1. Tudo se divide em branches e subtópicos

Todo trabalho é dividido em branches e, dentro delas, em subtópicos de execução. Rodam **ao mesmo
tempo sempre que possível**.

### 2. Tarefa pesada vira mais passos, para mais agentes

Quando uma tarefa ficar pesada de analisar, divida-a em mais passos (ao mesmo tempo sempre que
possível), cada um delegado a um agente separado.

### 3. Um agente, uma subentrega

Segmente ao máximo, sempre. Cada agente cuida de uma subentrega só, com escopo fechado.

---

## B. Leitura

### 4. Pedido exato, pergunta simples: faça só o que foi pedido

Execução exata e direta, pergunta simples ou informação com o lugar onde procurar já indicado:
**não faça nada além disso.** Nada de analisar diff, commits, histórico ou o projeto "para
confirmar".

### 5. O que está escrito não se relê no código

Se um arquivo, documento, relatório ou informação do usuário já responde a dúvida com certeza,
**use-o e não releia o repositório.** Relatórios e MDs existem justamente para ninguém precisar
reler o código a cada passo. Abra código só quando o documento não responder, e só o arquivo
necessário.

---

## C. Execução, testes e commits

### 6. Typecheck, lint, testes e build: no fim, não a cada escrita

- Rodam **no fim da branch** (preferência) ou, se a branch for grande, **no fim de cada grande
  tópico ou rodada**.
- **Nunca** a cada arquivo, função ou script escrito.
- Testar pedaço solto não garante nada: um script que rodou sem erro pode quebrar quando migrations,
  configuração e documentos mudarem junto. O que se testa é a feature, o conceito, o debug inteiro.

### 7. MD de execução desde o início da branch

- Na primeira ação da branch, crie um **MD de execução**.
- A cada tópico fechado — função completa, arquivo modificado, subtarefa terminada — **atualize o
  MD**: o que foi feito, em quais arquivos, o que falta.
- Com ele, a execução passa para outro agente a qualquer momento, e dá para mudar o rumo no meio sem
  perder o caminho nem errar o contexto.
- No fim de um bloco grande ou da branch inteira (de preferência a branch inteira), os testes são
  feitos **retroativamente**, guiados por esse MD e pelo relatório final de execução.

### 8. Commit em blocos funcionais

Nada de commit a cada edição. Commit quando um bloco que funciona está pronto. O ciclo da regra 6
roda antes desse commit, não antes de cada edição.

---

## D. Ordem das etapas

### 9. Revisão e melhoria só depois do merge

Branch de "revisar, testar e melhorar" (busca de melhoria, não debug definido de antemão) **nunca
roda junto com as outras.** Ela é a **última etapa**: revisa todas as branches **já mescladas e
commitadas**. Revisar antes é revisar código que ainda vai mudar.

### 10. Feature primeiro, perfeccionismo depois

A ordem é sempre: **executar → feature commitada → testar → depurar → só então melhorar.**
Preciosismo no meio da execução é desperdício.

---

## E. Plano executivo de branch

### 11. Todo plano de branch traz, explicitamente

1. **Leitura necessária:** a lista exata de pastas, arquivos e MDs a ler, e nada fora dela.
2. **Contexto suficiente** para executar sem reler o projeto.
3. **Ordem de prioridade** das tarefas, para a sessão não se espalhar.
4. **Divisão em subtópicos e agentes**, dizendo o que roda ao mesmo tempo e o que espera outra etapa.
5. **Foco em feature que funciona e é commitada.** Melhoria vem depois (regra 10).
6. O bloco-modelo abaixo, antes do objetivo.

---

## Modelo do bloco para colar no plano de cada branch

```markdown
## Regras de eficiência (Regras_eficiencia_de_sessao_v1.1) — prevalecem sobre o resto deste documento

- **Leia só:** <lista exata de pastas, arquivos e MDs>. Não releia o projeto para confirmar o que os
  documentos já dizem.
- **Prioridade:** <ordem das tarefas>. Feature funcionando e commitada primeiro; melhoria só depois.
- **Segmentação:** <subtópicos e agentes; o que roda ao mesmo tempo; o que espera outra etapa>.
- **MD de execução:** crie `<caminho do MD>` na primeira ação e atualize a cada tópico fechado
  (o que fez, arquivos, o que falta).
- **Verificação:** typecheck, lint, testes e build só no fim da branch (ou de um bloco grande),
  nunca a cada escrita.
- **Commits:** em blocos funcionais, não a cada edição.
- **Tipo da branch:** execução | revisão e melhoria (esta só depois do merge das outras).
```
