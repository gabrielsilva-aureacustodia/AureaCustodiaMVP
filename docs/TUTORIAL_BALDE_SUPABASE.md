# Tutorial — o balde de vídeos no Supabase

```
Para:        Gabriel
Escrito em:  10/09/2026
Tempo:       10 minutos
Projeto:     vjbqikfamqdttbmaqrxf (Áurea Custódia)
```

> **O que este passo faz.** Cria o lugar na nuvem onde os vídeos das análises ficam
> guardados, e dá ao site a chave para assinar os envios.
>
> **O que acontece se você adiar.** A bancada funciona igual: grava o vídeo no disco do
> notebook, pesa, julga e emite o recibo. Só o vídeo não sobe, e o cliente não consegue
> reassistir. Isso é deliberado (RA-23) — falta de balde não pode impedir uma moeda de ser
> analisada, com ela já fora da cápsula, na mesa.

---

## O estado hoje, conferido agora

| | |
|---|---|
| Schema `storage` no seu projeto | ✅ existe |
| Baldes criados hoje | **nenhum** — o `analises` ainda não existe |
| `SUPABASE_SERVICE_ROLE_KEY` na Vercel | você precisa conferir; instruções na Parte 2 |

> Eu tentei criar o balde por você direto no banco. **A escrita foi bloqueada pelo
> classificador de segurança da minha ferramenta**, e não vou contornar isso. Por isso a
> Parte 1 tem dois caminhos: o do painel e o do comando pronto para colar. Os dois dão no
> mesmo resultado — escolha um.

---

# Parte 1 — Criar o balde `analises`

## Caminho A — Colar um comando (recomendado, 1 minuto)

É o caminho mais confiável porque não depende de nome de botão nem de posição de menu, que
mudam com as versões do painel.

**1.** Abra o editor de SQL do seu projeto:

```
https://supabase.com/dashboard/project/vjbqikfamqdttbmaqrxf/sql/new
```

**2.** Cole isto **exatamente como está**, e clique em **Run**:

```sql
insert into storage.buckets (id, name, public)
values ('analises', 'analises', false)
on conflict (id) do nothing;

select id, name, public, created_at from storage.buckets where id = 'analises';
```

**3.** O resultado precisa mostrar uma linha assim:

| id | name | public | created_at |
|---|---|---|---|
| `analises` | `analises` | **`false`** | (a data de hoje) |

**A coluna `public` tem que estar em `false`.** É o único ponto deste tutorial em que errar
importa de verdade — explicação na caixa amarela mais abaixo.

Rodar duas vezes não faz mal: o `on conflict do nothing` faz a segunda execução não fazer
nada.

## Caminho B — Pelo painel

**1.** Abra:

```
https://supabase.com/dashboard/project/vjbqikfamqdttbmaqrxf/storage/buckets
```

**2.** Clique em **New bucket**.

**3.** No campo de nome, digite exatamente:

```
analises
```

Tudo minúsculo, sem acento, sem espaço. O nome entra no caminho dos arquivos e o site
procura por ele com esse texto exato.

**4.** **Deixe o balde PRIVADO.** O diálogo tem uma chave/interruptor de **Public bucket** —
ela precisa ficar **desligada**. Em algumas versões do painel ele já nasce privado e a opção
aparece como "Public bucket: off"; em outras é você que desliga.

**5.** Se aparecer uma seção de configuração adicional com **limite de tamanho de arquivo**
e **tipos MIME permitidos**, **não preencha nenhuma das duas.** Deixe em branco. Um limite
apertado ou um tipo MIME restrito é uma trava que só se manifesta na primeira gravação que
falha — e aí a moeda já está na mesa.

**6.** Clique em **Create bucket**.

> Os nomes dos botões acima vêm da documentação vigente do Supabase. Se a sua tela estiver
> um pouco diferente, o que importa é o resultado: um balde chamado `analises`, com acesso
> **privado**. Depois de criar, dá para conferir pelo Caminho A — cole só a linha do
> `select` e veja se `public` está `false`.

---

> ⚠️ **Por que privado importa mais aqui do que em qualquer outro lugar do projeto.**
>
> Balde público, no Supabase, significa que **qualquer pessoa com o endereço do arquivo
> abre o arquivo** — sem login, sem token, sem nada. O vídeo da análise mostra a mesa, as
> mãos do operador e, se o ritual de bancada falhar num dia corrido, a etiqueta dos
> Correios com o endereço residencial do cliente.
>
> Vídeo gravado errado não se desgrava. Balde público não é configuração inconveniente: é
> incidente de LGPD esperando o dia em que alguém indexar a URL.

---

# Parte 2 — A chave de serviço

## 2.1 — Descobrir se ela já está na Vercel

Antes de copiar chave nenhuma, confira se já existe. Abra:

```
https://vercel.com/dashboard
```

Projeto **aurea-custodia-mvp** → **Settings** → **Environment Variables**, e procure na
lista por `SUPABASE_SERVICE_ROLE_KEY`.

**Se já estiver lá**, pule para a Parte 3.

## 2.2 — Copiar do Supabase

**1.** Abra:

```
https://supabase.com/dashboard/project/vjbqikfamqdttbmaqrxf/settings/api-keys
```

**2.** O Supabase hoje mostra **quatro** chaves, e só uma serve aqui:

| Chave | Formato | Serve? |
|---|---|---|
| **Secret key** | começa com `sb_secret_` | ✅ **é esta**, se existir |
| **`service_role`** | texto longo em três partes separadas por ponto | ✅ use se não houver Secret key |
| **Publishable key** | começa com `sb_publishable_` | ❌ não consegue assinar upload |
| **`anon`** | três partes separadas por ponto | ❌ não consegue assinar upload |

O Supabase está migrando do formato antigo (`anon` / `service_role`, que são JWTs) para o
novo (`sb_publishable_` / `sb_secret_`). Os dois formatos funcionam no código da estação —
o que importa é ser a de **privilégio elevado**, não o formato.

**3.** Clique no olho, em **Reveal** ou em **Copy** para ver o valor, e copie **inteiro**.

Chave copiada pela metade é o erro mais comum aqui, e ele não se parece com a causa: o
upload falha com uma mensagem genérica de assinatura.

> ⚠️ **Esta chave dá acesso total ao seu projeto Supabase** — ela ignora as regras de
> segurança de linha de todas as tabelas. Ela vai **só para a Vercel** e **nunca** para o
> notebook da bancada. O programa da estação nunca a vê: ele recebe do site apenas uma URL
> já assinada, válida para um arquivo só.

---

# Parte 3 — Cadastrar as variáveis na Vercel

Caminho: `https://vercel.com/dashboard` → projeto **aurea-custodia-mvp** → **Settings** →
**Environment Variables** (barra lateral) → formulário **Add New**.

São até três variáveis. Em **todas**, marque os três ambientes: **Production**, **Preview**
e **Development**. Clique em **Save** depois de cada uma.

### Variável 1 — a chave de serviço

**Name:**

```
SUPABASE_SERVICE_ROLE_KEY
```

**Value:** a chave que você copiou na Parte 2, inteira, sem aspas e sem espaço nas pontas.

### Variável 2 — o nome do balde

**Name:**

```
SUPABASE_STORAGE_BUCKET
```

**Value:**

```
analises
```

### Variável 3 — o endereço do projeto (só se faltar)

Procure na lista se já existe `SUPABASE_URL` **ou** `NEXT_PUBLIC_SUPABASE_URL`. Se
**nenhuma** das duas estiver lá, cadastre:

**Name:**

```
SUPABASE_URL
```

**Value:**

```
https://vjbqikfamqdttbmaqrxf.supabase.co
```

> Esse endereço não foi chutado: ele vem da referência `vjbqikfamqdttbmaqrxf`, que está no
> usuário `postgres.vjbqikfamqdttbmaqrxf` da string de conexão que já funciona. Testei a
> URL e ela responde.

## E então republique — este passo é obrigatório

A documentação da Vercel é literal: *"Changes to environment variables are not applied to
previous deployments, they only apply to new deployments. You must redeploy your project."*

**Deployments** → o deploy mais recente → menu **⋯** → **Redeploy**.

Variável salva sem Redeploy não vale para o site que está no ar. É a causa mais comum de
"eu configurei e continua dando erro".

---

# Parte 4 — Conferir que pegou

## Pelo terminal

Troque `COLE_A_CHAVE_DA_ESTACAO` pelos 64 caracteres do `AUREA_ESTACAO_TOKEN`:

```bash
curl -s -H "Authorization: Bearer COLE_A_CHAVE_DA_ESTACAO" -H "Content-Type: application/json" -d "{\"protocolo\":\"TESTE\",\"arquivo\":\"teste.webm\"}" https://aurea-custodia-mvp.vercel.app/api/estacao/video/url
```

| Resposta | O que significa | O que fazer |
|---|---|---|
| `{"url":"https://vjbq...","token":"...","caminho":"TESTE/teste.webm","bucket":"analises"}` | ✅ Está tudo certo | Nada |
| `{"error":"Upload de vídeo não configurado: falta SUPABASE_SERVICE_ROLE_KEY."}` | A resposta **diz o nome exato da variável que falta** | Cadastre e **republique** |
| `{"error":"Falha ao assinar a URL de upload."}` | A chave chegou mas foi recusada, ou o balde não existe | Confira se copiou a chave inteira e se é a de privilégio elevado; confira o balde pela Parte 1 |
| `{"error":"A estação não está habilitada neste ambiente..."}` | Falta o `AUREA_ESTACAO_TOKEN` | É outro passo, não este |
| `404` | O código ainda não foi publicado | Publique primeiro |

## Pela bancada

Grave 10 segundos num procedimento e pare. O texto abaixo do vídeo responde sozinho:

| O que aparece | O que significa |
|---|---|
| *"Gravação salva no disco e enviada para o armazenamento."* | ✅ O balde está funcionando |
| *"Gravação salva no disco. Ainda não subiu: ..."* | O vídeo está seguro no notebook. O motivo vem escrito na própria frase |

## Pelo painel

Abra `https://supabase.com/dashboard/project/vjbqikfamqdttbmaqrxf/storage/buckets`, clique
em **analises**, e o arquivo precisa estar lá, dentro de uma pasta com o nome do protocolo
do envio.

---

# Uma coisa que pode aparecer no primeiro vídeo longo

O Supabase tem um **limite global de tamanho de upload por projeto**, definido nas
configurações de Storage e independente do balde. Nos planos gratuitos ele costuma ser
baixo o bastante para um vídeo de análise longo esbarrar nele.

Não deixei limite nenhum no balde justamente para o limite global ser o único a mandar — um
limite apertado no balde seria uma trava a mais para descobrir do jeito difícil.

**Se um vídeo grande falhar ao subir**, o sintoma é a bancada dizer *"Ainda não subiu"* com
o motivo mencionando tamanho. A gravação continua salva em `C:\AureaEstacao\analises\`, e a
solução é aumentar o limite nas configurações de Storage do projeto — ou gravar trechos mais
curtos.

---

# Resumo

```
1. Balde `analises`, PRIVADO   → o select mostra public = false
2. Chave de privilégio elevado → SUPABASE_SERVICE_ROLE_KEY na Vercel
3. SUPABASE_STORAGE_BUCKET     → analises
4. Redeploy                    → senão nada disso vale
5. curl na rota do vídeo       → devolve url + token
```
