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
| **Senha do banco** | Gerada pelo próprio Supabase | Ela só é mostrada **uma vez**. Perdida, só resetando |
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
| **Database Password** | Clique em **Generate a password** |
| **Region** | ⚠️ **`South America (São Paulo)`** |
| **Plan** | Free |

## ⚠️ A senha — o passo que mais dá problema

Clique em **Generate a password** e **copie para o seu gerenciador de senhas antes de
continuar**. O Supabase mostra essa senha **uma única vez**.

Ela vai aparecer dentro da connection string, no lugar de `[YOUR-PASSWORD]`. Sem ela, a
aplicação não conecta.

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

Aqui está o detalhe técnico que decide se o **motor de casamento de ordens** vai funcionar.
Preciso de **duas** strings diferentes, e elas servem para coisas diferentes.

Vá em **Project Settings → Database → Connection string**.

Você vai ver algumas opções. As que importam:

## A) Transaction pooler — porta **6543**

```
postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

**É esta que a aplicação usa no dia a dia.** Vai na Vercel como `POSTGRES_URL`.

**Por quê:** na Vercel, cada requisição pode subir uma função nova, e cada uma abriria sua
própria conexão com o banco. O plano Free do Supabase aguenta poucas conexões diretas — sem
o pooler, um pico de acessos derruba o banco por esgotamento. O pooler reaproveita um punhado
de conexões entre todas as funções.

## B) Direct connection — porta **5432**

```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres
```

**Esta é só para criar e alterar tabelas** (as *migrations*). Vai na Vercel como
`POSTGRES_URL_DIRECT`.

**Por quê:** o pooler da porta 6543 não suporta alguns comandos que criação de tabela usa.
É o padrão da indústria ter as duas: uma para o dia a dia, outra para mudanças de estrutura.

> **Em ambas, troque `[YOUR-PASSWORD]` pela senha do Passo 2.** Ela não vem preenchida.

> **O que eu cuido do lado do código:** o pooler em modo transação não aceita *prepared
> statements* nomeados, e o driver `pg` que o projeto usa precisa ser configurado para isso.
> Já está mapeado no M1 — você não precisa fazer nada a respeito.

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
Variáveis POSTGRES_URL e POSTGRES_URL_DIRECT coladas na Vercel.
Exposed schemas: public (sem "aurea")
```

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
