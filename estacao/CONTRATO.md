# Contrato entre a estação e o site

**Congelado em 10/09/2026.** Qualquer agente que for mexer no programa da bancada ou nas
rotas `/api/estacao/*` lê este arquivo antes.

---

## 1. Autenticação — a estação não é um usuário

Ela não tem sessão, não tem cookie e não aparece em `state.users`. É uma máquina numa
bancada, identificada por chave própria.

```
Authorization: Bearer <AUREA_ESTACAO_TOKEN>
```

Comparação em **tempo constante** (`timingSafeEqual`), como nos relatórios: token comparado
com `===` vaza o tamanho do prefixo certo pelo tempo de resposta. A implementação está em
`src/server/estacao/acesso.ts`.

**Sem a variável `AUREA_ESTACAO_TOKEN`, o acesso da bancada está desligado** e as rotas
devolvem **503**, não 401. A distinção é deliberada:

| Código | Significa | Quem resolve |
|---|---|---|
| **503** | Falta `AUREA_ESTACAO_TOKEN` na Vercel | Gabriel, no painel |
| **401** | A chave do `estacao.json` está errada | O operador, na tela de configuração |

Um 401 genérico faria as duas falhas parecerem a mesma, e só a segunda o operador resolve
sozinho.

---

## 2. As rotas

### `GET /api/estacao`

O "alô". É o que vira "Conectado" ou "Sem conexão" no alto da tela.

```json
{
  "ok": true,
  "servidor": "https://aurea-custodia-mvp.vercel.app",
  "agora": 1757520000000,
  "rotas": { "fila": "…", "abrir": "…", "fechar": "…", "urlDeVideo": "…" }
}
```

### `GET /api/estacao/fila`

Os envios em `Recebido pela custódia` **e** em `Em análise física`. O segundo entra na lista
de propósito: se o notebook reiniciar no meio de um procedimento, o envio precisa reaparecer.

```json
{
  "fila": [
    {
      "protocolo": "RO-ENV-0001",
      "cliente": "Rogério Pena",
      "clienteEmail": "rogeriopena@testeaurea.com.br",
      "tipoMoeda": "Entrega da Bandeira Olímpica",
      "ano": 2016,
      "quantidade": 2,
      "etapaAtual": "Recebido pela custódia",
      "codigoRastreio": "BR123456789BR",
      "recebidoEm": 1757400000000
    }
  ]
}
```

### `POST /api/estacao/analise/abrir`

```json
{ "protocolo": "RO-ENV-0001" }
```

Move o envio para `Em análise física`. **Idempotente**: chamar duas vezes num envio já aberto
devolve `ok`. Reenvio da fila offline não pode virar erro — reenvio que falha é reenvio que
fica preso para sempre.

### `POST /api/estacao/analise/fechar`

O veredito. É aqui que a moeda nasce.

```json
{
  "protocolo": "RO-ENV-0001",
  "operador": "gabriel.silva@aureacustodia.com.br",
  "moedas": [
    {
      "pesoMg": 27000,
      "veredito": "aprovada",
      "caixa": "EB-001",
      "posicao": 7,
      "caminhoVideo": "RO-ENV-0001/RO-ENV-0001-2.webm"
    },
    {
      "pesoMg": 26800,
      "veredito": "recusada",
      "motivoRecusa": "Peso fora da tolerância"
    }
  ]
}
```

**Regras que a rota impõe:**

- `moedas.length` precisa ser **igual** a `envio.quantidade`. Não há aprovação parcial: o
  envio inteiro é analisado de uma vez (decisão D7b, 10/09/2026).
- `pesoMg` é **inteiro em miligramas**, entre 1.000 e 100.000. Fora dessa faixa, 400 — quase
  sempre é peso digitado em gramas.
- `motivoRecusa` é **obrigatório** quando `veredito` é `recusada`. Moeda recusada é devolvida
  ao cliente, com frete por conta dele; o motivo é o que sustenta essa conversa.
- **Não existe campo de horário.** O `validadoEm` sai do relógio do servidor.

Resposta:

```json
{
  "ok": true,
  "protocolo": "RO-ENV-0001",
  "aprovadas": 1,
  "recusadas": 1,
  "analises": [
    { "protocolo": "RO-ANL-0001", "codigoMoeda": "RO-000042", "hash": "5dfddb59…" },
    { "protocolo": "RO-ANL-0002", "codigoMoeda": null, "hash": "b9b5b044…" }
  ]
}
```

| Código | Quando |
|---|---|
| 400 | Corpo malformado ou campo inválido — vem com `detalhes` campo a campo |
| 404 | Protocolo não existe |
| 409 | Envio já teve recibo emitido, ou está numa etapa que não permite análise |
| 422 | Número de vereditos diferente da quantidade do envio |

### `POST /api/estacao/video/url`

```json
{ "protocolo": "RO-ENV-0001", "arquivo": "RO-ENV-0001-2.webm" }
```

Resposta:

```json
{
  "url": "https://<projeto>.supabase.co/storage/v1/object/upload/sign/analises/RO-ENV-0001/RO-ENV-0001-2.webm?token=…",
  "token": "…",
  "caminho": "RO-ENV-0001/RO-ENV-0001-2.webm",
  "bucket": "analises"
}
```

O upload vai **direto** para o Supabase Storage; o site só assina.

**Como a bancada envia:** `PUT` na `url`, com `Content-Type` e `x-upsert: true`, e
**sem cabeçalho `Authorization`**. O token já está na query string da URL. Mandar o token
de upload como `Authorization: Bearer` faz o Storage tentar lê-lo como JWT e recusar — a
razão de existir de uma URL assinada é o uploader não precisar de credencial nenhuma.
(Conferido contra o `uploadToSignedUrl` do `@supabase/storage-js` instalado, em
10/09/2026.)

**503** quando `SUPABASE_SERVICE_ROLE_KEY` não está configurada — e a estação trata isso como
"grava local e segue". Falta de balde não impede a moeda de ser analisada.

---

## 3. A fórmula do hash — congelada

```
hash = SHA-256( hash_anterior + "\n" + campos.join("|") )
```

`hash_anterior` é o hash da análise anterior, ou 64 zeros (GENESIS) na primeira. Cada campo
vira texto assim: número inteiro em decimal, `null` vira string vazia, texto entra como está
— sem `trim`, sem remover acento. Normalizar aqui seria um jeito de dois textos diferentes
produzirem o mesmo hash.

**Os quinze campos, nesta ordem exata** (`CAMPOS_DA_ANALISE`, em `src/domain/analise.ts`):

```
 1. protocolo         RO-ANL-0001
 2. protocoloEnvio    RO-ENV-0001
 3. codigoMoeda       RO-000042        (vazio quando recusada)
 4. codigoRecibo      NFT-000042       (vazio quando recusada)
 5. tipoMoeda         Entrega da Bandeira Olímpica
 6. ano               2016
 7. pesoMg            27000
 8. veredito          aprovada
 9. motivoRecusa                       (vazio quando aprovada)
10. operador          gabriel.silva@aureacustodia.com.br
11. aprovador         gabriel.silva@aureacustodia.com.br
12. caixa             EB-001
13. posicao           7
14. validadoEm        1757520000000
15. caminhoVideo      analises/RO-000042/RO-ANL-0001.webm
```

**Vetor congelado**, para quem quiser reimplementar e conferir. Com `hash_anterior` = 64
zeros e os valores acima, o texto hasheado é:

```
0000000000000000000000000000000000000000000000000000000000000000
RO-ANL-0001|RO-ENV-0001|RO-000042|NFT-000042|Entrega da Bandeira Olímpica|2016|27000|aprovada||gabriel.silva@aureacustodia.com.br|gabriel.silva@aureacustodia.com.br|EB-001|7|1757520000000|analises/RO-000042/RO-ANL-0001.webm
```

(a primeira linha e a segunda separadas por um `\n`, sem espaço em volta), e o resultado é:

```
5dfddb59680f91c23940ff88b39e9df5e382d426cf2be2b3e47cf278d7166a2c
```

Está gravado em `src/domain/analise.test.ts`. **Se esse teste falhar, a pergunta não é "qual
o valor novo?"** — é quem mexeu na lista, na ordem ou na forma canônica. Recibo já emitido
deixou de conferir.

### Três escolhas que não devem ser mexidas

**O peso vai em miligramas inteiros.** `27.0` e `27` são o mesmo peso e são textos
diferentes, e texto diferente é hash diferente. Mesma razão do `Cents` para dinheiro.

**O `validadoEm` é o relógio do servidor.** Notebook de bancada tem relógio errado com
frequência, e horário que depende da máquina destrói a reprodutibilidade — que é a única
coisa que o hash entrega.

**O `aprovador` já está na lista mesmo com papel único.** Hoje ele repete o `operador`
(decisão D7c: quem analisa é quem aprova). Parece redundante e é o que permite a segregação
de função chegar depois **sem mudar a fórmula** e sem invalidar recibo emitido.

---

## 4. O que a corrente prova

Cada análise incorpora o hash da anterior. Alterar um registro antigo muda o hash dele, e o
`hashAnterior` do seguinte deixa de bater — a adulteração fica detectável sem terceiro e sem
blockchain. `conferirCadeia()` devolve o índice da primeira análise adulterada.

O hash da análise que aprovou uma moeda é o que vai para `coin.nft.hash`. **O recibo daquela
moeda É a prova do procedimento que a aprovou.**

Moeda do seed continua com o hash simulado de `genHash()` — ela nunca passou por bancada
nenhuma, e fingir o contrário seria pior do que declarar a simulação.
