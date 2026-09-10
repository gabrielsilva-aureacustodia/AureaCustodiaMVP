# Atalhos assumidos — `estacao/`

Atalhos tomados nesta pasta para entregar a bancada funcionando. Cada um está também em
[`../RISCOS_ASSUMIDOS.md`](../RISCOS_ASSUMIDOS.md), que é a lista única do que a plataforma
deve ao próprio rigor.

**Regra da casa:** atalho novo entra nos dois lugares, no mesmo commit que o introduziu.

---

## RA-20 — O executável não é assinado digitalmente 🟡

**O que é.** `AureaEstacao.exe` sai do `electron-builder` sem certificado de assinatura de
código. Na primeira execução em cada notebook, o Windows mostra a tela azul "O Windows
protegeu o computador".

**Como se contorna hoje.** Mais informações → Executar assim mesmo. O aviso não volta
naquele notebook.

**Por que foi aceito.** A bancada tem um ou dois notebooks e quem opera é sócio. Um
certificado de assinatura custa entre US$ 200 e 400 por ano e exige validação da empresa —
custo e prazo que não se justificam para provar a um sócio que o programa que ele mesmo
mandou construir é confiável.

**Quando isso deixa de valer.** No dia em que houver operador contratado que não seja sócio.
Aí o aviso deixa de ser inconveniência e vira problema de confiança: a pessoa não tem como
distinguir este programa de um malware, e treinar alguém a ignorar avisos do Windows é
treinar a ignorar o próximo, que pode ser verdadeiro.

---

## RA-21 — Papel único: quem analisa é quem aprova 🟡

**O que é.** Não há segregação de função. O operador registra o veredito e ele mesmo o
homologa. `analise.aprovador` recebe sempre o mesmo valor de `analise.operador`.

**Por que foi aceito.** Decisão D7c, de 10/09/2026: são dois sócios operando uma bancada.
Exigir duas pessoas para cada moeda transformaria a homologação em gargalo antes de existir
fila.

**O que já foi feito para o conserto sair barato.** O campo `aprovador` **já está na fórmula
do hash**, separado do `operador`. Quando a segregação chegar, o campo passa a receber outro
valor e **a fórmula não muda** — nenhum recibo emitido é invalidado. Se ele não estivesse
ali desde o começo, acrescentá-lo depois exigiria recalcular a corrente inteira.

**Quando isso deixa de valer.** Quando houver cliente real e due diligence. Segregação de
função é a primeira coisa que auditoria procura em custódia de bem de terceiro. O mesmo
conjunto de papéis também sustenta o registro de quem autorizou um estorno, na frente C.

---

## RA-22 — Endereçamento físico como texto digitado 🟡

**O que é.** O endereço da cápsula no cofre é um campo de texto (`caixa`) e um número
opcional (`posicao`), ambos digitados pelo operador. Não há validação de que a caixa existe,
nem de que a posição está livre, nem inventário conferível.

**Por que foi aceito.** Decisão D7e, de 10/09/2026: a estrutura física hoje é um conjunto de
caixinhas de acrílico rotuladas — o exemplo real é `Caixa EB 001`, onde EB é Entrega da
Bandeira. Modelar prateleira, gaveta e posição antes de existir prateleira seria inventar
uma estrutura para depois descobrir que ela não é a do cofre.

**O que o formato de hoje já resolve.** O rótulo `EB-001` carrega o tipo da moeda no próprio
código, então ele cresce naturalmente para outros tipos (`DH-001`) sem virar outro esquema.

**O que isso custa enquanto durar.** Erro de digitação não é detectado. Duas moedas podem ser
gravadas na mesma posição sem que nada acuse. Achar uma cápsula depende de o operador ter
digitado certo.

**Quando isso deixa de valer.** Quando o cofre tiver estrutura definida — a pergunta está
aberta desde 10/09/2026. Migrar endereçamento depois significa mexer fisicamente em cada
cápsula, então quanto antes a estrutura existir, melhor.

---

## RA-23 — O vídeo não é obrigatório para fechar a análise 🟡

**O que é.** A rota `POST /api/estacao/analise/fechar` aceita `caminhoVideo` nulo. Dá para
fechar um procedimento sem ter gravado nada.

**Por que foi aceito.** Porque o contrário é pior. Vídeo obrigatório significa que uma
câmera com cabo solto, um balde do Supabase ainda não criado ou uma internet caída
**impedem a moeda de ser analisada** — com a moeda já fora da cápsula, na mesa. A gravação é
prova; a análise é operação. Travar a operação na prova inverte a prioridade.

**O que existe no lugar da trava.** O campo entra no hash: uma análise sem vídeo tem
`caminhoVideo` vazio no texto hasheado, e isso é permanente e visível. Não dá para alegar
depois que o vídeo existia.

**Quando isso deixa de valer.** Quando houver cliente real. Aí o vídeo faz parte do que foi
contratado, e a ausência dele precisa ao menos aparecer como pendência na tela de quem
administra — não necessariamente como trava.

---

# Bugs encontrados no teste de 10/09/2026 (corrigidos, registrados aqui porque voltam)

Estes quatro foram descobertos dirigindo a tela por protocolo de depuração, e não por
leitura de código. Ficam anotados porque são armadilhas que reaparecem em qualquer
programa de bancada.

**1. `hidden` derrotado pelo CSS.** `.modal { display: flex }` vence o `[hidden]` do
navegador, e a janela de configuração ficava permanentemente na tela, tapando o programa.
Nenhum teste automático pegou: quem confere `el.hidden` lê o atributo, que estava certo.
A correção é a regra global `[hidden] { display: none !important }` no topo do CSS. **Ao
acrescentar qualquer `display:` a um elemento que se esconde com `hidden`, lembrar disto.**

**2. `MediaRecorder.start()` recusando um fluxo sem áudio.**
`isTypeSupported('video/webm')` devolve `true` e o `start()` lança `NotSupportedError`
mesmo assim, porque o formato genérico deixa o Chromium escolher um contêiner que espera
trilha de áudio — e a bancada grava só imagem. A correção é a lista `FORMATOS`, que declara
o codec de vídeo e tenta um por um até um `start()` sobreviver.

**3. `deviceId: { exact }` com id velho.** O identificador de uma câmera não é estável: muda
ao reconectar a webcam noutra porta USB e entre sessões. Pedir `exact` com um id guardado
falhava com `NotFoundError`, e a mensagem na tela era "confira se o cabo USB está
conectado" — com o cabo conectado. A correção é `abrirFluxo()`, que cai para "qualquer
câmera" **avisando**, porque cair em silêncio faria a análise sair gravada pela webcam do
notebook em vez do microscópio.

**4. `input[type=number]` descartando a vírgula.** O operador digita `27,05`, como o display
da balança mostra, e o Chromium devolve string vazia. O programa então acusava "digite o
peso lido na balança" para quem tinha acabado de digitar. A correção é `type="text"` com
`inputmode="decimal"` e normalização de vírgula para ponto na hora de montar o envio.
**Todo campo numérico com casa decimal neste projeto tem que aceitar vírgula.**

**5. `enumerateDevices()` e `getUserMedia()` TRAVANDO com a webcam USB conectada.** Não
falhavam — travavam: mais de vinte segundos sem responder, e o travamento sobrevivia a
reiniciar o programa. A tela ficava com a lista de câmeras vazia e nada acusava erro. A
causa é a pilha de captura **MediaFoundation** do Windows, padrão do Chromium, com o driver
da câmera desta máquina. Forçando a pilha antiga (**DirectShow**, via
`--disable-features=MediaFoundationVideoCapture` embutido no `main.js`), a mesma máquina
enumerou as três câmeras em **747 ms** e gravou de todas.

O escape está no `estacao.json`: `"capturaModerna": true` volta ao padrão do Chromium sem
recompilar, para o dia em que aparecer uma câmera que só funcione na pilha nova.

Como rede de segurança, `enumerarComPrazo()` e `abrirFluxo()` agora têm prazo de 8 segundos:
se o Windows travar de novo por outro motivo, o operador vê uma mensagem em vez de uma tela
parada, e o programa cai para "câmera padrão", que não depende de enumeração.

**6. Vídeo em 640x480.** Sem pedir resolução, o Chromium entrega 640x480 — pouco para
enxergar relevo de moeda. A constante `RESOLUCAO` pede `ideal: 1920x1080`; a webcam USB da
bancada entrega 1080p e a do notebook entrega 720p. `ideal` e não `exact`, senão a do
notebook falharia em vez de entregar o que consegue.
