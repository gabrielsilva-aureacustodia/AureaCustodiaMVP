# `/admin/usuarios/[email]` — a ficha completa de uma conta

Sete abas, na URL (`?aba=`): **Cadastro, Financeiro, Acervo, Logística, Mercado, Atividade e
Notas** (plano do Admin, seção 2.6; frente C, sub-branch C2). A página carrega só a aba escolhida.

| Arquivo | O que faz |
|---|---|
| `page.tsx` | Confere `usuarios.ver`, decodifica o e-mail da rota, carrega o cabeçalho e a aba (`carregarFicha`) e desenha. As ações da conta aparecem com `usuarios.editar` |

## O que cada aba lê

| Aba | Fonte |
|---|---|
| Cadastro | `user.cadastro`; dados bancários só com `usuarios.dados_bancarios`; aceites de `aurea.aceites_documentos` (A3) ou, sem ela, `settings.legalAcceptance`; login no Supabase Auth; histórico de ativação |
| Financeiro | `userStatement`, o ledger da conta, depósitos, saques, faturas (situação pela frente B), planos (B2) e recebimentos do gateway (B1) |
| Acervo | as moedas com recibo, e o laudo aprovado de cada uma (caixa, posição, peso, hash) |
| Logística | envios, retiradas e os eventos de rastreio gravados |
| Mercado | anúncios, ofertas de compra, negociações e o histórico da fila (A2) |
| Atividade | acessos, registro de uso e a trilha de auditoria da conta |
| Notas | notas internas e as conversas do atendimento ligadas à conta |

O que depende de frente que ainda não está na `main` mostra "disponível depois da X", nunca zero.

## Ações da conta

| Ação | Permissão | O que acontece |
|---|---|---|
| Editar cadastro | `usuarios.editar` | Grava o cadastro inteiro; CPF que não confere é gravado com aviso |
| Dados bancários | `usuarios.editar` + `usuarios.dados_bancarios` | Grava dentro do cadastro |
| Ajustar saldo | `usuarios.editar` | Lançamento `ajuste` no ledger + motivo na trilha, na mesma transação |
| Inadimplência | `usuarios.editar` | Liga ou desliga a marca manual |
| Desativar e reativar | `usuarios.editar` | Bloqueia o login no Supabase e registra a situação (RA-44). Conta da equipe é recusada |
| Redefinir senha | `usuarios.editar` | Link do Supabase por e-mail ou senha provisória (RA-43) |
| Nota interna | `usuarios.editar` | Append-only |
