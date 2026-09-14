# `src/components/admin/cs/` — a tela de atendimento

As três colunas de `/admin/cs` (plano do Admin, seção 2.5; frente C, sub-branch C2). Todos são
Client Components; os dados chegam da página (primeira pintura) e do polling.

| Arquivo | O que desenha |
|---|---|
| `CaixaDeAtendimento.tsx` | O estado da tela: filtro e conversa na URL (sem navegação), polling de 5 s que pausa com a aba escondida, resposta atrasada descartada, `executar()` (toast + atualização) e as três colunas |
| `ListaDeConversas.tsx` | Coluna 1: contagem, filtro por situação, responsável, etiqueta e não lidas; busca por nome ou telefone; "Nova conversa"; os itens com prévia, hora, não lidas e etiquetas |
| `Conversa.tsx` | Coluna 2: situação, responsável, etiquetas (aplicar, retirar, criar), aviso de canal, mensagens com o estado de entrega em palavras, resposta (Ctrl+Enter) e envio de arquivo por endereço, notas internas |
| `CartaoDoCliente.tsx` | Coluna 3: o resumo da conta ligada ao telefone (saldo, moedas, envios, faturas, retiradas, acessos), vincular e desvincular conta, e o quadro do canal com "Conferir conexão" |

## Regras desta pasta

- **Estado de entrega em palavras**, e a mensagem que não saiu tem cara diferente: borda
  vermelha para "Falhou", tracejada para "Só no painel".
- **Nota interna fica fora da linha das mensagens**, com outra cor — nunca parece algo que o
  cliente viu.
- **Cada gesto confere a permissão no servidor**; aqui `pode()` só esconde controles.
- **O cartão do cliente não vem a cada volta do polling**: ele lê o AppState inteiro. Vem ao trocar
  de conversa e a cada seis voltas.

## Conexões

| Pasta | Relação |
|---|---|
| `src/server/actions/admin/cs.ts` | Todas as ações e o polling |
| `src/server/admin/atendimento.ts`, `cs.ts` | Os tipos `DadosAtendimento`, `Caixa`, `ConversaAberta` (só `import type`) |
| `src/domain/admin/cs.ts`, `telefone.ts` | Rótulos, cores de etiqueta, formatação do telefone |
| `src/styles/admin.css` | O bloco C2 (`.adm-cs-*`, `.adm-etiqueta*`) |
