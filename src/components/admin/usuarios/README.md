# `src/components/admin/usuarios/` — lista e ficha dos usuários

A interface de `/admin/usuarios` e `/admin/usuarios/[email]` (plano do Admin, seção 2.6; frente C,
sub-branch C2).

| Arquivo | O que desenha | Cliente? |
|---|---|---|
| `FiltroDeUsuarios.tsx` | Formulário GET (`next/form`) com busca, cadastro, período de criação, inadimplentes, com saldo e com moeda | não |
| `TabelaDeUsuarios.tsx` | A lista, com link para a ficha | não |
| `CriarUsuario.tsx` | "Criar conta": e-mail, nome, senha provisória opcional, dados de demonstração | sim |
| `CabecalhoDaFicha.tsx` | Nome, situação, inadimplência, cadastro, equipe, catálogo e os quatro cartões | não |
| `AcoesDaConta.tsx` | Ajustar saldo, inadimplência, desativar e reativar, redefinir senha | sim |
| `AbaCadastro.tsx` | Dados pessoais (com edição), dados bancários (com permissão própria), aceites, login no Supabase, ativação | sim |
| `AbaFinanceiro.tsx` | Cartões, extrato, livro-razão da conta, depósitos e saques, faturas, planos (B2), recebimentos (B1) | não |
| `AbaAcervo.tsx` | Moedas com recibo, caixa e posição, laudo e retirada | não |
| `AbaLogistica.tsx` | Envios e retiradas com os eventos de rastreio | não |
| `AbaMercado.tsx` | Anúncios, ofertas de compra, negociações e histórico da fila (A2) | não |
| `AbaAtividade.tsx` | Acessos, trilha da conta e registro de uso | não |
| `AbaNotas.tsx` | Notas internas (com o formulário) e conversas do atendimento | sim |

## Regras desta pasta

- **Nenhuma conta é feita aqui.** Extrato, situação de fatura, cadastro completo e inadimplência
  vêm prontos de `src/domain/` — das frentes que são donas de cada regra.
- **Dado bancário não é escondido na tela, é omitido no servidor**: sem `usuarios.dados_bancarios`,
  `AbaCadastro` recebe `dadosBancarios` indefinido e mostra o aviso.
- **O que depende de outra frente mostra "disponível depois da X"** (`Indisponivel`), nunca zero.
- **Nenhuma caixa de "tem certeza?"**: as ações são blocos recolhíveis, e quem protege o dado é o
  servidor.

## Conexões

| Pasta | Relação |
|---|---|
| `src/server/admin/ficha.ts` | Os tipos de cada aba (só `import type`) |
| `src/server/actions/admin/usuarios.ts` | As escritas |
| `src/domain/cadastro.ts` | Formatação de CPF, CEP, telefone e dados bancários |
