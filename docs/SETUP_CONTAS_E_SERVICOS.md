# O que você precisa cadastrar

**Guia prático para o Gabriel · sem jargão**

```
Escrito em: 02/09/2026
```

> Cada item aqui é uma conta ou configuração que **só você pode criar** — precisa do CNPJ,
> do cartão da empresa ou do e-mail institucional. Eu não consigo fazer nenhuma delas por
> você.
>
> Faça **na ordem**. Cada bloco diz o que desbloqueia, quanto custa e o que me mandar
> quando terminar.
>
> ⚠️ **Nunca me mande senha nem chave secreta pelo chat.** Onde eu precisar de um valor
> secreto, o caminho é você mesmo colar direto na Vercel. Eu digo onde.

---

## Ordem recomendada

| # | O quê | Desbloqueia | Tempo | Custo |
|---|---|---|---|---|
| 1 | **Supabase** — banco de dados | M1 (tudo) | 15 min | Grátis para começar |
| 2 | **Google Cloud** — login com Google | M2 | 30 min | Grátis |
| 3 | **Resend** — e-mail de verificação | M2, M3 | 20 min + DNS | Grátis até 3 mil/mês |
| 4 | **Mercado Pago** — credenciais de API | M5 | 20 min | Taxa por transação |
| 5 | **Correios** — contrato de API | M6 | dias | Contrato |
| 6 | **Advogado** — dois pareceres | M3 e M5 | dias | Honorários |

**O item 1 destrava todo o resto.** Se fizer só um hoje, faça esse.

---

# 1. Supabase — o banco de dados

**Para quê:** hoje os dados vivem num arquivo só, que some quando o servidor reinicia. O
Supabase é o banco de verdade: guarda usuários, moedas, ofertas e negociações em tabelas.
Também vai cuidar do login e dos vídeos da estação.

### Passo a passo

1. Vá em **supabase.com** e crie conta com o e-mail institucional
   (`gabriel.silva@aureacustodia.com.br`) — não com e-mail pessoal
2. **New project**
3. Preencha:
   - **Name:** `aurea-custodia`
   - **Database Password:** clique em **Generate a password** e **guarde no gerenciador de
     senhas**. Você vai precisar dela e ela não é mostrada de novo
   - **Region:** `South America (São Paulo)` — mais perto, mais rápido
   - **Plan:** Free
4. Espere uns dois minutos enquanto ele cria

### O que me mandar

Em **Project Settings → Data API** e **Database**, copie:

| Campo | Onde está | Pode mandar no chat? |
|---|---|---|
| Project URL | Data API | ✅ Sim |
| `anon` public key | Data API | ✅ Sim (é pública por design) |
| `service_role` key | Data API | ❌ **NÃO.** Cole direto na Vercel |
| Connection string | Database → Connection string → URI | ❌ **NÃO.** Cole direto na Vercel |

### Onde colar os secretos

**Vercel → projeto `aurea-custodia-mvp` → Settings → Environment Variables:**

| Nome | Valor | Ambientes |
|---|---|---|
| `POSTGRES_URL` | a connection string | Production, Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | a service_role key | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_URL` | o Project URL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | a anon key | Production, Preview, Development |

> Na connection string há um `[YOUR-PASSWORD]` — troque pela senha do passo 3.

> **Bônus:** assim que `POSTGRES_URL` existir, a plataforma passa a usar Postgres em vez do
> Redis atual, e o problema de concorrência ([RA-08](../RISCOS_ASSUMIDOS.md#ra-08)) some.

---

# 2. Google Cloud — login com Google

**Para quê:** o botão "Continuar com Google". Google e Supabase precisam se reconhecer.

### Passo a passo

1. **console.cloud.google.com** → **New Project** → nome `Aurea Custodia`
2. **APIs & Services → OAuth consent screen**
   - **External**
   - App name: `Áurea Custódia`
   - Support email e Developer contact: seu e-mail institucional
   - Authorized domain: `aureacustodia.com.br`
3. **Credentials → Create Credentials → OAuth client ID**
   - Type: **Web application**
   - **Authorized redirect URI:** cole aqui a URL que o Supabase mostra em
     **Authentication → Providers → Google**. É algo como
     `https://xxxxx.supabase.co/auth/v1/callback`
4. Copie **Client ID** e **Client Secret**
5. Volte ao Supabase → **Authentication → Providers → Google** → cole os dois → **Enable**

### O que me mandar

Só um recado: **"Google configurado"**. As chaves ficam entre Google e Supabase — eu não
preciso vê-las.

> ⚠️ Enquanto o app estiver em **Testing** no Google, só e-mails que você listar em **Test
> users** conseguem entrar. Para abrir ao público, precisa publicar — e aí o Google pede os
> termos de uso e a política de privacidade (item 6).

---

# 3. Resend — e-mail de verificação

**Para quê:** confirmar o e-mail de quem se cadastra. Sem isso, qualquer um cadastra com
e-mail de outra pessoa.

### Passo a passo

1. **resend.com** → conta com e-mail institucional
2. **Domains → Add Domain** → `aureacustodia.com.br`
3. O Resend mostra **três registros DNS** (SPF, DKIM e DMARC). Você precisa cadastrá-los no
   painel de onde o domínio está registrado (Registro.br, ou onde estiver)
4. Espere a verificação — de minutos a algumas horas
5. **API Keys → Create API Key** → permissão **Sending access**

### O que me mandar

**"Resend verificado"** — e cole a API key direto na Vercel como `RESEND_API_KEY`
(Production e Preview).

> **Por que os três registros DNS importam:** sem eles o e-mail cai em spam. E-mail de
> confirmação que não chega é cadastro que não acontece — o cliente acha que o site está
> quebrado.

---

# 4. Mercado Pago — credenciais de API

**Para quê:** receber depósito de verdade. Hoje o depósito é faz-de-conta.

## 🔴 Antes de ligar isto em produção, leia

Pela decisão de 02/09, a Áurea vai **receber o dinheiro do cliente, guardar na conta da
empresa e depois distribuir**. Isso pode configurar arranjo ou conta de pagamento sob
regulação do Banco Central.

**Não é impedimento — é uma pergunta que precisa de resposta do advogado (item 6) antes do
primeiro real entrar.** Construir e testar em sandbox é seguro. Ligar em produção não é.

### Passo a passo

1. **mercadopago.com.br/developers** → entre com a conta da empresa
2. **Suas integrações → Criar aplicação** → nome `Áurea Custódia`
3. Você vai encontrar **dois pares** de credenciais:
   - **Credenciais de teste** (sandbox) — para desenvolver
   - **Credenciais de produção** — dinheiro real
4. Copie **Public Key** e **Access Token** dos dois pares

### O que me mandar

**"Mercado Pago criado"**. Cole na Vercel:

| Nome | Valor | Ambientes |
|---|---|---|
| `MP_ACCESS_TOKEN_TEST` | Access Token de teste | Preview, Development |
| `MP_ACCESS_TOKEN` | Access Token de produção | Production |
| `MP_WEBHOOK_SECRET` | (eu digo depois de configurar o webhook) | Production, Preview |

> **Uma conta bancária separada para o dinheiro dos clientes.** O dinheiro que é dos
> clientes não pode ficar misturado ao caixa da empresa — é o mínimo que qualquer parecer
> vai pedir, e é mais fácil começar certo do que separar depois.

---

# 5. Correios — contrato de API

**Para quê:** gerar etiqueta e rastrear envio dentro da plataforma.

**É o item mais demorado** — envolve contrato comercial, não só cadastro.

### Passo a passo

1. Procure uma agência ou o comercial dos Correios e peça **contrato de cliente com acesso
   às APIs**
2. Peça explicitamente acesso a: **cálculo de preço e prazo**, **emissão de etiqueta** e
   **rastreamento**
3. Você recebe: número do contrato, cartão de postagem, usuário e senha da API

### As três restrições que já estão no plano

Registradas porque você marcou como muito importante:

1. **Declarar como moeda colecionável**
2. **PAC ou SEDEX**
3. **Nunca carta comum** — o regimento permite confisco de dinheiro circulável em carta

A terceira vira trava no código: carta não será uma opção selecionável, nem por requisição
forjada.

### O que me mandar

**"Contrato dos Correios ativo"**. As credenciais vão direto para a Vercel.

---

# 6. Advogado — dois pareceres

**Para quê:** dois assuntos travam funcionalidades inteiras, e nenhum é técnico.

### Parecer A — saldo interno *(trava o M5)*

> "Uma plataforma que recebe depósitos de clientes, mantém saldo em nome deles e liquida
> negociações entre eles usando esse saldo configura arranjo de pagamento ou conta de
> pagamento sob a regulação vigente do Banco Central? Se sim, quais obrigações decorrem?"

Se a resposta trouxer obrigações pesadas, existe a alternativa: **liquidação direta com
split** — o gateway divide o pagamento na hora e a Áurea nunca guarda dinheiro. Era a
decisão anterior; foi trocada porque quebrava a compra instantânea.

### Parecer B — termos de uso e privacidade *(trava o cadastro público do M3)*

Precisamos de **termos de uso** e **política de privacidade** escritos. Cadastrar usuário é
coletar dado pessoal, e a LGPD exige finalidade declarada e base legal.

Peça também orientação sobre **política de retenção** de fotos e dados pessoais.

> A landing page pode ser construída antes. **O cadastro não pode ser aberto ao público**
> antes dos dois documentos existirem, com aceite registrado no momento do cadastro.

---

## Perguntas que eu preciso que você responda

Não são cadastros — são informações que eu não tenho e não posso inventar.

### Para a landing page

| Pergunta | Por quê |
|---|---|
| 🔴 **Existe seguro sobre o acervo custodiado?** | É a pergunta nº 1 de quem entrega uma moeda de R$ 500. **Não afirmo cobertura que não sei se existe** |
| Texto institucional oficial | O que eu escrever é rascunho meu, não a voz da marca |
| Fotos do cofre ou das instalações | Página de custódia sem imagem do lugar convence menos |
| Endereço e canal de atendimento | Rodapé de plataforma financeira costuma exigir |

### Para o M2

| Pergunta | Contexto |
|---|---|
| As 7 contas de teste **migram ou são recriadas**? | Elas têm e-mail fictício que não recebe mensagem, o que impede verificação. **Recomendo recriar** com os e-mails reais dos sócios |

### Para o M5

| Pergunta | Contexto |
|---|---|
| Como o cliente **saca**? | Pix para chave dele, transferência, ou os dois? |
| Há **prazo de retenção** antes do primeiro saque? | Comum em plataforma financeira, contra fraude |
| **Teto de depósito por período** e de saldo acumulado? | Hoje é R$ 100.000 por operação, sem limite de repetição |
| Taxa de custódia vira **débito automático** do saldo? | Hoje é registrada e nunca cobrada |

---

## Resumo: o mínimo para eu começar amanhã

☐ **Supabase criado** e as quatro variáveis na Vercel

Só isso destrava o M1, que é a fundação de tudo. Os demais podem vir conforme cada módulo
chegar.
