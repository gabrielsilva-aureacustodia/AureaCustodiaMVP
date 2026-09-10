# Dados da bancada, vídeos e identidade no Painel Administrativo

```
Projeto:     Áurea Custódia / Real Olímpico — frente E, fase 2
Escrito em:  10/09/2026
Companheiro: PLANO_EXECUTIVO_BANCADA_WEBAPP.md (nesta mesma pasta)
Estado:      desenho — três achados exigem decisão antes da execução
```

> **Para o Rogério, em um parágrafo.** Cada moeda que passa pela bancada gera um vídeo e um
> registro. Este documento responde três perguntas: **onde o vídeo fica e quem pode
> assistir**, **como cada registro se amarra à pessoa certa**, e **o que é gravado
> automaticamente sem ninguém precisar clicar**. Ele também aponta três coisas que hoje
> estão frouxas e ficam caras se forem consertadas depois que houver cliente real.

---

# Parte 1 — O vídeo

## 1.1 Onde ele está, exatamente

| | |
|---|---|
| Balde | `analises`, no projeto `vjbqikfamqdttbmaqrxf` |
| Acesso | **Privado** — conferido: `public = false` |
| Caminho | `<protocoloEnvio>/<protocoloEnvio>-<n>.webm` |
| Exemplo | `RO-ENV-0154/RO-ENV-0154-2.webm` |
| Cópia local | `C:\AureaEstacao\analises\RO-ENV-0154\` — fica lá mesmo depois de subir |

## 1.2 Por que o caminho usa o envio e não o código da moeda

O item E.7 da frente E manda organizar por código de moeda, e a razão é boa: usuário muda de
nome, moeda troca de dono, código não muda.

Só que **na hora de gravar, a moeda ainda não existe.** Ela nasce no fechamento da análise,
quando o veredito é conhecido — antes disso não há `RO-000042` para usar como pasta. O
protocolo do envio é o único identificador estável disponível no momento da câmera ligada, e
ele também nunca troca de dono.

**A ligação moeda → vídeo existe do mesmo jeito**, uma consulta:

```sql
select codigo_moeda, caminho_video, hash
  from aurea.analises
 where codigo_moeda = 'RO-000042';
```

E ela é melhor do que a pasta seria, porque `analises` também guarda o veredito, o peso, o
operador e o hash — tudo que o painel precisa mostrar junto do vídeo.

## 1.3 Balde privado significa que **não existe URL pública**

Isto muda o desenho do painel e é a parte que costuma ser descoberta tarde.

Num balde público, bastaria montar a URL e pôr num `<video src="…">`. Aqui não: **o Supabase
recusa** qualquer acesso sem autorização. Toda exibição precisa de uma **URL assinada de
leitura**, gerada pelo servidor e válida por tempo limitado.

**Rota nova a construir:**

```
GET /api/estacao/video/ver?moeda=RO-000042
GET /api/estacao/video/ver?analise=RO-ANL-0007
```

O servidor confere quem está pedindo, resolve o caminho pela tabela `analises`, chama
`createSignedUrl(caminho, segundos)` e devolve:

```json
{
  "url": "https://vjbqikfamqdttbmaqrxf.supabase.co/storage/v1/object/sign/analises/…?token=…",
  "expiraEm": 3600,
  "analise": "RO-ANL-0007",
  "moeda": "RO-000042",
  "gravadoEm": 1757520000000
}
```

O `<video>` do painel aponta para essa URL. Quando ela expira, pede outra. **Nunca** se
guarda a URL assinada no banco nem se manda por e-mail: ela é um passe temporário, não um
endereço.

> **Prazo sugerido: 1 hora.** Curto o bastante para um link vazado não virar acesso
> permanente, longo o bastante para o cliente assistir sem a página recarregar no meio.

## 1.4 Quem pode assistir — e a pergunta que ninguém fez ainda

| Quem | O que vê | Como o servidor decide |
|---|---|---|
| **Administrador** | Qualquer vídeo | `ehAdmin(sessão)` |
| **Dono da moeda** | Só os vídeos das moedas que estão no acervo dele | a moeda com aquele `codigo_moeda` está em `coins` com `owner_email` = sessão |
| **Qualquer outro** | Nada | 403 |
| **Sem sessão** | Nada | 401 |

> ⚠️ **A decisão que falta: e quando a moeda troca de dono?**
>
> O vídeo é a **procedência** da moeda — é o que prova que aquela peça foi conferida,
> pesada e encapsulada. Pela lógica do produto, ele acompanha a moeda: quem compra passa a
> poder assistir, e quem vendeu deixa de poder.
>
> Isso é o que a regra da tabela acima faz naturalmente, porque ela olha o dono **atual**.
> Mas vale confirmar com os sócios, porque tem um efeito colateral: **o vendedor perde
> acesso ao vídeo de uma análise que ele mesmo pagou.** Se isso não for aceitável, a
> alternativa é dar acesso a quem já foi dono — e aí a lista de quem pode assistir só
> cresce, para sempre.
>
> Recomendação: seguir o dono atual. É o comportamento que uma custódia de bem físico tem,
> e é o mais simples de explicar.

## 1.5 O que o painel mostra junto do vídeo

Tudo isso já está gravado; é só ler `aurea.analises`:

| Campo na tela | Coluna |
|---|---|
| Protocolo da análise | `protocolo` (`RO-ANL-0007`) |
| Moeda e recibo | `codigo_moeda`, `codigo_recibo` |
| Envio de origem | `protocolo_envio` |
| Peso aferido | `peso_mg` — dividir por 1000 para mostrar em gramas |
| Veredito | `veredito`, e `motivo_recusa` quando recusada |
| Quem operou / quem homologou | `operador`, `aprovador` |
| Caixa física | `caixa`, `posicao_caixa` — **só para administrador**, ver 1.6 |
| Quando | `validado_em` |
| Hash e o anterior | `hash`, `hash_anterior` |

**A tela do cliente deve mostrar o hash e deixar conferir.** É o ponto inteiro da corrente:
qualquer pessoa recalcula com a fórmula de `estacao/CONTRATO.md` e chega ao mesmo valor.

## 1.6 Duas coisas que não podem aparecer para o cliente

**O endereço físico da cápsula.** `caixa` e `posicao_caixa` dizem onde a moeda está guardada
no cofre. Isso é informação de segurança, e é interna — decisão registrada no questionário
D7e. A rota do cliente não devolve essas colunas; a do administrador devolve.

**A etiqueta dos Correios no quadro.** Se o ritual de bancada falhar, o vídeo carrega o
endereço residencial de quem enviou. **Um vídeo gravado errado não se desgrava.** Antes de
haver cliente real, isso exige política de retenção escrita — está no RA registrado e em
`PRE_LANCAMENTO_CLIENTES_REAIS.md`.

---

# Parte 2 — Identidade: o achado que muda o desenho

## 2.1 O retrato de hoje, conferido no banco

Você pediu que tudo fique atrelado a **UUID dos usuários**. Conferindo o repositório:

> ⚠️ **Não existe UUID nenhum na plataforma hoje.** A chave de junção de tudo é o
> **endereço de e-mail**, como texto.

```
aurea.users            email text PRIMARY KEY
aurea.coins            owner_email
aurea.envios           user_email
aurea.deposits         user_email
aurea.custody_charges  user_email
aurea.ledger_entries   user_email
aurea.payment_intents  user_email
aurea.audit_log        usuarios_afetados text[]  (e-mails)
aurea.analises         operador, aprovador       (e-mails)
```

Nenhuma migration cria coluna `uuid`. E o Supabase Auth **emite** um UUID por conta
(`auth.users.id`) — mas `provisionAuthenticatedUser()` recebe o e-mail, normaliza para
minúsculas e **descarta o id**.

## 2.2 O que isso custa

**1. Trocar o e-mail de alguém é trocar a identidade dele.** Não há renomeação: seria um
`UPDATE` coordenado em sete tabelas, dentro de uma transação, e qualquer uma esquecida
deixaria acervo órfão. Hoje ninguém trocou, então ninguém notou.

**2. O painel não consegue casar conta do Supabase com usuário da plataforma** a não ser
comparando textos de e-mail. Dois cadastros com grafias diferentes viram duas pessoas.

**3. `analise.operador` é texto digitado.** No `.exe`, quem escreve é o operador, na tela de
configuração — dá para escrever o e-mail de outro, e o hash sela essa afirmação como se
fosse verdade. É o RA-21 na prática.

## 2.3 O que fazer — e a armadilha que precisa ser evitada

**A mudança:** `aurea.users` ganha uma coluna nova.

```sql
alter table aurea.users
  add column if not exists auth_user_id uuid unique;
```

Preenchida no provisionamento, a partir do `user.id` que o Supabase Auth já devolve e que
hoje é jogado fora. **Nula** para as sete contas do seed, que não têm identidade no Auth.

**O e-mail continua sendo a chave primária.** Trocar a PK rippleria por sete tabelas, pelo
tipo `UserEmail` do domínio e por todo o código que indexa `state.users[email]` — é uma
refatoração que não se justifica agora. O UUID entra como **identidade durável ao lado**, e
vira a chave preferida em tudo que for novo.

> ⚠️ **A armadilha: NÃO troque o `operador` do hash por UUID.**
>
> `operador` e `aprovador` são dois dos quinze campos de `CAMPOS_DA_ANALISE`. A lista está
> **congelada** e travada por um teste com vetor escrito à mão. Trocar o conteúdo desses
> campos de e-mail para UUID faria **todo recibo já emitido deixar de conferir** — o hash
> gravado não bateria mais com o hash recalculado, e a corrente inteira apareceria como
> adulterada.
>
> **O caminho certo:** o hash continua selando o e-mail, que é o que foi assinado. O UUID
> entra em **colunas novas** de `aurea.analises`, fora da fórmula:
>
> ```sql
> alter table aurea.analises
>   add column if not exists operador_id  uuid,
>   add column if not exists aprovador_id uuid;
> ```
>
> Assim o painel consegue juntar por UUID, e nenhum recibo é invalidado. Acrescentar coluna
> em `Analise` sem tocar em `CAMPOS_DA_ANALISE` é seguro por construção — está escrito no
> cabeçalho de `src/domain/analise.ts`.

## 2.4 O que a sessão resolve de graça

No painel, quem opera está **logado**. O `operador` deixa de ser digitado e passa a vir do
cookie assinado: uma afirmação verificada em vez de uma declaração.

Isso **paga metade do RA-21 sem tocar na fórmula**, porque o campo `aprovador` já está
separado do `operador` desde o primeiro dia — exatamente para o dia em que a segregação de
função chegar.

---

# Parte 3 — O que é gravado automaticamente

## 3.1 O que já acontece hoje, sem ninguém clicar

Fechar uma análise dispara, **numa única transação**:

1. As moedas aprovadas nascem em `aurea.coins`, com recibo em `aurea.nfts`
2. Cada procedimento vira uma linha em `aurea.analises`, **encadeada** na anterior
3. O envio avança para `Recibo emitido`
4. A cobrança de custódia é recalculada pela faixa do acervo inteiro
5. O ledger ganha os lançamentos derivados do diff (`src/server/db/derivar.ts`)
6. A trilha de auditoria ganha uma linha em `aurea.audit_log`

**Ou tudo commita, ou nada commita.** Não existe moeda criada sem análise gravada, nem
análise sem lançamento correspondente.

## 3.2 O buraco que encontrei na trilha

> ⚠️ **As análises da bancada são registradas na auditoria como `'sistema'`.**

`mutateState()` descobre o autor lendo o cookie de sessão. As rotas `/api/estacao/*` são
chamadas por uma máquina, **sem cookie** — então `atorDaRequisicao()` cai no `catch` e grava
`'sistema'`.

Resultado: `aurea.analises` sabe quem operou, mas `aurea.audit_log` não. Quem for auditar
pela trilha — que é o documento feito para isso — vê "o sistema criou três moedas" sem saber
quem estava na bancada.

**A correção**, junto da Fase 1 do plano do painel:

| Chamador | `ator` deve ser |
|---|---|
| Painel, operador logado | o e-mail da sessão (já funciona) |
| `.exe` com chave de máquina | `estacao:<operador do corpo>` |

Isso exige que `mutarEstado` receba o ator de quem chama a rota, em vez de deduzi-lo sempre
do cookie. A assinatura de `mutateState(fn)` é superfície protegida e **não muda**: a saída é
um caminho paralelo usado só pelas rotas da estação, que já é o que elas fazem.

## 3.3 O que ainda NÃO é gravado, e vale decidir

| O que | Hoje | Vale gravar? |
|---|---|---|
| Quantas vezes um vídeo foi assistido, e por quem | não existe | **Sim, se houver cliente real.** É a prova de que o cliente teve acesso ao que foi contratado |
| Quando a URL assinada foi emitida | não existe | Sim — é barato e responde "quem pediu acesso ao vídeo dessa moeda?" |
| Tamanho e duração do vídeo | não existe | Sim: sem isso não dá para saber se um vídeo de 2 KB é uma gravação falha |
| Quem apagou um vídeo | não existe | **Sim, antes de existir botão de apagar.** Apagar prova sem rastro é pior do que não ter prova |

Os três primeiros cabem em colunas de `aurea.analises` ou numa tabela pequena de acessos. O
quarto é o único que muda comportamento: **não construa o botão de apagar antes do registro
de quem apagou.**

---

# Parte 4 — O resumo executável

## 4.1 Migration 005 — o que ela faz

```sql
-- Identidade durável ao lado do e-mail. NULA para as contas do seed.
alter table aurea.users
  add column if not exists auth_user_id uuid unique;

-- UUID do operador FORA da formula do hash. Ver a armadilha em 2.3.
alter table aurea.analises
  add column if not exists operador_id  uuid,
  add column if not exists aprovador_id uuid;

-- Metadados do video, para saber se a gravacao presta.
alter table aurea.analises
  add column if not exists video_bytes    bigint,
  add column if not exists video_duracao_s integer;
```

Inteiramente aditiva, como a 004: nenhuma coluna existente muda, nenhum registro é
reescrito, e a `STORE_KEY` continua em `aurea-market-v6`.

## 4.2 As rotas novas

| Rota | Quem | O que faz |
|---|---|---|
| `GET /api/estacao/video/ver` | admin ou dono da moeda | URL assinada de leitura, 1 hora |
| `GET /api/estacao/analises` | admin | lista com filtro por envio, moeda, operador e período |
| `GET /api/recibos/:coinId/analise` | dono da moeda | a análise da moeda dele, **sem** caixa nem posição |

## 4.3 As três decisões que travam a execução

1. **Moeda que troca de dono: o vendedor continua vendo o vídeo?** Recomendação: não — o
   vídeo acompanha a moeda.
2. **Prazo da URL assinada.** Recomendação: 1 hora.
3. **Vai existir botão de apagar vídeo?** Se sim, o registro de quem apagou entra **antes**
   dele.

## 4.4 O que fazer primeiro

A **coluna `auth_user_id`** e o **ator da auditoria**. As duas são pequenas, aditivas, e
ficam mais caras a cada semana: a primeira porque cada conta nova nasce sem UUID, e a
segunda porque cada análise feita entra na trilha como `'sistema'` — e trilha é append-only,
então o que entrou errado fica errado.
