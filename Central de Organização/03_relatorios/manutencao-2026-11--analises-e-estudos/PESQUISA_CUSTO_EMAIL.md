# Custo de e-mail — Real Olímpico (frente C, tópico T1)

**Consulta feita em 17/11/2026 (Brasília).** Cotação usada: **US$ 1 = R$ 5,7851** (PTAX de venda do Banco Central, 17/11/2026 13:07 —
<https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='11-17-2026'&$format=json>).
Conferência cruzada: `open.er-api.com` deu R$ 5,7817 em 18/11/2026 00:02 UTC.

---

## CONCLUSÃO (sem rodeio)

1. **O custo hoje é R$ 0,00.** O volume que o sistema gera é pequeno: **cerca de 130 e-mails por mês** (conta abaixo), com pico observado de **no máximo 37 em um dia**. O plano gratuito do Resend permite 3.000 por mês e 100 por dia.
2. **Recomendação em uma frase:** ficar no **Resend** (o código já fala com ele), no plano gratuito, e subir para o **Pro (US$ 20 ≈ R$ 115,70 por mês)** só quando o pico diário passar de 100 e-mails ou o mês passar de 3.000; trocar para o Amazon SES só vale a pena em volume bem maior (a 13 mil e-mails por mês a diferença para o Pro é de uns R$ 104 a R$ 108 por mês), e dá mais trabalho (sair da "sandbox" leva até 96 h e exige conta AWS).
2-A. **Titan Email da HostGator (plano Essentials), quarta opção pedida pelo Gabriel: serve SÓ PARA VOLUME PEQUENO, e só como reserva — não como provedor principal.** Tecnicamente funciona (SMTP em `smtp.titan.email`, porta 465 SSL ou 587 STARTTLS, login com o endereço e a senha da caixa) e **não custa nada a mais por e-mail**: o limite é de **200 envios por hora e 500 por dia por caixa** (política da HostGator), o que cobre o volume de hoje (≈ 130 por mês, pico de 37 por dia) e o de 10× (pico de 370 por dia, desde que o envio seja espaçado), mas **não cobre 100×** (3.700 por dia). Contra: **não há API, nem log de entrega, nem idempotência** (só SMTP); a política só proíbe "e-mail marketing" e **não diz nada sobre e-mail transacional**; a Titan **bloqueia o IP depois de logins que falham** (e não confirmei se as funções da Vercel têm IP de saída fixo); e o Titan exige que o domínio de envio esteja configurado nele (MX, SPF e DKIM) — o Titan do Gabriel é do domínio da própria Áurea, **`aureacustodia.com.br`** (resposta dele, 17/11/2026), onde o e-mail roda no Google e o SPF só autoriza o Google: usá-lo para os avisos obrigaria a **mexer no SPF do domínio onde o e-mail corporativo funciona** (seção 2-A, item 6). Economia sobre o Resend gratuito: **R$ 0**. Condições para usar mesmo assim: caixa dedicada só para os avisos, **SPF de `aureacustodia.com.br` ampliado para incluir o Titan (mudança de DNS de e-mail, só com decisão do Gabriel)**, acesso de terceiros habilitado, senha de aplicativo, fila no banco (já no desenho do T2) e envio espaçado abaixo de 200 por hora. Detalhes na seção 2-A.
3. **ACHADO QUE PARA A FRENTE: `RESEND_API_KEY` e `EMAIL_REMETENTE` NÃO existem no projeto da Vercel** (`aurea-custodia-mvp`), em nenhum ambiente, e o DNS público não mostra nenhum registro do Resend no domínio. Ou seja: **hoje nenhum e-mail transacional sai em produção** (cai no modo "registro local"). Sem a chave, a frente C não pode ser declarada pronta. A variável é com o Gabriel; o roteiro está na seção 6.
4. **Dois pontos que mudam o desenho do T2:**
   - **Em novembro, todos os 25 envios "recebidos" são "cadastro sem envio" (feitos pelo painel); nenhum é postal.** O e-mail "recebemos o seu envio" só faz sentido para `origem = 'envio_postal'`. Sem esse filtro, o sistema mandaria dezenas de "recebemos o seu envio" para quem nunca postou nada.
   - O Resend aceita o cabeçalho `Idempotency-Key`, mas só **por 24 horas**. Serve como segunda camada; a garantia de "não mandar duas vezes" tem de continuar sendo a chave única na tabela de fila.

---

## 1. Volume (leitura de produção, só agregados)

Como foi lido: conexão com o banco pela variável do `.env.local` da worktree (a string nunca foi impressa nem gravada), script fora do repositório, `BEGIN READ ONLY` … `ROLLBACK`, sem `SET`. Saída só com contagens, sem e-mail, nome ou saldo. Leitura em 17/11/2026 22:26 (Brasília). Meses pelo horário de Brasília.
Obs.: os números incluem movimentos das contas dos sócios (não dá para separar sem identificar pessoas; só 1 conta usa o domínio de teste `@testeaurea.com.br`).

**Base:** 122 contas; 101 entraram nos últimos 30 dias; 25 têm moeda em custódia. Novembro cobre só **1º a 17**.

| Evento (catálogo da ficha) | Como contei | Set | Out | Nov (1–17) |
|---|---|---:|---:|---:|
| Negociações (`trades`) | linhas; **2 e-mails cada** (comprador e vendedor) | 2 → **4** | 6 → **12** | 6 → **12** |
| Depósito confirmado | `deposits` com `origem = 'deposito'` | 3 | 1 | 1 |
| Envio **postado** (só postal) | `envios` com `data_postagem` | 1 | 1 | 0 |
| Envio **recebido** (só postal) | `data_recebimento` e `origem = 'envio_postal'` | 1 | 1 | 0 |
| Moeda aceita/recusada | **1 e-mail por envio analisado** | 6 | 10 | 25 |
| Fatura paga (sem as de origem `compra`) | `status = 'paga'`, por `data_pagamento` | 4 | 20 | 27 |
| Retirada postada | `retiradas` (tabela vazia) | 0 | 0 | 0 |
| **Subtotal do catálogo novo** | | **19** | **45** | **65** |
| Saque — pedido + pago/recusado (já existe) | 2 por saque ao cliente | 0 | 4 | 2 |
| Segurança (troca de senha, e-mail, Pix) | não está no banco | n/d | n/d | n/d |

Por que algumas escolhas:
- **Fatura de origem `compra` fica de fora:** ela nasce paga junto com a compra e o e-mail de compra já cobre (3 em outubro, 6 em novembro).
- **Aceita/recusada por envio, não por moeda:** por moeda seriam 127 / 55+2 / 45+2 (aprovadas + recusadas) = 127, 57 e 47 e-mails. Um e-mail por envio, com a lista das moedas, é mais curto e gera bem menos e-mails. Se a decisão for um por moeda, o subtotal sobe de 19 / 45 / 65 para 140 / 92 / 87 (set / out / nov até 17).
- **Postado/recebido só para `envio_postal`:** em 3 meses houve **7 envios postais** e **36 cadastros sem envio** (por mês: set 2+2, out 3+9, nov 2+25). Dos 7 postais, só 2 têm data de postagem (o rastreio automático dos Correios é de 22/10). Sem o filtro, o catálogo literal dá 21 / 54 / 90.
- **Faturas de novembro (27)** vêm em grande parte de 23 de "entrada no acervo" (cadastros pelo painel). É rajada do período de lançamento; não vai se repetir nesse tamanho, mas o ritmo do mês é a melhor medida que há.

**Picos por dia** (conta tudo acima, inclusive "recebido" de cadastro sem envio, então é um **teto**): 07/11 = **37**; 06/10 = 13; 08/11 = 12; 09/11 = 10; 26/10 = 10.

**Clientes distintos que receberiam e-mail** (negociação, depósito, fatura paga, envio): set 4, out 7, nov (até 17) 25. Média, no catálogo com o filtro de postal: de **2,6 (nov: 65 ÷ 25)** a **6,4 (out: 45 ÷ 7)** e-mails por cliente por mês (aproximação: a contagem de clientes não inclui quem só recebe o aviso de análise de um envio de outro mês).

### Conta do "volume de hoje"
- Novembro: 65 e-mails em 17 dias → 65 × 30 ÷ 17 = **≈ 115 por mês**.
- Saques: ritmo de 3 saques em 47 dias (≈ 2 por mês) × 2 e-mails ao cliente, mais o aviso à equipe (um por destinatário da equipe) → **≈ 10 por mês**.
- Soma ≈ 125; arredondei para **130 e-mails por mês** (folga para segurança, reserva pós-paga e aviso de equipe, que já existem e são raros).
- Sem o filtro de postal o número seria ≈ 170 — mesma conclusão de custo.

---

## 2. Preços de hoje (consulta 17/11/2026)

| | **Resend** (atual) | **Amazon SES** | **Brevo** |
|---|---|---|---|
| Plano grátis | US$ 0: **3.000 e-mails/mês, máx. 100 por dia**, 3 domínios, retenção de dados de 30 dias | **Sem cota mensal de e-mails grátis na página.** Conta nova ganha até US$ 200 em créditos AWS (usar em até 12 meses); "free plan" de 6 meses sem detalhe de volume | **300 e-mails por dia** (o FAQ da página; ≈ 9.000/mês) |
| Entrada paga | **Pro: US$ 20/mês = 50.000 e-mails**; excedente **US$ 0,90 por 1.000**; 10 domínios. Scale: US$ 90/mês (100.000) | **US$ 0,10 por 1.000** (à la carte). Plano *Essentials*: **US$ 0,16 por 1.000**, sem mensalidade (a página diz que conta nova sem uso desde 01/06/2025 começa nesse plano a partir de 21/07/2026). Pro US$ 0,22/1.000 + US$ 105/mês; Enterprise US$ 0,23 + US$ 500/mês | **Starter: US$ 9/mês** (US$ 8,08 no anual) **a partir de 5.000 e-mails/mês**; Standard US$ 18/mês; Professional US$ 499/mês (150.000); Enterprise a partir de US$ 2.499/mês |
| Em R$ (cotação acima) | Pro R$ 115,70; Scale R$ 520,66 | US$ 0,10/1.000 = R$ 0,58 por 1.000; Essentials R$ 0,93 por 1.000 | Starter R$ 52,07; Standard R$ 104,13 |
| O que cobra a mais | IP dedicado **US$ 30/mês** (só no Scale, para quem passa de 3.000 e-mails/dia); domínios extras US$ 20/mês por 100; API de envio **incluída**; logs: a página não lista cobrança | Anexos **US$ 0,12 por GB**; IP dedicado **US$ 24,95/mês** (padrão) ou US$ 15/mês + US$ 0,08/1.000 (gerenciado); painel de entregabilidade (VDM) US$ 0,07/1.000; tráfego de saída se enviar de dentro da EC2 | Remover o logo Brevo: **US$ 10,80/mês** (a página não diz se o logo aparece em e-mail transacional por API); IP dedicado só aparece no Enterprise, **sem preço**; API e SMTP vêm em todos os planos |
| Verificar domínio | **Obrigatório** ("é preciso adicionar e verificar ao menos um domínio"). Exige DKIM e SPF (registros TXT e MX ou CNAME, **exatamente como o Resend gerar**). Costuma verificar em ~15 min; até 72 h. DMARC vem depois, recomendado. Sugere **subdomínio** | Domínio por **DKIM** (3 registros CNAME "Easy DKIM"); propagação até 72 h. SPF e DMARC não aparecem como exigência na página lida | 3 itens: **código Brevo (TXT)**, **DKIM** (1 TXT ou 2 CNAME) e **DMARC (TXT)**; DMARC com tag `rua` para cumprir exigência de Gmail/Yahoo/Microsoft. SPF e MX "não são necessários" |
| Sandbox | — | **Toda conta nova nasce em sandbox**: só envia para endereços verificados, **200 mensagens por 24 h, 1 por segundo**. Sair exige pedido (tipo "transacional", URL do site, contatos); **primeira resposta em até 96 h** | — (aprovação da conta antes de enviar: o FAQ fala em "após aprovação da conta") |
| Idempotência | `Idempotency-Key` (seção 4) | Não pesquisado | Não pesquisado |

Fontes (todas lidas em 17/11/2026):
- Resend, preços — <https://resend.com/pricing>
- Resend, domínios — <https://resend.com/docs/dashboard/domains/introduction> e <https://resend.com/docs/add-a-domain>; DMARC — <https://resend.com/docs/dashboard/domains/dmarc>
- Amazon SES, preços — <https://aws.amazon.com/ses/pricing/>
- Amazon SES, sandbox — <https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html>
- Amazon SES, domínio e DKIM — <https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html>
- Brevo, preços — <https://www.brevo.com/pricing/>. **Ressalva:** a página é montada por script e o leitor direto só devolveu o título; li o texto renderizado por um serviço de leitura de páginas (`r.jina.ai/https://www.brevo.com/pricing/`). O degrau acima do Starter (20 mil e-mails) é um seletor que não apareceu; guias de terceiros (ex.: <https://moosend.com/blog/brevo-pricing/>) citam US$ 32/mês, **não confirmado na página oficial**.
- Brevo, autenticação de domínio — <https://help.brevo.com/hc/en-us/articles/12163873383186> (também via `r.jina.ai`).

---

## 2-A. Titan Email da HostGator (plano Essentials) — a quarta opção

Estudo só de leitura, feito em 17/11/2026: **nada foi alterado** no DNS, nenhuma caixa foi criada, nada foi configurado.

**1. O que é, e se serve para um sistema mandar e-mail automático.**
- É **caixa de e-mail profissional com webmail** (marca Titan, vendida pela HostGator). O Essentials tem **10 GB por caixa**, apelidos (aliases), aplicativos de Android e iOS; os planos acima (Premium, Ultra) acrescentam recursos de produtividade. Fonte: <https://www.hostgator.com.br/email-profissional>.
- **SMTP/IMAP: sim.** Servidor de saída `smtp.titan.email`, **porta 465 com SSL** ou **587 com STARTTLS**; entrada `imap.titan.email` na 993. Autenticação com **o endereço completo da caixa e a senha**. O guia da Titan para scripts exige que o **"acesso de terceiros ao e-mail" esteja habilitado na conta** e, **com verificação em duas etapas, usa uma senha de aplicativo**. Fonte: <https://support.titan.email/hc/en-us/articles/4405162224665-Configuring-Titan-on-Email-Scripts>.
- **API: não encontrei.** O guia de scripts só trata de SMTP e IMAP; a página de planos só cita uma "conexão MCP" (automação por IA, só Premium e Ultra), que não é API de envio.
- O `package.json` do projeto **não tem biblioteca SMTP** (nem `nodemailer`): usar o Titan significa **incluir uma dependência**; hoje o código fala com o Resend por `fetch`.

**2. Limites de envio e política de uso.** Fonte: <https://www.hostgator.com.br/politica-de-emails> (seção Titan Mail).
- **Essentials: 200 envios por hora e 500 por dia, por caixa; sem limite diário por domínio.** Premium e Ultra: 300 por hora e 1.000 por dia, por caixa. Planos gratuitos: 50 por hora e 300 por dia por caixa, e 1.000 por hora e 2.000 por dia por domínio.
- **"Cada destinatário é considerado um envio"**: uma mensagem para 3 pessoas gasta 3. A política não fixa limite de destinatários por mensagem. Nossos avisos vão um para cada cliente, então 1 e-mail = 1 envio.
- Sobre e-mail automático: a seção do Titan diz que o serviço é de "uso pessoal e profissional" e **"não permitido para o uso de email marketing"**. **E-mail transacional não é mencionado.** A regra de que envio por programação "deve ser autenticado em uma conta de e-mail válida do seu domínio" está na seção do cPanel, e o texto não diz que vale para o Titan. Envio não solicitado "resultará na suspensão ou encerramento da conta de onde se originou" — se a caixa for a corporativa, o risco recai sobre ela.
- A página de ajuda da própria Titan sobre limites (<https://support.titan.email/hc/en-us/articles/360038836914>) **não abriu (HTTP 403)**; não usei números dela.

**3. Autenticação do domínio e entregabilidade.** Fonte: <https://support.titan.email/hc/en-us/articles/360036853934-Setup-Titan-for-your-domain> (via `r.jina.ai`).
- A página diz que é **obrigatório configurar MX, SPF e DKIM**: MX `mx1.titan.email` (prioridade 10) e `mx2.titan.email` (20); SPF `v=spf1 include:spf.titan.email ~all`; DKIM com **chave gerada no painel do Titan** (o nome `titan1._domainkey` aparece em guias de terceiros e existe no DNS de `aureacustodia.com.br`, ver item 6). **DMARC: recomendado, não obrigatório.**
- Consequência prática (minha leitura): para o Titan mandar "de" um domínio, o domínio tem de estar cadastrado no Titan com esses registros, e o MX aponta para o Titan. **Num domínio que recebe e-mail em outro lugar (como o Google Workspace), isso conflita.**
- **Entregabilidade relatada: não achei fonte independente com taxa de entrega.** A HostGator só promete "garantia de entrega" e "uptime de 100%", sem número. A página não menciona IP dedicado de saída.

**4. Preço e custo extra.**
- A página de planos mostra **"A partir de R$ 5,59/mês*"** no banner (sem dizer qual plano nem qual período; o asterisco remete a condições promocionais que a página não exibiu). O preço de cada plano aparece em branco no texto que li (campo montado por script); períodos oferecidos: 1, 6, 12 e 24 meses; mais de 10 caixas, só com vendas; reembolso em até 30 dias. Uma resenha (<https://cybernews.com/br/melhor-hospedagem-de-sites/review-da-hostgator/>) cita R$ 5,29, mais antigo e sem plano. **O valor real que o Gabriel paga pelo Essentials está na fatura dele, e não consegui ler.**
- **Custo extra de mandar por ele: zero por e-mail.** Nem a página de planos nem a política listam cobrança por volume: o limite por caixa **bloqueia**, não cobra. Se for criada uma caixa só para os avisos (o que recomendo), é **mais uma mensalidade**: "a partir de R$ 5,59/mês" ≈ US$ 0,97 (preço promocional, sem plano e período confirmados).

**5. Riscos.**
- **SMTP a partir de função serverless:** cada execução abre conexão, TLS e login. A Titan diz que, com **logins que falham repetidas vezes, bloqueia o IP do cliente** (só o suporte desbloqueia, com o IP público informado), e não confirmei se o IP de saída das funções da Vercel é fixo (a Vercel tem opção de IP estático por projeto, que não pesquisei). Um erro de senha em produção pode travar todos os envios.
- **Sem log, sem webhook de entrega, sem idempotência:** SMTP só devolve "aceito" ou erro na hora; não há notificação de rejeição, spam ou abertura, nem cabeçalho de idempotência (o Resend tem, ver seção 4). A garantia contra duplicidade ficaria 100% na fila do banco, e a de "foi entregue" não existiria.
- **Mistura com a caixa corporativa:** se for usada a caixa de uma pessoa, os avisos gastam os 200/hora e 500/dia dela, e uma reclamação de spam pode suspender a conta (ver item 2).
- **Senha de caixa em variável de ambiente**, em vez de chave de API que se revoga sozinha; e todos os envios param se a senha da caixa mudar.
- **Dependência nova** (`nodemailer` ou equivalente) e código novo de conexão; o `src/lib/email/index.ts` só conhece `fetch` para o Resend.

**6. Qual domínio o Titan do Gabriel atende — resposta dele em 17/11/2026: é o domínio da própria Áurea Custódia, `aureacustodia.com.br`.** O que o DNS público mostra (nenhum registro foi alterado):

| | `aureacustodia.com.br` | `realolimpico.com.br` |
|---|---|---|
| DNS hospedado em | Cloudflare | HostGator (`dns3` e `dns4.hostgator.com.br`) |
| Onde chega o e-mail (MX) | **Google** (`smtp.google.com`) | `mail.realolimpico.com.br` — **não é** `mx1/mx2.titan.email`; é o padrão do e-mail da hospedagem (cPanel) |
| SPF | `v=spf1 include:_spf.google.com ~all` (**sem** `spf.titan.email`) | **não existe** |
| DKIM | **`google._domainkey` presente** e **`titan1._domainkey` presente** | nenhum (`titan1` e `google` ausentes) |
| DMARC | não existe | não existe |

Leitura: a resposta do Gabriel bate com o DNS — o registro DKIM `titan1` existe em `aureacustodia.com.br`; em `realolimpico.com.br` não há sinal do Titan. Mas hoje o e-mail de `aureacustodia.com.br` **chega no Google** (MX) e o **SPF só autoriza o Google**. Consequências:
- **(a) O remetente seria `@aureacustodia.com.br`, não `@realolimpico.com.br`.** A razão social é a Áurea, mas todo texto do site e dos e-mails diz Real Olímpico; o endereço de quem manda ficaria com outro nome.
- **(b) SPF.** Mandar pelo Titan sem `include:spf.titan.email` no SPF dá falha de SPF (o DKIM `titan1` existe e assinaria a mensagem; não há DMARC cobrando). Para corrigir seria preciso **somar o Titan ao SPF único do domínio, que hoje é só do Google**. É **mudança de DNS de e-mail no domínio do e-mail corporativo, e foi exatamente isso que derrubou o corporativo em 22/09**: só com decisão do Gabriel, e fora deste estudo — **ninguém deve mexer nesse DNS agora**.
- **(c) Recebimento (minha leitura).** O Titan pede MX apontando para ele (`mx1/mx2.titan.email`); como o MX é do Google, uma caixa do Titan nesse domínio **não receberia** respostas nem avisos de devolução (bounce). Não confirmei se existe caixa do Titan ativa lá.
- **Pergunta que sobra, em uma linha, ao Gabriel:** "Existe caixa ativa do Titan em `aureacustodia.com.br` e qual é o endereço?"

**Veredito sobre o Titan:** **só para volume pequeno, como reserva.** Cabe nos dois primeiros cenários (seção 3) a custo extra zero, mas **não traz nada que o Resend gratuito não traga** (R$ 0 nos dois), perde em API, log de entrega, idempotência e risco de bloqueio de IP, e, por ser do domínio `aureacustodia.com.br`, **exige mexer no SPF do domínio onde roda o e-mail corporativo** (item 6). Fica como plano B se o Resend for descartado.

---

## 3. Custo mensal em três cenários

Premissas: **hoje = 130 e-mails/mês e pico de 37/dia**; 10× = 1.300/mês e pico de 370/dia; 100× = 13.000/mês e pico de 3.700/dia (o pico cresce na mesma proporção, é premissa minha). Mês de 30 dias. Câmbio R$ 5,7851.

| Cenário | Resend | Amazon SES (à la carte → Essentials) | Brevo |
|---|---|---|---|
| **Hoje** (130/mês) | **US$ 0 / R$ 0** (cabe em 3.000/mês e 100/dia) | US$ 0,013 → 0,021 (**R$ 0,08 → R$ 0,12**) | **US$ 0 / R$ 0** (cabe em 300/dia) |
| **10×** (1.300/mês) | Mensal cabe (1.300 < 3.000), mas o **pico de 370/dia passa do limite de 100/dia** → **Pro: US$ 20 / R$ 115,70** | US$ 0,13 → 0,21 (**R$ 0,75 → R$ 1,20**) | Mensal cabe; pico de 370/dia passa de 300/dia → **Starter: US$ 9 / R$ 52,07** |
| **100×** (13.000/mês) | **Pro: US$ 20 / R$ 115,70** (13 mil < 50 mil, sem excedente) | US$ 1,30 → 2,08 (**R$ 7,52 → R$ 12,03**) | Acima dos 5.000 do Starter: **≥ US$ 9 / R$ 52,07**; o preço do degrau seguinte não foi lido (ver ressalva acima) |

**Onde cada um sai do grátis:**
- **Resend:** o limite de **100 por dia** estoura primeiro — com um dia ≈ 2,7 vezes o pico de 07/11 (100 ÷ 37); o de 3.000 por mês só com ≈ 23 vezes o volume de hoje (3.000 ÷ 130).
- **Brevo:** o limite de 300 por dia, com um dia ≈ 8 vezes o pico de 07/11 (300 ÷ 37).
- **SES:** não tem faixa grátis de volume; o custo é de centavos já no primeiro e-mail, e o risco é o contrário — **a sandbox impede o envio** até o pedido de produção ser aprovado.
- **Titan Essentials:** não tem franquia mensal; o limite é **500 por dia e 200 por hora por caixa** (seção 2-A).

**Titan Essentials (HostGator) nos mesmos cenários** — custo extra por e-mail: **zero**; se houver caixa dedicada, soma "a partir de R$ 5,59/mês" (≈ US$ 0,97):

| Cenário | Cabe? | Custo extra |
|---|---|---|
| **Hoje** (130/mês, pico 37/dia) | **Sim**: 37 por dia contra 500, e longe de 200 por hora | **R$ 0** (caixa que ele já paga) |
| **10×** (1.300/mês, pico 370/dia) | **Cabe no dia** (370 < 500), mas uma rajada passa de 200 por hora (ex.: o lote de 25 envios analisados de uma vez, vezes 10) → precisa de fila que espace o envio | **R$ 0** |
| **100×** (13.000/mês, pico 3.700/dia) | **Não**: 3.700 contra 500 por dia (Premium e Ultra: 1.000). Só com várias caixas, o que contraria o uso previsto na política | — (não recomendado) |

---

## 4. `Idempotency-Key` no Resend (alimenta o T2)

Fonte: <https://resend.com/docs/dashboard/emails/idempotency-keys> (lida em 17/11/2026).
- **Aceita.** Cabeçalho HTTP `Idempotency-Key`; no SMTP é `Resend-Idempotency-Key`. Vale para o envio simples e para o envio em lote.
- **Validade: 24 horas** ("kept in the system for 24 hours" — a chave fica guardada 24 h).
- Chave de **1 a 256 caracteres**, única por requisição. Fora desse tamanho: HTTP 400 `invalid_idempotency_key`.
- Mesma chave e **mesmo conteúdo**: devolve a resposta original, **sem mandar de novo**.
- Mesma chave e **conteúdo diferente**: HTTP 409 `invalid_idempotent_request`. Chave igual ainda em andamento: 409 `concurrent_idempotent_requests`.
- Recomendação do próprio Resend: chave por entidade (ex.: `evento#id`), nunca uma chave fixa para todos.

O que isso significa para o desenho:
- O `src/lib/email/index.ts` de hoje **não manda** o cabeçalho. Para usar, `MensagemDeEmail` precisa de um campo opcional (ex.: `chave`) e o `fetch` passa `Idempotency-Key`. Cabe em `src/lib/email/**` (Touch da frente C).
- Como só vale 24 h, **uma nova tentativa do cron depois de um dia pode mandar duplicado**. A garantia real fica na tabela de fila (chave única), como no desenho do T2; o cabeçalho é cinto de segurança para a mesma hora.
- Cuidado com a regra do 409: se o texto do e-mail for remontado com conteúdo diferente (ex.: data formatada de outro jeito) e a mesma chave for reaproveitada, volta erro 409 — trate 409 como "já foi" (sucesso), não como falha.

---

## 5. Vercel e domínio de envio (leitura; nenhum valor foi lido)

- Projeto: **`aurea-custodia-mvp`** (time `aurea-custodia`). Conferi duas vezes por caminhos diferentes (conector da Vercel, depois `vercel api` pela CLI), imprimindo **só os nomes** das variáveis: 54 registros, 36 nomes distintos, entre eles `POSTGRES_URL`, `SUPABASE_*`, `MP_*`, `CORREIOS_*`, `NFSE_*`, `META_*`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`.
- **`RESEND_API_KEY`: não existe.** **`EMAIL_REMETENTE`: não existe.** Nenhuma variável com "RESEND", "EMAIL", "MAIL" ou "REMETENTE" no nome, em production, preview ou development. O time também não tem variáveis compartilhadas.
- `NEXT_PUBLIC_APP_URL` existe (production), então o link da conta nos e-mails funciona.
- **Domínio de envio:** não consigo ver o painel do Resend, mas o DNS público responde:
  - `resend._domainkey.realolimpico.com.br` e `resend._domainkey.avisos.realolimpico.com.br` → **sem registro** (é onde o Resend publica a chave DKIM);
  - `send.realolimpico.com.br` e `send.avisos.realolimpico.com.br` → **sem MX nem TXT**;
  - o domínio usa os servidores de nome da **HostGator** (`dns3` e `dns4.hostgator.com.br`); o e-mail do domínio aponta para `mail.realolimpico.com.br`; não há registro DMARC (`_dmarc`).
  - **Leitura:** é indício forte de que o Resend **nunca foi configurado** para este domínio. Não é prova: se o Gabriel usou outro subdomínio, eu não testei. Só o painel do Resend confirma.
- Um ponto lateral para o T2: a API de logs da Vercel respondeu que o plano é **Hobby, com retenção de logs de 1 hora**. O "registro do erro" de e-mail que falhou **precisa ir para o banco** (coluna na fila); o log da Vercel não guarda.

---

## 6. Roteiro, já que a variável falta (é com o Gabriel)

Base: `docs/RESEND_O_QUE_EXECUTAR_MANUALMENTE.md`. Os nomes de botões do Resend e da Vercel **não** foram vistos por mim; siga o que a tela mostrar.

1. **Resend:** entrar em <https://resend.com/domains>, adicionar o domínio de envio — sugestão **subdomínio** `avisos.realolimpico.com.br` (o Resend recomenda subdomínio e assim não mexe no e-mail que já funciona no domínio principal).
2. **DNS (HostGator):** cadastrar **cada registro como o Resend mostrar** (tipo, nome e valor; o Resend pede DKIM e SPF em TXT e MX ou CNAME). Voltar ao Resend e pedir a verificação; costuma levar ~15 min, no máximo 72 h.
3. **Chave:** em <https://resend.com/api-keys> criar a chave (permissão de envio, se a tela oferecer) e **copiar na hora**: não aparece de novo.
4. **Vercel**, ambiente **Production** — pelo painel (Settings → Environment Variables, como no doc), ou pela CLI na pasta da raiz, que já está ligada ao projeto. Cada comando pede o valor no terminal:

```powershell
cd C:\dev\AureaCustodiaMVP
vercel env add RESEND_API_KEY production --scope aurea-custodia
vercel env add EMAIL_REMETENTE production --scope aurea-custodia
```

   Valores: `RESEND_API_KEY` = a chave copiada (começa com `re_`); `EMAIL_REMETENTE` = `Real Olímpico <nao-responda@avisos.realolimpico.com.br>` (tem de ser endereço do domínio **verificado**; se usar outro subdomínio, troque aqui). Guarde a chave como valor sensível, como as demais do projeto.
5. **Redeploy** do último deploy de produção (variável nova só vale em deploy novo).
6. **Teste:** em `/admin/equipe`, **Reenviar** num membro com o seu e-mail; a tela deve dizer "Convite reenviado." (e não "Sem RESEND_API_KEY…"). Veja caixa de entrada e spam; o Resend mostra entregue/rejeitado.

Enquanto isso não for feito, a Execução pode testar tudo em **modo console** (sem a variável o provedor só escreve no log), mas **ninguém recebe e-mail em produção**.

---

## 7. O que não consegui confirmar (para não valer como número)

- Preço do degrau acima do Starter no Brevo (seletor da página); guia de terceiros cita US$ 32 — não oficial.
- Se o logo da Brevo aparece em e-mail transacional por API (a página só lista "remover logo" como complemento de US$ 10,80/mês).
- Se há cobrança de logs/retenção no Resend Pro e no SES: as páginas de preço lidas não listam; não afirmo que seja zero.
- A página de preços do SES descreve planos *Essentials/Pro/Enterprise* e o "à la carte" de US$ 0,10; mostrei as duas faixas porque, para conta nova, a página diz que o início é no Essentials a partir de 21/07/2026.
- Eventos de **segurança** (troca de senha, e-mail, Pix) não estão no banco: o volume é desconhecido. Mesmo no pior caso imaginável de um por conta por mês (122 contas), são 122 e-mails — não muda nenhuma conclusão.
- **Titan:** o preço de cada plano (Essentials, Premium, Ultra) e o período do "a partir de R$ 5,59" não aparecem na página; a página de limites da Titan deu 403; não achei taxa de entrega independente; o domínio do Titan é `aureacustodia.com.br` (resposta do Gabriel), mas **se há caixa ativa do Titan lá e qual é o endereço fica como pergunta a ele** (seção 2-A, item 6).
- Idempotência de SES e Brevo não foi pesquisada (fora do pedido; a recomendação é ficar no Resend).
