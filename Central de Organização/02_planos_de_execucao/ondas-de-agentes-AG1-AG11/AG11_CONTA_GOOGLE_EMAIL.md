# AG11 — Minha Conta: fim do bloco do Google e troca de e-mail pelo cliente

Branch: `exec/ag11-conta-google-email`. Independente das outras.

## 1. Remover o bloco "Login com Google"

Em `src/app/(app)/conta/configuracoes/page.tsx`, linhas 140-142, há um bloco
"Login com Google" que promete *"Gerencie sua conexão de login com a conta
Google"*. **A plataforma não oferece esse gerenciamento.** O bloco sai.

Entrar com Google continua funcionando. Quem criou a conta assim segue entrando
assim — o que sai é a tela que sugere administrar essa conexão.

## 2. O cliente pode trocar o próprio e-mail

Hoje isso é privilégio do painel: a ficha do cliente (`/admin/usuarios/[email]`)
altera login, senha e bloqueio pelo Supabase Auth com a chave de serviço, só no
servidor. **O cliente passa a ter o mesmo direito sobre a própria conta**, pelo
mesmo caminho — reaproveite o serviço que o admin já usa, não escreva um
segundo.

Ao salvar os dados cadastrais com um e-mail diferente, o sistema:

1. atualiza o e-mail no Supabase Auth;
2. atualiza o registro do usuário na base da plataforma.

### 3. Quem entrava pelo Google precisa definir senha

Se a conta usava login com Google e o cliente troca o e-mail, o vínculo com o
Google **é removido** e a conta passa a existir só pelo e-mail novo.

E aí surge o problema que fecha esta branch: **quem entrava pelo Google nunca
teve senha.** Sem senha definida, a troca deixa a pessoa trancada fora da
própria conta no próximo login.

Então a troca de e-mail, nesse caso, abre um **pop-up pedindo que ela defina uma
senha**, antes de concluir. Não é uma sugestão para depois: sem senha, a troca
não se completa.

Para quem já entrava por e-mail e senha, nada disso aparece — a senha continua a
mesma, só o e-mail muda.

## Ordem de leitura

1. `CLAUDE.md`
2. `src/app/(app)/conta/configuracoes/page.tsx`
3. `src/components/account/AccountModals.tsx` — `ModalDadosPessoais`, `ModalSenha`
4. `src/server/actions/account.ts` — `updatePersonal`, `changePassword`
5. `src/server/actions/admin/usuarios.ts` e `src/server/admin/ficha.ts` — como o painel troca e-mail e senha no Supabase
6. `src/server/auth/` — sessão, provisionamento e o callback do Google
7. `src/domain/types.ts` — `User`

## Cuidados

- **Não peça nem manipule senha em texto puro num caminho novo.** Use o mesmo
  serviço do painel, no servidor, com a chave de serviço — que nunca chega ao
  cliente.
- **Sem trava nova.** Nada de exigir confirmação por e-mail, aceite legal ou
  verificação extra que não foi pedida: o ambiente é MVP e já foi decidido
  assim. O pop-up de senha não é trava, é a condição para a conta continuar
  acessível.
- A sessão precisa continuar válida depois da troca, ou a pessoa é derrubada no
  meio do próprio cadastro. Confira o que `getSessionEmail()` guarda e o que
  acontece com ela quando o e-mail muda — a sessão é indexada por e-mail em
  vários lugares do estado.
- E-mail é chave de várias tabelas (`aurea.users` e tudo que referencia
  `user_email`). Troca de e-mail é renomear uma chave estrangeira: faça numa
  transação e teste com uma conta que tenha moedas, faturas e envios.
- Os e-mails de semente `@testeaurea.com.br` e o institucional
  `gabriel.silva@aureacustodia.com.br` são identificadores do bootstrap da
  equipe. Trocar um deles tira a equipe do painel (RA-40, RA-48).

## Fechamento

Sem commit. Rode typecheck, lint, teste e build **uma vez, no fim**, só para
confirmar que a branch está de pé, e **avise que terminou**. O merge e o commit
são feitos depois, por um agente só, com todas as branches juntas.
