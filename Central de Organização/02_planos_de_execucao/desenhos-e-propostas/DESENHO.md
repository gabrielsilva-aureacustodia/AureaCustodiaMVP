# Atendimento ao cliente no Admin — desenho (31/10/2026)

Pedido do Gabriel (comando A2A 933f56b6): o cliente envia dúvida, pedido, reclamação ou relato de
erro de qualquer tela logada; a equipe responde no `/admin`, marca o caso e o cliente vê a resposta e o
estado na própria área. Simples de propósito. **Sem agente de IA nesta rodada.**

## Decisões

| # | Decisão | Por quê |
|---|---|---|
| 1 | Tabelas próprias (`aurea.casos`, `casos_mensagens`, `casos_anexos`, migration 048), e não a caixa do WhatsApp (`cs_*`) | `cs_*` exige telefone e provedor; o caso nasce de uma conta logada. Misturar quebraria as restrições da 022 |
| 2 | Item novo do menu chama-se **Casos** (`/admin/casos`) | "Atendimento" já é o `/admin/cs` (WhatsApp). Dois itens com o mesmo nome confundem a equipe |
| 3 | Mesmas permissões do CS: `cs.ver` lê, `cs.responder` responde e muda o estado | Não inventar papel novo. Hoje só `dev` e `sócio` têm `cs.*` |
| 4 | Estados: `aberto` → `em_andamento` (equipe respondeu) → `resolvido` ou `nao_resolvido` (só a equipe marca). Mensagem do cliente em qualquer caso o devolve a `aberto`; "Reabrir" volta a `em_andamento` | O contador do menu = casos `aberto` = os que esperam a equipe |
| 5 | Só logados enviam; o botão não aparece em página pública | Não há como responder a um visitante: sem e-mail confiável nem conta |
| 6 | Acesso do cliente decidido no servidor pelo e-mail da sessão (`getSessionEmail`); a tabela tem RLS ligado e sem política, como as demais do schema `aurea` | A aplicação fala com o Postgres pela conexão do servidor; quem isola é a consulta, sempre com `user_email = sessão` |
| 7 | Anexo: uma imagem (PNG, JPEG ou WebP, até 2 MB) em `bytea`, servida por rota autenticada | LGPD: nada em armazenamento público; só o dono do caso e a equipe com `cs.ver` leem |
| 8 | Aviso por e-mail ao cliente quando a equipe responde, pelo `enviarEmail` existente | Sem `RESEND_API_KEY` vira registro local e a tela diz que só vale a área logada |
| 9 | Toda ação da equipe grava `admin.casos.<verbo>` em `audit_log` | Regra do CLAUDE.md para o painel |

## Frentes e worktrees

| Frente | Branch | Worktree | O que entrega | Depende de |
|---|---|---|---|---|
| A · base | `feat/aurea-atendimento` | `wt/atendimento` | migration 048, domínio puro, repositório, serviço, Server Actions do cliente e da equipe, testes no Postgres embutido | — |
| B · cliente | `feat/aurea-atendimento-cliente` | `wt/atendimento-cliente` | botão flutuante nas áreas logadas, modal de envio, tela "Meus casos" | A |
| C · Admin | `feat/aurea-atendimento-admin` | `wt/atendimento-admin` | `/admin/casos`, contador no menu, tutorial/tour | A |
| D · polimento | na B e na C | — | estados vazio/carregando/erro, teclado, contraste, 375/768/desktop | B e C |

B e C saem da A depois do push dela e abrem PR contra `feat/aurea-atendimento`. O PR da A vai para a `main`;
merge só por ordem do Gabriel.
