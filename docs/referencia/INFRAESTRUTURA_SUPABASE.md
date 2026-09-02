# Infraestrutura Supabase — dados de conexão

**Referência de configuração · sem segredos**

```
Criado em:  02/09/2026
Projeto:    aurea-custodia
Referência: vjbqikfamqdttbmaqrxf
Região:     sa-east-1 — South America (São Paulo) ✅
Plano:      Free
```

> ⚠️ **Este documento NÃO contém a senha do banco, e não deve conter.** O repositório está
> público; senha commitada aqui é varrida por bots em minutos e fica permanente no histórico
> do git. A senha vive em dois lugares: no gerenciador de senhas do Gabriel e nas variáveis
> de ambiente da Vercel (criptografadas).

---

## Os parâmetros de conexão

Todos públicos — nenhum deles serve para nada sem a senha.

| Parâmetro | Valor |
|---|---|
| **Host** | `aws-0-sa-east-1.pooler.supabase.com` |
| **Database** | `postgres` |
| **User** | `postgres.vjbqikfamqdttbmaqrxf` |
| **Porta — aplicação** | `6543` (transaction pooler) |
| **Porta — migrations** | `5432` (session pooler) |

**A região confere:** `sa-east-1` é São Paulo, o mesmo datacenter das funções da Vercel
(`gru1`, fixado em `vercel.json`). Banco e aplicação no mesmo lugar.

---

## As duas variáveis de ambiente

Na Vercel, projeto `aurea-custodia-mvp` → **Settings → Environment Variables**:

| Variável | Porta | Ambientes | Para quê |
|---|---|---|---|
| `POSTGRES_URL` | 6543 | Production, Preview | O dia a dia da aplicação |
| `POSTGRES_URL_DIRECT` | 5432 | Production, Preview | Criar e alterar tabelas |

Ambas marcadas como **Sensitive**.

### O formato

```
postgresql://postgres.vjbqikfamqdttbmaqrxf:SENHA@aws-0-sa-east-1.pooler.supabase.com:PORTA/postgres
```

### ⚠️ A senha precisa ser percent-encoded

A senha atual contém caracteres especiais. Na connection string eles **não** vão como
digitados — precisam ser codificados, ou a conexão falha com erro de autenticação e o
sintoma engana (parece senha errada).

| Caractere | Vira |
|---|---|
| `!` | `%21` |
| `@` | `%40` |
| `#` | `%23` |
| `$` | `%24` |
| `%` | `%25` |
| `&` | `%26` |
| `/` | `%2F` |
| `:` | `%3A` |
| `?` | `%3F` |

O próprio painel do Supabase avisa disso na tela de conexão.

### ⚠️ O caso concreto desta senha (02/09/2026)

A senha atual foi gravada no Supabase **com os caracteres `%21` literais** — ou seja, ela
contém o sinal `%`. E `%` é justamente o caractere de escape da URL. Consequência:

| Senha real (como está no Supabase) | Como vai na connection string |
|---|---|
| `...%21%21...` | `...%2521%2521...` |

**Colar a senha como está** faz o driver decodificar `%21` para `!` e a autenticação falha —
foi exatamente o que aconteceu na primeira tentativa. Cada `%` precisa virar `%25`.

Verificado em 02/09/2026, das duas portas, a partir da máquina de desenvolvimento: com
`%2521%2521` conecta; com `%21%21` falha.

**A forma de nunca mais ter esse problema:** na rotação final (RA-12), usar **Generate a
password** no Supabase — a senha gerada tem só letras e números, e a string de conexão não
precisa de codificação nenhuma.

---

## Por que duas portas, e não uma

**6543 — Transaction pooler.** Na Vercel cada requisição pode subir uma função nova, e cada
uma abriria sua própria conexão. O plano Free aguenta poucas conexões simultâneas; sem o
pooler, um pico de acessos derruba o banco por esgotamento.

**5432 — Session pooler.** O pooler em modo transação recusa alguns comandos de criação e
alteração de tabela. O session pooler se comporta como conexão direta e os aceita.

### Por que não a "Direct connection"

O Supabase oferece uma terceira opção, `db.vjbqikfamqdttbmaqrxf.supabase.co:5432`. **Ela
responde apenas em IPv6**, salvo com o adicional pago de IPv4. Em rede que não fala IPv6 o
sintoma é falha de conexão sem explicação.

**Regra prática:** se o host da string não terminar em `pooler.supabase.com`, é a opção
errada.

---

## Configuração de segurança do projeto

### Exposed schemas

Em **Project Settings → Data API → Exposed schemas** deve constar apenas `public` (e
`graphql_public`, se aparecer).

**Por quê:** o Supabase publica automaticamente uma API na internet para os schemas
expostos, acessível pela chave `anon` — que é pública por design e ficaria visível no
repositório aberto. As tabelas da plataforma serão criadas no schema **`aurea`**, que não
entra nessa lista. A aplicação fala por conexão direta ao Postgres, que ignora essa camada.

**Sem isso:** qualquer pessoa lendo o repositório leria e alteraria saldos, ofertas e
negociações por fora da plataforma.

### Rotação da senha

Resetar em **Settings → Database → Database password → Reset database password**.

Depois de resetar, **atualizar as duas variáveis na Vercel** e fazer Redeploy — a variável
antiga continua valendo até o build seguinte.

> **Pendência registrada:** a senha atual passou por chat durante a configuração. Recomendado
> rotacioná-la uma vez depois que o ambiente estiver estável, colando a nova apenas na
> Vercel.

---

## O que ainda não está configurado

| Item | Quando | Módulo |
|---|---|---|
| `anon` e `service_role` keys | Só com o login | M2 |
| Google OAuth no Supabase Auth | Idem | M2 |
| Supabase Storage (vídeos da estação) | Depois | Frente E |
| Backup diário (exige plano Pro) | Antes de cliente real | — |

---

## Efeito de ligar o `POSTGRES_URL`

A plataforma escolhe o banco sozinha, por ordem de prioridade
(`src/server/store/index.ts`): Postgres → Redis → memória.

**No momento em que `POSTGRES_URL` existir e um deploy novo subir**, a aplicação troca do
Redis (Upstash KV, ativo hoje) para o Supabase. O banco novo nasce vazio e semeia do zero:
saldos, anúncios abertos e senhas trocadas das sete contas voltam ao seed.

É esperado. **Avisar os sócios antes.**

Efeito colateral bom: o risco [RA-08](../../RISCOS_ASSUMIDOS.md#ra-08) — concorrência sem
garantia sob Redis — some no mesmo instante, sem código nenhum.
