# Supabase — o passo a passo detalhado

**Guia para o Gabriel · o que criar, como configurar e o que me mandar**

```
Escrito em: 02/09/2026
Destrava:   M1 (fundação do banco) e, depois, M2 (login)
Tempo:      ~20 minutos
Custo:      Grátis no plano Free
```

> Este é o detalhamento do item 1 de [`SETUP_CONTAS_E_SERVICOS.md`](SETUP_CONTAS_E_SERVICOS.md).
> Ele existe separado porque **três escolhas aqui não podem ser desfeitas depois** — e uma
> delas, a região, é impossível de corrigir sem recriar o projeto inteiro.

## As três escolhas irreversíveis

| Escolha | O valor certo | Por que não dá para mudar depois |
|---|---|---|
| **Região** | `South America (São Paulo)` | A região de um projeto Supabase é fixa. Errar significa recriar do zero |
| **Senha do banco** | Gerada pelo Supabase | Só é mostrada uma vez — mas **dá para resetar** (ver Passo 2) |
| **Organização** | A da empresa, não pessoal | Mover projeto entre organizações é trabalhoso |

---

# Passo 1 — Criar a conta

Vá em **[supabase.com](https://supabase.com)** e crie a conta com o **e-mail institucional**
(`gabriel.silva@aureacustodia.com.br`), não com e-mail pessoal.

**Por quê:** a conta que cria o projeto é a dona dele. Se um dia a conta pessoal for perdida
ou você sair, o banco da empresa fica preso a ela. Com e-mail institucional, o acesso segue
a empresa.

Se ele pedir para criar uma **organização**, use `Aurea Custodia`.

---

# Passo 2 — Criar o projeto

**New project**, e preencha:

| Campo | O que colocar |
|---|---|
| **Name** | `aurea-custodia` |
| **Database Password** | Se o campo aparecer: **Generate a password**. **Se não aparecer, é normal** — resolve abaixo |
| **Region** | ⚠️ **`South America (São Paulo)`** |
| **Plan** | Free |

## ⚠️ A senha — e o que fazer se o cadastro não perguntou

**O fluxo novo do Supabase pode não pedir a senha na criação** — ele gera uma nos bastidores
e não mostra. Se foi o seu caso, é normal e tem conserto em trinta segundos:

1. No projeto, ícone de engrenagem (**Settings**) na barra lateral
2. **Database**
3. Seção **Database password** → **Reset database password**
4. Clique em **Generate a password**, **copie para o gerenciador de senhas** e confirme

Essa é a senha do banco (`postgres`), **diferente** da senha com que você entra no painel do
Supabase.

Ela aparece dentro da connection string no lugar de `[YOUR-PASSWORD]`. Sem ela, a aplicação
não conecta — e resetar de novo é sempre possível, então senha perdida não é problema grave.

## ⚠️ A região — por que São Paulo, e por que eu confirmei isso hoje

Suas funções na Vercel **executavam em Washington** (o header `X-Vercel-Id` vinha como
`gru1::iad1`: entrava por São Paulo, processava nos EUA). Testei mover para São Paulo com um
deploy de preview: **funciona no seu plano**, e já commitei a mudança.

Com as funções em São Paulo e o banco em São Paulo, cada consulta é uma ida de poucos
milissegundos. Se o banco ficasse nos EUA, **cada consulta atravessaria o continente** — e
uma compra faz várias consultas dentro de uma transação. A diferença é entre a compra
parecer instantânea e parecer travada.

**Como a região do Supabase não pode ser trocada, errar aqui custa recriar o projeto.**

Depois de clicar em criar, espere uns dois minutos.

---

# Passo 3 — Pegar as duas connection strings

**Você NÃO precisa criar tabela nenhuma antes.** As connection strings existem desde o
momento em que o projeto foi criado — elas apontam para o banco, não para o conteúdo dele.

## Onde estão (o painel mudou de lugar)

Procure o botão **`Connect`** no **topo da página do projeto**. É o caminho atual; o antigo
(Settings → Database → Connection string) ainda funciona, mas o botão é mais direto.

Abre uma janela com abas. Você quer a aba de **Connection String**, e dentro dela há três
opções. **Precisamos de duas delas.**

## A) Transaction pooler — porta **6543**

```
postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-1-sa-east-1.pooler.supabase.com:6543/postgres
```

**É a que a aplicação usa no dia a dia.** Vai na Vercel como `POSTGRES_URL`.

**Por quê:** na Vercel cada requisição pode subir uma função nova, e cada uma abriria sua
própria conexão. O plano Free aguenta poucas conexões simultâneas — sem o pooler, um pico de
acessos derruba o banco por esgotamento. O pooler reaproveita um punhado de conexões entre
todas as funções.

## B) Session pooler — porta **5432**

```
postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-1-sa-east-1.pooler.supabase.com:5432/postgres
```

**Esta é para criar e alterar tabelas** (as *migrations*). Vai na Vercel como
`POSTGRES_URL_DIRECT`.

> ⚠️ **Session pooler, e não "Direct connection".** As duas parecem servir para a mesma
> coisa, e a diferença é armadilha conhecida: **a Direct connection do Supabase só responde
> em IPv6**, salvo se você comprar o adicional de IPv4. Muitas redes e plataformas
> serverless não falam IPv6, e o sintoma é uma falha de conexão que não explica o motivo.
>
> O **Session pooler funciona em IPv4** e se comporta como uma conexão direta — aceita os
> comandos de criação de tabela que o Transaction pooler recusa. É o caminho certo aqui.

## Como reconhecer cada uma

| | Transaction pooler | Session pooler |
|---|---|---|
| Porta | **6543** | **5432** |
| Host | `...pooler.supabase.com` | `...pooler.supabase.com` |
| Vai em | `POSTGRES_URL` | `POSTGRES_URL_DIRECT` |

As duas têm `pooler.supabase.com` no endereço — **o que as distingue é a porta**. Se o host
for `db.xxxxx.supabase.co`, você pegou a Direct connection: volte e escolha o Session pooler.

> **Em ambas, troque `[YOUR-PASSWORD]` pela senha do Passo 2.** Ela vem como texto literal,
> não preenchida.

> **O que eu cuido no código:** o pooler em modo transação não aceita *prepared statements*
> nomeados, e o driver `pg` do projeto precisa ser configurado para isso. Está mapeado no
> M1 — você não precisa fazer nada a respeito.

---

# Passo 4 — Onde colar

**Vercel → projeto `aurea-custodia-mvp` → Settings → Environment Variables.**

Para o **M1**, só estas duas:

| Nome | Valor | Ambientes |
|---|---|---|
| `POSTGRES_URL` | a string da porta **6543** | Production, Preview |
| `POSTGRES_URL_DIRECT` | a string da porta **5432** | Production, Preview |

Marque as duas como **Sensitive**, como já está o `SESSION_SECRET`.

As chaves de API do Supabase (`anon`, `service_role`) **só serão necessárias no M2**, quando
o login entrar. Deixe para depois — menos coisa para dar errado agora.

> ⚠️ **Não me mande essas strings pelo chat.** Elas contêm a senha do banco. Cole direto na
> Vercel; eu não preciso vê-las para trabalhar.

---

# Passo 5 — Uma configuração de segurança que eu peço para você conferir

Esta é a parte que mais me preocupa, e é rápida de resolver.

**O problema:** o Supabase publica automaticamente uma API na internet para as tabelas do
schema `public`. Qualquer tabela criada ali fica acessível por essa API usando a chave
`anon` — que é **pública por design** e, no nosso caso, ficaria visível porque **o
repositório está aberto**.

Sem proteção, isso significaria: qualquer pessoa lendo o repositório poderia ler e alterar
saldos, ofertas e negociações direto pela API, sem passar pela plataforma.

**A solução, e ela é simples:** eu vou criar as tabelas num schema separado, chamado
`aurea`, que **não é publicado nessa API**. A aplicação fala com o banco por conexão direta
(que ignora essa camada), então nada se perde.

**O que eu preciso que você confira** — em **Project Settings → Data API → Exposed schemas**:

- Deve conter apenas `public` (e `graphql_public`, se aparecer)
- **Não pode conter `aurea`**

Se o Supabase já vier assim (o padrão é esse), não faça nada. Só me confirme.

---

# O que me mandar quando terminar

Só isto, e nada secreto:

```
Supabase criado.
Região: South America (São Paulo)
POSTGRES_URL colada na Vercel (porta 6543, transaction pooler)
POSTGRES_URL_DIRECT colada na Vercel (porta 5432, session pooler)
Exposed schemas: public (sem "aurea")
```

Se qualquer passo travar, me diga **em qual tela você está e o que aparece** — o painel do
Supabase muda com frequência, e é mais rápido eu conferir a navegação atual do que você
procurar.

Com isso eu começo o M1 na mesma hora.

---

# Perguntas que você pode ter

**"E o banco que está rodando hoje?"**
Continua funcionando. A plataforma escolhe o banco sozinha, por ordem de prioridade: se
`POSTGRES_URL` existir, ela usa Postgres; senão, Redis; senão, memória. **No momento em que
você colar a variável, a aplicação passa a usar o Supabase** — e o ambiente recomeça do
seed, porque o banco novo nasce vazio.

**"Isso apaga os dados de teste?"**
Sim, e é esperado. Saldos, anúncios abertos e senhas trocadas das sete contas voltam ao
seed, exatamente como aconteceu na virada para a v6. **Avise os sócios antes de colar a
variável**, para ninguém achar que quebrou.

**"O plano Free aguenta?"**
Para sete sócios testando, com folga: 500 MB de banco e 5 GB de tráfego por mês. O limite
que chega primeiro é a **pausa por inatividade** — projeto Free sem acesso por uma semana é
pausado, e volta com um clique. Enquanto vocês estiverem testando toda semana, não acontece.

**"Preciso pagar quando?"**
Quando entrar cliente real. Aí o plano Pro (US$ 25/mês) traz backup diário, o que deixa de
ser opcional no dia em que o dado for de outra pessoa.

**"E se eu errar a região?"**
Me avise antes de colar as variáveis. Recriar o projeto nessa fase custa dez minutos;
descobrir depois de o banco estar em uso custa uma migração.

**"Preciso criar alguma tabela antes?"**
Não. As connection strings existem desde que o projeto existe — elas apontam para o banco,
não para o conteúdo dele. Todas as tabelas são criadas por mim no M1, por migration
versionada. Você não toca em SQL.

**"O painel não me deixou escolher senha na criação."**
É o fluxo novo do Supabase: ele gera uma nos bastidores e não mostra. Resolve em
**Settings → Database → Database password → Reset database password**. Ver Passo 2.

**"Qual a diferença entre Direct connection e Session pooler? As duas são porta 5432."**
A Direct connection só responde em **IPv6** (salvo com o adicional de IPv4 pago), e muita
rede não fala IPv6 — a falha aparece como erro de conexão sem explicação. O Session pooler
faz a mesma coisa por IPv4. **Use o Session pooler.**
