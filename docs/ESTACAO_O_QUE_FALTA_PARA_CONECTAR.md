# O que falta para a bancada conversar com a plataforma

```
Para:        Gabriel
Escrito em:  10/09/2026
Verificado:  neste dia, contra o repositório e contra o site em produção
```

> **A resposta curta.** **Nada precisa ser modificado no código.** A frente E está escrita,
> testada e verde. O que falta é **publicar** o que já existe e cadastrar **três variáveis
> de ambiente** na Vercel. Enquanto isso não acontece, a bancada só funciona apontada para
> o servidor local do seu computador.

---

## 1. O retrato de hoje, conferido

| O que | Estado | Como conferi |
|---|---|---|
| Código da estação no seu computador | ✅ Completo | 29 arquivos alterados ou criados, `npm test` com 192 testes verdes |
| Código da estação **publicado** | ❌ **Não existe** | `origin/main` não tem nenhum arquivo de `estacao/` nem de `api/estacao/` |
| Rotas em produção | ❌ **404** | `https://aurea-custodia-mvp.vercel.app/api/estacao` responde 404 |
| Site em produção | ✅ No ar | responde 200 |
| Tabela `aurea.analises` no banco | ✅ Existe | migration 004 aplicada em 10/09/2026 |
| Balde `analises` no Supabase | ✅ Existe e é privado | conferido: `public = false` |
| `AUREA_ESTACAO_TOKEN` na Vercel | ⚠️ Você precisa conferir | não tenho acesso ao painel |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ Falta | a rota do vídeo responde 503 dizendo o nome dela |

**A leitura disso em uma frase:** o programa da bancada está pronto e o banco está pronto;
o site que ele precisa conversar ainda não conhece as rotas da estação, porque ninguém as
publicou.

---

## 2. O que muda no repositório — a lista honesta

**Em código de negócio: nada.** Não há refatoração pendente, não há contrato para ajustar,
não há tela para adaptar. A conexão foi construída para não exigir mudança em nada que já
funcionava:

- **A estação não é um usuário.** Ela não entra em `state.users`, não tem sessão e não tocou
  no login. Usa chave própria, com o mesmo molde de comparação em tempo constante que os
  relatórios já usavam.
- **As Server Actions não foram tocadas.** `advanceAnalysis` continua servindo à
  demonstração pela tela, com o hash simulado. A estação é um caminho novo e paralelo que
  escreve o mesmo estado, pela mesma transação.
- **A `STORE_KEY` não subiu para v7.** O plano previa isso e a perda do acervo de
  demonstração. Não foi necessário: a migration é aditiva e `garantirFormato()` preenche a
  lista nova quando ela falta. **Seu banco de teste continua intacto.**
- **O `tsconfig.json` e o `eslint.config.mjs`** ganharam `estacao` no `exclude`/`ignores`.
  Isso **já está feito** e é o que impede o build da Vercel de tentar compilar código de
  Electron.

O que muda, então, é **onde o código está**: ele precisa sair do seu computador e chegar à
Vercel.

---

## 3. Os três passos que faltam

### Passo A — Publicar · o único que destrava tudo

Sem isto, os outros dois não têm efeito: não existe rota para ler variável nenhuma.

O commit já está pronto para ser feito. A publicação segue o método do fork, documentado em
[`METODO_PUBLICACAO_VIA_FORK.md`](METODO_PUBLICACAO_VIA_FORK.md).

**Como saber que funcionou:**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://aurea-custodia-mvp.vercel.app/api/estacao
```

| Antes | Depois |
|---|---|
| `404` — a rota não existe | `503` — a rota existe e diz que falta a chave |

O 503 é a vitória deste passo. Ele vira 200 no Passo B.

> ⚠️ **Antes de publicar, confirme a migration no banco de produção.** Se a produção usa o
> mesmo projeto Supabase que o seu `.env.local` — e usa, pelos documentos —, a migration 004
> **já está aplicada** e não há nada a fazer. Conferir leva dois segundos:
> ```bash
> npm run db:check
> ```
> A linha das migrations precisa terminar com `004_analise_estacao`. Se um dia a produção
> apontar para outro banco, rode `npm run db:migrate` contra ele **antes** do deploy. A
> migration é aditiva, então rodar antes é seguro: o código antigo não enxerga a tabela nova.

### Passo B — As três variáveis na Vercel

Caminho: `https://vercel.com/dashboard` → projeto **aurea-custodia-mvp** → **Settings** →
**Environment Variables** → **Add New**. Em todas, marque **Production**, **Preview** e
**Development**.

| Name | Value |
|---|---|
| `AUREA_ESTACAO_TOKEN` | os 64 caracteres que já estão no seu `.env.local` — ver abaixo |
| `SUPABASE_STORAGE_BUCKET` | `analises` |
| `SUPABASE_SERVICE_ROLE_KEY` | a chave de privilégio elevado — ver seção 4 |

Para ver o valor inteiro do token, que já foi gerado e está no seu `.env.local` (arquivo que
não vai para o GitHub):

```bash
grep AUREA_ESTACAO_TOKEN .env.local
```

O que você quer são os **64 caracteres entre as aspas**. O valor não está escrito neste
documento de propósito: **este repositório é público** enquanto durar o desenvolvimento
(RA-11), e esta chave abre a rota que cria ativo. Ela é de teste e vale trocá-la antes do
primeiro cliente real — mas não há motivo para publicá-la hoje.

E confira se já existe `SUPABASE_URL` **ou** `NEXT_PUBLIC_SUPABASE_URL` na lista. Se nenhuma
das duas estiver lá, cadastre:

| Name | Value |
|---|---|
| `SUPABASE_URL` | `https://vjbqikfamqdttbmaqrxf.supabase.co` |

**Depois de salvar, republique.** A documentação da Vercel é literal: *"Changes to
environment variables are not applied to previous deployments. You must redeploy your
project."* Variável salva sem Redeploy não vale para o site que está no ar, e essa é a causa
mais comum de "configurei e continua dando erro".

**Deployments** → o mais recente → **⋯** → **Redeploy**.

### Passo C — Apontar a bancada para produção

No programa, em **Configuração**, trocar o endereço do site:

| De | Para |
|---|---|
| `http://localhost:3000` | `https://aurea-custodia-mvp.vercel.app` |

A chave e o operador continuam os mesmos. A partir daí a bancada deixa de depender do seu
computador estar ligado.

---

## 4. A chave de serviço, em detalhe

Esta é a única peça que eu não consigo obter por você — ela só existe no painel do Supabase.

**Onde:**

```
https://supabase.com/dashboard/project/vjbqikfamqdttbmaqrxf/settings/api-keys
```

A página se chama **Settings → API Keys**. Não existe mais uma página separada "Settings →
API": todas as chaves, novas e legadas, vivem nessa mesma tela.

**Qual das quatro:**

| Chave | Formato | Serve? |
|---|---|---|
| **Secret key** | `sb_secret_…` | ✅ **Prefira esta**, se existir |
| **`service_role`** | texto longo em três partes separadas por ponto (JWT) | ✅ Serve, é a legada |
| **Publishable key** | `sb_publishable_…` | ❌ Não assina upload |
| **`anon`** | JWT | ❌ Não assina upload |

O Supabase está migrando do formato antigo para o novo. **Os dois funcionam no código da
estação** — o que importa é ser a de **privilégio elevado**. Criar as chaves novas não
revoga as legadas, então as quatro podem aparecer juntas.

O valor costuma vir oculto; há um botão de revelar ou de copiar ao lado. **Copie inteiro.**
Chave copiada pela metade é o erro mais comum aqui, e ele não se parece com a causa: o
upload falha com uma mensagem genérica de assinatura.

> ⚠️ **O aviso do próprio Supabase sobre esta chave:** *"A secret key bypasses every Row
> Level Security policy you have. Never put one in a browser, a shipped application, or
> source control."*
>
> Traduzindo para a nossa operação: ela vai **só** para a Vercel e para o seu `.env.local`.
> **Nunca** para o notebook da bancada, nunca para o `.exe`, nunca para um commit. O
> programa da estação jamais a vê — ele recebe do site apenas uma URL já assinada, válida
> para um arquivo só.

### Para testar o upload hoje, no seu computador

No `.env.local`, a linha já está preparada e comentada. Descomente e cole:

```
SUPABASE_SERVICE_ROLE_KEY="cole aqui a chave inteira"
```

Depois reinicie o servidor local (`Ctrl+C` e `npm run dev` de novo — variável de ambiente só
é lida na partida).

**Como conferir que pegou:**

```bash
curl -s -H "Authorization: Bearer COLE_A_CHAVE_AQUI" -H "Content-Type: application/json" -d "{\"protocolo\":\"RO-ENV-0154\",\"arquivo\":\"teste.webm\"}" http://localhost:3000/api/estacao/video/url
```

| Resposta | Significa |
|---|---|
| `{"url":"https://vjbq…","token":"…","caminho":"RO-ENV-0154/teste.webm","bucket":"analises"}` | ✅ Funcionou |
| `{"error":"Upload de vídeo não configurado: falta SUPABASE_SERVICE_ROLE_KEY."}` | A variável não foi lida — faltou reiniciar o servidor |
| `{"error":"Falha ao assinar a URL de upload."}` | A chave chegou mas foi recusada: ou é a `anon`/`publishable`, ou veio pela metade |

E na bancada, o sinal é o texto abaixo do vídeo depois de parar a gravação:

- *"Gravação salva no disco e enviada para o armazenamento."* → o balde está funcionando
- *"Gravação salva no disco. Ainda não subiu: …"* → o motivo vem escrito na própria frase

---

## 5. O que NÃO depende de nada disso

Vale saber para não confundir prioridade:

**A bancada analisa moeda sem balde e sem produção.** Fila, veredito, criação da moeda,
recibo com hash real e fila offline funcionam hoje, apontados para o servidor local. Foi
verificado ponta a ponta em 10/09/2026.

**O vídeo nunca se perde por falta de nuvem.** Ele é gravado no disco do notebook **antes**
de qualquer tentativa de envio, em `C:\AureaEstacao\analises\`. Sem balde, ele fica lá — e
continua lá mesmo depois de subir.

**A análise não trava por falta de vídeo.** É o RA-23, e é deliberado: câmera com cabo solto
ou nuvem fora do ar não podem impedir uma moeda de ser analisada, com ela já fora da cápsula,
na mesa.

---

## 6. Resumo em uma tela

```
A. Publicar                     → /api/estacao sai de 404 para 503
B. 3 variaveis + Redeploy       → 503 vira 200, e o video passa a subir
C. Bancada apontando p/ producao → deixa de depender do seu computador
```

O Passo A é o que destrava. Os outros dois levam dez minutos cada.
