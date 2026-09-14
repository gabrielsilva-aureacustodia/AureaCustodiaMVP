# `/admin/cs` — o atendimento com o WhatsApp da empresa

A caixa de conversas do CS, com a ficha do cliente ao lado (plano do Admin, seção 2.5; frente C,
sub-branch C2).

| Arquivo | O que faz |
|---|---|
| `page.tsx` | Server Component: confere `cs.ver`, lê o filtro e a conversa da URL (`?status=&responsavel=&etiqueta=&busca=&naolidas=1&conversa=`) e entrega a primeira pintura pronta — caixa, conversa aberta, cartão do cliente e a equipe para atribuir |

A tela em si é `src/components/admin/cs/CaixaDeAtendimento.tsx`, que se atualiza a cada 5 segundos
pela Server Action `atualizarAtendimentoNoPainel`.

## Permissões

| Gesto | Permissão |
|---|---|
| Abrir a tela, ler conversas, ver o cartão do cliente | `cs.ver` |
| Responder, enviar arquivo, nova conversa, notas, etiquetas, responsável, situação, vincular conta | `cs.responder` |
| Conferir a conexão do WhatsApp | `cs.canais` |
| Abrir a ficha completa pelo cartão | `usuarios.ver` |

## Sem provedor, sem banco

- **Sem as variáveis da Evolution**, a tela abre igual: histórico, notas, etiquetas e respostas
  registradas no painel funcionam, e o aviso diz o que falta configurar (RA-42).
- **Sem `POSTGRES_URL`**, a tela diz que o atendimento guarda as conversas no banco.
- **Com banco mas sem as migrations 022 e 023**, a tela pede `npm run db:migrate`.

## Conexões

| Pasta | Relação |
|---|---|
| `src/components/admin/cs/` | As três colunas |
| `src/server/admin/atendimento.ts` | `carregarAtendimento`, `equipeParaAtribuir` |
| `src/server/actions/admin/cs.ts` | As escritas e o polling |
| `src/app/api/webhooks/whatsapp/` | Por onde as mensagens do cliente chegam |
