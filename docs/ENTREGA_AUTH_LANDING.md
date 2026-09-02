# Relatório completo da Branch A — `feat/auth-landing`

> Documento de entrega da frente de landing pública, login, criação de contas e
> integração com Supabase Auth.

| Identificação | Valor |
| --- | --- |
| Branch | `feat/auth-landing` |
| Data da execução | 02/09/2026 |
| Commit-base | `dd38a74b6a6be0c9648d4677954fcce06cebb29f` |
| Commit da implementação | `0e2f1f41dc9fdff267468309a2b3cfe8d96aaccf` |
| Commit publicado | `0e2f1f4 Cria landing e autenticação segura com Supabase` |
| Remoto | `origin/feat/auth-landing` |
| Volume da implementação | 23 arquivos; 1.432 inserções e 279 remoções |
| Estado funcional | Código, build e interface concluídos; ativação externa pendente |

## 1. Resumo executivo

A raiz `/`, antes usada como tela de login do port legado, passou a ser uma
landing institucional pública da Áurea Custódia. O login foi movido para
`/entrar`, foi criada a rota `/cadastrar` e ambos os fluxos passaram a usar o
Supabase Auth. A conferência de senha deixou de consultar `ACCOUNTS` ou
`user.pass` no fluxo desta branch.

Foram implementados:

- login por e-mail e senha;
- criação de conta por e-mail, com confirmação obrigatória;
- criação/entrada por Google OAuth com PKCE;
- callback exclusivamente no servidor;
- registro versionado do aceite dos Termos de Uso e da Política de Privacidade;
- trava operacional para manter o cadastro fechado enquanto o RA-03 estiver
  pendente;
- ligação segura entre a identidade autenticada e os dados mockados que serão
  carregados pela frente B;
- redirects protegidos sem exibir o casco da aplicação e sem criar laços;
- landing, login e cadastro responsivos e acessíveis;
- documentação local dos novos diretórios e deste processo de entrega.
- páginas preenchidas de Termos de Uso e Política de Privacidade, marcadas como
  rascunhos pendentes de revisão jurídica;
- guia operacional com valores conhecidos e configuração de Vercel, Supabase,
  Google OAuth e SMTP Resend.

O primeiro commit foi validado por typecheck, testes, ESLint, build de produção
e inspeção real no navegador em desktop e mobile. Nenhuma conta real foi criada
e nenhum e-mail real foi transmitido durante a execução. Os documentos agora
existem como rascunhos operacionais, mas ainda não são versões juridicamente
aprovadas.

## 2. Escopo recebido e decisões adotadas

### 2.1 Escopo da frente A

A implementação ficou dentro da propriedade definida para a Branch A:

- página pública `/`;
- `/entrar`;
- `/cadastrar`;
- `/entrar/callback`;
- alteração apenas do destino de redirect em `src/app/(app)/layout.tsx`;
- componentes de landing e autenticação;
- folha de estilo pública;
- módulos de autenticação, autorização e sessão no servidor;
- Server Actions de autenticação;
- documentação da própria frente.

Não foram alterados números de negócio, taxas, regras de mercado, catálogo de
produtos, tipos protegidos, persistência da frente B, pagamentos da frente C ou
textos de títulos da Topbar.

### 2.2 Recriação das contas

Foi incorporada a decisão expressa nesta execução:

- as sete contas antigas de teste não serão migradas;
- as identidades serão recriadas do zero;
- a criação de contas precisa existir para permitir autenticação real;
- os e-mails reais dos sócios serão usados no teste final;
- dados, saldos e moedas continuarão mockados;
- a ligação entre identidade e dados será feita pelo e-mail normalizado em
  minúsculas;
- criar uma identidade não deve inventar saldo, inventário ou perfil de teste.

Por essa razão, autenticar no Supabase é necessário, mas não suficiente para
entrar em `/inicio`: o mesmo e-mail também precisa existir no estado carregado
pela frente B.

### 2.3 Decisões regulatórias e de comunicação

- O cadastro público permanece fechado até existirem Termos de Uso e Política
  de Privacidade aprovados e versionados.
- A landing não afirma que a apólice já está contratada. O texto informa que a
  operação prevê seguro e que cobertura e apólice serão publicadas quando a
  contratação estiver concluída.
- Não foi introduzida qualquer referência a blockchain, tokenização ou NFT
  on-chain.
- Foram reutilizados logotipo, cores e tokens oficiais do repositório.
- A interface mantém a identificação de ambiente de teste, Pré-MVP e dados
  fictícios.

## 3. Processo executado

### 3.1 Leitura e preparação

Antes das alterações foram lidos os documentos obrigatórios do repositório:

1. `AGENTS.md`;
2. `CLAUDE.md`;
3. `docs/diario/CRITICAL_DEBUGS.md`;
4. `docs/diario/RITUAL_DE_SESSAO.md`;
5. `.claude/commands/commit.md`;
6. os documentos de divisão das frentes e o briefing da Branch A.

Também foram conferidos o estado do Git, a branch-base, o contrato das rotas,
as restrições de propriedade de arquivos e a situação inicial dos testes.

### 3.2 Implementação

A execução técnica foi dividida nestas etapas:

1. transformação da raiz em landing pública;
2. mudança do login para `/entrar`;
3. criação da interface de cadastro;
4. criação da configuração server-only do Supabase Auth;
5. troca do login legado pela autenticação do Supabase;
6. criação dos fluxos de cadastro por e-mail e Google;
7. criação do callback SSR/PKCE;
8. implementação do aceite legal assinado no OAuth;
9. implementação da ponte de provisionamento com o estado mockado;
10. correção dos redirects do layout protegido;
11. criação dos estilos responsivos e ajustes de acessibilidade;
12. criação dos READMEs de cada diretório novo;
13. verificação de segurança, testes, build e inspeção visual;
14. commit e push da branch.

### 3.3 Conferência de referências oficiais

O fluxo foi comparado com a documentação oficial do Supabase para Next.js,
templates de confirmação SSR e troca de código PKCE por sessão. Essa conferência
determinou, em especial:

- uso do cliente SSR apenas no servidor;
- confirmação por `token_hash`, sem sessão no fragmento da URL;
- troca de `code` por sessão no callback do Google;
- URL de retorno controlada pela aplicação;
- uso exclusivo da chave pública/anon, nunca da `service_role`.

## 4. Arquitetura final

### 4.1 Separação de responsabilidades

O fluxo foi separado em três camadas:

| Camada | Responsabilidade |
| --- | --- |
| Supabase Auth | Criar a identidade, armazenar hash de senha, confirmar e-mail e validar Google OAuth |
| Sessão interna | Transportar por cookie HMAC apenas o e-mail que já foi autenticado |
| AppState/frente B | Confirmar que aquele e-mail recebeu dados mockados e pode usar a plataforma |

Essa separação evita que o cadastro da frente A escreva saldos ou moedas e
permite que a frente B troque a persistência sem mudar a interface de login.

### 4.2 Login por e-mail e senha

```text
/entrar
  -> Server Action login(email, senha)
  -> Supabase signInWithPassword
  -> e-mail precisa estar confirmado
  -> authorizeProvisionedUser(email)
  -> atualiza prevAccess e lastAccess
  -> cria aurea_session assinado
  -> /inicio
```

Detalhes:

- e-mail é normalizado com `trim().toLowerCase()`;
- campos vazios usam uma resposta genérica;
- e-mail inexistente e senha incorreta retornam a mesma mensagem, evitando
  enumeração de contas;
- identidade não confirmada é desconectada localmente;
- identidade sem dados mockados não recebe sessão interna;
- o carimbo de último acesso só muda depois da autenticação e da confirmação do
  provisionamento.

### 4.3 Cadastro por e-mail

```text
/cadastrar
  -> aceita documentos legais vigentes
  -> registerWithEmail
  -> valida trava, nome, e-mail e senha
  -> Supabase signUp
  -> grava versões legais e accepted_at no metadata
  -> envia confirmação
  -> /entrar/callback?token_hash=...&type=email
  -> verifyOtp no servidor
  -> verifica provisionamento
  -> /inicio ou /entrar?status=conta-pendente
```

Validações implementadas no servidor:

- cadastro habilitado;
- versões e URLs legais presentes;
- checkbox de aceite marcado;
- nome com pelo menos três caracteres após normalização;
- formato mínimo de e-mail;
- senha com pelo menos oito caracteres.

A confirmação de senha também é validada na interface antes de chamar a
Server Action.

### 4.4 Cadastro/entrada com Google

```text
/cadastrar
  -> aceite legal
  -> cookie aurea_oauth_legal assinado, validade de 10 minutos
  -> Supabase signInWithOAuth(provider: google, PKCE)
  -> Google / Supabase
  -> /entrar/callback?code=...
  -> exchangeCodeForSession
  -> consome e apaga cookie legal
  -> grava metadata legal no usuário
  -> verifica provisionamento
  -> /inicio ou mensagem controlada
```

O aceite legal pendente usa HMAC-SHA256, cookie `HttpOnly`, `SameSite=Lax`,
`Secure` em produção e caminho restrito a `/entrar/callback`. O navegador não
consegue editar versões legais confiáveis apenas alterando um campo de
formulário.

### 4.5 Logout

O logout apaga primeiro `aurea_session` e depois encerra a sessão local do
cliente Supabase SSR. Se o Supabase estiver sem configuração, a ausência da
integração não prende a pessoa na aplicação: a sessão interna já terá sido
removida.

### 4.6 Redirects e prevenção de laço

- `/`, `/entrar` e `/cadastrar` verificam a sessão no servidor.
- Uma sessão válida e provisionada segue para `/inicio`.
- Cookie válido apontando para e-mail que não existe mais no estado não causa
  redirect para `/inicio`.
- Rotas sob `(app)` enviam visitantes sem sessão ou sem provisionamento para
  `/entrar`.
- A landing não participa do ciclo das rotas protegidas.

Isso cobre o cenário esperado de banco recriado, seed trocado ou conta criada
antes da carga mockada sem produzir `ERR_TOO_MANY_REDIRECTS`.

## 5. Segurança implementada

### 5.1 Segredos e fronteira servidor/cliente

- Todos os módulos em `src/server/auth/` usam `server-only`.
- Nenhum Client Component cria um cliente Supabase.
- Nenhuma chave é persistida no repositório.
- A chave aceita é publicável/anon; a `service_role` não é usada.
- `SESSION_SECRET` e `AUTH_LEGAL_SECRET` nunca cruzam para o bundle do
  navegador.
- A configuração é lida apenas quando uma autenticação real é solicitada, de
  modo que o build funcione sem credenciais e o usuário receba erro controlado.

### 5.2 Sessão interna

O cookie `aurea_session`:

- contém apenas o e-mail codificado em base64url e uma assinatura HMAC-SHA256;
- não contém senha, access token, refresh token nem dados de perfil;
- usa `HttpOnly`;
- usa `SameSite=Lax`;
- usa `Secure` em produção;
- vale sete dias;
- rejeita assinatura inválida com comparação em tempo constante;
- exige `SESSION_SECRET` em runtime de produção.

### 5.3 Cadastro fechado em duas camadas

O formulário fica desabilitado quando o cadastro está fechado, mas essa é
apenas a primeira camada. As Server Actions recalculam o estado da trava antes
de criar qualquer identidade. Portanto, remover `disabled` pelo inspetor do
navegador ou forjar uma chamada não contorna o RA-03.

### 5.4 Dados pessoais e erros

- Nenhum dado real foi enviado durante a implementação.
- Mensagens de login não revelam se um e-mail existe.
- Erros internos e de configuração são convertidos em mensagens controladas.
- O callback rejeita parâmetros ausentes, token inválido, aceite Google ausente
  e metadata não gravada.

## 6. Configuração externa necessária

### 6.1 Variáveis do Supabase Auth

Configurar em Development, Preview e Production:

```text
SUPABASE_URL=<Project URL>
SUPABASE_PUBLISHABLE_KEY=<chave publicável>
```

Aliases aceitos para compatibilidade:

```text
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Mesmo quando um alias começa com `NEXT_PUBLIC_`, a integração criada nesta
branch continua sendo importada somente no servidor. Nunca substituir a chave
publicável pela `service_role`.

### 6.2 Segredos de cookies

```text
SESSION_SECRET=<segredo aleatório forte>
AUTH_LEGAL_SECRET=<segredo aleatório forte, opcional se SESSION_SECRET existir>
```

Em produção, a sessão interna falha fechada sem `SESSION_SECRET`. O aceite legal
do OAuth aceita `AUTH_LEGAL_SECRET` e, na ausência dele, reutiliza
`SESSION_SECRET`.

### 6.3 Controle da abertura de cadastro

O cadastro somente abre quando todas as condições abaixo forem atendidas:

```text
AUREA_SIGNUP_ENABLED=true
AUREA_TERMS_VERSION=<versão vigente>
AUREA_PRIVACY_VERSION=<versão vigente>
```

As URLs são opcionais. Sem `AUREA_TERMS_URL` e `AUREA_PRIVACY_URL`, o código usa
`/termos` e `/privacidade`. Para Produção, recomenda-se configurar as URLs
absolutas para tornar a operação explícita.

Não definir `AUREA_SIGNUP_ENABLED=true` antes da entrega dos documentos pelo
advogado e da aprovação das versões pelos sócios.

### 6.4 Origem e URLs de callback

Opcionalmente configurar:

```text
AUREA_SITE_URL=https://<domínio>
```

Também é aceito `NEXT_PUBLIC_SITE_URL`. Sem uma URL fixa, o código deriva a
origem de `x-forwarded-host`, `host` e `x-forwarded-proto`, preservando localhost
e previews isolados.

Adicionar no Supabase as URLs permitidas da aplicação:

```text
http://localhost:<porta>/entrar/callback
https://<preview>/entrar/callback
https://<domínio-de-produção>/entrar/callback
```

### 6.5 Google OAuth

1. Criar/configurar credenciais OAuth no Google Cloud.
2. Habilitar o provedor Google no Supabase.
3. Informar Client ID e Client Secret no painel do Supabase.
4. No Google Cloud, autorizar a URI do próprio Supabase terminada em
   `/auth/v1/callback`.
5. No Supabase, autorizar as URLs `/entrar/callback` da aplicação.
6. Validar o fluxo em Preview e Produção.

O código solicita `access_type=offline` e `prompt=consent` e usa retorno PKCE.

### 6.6 Confirmação de e-mail e Resend

No template **Confirm signup** do Supabase, configurar o link SSR:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">Confirmar e-mail</a>
```

No painel do Supabase:

1. configurar SMTP customizado com as credenciais do Resend;
2. usar domínio/remetente verificado;
3. desabilitar tracking de links para esse e-mail;
4. enviar um teste;
5. confirmar que o link chega a `/entrar/callback` sem ser reescrito.

As credenciais do Resend ficam apenas nos painéis dos serviços.

## 7. Detalhamento arquivo por arquivo

### 7.1 Rotas

#### `src/app/page.tsx` — modificado

- Substituiu a tela de login pela landing pública.
- Adicionou metadata institucional.
- Mantém a decisão de redirect no servidor.
- Só consulta o estado quando existe cookie de sessão.
- Redireciona para `/inicio` apenas se a identidade estiver provisionada.
- Sessão antiga ou e-mail ausente no estado permanece na landing, sem laço.

#### `src/app/entrar/page.tsx` — criado

- Tornou `/entrar` a rota oficial do login.
- Adicionou título e descrição próprios.
- Reaproveita o guarda server-side de sessão e provisionamento.
- Traduz `?erro=callback` em mensagem amigável.
- Traduz `?status=conta-pendente` em confirmação de e-mail com orientação de
  carga dos dados de teste.
- Informa ao formulário se novos cadastros estão abertos.

#### `src/app/cadastrar/page.tsx` — criado

- Criou a rota de cadastro.
- Calcula o estado da trava legal no servidor.
- Redireciona sessão já provisionada para `/inicio`.
- Exibe erro específico quando o aceite do fluxo Google expirou.
- Entrega apenas a visão necessária de configuração ao Client Component.

#### `src/app/termos/page.tsx` — criado na ampliação da entrega

- Publica um rascunho versionado de Termos de Uso.
- Cobre conta, custódia, recibo, marketplace, pagamentos, seguro, consumidor,
  condutas proibidas e solução de conflitos.
- Declara expressamente o Pré-MVP, os dados fictícios, a ausência de dinheiro
  real e a revisão jurídica pendente.

#### `src/app/privacidade/page.tsx` — criado na ampliação da entrega

- Publica um rascunho versionado de Política de Privacidade.
- Informa categorias de dados, finalidades, bases legais, fornecedores,
  cookies, transferências, retenção, segurança e direitos do titular.
- Identifica o texto como provisório e mantém o RA-03 aberto.

#### `src/app/entrar/callback/route.ts` — criado

- Aceita `code` do fluxo Google PKCE.
- Aceita `token_hash` com `type=email` para confirmação SSR.
- Troca/valida os códigos exclusivamente no servidor.
- Consome o aceite legal assinado no retorno Google.
- Grava versões e data do aceite no metadata da identidade Google.
- Desconecta identidades sem aceite ou sem provisionamento.
- Cria a sessão interna apenas depois de todas as validações.
- Usa redirects controlados para sucesso, conta pendente e falha.

#### `src/app/(app)/layout.tsx` — modificado

- Alterou somente os redirects de visitantes não autenticados ou não
  provisionados, de `/` para `/entrar`.
- Preservou o casco, providers, estado e limites de propriedade das demais
  frentes.

#### READMEs de rota — criados

- `src/app/entrar/README.md` documenta a responsabilidade da rota de entrada.
- `src/app/entrar/callback/README.md` documenta o callback e seus formatos.
- `src/app/cadastrar/README.md` documenta a trava do cadastro.
- `src/app/termos/README.md` e `src/app/privacidade/README.md` documentam o
  caráter provisório dos textos legais.

### 7.2 Componentes

#### `src/components/landing/LandingPage.tsx` — criado

- Implementou cabeçalho com marca e CTAs.
- Implementou hero institucional e selo visual com o logotipo oficial.
- Explicou custódia física, recibo digital e marketplace em três etapas.
- Incluiu a comunicação prudente sobre seguro ainda em contratação.
- Incluiu ambiente de teste e dados fictícios.
- Incluiu razão social e CNPJ no rodapé.
- Criou caminhos visíveis para Termos de Uso e Política de Privacidade.
- Usou `next/image`, `next/link`, landmarks semânticos e títulos hierárquicos.
- Não criou dependência de banco nem estado no navegador.

#### `src/components/login/LoginForm.tsx` — modificado

- Passou a chamar a Server Action baseada no Supabase Auth.
- Converteu o envio para um `<form>` semântico, permitindo Enter padrão.
- Adicionou `required`, `autocomplete` e feedback com `aria-live`.
- Adicionou estado de envio para impedir duplo submit.
- Preservou o controle de mostrar senha e o fechamento automático em três
  segundos.
- Removeu da interface qualquer listagem de credenciais de teste.
- Adicionou navegação de volta à landing e acesso ao cadastro.
- Recebe feedback inicial do callback e o estado de abertura do cadastro.

#### `src/components/login/RegisterForm.tsx` — criado

- Implementou nome, e-mail, senha e confirmação de senha.
- Implementou aceite obrigatório de Termos e Política.
- Abre os documentos em nova aba quando as URLs estão configuradas.
- Implementou cadastro por e-mail e início do fluxo Google.
- Desabilita todo o fieldset quando o cadastro está fechado.
- Exibe o motivo operacional da trava.
- Informa que dados pessoais não serão enviados sem documentos vigentes.
- Implementou mensagens de erro/sucesso e estados de processamento.
- Preservou alvos de interação com altura mínima acessível.

#### `src/components/landing/README.md` — criado

Documenta o caráter público, institucional e sem estado do componente da
landing.

#### `src/components/legal/LegalDocument.tsx` — criado na ampliação

- Compartilha cabeçalho, navegação, versão, aviso de rascunho e rodapé dos dois
  documentos legais.
- Mantém marca e acessibilidade consistentes com a landing.

#### `src/components/legal/README.md` — criado na ampliação

Registra que o aviso de revisão jurídica só pode ser removido depois da
aprovação formal.

### 7.3 Servidor e autenticação

#### `src/server/actions/auth.ts` — modificado

- Removeu do fluxo da Branch A a comparação de senha com `ACCOUNTS` e
  `user.pass`.
- Implementou `login` via `signInWithPassword`.
- Implementou `registerWithEmail` via `signUp`.
- Implementou `registerWithGoogle` via `signInWithOAuth`.
- Implementou mensagens controladas para credenciais, confirmação,
  provisionamento, configuração e falha genérica.
- Aplica a trava legal novamente no servidor.
- Normaliza dados e valida nome, e-mail e senha.
- Grava `full_name`, versões legais e timestamp de aceite no cadastro por
  e-mail.
- Prepara o aceite legal assinado antes de sair para o Google.
- Implementa logout interno e Supabase local.

#### `src/server/auth/config.ts` — criado

- Centralizou a leitura tardia das variáveis do Supabase.
- Criou erro próprio de configuração para respostas controladas.
- Aceitou aliases novos e históricos de URL/chave publicável.
- Rejeita URL legal que não seja HTTP/HTTPS válida.
- Calcula o estado do cadastro com três travas: Auth configurado, habilitação
  explícita e documentos completos/versionados.

#### `src/server/auth/client.ts` — criado

- Cria o cliente Supabase SSR server-only.
- Integra `getAll` e `setAll` com os cookies do Next.js.
- Mantém o verificador PKCE e a sessão transitória necessários ao callback.
- Não exporta configuração para Client Components.

#### `src/server/auth/origin.ts` — criado

- Monta a URL `/entrar/callback` a partir de configuração explícita ou headers
  da requisição.
- Suporta localhost, Preview e Produção sem domínio codificado no fonte.

#### `src/server/auth/legal.ts` — criado

- Criou o cookie temporário `aurea_oauth_legal`.
- Assina o payload legal com HMAC-SHA256.
- Guarda versões dos dois documentos e momento do aceite.
- Limita a validade a dez minutos e o caminho ao callback.
- Consome e apaga o cookie em uma única leitura.
- Valida assinatura em tempo constante e estrutura do payload.

#### `src/server/auth/authorization.ts` — criado

- Implementou a ponte entre identidade Supabase e usuário mockado.
- Normaliza o e-mail antes da consulta.
- Recusa identidades que ainda não existem no estado.
- Atualiza `prevAccess` e `lastAccess` na mutação autorizada.
- Não cria saldo, moeda ou usuário vazio.

#### `src/server/session.ts` — modificado

- Atualizou a documentação e a semântica da sessão interna para deixar claro
  que a identidade é validada antes pelo Supabase.
- Preservou o contrato consumido pelas demais Server Actions.
- Mantém cookie HMAC server-only, sem senha ou token de provedor.

#### `src/server/auth/README.md` — criado

Documenta os fluxos, o template SSR, as variáveis, o SMTP Resend e a fronteira
entre autenticação e carga mockada da frente B.

### 7.4 Estilos

#### `src/styles/landing.css` — criado

- Criou estilos exclusivos da landing e autenticação pública.
- Reutilizou tokens oficiais (`--gold`, `--text`, `--card`, sombras e fontes).
- Usou `auto-fit`, `minmax`, `clamp` e `flex-wrap` para responsividade fluida.
- Não adicionou media query fora de `responsive.css`.
- Implementou cards, hero, halo da marca, grid do cadastro, trava legal e
  feedbacks.
- Garantiu mínimo de 44 px nos principais alvos interativos.

#### `src/styles/legal.css` — criado na ampliação

- Estiliza leitura longa, aviso provisório, navegação e rodapé.
- Usa os tokens oficiais e layout fluido, sem criar media query fora da folha
  responsiva.

#### `src/app/globals.css` — modificado

- Adicionou somente o import de `landing.css`.
- Manteve `responsive.css` como último import, preservando a regra estrutural
  do projeto.

### 7.5 Documento original da entrega — ampliado

#### `docs/ENTREGA_AUTH_LANDING.md`

Este arquivo foi criado no commit da implementação com o resumo operacional e
foi ampliado posteriormente para este relatório completo, a pedido do usuário.

#### `docs/CONFIGURACAO_BRANCH_A_SUPABASE_GOOGLE_RESEND.md` — criado

Concentra os valores já conhecidos, o único valor que ainda precisa ser copiado
do painel, o passo a passo de Google OAuth/Resend, as responsabilidades do
operador e o teste de ponta a ponta.

## 8. Critérios de aceite e resultado

| Critério | Resultado |
| --- | --- |
| Landing pública na raiz | Concluído |
| Login em `/entrar` | Concluído |
| Cadastro por e-mail | Código concluído; ativação externa pendente |
| Confirmação de e-mail | Código concluído; template/SMTP pendentes |
| Google OAuth PKCE | Código concluído; credenciais do provedor pendentes |
| Aceite legal versionado | Concluído no código; rascunhos preenchidos; aprovação jurídica pendente |
| Cadastro fechado por padrão | Concluído e validado em cliente e servidor |
| Senha fora de `ACCOUNTS` no novo login | Concluído na Branch A |
| Conta real separada de dados mockados | Concluído pela trava de provisionamento |
| Rotas internas protegidas | Concluído |
| Sem laço após recriação do banco | Concluído |
| Responsividade desktop/mobile | Concluído |
| Documentação de diretórios novos | Concluído, inclusive rotas legais |
| Contas reais dos sócios criadas | Não executado; depende da configuração externa |
| Dados mockados carregados nas contas reais | Não executado; responsabilidade/integração com a frente B |

## 9. Validações executadas

### 9.1 Verificações automatizadas

| Verificação | Resultado |
| --- | --- |
| `npm run typecheck` | Verde, sem erros TypeScript |
| `npm test` | 38 de 38 testes verdes |
| ESLint direcionado aos arquivos da frente A | Verde |
| `npm run build` | Verde, com as novas rotas geradas |
| Varredura de segredo no diff | Nenhum segredo ou credencial real encontrado |
| Conferência de imports proibidos | Nenhum Client Component importou `@/server/*` fora do padrão de Server Action |

Depois da ampliação com os documentos legais e este relatório, a validação foi
repetida: typecheck verde, 38/38 testes verdes, ESLint direcionado verde e build
verde com 21 páginas, incluindo `/termos` e `/privacidade` como conteúdo
estático.

O build precisou acessar a rede para resolver as fontes do Google. Depois de
permitido esse acesso, concluiu normalmente; não houve falha de código.

### 9.2 Verificação no navegador

Foram inspecionadas as páginas públicas em desktop e em viewport de `390 ×
844`:

- landing carregada sem overlay inesperado;
- login carregado e navegável;
- cadastro fechado exibindo a justificativa correta;
- ausência de erros no console;
- ausência de rolagem horizontal;
- reorganização fluida de hero, cards, botões e formulário;
- botões principais medidos entre 47 e 49 px, acima do mínimo de 44 px;
- `/inicio` sem sessão redirecionando para `/entrar` sem laço.
- `/termos` e `/privacidade` carregadas localmente com título, versão e aviso de
  rascunho visíveis, sem erro ou warning no console da página.

### 9.3 Limite deliberado do teste

Não foi possível executar cadastro real, entrega de e-mail ou Google OAuth de
ponta a ponta porque faltavam:

- URL/chave do projeto Supabase Auth no ambiente;
- provedor Google configurado;
- SMTP Resend configurado;
- aprovação jurídica dos rascunhos de Termos e Privacidade;
- decisão de abertura `AUREA_SIGNUP_ENABLED=true`.

O comportamento validado nessas condições é o esperado: cadastro fechado e
tentativa de autenticação com mensagem controlada de ambiente não configurado.

## 10. Situação das pendências de segurança

### RA-03 — documentos legais

Permanece aberto. A branch agora fornece rascunhos preenchidos e versionados,
mas não os apresenta como aprovação jurídica. A coleta pública continua
dependendo de habilitação explícita e da decisão dos responsáveis.

### Senhas legadas / RA-02

O login implementado nesta branch não usa mais a senha de `ACCOUNTS` nem
`user.pass`. Entretanto, os campos e caminhos legados ainda podem existir na
base enquanto a frente B conclui a migração do estado. Portanto, a eliminação
global da dívida deve ser confirmada na integração das branches, não apenas no
diff da Branch A.

## 11. Ordem segura para recriar as contas reais

1. Integrar primeiro a persistência da frente B ou confirmar o contrato final
   de provisionamento por e-mail.
2. Revisar os rascunhos de Termos de Uso e Política de Privacidade incluídos.
3. Obter aprovação jurídica e dos sócios e gerar uma nova versão.
4. Publicar/manter os dois documentos nas URLs HTTPS da aplicação.
5. Configurar Supabase Auth, segredos, callbacks, Google e SMTP Resend.
6. Manter `AUREA_SIGNUP_ENABLED` diferente de `true` durante a preparação.
7. Abrir o cadastro apenas em ambiente controlado.
8. Criar as contas com os e-mails reais dos sócios.
9. Confirmar cada e-mail.
10. Carregar os dados mockados da frente B usando os e-mails normalizados.
11. Testar, para cada sócio: confirmação, login, `/inicio`, recarga, logout e
    novo login.
12. Conferir `prevAccess` e `lastAccess`.
13. Fechar novamente o cadastro se a abertura tiver sido apenas operacional.
14. Só discutir abertura ao público depois do encerramento formal do RA-03.

Antes da etapa 10, a mensagem “conta autenticada, dados de teste ainda não
carregados” é uma trava esperada, não uma falha do Supabase.

## 12. O que o responsável pelo ambiente precisa fazer

- Fornecer ou configurar o projeto Supabase correto.
- Configurar as variáveis listadas na seção 6 em cada ambiente.
- Configurar Google OAuth.
- Configurar o template de confirmação SSR.
- Configurar SMTP Resend e remetente verificado.
- Revisar e aprovar os rascunhos de Termos de Uso e Política de Privacidade.
- Trocar as versões de rascunho pelas versões aprovadas.
- Coordenar com a frente B a carga mockada pelos e-mails reais.
- Executar o roteiro final das sete contas.
- Validar o domínio de produção antes de abrir o cadastro.

Não é necessário alterar o fluxo de autenticação desta branch para cadastrar as
contas depois que essas configurações estiverem prontas. Alterações solicitadas
pelo advogado devem ser aplicadas ao conteúdo das páginas legais e receber nova
versão.

## 13. Handoff de branches e ordem de integração

O contrato do repositório determina esta ordem:

```text
1. feat/banco-supabase      (B) — terminar, validar, publicar e integrar primeiro
2. feat/auth-landing        (A) — rebasear sobre B/main atualizado e integrar
3. feat/pagamentos-correios (C) — rebasear sobre B/main atualizado e integrar
```

Estado conferido em 02/09/2026:

| Branch | Commit local | Remoto |
| --- | --- | --- |
| `feat/banco-supabase` | `119aff8` | ainda não publicado na conferência |
| `feat/auth-landing` | `0e2f1f4` antes desta ampliação | publicado |
| `feat/pagamentos-correios` | `49f0c24` | publicado |

Ponto importante: **não é a B que deve ser rebaseada sobre A**. A B é a
fundação e deve entrar primeiro. Depois, o agente de integração rebaseia a A
sobre o `main` que já contém B:

```powershell
git fetch origin
git switch feat/auth-landing
git rebase origin/main
npm run typecheck
npm test
npm run build
git push --force-with-lease origin feat/auth-landing
```

Se a equipe quiser validar antes de fazer merge de B no `main`, B precisa ser
publicada e o rebase provisório pode ser feito diretamente sobre ela:

```powershell
git fetch origin
git switch feat/auth-landing
git rebase origin/feat/banco-supabase
```

O agente deve ler este relatório e
`docs/CONFIGURACAO_BRANCH_A_SUPABASE_GOOGLE_RESEND.md`, preservar o contrato de
`getState()`/`mutateState()` e resolver qualquer conflito sem restaurar o login
por `ACCOUNTS` ou `user.pass`.

## 14. Registro Git e publicação

A implementação foi criada sobre `dd38a74` e consolidada no commit:

```text
0e2f1f41dc9fdff267468309a2b3cfe8d96aaccf
Cria landing e autenticação segura com Supabase
```

O commit está publicado em `origin/feat/auth-landing`. Link para abrir a
comparação/PR:

<https://github.com/gabrielsilva-aureacustodia/AureaCustodiaMVP/compare/main...feat/auth-landing?expand=1>

Arquivos de briefing fornecidos fora do histórico da branch e artefatos de
outras frentes foram deliberadamente excluídos do commit.

## 15. Referências oficiais usadas

- [Supabase Auth com Next.js](https://supabase.com/docs/guides/auth/quickstarts/nextjs)
- [Templates de e-mail e confirmação SSR](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Troca de código PKCE por sessão](https://supabase.com/docs/reference/javascript/auth-exchangecodeforsession)
- [Google OAuth no Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [SMTP do Supabase](https://supabase.com/docs/guides/auth/auth-smtp)
- [Resend com Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp)
- [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- [Decreto nº 7.962/2013](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm)

## 16. Conclusão

A Branch A está pronta para integração técnica: landing, login, cadastro,
callback, segurança de sessão, aceite legal, provisionamento e documentação
foram implementados e validados. O que resta não é desenvolvimento desta
frente, mas configuração controlada dos serviços externos, conclusão jurídica
do RA-03, integração com a carga mockada da frente B e o teste final das contas
reais dos sócios.
