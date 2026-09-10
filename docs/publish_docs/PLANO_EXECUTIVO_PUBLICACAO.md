# Plano Executivo — publicação oficial da Áurea Custódia para clientes

**De MVP com sete contas de sócios a plataforma aberta ao público**

```
Escrito em:      10/09/2026
Base:            main em 31558c4 + feat/auth-landing em b568d15
Estado do código: typecheck, lint, testes e build verdes; 238 arquivos em src/
Fontes:          reunião com o jurídico em 09/09/2026 (Felipe Moraes, Eduarda Teixeira
                 Martins, 38min) · lista de features restantes do Gabriel em 10/09/2026
Para quem:       Gabriel, Rogério, e os três agentes que vão executar
```

> **Como ler.** A seção 0 cabe numa tela e serve para o Rogério. A seção 1 é a regra que
> atravessa todo o resto e precisa ser lida antes de qualquer bloco. As seções 2 a 4 são o
> levantamento honesto do que existe e do que falta. A seção 5 é a única coisa que **trava**
> execução: seis decisões que só o Gabriel e os sócios podem tomar — **quatro já foram
> fechadas em 10/09/2026; duas continuam abertas** (D-2, o prazo de postagem, e D-6, o
> endereço real dos Correios). As seções 6 a 9 são o plano propriamente dito.
>
> O *como* executar está em [`PROTOCOLO_DO_AGENTE.md`](PROTOCOLO_DO_AGENTE.md). O *quem faz
> o quê e em que ordem* está em
> [`EXECUCAO_3_BRANCHES_PUBLICACAO.md`](EXECUCAO_3_BRANCHES_PUBLICACAO.md).

---

# 0. O resumo, em uma tela

A plataforma **já funciona**: cadastro, login, custódia, marketplace, recibo, ledger
contábil, DRE, relatórios, integração de pagamento em sandbox e integração dos Correios.
O que falta para abrir ao público não é "construir o sistema" — é **fechar o circuito do
dinheiro e o circuito jurídico**.

Faltam quatro coisas, nesta ordem de importância:

**1. A linguagem.** O jurídico proibiu as palavras que a plataforma usa hoje em quarenta e
tantos lugares — *NFT*, *token*, *ativo*, *cripto*. Não é preciosismo: cada uma dessas
palavras é um enquadramento regulatório que a empresa não quer e não precisa. O termo
aprovado é **recibo**.

**2. O dinheiro sair.** Hoje o cliente consegue pôr dinheiro (depósito) mas não consegue
tirar. Sem saque, a plataforma guarda dinheiro de terceiro sem devolução — é o pior risco
jurídico e comercial que existe. Felipe foi direto: *"a parte mais sensível do corpo é o
bolso"*.

**3. A moeda sair.** Mesmo problema, com o item físico. O botão "Solicitar retirada" existe
na tela e está desligado desde o começo.

**4. A cobrança entrar.** A custódia é cobrada hoje uma vez por ano, por faixa. O modelo
novo é **R$ 2,00 por moeda por mês**, com plano anual em 12x. E a comissão de negociação já
está certa: R$ 1,00 + 0,5% por moeda.

Depois disso: termos de uso escritos com o Felipe, aceite registrado, nomes de comprador e
vendedor fora da vitrine, endereço real dos Correios, e o domínio oficial apontado.

**O que NÃO entra agora:** o Painel de Admin dos sócios. Ele vem depois. Mas tudo que for
construído nesta rodada já nasce com tabela, lançamento contábil e rota de API — para que o
painel, quando existir, só precise **ler**, nunca recalcular.

---

# 1. A regra que atravessa tudo: a linguagem

Esta seção vem do alinhamento com o jurídico em 09/09/2026 e vale para **todo texto do
produto**: interface, landing, termos, política, material educativo, mensagem de erro, nome
de rota, nome de arquivo e mensagem de commit.

## 1.1 Palavras proibidas

| Palavra | Por que sai |
|---|---|
| **token**, **NFT**, **cripto**, **criptoativo** | Puxam a operação para a regulação de ativos virtuais (Res. BCB 519–521/2026, IN RFB 1888/2019). O produto é comprovante de guarda física, não ativo virtual |
| **ativo**, **ativo digital** | Mesmo enquadramento. Felipe corrigiu no meio da própria frase: *"eu colocaria guardar o seu ativo — o seu ativo não, guardar o seu **item**"* |
| **investimento**, **investidor**, **rentabilidade**, **retorno**, **valorização garantida** | Puxam para a CVM e o mercado de capitais |
| **corretora**, **assessor**, **carteira de investimentos** | Idem |
| **blockchain**, **on-chain**, **carteira digital** no sentido cripto | A arquitetura é centralizada por decisão registrada, e dizer o contrário cria uma promessa que o sistema não cumpre |

## 1.2 Palavras aprovadas

| Use | Onde |
|---|---|
| **recibo** — recibo de custódia, recibo de unicidade | Substitui NFT em toda a plataforma. Foi o termo que os dois advogados aprovaram |
| **item**, **moeda** | Substitui "ativo" |
| **marketplace** | Aprovado explicitamente: *"marketplace até nos agrada"* |
| **guarda**, **custódia** | O serviço |
| **potencial de valorização** | A palavra "potencial" é deliberada — não promete nada. *"potencial não quer dizer que é"* |
| **valor estimado**, **aproximado** | Todo número exibido. A plataforma **nunca** recomenda preço |

## 1.3 O posicionamento negativo, por escrito

Precisa aparecer, com estas palavras, na landing, nos termos e no material educativo:

> A Áurea **não é corretora** e não está sujeita à regulação da CVM ou do mercado de
> capitais. A Áurea **não é instituição financeira**. A Áurea **não é plataforma de ativos
> digitais**. A Áurea é um serviço de guarda de itens de coleção com um marketplace onde
> quem guarda pode negociar o recibo do item sem precisar resgatá-lo fisicamente.

## 1.4 A história de origem, que substitui o discurso de risco

Felipe sugeriu, e Gabriel aceitou, o enquadramento: a Áurea nasceu porque um dos
fundadores coleciona moedas e sentia falta de um lugar seguro para guardar e negociar.
Essa é a narrativa institucional.

**O que fica fora do site, das apresentações e do tráfego pago:** todo discurso de
"tire seu dinheiro das mãos do Estado", medo político, outubro, eleição, sonegação,
descentralização. Felipe: *"o que eu faria pelo menos é não colocar nada disso no site, no
material institucional, nas apresentações públicas"*. Conversa comercial individual é outra
esfera e não é problema de código.

## 1.5 O tamanho real do trabalho

Levantamento feito em 10/09/2026 sobre `src/`:

```
"NFT" em texto:            51 ocorrências, em 25 arquivos
"nft" como identificador:  87 ocorrências (tipo Nft, campo Coin.nft, pasta components/nft,
                           arquivo lib/pdf/nft-receipt.ts, styles/nft.css)
"Ativo"/"ativo" em rótulo: 12 telas
```

São dois trabalhos diferentes, e o plano os separa:

- **Camada 1 — texto visível ao cliente.** Obrigatória antes de publicar. Baixo risco.
- **Camada 2 — identificadores internos** (`Nft` → `Recibo`, `Coin.nft` → `Coin.recibo`).
  Mecânica, mas muda o formato do estado persistido e **obriga a subir `STORE_KEY` para
  `aurea-market-v7`**. Como o banco de produção ainda vai ser semeado do zero no cutover,
  fazer agora é o momento mais barato que vai existir. Depois do primeiro cliente real,
  isso vira migração de dado. → **Decidido em 10/09/2026: fazer agora (D-4).**

---

# 2. O que já existe — inventário honesto

Antes de planejar, o que **não** precisa ser construído:

| Já pronto | Onde | Observação |
|---|---|---|
| Cadastro, login por e-mail e por Google | `src/server/actions/auth.ts`, `src/server/auth/` | Sem travas, por decisão. Aceite legal é registrado, não exigido |
| Custódia: protocolo, envio, análise, recibo | `src/server/actions/custody.ts` | Fluxo de **entrada** completo |
| Marketplace com livro por tipo de moeda | `src/domain/market.ts` | Prioridade preço-tempo, uma unidade por volta |
| Comissão R$ 1,00 + 0,5% | `src/domain/fees.ts` → `tradeFee()` | **Já é o valor combinado. Não muda** |
| Ledger append-only com hash encadeado | `src/domain/ledger.ts`, `hash.ts` | SHA-256, migration 003 |
| Trilha de auditoria | `src/server/db/derivar.ts` | Grava na mesma transação da mutação |
| DRE sem alíquota em código | `src/domain/dre.ts` | Percentuais vêm de `aurea.parametros_contabeis` |
| Relatórios e API | `/relatorios`, `/api/relatorios/*` | Contrato em `docs/API_RELATORIOS.md` |
| Pagamento: Checkout Pro, Pix, webhook, conciliação, idempotência | `src/lib/payments/`, `src/server/payments/` | **Só entrada de dinheiro. Sandbox** |
| Correios: pré-postagem, etiqueta, rastreio, cron diário | `src/lib/shipping/` | **Só entrada. Endereço da central é fictício** |
| Bancada de análise física | `estacao/`, `/api/estacao/*` | Entregue em 10/09/2026 |
| 19 tabelas no Postgres | `src/server/db/repositories/` | Migrations 001–003 |

**Nada disso será refeito.** O trabalho é somar às pontas que faltam.

---

# 3. A tabela de preços e prazos

Consolidada da lista do Gabriel de 10/09/2026, da reunião com o jurídico e das decisões
tomadas em **10/09/2026** (seção 5). **Os valores marcados 🟡 ainda não existem em código.**

## 3.1 Preços

| Serviço | Valor | Situação |
|---|---|---|
| Comissão por moeda negociada (compra e venda) | **R$ 1,00 + 0,5%** | ✅ Já em código, sem mudança |
| Custódia | **R$ 2,00 / moeda / mês** — ou R$ 24,00/ano em até 12x | 🟡 Substitui as faixas anuais (D-3 ✅) |
| Saque de dinheiro | **R$ 5,00 fixo por saque** | 🟡 Não existe |
| Retirada da moeda — **comum** (estoque comum) | **R$ 50,00** | 🟡 Não existe |
| Retirada da moeda — **segura** (transporte de valores) | **R$ 180,00 em 2x** | 🟡 Não existe |
| Depósito em conta | Sem taxa | ✅ Teto de R$ 100.000 por operação |

**São duas modalidades excludentes, e cada uma já inclui tudo** — taxa administrativa e
transporte. Não existe soma. O valor de R$ 60,00 que circulou na lista original **saiu da
tabela** (decisão D-1, 10/09/2026): era versão anterior do preço.

## 3.2 Prazos, e por que eles são generosos de propósito

| Operação | Prazo | Razão registrada na reunião |
|---|---|---|
| Saque de dinheiro | **D+3 (72h)** | *"Provavelmente vai tudo resolvido em 24 horas. Mas, caso aconteça alguma coisa, eu preciso de 3 dias"* — instabilidade do banco não é culpa da Áurea, e o termo precisa dizer isso sem parecer que a empresa lava as mãos |
| Retirada da moeda | **D+30** | Mexer em cofre, sala-forte ou carro-forte é operação onerosa e lenta. O prazo longo também desestimula o pedido, que é caro para a empresa |
| Postagem após confirmação do endereço | **D+5** | 🔴 Lido da transcrição como prazo separado, mas a frase está truncada — **D-2 continua aberta** |

## 3.3 As três travas legítimas

São as **únicas** travas autorizadas nesta entrega. Todas seguem o padrão do PayPal: o botão
não fica escondido, ele fica **desabilitado com o motivo escrito ao lado**.

1. **Saque de dinheiro** exige dados bancários/Pix cadastrados e confirmados. Sem eles, o
   botão não avança e **o prazo D+3 nem começa a contar**.
2. **Retirada da moeda** exige endereço completo e confirmado. Mesma lógica.
3. **Operar** (depositar, comprar, vender) exige aceite dos termos na versão vigente.

Gabriel: *"É igual o PayPal faz. Se você não aprovou, ele nem começa o processo de mandar
seu dinheiro."*

Nada além disso. Cadastro e login continuam livres — **quem entra no site não preenche
nada**. O cadastro completo só é pedido no primeiro movimento de dinheiro.

---

# 4. Os treze blocos de trabalho

Cada bloco diz **o que é**, **por que**, **onde no código**, **o que quebra se pular** e
**quem é o dono**. A letra do dono é a frente do plano de execução.

---

## Bloco 1 — Linguagem e reposicionamento · Dono: **A** · Bloqueante

**O que é.** Substituir a terminologia proibida em toda a plataforma e inserir o
posicionamento negativo da seção 1.3.

**Onde.** Camada 1: `src/components/**`, `src/app/**` (texto), `src/components/shell/Topbar.tsx`
e `Sidebar.tsx` (rótulos de menu), `src/components/home/HomeBlocks.tsx`,
`src/components/nft/Certificate.tsx` e `NftCard.tsx`, `src/app/(app)/recibos/`.
Camada 2 (aprovada em D-4): `src/domain/types.ts` (`Nft` → `Recibo`, `Coin.nft` → `Coin.recibo`),
`src/components/nft/` → `src/components/recibo/`, `src/lib/pdf/nft-receipt.ts` →
`recibo-pdf.ts`, `src/styles/nft.css` → `recibo.css`, `STORE_KEY` → `aurea-market-v7`,
migration nova para renomear a coluna.

**O que quebra se pular.** É o único bloco que pode gerar responsabilidade regulatória por
si só. Um print da tela com a palavra "NFT" é prova documental de que a plataforma se
apresentava como emissora de ativo digital.

**Teste.** `grep -rn "NFT\|token\|cripto\|ativo digital\|investimento" src/ --include="*.tsx"`
retorna zero em texto visível. Percorrer as 12 telas autenticadas com o `dev` no ar.

---

## Bloco 2 — Termos de uso e política de privacidade · Dono: **A** · Bloqueante

**O que é.** Reescrever `src/app/termos/page.tsx` (hoje `RASCUNHO-0.1`) e
`src/app/privacidade/page.tsx` com o texto que o Felipe entrega. Prazo dele: **sexta,
12/09/2026**. O trabalho é *a quatro mãos* — ele redige a proteção jurídica, a Áurea informa
o que pode dar errado na operação.

**As cláusulas que a operação exige** (levantadas na reunião, para mandar ao Felipe):

1. **A moeda devolvida não é a mesma moeda depositada** — é moeda equiparável, mesma
   espécie e estado. Esta é a cláusula que o próprio Felipe apontou como o risco número um:
   *"o cara pediu para devolver a moeda e viu que a moeda que ele depositou é ligeiramente
   diferente da que ele recebeu"*.
2. **O recibo é extinto no instante do pedido de devolução**, antes de a moeda sair. Se não
   fosse assim, o cliente teria recibo negociável e moeda a caminho ao mesmo tempo.
3. **A Áurea pode bloquear recibos de cliente em débito.**
4. **A Áurea pode usar as moedas em custódia como garantia** se o débito ultrapassar o valor
   da moeda.
5. **Custo da retirada é do cliente**, e ele pode optar por assumir a responsabilidade do
   transporte para pagar menos.
6. **Prazos D+3 e D+30**, com a ressalva de que o prazo é do sistema da Áurea e depende da
   operação bancária do cliente — redigida sem parecer isenção de responsabilidade.
7. **Relação de consumo.** Felipe avisou: *"isso aqui vai ser analisado como consumidor. É um
   sistema todo protetivo"*. Toda cláusula limitativa precisa ser destacada e aceita.

**O aceite.** Felipe sugeriu **caixas de confirmação por bloco** — o cliente marca um
*check* a cada trecho importante, em vez de um aceite único no fim. Gabriel concordou com a
ressalva de não serem muitos: *"eu só me preocupo em não ser muitos, muitos, muitos ticks"*.
**Meta: entre 4 e 6 caixas.** O registro (versão + data/hora) já existe em
`src/server/auth/legal.ts` e só precisa passar a guardar quais blocos foram marcados.

---

## Bloco 3 — Academy, a página educativa · Dono: **A**

**O que é.** Uma rota nova `/academy`, pública, onde o vocabulário técnico **pode** ser
usado para ensinar — e é justamente por isso que ele sai do resto do site. Gabriel:
*"aqui eu vou começar a ensinar o cara sobre criptoativos... mas a gente vai estar
protegido"*.

O primeiro artigo é o posicionamento negativo da seção 1.3, escrito para leigo.

**Onde.** `src/app/academy/page.tsx`, reusando `src/components/legal/LegalDocument.tsx`.

---

## Bloco 4 — Privacidade das transações · Dono: **A**

**O que é.** Tirar nome de comprador e vendedor da vitrine, do livro de ordens e da tela de
auditoria. Hoje aparecem em `src/components/market/LotCard.tsx:90` (`Vendedor: {sellerName}`),
`BidRow.tsx:61` (`Comprador: {buyerName}`) e `src/app/(app)/mercado/page.tsx:357-393`.

**Por que.** Foi útil na fase de teste, para os sócios entenderem o que acontecia. Com
público, é exposição de dado pessoal sem base legal e vantagem competitiva para quem lê o
livro. **D-5 decidiu: anonimato total** — `Vendedor #A93F`, derivado do id da oferta, com
"você" preservado quando a oferta for do próprio usuário.

---

## Bloco 5 — Domínio oficial · Dono: **A** · Último passo de todos

**O que é.** Apontar `aureacustodia.com.br` (registrado na HostGator) para o projeto na
Vercel.

**⚠️ O perigo, escrito por extenso.** Em 06/09/2026 uma alteração de DNS feita "de passagem"
derrubou o e-mail corporativo do Gabriel — que está no **Google Workspace**, não no Titan,
ao contrário do que a documentação antiga do projeto dizia. Junto com o e-mail foi o segundo
fator de acesso ao GitHub.

**A regra:** mexer **apenas** no registro `A` do apex e no `CNAME` do `www`. **Não tocar em
`MX`, `TXT`/SPF, DKIM ou DMARC.** Antes de mudar qualquer coisa, exportar a zona atual e
salvar em `docs/tutoriais/`. Depois de mudar, confirmar de fato — consultar o nameserver e
enviar um e-mail de teste para o `@aureacustodia.com.br`.

Base existente: `docs/GUIA_VERCEL_HOSTGATOR_EMAIL_E_DOMINIOS.md`, a ser **conferido contra o
painel de hoje** antes de ser seguido.

---

## Bloco 6 — Cadastro progressivo com documentos formais · Dono: **B**

**O que é.** O modelo `User` hoje tem `name`, `balance`, `coins` e `settings`. Não tem CPF,
endereço nem dados bancários. Precisa ter — mas **não no momento do cadastro**.

**Quando se pede.** No primeiro movimento de dinheiro: depósito, compra direta ou saque.
Gabriel: *"a partir do momento que ele for fazer algum depósito em dinheiro... vai pedir
para ele completar o cadastro"*.

**Quais dados.** O mínimo que o jurídico validou:

| Campo | Uso |
|---|---|
| CPF | Identificação fiscal, emissão de nota, extrato para declaração |
| Nome completo | Confirmação — o do cadastro pode estar incompleto |
| Data de nascimento | Capacidade civil |
| CEP + endereço completo | Retirada da moeda e etiqueta dos Correios (já há `consultarCepEnvio`) |
| Telefone | Contato operacional |
| Chave Pix e/ou dados bancários | Saque. Precisa ser **do titular** |

**Documento com foto: NÃO.** Felipe foi consultado diretamente e respondeu *"em princípio,
não vejo juridicamente ainda"*. Gabriel reforçou a diretriz: *"quanto menos dados eu tiver
desse cara, melhor"*. Não implementar upload de documento, nem selfie, nem prova de vida.

**Onde.** `src/domain/types.ts` (interface `Cadastro` nova, opcional em `User`),
migration nova em `aurea.usuarios`, `src/server/actions/account.ts`, modal novo em
`src/components/account/`.

**LGPD.** CPF e endereço são dado pessoal. Entram na política de privacidade com finalidade,
base legal (execução de contrato) e prazo de retenção. Não podem aparecer em log, em URL
nem em etiqueta armazenada em bucket público.

---

## Bloco 7 — Gateway: depósito, compra direta e saque · Dono: **B**

**O que já existe.** Depósito por Checkout Pro e Pix, webhook assinado, conciliação,
idempotência no Postgres. Tudo em sandbox (RA-01).

**O que falta:**

**7a — Compra direta.** Hoje comprar exige saldo em conta. Gabriel quer o mesmo botão de
pagamento dentro do fluxo de compra: *"ou ele pode usar o que está na conta dele ou pode
comprar por fora"*. Comercialmente é o melhor caminho — dinheiro que não fica parado na mão
da Áurea é responsabilidade que a Áurea não assume.

**7b — Saque (a saída de dinheiro).** Não existe. É o bloco mais importante da publicação
inteira. Precisa de:

- Ação de servidor `solicitarSaque(valorCents)`, com taxa fixa de R$ 5,00 debitada.
- Trava por dados bancários (seção 3.3).
- Estado da solicitação: `solicitado → em_processamento → pago` / `falhou`.
- Prazo D+3 exibido na tela no momento do pedido, com a data calculada.
- Lançamento no ledger e linha na trilha de auditoria, na mesma transação.

**Sobre a automação do Pix de saída:** Gabriel quer *split* automático para o dinheiro sair
sozinho. **A disponibilidade dessa API para a conta da Áurea precisa ser verificada na
documentação vigente do gateway antes de qualquer linha de código** — não deduzir de
memória. Se não estiver disponível de imediato, o saque nasce assim mesmo, com **fila de
liquidação manual**: o pedido entra, o prazo corre, um sócio paga o Pix pelo aplicativo do
banco e marca como pago. O cliente não vê diferença, e nada fica bloqueado esperando
integração. Isso vira um risco assumido registrado, não uma trava.

**7c — Sair do sandbox.** Depende de decisão dos sócios (RA-01) e é a última coisa a ser
ligada, depois dos termos assinados.

---

## Bloco 8 — Faturamento de custódia mensal · Dono: **B**

**O que é.** Trocar a cobrança anual por faixa (`custodyFeeForCount`, R$ 5/15/25/30/60) por
**R$ 2,00 por moeda por mês**, com plano anual de R$ 24,00 por moeda em até 12x.

**Atenção — superfície protegida.** `src/domain/fees.ts` é arquivo protegido, e a mudança
altera o produto. **Autorizado em D-3, 10/09/2026: substitui as faixas anuais, sem
transição.**

**O que precisa nascer junto:**

- Ciclo de faturamento (cron mensal, no molde do `/api/cron/shipping` que já existe).
- Fatura por cliente e por mês, com detalhamento por moeda.
- Estado de inadimplência, que é o gatilho das cláusulas 3 e 4 dos termos.
- Cobrança automática do saldo em conta quando houver; cobrança pelo gateway quando não.
- Lançamento no ledger por competência — é receita recorrente e a DRE precisa vê-la separada
  da comissão de negociação.

**O que quebra se pular.** É a receita recorrente da empresa. Sem ela, o modelo de negócio
depende só de transação, e a moeda parada em cofre custa sem render.

---

## Bloco 9 — Financeiro e DRE consolidados · Dono: **B**

**O que é.** A DRE já lê receita do ledger e não tem alíquota em código. O que falta é ela
enxergar as **três novas fontes**: custódia mensal, taxa de saque e taxa de retirada.

Cada uma vira uma categoria própria de lançamento. Nenhuma alíquota entra em código
enquanto o contador não definir o regime (Lucro Presumido × Simples com Fator R continua em
aberto).

---

## Bloco 10 — Retirada da moeda · Dono: **C**

**O que é.** O fluxo completo de saída do item físico. O botão já existe, desabilitado, em
`src/components/nft/Certificate.tsx:201`. O estado `'Extinto'` já existe em
`src/domain/types.ts:52`, reservado para exatamente isto.

**O fluxo, na ordem exata:**

1. Cliente pede a retirada de um recibo específico.
2. Plataforma exige endereço completo confirmado (trava 2). **Sem isso, o prazo não começa.**
3. Cliente escolhe a modalidade — **comum a R$ 50,00** ou **segura a R$ 180,00 em 2x**
   (D-1). São excludentes e cada uma já inclui tudo.
4. Cliente paga a taxa (saldo em conta ou gateway).
5. **O recibo é extinto imediatamente**, no mesmo instante da confirmação. A moeda sai do
   acervo negociável no mesmo movimento — não pode existir recibo negociável de moeda a
   caminho.
6. Prazo D+30 exibido com a data calculada.
7. Separação física, pré-postagem nos Correios, etiqueta, rastreio.
8. Entrega confirmada, protocolo encerrado.

**A cláusula que precisa aparecer na tela**, não só nos termos: a moeda devolvida **não é
necessariamente a mesma** que foi depositada — é moeda equiparável. O cliente confirma isso
na hora do pedido, não no aceite genérico do cadastro.

**Onde.** Ação nova em `src/server/actions/custody.ts`, tela nova em `src/app/(app)/`,
`Certificate.tsx` (ligar o botão), tipos e migration.

---

## Bloco 11 — Correios e envio oficial · Dono: **C**

**11a — Endereço real.** `src/lib/shipping/correios.ts:29` usa *Avenida Paulista, 1500 —
Andar 14 — Cofre de Custódia*, que é fictício. Precisa do endereço real de recebimento, ou
da caixa postal oficial. **Sem isso, toda etiqueta gerada leva a moeda do cliente para o
lugar errado.** → item de pendência manual, dono Gabriel.

**11b — Retirar o aviso de "lacre original".** `src/app/(app)/envios/page.tsx:401` diz hoje
*"Envie a moeda em seu lacre original, ou em recipiente/plástico/caixa segura"*. Sai o lacre
original; fica apenas **"envie em envelope lacrado"**. Exigir lacre original cria
expectativa que a operação não consegue honrar na devolução — e é a mesma raiz do risco da
cláusula 1 dos termos.

Há um segundo texto na mesma linha em `src/components/shell/Topbar.tsx:95`
(*"Moedas físicas recebidas, lacradas e vinculadas"*), que precisa da mesma revisão.

**11c — Envio de saída.** O módulo hoje só cobre a entrada (cliente → Áurea). A retirada
precisa do caminho inverso, com declaração de valor e AR, como já é regra do módulo.

---

## Bloco 12 — Cibersegurança · Dono: **Gabriel + Guilherme**, não é código ainda

A análise acontece em 11/09/2026. O que os agentes fazem é **preparar a pauta**, não
implementar defesa especulativa. A pauta mínima, dada a virada para público:

- Senhas em texto puro (RA-02) — some com a migração para Supabase Auth, que precisa de data.
- Repositório público — decisão consciente durante o MVP; precisa de data de fechamento.
- Rate limit em login, cadastro, saque e retirada.
- Autorização por recurso: um cliente não pode ler recibo, extrato nem envio de outro.
- Segredo de webhook e rotação de chaves antes do dinheiro real.
- Retenção e descarte de dado pessoal (LGPD) com o cadastro novo do bloco 6.

Sai desta pauta uma lista de itens com dono e prazo — e só o que for aprovado vira código.

---

## Bloco 13 — O contrato com o Painel de Admin futuro · Transversal, todos

O painel dos sócios não entra agora. Mas **toda feature desta rodada nasce pronta para ele**.
Nenhuma exceção, e isso não muda nada no front-end do cliente.

**As quatro obrigações de toda feature nova que mexe em dinheiro ou em item:**

1. **Tabela própria no Postgres**, com migration versionada. Nada de campo novo enfiado no
   JSON do estado.
2. **Lançamento no ledger**, na mesma transação da mutação — append-only, hash encadeado.
   Saldo que muda sem lançamento é saldo que some.
3. **Linha na trilha de auditoria**, com autor real. *(Dívida conhecida: as rotas da estação
   gravam autor `'sistema'` porque não têm cookie de sessão. Não repetir esse padrão.)*
4. **Rota de leitura em `/api/relatorios/<recurso>`**, seguindo o contrato de
   `docs/API_RELATORIOS.md`, protegida pelo JWT que já existe em
   `src/server/relatorios/jwt.ts`.

Quem cumpre as quatro entrega um painel que só precisa **ler**. Quem não cumpre obriga o
painel a recalcular — e duas contas do mesmo número sempre divergem.

---

# 5. As seis decisões — quatro fechadas, duas abertas

Estas não são detalhes de implementação. São decisões de produto e de preço, e três delas
tocam a superfície protegida. **Nenhum agente deve deduzir as que ainda estão abertas.**

## D-1 · Preço da retirada — ✅ DECIDIDO em 10/09/2026

**Duas modalidades excludentes, cada uma já com tudo incluído:**

| Modalidade | Valor | Quando |
|---|---|---|
| **Comum** | **R$ 50,00** | Estoque comum da Áurea, envio pelos Correios |
| **Segura** | **R$ 180,00 em 2x** | Transporte de valores |

Não há soma, não há taxa administrativa separada. **O valor de R$ 60,00 saiu da tabela** —
era versão anterior do preço. Onde ele aparecer em documento antigo, está desatualizado.

## D-2 · O prazo de postagem é D+30 total ou D+30 mais D+5? 🔴 **ABERTO**

A transcrição diz *"mas da entrega da moeda é mais 5"* logo após falar do endereço, e a
frase está truncada. Duas leituras: (A) D+30 é o prazo total até a moeda chegar na casa do
cliente; (B) D+30 para a Áurea preparar e postar, mais D+5 de trânsito dos Correios.

A diferença aparece nos termos de uso e no contador que a tela mostra. **Enquanto não houver
resposta, o Agente C deixa o prazo numa constante nomeada e isolada**, para trocar num lugar
só. Não trava nada.

## D-3 · Custódia mensal — ✅ DECIDIDO em 10/09/2026

**R$ 2,00 por moeda por mês substitui as faixas anuais, sem transição.**
`custodyFeeForCount()` sai do código. O plano anual é **R$ 24,00 por moeda em até 12x** — o
mesmo dinheiro parcelado, sem desconto.

Como só existem sete contas de sócios, não há cliente para migrar: as contas do seed passam
direto para o modelo novo.

## D-4 · Renomear os identificadores internos — ✅ DECIDIDO em 10/09/2026

**Sim, agora.** `Nft` → `Recibo`, `Coin.nft` → `Coin.recibo`, `components/nft/` →
`components/recibo/`, `nft-receipt.ts` → `recibo-pdf.ts`, `nft.css` → `recibo.css`.

**Consequência obrigatória:** `STORE_KEY` sobe para `'aurea-market-v7'` e o banco recomeça do
seed. Isso é aceitável — e barato — exatamente agora, porque o banco de produção ainda vai
ser semeado do zero no cutover. Depois do primeiro cliente real, a mesma mudança viraria
migração de dado com risco.

## D-5 · Nome da contraparte — ✅ DECIDIDO em 10/09/2026

**Anonimato total.** Um código derivado do id da oferta, no formato `Vendedor #A93F` /
`Comprador #A93F`. Não é dado pessoal, não exige política de retenção, e mantém a
rastreabilidade interna intacta.

**Quando a oferta for do próprio usuário, continua aparecendo "você"** — isso é informação
dele sobre ele, e some-la só confundiria.

## D-6 · Endereço real de recebimento dos Correios 🔴 **ABERTO**

Preciso do valor literal e completo, com todos os campos: logradouro, número, complemento,
bairro, cidade, UF, CEP, telefone e nome do responsável.

Sem isso o bloco 11 não fecha, e **toda etiqueta gerada leva a moeda do cliente para uma
Avenida Paulista que não é da empresa** — o endereço em
`src/lib/shipping/correios.ts:29` é fictício desde que o módulo nasceu.

**Regra dura para o Agente C: nunca gerar etiqueta de verdade com o endereço fictício. Nem
para teste.**

---

# 6. Riscos novos a registrar

O último em uso é **RA-23**. As faixas estão reservadas por agente no
[`PROTOCOLO_DO_AGENTE.md`](PROTOCOLO_DO_AGENTE.md), regra 9. Os que já se sabe que vão
existir:

| Nº provável | Risco | Dono |
|---|---|---|
| RA-24 | Termos de uso publicados antes do parecer final do Felipe, se a publicação vier antes de sexta | A |
| RA-30 | Saque liquidado manualmente enquanto a automação do Pix não estiver disponível | B |
| RA-31 | Cadastro sem verificação de titularidade da chave Pix — dinheiro pode sair para conta de terceiro | B |
| RA-40 | Retirada sem conferência física de segunda pessoa (papel único, mesma raiz do RA-21) | C |
| RA-41 | Moeda equiparável escolhida por critério operacional, sem laudo de estado de conservação | C |

---

# 7. Cronograma e ordem de merge

## 7.1 A fase que não pode ser paralela

A renomeação de terminologia toca 25 arquivos espalhados por toda a interface. Se três
agentes trabalharem em cima dela ao mesmo tempo, cada merge vira um conflito de centenas de
linhas.

**Fase 0 é sequencial, dura meio dia, e é feita só pelo Agente A, direto na `main`.** Só
depois dela é que as três branches nascem. Enquanto A executa a Fase 0, B e C leem o
repositório, escrevem seus planos de sessão e **não editam código**.

## 7.2 O calendário

| Dia | A — Jurídico e publicação | B — Cadastro e financeiro | C — Retirada e logística |
|---|---|---|---|
| **1 (manhã)** | **Fase 0 na `main`**: renomeação + endereço + lacre + nomes fora da vitrine | leitura e plano | leitura e plano |
| **1 (tarde)** | *merge da Fase 0 → todos criam suas branches a partir dela* | | |
| **2** | Termos + política + aceite por blocos | Cadastro progressivo (modelo + migration) | Modelo e máquina de estados da retirada |
| **3** | Academy + posicionamento na landing | Cadastro (tela e travas) | Fluxo de retirada (servidor) |
| **4** | Tutorial do domínio (conferido contra o painel de hoje) | Saque: servidor, taxa, prazo, ledger | Fluxo de retirada (tela) e extinção do recibo |
| **5** | Varredura de terminologia + acessibilidade + 44px no celular | Saque: tela, travas e conciliação | Correios de saída, etiqueta e rastreio |
| **6** | Revisão do texto do Felipe (chega dia 12) | Custódia mensal + cron de faturamento | Testes de ponta a ponta da retirada |
| **7** | — | DRE com as três receitas novas | Varredura de bugs |
| **8** | *merge B → main*, depois *merge C → main* | | |
| **9** | *merge A → main* + varredura final de terminologia sobre o texto que B e C escreveram | | |
| **10** | **Domínio oficial + publicação** | | |

**A ordem de merge é B → C → A, e não é arbitrária.** B e C escrevem texto novo de
interface. A entra por último justamente para varrer a terminologia desse texto novo antes
de o site ir ao ar. A também é quem aperta o botão do domínio, que é o último passo de tudo.

## 7.3 Definição de pronto — a plataforma pode ir ao ar quando

- [ ] `grep` de terminologia proibida retorna zero em texto visível ao cliente
- [ ] Termos e política publicados na versão do Felipe, com aceite por blocos registrado
- [ ] Cliente novo consegue: criar conta → completar cadastro → depositar → comprar → vender
      → **sacar** → **pedir a moeda de volta**, sem ajuda
- [ ] Nenhum nome de contraparte visível em qualquer tela
- [ ] Endereço real dos Correios em `correios.ts`, conferido por um envio de teste
- [ ] Custódia mensal cobrando, com fatura visível no extrato
- [ ] `npm run typecheck`, `lint`, `test` e `build` verdes na `main`
- [ ] As três pendências manuais de cada agente lidas e resolvidas ou aceitas por escrito
- [ ] Pauta do Guilherme percorrida, com cada item aceito ou tratado
- [ ] Domínio apontado **e o e-mail corporativo testado depois** — enviar e receber

---

# 8. O que este plano deliberadamente não faz

- **Não constrói o Painel de Admin.** Só o prepara (bloco 13).
- **Não escreve lógica de imposto.** O regime tributário continua indefinido.
- **Não implementa upload de documento com foto.** O jurídico dispensou.
- **Não mexe em DNS de e-mail, autenticação ou qualquer coisa que já funciona.**
- **Não acrescenta trava nenhuma** além das três da seção 3.3.
- **Não refatora o que está pronto.** Marketplace, ledger, DRE, análise da bancada e
  relatórios ficam como estão.
