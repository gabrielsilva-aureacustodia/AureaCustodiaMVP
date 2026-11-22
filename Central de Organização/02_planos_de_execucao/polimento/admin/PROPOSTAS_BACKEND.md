# Propostas que mexem no servidor — nada aqui foi aplicado

```
Branch:  feat/admin-real-olimpico          Data: 25/10/2026
Regra:   esta frente só mexe na tela. Tudo abaixo precisaria mudar regra, permissão, Server Action ou dado,
         então fica como proposta. O orquestrador pede permissão ao Gabriel antes de qualquer uma virar tarefa.
```

Cada item diz **o que é**, **por que ajuda** (em linguagem de quem usa o painel) e **o que mexeria**.

## P1 — Pagar ou recusar vários saques de uma vez
- **O que é:** marcar três pedidos de saque e clicar uma vez só em "Marcar como pagos", com um comprovante por pedido.
- **Por que ajuda:** quando entram vários saques no mesmo dia, hoje a equipe repete o mesmo gesto pedido por pedido.
  Lojas grandes (Shopify) e a Stripe deixam selecionar várias linhas e agir de uma vez.
- **O que mexeria:** uma Server Action nova em `src/server/actions/admin/saques.ts` que aceite uma lista, confira
  `saques.pagar` e grave **uma linha de trilha por saque** (a regra de auditoria continua uma por pedido).
- **Cuidado:** dinheiro saindo em lote pede confirmação com a soma ("Confirmar: pagar 3 saques, R$ 1.250,00").

## P2 — Número de pendências no próprio menu
- **O que é:** um número ao lado de "Saques", "Bancada" e "Logística" no menu, como a caixa de entrada do e-mail.
- **Por que ajuda:** hoje a pessoa só sabe que há trabalho esperando se abrir a Central de trabalho. Com o número no
  menu, ela vê de qualquer tela.
- **O que mexeria:** o layout do painel teria de ler as contagens (saques esperando, envios na bancada, retiradas a
  separar) a cada tela. Isso é leitura nova no servidor em toda navegação — precisa de uma consulta leve dedicada em
  `src/server/admin/`, para não deixar o painel mais lento.

## P3 — Visões salvas nas listas
- **O que é:** guardar um filtro com nome ("Inadimplentes com saldo", "Retiradas atrasadas") e abrir com um clique.
- **Por que ajuda:** os filtros já ficam no endereço da página (dá para salvar como favorito do navegador), mas um
  favorito não aparece para o colega. Uma visão salva serve a equipe inteira.
- **O que mexeria:** tabela nova no banco (migration) e ações para criar/apagar visão, com permissão própria.

## P4 — Histórico de cada moeda dentro da ficha da moeda
- **O que é:** na ficha `/admin/moedas/[código]`, uma linha do tempo com tudo o que aconteceu com aquela moeda: entrou
  pelo envio tal, foi analisada por quem, mudou de caixa, foi vendida, foi retirada.
- **Por que ajuda:** museus e casas de leilão (CollectiveAccess, Heritage) mostram a "proveniência" de cada peça num
  lugar só. Hoje essa história está espalhada entre a trilha de auditoria, o ledger e a logística.
- **O que mexeria:** uma consulta nova em `src/server/admin/moedas.ts` juntando `audit_log`, ledger e retiradas pelo
  código da moeda. Só leitura, mas é servidor.

## P5 — Distribuir conversas do atendimento automaticamente
- **O que é:** conversa nova de WhatsApp cai sozinha para quem está com menos conversas abertas.
- **Por que ajuda:** hoje alguém precisa escolher o responsável na mão. Zendesk e Intercom fazem a distribuição sozinhos.
- **O que mexeria:** regra nova no recebimento de mensagens (`src/app/api/webhooks/whatsapp/` e `src/server/admin/cs.ts`)
  e uma configuração de "quem está de plantão". É decisão de operação do atendimento.

## P6 — Erro de formulário campo a campo
- **O que é:** quando o servidor recusa um cadastro ("CPF inválido"), a mensagem aparecer embaixo do campo errado, e
  não só no aviso flutuante do canto da tela.
- **Por que ajuda:** no celular o aviso some antes de a pessoa achar o campo. É a recomendação do GOV.UK e do tópico 35.
- **O que mexeria:** as Server Actions de `usuarios.ts`, `equipe.ts` e `config.ts` devolverem também **qual campo**
  falhou. Hoje devolvem só a frase.

## P7 — Conferência da cadeia do livro-razão no painel inicial para quem não é desenvolvimento
- **O que é:** o cartão "Cadeia do livro-razão" aparecer também para sócios, com a última conferência.
- **Por que ajuda:** quebra na cadeia é o alerta mais grave do sistema; hoje só o papel de desenvolvimento vê na
  Central de trabalho (os sócios veem no Financeiro, se clicarem em conferir).
- **O que mexeria:** `carregarPainelInicial` (`src/server/admin/resultados.ts`) passar a conferir a cadeia para o papel
  de gestão — é uma leitura mais pesada, então talvez guardar a última conferência numa tabela.

## P8 — Ambiente de teste local separado do banco de produção
- **O que é:** um banco de teste próprio para o `npm run dev` das worktrees.
- **Por que ajuda:** o `.env.local` de cada worktree aponta para o **banco de produção** (com a chave de estado separada
  só para o "estado" do mercado) e tem as credenciais reais de Correios, Mercado Pago e do certificado da nota fiscal.
  Testar um botão de "pagar saque" ou "emitir etiqueta" localmente teria efeito de verdade. Esta frente testou com um
  lançador que desliga tudo isso, mas a memória começa vazia (0 contas), e as telas com tabela só puderam ser vistas
  vazias.
- **O que mexeria:** infraestrutura (um projeto Supabase de teste e uma semente com contas e moedas de demonstração),
  não código de tela. Também resolveria a senha `12345678` do `CLAUDE.md`, que não entra mais (o login é todo pelo
  Supabase Auth).
