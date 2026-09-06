# Guia operacional — Vercel agora, HostGator para e-mail e domínio depois

```
Projeto:          Áurea Custódia
Produção atual:   https://aurea-custodia-mvp.vercel.app
Projeto Vercel:   aurea-custodia-mvp
Supabase ref:     vjbqikfamqdttbmaqrxf
Decisão:          Vercel hospeda o site; HostGator mantém domínios e DNS;
                  Google Workspace entrega o e-mail humano
Atualizado em:    06/09/2026
```

> ## ⛔ Correção de 06/09/2026 — leia antes de tocar em qualquer registro `MX`
>
> **O e-mail humano de `@aureacustodia.com.br` está no Google Workspace, não no Titan.**
> As versões anteriores deste guia afirmavam o contrário e mandavam apontar o `MX` para
> `mx1.titan.email` e `mx2.titan.email`. **Isso está errado e derrubou o recebimento de
> e-mail do Gabriel em 06/09/2026**, junto com o segundo fator de acesso dele a serviços
> de trabalho, o GitHub entre eles.
>
> Restos da configuração antiga do Titan continuam na zona DNS — um SPF
> `include:spf.titan.email`, um DKIM `titan1._domainkey` e um CNAME
> `webmail → titan.hostgator.com.br` — e enganam quem lê a zona de fora. **Os registros
> que valem são os do Google:** `google._domainkey` e `google-site-verification`.
>
> **Regra que decorre disso:** o `MX` do domínio raiz governa o e-mail **que chega** para
> pessoas. Ele **não** tem relação nenhuma com o cadastro de clientes na plataforma, que
> depende de e-mail **de saída**. Nunca alterar o `MX` do domínio raiz para habilitar
> funcionalidade da plataforma. Ver a seção 4.

---

## 0. O mínimo para o cadastro de clientes funcionar

Esta seção existe porque em 06/09/2026 a configuração do cadastro foi confundida com a
configuração do e-mail corporativo, e o resultado foi o e-mail do Gabriel parar.

**Para usuários finais criarem conta na plataforma, nada precisa mudar no DNS.** O
necessário é só isto:

| # | O que | Onde | Toca DNS? |
|---|---|---|---|
| 1 | `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` | Vercel → Environment Variables | Não |
| 2 | `AUREA_SIGNUP_ENABLED=true` | Vercel → Environment Variables | Não |
| 3 | `AUREA_TERMS_VERSION` e `AUREA_PRIVACY_VERSION` | Vercel → Environment Variables | Não |
| 4 | Redirect URL `…/entrar/callback` autorizada | Supabase → Authentication → URL Configuration | Não |
| 5 | Redeploy | Vercel | Não |

O e-mail de confirmação de cadastro sai pelo **servidor do próprio Supabase**, com
remetente dele. Não exige domínio, nem SPF, nem MX. O limite é baixo — algumas mensagens
por hora — e isso basta para o MVP de teste com os sócios.

### Quando o volume crescer

Aí entra um SMTP próprio (Resend), e **somente então** aparece DNS — sempre num
**subdomínio de envio**, `auth.aureacustodia.com.br`, com registros próprios daquele nome.

**O `MX` de `aureacustodia.com.br` não participa disso em nenhuma hipótese.** Ele governa
o e-mail humano que chega para as pessoas, e vive no Google Workspace. Mexer nele para
habilitar cadastro é trocar o encanamento da casa para consertar a torneira do vizinho: não
resolve o que se queria e quebra o que funcionava.

Este é o roteiro canônico da configuração da Frente A enquanto o domínio personalizado
ainda não estiver ligado ao site. Ele também contém a migração futura, sem exigir uma
hospedagem de site na HostGator e sem interromper os e-mails corporativos.

> **Resumo da decisão:** por enquanto, o endereço público continua sendo
> `https://aurea-custodia-mvp.vercel.app`. O fato de os domínios estarem registrados na
> HostGator não os conecta automaticamente à Vercel. Quando chegar a hora, a HostGator
> continuará como registradora e administradora de DNS, com as caixas no Google Workspace;
> somente os registros de site (`A` e `CNAME`) apontarão para a Vercel.

---

## 1. Como cada serviço será usado

| Serviço | Responsabilidade | O que não fará |
|---|---|---|
| **Vercel** | Hospedar o Next.js, publicar cada deploy e emitir SSL/HTTPS | Não hospeda caixas de e-mail |
| **HostGator** | Manter os domínios registrados e a Zona DNS | Não hospedará o site Next.js **e não entrega o e-mail humano** |
| **Google Workspace** | Entregar e guardar as caixas humanas `@aureacustodia.com.br` | Não hospeda o site |
| **Supabase** | Banco e autenticação; emitir links de confirmação e recuperação | Não deve ser o entregador de e-mail de produção sem SMTP customizado |
| **Google Cloud** | Identidade do botão “Continuar com Google” | Não hospeda o site nem recebe o e-mail corporativo |
| **Resend** | Mais adiante, entregar apenas e-mails automáticos do Supabase Auth, sempre por um **subdomínio** | Não substituirá as caixas humanas do Google Workspace e **não encosta no MX do domínio raiz** |

Fluxo atual:

```text
visitante ──> aurea-custodia-mvp.vercel.app ──> Next.js na Vercel
                                                   │
                                                   └──> Supabase Auth

pessoa ──> gabriel.silva@aureacustodia.com.br ──MX──> Google Workspace
```

Fluxo futuro:

```text
visitante ──> aureacustodia.com.br ──DNS A/CNAME──> Vercel

mensagem recebida em @aureacustodia.com.br ──MX──> Google Workspace

confirmação automática de cadastro
Supabase ──SMTP──> Resend ──auth.aureacustodia.com.br──> destinatário
```

Esses fluxos convivem porque usam nomes e tipos de registros diferentes. O registro `A`
do site não substitui o `MX` do e-mail.

---

## 2. Inventário e função recomendada dos seis domínios

A imagem do Portal do Cliente confirma estes registros:

| Domínio | Função recomendada | E-mail corporativo? |
|---|---|---|
| `aureacustodia.com.br` | **Domínio principal futuro** da plataforma | **Sim** |
| `www.aureacustodia.com.br` | Redirecionar para `aureacustodia.com.br` | Não se aplica |
| `auth.aureacustodia.com.br` | Subdomínio futuro exclusivo do Resend | Não criar caixa humana |
| `aureacustodia.store` | Redirecionar para o domínio principal | Não é necessário |
| `aureacustodia.online` | Redirecionar para o domínio principal | Não é necessário |
| `realolimpico.com.br` | Redirecionar para o domínio principal ou reservar para uso institucional futuro | Somente se houver necessidade real |
| `realolimpico.store` | Redirecionar para o domínio principal | Não é necessário |
| `realolimpico.online` | Redirecionar para o domínio principal | Não é necessário |

Não é necessário comprar seis planos de e-mail. A recomendação é concentrar as caixas
humanas em `@aureacustodia.com.br`, por exemplo:

```text
contato@aureacustodia.com.br
suporte@aureacustodia.com.br
financeiro@aureacustodia.com.br
privacidade@aureacustodia.com.br
```

`no-reply@auth.aureacustodia.com.br` será apenas um remetente automático do Resend; não
precisa ser uma caixa de entrada da HostGator.

---

## 3. Fase atual — manter tudo do site na Vercel

### 3.1 O que fazer agora

1. Manter o domínio de produção da Vercel:

   ```text
   https://aurea-custodia-mvp.vercel.app
   ```

2. Não clicar em **Connect External**, não adicionar domínio externo à Vercel e não
   alterar nameservers na HostGator nesta fase.
3. Configurar o Supabase e o Google OAuth usando o endereço `.vercel.app`.
4. Manter o cadastro público fechado em Produção até a revisão jurídica e até existir um
   SMTP transacional confiável.
5. Para teste controlado, usar Google OAuth ou criar usuários no painel do Supabase e
   marcá-los como confirmados.

### 3.2 Variáveis de Produção na Vercel

Abrir **Vercel → projeto `aurea-custodia-mvp` → Settings → Environment Variables**.

| Key | Value | Ambiente |
|---|---|---|
| `SUPABASE_URL` | `https://vjbqikfamqdttbmaqrxf.supabase.co` | Production |
| `SUPABASE_PUBLISHABLE_KEY` | copiar **Publishable key** do projeto Supabase | Production |
| `AUREA_SITE_URL` | `https://aurea-custodia-mvp.vercel.app` | Production |
| `AUREA_TERMS_VERSION` | `RASCUNHO-0.1-2026-09-02` | Production |
| `AUREA_PRIVACY_VERSION` | `RASCUNHO-0.1-2026-09-02` | Production |
| `AUREA_TERMS_URL` | `https://aurea-custodia-mvp.vercel.app/termos` | Production |
| `AUREA_PRIVACY_URL` | `https://aurea-custodia-mvp.vercel.app/privacidade` | Production |

Regras importantes:

- `AUREA_SIGNUP_ENABLED` deve ficar **ausente** de Production por enquanto. Defini-la como
  `false` também fecha o cadastro, mas ausente reduz o risco de alguém trocar o valor sem
  perceber a consequência.
- `SESSION_SECRET` já existente não deve ser apagado, exibido nem substituído sem motivo.
- `AUTH_LEGAL_SECRET` é opcional enquanto `SESSION_SECRET` existir; o código usa o segundo
  como fallback seguro.
- Não criar `RESEND_API_KEY` na Vercel para este fluxo. Quem usará a credencial SMTP será
  o Supabase, não o código Next.js.
- Depois de salvar variáveis, fazer **Redeploy**. Um deployment pronto não recebe valores
  novos retroativamente.

Para **Preview**, copiar as duas variáveis do Supabase e as duas versões legais. Deixar
`AUREA_SITE_URL`, `AUREA_TERMS_URL` e `AUREA_PRIVACY_URL` ausentes permite que o código use
o host do próprio Preview. `AUREA_SIGNUP_ENABLED=true` pode ser usado apenas em Preview
controlado.

### 3.3 Supabase usando a URL da Vercel

Abrir **Supabase → Authentication → URL Configuration** e preencher:

```text
Site URL
https://aurea-custodia-mvp.vercel.app

Redirect URLs
https://aurea-custodia-mvp.vercel.app/entrar/callback
http://localhost:3000/entrar/callback
```

Para testar um Preview, cadastrar também o callback exato daquele Preview. Se optar por
wildcard, ele deve estar restrito ao padrão real do projeto/time; não usar um wildcard
genérico como `https://**`.

### 3.4 Google OAuth usando a URL da Vercel

No **Google Cloud → Google Auth Platform**:

1. Em **Branding**, usar nome, logotipo e e-mail institucional da Áurea.
2. Em **Audience**, escolher `External` se os sócios usam contas Google externas.
3. Enquanto o app estiver em teste, cadastrar os sócios em **Test users**.
4. Em **Clients**, criar ou editar um cliente do tipo **Web application**.
5. Em **Authorized JavaScript origins**, adicionar:

   ```text
   https://aurea-custodia-mvp.vercel.app
   http://localhost:3000
   ```

6. Em **Authorized redirect URIs**, adicionar o callback do Supabase, e não o da Vercel:

   ```text
   https://vjbqikfamqdttbmaqrxf.supabase.co/auth/v1/callback
   ```

7. Copiar o Client ID e o Client Secret para **Supabase → Authentication → Sign In /
   Providers → Google** e habilitar o provedor.

O Client Secret do Google fica somente no Supabase. Não deve entrar no Git nem nas
variáveis da Vercel.

### 3.5 Como testar contas antes do Resend

Sem SMTP customizado, o entregador padrão do Supabase é apenas demonstrativo: ele só
envia a endereços previamente autorizados da equipe do projeto, possui limite muito baixo
e não deve ser usado para os sócios em produção.

Para um teste rápido e controlado:

1. abrir **Supabase → Authentication → Users**;
2. criar o usuário com e-mail real controlado;
3. usar a opção de confirmar automaticamente o e-mail, se disponível na criação;
4. garantir que a frente de banco tenha uma conta/dados mockados associados ao mesmo
   e-mail em minúsculas;
5. entrar em `https://aurea-custodia-mvp.vercel.app/entrar`;
6. testar sair e entrar novamente.

Alternativamente, usar o Google OAuth com o e-mail incluído nos test users. Isso testa o
login sem depender do e-mail de confirmação do Supabase.

---

## 4. HostGator somente para e-mails humanos

### 4.1 Precisa contratar hospedagem da HostGator?

**Não para o site.** O Next.js deve continuar na Vercel.

**Não para o e-mail também.** As caixas humanas `@aureacustodia.com.br` já existem e são
servidas pelo **Google Workspace**, que o Gabriel já paga e usa. A HostGator entra apenas
como registradora do domínio e administradora da Zona DNS.

Não há nada a contratar na HostGator para o e-mail funcionar. O que a HostGator precisa
fazer é **publicar corretamente os registros do Google** na zona — e não sobrescrevê-los.

### 4.2 Caminho no painel atual da HostGator

A partir da tela mostrada na imagem:

1. localizar `aureacustodia.com.br`;
2. clicar em **Configurar domínio** — para DNS, não é necessário entrar em **Gerenciar**;
3. se o painel pedir onde o site será hospedado, selecionar **Sem hospedagem (apenas Zona
   de DNS)**. Em algumas contas a alternativa aparece como **Outra plataforma de
   hospedagem**; nesse caso, avançar até **Editar Zona Avançada de DNS**;
4. **não** selecionar nem contratar plataforma de e-mail da HostGator: as caixas já são do
   Google Workspace, e escolher um produto de e-mail aqui faz o painel reescrever o `MX`.

### 4.3 Registros corretos — Google Workspace

Antes de mudar qualquer registro, tirar capturas de tela de toda a Zona DNS.

| Tipo | Nome/Host | Prioridade | Valor/Destino |
|---|---|---:|---|
| `MX` | `@` ou `aureacustodia.com.br` | `1` | `smtp.google.com` |
| `TXT` | `@` ou `aureacustodia.com.br` | — | `v=spf1 include:_spf.google.com ~all` |
| `TXT` | `google._domainkey` | — | chave DKIM emitida no Admin do Google |
| `TXT` | `@` | — | `google-site-verification=…` (verificação do domínio) |

`smtp.google.com` é o registro único que o Google recomenda desde 2023. Se o painel da
HostGator recusar esse valor, usar o conjunto clássico equivalente:

| Tipo | Nome/Host | Prioridade | Valor/Destino |
|---|---|---:|---|
| `MX` | `@` | `1` | `aspmx.l.google.com` |
| `MX` | `@` | `5` | `alt1.aspmx.l.google.com` |
| `MX` | `@` | `5` | `alt2.aspmx.l.google.com` |
| `MX` | `@` | `10` | `alt3.aspmx.l.google.com` |
| `MX` | `@` | `10` | `alt4.aspmx.l.google.com` |

Não criar um segundo SPF começando com `v=spf1` para o mesmo nome: dois registros SPF
invalidam os dois. Se já houver um, editar o existente em vez de acrescentar outro.

### 4.3.1 Registros que devem sair da zona

Sobraram da configuração antiga do Titan e só servem para confundir:

| Tipo | Nome | Por que sai |
|---|---|---|
| `MX` | `@` → `mx1.titan.email` / `mx2.titan.email` | mandam o correio para um servidor que não tem as caixas |
| `MX` | `@` prioridade `0` → `aureacustodia.com.br` | roteamento local da hospedagem; sequestra todo o correio |
| `TXT` | `@` → `v=spf1 include:spf.titan.email ~all` | substituir pelo SPF do Google, não somar |
| `TXT` | `titan1._domainkey` | DKIM de um provedor que não é mais usado |
| `CNAME` | `webmail` → `titan.hostgator.com.br` | webmail que não corresponde às caixas reais |

Um `MX` de prioridade `0` apontando para o próprio domínio significa que a hospedagem
assumiu o correio para si. Ele tem prioridade sobre qualquer `MX` externo — inclusive os do
Google — e precisa ser removido, não apenas complementado.

### 4.4 Conferência do e-mail

Depois da propagação:

1. enviar de uma conta externa para `contato@aureacustodia.com.br`;
2. responder a partir da caixa do Google Workspace;
3. conferir recebimento, envio e pasta de spam;
4. manter um registro dos MX, SPF e DKIM aprovados.

A HostGator informa que alterações de DNS podem levar até 24 horas. Normalmente aparecem
antes, mas não trocar vários componentes durante essa janela.

---

## 5. Migração futura do site para `aureacustodia.com.br`

### 5.1 Estratégia recomendada

Usar:

```text
URL canônica:   https://aureacustodia.com.br
Redireciona:    https://www.aureacustodia.com.br
Hospedagem:     Vercel
DNS e e-mail:   HostGator
```

Não trocar os nameservers para a Vercel na primeira migração. Manter a Zona DNS na
HostGator permite alterar apenas o site e preservar os registros de e-mail já funcionais.

### 5.2 Preparação obrigatória

1. Abrir a Zona DNS de `aureacustodia.com.br` na HostGator.
2. Capturar ou exportar todos os registros atuais: `A`, `AAAA`, `CNAME`, `MX`, `TXT`,
   `CAA`, `SRV` e DKIM.
3. Marcar explicitamente os registros de e-mail que não podem ser removidos:
   - MX do Google Workspace;
   - SPF;
   - DKIM;
   - DMARC;
   - verificações do Google ou de outros serviços.
4. Reduzir o TTL de `A`/`CNAME` do site com antecedência, se o painel permitir. Não é
   obrigatório, mas agiliza correção.
5. Confirmar que `aurea-custodia-mvp.vercel.app` está saudável antes de apontar o domínio.

### 5.3 Adicionar o domínio no lugar correto da Vercel

A tela geral **Domains** do time vazia apenas confirma que nenhum domínio externo foi
adicionado. Para associar ao site:

1. abrir a Vercel;
2. entrar no projeto **`aurea-custodia-mvp`**;
3. abrir **Settings → Domains**;
4. clicar em **Add Domain**;
5. adicionar `aureacustodia.com.br`;
6. adicionar também `www.aureacustodia.com.br`;
7. configurar `www` para redirecionar permanentemente para o domínio sem `www`.

A Vercel mostrará os registros exatos exigidos para o projeto. Não copiar cegamente um
valor de tutorial: o `CNAME` pode ser específico do projeto.

### 5.4 Criar os registros na HostGator

Na HostGator:

1. **Domínios → `aureacustodia.com.br` → Configurar domínio**;
2. **Zona de DNS → Ok, continuar para a Zona de DNS**;
3. abrir **Fazer configuração avançada na zona de DNS**;
4. filtrar por `A` e localizar o registro do domínio raiz (`@`);
5. editar somente esse registro para o valor `A` mostrado pela Vercel;
6. filtrar por `CNAME` e localizar `www`;
7. editar somente `www` para o `CNAME` mostrado pela Vercel;
8. se a Vercel pedir verificação de propriedade, adicionar também o `TXT` exato;
9. salvar.

Valores gerais frequentemente mostrados pela Vercel, apenas para reconhecimento:

```text
apex/root:  A      @      76.76.21.21
www:        CNAME  www    <valor específico mostrado pela Vercel>
```

**A tela do projeto Vercel prevalece sobre esses exemplos.**

Não alterar nesta etapa:

- nameservers;
- registros MX;
- SPF, DKIM ou DMARC;
- subdomínio `auth`, se já estiver sendo usado pelo Resend;
- verificações TXT de terceiros.

### 5.5 Verificar e ativar HTTPS

1. voltar a **Vercel → projeto → Settings → Domains**;
2. aguardar os dois nomes aparecerem como válidos;
3. aguardar o certificado SSL automático;
4. testar em rede comum e no celular:
   - `https://aureacustodia.com.br` abre a plataforma;
   - `https://www.aureacustodia.com.br` redireciona;
   - `https://aurea-custodia-mvp.vercel.app` continua funcionando;
5. testar novamente envio e recebimento das caixas HostGator.

Cada novo deploy de Production continuará sendo publicado diariamente da mesma forma. A
Vercel apenas passará a associar o deployment mais recente também ao domínio próprio.

---

## 6. Ajustes de autenticação depois do domínio personalizado

Só executar quando o HTTPS do domínio novo estiver válido.

### 6.1 Vercel — valores que mudam

| Key | Novo Value em Production |
|---|---|
| `AUREA_SITE_URL` | `https://aureacustodia.com.br` |
| `AUREA_TERMS_URL` | `https://aureacustodia.com.br/termos` |
| `AUREA_PRIVACY_URL` | `https://aureacustodia.com.br/privacidade` |
| `NEXT_PUBLIC_APP_URL` | `https://aureacustodia.com.br` se essa variável já estiver sendo usada nos retornos do Mercado Pago |

Fazer Redeploy depois da alteração.

### 6.2 Supabase

Em **Authentication → URL Configuration**:

```text
Site URL
https://aureacustodia.com.br

Redirect URLs
https://aureacustodia.com.br/entrar/callback
https://aurea-custodia-mvp.vercel.app/entrar/callback
http://localhost:3000/entrar/callback
```

Manter a URL `.vercel.app` durante a transição fornece um caminho de contingência.

### 6.3 Google OAuth

Adicionar em **Authorized JavaScript origins**:

```text
https://aureacustodia.com.br
```

Atualizar também homepage, Termos e Privacidade em **Branding**. O redirect URI continua:

```text
https://vjbqikfamqdttbmaqrxf.supabase.co/auth/v1/callback
```

Ele não muda porque o Google retorna primeiro ao Supabase.

---

## 7. Resend sem interferir no e-mail da HostGator

O Resend pode ser ativado antes ou depois do domínio do site ir para a Vercel. Ele depende
do controle da Zona DNS na HostGator, não da hospedagem do site.

### 7.1 Separação correta

```text
Google Workspace: caixas em @aureacustodia.com.br
Resend:          envio automático em @auth.aureacustodia.com.br
```

Assim, os MX do domínio raiz continuam entregando as mensagens humanas à HostGator. Os
registros do Resend ficam no subdomínio e não devem substituir os MX do domínio raiz.

### 7.2 Passo a passo

1. entrar no Resend com a conta institucional;
2. abrir **Domains → Add Domain**;
3. adicionar `auth.aureacustodia.com.br`;
4. escolher a região mais próxima disponível para o envio;
5. na aba de registros, copiar exatamente cada registro apresentado;
6. abrir na HostGator **Domínios → aureacustodia.com.br → Configurar domínio → Zona de
   DNS → configuração avançada**;
7. adicionar cada registro do Resend com o nome relativo correto, por exemplo `auth`,
   `send.auth` ou o seletor DKIM mostrado;
8. voltar ao Resend e aguardar **Verified**;
9. criar uma API key restrita ao envio pelo domínio verificado;
10. guardar a chave em gerenciador de senhas.

O Resend pode mostrar `MX` + `TXT` ou registros `CNAME`, conforme a configuração atual da
conta. Use os valores da tela real do Resend; não transforme um tipo no outro.

### 7.3 SMTP no Supabase

Abrir **Supabase → Authentication → Emails/SMTP Settings** e configurar:

| Campo | Valor |
|---|---|
| Sender name | `Áurea Custódia` |
| Sender email | `no-reply@auth.aureacustodia.com.br` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | API key `re_...` criada no Resend |

A API key fica no Supabase. Não cadastrá-la na Vercel para este fluxo.

Depois, ajustar o template de confirmação para o callback SSR da plataforma e manter o
tracking/rewrite de links desligado para mensagens de autenticação. Fazer um cadastro
controlado e confirmar no Resend os eventos de entrega, bounce e complaint.

---

## 8. O que fazer com os outros cinco domínios

Somente depois de `aureacustodia.com.br` estar estável:

1. adicionar cada domínio ao mesmo projeto Vercel em **Settings → Domains**;
2. configurar o domínio como redirecionamento permanente para
   `https://aureacustodia.com.br`;
3. criar na Zona DNS de cada domínio os registros exatos solicitados pela Vercel;
4. adicionar também a variante `www` quando fizer sentido;
5. testar o HTTPS e o redirecionamento.

Não apontar os seis simultaneamente no primeiro dia. Fazer um por vez facilita identificar
qual zona está errada e não altera o e-mail do domínio principal.

---

## 9. Plano de retorno se algo falhar

### Site não abre no domínio novo

1. A URL `.vercel.app` continua sendo a contingência.
2. Conferir na Vercel qual registro aparece como inválido.
3. Restaurar somente os antigos registros `A`/`CNAME` do site se necessário.
4. Não mexer em MX/TXT de e-mail para corrigir problema de site.

### E-mail para de chegar

1. interromper novas mudanças DNS;
2. comparar MX, SPF e DKIM com as capturas feitas antes da migração;
3. restaurar os registros do provedor de e-mail;
4. testar recebimento externo antes de continuar;
5. abrir chamado na HostGator se os registros estiverem corretos e a caixa continuar
   indisponível.

### Login volta para URL errada

Conferir, nesta ordem: `AUREA_SITE_URL` na Vercel, Site URL/Redirect URLs no Supabase e
origens do cliente Web no Google. Fazer Redeploy depois de corrigir a Vercel.

---

## 10. Checklist executivo

### Agora

- [ ] site continua em `aurea-custodia-mvp.vercel.app`;
- [ ] nenhuma alteração de nameserver foi feita;
- [ ] variáveis de Auth estão em Production;
- [ ] cadastro público continua fechado;
- [ ] Google OAuth foi testado com test user;
- [ ] contas manuais confirmadas entram e recebem dados mockados;
- [ ] as caixas do Google Workspace em `@aureacustodia.com.br` continuam recebendo.

### Quando ativar o domínio próprio

- [ ] backup visual completo da Zona DNS;
- [ ] MX/SPF/DKIM/DMARC identificados e preservados;
- [ ] `aureacustodia.com.br` e `www` adicionados ao projeto Vercel;
- [ ] apenas `A` e `CNAME` do site alterados na HostGator;
- [ ] SSL válido e redirecionamento conferido;
- [ ] envio e recebimento HostGator retestados;
- [ ] Vercel, Supabase e Google atualizados para a URL nova;
- [ ] login por senha e Google testados de ponta a ponta.

### Quando ativar e-mails automáticos

- [ ] `auth.aureacustodia.com.br` verificado no Resend;
- [ ] MX do domínio raiz continuam apontando para o Google Workspace;
- [ ] SMTP do Resend configurado no Supabase;
- [ ] confirmação de cadastro entregue;
- [ ] recuperação de senha entregue;
- [ ] tracking de links de autenticação desligado.

---

## 11. Fontes oficiais atuais

- [Vercel — configurar domínio personalizado](https://vercel.com/docs/domains/set-up-custom-domain)
- [Vercel — adicionar e configurar domínio](https://vercel.com/docs/domains/working-with-domains/add-a-domain)
- [Vercel — solução de problemas de domínio e e-mail](https://vercel.com/docs/domains/troubleshooting)
- [HostGator — acessar a Zona DNS](https://suporte.hostgator.com.br/hc/pt-br/articles/30813666911123-Como-acessar-a-Zona-DNS-de-um-dom%C3%ADnio)
- [HostGator — criar ou alterar A, MX, TXT e CNAME](https://suporte.hostgator.com.br/hc/pt-br/articles/30813120385427-Como-criar-ou-alterar-um-registro-A-MX-TXT-CNAME-e-outros-na-Zona-DNS)
- [HostGator — domínio registrado aqui e hospedado em outra plataforma](https://suporte.hostgator.com.br/hc/pt-br/articles/30810621770387-Como-configurar-o-DNS-de-um-dom%C3%ADnio)
- [Google Workspace — registros MX do Gmail](https://support.google.com/a/answer/140034)
- [Supabase — SMTP customizado](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase — login com Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Resend — verificação de domínio](https://resend.com/docs/dashboard/domains/introduction)
- [Resend — evitar conflito entre registros MX](https://resend.com/docs/knowledge-base/how-do-i-avoid-conflicting-with-my-mx-records)

