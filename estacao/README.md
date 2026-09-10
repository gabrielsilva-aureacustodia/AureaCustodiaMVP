# Estação de Análise — o programa da bancada

**Frente E · Áurea Custódia / Real Olímpico**

O programa que roda no notebook da bancada: mostra a câmera, grava o vídeo da análise no
disco, recebe o peso e o veredito do operador, e devolve ao site a fase nova do envio junto
com o recibo de custódia e seu hash.

> **Para quem nunca abriu esta pasta.** O plano completo, com o porquê de cada decisão,
> está em [`../docs/PLANO_EXECUTIVO_ESTACAO.md`](../docs/PLANO_EXECUTIVO_ESTACAO.md). O
> contrato entre este programa e o site — rotas, chave e a fórmula do hash — está em
> [`CONTRATO.md`](CONTRATO.md).

---

## Por que isto não é uma página do site

Três motivos, e nenhum é preferência técnica:

1. **A webcam.** Uma página abre a câmera, mas não escolhe entre duas câmeras USB de forma
   estável, não sobrevive a um refresh acidental no meio da gravação e não escreve numa
   pasta do disco que o operador possa abrir depois.
2. **A internet instável.** Gravação que sobe direto para a nuvem se perde inteira numa
   oscilação — e a moeda já foi manuseada. Aqui grava-se no disco primeiro e envia-se
   depois.
3. **O tamanho do vídeo.** A Vercel recusa requisição com corpo acima de 4,5 MB. O vídeo
   nunca passa pela rota da aplicação: o site assina uma URL e a bancada sobe direto para o
   armazenamento.

---

## Como rodar

### No computador de quem desenvolve

```bash
cd estacao
npm install
npm start
```

`npm install` daqui **não é o mesmo** do `npm install` da raiz. Esta pasta tem
`package.json` próprio de propósito: o Electron pesa umas centenas de megabytes e não pode
entrar no build do site na Vercel.

### Gerar o `.exe` da bancada

```bash
cd estacao
npm run build
```

O arquivo sai em `estacao/dist/AureaEstacao.exe` — **96 MB**, medidos em 10/09/2026. É
**portátil**: copiar para o notebook e dar dois cliques. Não instala nada, não precisa de
Node, de navegador nem de driver. (A pasta `dist/win-unpacked/` tem a versão descompactada,
de 246 MB; ela serve para depurar, não para levar à bancada.)

> **Na primeira execução o Windows vai avisar** que "protegeu o computador". O executável
> não é assinado digitalmente. Clicar em **Mais informações** → **Executar assim mesmo**
> resolve, e o aviso não volta naquele notebook. Está registrado como RA-20.

---

## Levar o `.exe` para outro computador

**O executável não precisa do repositório.** Ele carrega o Chromium e o Node dentro dele:
copiar o arquivo e dar dois cliques basta. Nada de instalar Node, navegador, driver ou
clonar o projeto.

Mas ele **precisa de um site com as rotas da estação** para ter o que fazer. Isso muda o
que cada pessoa consegue testar:

| Endereço configurado | Quem consegue usar | O que aparece se não der |
|---|---|---|
| `http://localhost:3000` | **só quem está rodando `npm run dev` na própria máquina** | "Sem conexão" |
| `https://aurea-custodia-mvp.vercel.app` | qualquer pessoa com a chave, de qualquer lugar | "Sem conexão" até o site ser publicado com as rotas |

> ⚠️ **Enquanto a frente E não estiver publicada, mandar o `.exe` para um sócio não
> funciona.** Ele vai abrir, ver "Sem conexão" e não ter fila nenhuma — porque o site em
> produção ainda não conhece `/api/estacao/*`. Ver
> [`../docs/ESTACAO_O_QUE_FALTA_PARA_CONECTAR.md`](../docs/ESTACAO_O_QUE_FALTA_PARA_CONECTAR.md).

**Depois de publicado**, o que cada sócio precisa é:

1. O arquivo `AureaEstacao.exe`
2. A **chave da estação** — a mesma `AUREA_ESTACAO_TOKEN` que está na Vercel
3. Preencher os três campos na primeira abertura, com o endereço de produção

A chave é a mesma para todos: a estação identifica a **máquina de bancada**, não a pessoa.
Quem operou fica registrado pelo campo **Operador**, que entra no hash do recibo — por isso
cada sócio deve pôr o próprio e-mail ali, e não o de outro.

> **Sobre mandar a chave por mensagem:** ela vale para uma rota que cria ativo. Num ambiente
> de teste com sete contas de sócios isso é aceitável, e é a mesma decisão registrada no
> RA-11. Quando houver cliente real, cada bancada ganha a sua e a rotação passa a ser
> obrigatória — está em `docs/PRE_LANCAMENTO_CLIENTES_REAIS.md`.

---

## Configuração do notebook

Na primeira abertura o programa cria `C:\AureaEstacao\estacao.json` e mostra a tela de
configuração. Três campos:

| Campo | O que é |
|---|---|
| **Endereço do site** | `https://aurea-custodia-mvp.vercel.app` |
| **Chave da estação** | O mesmo valor de `AUREA_ESTACAO_TOKEN` na Vercel — 64 caracteres |
| **Operador** | O e-mail de quem opera a bancada; é ele que entra no hash do recibo |

A chave, depois de gravada, **nunca volta para a tela**. Deixar o campo em branco ao salvar
mantém a que já está lá — dá para trocar o nome do operador sem redigitar 64 caracteres.
Isso não é capricho: um vídeo de bancada com a tela ao fundo gravaria a chave junto com a
moeda.

---

## O que fica no disco

```
C:\AureaEstacao\
├── estacao.json                  ← endereço, chave e operador
├── analises\
│   └── RO-ENV-0001\
│       └── RO-ENV-0001-2.webm    ← o vídeo da análise
└── fila\
    └── 1757520000000-RO-ENV-0001.json
```

**A pasta `fila/` é o que faz este programa sobreviver à internet caindo.** Fechar um
procedimento escreve o arquivo na fila **antes** de tentar falar com o site. Deu certo, o
arquivo sai. Deu errado, ele fica, e o programa tenta de novo a cada minuto. O operador vê
só um contador de pendentes no alto da tela.

Três desfechos possíveis para um arquivo da fila:

| Desfecho | O que acontece |
|---|---|
| O site aceitou | O arquivo é apagado |
| Erro de rede | Fica na fila, tenta de novo em 1 minuto |
| O site recusou (protocolo já fechado, dados inválidos) | Vira `.recusado` e para de tentar — repetir daria o mesmo erro para sempre |

---

## Os arquivos

| Arquivo | O que faz |
|---|---|
| `main.js` | Processo principal: disco, rede, fila. **Tudo que sai do programa passa por aqui** |
| `preload.js` | A ponte. É a lista COMPLETA do que a tela consegue fazer fora dela mesma |
| `renderer/index.html` | A tela |
| `renderer/app.js` | O comportamento da tela. Não toca disco nem rede — pede pela ponte |
| `renderer/estilo.css` | Fundo escuro de propósito: tela clara ao lado joga luz no relevo da moeda |

`contextIsolation` ligado e `nodeIntegration` desligado. A tela não tem `require`, não tem
`fs` e não faz `fetch` para endereço arbitrário.

## Duas coisas sobre a câmera

**A permissão é concedida no `main.js`, e só para `media`.** Sem os manipuladores
`setPermissionCheckHandler` e `setPermissionRequestHandler`, o Chromium embutido decide
sozinho o que fazer com o `getUserMedia` — e quando nega, a tela mostra "Não consegui abrir a
câmera" sem que haja nada de errado com o cabo. Numa bancada, isso vira meia hora trocando de
porta USB. São dois manipuladores porque a maioria das APIs do navegador consulta a permissão
antes de pedi-la; implementar só um deixa metade dos caminhos no comportamento padrão. Tudo
que não é `media` é negado.

**A câmera escolhida fica lembrada naquele notebook**, em `localStorage`. Com a webcam
integrada e a USB ligadas ao mesmo tempo, o navegador oferece a integrada primeiro; sem
lembrar, o operador troca de câmera em toda abertura — e um dia esquece, e a análise sai
gravada pela câmera errada.

## A pilha de captura do Windows

O programa força o **DirectShow** em vez do MediaFoundation, que é o padrão do Chromium.
Com o padrão, `enumerateDevices()` e `getUserMedia()` **travavam** — mais de vinte segundos
sem responder — com a webcam USB da bancada conectada, e o travamento sobrevivia a
reiniciar o programa. Com o DirectShow, a mesma máquina enumera as três câmeras em 747 ms.

Para voltar ao padrão do Chromium sem recompilar, acrescente ao `estacao.json`:

```json
"capturaModerna": true
```

A resolução pedida é `ideal: 1920x1080`: a USB da bancada entrega 1080p, a do notebook
entrega 720p, e sem pedir nada o Chromium entrega 640x480 — pouco para relevo de moeda.

---

## O ritual de bancada que vem antes de ligar a câmera

> ⚠️ **A etiqueta dos Correios tem o endereço do cliente.**

Mascarar a etiqueta, ou posicionar o pacote fora do enquadramento, **antes** de apertar
Gravar. Não é problema de programação: vídeo gravado errado não se desgrava, e o vídeo é
justamente o que o cliente vai reassistir por anos. O aviso está na tela, ao lado do botão.

Da mesma forma, a gravação é **sem áudio**. O que prova a custódia é a imagem da moeda;
microfone ligado grava a conversa da sala, que é dado pessoal que ninguém pediu.

---

## O que este programa NÃO faz

- **Não calcula o hash.** Quem calcula é o servidor, com o relógio dele. Notebook de bancada
  tem relógio errado com frequência, e hash que depende do relógio de uma máquina não se
  reproduz.
- **Não decide o que é aprovado.** Quem julga a moeda é o operador. Não há reconhecimento de
  imagem.
- **Não lê a balança por cabo.** O display fica dentro do quadro da câmera e o operador
  digita o valor. É a decisão de hardware da frente E.
- **Não faz aprovação parcial.** O envio inteiro é analisado de uma vez — um veredito por
  moeda, todos juntos (decisão D7b).
