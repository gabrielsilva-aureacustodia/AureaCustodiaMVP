# Atalhos assumidos em `src/server/auth/`

## RA-17 🟡 — contingência do seed

Se o Supabase Auth não estiver configurado, `login()` e `changePassword()` mantêm o caminho
histórico das sete contas do seed. Com `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`, esse
caminho fica inativo e todas as credenciais são tratadas pelo Supabase.

O cadastro novo nunca usa essa contingência. Ele exige configuração do Supabase, decisão
explícita `AUREA_SIGNUP_ENABLED=true` e versões legais. Depois da confirmação, o servidor
provisiona R$ 5.000,00 e seis moedas fictícias para permitir os testes pedidos.

Remover o caminho do seed quando todas as contas dos sócios tiverem sido recriadas e os
ambientes local, Preview e Production estiverem configurados.

## RA-18 🟡 — cadastro aberto por padrão

`getRegistrationStatus()` não exige mais `AUREA_SIGNUP_ENABLED` nem as versões legais em
variável de ambiente. Com o Supabase configurado, o cadastro abre; as versões caem para
`rascunho-teste-2026-09-06` e o aceite continua sendo gravado com versão e data.

A trava anterior derrubou a função em produção por uma variável ausente. Rever quando
houver cliente real: aí a versão vigente volta a vir de variável.

### Ampliação de 06/09/2026 — nenhuma trava de login

Removidas todas as barreiras entre identidade confirmada e sessão:

- o callback aceita `code`, `token_hash`, `token` e a sessão no fragmento, então o template
  padrão do Supabase funciona sem SMTP próprio;
- o provisionamento não exige mais aceite legal — era o que quebrava "Entrar com Google";
- o login não exige mais `email_confirmed_at`;
- o cadastro não exige checkbox de aceite nem valida nome, e-mail e senha localmente: quem
  valida é o Supabase, cuja mensagem é mais precisa;
- `setPendingLegalAcceptance()` nunca lança: guardar aceite é registro, não autorização.

O aceite continua sendo gravado quando existe. Ele deixou de decidir quem entra.

## RA-19 🟠 — entrada pelo catálogo local

`loginDoCatalogoLocal()` em `src/server/actions/auth.ts` roda **antes** do Supabase para
qualquer e-mail de `ACCOUNTS`. A conta do Rogério (`rogerio@aureacustodia.com.br`, senha
`12345678`) existe para garantir a demonstração do site mesmo com a autenticação fora.

Quando a conta ainda não existe no estado, é criada com o saldo e o acervo de `DEMO_DATA`
em `src/domain/constants.ts` — R$ 85.000,00 e 18 moedas no caso do Rogério.

Remover antes do primeiro cliente real.

---

## RA-49 🟡 — conta desativada: Server Action e rotas de API aceitam sessão até o próximo ciclo

**Arquivos:** `conta-desativada.ts`, `src/app/entrar/sair/route.ts`, `src/app/api/state/route.ts`, `src/app/(app)/layout.tsx`

- Server Actions e rotas de `/api/*` leem `getSessionEmail()` sem perguntar a situação — uma aba
  aberta ainda consegue agir até o próximo `GET /api/state` (até 10 s) ou uma chamada feita à mão.
- Banco fora do ar = conta tratada como ativa (instabilidade não é desativação).
- `GET /entrar/sair` desloga qualquer um que abra o link (não exige sessão válida).
- A resposta `user_banned` do Supabase vem antes da conferência da senha, então a frase de conta
  desativada aparece para quem digita o e-mail certo com a senha errada.

**Como se paga:** checagem da situação dentro de `getSessionEmail` (ou num `middleware.ts`) com cache curto,
antes de cliente real.

---

## RA-50 🟡 — tela de nova senha sem a senha atual para quem tem sessão

**Arquivos:** `src/server/actions/auth.ts`, `src/app/entrar/nova-senha/`

- `/entrar/nova-senha` troca a senha sem pedir a atual para qualquer sessão da plataforma que
  também tenha sessão do Supabase com o mesmo e-mail — não só a aberta pelo link (o próprio Supabase dá
  esse poder à sessão, no padrão dele).
- Link de recuperação por `?code=` (PKCE) cai no login comum.
- Sem regra local de tamanho de senha (validação delegada ao Supabase).

**Como se paga:** exigir sessão de recuperação (claim `amr` do Supabase) e troca obrigatória no primeiro acesso, antes de cliente real.
