# Execução — admin/reenviar-email-cliente (01/10/2026)

Estado: **sem commit, sem push** (a pedido). Branch `admin/reenviar-email-cliente`, criada a partir da `main`.
Sem migration nova: a trilha usa `aurea.audit_log`, que já existe.

## O que existia (varredura de `enviarEmail` e `enviarLinkDeSenha`)

Só dois caminhos mandam e-mail ao cliente, e nada mais no `src/server` nem no `src/app/(admin)`:

1. **Link de redefinição de senha** — `enviarLinkDeSenha` → `supabase().auth.resetPasswordForEmail` (e-mail do Supabase).
2. **Aviso de reserva pós-paga** — `notificarReservasPendentes` → `enviarEmail` (Resend), só automático.

Não existe convite ao adicionar membro de equipe, nem reenvio de fatura ou recibo por e-mail. Os demais
resultados do grep são o provedor (`src/lib/email`) e um dublê de teste. WhatsApp (`/admin/cs`) é outro canal.

## O que foi feito

- **Auditoria** (`src/server/admin/emails.ts`): `admin.email.reenviar` com `detalhes.tipo`
  (`redefinicao_senha`, `convite_equipe`, `aviso_reserva`) e, no aviso, `detalhes.referencia` = id da reserva.
  O primeiro convite, ao adicionar o membro, grava `admin.email.enviar`. A leitura do "último envio" também
  conta o primeiro link de senha (`admin.usuarios.redefinir_senha` com `modo = link`) e ignora envio simulado.
- **Senha** (`AcoesDaConta.tsx`): com envio anterior, o botão vira "Reenviar e-mail de redefinição" e mostra
  "Último envio em …"; sem envio, continua "Enviar link de redefinição por e-mail".
- **Equipe**: `adicionarMembroNoPainel` agora manda "Você foi adicionado à equipe do Real Olímpico" depois de
  gravar o membro; falha de e-mail nunca desfaz o cadastro e vira aviso na mensagem. A lista ganhou o botão
  "Reenviar" (membros ativos) e a data do último aviso.
- **Aviso de reserva**: bloco "Aviso de reserva" na ficha do usuário, com uma linha e um botão "Reenviar aviso"
  por compra com prazo correndo. Usa o mesmo texto do automático (`corpo`, agora exportada) e atualiza `avisadoEm`.
- **Ações** em `src/server/actions/admin/emails.ts`, com permissão conferida na própria ação:
  `usuarios.editar` (senha, reserva) e `admin.membros` (convite). Falha de envio não grava a trilha.
- Sem `RESEND_API_KEY` o provedor é o registro local: a tela diz "só registrado no log, não saiu".

## Verificação

- `npm run typecheck`: limpo. `npm run lint`: 0 erros (15 avisos antigos, nenhum nos arquivos tocados).
- `src/server/admin/banco.test.ts`: 45 passam (3 novos: trilha e último envio, primeiro link de senha e
  simulado, convite por membro). `src/server/actions/admin` e `src/server/mercado`: passam.
- `npm run build`: passou (exit 0). As duas primeiras tentativas falharam por outro processo mexendo no
  mesmo `.next`, não por erro de código.

## Observação de ambiente

A árvore tinha alterações de outra frente (normalização de e-mail, tutorial, home) que **não são desta
branch** e vieram junto no `git checkout -b`. Nenhum arquivo delas foi alterado por mim; ao commitar, separar.
