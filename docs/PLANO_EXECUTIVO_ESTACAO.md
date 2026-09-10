# Plano Executivo — Software de Análise de Moedas (Frente E)

```
Projeto:     Áurea Custódia / Real Olímpico — AUREA CUSTODIA LTDA
Repositório: github.com/gabrielsilva-aureacustodia/AureaCustodiaMVP
Escrito em:  10/09/2026
Base sã:     typecheck ✅ · 161 testes ✅ · build ✅ (commit 31558c4)
Estado:      EM EXECUÇÃO — fases 0 a 4 entregues em 10/09/2026, fase 5 parcial
```

> **Estado da execução, 10/09/2026.** As cinco decisões do D7 foram respondidas pelo Gabriel
> na mesma data e estão consolidadas na seção 9. O que já existe e foi verificado ponta a
> ponta contra o banco de teste: a fórmula do hash congelada com vetor de teste, as cinco
> rotas `/api/estacao/*`, a migration 004, e o programa Electron da bancada em `estacao/`.
> O que falta: criar o balde no Supabase Storage e cadastrar as duas variáveis de ambiente
> (seção 11.2). A ordem das fases na seção 10 ficou como registro do que foi feito e em que
> ordem.

> **Para o Rogério, em um parágrafo.** Hoje, quando uma moeda chega, não existe programa
> nenhum na bancada: o operador faria tudo pelo site. Isso não funciona, porque o site não
> enxerga a webcam, não guarda vídeo grande e para de funcionar quando a internet oscila —
> e a moeda já está fora da cápsula quando isso acontece. Este plano descreve um programa
> que fica **no notebook da bancada**, grava a análise em vídeo no disco do próprio
> notebook, e depois conversa com o site para avançar a fase que o cliente vê na tela. Se a
> internet cair no meio, nada se perde: sobe sozinho quando voltar.

---

## 1. O que é, em uma frase

Um programa que roda no notebook da bancada, mostra a imagem da câmera, grava o vídeo da
análise no disco local, recebe o peso e o veredito do operador, e devolve ao site a fase
nova do envio junto com o recibo de custódia e seu hash.

---

## 2. As funções do básico — nove, e só

Esta é a lista fechada do que a primeira versão faz. Tudo que não está aqui fica para
depois, de propósito.

| # | Função | O que o operador faz |
|---|---|---|
| 1 | **Entrar** | Abre o programa; ele já sabe quem é pela chave guardada no notebook |
| 2 | **Ver a fila** | Lista dos envios que chegaram e esperam análise (`RO-ENV-0001`) |
| 3 | **Abrir o procedimento** | Escolhe um envio; nasce o código da análise (`RO-ANL-0001`) |
| 4 | **Escolher a câmera** | Alterna entre a câmera principal e o microscópio USB |
| 5 | **Gravar** | Botão grava e para; o arquivo cai numa pasta do próprio notebook |
| 6 | **Digitar o peso** | Lê o número no display da balança e digita |
| 7 | **Dar o veredito** | Aprovada ou recusada, moeda a moeda, com motivo quando recusa |
| 8 | **Fechar** | Envia tudo ao site: fase avança, moeda nasce, recibo é emitido |
| 9 | **Sincronizar sozinho** | O que não subiu fica no disco e sobe quando a conexão volta |

**Fora do básico agora:** conferência de inventário, reanálise e contestação, dois papéis
separados (analista e aprovador), leitura automática da balança por cabo, reconhecimento de
imagem e endereçamento de cofre em escala de armazém. Cada um está tratado na seção 9.

---

## 3. Por que executável e não uma página do site

Três motivos, e nenhum deles é preferência técnica:

1. **A webcam.** Uma página consegue abrir a câmera, mas não escolhe entre duas câmeras USB
   de forma estável, não sobrevive a um refresh acidental no meio da gravação e não escreve
   num diretório do disco que o operador possa abrir depois.
2. **A internet instável.** Gravação que sobe direto para a nuvem se perde inteira numa
   oscilação — e a moeda já foi manuseada. O programa local grava primeiro no disco e envia
   depois. Isso é decisão fechada desde 01/09/2026 (item E.3).
3. **O tamanho do vídeo.** A Vercel recusa qualquer requisição acima de 4,5 MB. Um vídeo de
   análise passa disso com folga. O caminho tem que ser: o site gera uma URL assinada, o
   programa sobe o arquivo direto para o armazenamento, e o site recebe só a confirmação.

---

## 4. Qual executável — a escolha e o preço dela

**Escolha: Electron, empacotado como `.exe` portátil pelo `electron-builder`.**

O que "sem programas extras" significa na prática: o arquivo `AureaEstacao.exe` é copiado
para o notebook, o operador dá dois cliques e ele abre. Não precisa instalar Node, nem
navegador, nem driver, nem Python. As câmeras UVC — a principal e o microscópio — já são
reconhecidas pelo Windows sem driver de fabricante, e foi por isso que UVC virou requisito
de hardware lá atrás.

**O preço, dito sem enfeite:**

| Custo | Número | Vale a pena? |
|---|---|---|
| Tamanho do arquivo | **96 MB** (medido em 10/09/2026) | Sim. É o Chromium inteiro embutido, comprimido — é exatamente o que dispensa instalar navegador |
| Aviso do Windows na primeira abertura | "O Windows protegeu o computador" | Sim, com ressalva — ver abaixo |
| Tempo de abertura | 2 a 4 segundos | Irrelevante numa bancada |

**O aviso do SmartScreen merece um parágrafo.** Executável sem assinatura digital faz o
Windows mostrar uma tela azul de alerta na primeira execução. O operador clica em "Mais
informações" e depois em "Executar assim mesmo", e o aviso não volta naquele notebook. Para
uma bancada interna com um ou dois notebooks isso é aceitável, e é o caminho que este plano
toma. **Quando houver operador contratado que não seja sócio, isso vira problema de
confiança** e passa a exigir certificado de assinatura de código — algo entre US$ 200 e 400
por ano, com validação da empresa. Fica registrado como atalho a pagar, na seção 12.

**Por que não Tauri.** Tauri geraria um `.exe` de uns 10 MB em vez de 96 MB, o que é
genuinamente melhor. Mas exige toolchain de Rust para compilar e depende do WebView2 do
Windows estar presente — verdade no Windows 11, nem sempre no 10. Trocar uma dependência
visível (o tamanho do arquivo) por uma invisível (uma runtime que pode faltar) é mau negócio
numa bancada. Se o tamanho incomodar depois, a troca é possível sem refazer a tela — mas não
é para agora.

---

## 5. Onde o código mora

**Dentro deste repositório, numa pasta `estacao/` com `package.json` próprio.**

```
C:\dev\AureaCustodiaMVP\
├── src\                 ← o site (Next.js, publicado na Vercel)
├── estacao\             ← o programa da bancada (Electron)
│   ├── package.json     ← dependências SÓ dele; não é workspace do repositório
│   ├── README.md        ← o que é, como rodar, como gerar o .exe
│   ├── ATALHOS.md       ← os atalhos assumidos aqui
│   ├── CONTRATO.md      ← as rotas, o token e a fórmula do hash, congelados
│   ├── main.js          ← processo principal: disco, fila, chamadas ao site
│   ├── preload.js       ← a ponte; a lista COMPLETA do que a tela pode fazer
│   └── renderer\        ← a tela: câmera, gravação, formulário
└── docs\
```

**Por que no mesmo repositório e não separado.** Porque a fórmula do hash tem que ser
*literalmente o mesmo código* nos dois lados. O site já tem SHA-256 encadeado pronto e
testado em `src/domain/hash.ts` — escrito à mão justamente para rodar tanto no servidor
quanto no navegador. Reimplementar isso numa segunda base de código é o jeito mais fácil de
produzir dois hashes diferentes para a mesma moeda, e um hash que não se reproduz não prova
nada.

> ⚠️ **A armadilha que este plano já evita.** O `tsconfig.json` da raiz inclui
> `"**/*.ts"`. Do jeito que está, no minuto em que a pasta `estacao/` existir, o
> `npm run typecheck` da raiz vai tentar compilar código de Electron com a configuração do
> Next — **e o build da Vercel quebra junto**. O primeiro commit da frente E tem que
> acrescentar `"estacao/**"` ao `exclude` do `tsconfig.json` e ao `ignores` do
> `eslint.config.mjs`, antes de qualquer arquivo de Electron entrar. Isso não é detalhe: é
> a diferença entre a frente E começar e a produção cair no mesmo dia.

---

## 6. Como o programa conversa com o site

Quatro rotas novas, todas em `src/app/api/estacao/`. A autorização copia o padrão que já
funciona nos relatórios (`src/server/relatorios/acesso.ts`): cabeçalho
`Authorization: Bearer …` com comparação em tempo constante. **A estação não é um usuário e
não tem sessão** — é uma máquina com chave própria.

| Rota | Método | O que faz |
|---|---|---|
| `/api/estacao/fila` | GET | Devolve os envios na etapa "Recebido pela custódia" |
| `/api/estacao/analise` | POST | Recebe peso, veredito e operador; avança a fase; emite o recibo |
| `/api/estacao/video/url` | POST | Devolve uma URL assinada para subir o vídeo |
| `/api/estacao/video/confirmar` | POST | Recebe o caminho do arquivo que subiu |

**A tela do cliente atualiza sozinha, sem nada novo.** O site já lê `/api/state` a cada 10
segundos. Trocar a fase pela estação aparece para o cliente em menos de 30 segundos por esse
caminho. Não vamos construir websocket para uma tela que muda três vezes por dia — está
escrito no item E.4 e continua certo.

**O vídeo nunca passa pela rota da aplicação.** O programa pede a URL, sobe o arquivo direto
para o Supabase Storage e só depois avisa o site onde ele ficou. É o que contorna o limite de
4,5 MB da Vercel, e é decisão fechada (D6, 01/09/2026).

---

## 7. O que fica no disco do notebook

```
C:\AureaEstacao\
├── estacao.json                  ← endereço do site, chave e nome do operador
├── analises\
│   └── RO-000042\
│       ├── RO-ANL-0001.webm      ← o vídeo
│       └── RO-ANL-0001.json      ← peso, veredito, horários, estado do envio
└── fila\
    └── RO-ANL-0001.json          ← some quando o site confirma o recebimento
```

**A pasta `fila/` é o coração da parte offline.** Fechar um procedimento escreve o arquivo na
fila *antes* de tentar falar com o site. Se a chamada der certo, o arquivo sai da fila. Se der
errado — internet caída, site fora do ar, notebook desligado no meio — o arquivo fica, e o
programa tenta de novo a cada minuto até conseguir. O operador não precisa saber que houve
falha; ele vê um número de pendentes no canto da tela.

**Organizado por código de moeda, nunca por nome de cliente.** Cliente muda de nome, moeda
troca de dono, código não muda (item E.7).

---

## 8. O hash — o item que não pode ser improvisado

Hoje, `src/domain/codes.ts` gera o hash do recibo com `Math.random()`, e o rótulo "código
simulado" no QR é deliberado. Ele sai quando a estação entrar, e o que entra no lugar é a
mesma máquina que já sustenta a trilha de auditoria: `hashEncadeado()`, em
`src/domain/hash.ts`.

**A fórmula, congelada:**

```
hash = SHA-256( hash_anterior + "\n" + campos.join("|") )
```

**Os campos, nesta ordem exata:**

```
 1. protocoloAnalise    RO-ANL-0001
 2. codigoMoeda         RO-000042
 3. codigoRecibo        NFT-000042
 4. protocoloEnvio      RO-ENV-0001
 5. tipoMoeda           Entrega da Bandeira Olímpica
 6. anoMoeda            2016
 7. pesoMg              27000
 8. veredito            aprovada | recusada
 9. operadorId          gabriel.silva@aureacustodia.com.br
10. aprovadorId         gabriel.silva@aureacustodia.com.br
11. validadoEm          1757520000000
12. caminhoVideo        analises/RO-000042/RO-ANL-0001.webm
```

Três escolhas dentro dessa lista existem por um motivo e não devem ser mexidas:

**O peso vai em miligramas inteiros, não em gramas com vírgula.** O repositório já tem essa
regra para dinheiro (`Cents`, nunca `float`), e ela vale aqui pela mesma razão elevada ao
quadrado: `27.0` e `27` são o mesmo peso e são textos diferentes, e texto diferente é hash
diferente. Número inteiro não tem esse problema.

**O `validadoEm` é o relógio do servidor, não o do notebook.** Notebook de bancada tem
relógio errado com frequência, e um horário que muda conforme a máquina destrói a
reprodutibilidade — que é a única coisa que o hash entrega.

**O `aprovadorId` já está na fórmula, mesmo com um papel só.** Enquanto quem analisa também
aprova, ele recebe o mesmo valor do operador. Parece redundante hoje e é o que impede uma
migração dolorosa amanhã: quando a segregação de função chegar (decisão D7c), o campo já
existe e **a fórmula não muda**. Mudar fórmula de hash depois de haver recibo emitido
significa recalcular a cadeia inteira e registrar a troca — não é edição casual.

---

## 9. As cinco decisões que travavam a especificação (D7)

O questionário `docs/referencia/QUESTIONARIO_D7_ESTACAO.md` foi escrito em 01/09/2026 e
continua sem resposta formal. **Ele deixa de ser bloqueio aqui.** Duas das cinco já estão
respondidas pelo código que existe, e as outras três ganham padrão recomendado — Gabriel
sobrescreve qualquer uma sem refazer o plano.

| | Pergunta | Resposta adotada | Por quê |
|---|---|---|---|
| **D7a** | Reservar o número antes ou depois da análise | **Depois** | É o que o código já faz: `nextCoinCode` só roda quando a etapa chega a "Recibo emitido". Sequência sem buracos, sem escrever nada novo |
| **D7d** | Como evitar que duas estações peguem o mesmo número | **O contador travado que já existe** | `mutateState()` roda dentro de `SELECT … FOR UPDATE` no Postgres, e já é atômico. Criar `CREATE SEQUENCE` seria trocar uma garantia que funciona por outra equivalente |
| **D7b** | Envio com moeda recusada: aprovação parcial? | **Envio inteiro pendente até todas terem veredito** | É o comportamento atual de `advanceAnalysis`, que cria as moedas do envio de uma vez. Estado simples: aberto ou fechado. Aprovação parcial é mudança de verdade e entra depois, se a operação pedir |
| **D7c** | Um papel ou dois (analista e aprovador) | **Um papel agora** | São dois sócios operando uma bancada. O campo `aprovadorId` já entra na fórmula do hash, então a segregação chega depois sem quebrar recibo emitido |
| **D7e** | Endereçamento físico da cápsula | **Um campo de texto que o operador digita** | Enquanto a estrutura real do cofre não estiver definida, qualquer esquema seria chute. Campo livre é interno, não aparece para o cliente e não trava a primeira análise |

**As três perguntas que continuam abertas e não travam nada agora:**

1. Moeda recusada é devolvida, descartada ou guardada aguardando o cliente? E quem paga o
   frete da devolução?
2. Qual a estrutura física real do cofre — quantas prateleiras, gavetas, posições?
3. Existe reanálise quando o cliente discorda da recusa?

Nenhuma delas impede a primeira moeda de ser analisada. Todas as três ficam caras se forem
respondidas depois de haver duzentas cápsulas no cofre.

---

## 10. As fases de execução

Cada fase termina em algo que se pode ver funcionando. A estimativa é em dias de trabalho,
não em dias de calendário.

### ✅ Fase 0 — Congelar o contrato · ENTREGUE em 10/09/2026

- Criar `estacao/CONTRATO.md` com as quatro rotas, o formato do token e a fórmula do hash
- Criar `src/domain/analise.ts` com `CAMPOS_DA_ANALISE` e `hashDaAnalise()`, reaproveitando
  `hashEncadeado()`
- Criar `src/domain/analise.test.ts` com **vetor congelado**: uma entrada fixa e o hash
  esperado escrito à mão no teste
- Acrescentar `"estacao/**"` ao `exclude` do `tsconfig.json` e ao `ignores` do
  `eslint.config.mjs`

✅ **Aceite:** `npm test` passa com o vetor congelado, e `npm run build` continua verde.

### ✅ Fase 1 — O executável que grava · ENTREGUE em 10/09/2026

- `estacao/package.json` com Electron e `electron-builder`, alvo `portable`
- Uma tela: lista de câmeras, imagem ao vivo, botão Gravar/Parar, campo de peso, veredito
- Gravação salva em `C:\AureaEstacao\analises\`

✅ **Aceite:** copiar `AureaEstacao.exe` para um notebook onde nada foi instalado, dar dois
cliques, gravar 30 segundos com o microscópio, fechar o programa e achar o arquivo no disco.

### ✅ Fase 2 — Ligação com o site · ENTREGUE em 10/09/2026

- As quatro rotas em `src/app/api/estacao/`
- Autorização por `AUREA_ESTACAO_TOKEN`, com comparação em tempo constante
- Fila, veredito e avanço de fase, ponta a ponta

> ✅ **A STORE_KEY NÃO subiu, e o banco de teste NÃO foi apagado.** O plano previa a v7 e
> a perda do acervo de demonstração. Na execução ficou claro que não era necessário: a regra
> de subir a versão existe para mudança que deixa registro velho preso — foi o caso da v6
> com `tipoMoeda`, em que uma ordem antiga ficava no livro sem nunca casar. Acrescentar uma
> lista vazia não é esse caso. `garantirFormato()` preenche `analises: []` quando ela falta,
> a migration 004 é inteiramente aditiva, e nenhum registro antigo fica inválido. Apagar o
> acervo dos sócios seria custo sem ganho.
>
> `advanceAnalysis` em `src/server/actions/custody.ts` **não foi tocada**: ela continua
> servindo à demonstração pela tela, com `genHash()`. A estação é um caminho novo, paralelo,
> que escreve o mesmo estado pela mesma transação.

✅ **Aceite:** dar veredito na estação e ver a tela `/envios` do cliente mudar em menos de 30
segundos, sem recarregar a página.

### 🟡 Fase 3 — O vídeo sobe · CÓDIGO PRONTO, falta o balde e a chave

- URL assinada gerada pelo servidor com a chave de serviço do Supabase
- Upload direto da estação para o balde

✅ **Aceite:** um vídeo de 300 MB chega ao Storage, e o log da Vercel mostra que a rota da
aplicação recebeu só alguns bytes de JSON.

### ✅ Fase 4 — Sobreviver à internet caindo · ENTREGUE em 10/09/2026

- Pasta `fila/`, repetição a cada minuto, contador de pendentes na tela

✅ **Aceite:** desligar o Wi-Fi, fechar um procedimento inteiro, religar o Wi-Fi e ver a fase
avançar sozinha, sem o operador clicar em nada.

### 🟡 Fase 5 — O hash real · ENTREGUE para moeda da bancada; falta a tela do cliente

- `genHash()` sai de `src/domain/codes.ts`
- O recibo passa a mostrar o hash real e o link do vídeo
- A fórmula vira uma seção pública em `docs/`

✅ **Aceite:** uma pessoa de fora, lendo só a documentação, reimplementa a fórmula noutra
linguagem e chega ao mesmo hash da moeda `RO-000042`.

**Total: cerca de 7 dias de trabalho.**

---

## 11. O que o Gabriel precisa providenciar

### 11.1 Hardware (já especificado, ainda não comprado)

| Item | Requisito que não pode ser negociado |
|---|---|
| Câmera principal | **Anel de foco manual**, UVC plug-and-play, MJPEG, rosca 1/4" |
| Microscópio USB | Segunda câmera, para o detalhe do relevo |
| Iluminação | **Dois LEDs difusos a 45°. Nunca ring light** — o anel reflete no relevo e apaga justamente o que precisa ser visto |
| Balança | Display dentro do quadro da câmera; o operador digita a leitura |
| Notebook | Windows 10 ou 11, duas portas USB livres |

### 11.2 Variáveis de ambiente na Vercel

Duas novas. Os valores vão inteiros, nunca descritos.

**`AUREA_ESTACAO_TOKEN`** — a chave que o programa da bancada usa para se identificar. Gere o
valor com este comando e cole o resultado inteiro:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

O resultado tem exatamente 64 caracteres hexadecimais. Marque **Production**, **Preview** e
**Development**.

**`SUPABASE_SERVICE_ROLE_KEY`** — a chave de serviço do Supabase, necessária só para gerar a
URL assinada de upload. Ela dá acesso total ao projeto e por isso **nunca** aparece no
programa da bancada: fica só na Vercel, e a estação recebe apenas a URL já assinada.

> O caminho exato desse valor no painel do Supabase eu confirmo na documentação vigente na
> hora da Fase 3, em vez de escrever de memória — o painel mudou de lugar duas vezes desde
> agosto, e caminho errado custa mais tempo do que a conferência.

**`SUPABASE_STORAGE_BUCKET`** — o nome do balde onde os vídeos ficam:

```
analises
```

### 11.3 Arquivo no notebook da bancada

`C:\AureaEstacao\estacao.json`, criado uma vez por notebook:

```json
{
  "site": "https://aurea-custodia-mvp.vercel.app",
  "token": "cole aqui o mesmo valor de AUREA_ESTACAO_TOKEN, os 64 caracteres inteiros",
  "pastaLocal": "C:\\AureaEstacao\\analises",
  "operador": "gabriel.silva@aureacustodia.com.br"
}
```

---

## 12. Riscos e o que fazer com cada um

| Risco | Gravidade | O que fazer |
|---|---|---|
| `tsconfig.json` da raiz engolir a pasta `estacao/` e quebrar o build da Vercel | **Alta** | Primeiro commit da frente E acrescenta o `exclude`. Está na Fase 0 |
| Subir `STORE_KEY` para v7 apaga o banco de teste | Média | É esperado e aceito: são sete contas de sócios. Avisar antes do deploy |
| `.exe` sem assinatura assusta operador que não é sócio | Média | Aceitável enquanto só os sócios operam. Certificado de assinatura quando houver operador contratado |
| Etiqueta com endereço do cliente aparecer no vídeo | **Alta — LGPD** | Ritual de bancada, não código: mascarar a etiqueta ou tirar o pacote do quadro **antes** de ligar a câmera. Vídeo gravado errado não se desgrava |
| Duas versões do hash, uma no site e outra na estação | **Alta** | É por isso que o código mora no mesmo repositório e a estação importa `src/domain/hash.ts` |
| Vídeo tentar subir pela rota da aplicação | Média | O limite de 4,5 MB da Vercel derruba em silêncio. O aceite da Fase 3 verifica isso explicitamente |
| Relógio do notebook errado mudar o hash | Média | `validadoEm` vem do servidor. Está na fórmula da seção 8 |

**Atalhos a registrar quando acontecerem** — em `RISCOS_ASSUMIDOS.md` e em
`estacao/ATALHOS.md`, no mesmo commit que os introduzir:

- **RA-20** — executável sem assinatura digital (SmartScreen na primeira execução)
- **RA-21** — papel único de operador: quem analisa é quem aprova, sem segregação de função
- **RA-22** — endereçamento físico como campo de texto livre, sem estrutura de cofre

---

## 13. O que este plano deliberadamente não faz

- **Não sugere blockchain, NFT on-chain nem tokenização.** O recibo é comprovante de
  custódia, propositalmente fora do enquadramento VASP. A decisão está registrada em
  relatório e tem base regulatória.
- **Não coloca trava nenhuma no caminho do operador.** Sem aceite obrigatório, sem
  confirmação em dobro, sem modo fechado por padrão. O ambiente é de teste e a prioridade é
  a bancada funcionar.
- **Não desenha reconhecimento automático de imagem.** Quem julga a moeda é o operador; a
  câmera existe para registrar e para o cliente reassistir.
- **Não mexe em comissão, custódia ou casamento de ordens.** Nenhum número de negócio muda
  por causa da estação.

---

## 14. A primeira coisa a fazer

A Fase 0 inteira cabe numa sessão e não depende de comprar nada, de decidir nada e de ninguém
responder nada. É por ela que se começa.
