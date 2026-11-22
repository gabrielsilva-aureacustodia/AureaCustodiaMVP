# O Processo Diário — o que é, por que existe e onde vai chegar

**Documento explicativo · Gabriel Silva · 28 de agosto de 2026**

> Companheiro do `PADRAO_OPERACIONAL_DIARIO.md`. Aquele diz **como fazer**; este diz
> **por que fazer assim** e **para onde isso caminha**. Serve para você reler daqui a três
> meses, e para explicar o sistema a um sócio, a um desenvolvedor novo ou a um agente que
> entre no fluxo pela primeira vez.

---

## 1. O que você está construindo, em uma frase

Um **sistema operacional de projeto**: um conjunto de documentos que se regeneram sozinhos
todo dia, a partir do repositório, e que permitem que qualquer pessoa — ou qualquer IA — entre
em contexto em quinze minutos e saiba exatamente o que fazer.

Não é documentação. Documentação descreve o que existe. Isto **produz decisão**: cada ciclo
termina com uma lista de ações executáveis com critério de pronto.

---

## 2. Os três problemas que motivaram

### O custo de retomada

Todo dia que se recomeça um projeto, os primeiros trinta a noventa minutos vão embora
redescobrindo onde parou, o que o outro turno fez e se a base ainda funciona. Isso não parece
desperdício porque parece trabalho — mas é o mesmo trabalho, refeito toda vez.

Com dois projetos ativos e trabalho em turnos alternados, esse custo se multiplica e não
aparece em lugar nenhum.

### A divergência silenciosa entre fontes

Documento, repositório, painel de hospedagem e memória de conversa divergem naturalmente. O
problema não é divergirem: é divergirem **sem ninguém perceber**, e uma decisão ser tomada
com base numa foto velha.

A leitura de hoje encontrou cinco contradições reais no projeto da Áurea. Duas eram críticas
e nenhuma produzia erro visível. A pior — o arquivo de exemplo apontando para uma versão
antiga do formato de dados — faria os dois mercados de moeda voltarem a se misturar em
silêncio, sem log, sem tela quebrada.

**Contradição que não produz erro é a mais cara que existe**, porque só aparece quando alguém
confere manualmente. Este processo é a conferência manual, automatizada.

### O contexto que não escala para vários agentes

Este é o problema que motivou tudo. Com Claude, Codex, Antigravity e Grok Build trabalhando
no mesmo repositório em frentes diferentes, **cada agente precisa entrar em contexto sozinho**.

Não existe forma de explicar o projeto quatro vezes por dia. A única saída é o contexto estar
**escrito em arquivo versionado**, com nome previsível, que qualquer agente lê no primeiro
comando da sessão.

Em outras palavras: os documentos não existem para você. Existem para que as IAs não dependam
de você.

---

## 3. Por que cada documento tem duas versões

A regra das duas versões é a decisão de desenho mais importante do sistema, e a mais fácil de
implementar errado.

**A versão detalhada** é escrita para ser lida por uma IA no início da sessão, ou por você
quando precisa entender o porquê de algo. Ela tem prosa, contexto, referência de arquivo e
linha, e explicação de consequência. Pode ter trinta páginas.

**A versão resumida** é escrita para você executar às sete da manhã sem ler nada. Tópicos,
comandos copiáveis, duas páginas no máximo. Ela **nunca explica; só manda**.

A armadilha: gerar a resumida como resumo automático da detalhada. Isso produz um documento
que serve para nenhum dos dois — longo demais para executar e raso demais para entender. As
duas versões são escritas separadamente, com objetivos diferentes, e podem inclusive
discordar em ênfase.

**O teste de qualidade da versão resumida:** se você precisou abrir a detalhada para executar
o que a resumida mandou, a resumida falhou.

---

## 4. Como as cinco peças se encaixam

```
┌──────────────────────────────────────────────────────┐
│  RITUAL DE SESSÃO          permanente · muda pouco   │
│  "como eu entro no projeto"                          │
└────────────────────┬─────────────────────────────────┘
                     │ é atualizado por
                     ▼
┌──────────────────────────────────────────────────────┐
│  LEITURA DIÁRIA            novo a cada dia           │
│  "o que mudou no repositório"                        │
└────────────────────┬─────────────────────────────────┘
                     │ alimenta
        ┌────────────┴────────────┐
        ▼                         ▼
┌────────────────────┐  ┌────────────────────────────┐
│ VERSION COMPARISON │  │ CRITICAL DEBUGS            │
│ memória longa      │  │ o que precisa ser corrigido│
│ append-only        │  │ reescrito a cada leitura   │
└────────────────────┘  └───────────┬────────────────┘
                                    │ filtra o que dá para hoje
                                    ▼
                        ┌────────────────────────────┐
                        │ PRIMEIRAS AÇÕES DO DIA     │
                        │ 1 página · executável      │
                        └────────────────────────────┘
```

**O fluxo em uma frase:** a leitura descobre o que mudou; a comparação registra para sempre;
o Critical Debugs converte em tarefa com critério de pronto; as Primeiras Ações filtram o que
cabe hoje; e o Ritual absorve o que virou permanente.

### Por que o Version Comparison é append-only

É o único documento que nunca perde informação. Daqui a seis meses, quando alguém perguntar
"quando decidimos que a comissão não seria congelada?", é lá que está — com data, hora e
commit.

Editar entrada antiga é proibido. Correção se faz com entrada nova apontando para a antiga.
É a mesma lógica da trilha de auditoria que o projeto da Áurea precisa ter para o próprio
negócio: **registro que pode ser alterado sem deixar rastro não vale como prova.**

### Por que o Critical Debugs é reescrito, e não acumulado

Lógica oposta, de propósito. Uma lista de problemas que só cresce vira uma lista que ninguém
lê — todo mundo já viu isso acontecer com backlog.

Este documento é sempre o retrato do que está aberto **hoje**. O que foi resolvido sai. O
registro de que existiu fica no Version Comparison, que é justamente para isso.

### Por que todo item precisa de teste de aceite

É a regra que separa este sistema de uma lista de reclamações. **Correção sem critério de
pronto é correção que volta**, porque ninguém sabe dizer se acabou.

O teste de aceite também obriga quem escreve o item a pensar até o fim. Se não é possível
escrever como verificar, provavelmente o problema ainda não foi entendido.

---

## 5. A parte que dá o valor real: a análise crítica

Um sistema que só lista commits é contabilidade. O que transforma isso em engenharia é a
varredura ativa sobre o código novo, procurando seis categorias:

| Categoria | O que se procura | Exemplo real desta primeira leitura |
|---|---|---|
| Erro crítico | Quebra em produção e não em desenvolvimento | `SESSION_SECRET` ausente degradando em silêncio |
| Divergência | Documento diz A, código faz B | `.env.example` em v5, código em v6 |
| Arquivo faltando | Config declarada sem arquivo correspondente | `"lint": "next lint"` sem `eslint.config` |
| Regressão silenciosa | Comportamento mudou sem estar registrado | A sexta divergência autorizada, existente e não escrita |
| Segredo exposto | Credencial em arquivo versionado | `DEV_SECRET` legível enquanto o repositório esteve público |
| Dependência frágil | Fonte única de falha | `xlsx` vindo de fora do registro npm |

Na primeira leitura da Áurea, essa varredura produziu **onze itens, dois deles críticos**.
Nenhum dos dois críticos produzia erro visível na tela.

---

## 6. A regra da honestidade

É a regra que decide se o sistema sobrevive ou vira teatro.

**Seção vazia se escreve "nada nesta leitura" e segue.** Documento que inventa conteúdo para
parecer completo destrói a confiança em todo o resto — e no dia em que houver um achado real,
ele vai estar no meio de dez achados inventados.

Corolário prático: **num dia em que nada mudou, a Leitura Diária tem seis linhas.** Isso é
sucesso, não preguiça. Documento que sempre tem vinte páginas é documento que ninguém lê.

---

## 7. Onde isto vai chegar — cinco fases

### Fase 1 — Manual, com agente assistindo *(onde estamos hoje)*

Você executa; o agente gera os documentos. É onde você aprende como é quando funciona — e
esse aprendizado é o único jeito de reconhecer depois quando **não** funciona.

Isso não é cautela excessiva. É o mesmo princípio da ordem de automação do guia da Áurea:
*"Semana 1: tudo à mão. Você precisa saber como é quando funciona para reconhecer quando não
funciona."*

### Fase 2 — Agente executa, você revisa

O agente roda a leitura e propõe o Critical Debugs; você aprova antes de qualquer edição de
código.

### Fase 3 — Tarefa agendada

A leitura diária vira tarefa programada. Os documentos já estão prontos quando você abre o
computador. É aqui que o processo deixa de custar tempo seu.

### Fase 4 — Vários agentes, um contexto

Codex, Antigravity e Grok Build lendo os mesmos cinco artefatos do mesmo repositório. **É aqui
que o sistema se paga.** O contexto está em arquivo versionado, então qualquer agente entra
sem ninguém explicar nada.

A regra que torna isso possível: **uma frente por agente, uma branch por frente.** Dois
agentes nunca editam a mesma pasta ao mesmo tempo, e a divisão fica declarada por escrito, na
tabela da Parte 6 do Ritual de Sessão de cada projeto.

Sem essa tabela, dois agentes editam o mesmo arquivo a partir de bases diferentes e o
conflito só aparece no merge — o momento mais caro possível para descobrir.

### Fase 5 — Dashboard central

Um painel que varre as pastas datadas de todos os projetos e monta a visão única, com o chat
que despacha tarefa para qualquer agente.

**Só faz sentido depois da fase 4**, porque antes não há o que unificar. E ele fica muito mais
simples de construir se as pastas seguirem a convenção `AAAA-MM-DD` desde o começo: o painel
lê diretório, não interpreta formato.

---

## 8. Por que a nomenclatura é rígida

Três decisões que parecem burocracia e são infraestrutura:

**Datas em `AAAA-MM-DD`.** Ordenação alfabética passa a ser ordenação cronológica. É o que
permite `ls` mostrar a linha do tempo e um script varrer a pasta sem interpretar formato de
data — que é uma das piores fontes de bug em automação.

**Nomes em maiúsculas com underscore, sem espaço e sem acento.** Espaço quebra comando de
terminal; acento quebra em sistema de arquivos que não seja o seu. O projeto da Áurea já tem
um caso: o arquivo `Aurea_Custodia_Documento_Explicativo (2).docx`, na branch órfã, precisa de
aspas em qualquer comando.

**Cabeçalho de identificação idêntico em todo documento.** Sem projeto, repositório, commit,
data e fonte no topo, daqui a três meses não se sabe de qual foto o documento fala.

---

## 9. A regra da fonte da verdade

**Onde documento e repositório divergirem, vale o repositório.**

E — esta é a parte que importa — a divergência **não se anota como observação**. Vira item no
Critical Debugs, com correção e teste de aceite.

Observação anotada não conserta nada. Ela só transfere o problema para o próximo leitor, que
vai anotar de novo.

---

## 10. O que este sistema não faz

Vale dizer, para a expectativa ficar calibrada:

- **Não substitui o `/commit` nem o `/publicar`.** Aqueles operam dentro da sessão de trabalho;
  este opera entre sessões. São camadas diferentes.
- **Não decide questão de negócio.** Ele identifica que a decisão está pendente e diz o que
  está bloqueado por ela — como faz hoje com o regime tributário e com a comissão do extrato.
- **Não garante qualidade de código.** Isso é teste automatizado e CI, que no caso da Áurea
  são justamente os itens CD-03 e CD-07 que o sistema apontou como ausentes.
- **Não funciona se os documentos não forem lidos.** O passo final da implantação — referenciar
  a pasta no arquivo de contexto do agente — é o que fecha o circuito. Sem ele, os documentos
  existem e ninguém os abre.

---

## 11. Resumo em cinco linhas

1. Cinco artefatos por projeto, com nome e lugar fixos.
2. Quase todos em duas versões: uma para a IA entender, uma para você executar.
3. Um clone por dia produz a leitura; a leitura produz a tarefa; a tarefa tem teste de aceite.
4. O que é permanente sobe para o Ritual; o que é histórico desce para o Version Comparison.
5. Quando os quatro agentes lerem os mesmos cinco arquivos, o sistema terá se pagado.
