# Relatório final — Branch A `feat/auth-landing`

```
Data:       06/09/2026
Branch:     feat/auth-landing
Base:       main local no commit 657dd9f
Objetivo:   landing pública, cadastro funcional e autenticação Supabase/Google
Deploy:     Vercel (aurea-custodia-mvp.vercel.app)
```

## Resultado entregue

A Branch A foi rebaseada sobre a `main` que já continha as entregas das frentes B e C. O
fluxo público agora é:

```text
/                    landing pública
/cadastrar           criação de conta por e-mail ou Google
/entrar              login por e-mail/senha ou Google
/entrar/callback     confirmação de e-mail e retorno OAuth
/inicio              plataforma autenticada com dados fictícios
/termos              termos provisórios preenchidos
/privacidade         política provisória preenchida
```

Uma conta confirmada é provisionada automaticamente, no servidor, com R$ 5.000,00 de saldo
fictício e seis moedas fictícias. A operação é idempotente: abrir o callback novamente não
duplica saldo ou moedas. As contas dos sócios devem ser recriadas pelo cadastro real, como
decidido, e não migradas do catálogo histórico.

## Modificações funcionais

### Landing, rotas e documentos legais

- A raiz deixou de ser o formulário de login e passou a explicar a Áurea Custódia.
- `/entrar` e `/cadastrar` receberam formulários próprios e responsivos.
- O layout autenticado manda visitantes sem sessão para `/entrar`.
- `/termos` e `/privacidade` contêm rascunhos utilizáveis no teste e deixam explícita a
  revisão jurídica posterior.

### Supabase Auth e Google OAuth

- `registerWithEmail()` chama o Supabase, registra nome e versões legais em metadata e
  solicita confirmação por e-mail.
- `registerWithGoogle()` guarda o aceite legal temporário, inicia OAuth com Google e volta
  ao callback servidor.
- `login()` usa `signInWithPassword`; `loginWithGoogle()` permite retornar com uma conta
  Google já provisionada.
- O callback aceita o token de confirmação por e-mail ou o código PKCE do Google, atualiza
  o aceite e só então cria a sessão interna.
- `changePassword()` valida a senha atual e grava a nova senha no Supabase Auth.

### Provisionamento de dados de teste

- O novo `src/server/auth/provisioning.ts` cria o usuário interno somente depois da
  identidade confirmada.
- Saldo inicial: `500_000` centavos (R$ 5.000,00).
- Acervo inicial: seis moedas geradas pela mesma regra fictícia do seed.
- A mutação passa por `mutateState()`: com Postgres, usa as tabelas, ledger e auditoria da
  frente B; sem Postgres, conserva o adaptador de desenvolvimento.

### Remoções

Foram removidos os quatro atalhos da demonstração anterior:

- `src/app/criar-conta/page.tsx`
- `src/app/entrar-demo/route.ts`
- `src/components/login/SignupForm.tsx`
- `src/server/actions/signup.ts`

Assim, não existe mais entrada por URL sem senha nem um cadastro paralelo ao Supabase.

### Contingência temporária

Em um ambiente sem `SUPABASE_URL` e chave publicável, as sete contas históricas do seed
continuam entrando por `/entrar`. Isso mantém desenvolvimento e rebase operáveis. Em um
ambiente configurado, esse caminho não é usado. A decisão está registrada no RA-17.

## Arquivos e grupos alterados

- `src/app/`: landing, páginas públicas, callback, guarda do layout e remoção das rotas demo.
- `src/components/landing/`, `login/`, `legal/`: interface pública e formulários.
- `src/server/actions/auth.ts`: login, cadastro, Google e logout.
- `src/server/actions/account.ts`: troca de senha Supabase com contingência local.
- `src/server/auth/`: cliente, configuração, callback, aceite, autorização e provisionamento.
- `src/styles/landing.css` e `src/styles/legal.css`: apresentação e responsividade.
- `.env.example`: tabela completa das variáveis de Auth e cadastro.
- `RISCOS_ASSUMIDOS.md` e `ATALHOS.md`: RA-15 encerrado e RA-17 registrado.
- Documentação: guia de configuração, entrega técnica, catálogo, contas de teste e este
  relatório final.

## Variáveis esperadas na Vercel

| Key | Value para o deployment atual |
|---|---|
| `SUPABASE_URL` | URL do projeto mostrada em Supabase → Project Settings → API |
| `SUPABASE_PUBLISHABLE_KEY` | chave `sb_publishable_...` do mesmo painel |
| `AUREA_SIGNUP_ENABLED` | `true` |
| `AUREA_TERMS_VERSION` | `rascunho-teste-2026-09-06` |
| `AUREA_PRIVACY_VERSION` | `rascunho-teste-2026-09-06` |
| `AUREA_SITE_URL` | `https://aurea-custodia-mvp.vercel.app` |
| `AUREA_TERMS_URL` | `https://aurea-custodia-mvp.vercel.app/termos` |
| `AUREA_PRIVACY_URL` | `https://aurea-custodia-mvp.vercel.app/privacidade` |
| `AUTH_LEGAL_SECRET` | o valor aleatório já configurado |
| `SESSION_SECRET` | o valor aleatório já configurado |

Aliases antigos de chave pública continuam aceitos pelo código, mas o nome recomendado é
`SUPABASE_PUBLISHABLE_KEY`.

## Conferência externa depois do merge

1. Fazer o merge local da `feat/auth-landing` na branch que será publicada.
2. Publicar na Vercel e abrir `https://aurea-custodia-mvp.vercel.app/cadastrar`.
3. Criar uma conta por e-mail, abrir a confirmação recebida e conferir a chegada em
   `/inicio` com R$ 5.000,00 e seis moedas.
4. Sair, voltar a `/entrar` e entrar com a mesma conta.
5. Em `/cadastrar`, aceitar os documentos e testar “Continuar com Google”.
6. Sair e testar “Entrar com Google” em `/entrar` com a mesma identidade.

Para o Google, o redirect cadastrado no Google Cloud deve ser o callback do Supabase
`https://<project-ref>.supabase.co/auth/v1/callback`. No Supabase, a lista de Redirect URLs
deve conter `https://aurea-custodia-mvp.vercel.app/entrar/callback`.

## Domínio e e-mail

Nenhum domínio HostGator é necessário para este teste. A aplicação permanece hospedada na
Vercel e usa a URL `vercel.app`. HostGator/Titan continua responsável pela caixa humana
`contato@aureacustodia.com.br`. Quando o domínio próprio for ligado, o procedimento está em
`GUIA_VERCEL_HOSTGATOR_EMAIL_E_DOMINIOS.md`; não é preciso contratar hospedagem web na
HostGator.

## Evidências locais

- `npm run typecheck`: aprovado sem erros.
- `npm run lint`: aprovado sem erros ou avisos.
- `npm test`: 27 arquivos aprovados, 161 testes aprovados e 1 teste externo já marcado
  como `skip` pelo projeto.
- `npm run build`: aprovado; 23 páginas geradas, incluindo `/`, `/cadastrar`, `/entrar`,
  `/entrar/callback`, `/termos` e `/privacidade`.
- Navegador local: as três telas públicas renderizaram sem overlay; os botões Google estão
  presentes. Como o `.env.local` não possui Auth, `/cadastrar` permaneceu fechado localmente,
  exatamente como previsto pela trava de configuração.
- Testes novos: configuração fechada/aberta, origem Vercel e provisionamento idempotente.
