# D7 — As cinco decisões da estação de validação física

**Documento para levar ao chat dedicado ao software de análise de moedas**

```
Projeto:     Áurea Custódia / Real Olímpico — AUREA CUSTODIA LTDA
Repositório: github.com/gabrielsilva-aureacustodia/AureaCustodiaMVP
Origem:      docs/diario/FRENTES_DE_TRABALHO.md, frente E · decisão D7
Escrito em:  01/09/2026
```

> **Como usar este documento.** Ele é autossuficiente: dá o contexto necessário para quem
> nunca abriu o repositório, faz as cinco perguntas com as opções e as consequências de
> cada uma, e lista o que já está decidido para não ser rediscutido. Cole-o inteiro no
> chat da estação.

---

## Contexto mínimo

A **Áurea Custódia** guarda fisicamente moedas comemorativas brasileiras e opera um
marketplace onde os donos negociam entre si. Quando alguém envia uma moeda para custódia,
ela passa por uma **estação de validação física** — uma bancada com câmera, iluminação e
balança, onde um operador confere a moeda, grava o procedimento em vídeo e emite o recibo
digital que fica vinculado ao ativo.

A plataforma web já existe (Next.js 15 + TypeScript, na Vercel). A estação **ainda não
existe** — é a frente E do projeto, e é a única que envolve hardware.

### O que já está decidido e não se rediscute

**Hardware:**
- Câmera com **anel de foco manual** (crítico), UVC plug-and-play, MJPEG, rosca de 1/4"
- Microscópio USB como segunda câmera, para detalhe
- **Dois LEDs difusos a 45°. Nunca ring light** — o anel reflete no relevo e apaga
  exatamente o que precisa ser visto
- Balança com display dentro do quadro da câmera; o operador digita a leitura

**Arquitetura:**
- **Aplicativo local** (Electron ou equivalente) no notebook da bancada. Não é página web:
  precisa de webcam, pasta local e funcionar com internet instável
- **Grava local primeiro, envia depois.** Se a internet cair no meio da análise, a gravação
  está no disco e sobe quando voltar. Gravar direto para a nuvem perde a análise inteira
  numa oscilação — e a moeda já foi manuseada
- **O vídeo nunca sobe pela rota da aplicação.** A Vercel limita o corpo de requisição a
  4,5 MB. O fluxo é: URL assinada gerada pelo servidor → upload direto da estação para o
  armazenamento → o servidor recebe só a confirmação e o caminho
- **Armazenamento: Supabase Storage** (decisão D6, 01/09/2026)
- **Banco: Supabase Postgres** (decisão D2, 01/09/2026)
- Autenticação **máquina-a-máquina própria**, separada da sessão de usuário: a estação não
  é um usuário
- A rota `/envios` já mostra fases e existe `/api/state` com polling de 10 segundos.
  **Reaproveitar o polling** — não construir websocket para atualizar uma tela que muda três
  vezes por dia

**Identificadores que já existem no código** (`src/domain/codes.ts`):
- `RO-000001` — código do ativo (moeda)
- `NFT-000001` — código do recibo, espelha o do ativo
- `RO-ENV-0001` — protocolo de envio

**O hash do recibo:** hoje é gerado com `Math.random()` e está rotulado como simulado.
Precisa virar **SHA-256 determinístico e encadeado** — mesma entrada produz o mesmo hash em
qualquer máquina, e cada registro incorpora o hash do anterior. A composição exata (quais
campos, em que ordem, com que separador e normalização) **precisa ser documentada e
congelada**: um espaço a mais muda o hash, e hash que não se reproduz não prova nada.

**Restrição de LGPD que vem antes da primeira gravação:** a etiqueta de envio aparece no
quadro da câmera e carrega o endereço do cliente. Mascarar a etiqueta, posicionar o pacote
fora do enquadramento, ou tratar o arquivo como dado pessoal restrito. **Vídeo gravado
errado não se desgrava**, e o vídeo é justamente o que o cliente vai reassistir por anos.

**Restrição de marca:** anéis olímpicos não podem aparecer em arte de moeda gerada pelo
sistema (risco de propriedade intelectual do COB).

---

# As cinco perguntas

## D7a — A reserva do número do ativo acontece antes ou depois da análise?

Quando uma moeda chega e é analisada, ela recebe um código sequencial (`RO-000042`). A
pergunta é **em que momento** esse número é reservado.

**Opção 1 — reservar ANTES da análise.** O operador abre o procedimento, o sistema já
separa o número, e a análise acontece com o código em mãos.
- ✅ Elimina duplicidade sob concorrência: duas estações trabalhando ao mesmo tempo nunca
  pegam o mesmo número
- ❌ Moeda recusada deixa **buraco na sequência** — existirá um `RO-000042` que nunca virou
  ativo

**Opção 2 — reservar DEPOIS do veredito.** O número só nasce quando a moeda é aprovada.
- ✅ Sequência sem buracos
- ❌ Exige coordenação entre estações no momento da emissão, que é justamente quando o
  operador está esperando

**Pergunta:** buraco na sequência é aceitável? (Em custódia, sequência com buraco costuma
gerar pergunta de auditoria: "cadê o RO-000042?". Vale decidir se a resposta "foi recusado"
é suficiente.)

---

## D7b — Como funciona o veredito quando parte do envio é recusada?

Um envio (`RO-ENV-0001`) pode trazer várias moedas. Se três passam e uma é recusada:

**Opção 1 — aprovação parcial.** As três aprovadas viram ativos com recibo; a recusada
segue um fluxo de devolução.
- ✅ O cliente recebe o que é dele mais rápido
- ❌ Um envio passa a ter dois desfechos ao mesmo tempo — a tela de acompanhamento precisa
  representar isso, e o cliente precisa entender

**Opção 2 — o envio inteiro fica pendente** até que todas as moedas tenham veredito.
- ✅ Estado simples: o envio está aberto ou fechado
- ❌ Uma moeda problemática segura as outras

**Perguntas que vêm junto:**
- A moeda recusada é **devolvida** (quem paga o frete?), **descartada**, ou fica guardada
  aguardando decisão do cliente?
- Existe **contestação**? Se o cliente discorda da recusa, há reanálise?
- A recusa entra no histórico público do ativo, ou é registro interno?

---

## D7c — Papéis e permissões do operador

Quem opera a bancada, quem aprova e quem rejeita são a mesma pessoa?

**Opção 1 — papel único.** Quem analisa decide.
- ✅ Simples e rápido com equipe pequena
- ❌ Sem segregação de função: a mesma pessoa que erra é a que valida

**Opção 2 — analista e aprovador separados.** O operador registra, um segundo papel
homologa.
- ✅ Segregação de função, que é o que auditoria e due diligence procuram
- ❌ Exige duas pessoas disponíveis, ou a homologação vira gargalo

**Isto não é só da estação.** Este mesmo conjunto de papéis sustenta o **registro de quem
autorizou um estorno** na frente do gateway de pagamento. Decidir aqui resolve os dois
lugares — decidir diferente nos dois cria dois sistemas de permissão.

**Perguntas:**
- Quantas pessoas vão operar a bancada no começo?
- O Gabriel e o Rogério são operadores, aprovadores, ou os dois?
- Existe papel de **auditor** (lê tudo, não altera nada)?

---

## D7d — Reserva atômica no banco: como garantir que duas estações não peguem o mesmo número

Pergunta técnica, mas com consequência de negócio: **duas moedas com o mesmo código é
incidente de custódia**, não bug de software.

**Opção 1 — sequência do Postgres** (`CREATE SEQUENCE`). O banco garante unicidade;
`nextval` nunca devolve o mesmo valor duas vezes.
- ✅ É o mecanismo do banco para isso, não dá para errar
- ❌ Sequência não volta atrás: número consumido e não usado vira buraco (ver D7a)

**Opção 2 — linha travada com `SELECT … FOR UPDATE`**, como o contador atual do estado.
- ✅ Permite lógica em volta (reciclar número não usado, por exemplo)
- ❌ Mais código próprio para uma garantia que o banco já dá de graça

**Recomendação técnica:** sequência do Postgres, salvo se a resposta do D7a exigir
reciclagem de número.

**Pergunta relacionada:** o **código do protocolo de análise** ainda não existe. Uma moeda
pode ser analisada mais de uma vez (reentrada após retirada, recontagem, contestação), e
cada análise precisa de identidade própria, distinta do código da moeda. Qual formato?
(Sugestão que segue o padrão da casa: `RO-ANL-0001`.)

---

## D7e — Endereçamento físico das cápsulas

Onde a moeda fica guardada fisicamente: prateleira, gaveta, posição.

**Isto precisa nascer em escala de armazém.** Migrar endereçamento depois significa mexer
fisicamente em cada cápsula — é o tipo de decisão barata hoje e cara em seis meses.

**Perguntas:**
- Qual a estrutura física real do cofre? (Quantas prateleiras, gavetas por prateleira,
  posições por gaveta?)
- O endereço é **fixo por moeda** (a moeda tem seu lugar e sempre volta para ele) ou
  **dinâmico** (a moeda vai para a primeira posição livre, e o sistema sabe onde)?
- Uma cápsula guarda **uma moeda ou várias**?
- O endereço aparece para o cliente, ou é informação interna? (Sugestão: interna —
  endereço físico de item valioso é informação de segurança.)
- Existe conferência periódica de inventário (contar o cofre e bater com o sistema)?

---

## O que responder e como devolver

Para cada uma das cinco, preciso de: **a opção escolhida** e, onde houver, **a resposta das
perguntas adicionais**.

Com isso escrevo a especificação da estação. Sem isso, qualquer especificação seria chute
sobre operação física que eu não conheço.

### Critério de aceite já definido para a frente E

O que a estação precisa provar quando ficar pronta:

- [ ] O software roda offline e sincroniza quando a conexão volta
- [ ] Trocar a fase no software atualiza a tela do cliente em menos de 30 segundos
- [ ] O vídeo sobe direto para o Supabase Storage, sem passar pela rota da aplicação
- [ ] O mesmo conjunto de dados produz o mesmo hash em máquinas diferentes
- [ ] Alterar um registro antigo quebra a cadeia de forma detectável
- [ ] A fórmula do hash está documentada a ponto de um terceiro reimplementar
- [ ] Nenhuma etiqueta com endereço aparece em vídeo arquivado
