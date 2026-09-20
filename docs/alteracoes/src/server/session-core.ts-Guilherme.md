# src/server/session-core.ts

**Arquivo:** `src/server/session-core.ts`
**Camada:** servidor — criptografia da sessão
**Responsável:** Guilherme

---

## 19/09/2026 — Criado: núcleo da sessão, extraído para o middleware poder usar

**O que foi alterado**

Arquivo novo, com o que antes vivia dentro de `session.ts`: nome do cookie, leitura do
`SESSION_SECRET`, assinatura, comparação em tempo constante e a codificação base64url do
payload.

Três trocas de implementação, todas com o **formato de saída idêntico**:

| Antes | Agora | Motivo |
|---|---|---|
| `createHmac` do `node:crypto` | `crypto.subtle` (Web Crypto) | `node:crypto` não existe no runtime Edge |
| `timingSafeEqual` | laço XOR acumulando diferença | Mesma razão. Sair no primeiro byte diferente vazaria, pelo tempo de resposta, quantos caracteres o atacante acertou |
| `Buffer.from(..., 'base64url')` | `btoa`/`atob` com ajuste de padding | Não há `Buffer` no Edge |

**Por que foi alterado**

O middleware precisa conferir a **mesma** assinatura do cookie antes de a requisição
chegar na rota. Não teria como importar um módulo preso ao `node:crypto` nem carregando
`server-only`. Duplicar a assinatura em dois arquivos seria pior que extrair: divergência
entre as duas cópias não daria erro, daria gente deslogada sem explicação.

**O que observar**

**É o único módulo da sessão sem `server-only`.** Essa exceção só é segura enquanto
ninguém além de `session.ts` e `middleware.ts` o importar — se uma tela puxasse o núcleo,
o segredo sairia da fronteira de servidor sem nada acusar. Há teste reprovando qualquer
outro import em código de produção; a regra é verificada, não confiada ao comentário.

`SegredoDeSessaoAusente` tem tipo próprio porque o middleware precisa distinguir essa
falha das demais e tratá-la como "sem sessão", em vez de derrubar toda requisição do site.

**A saída é byte a byte igual à da implementação anterior**, provado em
`session-core.test.ts`. Sem essa prova, o deploy deslogaria todo mundo em silêncio.
