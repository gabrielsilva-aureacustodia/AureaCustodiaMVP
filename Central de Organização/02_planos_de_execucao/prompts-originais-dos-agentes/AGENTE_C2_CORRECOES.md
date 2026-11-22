# Prompt — Sessão C-2 · Correções da branch `feat/pagamentos-correios`

> Copie o bloco abaixo inteiro como primeira mensagem de um chat dedicado, aberto na
> pasta do worktree `C:\dev\AureaCustodiaMVP-pagamentos` (ver tutorial 6.1 de
> `docs/EXECUCAO_BRANCH_C_O_QUE_FALTA.md`). Não depende da frente B.

---

Você vai trabalhar no repositório da **Áurea Custódia / Real Olímpico**, na branch
`feat/pagamentos-correios`, corrigindo o que a auditoria de 03/09/2026 apontou na frente C
(Mercado Pago e Correios). **Nada nesta sessão depende de banco ou de outra frente.**

## Leia nesta ordem, antes de editar

1. `CLAUDE.md` (raiz) — carregado automaticamente
2. `docs/EXECUCAO_BRANCH_C_O_QUE_FALTA.md` — **seções 2.1 (etapa 1), 2.3, 2.4, 2.6 e 5**.
   É a lista exata do que você faz aqui
3. `docs/FRENTES_PARALELAS.md` — seus arquivos continuam sendo só `src/lib/payments/`,
   `src/lib/shipping/`, `src/app/api/webhooks/`, `src/app/api/cron/`, mais os documentos
   compartilhados na sua própria seção
4. `RISCOS_ASSUMIDOS.md` — o formato do **RA-13** (frente B) é o modelo do RA-14 que você
   vai escrever
5. `src/lib/payments/README.md` e `ATALHOS.md`, `src/lib/shipping/README.md` e `ATALHOS.md`

## O que fazer, nesta ordem, um commit por item

1. **Idempotência atrás de interface.** Em `src/lib/payments/idempotencia.ts`, definir
   `RepositorioIdempotencia` (`reivindicar`, `concluir`, `falhar`), mover o `Map` atual
   para um adaptador `memoria`, e expor `repositorioIdempotencia()` que hoje devolve
   sempre o de memória. Manter `_resetIdempotenciaParaTestes`. Os testes existentes
   continuam passando; a rota passa a usar a interface. **Não** escreva o adaptador
   Postgres — é da sessão C-3.
2. **Evento sem id responde 400.** `processarPayloadWebhook` deixa de inventar
   `EVT-${Date.now()}`; devolve `eventoId: null` e a rota responde 400 com log. Teste
   novo em `route.test.ts`: payload `{}` → 400.
3. **Assinatura obrigatória.** A rota rejeita com 401 sempre que a assinatura for
   inválida, em qualquer `NODE_ENV`. `validarAssinaturaWebhookMercadoPago` sem segredo só
   devolve `true` com `MP_WEBHOOK_ALLOW_UNSIGNED=true`. Conferir que o manifesto usa
   `dataId` em minúsculas quando alfanumérico (especificação do Mercado Pago). Reescrever
   os testes da rota com **HMAC real** calculado no próprio teste com um segredo fixo;
   acrescentar o caso "um caractere alterado → 401".
4. **`.env.example`** ganha a seção da seção 5 do documento, com os comentários.
5. **Documentação e registro:**
   - `src/lib/shipping/ATALHOS.md`: remover a referência à rota
     `/api/envios/etiqueta/[protocolo]`, que não existe;
   - `RISCOS_ASSUMIDOS.md`: seção **RA-14 — Atalhos da frente C** com os subitens a–e
     da seção 2.6 do documento, linha no índice, e nota de estado no RA-07. Não edite
     seções de outras frentes;
   - `src/lib/payments/ATALHOS.md`: os mesmos subitens, versão local;
   - `docs/diario/VERSION_COMPARISON_DAILY.md`: renumerar a entrada da frente C de
     **003 para 004** (a B entra no `main` antes com a 003) e acrescentar ao fim dela um
     parágrafo "Correções de 03/09 (sessão C-2)" com o que mudou. Append-only: não altere
     nada acima da entrada;
   - `docs/CATALOGO_DE_FEATURES.md`, itens 4.4 e 4.5: trocar "✅" por "🟡 bibliotecas
     prontas; ligação na sessão C-3".
6. **Verificação final:** `rm -rf .next && npm run typecheck && npm run lint && npm test
   && npm run build`, todos verdes. Depois `git push origin feat/pagamentos-correios`.

## Regras que valem sempre

- **Não** ligue o webhook ao saldo, **não** crie migration, **não** toque em
  `src/server/actions/`, `src/domain/types.ts` nem `src/server/db/` — é tudo da C-3
- Dinheiro em centavos inteiros; nunca `float`
- Nenhuma credencial em commit; o repositório é público de propósito
- Comentários em português explicando o porquê
- Toda pasta nova nasce com `README.md`
- Antes de editar, descreva o plano em poucas linhas e siga — o Gabriel já aprovou o
  escopo desta sessão no documento; não é preciso esperar nova aprovação item a item
