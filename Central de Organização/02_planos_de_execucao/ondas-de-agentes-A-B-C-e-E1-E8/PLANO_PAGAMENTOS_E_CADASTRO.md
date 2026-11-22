# Plano Executivo — pagamento de verdade e o cadastro que o destrava

**Áurea Custódia · escrito em 11/09/2026 · decisões do Gabriel da mesma data**

```
Base:     76c6caa (as três frentes mergeadas e auditadas)
Escopo:   ligar o Mercado Pago nas telas de depósito e compra,
          e o gatilho de cadastro que fica na frente delas
```

> **Para o Rogério.** Hoje o cliente consegue clicar em "depositar" e o dinheiro aparece na
> conta dele sem ninguém ter pagado nada — é um ambiente de demonstração. Este plano troca
> isso por cobrança de verdade, e coloca na frente dela o cadastro que o jurídico exige.

---

# 0. A resposta curta

**A integração com o Mercado Pago já está aplicada nas duas telas.** Não é trabalho a fazer,
é trabalho feito que ainda não foi ligado.

| Tela | O que já existe em código |
|---|---|
| **Depósito** (`ModalDeposito`) | Botão "Pagar com Pix" e "Pagar com cartão" chamando `iniciarDeposito()`, que abre a cobrança no gateway |
| **Compra no mercado** (`/mercado`) | `iniciarCompraDireta()` — o comprador sem saldo paga o lote direto pelo gateway |
| **Confirmação** | Webhook em `/api/webhooks/mercadopago` com assinatura HMAC-SHA256, idempotência e conciliação que credita o saldo e grava no livro-razão |

**Mas há um defeito ativo nela**, que o Gabriel encontrou em 11/09: sem credencial, o
simulador manda o cliente para o site do Mercado Pago com um identificador inventado, e ele
cai numa página de erro que parece falha da Áurea. É o **bloco 8**, e é o primeiro a fazer.

O que falta é de três tipos, e **nenhum deles é escrever a integração**:

1. **Configuração** — as chaves do painel do Mercado Pago. Só você pode obtê-las.
2. **Uma inversão de tela** — hoje o botão principal é o depósito simulado, e o pagamento real
   é o bloco de baixo, com a etiqueta "ambiente de teste".
3. **Uma decisão registrada** — o **RA-01**, que trava o modo produção até haver parecer
   jurídico sobre guardar dinheiro de terceiro.

---

# 1. As decisões de 11/09/2026 que este plano executa

## D-3 (conclusão) · O mecanismo antigo de custódia sai ✅

Confirmado pelo Gabriel: **o `custodyCharges` legado sai**, e as faturas mensais da frente B
assumem sozinhas. Isso fecha o **CD-11**, que era o achado mais grave da auditoria do merge —
hoje o cliente lê "Custódia anual de 15 moeda(s) · R$ 25,00" quando o preço vigente é
R$ 2,00 por moeda por mês.

## D-2 · O prazo da retirada ✅ RESOLVIDA

**D+30 é o prazo operacional da Áurea**, e o trânsito dos Correios corre **por fora**, sem
prazo fixo prometido.

O texto passa a dizer, em toda tela e nos termos: *"até 30 dias para a Áurea preparar e
postar, mais o prazo de entrega dos Correios"*. **Não prometer número para o trânsito** é
deliberado — a Áurea não controla os Correios, e prometer prazo de terceiro é assumir
obrigação que não se pode cumprir.

## D-7 · O gatilho de cadastro 🆕

O cadastro **não é uma tela que o cliente procura**. Ele é uma janela que aparece na frente
da ação, toda vez, até estar completo.

**Quando dispara:** na primeira tentativa de **depositar**, **comprar** ou **enviar moeda para
custódia**.

**O que pede** (fechado na reunião jurídica de 09/09): CPF, nome completo, data de nascimento
e CEP. Nada além disso.

**Como se comporta:**

- É um **pop-up simples**, não uma página.
- **Volta toda vez** que o cliente tentar uma dessas ações enquanto não terminar. Isso é
  proposital: ele não deve ter de procurar onde se cadastra.
- O CEP **preenche o endereço sozinho**, pela mesma API dos Correios que o envio já usa.
- Em **Minha conta** aparece um aviso a mais, que **some quando o cadastro fecha**.

**O que NÃO trava:** criar conta e entrar continuam livres. O cadastro só é pedido no primeiro
movimento de dinheiro ou de moeda.

## D-8 · A retirada fica discreta 🆕

A opção de pedir a moeda de volta fica em **Meus recibos** e em **Minha conta**, **sem chamar
atenção**. É cara para o cliente e onerosa para a empresa; o desenho não deve estimulá-la.

---

# 2. O que já está pronto, e não deve ser refeito

Levantado arquivo por arquivo em 11/09/2026.

| Peça | Onde | Situação |
|---|---|---|
| Cobrança Pix e Checkout Pro | `src/lib/payments/mercadopago.ts` | ✅ Com simulador determinístico quando não há token |
| Intenção de depósito | `src/server/actions/payments.ts` → `iniciarDeposito` | ✅ Valida inteiro, positivo e teto, e **não encosta no saldo** |
| Compra direta pelo gateway | idem → `iniciarCompraDireta` | ✅ |
| Webhook | `src/app/api/webhooks/mercadopago/route.ts` | ✅ Assinatura HMAC em qualquer ambiente, idempotência, responde 200 antes de conciliar |
| Conciliação → saldo e ledger | `src/server/payments/conciliacao.ts` | ✅ |
| Modal de cadastro | `src/components/account/ModalCadastro.tsx` | ✅ Com os quatro campos e o CEP preenchendo o endereço |
| Gate de cadastro | `src/domain/cadastro.ts` → `temCadastroCompleto` | ✅ |
| Gatilho já ligado | Minha conta, mercado e modal de depósito | ✅ Três dos quatro pontos |

**A arquitetura mais importante já está certa e não se mexe nela:** o saldo só muda quando o
**webhook** confirma, nunca no retorno da tela. A tela de volta é uma URL que qualquer pessoa
consegue abrir — creditar ali seria dar saldo a quem digitasse o endereço.

---

# 3. O que falta — oito blocos

## Bloco 1 · As chaves do Mercado Pago 🔴 **é seu, e trava todo o resto**

Sem elas o sistema roda com o simulador e nada é cobrado de verdade.

No painel do Mercado Pago, em **Suas integrações → a aplicação → Credenciais**:

| Valor a pegar | Variável de ambiente |
|---|---|
| Access token de **teste** | `MP_ACCESS_TOKEN_TEST` |
| Access token de **produção** | `MP_ACCESS_TOKEN` |
| Segredo do webhook (**Webhooks → Configurar**) | `MP_WEBHOOK_SECRET` |

E em **Webhooks**, cadastrar a URL de notificação:

```
https://SEU-DOMINIO/api/webhooks/mercadopago
```

**Eu não entro nessa conta.** Os valores vêm de você já prontos e entram nas variáveis de
ambiente da Vercel e no `.env.local` — nunca no código. As credenciais de acesso ao painel
estão em `docs/privado/CREDENCIAIS_MERCADO_PAGO.md`, fora do repositório.

> ⚠️ **O caminho de menus do painel não está descrito aqui de memória.** Quando você for
> fazer, eu abro a documentação vigente do Mercado Pago e escrevo o passo a passo com os
> rótulos de hoje — interfaces de SaaS mudam, e já custou uma sessão inteira neste projeto.

## Bloco 2 · Inverter o principal e o secundário na tela de depósito 🟠

Hoje a modal tem o botão dourado **"Confirmar depósito"** chamando o depósito **simulado**, e
o pagamento real embaixo, num bloco cinza que começa com "Pagar de verdade (ambiente de teste
do Mercado Pago)".

Depois deste plano: **Pix e cartão viram o caminho principal**, e o depósito simulado sai da
tela do cliente.

- `src/components/account/AccountModals.tsx` — `ModalDeposito`
- O texto "Depósito **simulado** neste ambiente de teste" sai junto.
- A Server Action `deposit()` **permanece no servidor** para o seed e os testes; só deixa de
  ter botão.

**Esforço:** baixo. É reordenar JSX e apagar um parágrafo.

## Bloco 3 · O gatilho de cadastro nos quatro pontos 🟠

Três já existem. **Falta o envio de moeda:** `/envios` não consulta `temCadastroCompleto` nem
abre o `ModalCadastro`.

- `src/app/(app)/envios/page.tsx` — barrar o passo 1 do assistente e abrir a modal, com o
  mesmo `motivo` que os outros pontos usam.
- Conferir que a modal **reabre** a cada tentativa nos quatro pontos, e não só na primeira.

**Esforço:** baixo.

## Bloco 4 · O aviso em Minha conta 🟠

Um aviso no topo de `/conta`, visível enquanto o cadastro estiver incompleto, dizendo que sem
ele não dá para negociar nem enviar moeda — e com o botão que abre a modal. **Some sozinho
quando o cadastro fecha.**

Já existe um aviso parecido, mas só para **dados bancários do saque**. Este é o do cadastro, e
é outro.

- `src/app/(app)/conta/page.tsx`

**Esforço:** baixo.

## Bloco 5 · Validação de CPF 🟠

Hoje o CPF é só **formatado**; não há sequer conferência de dígito verificador.

**Duas camadas, e a recomendação é começar pela primeira:**

**5a — Dígito verificador, local, agora.** Função pura em `src/domain/cadastro.ts`, com teste.
Custo zero, resposta instantânea, sem rede. Pega erro de digitação, que é a esmagadora maioria
dos casos. **Deveria existir independentemente de qualquer API.**

**5b — Consulta oficial, quando houver contrato.** A via oficial é a **Serpro Consulta CPF**,
vendida pela loja do Serpro. Ela recebe **CPF + data de nascimento** — exatamente os dois
campos que o cadastro já coleta — e devolve os dados cadastrais, o que permite conferir se o
nome bate e se a situação do CPF é regular.

**Não existe API gratuita da Receita Federal para isso.** Toda alternativa "fácil" é
intermediário privado revendendo a mesma base, com o agravante de que o CPF do seu cliente
passa por um terceiro — o que, para uma empresa que está redigindo política de privacidade
agora, é uma decisão de LGPD, não de engenharia.

**Precisa de decisão sua:** contratar o Serpro, ou ficar no dígito verificador até haver
cliente real? O plano não escolhe por você.

## Bloco 6 · Tirar o mecanismo antigo de custódia 🔴

Fecha o **CD-11**. O `custodyCharges` sai e as faturas mensais assumem:

| Arquivo | O que muda |
|---|---|
| `src/domain/seed.ts:243-261` | Para de criar `custodyCharges`; passa a semear faturas mensais |
| `src/domain/statement.ts:162-185` | Lê fatura, e o texto passa a dizer **mensal** |
| `src/domain/ledger.ts:207` | Mesma descrição no livro-razão do contador |
| `src/app/(app)/envios/page.tsx:674` | Sai "Taxa de custódia anual (**nova faixa**)" |
| `src/domain/fees.ts:43` | `custodyFeeForCount` é apagado — a D-3 já mandava |
| `src/domain/types.ts` | `custodyCharges` sai de `AppState` → **sobe `STORE_KEY` para v8** e migration **013** |

⚠️ **Superfície protegida** (`fees.ts`, `types.ts`) — autorizado pela decisão de 11/09/2026
registrada na seção 1 deste documento.

**Esforço:** médio. É o bloco de maior risco, porque mexe no formato do estado.

## Bloco 7 · O texto do prazo da retirada 🟡

Aplicar a D-2 onde o prazo aparece: tela de retirada, modal de solicitação, acompanhamento,
termos de uso e o material da Academy. A constante isolada que a frente C deixou é o único
lugar onde o número muda.

E, junto, a **D-8**: colocar "Solicitar retirada" em **Minha conta** — hoje ela só existe no
certificado de um recibo aberto — mantendo o tratamento discreto nos dois lugares.

**Esforço:** baixo.

## Bloco 8 · O simulador não pode mandar o cliente para fora 🔴 **defeito confirmado em 11/09**

**Sintoma, visto pelo Gabriel.** Clicar em "Pagar com cartão" abre uma aba no Mercado Pago que
mostra apenas *"Ops, ocorreu um erro."*, na URL
`sandbox.mercadopago.com.br/checkout/v1/redirect/<uuid>/fatal/`.

**Causa, conferida no código.** Sem `MP_ACCESS_TOKEN_TEST` no ambiente,
`getMercadoPagoAccessToken()` devolve `null` e `criarPreferenciaDeposito` cai no ramo
simulador (`src/lib/payments/mercadopago.ts:61`). Esse ramo **fabrica uma URL apontando para o
domínio real do Mercado Pago**, com um identificador inventado:

```
https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=SIM-PREF-<timestamp>-<rand>
```

`payments.ts:121` escolhe essa URL, e `ModalDeposito` a abre em aba nova. O Mercado Pago
recebe um `pref_id` que não existe no cadastro dele, gera um UUID de sessão e redireciona para
a própria página de erro — o `/fatal/` do print.

**Por que é defeito e não só falta de configuração.** O simulador existe para o sistema
funcionar sem credencial. Mandar o usuário para um site de terceiro com um identificador falso
não é simular: é produzir um beco sem saída que parece falha da plataforma. E o mesmo vale
para o Pix simulado, que devolve um "copia e cola" com a cara de um payload Pix válido e um QR
que é um pixel branco de 1×1 — alguém pode tentar pagar aquilo.

**Correção.** O simulador passa a se declarar, e a tela passa a respeitá-lo:

1. `src/lib/payments/mercadopago.ts` — o resultado do ramo simulador ganha um campo explícito
   (`simulado: true`) e **para de fabricar URL de domínio externo**.
2. `src/server/actions/payments.ts` — propaga o campo para a tela.
3. `src/components/account/AccountModals.tsx` e `src/app/(app)/mercado/page.tsx` — quando
   `simulado` for verdadeiro, **não abrir aba nenhuma**: mostrar, na própria modal, "Gateway de
   pagamento não configurado neste ambiente" e manter o caminho simulado de saldo.

**Esforço:** baixo. **Faça este antes do bloco 2** — enquanto a tela puder abrir um beco sem
saída, inverter o botão principal só aumentaria o número de pessoas que caem nele.

**Teste de aceite.** Sem `MP_ACCESS_TOKEN_TEST`, clicar em "Pagar com cartão" **não abre aba
nenhuma** e a modal explica por quê. Com o token configurado, abre o checkout de verdade.

---

# 4. A ordem

```
1. Bloco 8 (o simulador para de mandar o cliente para fora)  ← primeiro, é defeito ativo
2. Você pega as chaves no painel do Mercado Pago             ← trava o 6 e o teste final
3. Bloco 5a (dígito verificador)   ─┐
4. Bloco 3 (gatilho em /envios)     ├─ independentes entre si
5. Bloco 4 (aviso em Minha conta)  ─┘
6. Bloco 6 (custódia antiga sai)    ← sozinho, sobe STORE_KEY e migration 013
7. Bloco 2 (inverter a tela)        ← depois das chaves E do bloco 8
8. Bloco 7 (textos do prazo)
9. Teste de ponta a ponta com pagamento de teste real
```

O **bloco 6 anda sozinho**, sem nada em paralelo: ele muda o formato do estado, e foi
exatamente esse tipo de sobreposição que produziu os dois defeitos do merge anterior.

**A próxima migration é a 013.** Antes de escolher número, conferir as branches vivas.

---

# 5. O que trava a produção, e não é código

**RA-01 — custódia de dinheiro de terceiro sem parecer jurídico.** Está aberto desde
02/09/2026 e é o que mantém `MP_SANDBOX` ligado. A decisão registrada é que a Áurea **recebe o
depósito e guarda o dinheiro na conta dela** — e é justamente isso que precisa de parecer
antes de valer para cliente real.

**Enquanto o RA-01 estiver aberto, os blocos deste plano podem ser feitos e testados com o
token de teste.** O que não se pode é virar a chave para produção. Essa é a última linha, e é
decisão dos sócios com o Felipe.

---

# 6. Como se sabe que funcionou

- [ ] `npm run db:check` continua verde depois da migration 013
- [ ] Um depósito de teste pelo Pix aparece no saldo **só depois** de o webhook confirmar,
      nunca no retorno da tela
- [ ] Reenviar o mesmo webhook duas vezes credita **uma vez só** (a idempotência já existe e
      tem teste; aqui é confirmar de ponta a ponta)
- [ ] Uma conta nova, sem cadastro, tentando depositar: a modal abre. Fechando sem preencher e
      tentando de novo: **a modal abre outra vez**
- [ ] A mesma conta em Minha conta vê o aviso, completa o cadastro, e **o aviso some**
- [ ] CPF com dígito verificador errado é recusado antes de qualquer chamada de rede
- [ ] O extrato mostra custódia **mensal**, com valor que bate com R$ 2,00 por moeda
- [ ] A palavra "faixa" não aparece em tela nenhuma
- [ ] O prazo da retirada aparece como "30 dias + entrega dos Correios" em toda tela e nos
      termos
- [ ] `grep` de terminologia proibida continua retornando zero
