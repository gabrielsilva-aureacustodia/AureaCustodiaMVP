# Tutorial — colocar a estação de análise no ar

```
Para:        Gabriel
Escrito em:  10/09/2026
Tempo total: ~50 minutos, sem contar a compra do hardware
Pré-requisito: nenhum. Comece pelo Passo 0.
```

> **Como usar.** Faça na ordem. Cada passo termina com **"Como conferir que pegou"** — não
> pule essa parte: é ela que separa "eu cliquei em salvar" de "está funcionando".
>
> Os caminhos de painel deste tutorial foram conferidos na documentação vigente da Vercel e
> do Supabase em 10/09/2026, não escritos de memória.

---

## Os valores que você vai usar

Guarde esta tabela aberta. Todo valor aqui é **literal e completo** — é para copiar inteiro,
sem editar nada.

| Onde | Nome | Valor |
|---|---|---|
| Vercel | `AUREA_ESTACAO_TOKEN` | 64 caracteres — veja como obter no Passo 1 |
| Vercel | `SUPABASE_STORAGE_BUCKET` | `analises` |
| Vercel | `SUPABASE_SERVICE_ROLE_KEY` | copiada do painel do Supabase no Passo 4 |
| Vercel (só se faltar) | `SUPABASE_URL` | `https://vjbqikfamqdttbmaqrxf.supabase.co` |
| Notebook da bancada | Endereço do site | `https://aurea-custodia-mvp.vercel.app` |
| Notebook da bancada | Chave da estação | a mesma do `AUREA_ESTACAO_TOKEN` |
| Notebook da bancada | Operador | `gabriel.silva@aureacustodia.com.br` |

**Endereços diretos dos painéis:**

- Vercel — variáveis: `https://vercel.com/dashboard` → projeto → **Settings** → **Environment Variables**
- Supabase — balde: `https://supabase.com/dashboard/project/vjbqikfamqdttbmaqrxf/storage/buckets`
- Supabase — chaves: `https://supabase.com/dashboard/project/vjbqikfamqdttbmaqrxf/settings/api-keys`

> O `vjbqikfamqdttbmaqrxf` é a referência do seu projeto Supabase. Ela não foi chutada: sai
> do usuário `postgres.vjbqikfamqdttbmaqrxf` da string de conexão que já funciona, e a URL
> foi testada e responde.

---

# Passo 0 — Publicar o código · 10 minutos

**Por que este passo vem antes de tudo.** As rotas `/api/estacao/*` **ainda não existem em
produção**. Conferi agora: `https://aurea-custodia-mvp.vercel.app/api/estacao` devolve 404.
O código está pronto no seu computador, mas ninguém o publicou. Cadastrar variável de
ambiente antes de publicar não adianta — não há rota para lê-la.

## O que fazer

```bash
git add -A
```

```bash
git commit -m "Cria a estacao de analise fisica (frente E)"
```

Depois, publique pelo método do fork que já está documentado em
`docs/METODO_PUBLICACAO_VIA_FORK.md`. Se preferir, me peça: eu commito e abro a PR.

## Como conferir que pegou

Na Vercel, em **Deployments**, o deploy mais recente precisa estar **Ready**. Depois, no
terminal:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://aurea-custodia-mvp.vercel.app/api/estacao
```

| Resposta | O que significa |
|---|---|
| `404` | O deploy ainda não subiu. Espere e repita |
| `503` | ✅ **É o que você quer aqui.** A rota existe e está dizendo que falta a chave — que é justamente o Passo 1 |
| `401` | A rota existe e a chave já está cadastrada. Pode pular para o Passo 2 |

---

# Passo 1 — A chave da estação na Vercel · 5 minutos

**O que é.** A senha que o programa da bancada usa para provar ao site que é ele. A estação
não é um usuário: não tem e-mail, não tem sessão, não faz login. Tem uma chave.

**Por que precisa existir.** Sem ela, todas as rotas `/api/estacao/*` respondem 503 e a
bancada fica desligada. Não há valor padrão de desenvolvimento de propósito — uma rota que
emite recibo de custódia não pode ficar aberta porque alguém esqueceu de configurar.

## 1.1 — Descobrir o valor

Uma chave já foi gerada e está no seu `.env.local` (que não vai para o GitHub). Para vê-la
inteira:

```bash
grep AUREA_ESTACAO_TOKEN .env.local
```

A saída é uma linha assim, e o que você quer são os **64 caracteres entre as aspas**:

```
AUREA_ESTACAO_TOKEN="a1b2c3d4...e5f6"
```

O valor real não está escrito neste documento de propósito: **o repositório é público**
enquanto durar o desenvolvimento (RA-11), e esta chave abre a rota que cria ativo.

**Se preferir gerar uma nova** (e aí ela precisa ir para o `.env.local`, para a Vercel e para
o notebook, os três com o mesmo valor):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

O resultado tem **exatamente 64 caracteres** de `0` a `9` e `a` a `f`. Se o que você colou
tiver outro tamanho, colou pela metade.

## 1.2 — Cadastrar na Vercel

1. Abra `https://vercel.com/dashboard` e clique no projeto **aurea-custodia-mvp**.
2. Clique em **Settings**, no topo.
3. Clique em **Environment Variables**, na barra lateral esquerda.
4. No formulário **Add New**:
   - **Name** (ou **Key**): `AUREA_ESTACAO_TOKEN`
   - **Value**: cole os 64 caracteres **inteiros**, sem aspas, sem espaço antes nem depois
   - **Environments**: marque **Production**, **Preview** e **Development** — as três
5. Clique em **Save**.

## 1.3 — Republicar (este passo é obrigatório)

A documentação da Vercel é literal: *"Changes to environment variables are not applied to
previous deployments, they only apply to new deployments. You must redeploy your project."*

Variável salva **não vale** para o site que já está no ar. Faça:

**Deployments** → o deploy mais recente → menu **⋯** → **Redeploy**.

## Como conferir que pegou

Troque `COLE_A_CHAVE_AQUI` pelos 64 caracteres:

```bash
curl -s -H "Authorization: Bearer COLE_A_CHAVE_AQUI" https://aurea-custodia-mvp.vercel.app/api/estacao
```

| Resposta | O que significa |
|---|---|
| `{"ok":true,"servidor":...}` | ✅ Funcionou |
| `{"error":"A estação não está habilitada neste ambiente..."}` | A variável não chegou. Esqueceu o Redeploy, ou marcou só um dos ambientes |
| `{"error":"Chave da estação inválida."}` | A variável chegou, mas o valor que você colou no curl é diferente do que está na Vercel — quase sempre colagem parcial |

---

# Passo 2 — A migration do banco · 2 minutos

**O que é.** A tabela `aurea.analises`, onde cada procedimento da bancada fica gravado, e
uma coluna nova no contador de códigos. Nasceram na migration 004.

**Por que é seguro rodar antes do deploy.** A migration é **aditiva**: só cria tabela e
acrescenta coluna, com `IF NOT EXISTS`. Não apaga nada, não altera nada e não muda tipo de
coluna nenhuma. O código antigo simplesmente não enxerga a tabela nova.

> **Já apliquei esta migration no seu banco de teste em 10/09/2026**, durante a construção.
> Este passo é para conferir, e para quando houver outro banco.

## O que fazer

```bash
npm run db:migrate
```

## Como conferir que pegou

```bash
npm run db:check
```

Na saída, procure a linha das migrations. Ela precisa terminar com `004_analise_estacao`:

```
✓ migrations aplicadas em "aurea": 001_inicial, 002_pagamentos_rastreio, 003_ledger_dre_auditoria, 004_analise_estacao
```

**Se `004_analise_estacao` não aparecer**, a rota da fila vai responder 500 quando a bancada
tentar carregar. Não é erro do programa: é a tabela que não existe.

---

# Passo 3 — O executável e o notebook da bancada · 15 minutos

## 3.1 — Gerar o `.exe`

```bash
cd estacao
```

```bash
npm install
```

```bash
npm run build
```

O arquivo sai em `estacao\dist\AureaEstacao.exe`, com **96 MB**. É portátil: não instala
nada, não precisa de Node, de navegador nem de driver.

> A pasta `estacao\dist\win-unpacked\` também tem um `AureaEstacao.exe`, de 246 MB. **Não é
> esse.** Aquele é a versão descompactada, para depurar; ela só funciona junto com os
> arquivos ao redor. O que vai para a bancada é o de 96 MB, direto em `dist\`.

## 3.2 — Copiar para o notebook

Copie **só o arquivo** `AureaEstacao.exe` — pen drive, rede, e-mail, tanto faz. Ele não
precisa de mais nada ao lado.

## 3.3 — Abrir pela primeira vez

Dê dois cliques. **O Windows vai mostrar uma tela azul** dizendo "O Windows protegeu o
computador".

Isso é esperado: o executável não tem assinatura digital (registrado como RA-20). Faça:

1. Clique em **Mais informações** — é um link pequeno, no meio da tela azul
2. Clique em **Executar assim mesmo**

O aviso não volta mais naquele notebook.

## 3.4 — Configurar

Como não há chave gravada ainda, o programa abre direto na tela de configuração. Três
campos:

| Campo | O que digitar |
|---|---|
| **Endereço do site** | `https://aurea-custodia-mvp.vercel.app` |
| **Chave da estação** | os mesmos 64 caracteres do Passo 1 |
| **Operador** | `gabriel.silva@aureacustodia.com.br` |

Clique em **Salvar**.

> **Sobre a chave:** depois de salva, ela **nunca mais aparece na tela** — o campo volta
> vazio. Isso é de propósito: um vídeo de bancada com a tela ao fundo gravaria a chave junto
> com a moeda. Deixar o campo em branco ao salvar mantém a que já está lá, então dá para
> trocar o nome do operador sem redigitar os 64 caracteres.

## 3.5 — O primeiro teste, hoje, sem esperar deploy

Para a bancada mostrar alguma coisa, precisa haver **um envio esperando análise** e **um
site com as rotas da estação**. Hoje faltam os dois. Resolve-se em cinco minutos.

### Onde apontar o programa

| Situação | Endereço do site | Quando usar |
|---|---|---|
| **Teste local** | `http://localhost:3000` | **Hoje.** Não depende de publicar nada. Só funciona no computador que está rodando o servidor |
| **Produção** | `https://aurea-custodia-mvp.vercel.app` | Depois do Passo 0. É o endereço definitivo da bancada |

Para o teste local, deixe o servidor rodando numa janela de terminal:

```bash
npm run dev
```

E no programa da bancada, em **Configuração**, ponha no endereço do site:

```
http://localhost:3000
```

A chave é a mesma — ela já está no seu `.env.local`, então o servidor local a aceita sem
mais nenhum ajuste.

### Como pôr um envio na fila

A fila está vazia agora. Para enchê-la, use o próprio site, que é o caminho real:

1. Abra `http://localhost:3000` e entre com uma conta de teste
2. Vá em **Envios** e crie um protocolo novo — escolha o tipo de moeda e a quantidade
   (**comece com 1 ou 2**, porque você vai digitar um veredito para cada uma)
3. Clique em **Marcar como postado**
4. Clique em **Simular avanço** **uma vez**. A etapa vira **"Recebido pela custódia"**

Pare aí. **Não clique em "Simular avanço" de novo** — o próximo clique emitiria o recibo
pela tela, com o hash simulado, e o envio sumiria da fila da bancada antes de você chegar
nele.

Agora, no programa da estação, clique em **Atualizar**. O envio aparece na coluna da
esquerda.

### O que testar com as duas câmeras

Com a webcam do notebook e a USB ligadas, a lista **Câmera** tem duas entradas. Vale conferir
nesta ordem:

1. **Trocar entre as duas** e ver a imagem mudar. Os nomes só aparecem depois que o programa
   abre a câmera pela primeira vez — antes disso a lista mostra "Câmera 1" e "Câmera 2"
2. **Fechar e reabrir o programa.** Ele lembra a última câmera escolhida naquele notebook —
   assim você não corre o risco de gravar uma análise pela webcam integrada sem perceber
3. **Gravar 10 segundos** e conferir que o arquivo apareceu em
   `C:\AureaEstacaonalises\<protocolo>\`
4. **Fechar a análise** com peso e veredito, e ver a moeda nascer com recibo

No fim do teste, a moeda criada fica no acervo da conta que você usou. Se quiser, me peça
para limpar depois.

---

## Como conferir que pegou

No alto da tela, à direita, o indicador precisa dizer **Conectado**, em verde.

| O que aparece | O que fazer |
|---|---|
| **Conectado** (verde) | ✅ Pronto |
| **Sem conexão** | O notebook está sem internet, ou o endereço do site está errado |
| **Erro: A estação não está habilitada...** | Falta o Passo 1, ou faltou o Redeploy |
| **Erro: Chave da estação inválida** | A chave do notebook é diferente da que está na Vercel |
| **Falta configurar** | Algum dos três campos ficou vazio |

O programa cria a pasta `C:\AureaEstacao\` com `analises\` e `fila\` dentro. Se ela existir,
o programa rodou.

---

# Passo 4 — O balde de vídeos no Supabase · 10 minutos

**O que é.** O lugar na nuvem onde os vídeos das análises ficam guardados.

**O que acontece se você pular este passo.** A bancada funciona do mesmo jeito: grava o vídeo
no disco do notebook, pesa, julga e emite o recibo. Só o vídeo não sobe — o cliente não
consegue reassistir. Isso é deliberado (RA-23): falta de balde não pode impedir uma moeda de
ser analisada, com ela já fora da cápsula, na mesa.

## 4.1 — Criar o balde

1. Abra `https://supabase.com/dashboard/project/vjbqikfamqdttbmaqrxf/storage/buckets`
2. Clique em **New bucket**
3. Em **Name of bucket**, digite exatamente:

```
analises
```

4. **Deixe "Public bucket" DESLIGADO.** Este é o único ponto deste passo em que errar
   importa de verdade: vídeo de análise pode capturar a etiqueta dos Correios com o endereço
   do cliente. Balde público aqui é incidente de LGPD, não configuração inconveniente.
5. Clique em **Create bucket** (ou **Save**)

## 4.2 — Copiar a chave de serviço

1. Abra `https://supabase.com/dashboard/project/vjbqikfamqdttbmaqrxf/settings/api-keys`
2. Você vai ver quatro chaves. A que serve aqui é a de **privilégio elevado**:
   - se o painel oferecer **Secret keys**, use a que começa com `sb_secret_`
   - se só houver o formato antigo, use a `service_role` (um texto longo em três partes
     separadas por ponto)
   - **não** use `anon` nem `publishable` — essas não conseguem assinar upload
3. Clique no olho ou em **Reveal** para mostrar o valor, e copie **inteiro**

> ⚠️ **Esta chave dá acesso total ao projeto.** Ela vai só para a Vercel e **nunca** para o
> notebook da bancada. O programa da estação recebe apenas a URL já assinada, válida para um
> arquivo só.

## 4.3 — Cadastrar as variáveis na Vercel

Mesmo caminho do Passo 1: **Settings** → **Environment Variables** → **Add New**. Três
variáveis, uma de cada vez, todas com **Production**, **Preview** e **Development** marcados:

**Primeira:**

- **Name**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: a chave que você acabou de copiar, inteira

**Segunda:**

- **Name**: `SUPABASE_STORAGE_BUCKET`
- **Value**:

```
analises
```

**Terceira — só se ela ainda não existir na lista.** Procure por `SUPABASE_URL` ou
`NEXT_PUBLIC_SUPABASE_URL` nas variáveis já cadastradas. Se nenhuma das duas estiver lá:

- **Name**: `SUPABASE_URL`
- **Value**:

```
https://vjbqikfamqdttbmaqrxf.supabase.co
```

Depois: **Deployments** → o mais recente → **⋯** → **Redeploy**. De novo: variável salva não
vale para o deploy que já está no ar.

## Como conferir que pegou

```bash
curl -s -H "Authorization: Bearer COLE_A_CHAVE_AQUI" -H "Content-Type: application/json" -d "{\"protocolo\":\"TESTE\",\"arquivo\":\"teste.webm\"}" https://aurea-custodia-mvp.vercel.app/api/estacao/video/url
```

| Resposta | O que significa |
|---|---|
| `{"url":"https://vjbq...","token":...}` | ✅ Funcionou |
| `{"error":"Upload de vídeo não configurado: falta ..."}` | A resposta **diz o nome da variável que falta**. Cadastre e republique |
| `{"error":"Falha ao assinar a URL de upload."}` | A chave está cadastrada mas foi recusada, ou o balde `analises` não existe |

Na bancada, o sinal é o texto abaixo do vídeo depois de parar uma gravação:

- *"Gravação salva no disco e enviada para o armazenamento."* → o balde está funcionando
- *"Gravação salva no disco. Ainda não subiu: ..."* → o vídeo está seguro no notebook, mas
  não chegou à nuvem — e o motivo vem escrito na própria frase

---

# Passo 5 — O hardware da bancada · decisão sua

Nenhuma moeda foi analisada com equipamento real ainda. O programa funciona com qualquer
webcam para você testar o fluxo hoje mesmo — mas a análise de verdade precisa disto:

| Item | O requisito, e por que ele não é negociável |
|---|---|
| **Câmera principal** | **Anel de foco manual.** Câmera com foco automático fica "caçando" o foco quando a moeda brilha, e o vídeo sai inutilizável justamente nos segundos que importam. Além disso: UVC plug-and-play (Windows reconhece sem driver), MJPEG, rosca de 1/4" para prender no suporte |
| **Microscópio USB** | A segunda câmera, para o detalhe do relevo. O programa alterna entre as duas |
| **Iluminação** | **Dois LEDs difusos a 45°. Nunca ring light.** O anel de luz reflete no relevo e apaga exatamente o que precisa ser visto — é o erro mais comum em fotografia de moeda |
| **Balança** | Com display que caiba no quadro da câmera. O operador lê e digita; o programa não conversa com a balança por cabo |

## Uma coisa que vale testar antes de comprar

Ligue qualquer webcam no notebook, abra o programa, escolha um envio da fila e grave 30
segundos. Você vai descobrir a altura do suporte, a distância da moeda e onde o display da
balança precisa ficar — três coisas que nenhuma especificação escrita resolve, e que mudam a
lista de compras.

---

# O ritual que vem antes de toda gravação

> ⚠️ **A etiqueta dos Correios tem o endereço do cliente.**

Tire a etiqueta do enquadramento, ou cubra, **antes** de apertar Gravar. Não é problema de
programação, é ritual de bancada: vídeo gravado errado não se desgrava, e o vídeo é
justamente o que o cliente vai reassistir por anos. O aviso está na tela, ao lado do botão.

A gravação é **sem áudio**, de propósito. O que prova a custódia é a imagem da moeda;
microfone ligado grava a conversa da sala, que é dado pessoal que ninguém pediu.

---

# Se algo der errado

| Sintoma | Causa quase certa |
|---|---|
| Tudo responde `404` | O código não foi publicado — Passo 0 |
| Tudo responde `503` | Falta `AUREA_ESTACAO_TOKEN`, **ou faltou o Redeploy** depois de salvar |
| Tudo responde `401` | A chave do notebook é diferente da que está na Vercel. Quase sempre colagem parcial: confira que são 64 caracteres dos dois lados |
| A fila responde `500` | Falta a migration 004 — Passo 2 |
| A fila vem vazia | Não há envio em "Recebido pela custódia". Nada de errado com a estação |
| "Não consegui abrir a câmera" | Cabo USB solto, ou outro programa está usando a webcam |
| O vídeo não sobe | Passo 4 incompleto. A gravação está salva em `C:\AureaEstacao\analises\` de qualquer forma |
| Fechou a análise e apareceu "sem conexão agora" | Normal. O registro está em `C:\AureaEstacao\fila\` e sobe sozinho em até 1 minuto depois que a internet voltar |
| O contador de pendentes não zera | Abra `C:\AureaEstacao\fila\`. Arquivo terminado em `.recusado` é análise que o site rejeitou — abra e leia o motivo lá dentro |

---

# Resumo em uma tela

```
0. Publicar o código                     → /api/estacao sai de 404 para 503
1. AUREA_ESTACAO_TOKEN na Vercel + Redeploy → 503 vira 200
2. npm run db:migrate                    → db:check mostra 004_analise_estacao
3. npm run build em estacao/ → .exe      → a bancada diz "Conectado"
4. Balde `analises` privado + chave      → "enviada para o armazenamento"
5. Comprar o hardware                    → a primeira moeda de verdade
```
