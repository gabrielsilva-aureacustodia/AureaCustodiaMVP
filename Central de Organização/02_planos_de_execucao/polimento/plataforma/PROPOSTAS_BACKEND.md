# Propostas de regra, texto protegido e backend — Frente 4 (NÃO aplicadas)

```
Frente:  4 — Plataforma do cliente (feat/plataforma-real-olimpico), 25/10/2026
Regra:   nada daqui foi feito. Cada item mexe em superfície protegida (src/domain, src/server, textos de regra)
         ou depende de decisão do Gabriel. Fica registrado para decidir depois do merge.
```

| # | Achado | Onde | Proposta | Por quê |
|---|---|---|---|---|
| P1 | ~~Depósito "simulado" no CLAUDE.md~~ | — | **Resolvido em 25/10/2026:** o Gabriel confirmou que nada é simulado; o CLAUDE.md foi corrigido (depósito real pelo Mercado Pago, limite sempre visível). | — |
| P2 | ~~Rótulo "código simulado" no QR~~ | — | **Resolvido em 25/10/2026:** a linha saiu do CLAUDE.md (o recibo não tem QR desde 20/09). | — |
| P3 | ~~Moeda com custódia não paga selecionável em /vender~~ | — | **Feito em 25/10/2026, a pedido do Gabriel:** a moeda aparece sem poder ser marcada, com o aviso "Custódia não paga" e o botão "Ver como pagar" (abre a `ModalCustodiaNaoPaga`). Regra usada: `moedasComCustodiaBloqueada`, a mesma do servidor. | — |
| P4 | ~~Anéis olímpicos na foto da Bandeira~~ | — | **Sem efeito:** o Gabriel não reconhece essa regra (25/10/2026); ela saiu do CLAUDE.md. A foto fica como está. | — |
| P5 | ~~"banco de dados fictício" no subtítulo do recibo~~ | — | **Feito em 25/10/2026:** virou "Comprovante da guarda física da sua moeda, emitido no seu nome." (`Topbar.tsx`). | — |
| P6 | `/retirada` lê as retiradas do Postgres (`obterMinhasRetiradas`). Sem banco, a lista nunca tem itens — a jornada nova (`<ol>` de etapas) não pôde ser vista com dados no teste local. | `src/server/actions/custody.ts` | Nada a mudar no produto; para teste, um seed de retirada no store em memória. | Registro de limite do teste, não defeito. |
| P7 | A Linha do tempo do envio mostrou "Envio postado" sem o check logo após "Confirmar postagem" (o estado novo chega no ciclo de 10 s). | `Timeline.tsx` + `markPosted` | Fazer `markPosted` devolver o estado e a tela usar o retorno do `run()`. | Exige mexer na Server Action. |
| P8 | O valor declarado do frete é `envio.quantidade * 15000` escrito na tela (R$ 150 por moeda). | `envios/page.tsx` | Ler de uma constante do domínio/config. | Número de regra fora de `constants.ts`/config. |
| P9 | Cookies `aurea_session` e do Supabase em `localhost` são compartilhados entre portas: com várias frentes rodando ao mesmo tempo, um servidor apaga a sessão do outro (visto nesta sessão). | Ambiente local | Nas worktrees, cada frente abre o app no IP de rede (`http://172.26.224.1:<porta>`) ou num nome `*.localhost` próprio. | Só ambiente; registrado para o ritual de sessão. |
