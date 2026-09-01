# Padrão Operacional Diário

**Documento normativo · portátil para qualquer projeto**
Gabriel Silva · versão 1.0 · 28 de agosto de 2026

> Este documento **não fala de nenhum projeto específico**. Ele define a estrutura de
> arquivos, a nomenclatura, a ordem de execução e as regras que valem igualmente para
> Áurea Custódia, IOCUS e qualquer projeto futuro. Copie-o para cada repositório novo.

---

## 1. O problema que este padrão resolve

Três problemas ao mesmo tempo:

**Retomada.** Todo dia que se começa a trabalhar num projeto, os primeiros trinta a
noventa minutos são gastos redescobrindo onde parou, o que o outro turno fez e se a base
ainda funciona. Multiplicado por vários projetos e vários dias, isso é a maior perda de
tempo do ciclo — e é perda silenciosa, porque parece trabalho.

**Divergência entre fontes.** Documento, repositório, painel de hospedagem e memória de
conversa divergem naturalmente com o tempo. Quando divergem sem que ninguém perceba, uma
decisão é tomada com base numa foto velha.

**Multiplicidade de agentes.** Com Claude, Codex, Antigravity e Grok Build trabalhando no
mesmo repositório em frentes diferentes, cada um precisa entrar em contexto sozinho, sem
depender de o operador humano explicar tudo de novo. Isso só funciona se o contexto estiver
**escrito em arquivo**, não em conversa.

A resposta dos três é a mesma: **um conjunto fixo de documentos, com nomes fixos, gerados
por um procedimento fixo, todo dia.**

---

## 2. Os cinco artefatos

Cada projeto tem exatamente estes cinco artefatos. Nem mais, nem menos.

| # | Artefato | Versões | Vida | Quem lê |
|---|---|---|---|---|
| 1 | **Ritual de Sessão** | Detalhada + Resumida | Permanente, atualizada quando muda a estrutura | 1 IA · 2 Gabriel |
| 2 | **Leitura Diária do Repositório** | Detalhada + Resumida | Nova a cada dia | 1 IA · 2 Gabriel |
| 3 | **Version Comparison** | Perpétua (append) + Resumida do dia | 1 cresce para sempre · 2 nova a cada dia | 1 IA/auditoria · 2 Gabriel |
| 4 | **Critical Debugs** | Única, muito detalhada | Reescrita a cada leitura | IA (é a lista de tarefas do agente) |
| 5 | **Primeiras Ações do Dia** | Única, curta | Nova a cada dia | Gabriel, e depois o agente |

### A regra das duas versões

Quase todo artefato existe em duas versões, e a razão não é redundância:

- **Detalhada** — escrita para ser lida por uma IA no início de sessão, ou por você quando
  precisa do porquê. Prosa, contexto, referências de arquivo e linha, explicação de
  consequência. Pode ter dezenas de páginas.
- **Resumida** — escrita para você executar às sete da manhã sem ler nada. Tópicos, comandos
  copiáveis, no máximo duas páginas. **Nunca explica; só manda.**

A versão resumida **nunca** é um resumo automático da detalhada. Ela é escrita à parte, com
outro objetivo. Resumo automático produz um documento que não serve para nenhum dos dois.

---

## 3. Estrutura de pastas

Idêntica em todo projeto:

```
docs/diario/
├── RITUAL_DE_SESSAO.md               ← detalhado, permanente
├── RITUAL_DE_SESSAO_RESUMO.md        ← resumido, permanente
├── CRITICAL_DEBUGS.md                ← vivo, reescrito a cada leitura
├── VERSION_COMPARISON_DAILY.md       ← perpétuo, APPEND-ONLY
└── AAAA-MM-DD/                       ← uma pasta por dia de leitura
    ├── LEITURA_REPOSITORIO_DETALHADO.md
    ├── LEITURA_REPOSITORIO_RESUMO.md
    ├── VERSION_COMPARISON_RESUMO.md
    └── PRIMEIRAS_ACOES_DO_DIA.md
```

**Por que a pasta por data.** Buscar "o que estava acontecendo em 12 de setembro" tem que ser
uma operação de um comando, não de leitura de histórico do Git. E porque a pasta datada é o
que permite, mais tarde, um dashboard varrer o diretório e montar a linha do tempo sozinho.

**Por que `VERSION_COMPARISON_DAILY.md` é append-only.** É o único artefato que nunca perde
informação. Ele é a memória longa do projeto: daqui a seis meses, é onde se descobre quando
uma decisão foi tomada e o que ela substituiu. Editar entrada antiga nele é proibido —
correção se faz com entrada nova apontando para a antiga.

---

## 4. Os cinco artefatos, um a um

### 4.1 Ritual de Sessão

**O que é.** A sequência exata de comandos e verificações para sair do zero até "pronto para
escrever código", com o motivo de cada passo.

**Quando muda.** Só quando a estrutura muda: banco novo, serviço novo, variável de ambiente
nova, dependência nova, mudança de branch padrão, mudança de processo de deploy. **Não muda
por causa de feature.**

**Quem manda mudar.** A Leitura Diária. Toda Leitura Diária termina com uma seção
"Recomendações de alteração no Ritual de Sessão", que pode estar vazia — e na maioria dos
dias estará.

**Conteúdo mínimo da versão detalhada:**

1. Instalação por máquina (uma vez só), com teste de verificação por item
2. Abertura de sessão — comandos numerados, cada um com o **porquê**
3. Como confirmar que a base estava sã **antes** de editar
4. Variáveis de ambiente esperadas e como conferir
5. Onde o trabalho deve morar (branch × produção)
6. O que fazer dentro do agente de código
7. Encerramento de sessão
8. Cuidados permanentes — a lista do que nunca se faz

**Conteúdo da versão resumida:** os comandos de 2 a 6, em bloco copiável, sem prosa.

### 4.2 Leitura Diária do Repositório

**O que é.** O resultado de clonar o repositório e ler o que mudou desde a última leitura.

**Procedimento:**

```bash
git clone <url> _leitura_AAAA-MM-DD
cd _leitura_AAAA-MM-DD
git log --pretty=format:"%h|%ad|%an|%s" --date=format:"%d/%m/%Y %H:%M" --reverse
git log --reverse --shortstat
git diff --stat <último-commit-lido>..HEAD
```

**Conteúdo da versão detalhada:**

- Identificação: URL, branch, commit de referência (`HEAD`), data e hora da leitura
- Commit a commit desde a última leitura: hash, autor, data, o que fez, arquivos tocados
- Arquivos novos, removidos e renomeados
- Mudanças em configuração, dependências e variáveis de ambiente
- **Recomendações de alteração no Ritual de Sessão** — pode ser "nenhuma"

**Conteúdo da versão resumida:** o que mudou em tópicos, o que isso significa na prática, e
se o Ritual mudou.

**Regra de honestidade:** se nada mudou desde a última leitura, o documento diz "nada mudou"
e tem seis linhas. Documento que sempre tem vinte páginas é documento que ninguém lê.

### 4.3 Version Comparison

Dois documentos com o mesmo nome e propósitos opostos.

**Perpétuo (`VERSION_COMPARISON_DAILY.md`).** Uma entrada por leitura, sempre no fim do
arquivo, sempre com cabeçalho de data e hora. Nunca se edita entrada anterior. Foco em
**features, correções de defeito e reestruturações** — não em cada linha alterada, que é
assunto da Leitura Diária.

**Resumido do dia.** Documento novo, dentro da pasta da data. Compara **apenas** a versão de
hoje com a de ontem. Serve para uma coisa: você ler antes de codar e saber o que mudou de
comportamento.

**A parte que dá o valor real: a análise crítica do código novo.** Toda entrada de Version
Comparison precisa conter uma varredura ativa do que entrou, procurando:

| Categoria | O que procurar |
|---|---|
| Erro crítico | Algo que quebra em produção e não quebra em desenvolvimento |
| Divergência | Documento diz A, código faz B |
| Arquivo faltando | Config declarada no `package.json` sem arquivo correspondente; import sem destino |
| Regressão silenciosa | Comportamento que mudou sem estar registrado como mudança autorizada |
| Segredo exposto | Credencial, token ou chave em arquivo versionado |
| Dependência frágil | Pacote fora de registro oficial, versão não fixada, fonte única de falha |

Achado de qualquer uma dessas categorias **alimenta o Critical Debugs**.

### 4.4 Critical Debugs

**O que é.** A lista de tarefas do agente de código. É o documento que o agente lê **depois**
do Ritual de Sessão para saber o que fazer.

**Por que é único e reescrito, não acumulado.** Uma lista de problemas que só cresce vira
uma lista que ninguém lê. Este documento é sempre o retrato do que está aberto **hoje**. O
que foi resolvido sai — o histórico de que existiu fica no Version Comparison perpétuo.

**Formato obrigatório de cada item:**

```
### ID — Título curto

Gravidade:  Crítica | Alta | Média | Baixa
Bloqueia:   [o que não pode acontecer enquanto isto estiver aberto]
Evidência:  [arquivo:linha, ou comando que reproduz]

**O sintoma.**       O que se vê quando o problema acontece.
**A causa.**         Por que acontece.
**A consequência.**  O que se perde se não for resolvido.
**A correção.**      Passo a passo executável, com comandos e trechos exatos.
**Teste de aceite.** Como saber que ficou resolvido.
```

Sem "teste de aceite", o item não entra. Correção sem critério de pronto é correção que
volta.

**Escopo:** não é só código. Entra também workflow, configuração de servidor, domínio,
hospedagem, variável de ambiente e configuração de terminal — qualquer coisa que, se estiver
errada, derruba o projeto.

### 4.5 Primeiras Ações do Dia

**O que é.** Uma página. O que fazer hoje, na ordem, tirado do Critical Debugs e filtrado
pelo que é possível fazer hoje.

**Por que existe separado do Critical Debugs.** O Critical Debugs é completo e por isso é
longo. Às sete da manhã, documento longo é documento não lido. Este é a fatia executável de
hoje.

**Formato:** checklist numerado, com o comando copiável e uma linha de por quê. Nada mais.

---

## 5. A ordem de execução do dia

```
1. LER      Ritual de Sessão (resumido)         → você
2. EXECUTAR os comandos de abertura              → você (depois, o agente)
3. LER      Primeiras Ações do Dia               → você
4. LER      Critical Debugs                      → o agente de código
5. TRABALHAR
6. COMMITAR
7. GERAR    a leitura do dia seguinte            → o agente
```

**Os passos 1 a 4 não devem passar de quinze minutos.** Se passarem, os documentos estão
longos demais e as versões resumidas falharam no seu único objetivo.

O passo 7 pode acontecer no fim do dia ou no começo do seguinte. Fim do dia é melhor:
o contexto ainda está fresco e a leitura sai mais precisa.

---

## 6. Nomenclatura e disciplina

**Datas sempre em `AAAA-MM-DD`.** Ordenação alfabética passa a ser ordenação cronológica —
é o que permite `ls` mostrar a linha do tempo e um script varrer a pasta sem interpretar
formato.

**Nomes de arquivo sempre em maiúsculas com underscore.** `LEITURA_REPOSITORIO_DETALHADO.md`,
não `leitura repositorio.md`. Sem espaço, sem acento: espaço quebra comando de terminal e
acento quebra em sistema de arquivos que não seja o seu.

**Todo documento abre com o mesmo cabeçalho de identificação:**

```
Projeto:    [nome]
Repositório:[url] · branch [nome]
Commit:     [hash curto]
Gerado em:  [DD/MM/AAAA HH:MM]
Fonte:      [repositório · documentos · painel de hospedagem]
```

Sem esse cabeçalho, daqui a três meses não se sabe de qual foto o documento fala.

**Regra da fonte da verdade:** onde documento e repositório divergirem, **vale o
repositório**. E a divergência não se anota como observação: vira item no Critical Debugs.

**Regra da honestidade:** nunca preencher seção por obrigação de formato. Seção vazia se
escreve "nada nesta leitura" e segue. Documento que inventa conteúdo para parecer completo
destrói a confiança em todo o resto.

---

## 7. Caminho de automação

A intenção declarada é que isto seja executado por agentes. A ordem importa:

**Fase 1 — manual, com agente assistindo.** Você executa; o agente gera os documentos.
É onde você aprende como é quando funciona, e é o único jeito de reconhecer depois quando
não funciona.

**Fase 2 — agente executa, você revisa.** O agente roda a leitura e propõe o Critical
Debugs; você aprova antes de qualquer edição de código.

**Fase 3 — tarefa agendada.** A leitura diária vira tarefa programada. Os documentos já
estão prontos quando você abre o computador.

**Fase 4 — vários agentes, um contexto.** Codex, Antigravity e Grok Build lendo os mesmos
cinco artefatos do mesmo repositório. É aqui que o padrão se paga: o contexto está em
arquivo versionado, então qualquer agente entra sem ninguém explicar nada.

**Fase 5 — dashboard central.** Um painel que varre as pastas datadas de todos os projetos e
monta a visão única. Só faz sentido depois da fase 4, porque antes não há o que unificar.

### A regra que torna a fase 4 possível

Com vários agentes no mesmo repositório, a regra é **uma frente por agente, uma branch por
frente**. Dois agentes nunca editam a mesma pasta ao mesmo tempo. A divisão se declara por
escrito, no Ritual de Sessão do projeto, numa tabela:

| Agente | Frente | Pastas que pode tocar | Branch |
|---|---|---|---|

Sem essa tabela, dois agentes editam o mesmo arquivo a partir de bases diferentes e o
conflito só aparece no merge — que é o momento mais caro possível para descobrir.

---

## 8. Como implantar num projeto novo

1. Criar `docs/diario/` na raiz do repositório.
2. Copiar este documento para `docs/diario/PADRAO_OPERACIONAL_DIARIO.md`.
3. Escrever o **Ritual de Sessão** nas duas versões — é o único artefato que exige trabalho
   inicial de verdade, porque depende do stack e da hospedagem do projeto.
4. Rodar a **primeira leitura**, que estabelece a linha de base do Version Comparison
   perpétuo. Na primeira leitura não existe "versão anterior": compare contra o início do
   repositório e diga que é a linha de base.
5. Gerar o primeiro **Critical Debugs**.
6. Referenciar `docs/diario/` no arquivo de contexto do agente (`CLAUDE.md`,
   `AGENTS.md` ou equivalente), para que ele seja carregado sozinho em toda sessão.

O passo 6 é o que fecha o circuito: sem ele, os documentos existem e ninguém os lê.
