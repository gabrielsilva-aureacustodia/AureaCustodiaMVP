# Frentes de Trabalho — Áurea Custódia

**Documento de escopo para o Claude Code**

```
Projeto:     Áurea Custódia / Real Olímpico
Repositório: gabrielsilva-aureacustodia/AureaCustodiaMVP · branch main
Base:        commit 8e0f0a5
Escrito em:  28/08/2026
Frentes:     5 · sendo 2 bloqueadas por decisão
```

---

## Como usar este documento

Este documento **não é ordem de execução imediata**. Ele descreve cinco frentes de trabalho,
o que já existe no repositório para cada uma, o que precisa ser construído, e — o mais
importante — **quais decisões precisam ser tomadas antes de a primeira linha ser escrita**.

**Regra para o agente:** onde este documento diz "decisão travada", **pergunte, não invente**.
Escolher gateway de pagamento, esquema de autenticação ou modelo de dados por conta própria é
o tipo de decisão que custa semanas para desfazer.

**Uma frente por sessão, uma branch por frente.** Nenhuma dessas frentes cabe numa sessão só.
Cada uma se quebra em tarefas, e cada tarefa é uma sessão com `/clear` no fim.

---

# 0. Pré-requisitos no repositório

Três itens do `docs/diario/CRITICAL_DEBUGS.md` deixaram de ser dívida técnica e viraram
**pré-requisito**, porque as frentes abaixo trazem dinheiro real, segredos de terceiros e
dados pessoais para dentro do sistema.

### 0.1 CD-04 — `server-only` instalado *(bloqueia as frentes B, C e D)*

Hoje, o que impede alguém de importar `@/server/*` de um Client Component é **um comentário**.
Isso era aceitável quando o único segredo era o `SESSION_SECRET`. A partir do momento em que o
repositório guardar chave de API de gateway de pagamento e token dos Correios, um import
errado deixa de ser risco teórico e vira vazamento de credencial financeira.

```bash
npm install server-only
```

`import 'server-only'` no topo de `src/server/state.ts`, `session.ts` e `store/index.ts`.
Cinco minutos.

### 0.2 CD-03 — Testes do motor *(bloqueia a frente C)*

O gateway vai mexer em saldo. Alterar qualquer coisa perto de `src/domain/market.ts`,
`fees.ts` ou `money.ts` sem teste é alterar no escuro o código que decide quem paga quanto.

Vitest + as 34 verificações descritas na seção 7 de `docs/MUDANCAS_MERCADO_MULTI_ATIVO.md`.

### 0.3 CD-00 e CD-08 — Ambiente confirmado *(bloqueia tudo)*

Antes de qualquer frente: `SESSION_SECRET` existe na Vercel, e está confirmado qual camada de
persistência está ativa. Não se constrói sobre fundação desconhecida.

---

# 1. Decisões travadas

**O agente não decide nenhuma destas.** Elas vão para o Gabriel, e algumas para o Rogério, o
advogado ou o contador.

| # | Decisão | Trava | Quem decide |
|---|---|---|---|
| **D1** | Blob ou tabelas relacionais — o modelo de dados | Frentes A, C, D, E | Gabriel |
| **D2** | Supabase substitui o Postgres atual, ou convive com ele? | Frentes A, B | Gabriel |
| **D3** | Qual gateway: Mercado Pago, Asaas ou Stripe | Frente C | Gabriel |
| **D4** | Autenticação: Supabase Auth, Auth.js, ou manter a própria + OAuth | Frente B | Gabriel |
| **D5** | Correios direto ou agregador (Melhor Envio, Kangu) | Frente D | Gabriel |
| **D6** | Onde ficam os vídeos da estação: R2, Supabase Storage ou outro | Frente E | Gabriel |
| **D7** | As cinco decisões da estação de validação (item E.9) | Frente E | Gabriel |
| **D8** | Regime tributário — Lucro Presumido ou Simples Nacional | DRE da frente A | **Contador** |
| **D9** | Saldo em reais na plataforma configura conta de pagamento? | Frente C | **Advogado** |

## Sobre D9, que é a mais séria

Hoje o saldo em conta é simulado: a ação de depósito soma um número, com teto de R$ 100.000, e
não existe dinheiro de verdade em lugar nenhum.

No momento em que o gateway entrar, a plataforma passa a **receber, guardar e devolver dinheiro
de terceiros**, e a liquidar negociações entre clientes usando esse saldo. Isso é diferente de
uma loja que cobra pelos próprios produtos, e pode configurar arranjo ou conta de pagamento
sob a regulação do Banco Central.

Não é impedimento — é pergunta que precisa de resposta escrita antes de o dinheiro entrar,
porque a resposta muda a arquitetura. Duas saídas comuns, ambas legítimas: liquidação
direta entre comprador e vendedor via split do gateway, sem saldo interno; ou saldo interno
com o enquadramento regulatório resolvido.

**O agente não avança na frente C sem essa resposta.**

---

# Frente A — Banco de dados relacional e financeiro

## O problema que quase ninguém enxerga primeiro

O repositório **não tem tabelas**. Tem *uma linha*.

```typescript
// src/server/store/types.ts — o contrato inteiro
getState(): Promise<AppState>
mutateState(fn): Promise<AppState>
```

Toda a persistência é um único documento JSON, gravado sob a chave `AUREA_STORE_KEY`. O
adaptador Postgres guarda esse JSON numa coluna e usa `SELECT … FOR UPDATE` para serializar
escritas. Funciona bem para sete contas de teste.

**Não funciona para o que está sendo pedido.** Tabela financeira, trilha de auditoria, extrato
e DRE exigem consulta por período, agregação, filtro e junção. Nada disso existe sobre um blob:
toda leitura carrega o estado inteiro na memória e filtra em JavaScript, e toda escrita
reescreve o documento inteiro.

**Isso é a decisão D1, e ela é a mais estruturante da lista inteira.**

### As duas saídas

**Opção 1 — migrar tudo para relacional.** `AppState` vira esquema real: `users`, `coins`,
`sell_offers`, `buy_orders`, `trades`, `deposits`, `custody_fees`. Correto a longo prazo,
mas reescreve `src/server/store/`, `src/domain/selectors.ts`, `statement.ts` e as cinco Server
Actions. Semanas.

**Opção 2 — ledger relacional ao lado do blob.** O estado do mercado continua no blob; as
tabelas financeiras nascem relacionais e independentes, alimentadas por eventos. Muito mais
rápido de entregar. **O risco é duas fontes de verdade**: se o blob disser um saldo e o ledger
disser outro, alguém precisa decidir quem manda — e essa decisão precisa estar escrita antes,
não depois da primeira divergência.

**Recomendação para levar ao Gabriel:** opção 2, com uma regra explícita — o **ledger é a
verdade contábil** e o blob é cache operacional; toda divergência é defeito do blob, e existe
um comando de reconciliação que recalcula o saldo a partir do ledger. Isso permite entregar a
frente C sem parar tudo, e a opção 1 vira migração planejada em vez de pré-requisito.

## O que construir

### A.1 Ledger financeiro

Tabela append-only. **Nunca se altera linha; corrige-se com lançamento inverso.** É o mesmo
princípio do `VERSION_COMPARISON_DAILY`, e pelo mesmo motivo: registro alterável não vale como
prova.

Campos mínimos: `id`, `created_at`, `user_id`, `tipo` (depósito, saque, compra, venda,
comissão, taxa de custódia, estorno), `valor_centavos`, `sinal`, `saldo_apos`, `ref_externa`
(id da transação no gateway), `ref_interna` (id da negociação), `metadata`.

**`valor_centavos` é inteiro, sempre.** O projeto já tem o tipo `Cents` em
`src/domain/money.ts` e a regra de nunca usar ponto flutuante para dinheiro. Isso vale para
tudo que vier do gateway, inclusive o que a API devolver como decimal.

### A.2 Trilha de auditoria

Append-only, com hash encadeado — cada linha incorpora o hash da anterior. É o item 1.6 do
Bloco 1 de `docs/PRE_LANCAMENTO_CLIENTES_REAIS.md`, e **compartilha a implementação com o hash
da frente E**. Faça uma vez, use nos dois lugares.

### A.3 Extrato

Já existe em `src/domain/statement.ts` e na rota `/conta/extrato`, calculado sobre o blob.
Reapontar para o ledger.

**Aproveite para resolver o CD-09**: hoje a comissão é recalculada a cada leitura em vez de
congelada. No ledger isso se resolve naturalmente — o lançamento grava o valor cobrado no
momento, e o extrato lê o que foi gravado. O extrato para de mudar o passado.

### A.4 DRE e análise contábil

Receita de comissão, receita de custódia, custos, despesas. Exportável.

> ⚠️ **Estrutura sim, alíquotas não.** Enquanto a decisão D8 não vier do contador, o DRE não
> pode ter nenhuma alíquota fixa no código. Deixe as linhas de imposto como configuração
> externa vazia, com o cálculo pronto. Alíquota errada em produção gera passivo fiscal
> retroativo que só aparece na fiscalização, anos depois.

### A.5 Exportação para Google Sheets

O projeto já exporta XLSX e CSV (`src/lib/export/`, `src/lib/xlsx/`) — reaproveite.

Para o Sheets, a escolha prática é **conta de serviço do Google Cloud** com a planilha
compartilhada com o e-mail da conta de serviço. Evita fluxo OAuth por usuário, que seria
absurdo para um relatório interno.

Comece com exportação sob demanda, por botão. Sincronização automática agendada é fase
seguinte, e só depois de existir CI (CD-07).

## Critério de aceite

- [ ] Um depósito, uma compra e uma venda produzem lançamentos no ledger com saldo conferindo
- [ ] O extrato bate com a soma do ledger, ao centavo
- [ ] Alterar `FEE_PCT` **não** altera lançamento já gravado
- [ ] A trilha de auditoria detecta adulteração de linha intermediária
- [ ] O DRE exporta sem nenhuma alíquota fixa no código
- [ ] A exportação para Sheets roda com conta de serviço, sem OAuth de usuário

---

# Frente B — Login e identidade

## O que existe hoje

`src/server/session.ts` — cookie `httpOnly` com o e-mail do usuário e um HMAC-SHA256.
`src/server/actions/auth.ts` — login por e-mail e senha, contra `src/domain/seed.ts`, onde as
**senhas estão em texto puro**.

Isso é MVP consciente, registrado. Não sobrevive a cliente real: é o item 1.2 do Bloco 1.

## O que construir

### B.1 Login com Google

**A decisão D4 muda tudo aqui.** Três caminhos, com consequências bem diferentes:

| Caminho | Ganho | Custo |
|---|---|---|
| **Supabase Auth** | Google, e-mail com código e recuperação vêm prontos. Acopla com a D2 | Migrar a sessão atual; o usuário passa a viver no Supabase |
| **Auth.js (NextAuth)** | Padrão do ecossistema Next; controle total; não amarra o banco | Mais código próprio; recuperação e verificação por sua conta |
| **Manter a própria + OAuth** | Menor mudança | Você reimplementa o que os outros dois já resolveram |

**Recomendação para levar ao Gabriel:** decidir D2 e D4 juntas, na mesma conversa. Se o
Supabase entrar como banco, entrar também como autenticação evita dois sistemas de identidade.
Se o Supabase ficar de fora, Auth.js.

### B.2 Senhas com hash

Independente do caminho: **Argon2id**, conforme o item 1.2. Se o Supabase Auth entrar, ele
resolve isso. Se não, `@node-rs/argon2`.

E o congelamento de saque após recuperação de senha, que está no mesmo item — sem ele, tomar a
conta por e-mail vira tomar o patrimônio.

### B.3 E-mail transacional

Resend serve bem e a integração é simples. Necessário para: verificação de cadastro,
recuperação de senha, confirmação de negociação, aviso de recebimento de moeda em custódia,
e mais tarde os avisos da frente D.

**Domínio verificado com SPF, DKIM e DMARC** em `aureacustodia.com.br`. Sem isso o e-mail cai
em spam, e e-mail de confirmação que não chega é cadastro que não acontece.

Um detalhe que costuma passar: **o template do e-mail é peça jurídica**, não só design. O
aviso de recebimento de moeda em custódia é a confirmação de que o depósito foi aceito.

### B.4 Google Wallet

Fica **fora desta frente**. Depende do recibo de custódia ter formato definido, e isso depende
da decisão jurídica sobre conhecimento de depósito e warrant. Registrado aqui só para não
parecer esquecido.

## Critério de aceite

- [ ] Cadastro por Google funciona ponta a ponta e cria usuário no banco
- [ ] Cadastro por e-mail exige verificação antes de liberar operação
- [ ] Nenhuma senha em texto puro no banco ou no código
- [ ] Recuperação de senha congela saque pelo período definido
- [ ] E-mail chega na caixa de entrada, não em spam, em Gmail e Outlook
- [ ] As sete contas de teste continuam funcionando, ou foram migradas conscientemente

---

# Frente C — Gateway de pagamento

> 🔒 **Bloqueada por D9** (parecer jurídico) **e D3** (qual gateway). Não comece sem as duas.

## Comparação, para a decisão D3

**Verifique tudo isto contra a documentação atual de cada um antes de decidir** — condições
comerciais e disponibilidade de meio de pagamento mudam com frequência, e o que segue é ponto
de partida, não conclusão.

| | Mercado Pago | Asaas | Stripe |
|---|---|---|---|
| Pix | Nativo, forte | Nativo, forte | Disponível no Brasil, confirmar condições |
| Crédito e débito | Sim | Sim | Sim |
| Estorno via API | Sim | Sim | Sim, o mais maduro |
| Split entre partes | Sim | Sim | Sim (Connect) |
| Webhooks | Sim | Sim | Sim, o melhor documentado |
| Documentação | Boa | Boa, em português | Excelente |
| Perfil | Marketplace e varejo | Cobrança recorrente e financeiro | Internacional, produto |

**O critério que mais importa aqui não é preço:** é qual deles tem **split de pagamento** que
sirva ao modelo de liquidação escolhido em D9. Se a resposta jurídica for "sem saldo interno,
liquidação direta entre comprador e vendedor", o split deixa de ser conveniência e vira o
mecanismo central — e aí a escolha do gateway é consequência da decisão jurídica, não anterior
a ela.

## O que construir

### C.1 Substituir o depósito simulado

`src/server/actions/account.ts` tem hoje um depósito que soma um número, com teto de
R$ 100.000. Vira: criar cobrança no gateway → cliente paga → webhook confirma → lançamento no
ledger → saldo atualizado.

**A ordem importa.** Saldo só se move na confirmação do webhook, nunca no retorno da tela. O
cliente pode fechar o navegador antes do redirecionamento, e isso não pode custar o depósito
dele.

### C.2 Webhook, e a parte que quebra em produção

Três coisas que não são opcionais:

**Assinatura verificada.** Webhook sem verificação de assinatura é endpoint público que credita
saldo. Cada gateway tem seu esquema; siga o da documentação, sem improviso.

**Idempotência.** Todo gateway reenvia webhook — por timeout, por retentativa, por falha de
rede. Sem chave de idempotência, o mesmo pagamento credita duas vezes. Já existe registro
disso como problema conhecido no depósito atual (seção 8.9 do documento de mudanças), e com
dinheiro real deixa de ser detalhe.

A implementação é simples: tabela de eventos processados, com o id do evento do gateway como
chave única. Evento repetido é descartado antes de qualquer efeito.

**Fila, não processamento síncrono.** Se o webhook chegar enquanto o banco está lento, o
gateway recebe timeout e reenvia. Grave o evento primeiro, responda 200, processe depois.

### C.3 Estorno

Pela API do gateway, com lançamento inverso no ledger. Estorno parcial e total. E registro de
**quem autorizou** — o que depende dos papéis de operador, que são a decisão D7c da frente E.

### C.4 Auditoria financeira

Toda transação salva, com o payload bruto do gateway guardado junto. Espaço em disco é barato;
conciliação sem o payload original é impossível.

## O que NÃO fazer

- ❌ **Nunca receber, trafegar ou guardar número de cartão.** Sempre checkout hospedado ou
  tokenização do gateway. Tocar em PAN traz PCI-DSS inteiro para dentro do escopo
- ❌ Nunca creditar saldo no retorno da tela
- ❌ Nunca chave de API do gateway fora de variável de ambiente do servidor
- ❌ Nunca `float` para dinheiro — sempre `Cents`

## Critério de aceite

- [ ] Pix, crédito e débito completam ponta a ponta em sandbox
- [ ] Webhook reenviado três vezes credita **uma** vez
- [ ] Webhook com assinatura inválida é rejeitado e registrado
- [ ] Estorno total e parcial refletem no ledger e no extrato
- [ ] Nenhum dado de cartão passa pelo servidor da Áurea
- [ ] Relatório de conciliação bate o gateway com o ledger num período

---

# Frente D — Integração com os Correios

## Decisão D5, antes de tudo

**Correios direto** exige contrato comercial e credenciais de acesso ao sistema deles. Dá
tarifa melhor e controle direto, ao custo de contrato, homologação e uma API mais trabalhosa.

**Agregador** — Melhor Envio, Kangu ou similar — resolve etiqueta, rastreio e múltiplas
transportadoras com uma API só, sem contrato direto. Mais rápido de integrar, com margem
embutida.

**Confirme as condições atuais dos dois caminhos antes de decidir**: exigências de contrato e
cobertura de API mudam, e a informação envelhece rápido.

**Recomendação para levar ao Gabriel:** agregador para o MVP, contrato direto quando o volume
justificar. A integração fica atrás de uma interface própria (`src/lib/shipping/`), para que a
troca depois seja de implementação, não de aplicação inteira.

## O que existe hoje

`/envios` cobre as telas 1.3, 4.1 e 4.2: o cliente declara o que vai enviar, recebe orientação
de embalagem, e acompanha as fases. **Não há código de rastreio, não há etiqueta, e não há
integração nenhuma.** É formulário.

## O que construir

### D.1 Instruções de envio no ato da solicitação

O cliente termina a solicitação e recebe: código do envio (já existe o formato `RO-ENV-0001`
em `src/domain/codes.ts`), endereço da caixa postal, orientação de embalagem, e o que escrever
no pacote.

**Decisão de produto necessária:** a Áurea gera etiqueta pré-paga, ou o cliente posta por
conta? Muda custo, muda experiência e muda quem controla o rastreio. Se a Áurea gera, o
rastreio nasce automático — o que resolve boa parte do resto desta frente sozinho.

### D.2 Agência dos Correios próxima pelo CEP

> ⚠️ **Cuidado com o CEP.** Consultar CEP para sugerir agência é tratamento de dado pessoal.
> Sugerir agência é bom para o cliente; **guardar o histórico de CEPs consultados** é acúmulo
> de dado sem finalidade declarada, e a LGPD pede finalidade. Consulte, mostre, não guarde.

Se a busca de agência exigir contrato ou custo, **corte a funcionalidade sem dó**. O ganho é
conveniência; não vale contrato.

### D.3 Rastreio automático

Código de rastreio vinculado ao envio, atualizado periodicamente, visível na plataforma sem o
cliente sair do site.

**Detalhe que decide se funciona:** rastreio se consulta por **agendamento**, não a cada
carregamento de página. Consultar a API a cada visita gera custo, esbarra em limite de
requisição e deixa a tela lenta. Um job periódico grava o último estado no banco, e a tela lê
do banco.

**Isso exige agendamento**, que a Vercel oferece via cron. Registre a frequência escolhida.

### D.4 Painel logístico

Envios em trânsito, parados há mais de X dias, extraviados, entregues aguardando análise. Serve
ao Customer Success e serve para detectar problema antes de o cliente reclamar.

### D.5 Ligação com a frente E

O envio recebido vira análise. `RO-ENV-0001` precisa amarrar com o código de moeda gerado na
estação. **Defina esse vínculo agora**, mesmo antes de a estação existir — remendar
identificador depois, com moeda física já guardada, é caro de um jeito que não parece.

## Critério de aceite

- [ ] Solicitação de envio gera código e instruções na tela e por e-mail
- [ ] Rastreio atualiza por job agendado, não por visita de página
- [ ] O cliente vê o rastreio sem sair da plataforma
- [ ] Painel logístico mostra envios parados além do prazo
- [ ] Nenhum CEP consultado é guardado sem finalidade declarada
- [ ] O código de envio amarra com o futuro código de moeda

---

# Frente E — Software de análise de moedas

A maior das cinco, e a única que envolve hardware. É a estação de validação física.

> 🔒 **Bloqueada pela decisão D7** — as cinco decisões arquiteturais abaixo. A especificação
> completa não pode ser escrita antes delas.

## E.1 O que já está decidido

- **Câmera:** anel de foco manual (crítico), UVC plug-and-play, MJPEG, rosca de 1/4".
  Microscópio USB como segunda câmera para detalhe
- **Iluminação:** dois LEDs difusos a 45°. **Nunca ring light** — o anel reflete no relevo e
  apaga justamente o que precisa ser visto
- **Balança:** display dentro do quadro da câmera; o operador digita a leitura
- **Ordem de construção:** especificação → interface local → integração com servidor → player
  do cliente e hash

## E.2 A restrição técnica que define a arquitetura

**A Vercel limita o corpo de requisição a 4,5 MB.** Vídeo de análise passa disso com folga.

Consequência inegociável: **o vídeo nunca sobe pela rota da aplicação.** O fluxo é URL assinada
gerada pelo servidor → upload direto do computador da estação para o armazenamento → o servidor
recebe só a confirmação e o caminho.

Isso é a decisão D6: Cloudflare R2 ou Supabase Storage. R2 tem vantagem de custo de egresso na
escala — e egresso é o que pesa quando cada cliente reassiste o vídeo da própria moeda.

## E.3 Onde o software roda

**Não é página web.** Precisa de webcam, pasta local e funcionar com internet instável, sem
perder a gravação. Aplicativo local — Electron ou equivalente — no notebook da bancada.

**Grave local primeiro, envie depois.** Se a internet cair no meio da análise, a gravação está
no disco e sobe quando voltar. Aplicativo que grava direto para a nuvem perde a análise
inteira numa oscilação, e a moeda já foi manuseada.

## E.4 Integração com as fases na plataforma

O operador troca a fase no software → o servidor recebe → a tela do cliente atualiza.

A rota `/envios` já mostra fases, e existe `/api/state` com polling de 10 segundos. **Reaproveite
o polling**; não construa websocket para atualizar uma tela que muda três vezes por dia.

Autenticação máquina-a-máquina própria, separada da sessão de usuário: a estação não é um
usuário.

## E.5 Códigos e identificadores

Já existem os formatos em `src/domain/codes.ts`: `RO-000001` para moeda, `NFT-000001` para
recibo, `RO-ENV-0001` para envio.

Falta o **código do protocolo de análise** — o identificador do procedimento, distinto do da
moeda. Uma moeda pode ser analisada mais de uma vez (reentrada após retirada, recontagem,
contestação), e cada análise precisa de identidade própria.

## E.6 O hash do token — o item central

Hoje, `src/domain/codes.ts` linha 23 gera o hash com `Math.random()`. É simulação declarada e
precisa sair.

**O que construir:** SHA-256 determinístico e encadeado.

**Determinístico** significa: mesma entrada, mesmo hash, sempre, em qualquer máquina. Isso é o
que permite que qualquer pessoa recalcule e confira. Aleatoriedade em qualquer ponto da
composição destrói essa propriedade — e com ela, o valor inteiro do mecanismo.

**Encadeado** significa: cada registro incorpora o hash do anterior. Alterar um registro
antigo quebra todos os posteriores, e a adulteração fica detectável sem precisar de terceiro.

**A composição precisa ser documentada e congelada.** Escreva a fórmula exata — quais campos
entram, em que ordem, com que separador, com que normalização de texto e data. Um espaço a
mais muda o hash, e um hash que não se reproduz não prova nada.

Sugestão de entrada: código da moeda + código do protocolo + timestamp da validação + peso
aferido + identificador do operador + caminho do vídeo + hash do registro anterior.

**Compartilhe a implementação com a trilha de auditoria da frente A.** É o mesmo mecanismo.

## E.7 Arquivamento das mídias

Estrutura por código de moeda e protocolo, não por nome de usuário — usuário muda de nome,
moeda troca de dono, código não muda.

## E.8 LGPD — a etiqueta no vídeo

> ⚠️ **A etiqueta de envio aparece no quadro e carrega o endereço do cliente.**

Não é problema de programação: é ritual de bancada. Mascarar a etiqueta antes de ligar a
câmera, posicionar o pacote fora do enquadramento, ou tratar o arquivo como dado pessoal
restrito.

**A decisão vem antes da primeira gravação.** Vídeo gravado errado não se desgrava, e o vídeo
é justamente o que o cliente vai reassistir por anos.

## E.9 As cinco decisões que travam a especificação (D7)

1. **Reserva de número antes ou depois da análise.** Reservar antes evita duplicidade sob
   concorrência; reservar depois evita buraco na sequência quando há rejeição
2. **Veredito por moeda e ramo de rejeição.** Um envio traz N moedas. Três passam e uma é
   recusada — aprovação parcial, ou o envio inteiro fica pendente?
3. **Papéis e permissões do operador.** Quem opera, quem aprova, quem rejeita. Também é o que
   sustenta o registro de autorização de estorno da frente C
4. **Reserva atômica no Postgres.** Como garantir que duas estações não peguem o mesmo número
5. **Endereçamento físico por cápsula.** Prateleira, gaveta, posição. Precisa nascer em escala
   de armazém — migrar endereçamento depois significa mexer fisicamente em cada cápsula

## Critério de aceite

- [ ] O software roda offline e sincroniza quando a conexão volta
- [ ] Trocar a fase no software atualiza a tela do cliente em menos de 30 segundos
- [ ] O vídeo sobe direto para o armazenamento, sem passar pela rota da aplicação
- [ ] O mesmo conjunto de dados produz o mesmo hash em máquinas diferentes
- [ ] Alterar um registro antigo quebra a cadeia de forma detectável
- [ ] A fórmula do hash está documentada a ponto de um terceiro reimplementar
- [ ] Nenhuma etiqueta com endereço aparece em vídeo arquivado

---

# Ordem recomendada

```
FASE 0  Pré-requisitos            server-only · testes · ambiente confirmado
   │
FASE 1  Decisões                  D1 D2 D3 D4 D5 D6 D7 (Gabriel)
   │                              D8 (contador) · D9 (advogado)
   │
FASE 2  Frente A                  banco relacional e ledger
   │                              ← tudo depende disto
   ├──────────────┬───────────────┐
   ▼              ▼               ▼
FASE 3  Frente B  Frente D        (paralelizáveis)
   │    login     Correios
   ▼
FASE 4  Frente C                  gateway — precisa de A e B
   │
FASE 5  Frente E                  estação — precisa de A, e D6/D7 resolvidas
```

**As frentes B e D são paralelizáveis** e não se tocam: uma mexe em `src/server/session.ts` e
`actions/auth.ts`, a outra em `src/lib/shipping/` e `actions/custody.ts`. É onde faz sentido
colocar um segundo agente.

**As frentes C e E não são paralelizáveis com nada**, porque as duas mexem no núcleo
financeiro e na trilha de auditoria.

## Divisão de frentes entre agentes

Atualize a Parte 6 do `RITUAL_DE_SESSAO.md` antes de dar acesso a um segundo agente:

| Agente | Frente | Pastas | Branch |
|---|---|---|---|
| Claude Code | A, depois C | `src/server/store/`, `src/domain/statement.ts`, `actions/` | `feat/ledger`, `feat/gateway` |
| Segundo agente | D | `src/lib/shipping/`, `src/app/(app)/envios/` | `feat/correios` |
| Terceiro agente | B | `src/server/session.ts`, `actions/auth.ts` | `feat/auth` |

**Nunca dois agentes na mesma pasta ao mesmo tempo.**

---

# Regras que valem em todas as frentes

1. **Superfície protegida.** `src/domain/constants.ts`, `fees.ts`, `market.ts`, `types.ts`, o
   contrato de `src/server/store/types.ts` e as cinco Server Actions. Mudança ali exige parada
   e decisão. Fora dali, é desenvolvimento normal
2. **Mudou `types.ts`?** Rotacione `AUREA_STORE_KEY` antes de publicar — é o Passo 3 do
   `/publicar`, e existe para evitar quebra que só aparece em produção
3. **Dinheiro é `Cents`, inteiro.** Nunca `float`, venha de onde vier
4. **Segredo só no servidor**, sempre em variável de ambiente, nunca em arquivo versionado
5. **Nada de blockchain, token on-chain ou DApp.** Decisão registrada com base regulatória
6. **Nenhuma alíquota fixa no código** antes da decisão D8
7. **Uma frente por sessão.** `/commit` no fim, `/clear` antes da próxima
8. **Toda decisão precisa ser explicável ao Rogério**, sócio não técnico. Se só funciona em
   jargão, ainda não amadureceu

---

# O que este documento não cobre

Registrado para não parecer esquecido:

| Assunto | Onde está |
|---|---|
| Telas de retirada, tutoriais com aceite, seguro no envio | Documento de retomada, Bloco D |
| Bloqueantes de cliente real | `docs/PRE_LANCAMENTO_CLIENTES_REAIS.md`, Bloco 1 |
| Seguro, CAPEX físico, conta Claude compartilhada | Documento de retomada, Bloco G |
| Crédito com garantia | Depende da parceria bancária e do parecer sobre o recibo |
