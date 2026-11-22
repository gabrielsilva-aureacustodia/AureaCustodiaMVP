# Atendimento ao cliente — execução (31/10/2026)

Desenho em [`DESENHO.md`](DESENHO.md). Pedido do Gabriel, comando A2A 933f56b6; ordem posterior: sem PR, merge direto na `main`.

## O que entrou
- Migration **048** (`casos`, `casos_mensagens`, `casos_anexos`), regras puras em `src/domain/atendimento/`, serviço em `src/server/atendimento/`, Server Actions do cliente e da equipe, rotas `/api/atendimento/casos` (envio com imagem) e `/api/atendimento/anexo/[id]`.
- Cliente: botão flutuante em toda tela logada (compacto, acima do "Ver tutorial") e a tela `/atendimento`.
- Equipe: `/admin/casos`, contador de casos abertos no menu, tour e guia da tela.

## Como foi testado
Postgres embutido (PGlite) por socket com as 48 migrations, app em `next start` contra ele, Chrome com Playwright: o cliente envia (com imagem), a equipe vê o contador, responde, marca resolvido, não resolvido e reabre, o cliente vê a resposta e o estado, escreve de novo e o caso volta a Aberto; outro cliente recebe 404 no anexo. 375, 768 e 1440 px, tema escuro e claro, axe sem violação nas telas novas, 0 erro de console. Suíte: 159 arquivos, 1.496 testes.

## O que NÃO foi feito
- **A migration 048 não foi aplicada no banco de produção.** Não há credencial do banco da Áurea nesta máquina (a Vercel guarda `POSTGRES_URL` como variável sensível, o Supabase logado é o da Sintética e não há `.env.local`). Até ela rodar, o botão abre mas o envio responde "O atendimento está sendo ativado", a lista do cliente vem vazia e o contador do menu fica em zero; nada quebra. Para ativar: `npm run db:migrate` com `POSTGRES_URL_DIRECT` de produção.
- E-mail ao cliente: o código chama o envio existente, mas `RESEND_API_KEY` não está na Vercel; sem ela o cliente só vê a resposta na área logada (a tela da equipe avisa isso ao enviar).
- Visitante sem login não envia: não há como responder a quem não tem conta.
- Tela publicada, login com credencial de teste/admin e o teste em produção: sem credencial no cofre; só teste local.
- Agente de IA: não criado (pedido).
