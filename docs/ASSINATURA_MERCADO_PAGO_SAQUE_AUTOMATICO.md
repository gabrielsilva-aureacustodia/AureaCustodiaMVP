# A assinatura do Mercado Pago para saque automático — explicação para decidir com o sócio

Escrito em 14/10/2026 para o Gabriel conversar com o sócio. Sem jargão onde der. No fim há a lista de perguntas
para o Mercado Pago e a decisão que precisa ser tomada.

> **Em uma frase:** para o sistema mandar Pix sozinho, a partir da conta do Mercado Pago da empresa, o Mercado
> Pago exige que cada ordem de envio venha com uma **"assinatura digital"** nossa — como o carimbo e a firma
> reconhecida que o banco exige num cheque. Para isso a empresa **gera um par de chaves (de graça, em 2
> minutos)** e **entrega uma delas ao Mercado Pago**. O resto do trabalho técnico **já está feito**. O que não sei
> dizer é **quanto tempo o Mercado Pago leva** para cadastrar a chave nem **se cobram tarifa** por cada Pix
> enviado — isso só eles respondem (perguntas na seção 7).

---

## 1. O que é essa assinatura, sem jargão

Imagine que o sistema do Real Olímpico é um funcionário que manda ordens de pagamento ao Mercado Pago pela
internet: "pague R$ 191,00 para o CPF tal". Como é dinheiro saindo, o Mercado Pago precisa ter certeza de duas
coisas:

1. **Quem mandou foi mesmo o Real Olímpico** (e não alguém que descobriu a senha de acesso e está se passando por nós).
2. **A ordem não foi alterada no caminho** (ninguém trocou o valor ou a chave Pix no meio).

A solução que eles pedem é a mesma ideia da firma reconhecida:

- A empresa tem uma **"chave secreta"** (a *chave privada*): um arquivo que só nós temos e que usamos para
  **assinar** cada ordem. É como a caneta que só nós temos.
- A empresa entrega ao Mercado Pago a **"chave de conferência"** (a *chave pública*): com ela o Mercado Pago
  **confere** que a assinatura é nossa. É como o cartório que guarda o modelo da nossa firma.
- Cada ordem de pagamento vai com a assinatura. Se a assinatura não bater (porque não é nossa, ou porque a ordem
  foi alterada), o Mercado Pago **recusa**.

Ou seja: é uma **camada extra de segurança contra fraude**, e não um burocratismo sem sentido. Em produção a
assinatura é obrigatória segundo a documentação, então, em princípio, quem roubasse só a senha de acesso do
Mercado Pago (o "token") **não conseguiria mandar Pix** sem também ter o arquivo da chave secreta. (Essa é a
intenção do mecanismo; vale confirmar com o Mercado Pago que a exigência é imposta no lado deles — pergunta 8
na seção 7.)

---

## 2. Passo a passo para fazer

Quem faz cada coisa está indicado. Os comandos exatos estão em `docs/SAQUE_PIX_MERCADO_PAGO.md`.

| # | Passo | Quem faz | Tempo estimado | Custo |
|---|---|---|---|---|
| 1 | **Gerar o par de chaves** (um comando no computador do Gabriel; sai um arquivo "secreto" e um "público") | Gabriel | 2 minutos | R$ 0 |
| 2 | **Guardar o arquivo secreto em lugar seguro** (cofre de senhas, com cópia de segurança) | Gabriel | 10 minutos | R$ 0 |
| 3 | **Entregar o arquivo público ao Mercado Pago**, falando com o **time de Integrações** deles (pelo gerente da conta ou suporte técnico — a documentação não indica um formulário) | Gabriel | Um e-mail / um chamado | R$ 0 (a princípio — ver seção 5) |
| 4 | **Esperar o Mercado Pago cadastrar a chave pública** | Mercado Pago | **Não sei — eles não publicam prazo** | — |
| 5 | **Ativar as credenciais de produção** da aplicação no painel do Mercado Pago (informar o ramo de atividade e o site, aceitar os termos) | Gabriel | 10 minutos | R$ 0 |
| 6 | **Colocar a chave secreta e o interruptor "automático" no sistema** (duas variáveis na Vercel) | Gabriel (ou eu, passando os dados) | 10 minutos | R$ 0 |
| 7 | **Teste em modo de teste** (sandbox): saque de mentira, aprovar, conferir | Gabriel + eu | 30 minutos | R$ 0 |
| 8 | **Primeiro saque real, de valor baixo** (sugestão: R$ 6,00 → R$ 1,00 líquido, para a chave Pix do próprio Gabriel) | Gabriel | 15 minutos | o valor do Pix + eventual tarifa |

**Resumo de esforço nosso:** mais ou menos **uma hora de trabalho no total**. O que não está sob nosso controle é
o **passo 4** (a espera do Mercado Pago).

---

## 3. Isso tem custo?

**Pelo que consegui confirmar:**

- **Gerar as chaves:** gratuito. É uma ferramenta que já vem no computador, sem licença.
- **Usar a assinatura em cada envio:** gratuito. É só um cálculo que o nosso sistema faz sozinho; não há cobrança por assinar.
- **Ativar a conta para produção:** a documentação do Mercado Pago **não menciona nenhum valor** para isso.

**O que eu NÃO consegui confirmar (e que precisa perguntar a eles):**

- **Se o Mercado Pago cobra uma tarifa por cada Pix enviado pela API.** Procurei e **não achei tabela de tarifas
  para saídas por Payouts**. As tarifas que aparecem publicadas são de *recebimento* (cobrar clientes) ou de
  transferência entre pessoas físicas — não se aplicam a este caso.
- Se existe **limite de valor por Pix, por dia ou por mês** para esse tipo de envio.
- Se a empresa precisa de **algum tipo de conta ou contrato específico** para ter o recurso liberado.

**Por que isso importa no financeiro:** hoje o cliente paga **R$ 5,00 de tarifa de saque** e a empresa fica com
isso como receita. Se o Mercado Pago cobrar, por exemplo, R$ 1,00 por Pix enviado, esse R$ 1,00 vira **despesa**
que sai da receita de R$ 5,00. O sistema **ainda não registra** essa despesa (a DRE só calcula a tarifa do
Mercado Pago sobre o que a empresa *recebe*). Se houver tarifa, é um ajuste pequeno que fazemos depois do
primeiro envio real, olhando o extrato.

---

## 4. É rápido de fazer?

- **A nossa parte: sim.** Cerca de uma hora de trabalho e **nenhum desenvolvimento novo**: o sistema já sabe
  assinar, montar a ordem e conversar com o Mercado Pago.
- **A parte do Mercado Pago: não sei.** Ela depende de alguém do time de Integrações deles **cadastrar a nossa
  chave pública**. A documentação não diz prazo (pode ser horas, pode ser dias). O jeito de reduzir o risco é
  **pedir hoje** e, enquanto espera, continuar pagando os saques manualmente (seção 6) — o sistema já funciona
  assim.

**Dica prática:** fazer o pedido pelo **gerente de conta** (se a empresa tiver um) costuma ser mais rápido que
pelo suporte comum. Vale perguntar também se há um prazo combinado (SLA).

---

## 5. Riscos e cuidados que o sócio deve conhecer

1. **A chave secreta é como a senha da conta do banco da empresa.** Quem a tiver (e também o token do Mercado
   Pago) consegue mandar Pix a partir da conta. Cuidados: guardar em cofre de senhas, **nunca** mandar por
   WhatsApp ou e-mail, **nunca** colocar no repositório de código, e ter **uma cópia de segurança** (se perder o
   arquivo, é preciso gerar outro par e pedir ao Mercado Pago para cadastrar de novo).
2. **O saque continua precisando de um humano.** O sistema **não aprova sozinho**: a equipe vê o pedido, confere
   o nome e a chave e aperta "Aprovar e enviar Pix". A assinatura só deixa o *envio* automático depois da
   aprovação. (Aprovação automática por regras — por exemplo, "até R$ 100,00 libera sozinho" — **não foi feita**;
   é possível no futuro, e é uma decisão de risco do negócio.)
3. **O sistema não confere se a chave Pix pertence ao titular da conta.** Ele só confere o *formato* (CPF com 11
   dígitos, e-mail com @, etc.). Quem aprova deve olhar o nome do cliente na fila e a chave.
4. **Pix enviado não volta.** Enviado para a chave errada, só se recupera pedindo a devolução ao banco do
   destinatário. Por isso a aprovação humana e o primeiro teste com valor baixo.
5. **Saldo na conta do Mercado Pago.** O envio só acontece se a conta de origem tiver saldo. Sem saldo, o Pix
   falha e o pedido volta para a fila (nada se perde).
6. **Questão regulatória (RA-01):** movimentar dinheiro de clientes é um risco que o Gabriel já decidiu assumir
   em 11/09/2026. A assinatura não muda isso — o saque manual e o automático movimentam o mesmo dinheiro, da
   mesma conta.

---

## 6. O que já conseguimos fazer no automático — e o que não

### Já funciona hoje (sem assinatura, sem nenhuma configuração)

Isto está construído e testado, e entra no ar assim que o commit chegar ao GitHub e a Vercel publicar:

| O quê | Como |
|---|---|
| Cliente pede o saque | O valor total (com a tarifa de R$ 5,00) sai do saldo na hora e fica reservado |
| **Aviso à equipe** | E-mail para quem tem permissão + alerta no painel inicial (com quantos passaram do prazo D+3) |
| **Fila de saques** | Página própria, no Financeiro, no painel inicial e na ficha de cada cliente |
| **Aprovar na mão, "Marcar como pago"** | A equipe faz o Pix pelo app do banco ou do Mercado Pago e registra o comprovante; o saque vira "pago" |
| **Recusar** | Pede o motivo, devolve o valor ao saldo do cliente e avisa por e-mail |
| **Avisos ao cliente** | Pedido recebido (com o prazo), pago, recusado |
| Contabilidade | Recusa gera um estorno identificado no livro-razão; a tarifa devolvida sai da receita na DRE |
| Segurança | Só a equipe com permissão específica aprova, paga ou recusa |

### O que o envio automático faz (pronto no código, desligado, esperando a assinatura)

| O quê | Como |
|---|---|
| Botão **"Aprovar e enviar Pix"** | Manda o valor líquido para a chave Pix do cliente, a partir da conta do Mercado Pago, em poucos segundos |
| **Conferir** | Pergunta ao Mercado Pago se o Pix já foi creditado; marca "pago" sozinho e guarda o comprovante |
| **Aviso do Mercado Pago** | Quando o Mercado Pago avisa que o Pix saiu, o sistema confere e fecha o saque |
| **Proteções contra pagar duas vezes** | Já testadas (clique duplo, falha de internet, resposta incerta) |
| Se o Pix falhar | O pedido volta para a fila com o motivo (chave errada, sem saldo...) — **sem devolver o dinheiro sozinho** |

Em **modo de teste (sandbox)** o envio automático **já pode ser testado hoje, sem assinatura e sem esperar o
Mercado Pago** — ele não movimenta dinheiro de verdade. Só a **produção** exige a assinatura.

### O que **não** conseguimos (ainda)

| O quê | Por quê |
|---|---|
| **Enviar Pix de verdade, automaticamente, em produção** | Falta a chave pública cadastrada no Mercado Pago (passos 3 e 4) |
| **Aprovar saque sozinho, sem uma pessoa** | Não foi construído por escolha de segurança; precisa de decisão do negócio (limites, regras) |
| **Conferir se a chave Pix é do mesmo CPF do cliente** | O sistema só confere o formato; a pessoa que aprova confere o nome |
| **Registrar tarifa do Mercado Pago por Pix enviado** | Não sabemos se existe; se existir, a DRE ainda não a captura |
| **Conciliar sozinho o extrato do Mercado Pago com os saques** | Não existe; o comprovante guardado em cada saque serve para conferir à mão |
| **Devolver sozinho o dinheiro de um Pix que falhou** | De propósito: falha é decidida por uma pessoa (corrigir a chave e reenviar, ou recusar) |

---

## 7. Perguntas para fazer ao Mercado Pago (copiar e colar)

> Somos a AUREA CUSTODIA LTDA (CNPJ 68.071.452/0001-06). Queremos usar a **API de Payouts (`/v1/payouts`)** para
> enviar Pix a partir da nossa conta Mercado Pago para a chave Pix de clientes (saque de saldo). Precisamos de:
> 1. **Cadastrar a nossa chave pública Ed25519** para a assinatura `X-signature` em produção — como enviamos e qual o **prazo**?
> 2. A conta precisa de **algum contrato, habilitação ou análise** específica para ter Payouts liberado em produção?
> 3. Existe **tarifa por transferência Pix enviada**? Qual o valor ou a tabela?
> 4. Existem **limites** por transferência, por dia ou por mês?
> 5. O **aviso de mudança de status** (`notification_url`) possui **assinatura para validarmos a autenticidade**? Como?
> 6. Há **ambiente de teste (sandbox)** completo para validarmos o fluxo antes de produção?
> 8. Em produção, **a assinatura é exigida pelo lado de vocês** (a requisição sem assinatura é recusada), ou depende do cabeçalho `X-enforce-signature` que nós enviamos?
> 7. A documentação do Brasil usa `POST /v1/payouts`; encontramos também referência a `/v1/transaction-intents/process`. **Qual é o endpoint vigente para a nossa conta?**

(A pergunta 7 existe porque durante a pesquisa apareceram os dois caminhos. O sistema foi construído sobre o
`/v1/payouts`, que é o descrito na documentação oficial do Brasil; o teste em sandbox vai confirmar.)

---

## 8. A decisão a combinar com o sócio

**Opção A — Fazer a assinatura e ligar o Pix automático.**
Vantagens: saque em minutos, sem ninguém abrindo o app do banco, menos erro de digitação, comprovante e status
automáticos. Custo: uma hora de trabalho + a espera do Mercado Pago; possível tarifa por Pix (a descobrir); a
responsabilidade de guardar a chave secreta.

**Opção B — Seguir com o pagamento manual (já funciona).**
Vantagens: zero configuração, zero risco de chave vazar. Custo: alguém precisa fazer cada Pix à mão e registrar o
comprovante (alguns minutos por saque) e o prazo D+3 depende dessa pessoa estar atenta — o alerta e o e-mail
ajudam, mas dependem de gente.

**Recomendação:** os dois **não se excluem**. Dá para **pedir hoje o cadastro da chave** (custo zero, sem
compromisso) e **pagar manualmente até chegar a resposta**. Decidir ligar o automático só depois de saber (1) o
prazo, (2) se há tarifa e (3) como será o volume de saques: com poucos saques por semana o manual basta; com
muitos, o automático compensa.

**O que precisa ser decidido entre os sócios:**
1. Fazemos o pedido de cadastro da chave ao Mercado Pago? (Sugestão: sim, é grátis.)
2. Quem guarda a chave secreta e onde (e quem tem a cópia de segurança)?
3. Depois de ligado, o saque continua sempre com aprovação humana? (Sugestão: sim, no início.)
4. Qual é o **valor máximo por saque** que aceitamos enviar automaticamente, se um dia quisermos aprovar por regra?
