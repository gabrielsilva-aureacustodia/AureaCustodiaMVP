# src/server/rotas-publicas.ts

**Arquivo:** `src/server/rotas-publicas.ts`
**Camada:** servidor — configuração de acesso
**Responsável:** Guilherme

---

## 19/09/2026 — Criado: a lista do que é alcançável sem sessão

**O que foi alterado**

Arquivo novo, com duas listas e a função `ehRotaPublica`. `ROTAS_PUBLICAS_EXATAS` é
comparada por igualdade; `ROTAS_PUBLICAS_PREFIXOS` cobre famílias inteiras.

**Por que foi alterado**

Nasceu dentro do `middleware.ts` e saiu de lá por um motivo de teste, não de organização:
o `middleware.test.ts` cruza esta lista com as rotas que existem no disco e reprova
quando aparece uma página fora dos grupos protegidos que ninguém declarou. Deixá-la no
middleware exigiria exportar símbolo extra de um arquivo que o Next trata de forma
especial.

**O que observar**

**`/entrar` está na lista exata e `/entrar/nova-senha` não está** — aquela tela exige a
sessão de recuperação. É por isso que a lista usa igualdade e não prefixo; um prefixo
`/entrar` abriria a troca de senha para qualquer visitante. Há teste cobrindo exatamente
esse caso.

Os quatro primeiros prefixos não são "públicos" no sentido comum: os webhooks conferem a
assinatura do provedor, `/api/cron/*` confere `CRON_SECRET` e `/api/estacao` confere o
token do equipamento no header `Authorization`. Eles passam por aqui para que a rede não
os barre **antes** da verificação própria acontecer.

**Acrescentar uma linha aqui é abrir a rota para a internet inteira.** O repositório é
público (RA-02, RA-11), então a URL não depende de ninguém adivinhar. O critério: se a
resposta muda conforme quem pergunta, a rota não é pública.
