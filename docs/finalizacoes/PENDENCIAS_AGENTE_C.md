# Pendências da frente C — painel administrativo

```
Frente:  C · feat/c-painel-admin · worktree C:\dev\AureaCustodiaMVP-admin
Regra:   só o Agente C escreve aqui (protocolo, regra 8). Item resolvido não some:
         vira ✅ FEITO em dd/mm.
```

Cada item diz **o que falta**, **quem pode fazer**, **o que fica esperando** e **como conferir**.

---

## C1 — Fundação e Central de Resultados

### P-C1-01 · Aplicar as migrations 020 e 021 no Supabase de produção

- **Quando:** logo depois de a C1 entrar na `main` e o deploy da Vercel terminar — publicar e migrar
  são um passo só, nessa ordem (aprendizado de 11/09 no README das migrations).
- **Quem:** Gabriel, ou o agente de auditoria que levar a C1 para a `main`.
- **O que fica esperando:** a tabela de equipe (até lá, entra quem está na lista do ambiente, como
  dev — RA-40) e a gravação do registro de uso (até lá, `POST /api/eventos` responde 204 sem gravar).
  **Nada quebra sem elas:** as duas só criam tabelas, e o código cai no bootstrap se não as achar.
- **Comando**, no PowerShell, na pasta principal com a `main` atualizada:

```bash
npm run db:migrate
```

```bash
npm run db:check
```

- **Como conferir:** o `db:migrate` imprime `+ 020_admin_rbac` e `+ 021_eventos_uso`; o `db:check`
  lista as duas em "migrations aplicadas". Se `014` a `019` das outras frentes já estiverem na `main`,
  aparecem juntas — a ordem não importa, nenhuma depende da outra.

### P-C1-02 · Conferir em produção o "pronto quando" da C1

- **Quem:** Gabriel, depois do P-C1-01.
- **Roteiro:**
  1. Entrar em `https://aurea-custodia-mvp.vercel.app/entrar` com uma conta de sócio do seed (senha
     `12345678`). No menu do app aparece **Administração**; clicar abre `/admin`. (Endereço conferido
     em 14/09, respondendo 200; no domínio próprio, o caminho é o mesmo.)
  2. Abrir `/admin/resultados/financeiro`, `/contabil`, `/kpis` e `/uso` — as quatro carregam.
  3. Em `/admin/resultados/uso`, a trilha filtrada por "Ações do painel" fica vazia até a primeira ação;
     o cartão "Páginas abertas" cresce conforme a navegação.
  4. Entrar com uma conta criada por `/cadastrar`: o menu do app **não** mostra Administração, e
     `/admin` manda para `/inicio`.
  5. `https://aurea-custodia-mvp.vercel.app/relatorios` leva à Central de Resultados.
- **Se quiser usar o e-mail real** (`gabriel.silva@aureacustodia.com.br`) no painel: entre com uma
  conta de sócio do seed, abra `/admin/equipe` e dê acesso a ele com o papel **Desenvolvimento**. Não
  precisa mexer em variável de ambiente.

### P-C1-03 · Remover o painel antigo de relatórios, que ficou sem uso

- **O que:** `src/components/relatorios/` (`RelatoriosPainel.tsx` e o README),
  `src/server/actions/contabil.ts` e a função síncrona `autorizarRelatorio` de
  `src/server/relatorios/acesso.ts` (junto com os testes dela em `acesso.test.ts`). Desde a C1,
  `/relatorios` redireciona para `/admin/resultados/financeiro`, que reorganizou esse conteúdo com as
  permissões dos papéis.
- **Por que não removi:** os arquivos não estão na tabela de territórios da rodada, e remover é
  decisão de limpeza, não requisito da C1. Deixei a nota no topo do README da pasta.
- **Quem:** qualquer agente, com o seu aval, numa limpeza depois das três frentes na `main`.
- **O que fica esperando:** nada.
- **Como conferir:** depois da remoção, `npm run typecheck`, `npm test` e `npm run build` verdes, e
  nenhuma ocorrência de `RelatoriosPainel` em `src/`.

### P-C1-04 · Gaveta de verificação `aurea_local_admin` no Supabase (informativo)

- **O que é:** um schema separado, criado em 14/09 pelo `npm run db:migrate` com
  `AUREA_DB_SCHEMA=aurea_local_admin` — o caminho de ambiente local descrito em
  `src/server/db/README.md`. Serviu para conferir o painel no navegador contra um Postgres de verdade
  **sem tocar no schema `aurea`**. Tem só dado de demonstração: o seed, um papel "Contador" de teste,
  a conta `rozane@testeaurea.com.br` com esse papel, uma despesa lançada e estornada e ISS de 2,5%.
- **O que fica esperando:** nada. A C2 e a C3 podem reutilizá-la para a mesma conferência.
- **Se quiser apagar** (opcional, Gabriel), no editor SQL do Supabase:

```sql
DROP SCHEMA aurea_local_admin CASCADE;
```

- **Como conferir que foi apagada:** com a variável `AUREA_DB_SCHEMA` definida como
  `aurea_local_admin`, o `npm run db:check` responde "migration NÃO aplicada".

---

## C2 — Usuários e CS

### P-C2-01 · Aplicar as migrations 022 e 023 no Supabase de produção

- **Quando:** logo depois de a C2 entrar na `main` e o deploy da Vercel terminar.
- **Quem:** Gabriel, ou o agente de auditoria que levar a C2 para a `main`.
- **O que fica esperando:** `/admin/cs` (até lá, a tela diz que o banco não tem as tabelas do
  atendimento e pede o `db:migrate`), as notas internas e o ativar e desativar da ficha do usuário.
  A lista e a ficha de usuários, o ajuste de saldo, a inadimplência e o cadastro funcionam sem elas.
- **Comando**, no PowerShell, na pasta principal com a `main` atualizada:

```bash
npm run db:migrate
```

```bash
npm run db:check
```

- **Como conferir:** o `db:migrate` imprime `+ 022_cs_mensageria` e `+ 023_notas_e_atribuicoes`; o
  `db:check` lista as duas em "migrations aplicadas".

### P-C2-02 · Escolher o provedor de WhatsApp e ligar o atendimento

- **Decisão que é sua:** Evolution API (auto-hospedada, na faixa de US$ 5/mês de hospedagem) ou Z-API
  (serviço, na faixa de R$ 100/mês) — seção 10 do plano do Admin. **O adaptador pronto é o da
  Evolution** (`src/lib/mensageria/evolution.ts`), que é o que o plano lista. Se preferir a Z-API, me
  avise: é um arquivo novo atrás da mesma interface, num commit pequeno, sem mexer na tela.
- **O que fica esperando:** as mensagens de verdade. Até lá, `/admin/cs` funciona com o registro local:
  as respostas ficam só no painel, marcadas "Só no painel — sem WhatsApp conectado".
- **Eu não crio conta nem gero credencial.** Os passos abaixo são seus; os valores que eu conheço vão
  literais, e os que só existem do seu lado vão marcados como `COLE AQUI`.

**Passo 1 — o servidor da Evolution.** Hospede a Evolution API v2 (Railway, Fly.io ou outro). O que o
painel precisa dele: um endereço público `https://…` e a variável `AUTHENTICATION_API_KEY` definida no
ambiente do servidor (é a chave global da Evolution; o arquivo de exemplo dela vem com um valor de
fábrica que precisa ser trocado).

**Passo 2 — o segredo do webhook.** No PowerShell, gere um valor e guarde-o (ele é usado no passo 4 e
no passo 5):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Passo 3 — a instância e o QR code.** Numa janela do PowerShell, defina as três variáveis da sessão
(uma linha cada) e crie a instância `aurea-cs`:

```powershell
$evolution = "COLE AQUI A URL DO SERVIDOR DA EVOLUTION, SEM BARRA NO FIM"
```

```powershell
$chave = "COLE AQUI O VALOR DE AUTHENTICATION_API_KEY DO SERVIDOR DA EVOLUTION"
```

```powershell
$segredo = "COLE AQUI O VALOR GERADO NO PASSO 2"
```

```powershell
Invoke-RestMethod -Method Post -Uri "$evolution/instance/create" -Headers @{ apikey = $chave } -ContentType 'application/json' -Body '{"instanceName":"aurea-cs","integration":"WHATSAPP-BAILEYS","qrcode":true}'
```

Depois abra no navegador o gerenciador que vem com a Evolution — o endereço do servidor seguido de
`/manager` —, entre com a mesma chave, abra a instância `aurea-cs` e leia o QR code com o WhatsApp do
celular do atendimento, pela opção de conectar um aparelho (a mesma do WhatsApp Web).

(Conferido no código-fonte da Evolution em 14/09: `POST /instance/create` com `instanceName`,
`integration` = `WHATSAPP-BAILEYS` e `qrcode`; o gerenciador em `/manager`.)

**Passo 4 — o webhook da instância.** Na mesma janela do PowerShell (com as três variáveis do passo 3):

```powershell
$corpo = @{ webhook = @{ enabled = $true; url = 'https://aurea-custodia-mvp.vercel.app/api/webhooks/whatsapp'; byEvents = $false; base64 = $false; headers = @{ jwt_key = $segredo }; events = @('MESSAGES_UPSERT', 'MESSAGES_UPDATE') } } | ConvertTo-Json -Depth 5
```

```powershell
Invoke-RestMethod -Method Post -Uri "$evolution/webhook/set/aurea-cs" -Headers @{ apikey = $chave } -ContentType 'application/json' -Body $corpo
```

O cabeçalho `jwt_key` faz a Evolution mandar, em cada evento, um `Authorization: Bearer` com um JWT de
10 minutos assinado com o segredo — é o que o webhook do painel confere (conferido no código-fonte da
Evolution em 14/09). `base64: false` mantém o corpo pequeno.

**Passo 5 — as variáveis na Vercel.** No painel da Vercel, no projeto, em **Environment Variables**
(caminho conferido na documentação da Vercel em 14/09), crie as quatro, marcando o ambiente
**Production**, e depois faça o **Redeploy** — a Vercel só aplica variável nova em deploy novo:

| Name | Value |
|---|---|
| `EVOLUTION_API_URL` | o endereço do servidor da Evolution, o mesmo `$evolution` do passo 3, sem barra no fim |
| `EVOLUTION_API_KEY` | o valor de `AUTHENTICATION_API_KEY` do servidor da Evolution, o mesmo `$chave` |
| `EVOLUTION_INSTANCE` | `aurea-cs` |
| `WHATSAPP_WEBHOOK_SECRET` | o valor gerado no passo 2, o mesmo `$segredo` |

- **Como conferir** (depois do redeploy). Primeiro, a rota responde que o provedor está configurado —
  sem autenticação ela deve dizer **401**; **503** significa que as variáveis não chegaram ao deploy:

```powershell
try { Invoke-WebRequest -Method Post -Uri https://aurea-custodia-mvp.vercel.app/api/webhooks/whatsapp -Body '{}' -ContentType 'application/json' -UseBasicParsing } catch { $_.Exception.Response.StatusCode.value__ }
```

  Depois, em `/admin/cs`: o quadro **Canal** mostra "Evolution API · instância aurea-cs" sem nada em
  "Falta configurar"; **Conferir conexão** responde "WhatsApp conectado."; uma mensagem mandada de outro
  celular para o número do atendimento aparece na caixa em até 5 segundos; a resposta pelo painel chega
  ao celular e passa a "Entregue" e "Lida". Me avise quando aplicar que eu faço a mesma conferência.

### P-C2-03 · Chave de serviço do Supabase na Vercel, para criar login, redefinir senha e bloquear conta

- **O que:** as ações "Criar conta" (com login), "Redefinir senha" e "Desativar conta" falam com o
  Supabase Auth pela chave de serviço, só no servidor. Sem ela, a conta é criada só na plataforma e as
  ações de senha dizem, na tela, o nome da variável que falta.
- **Como saber se já está lá:** na ficha de qualquer usuário, aba Cadastro, bloco "Login (Supabase
  Auth)". Se aparecer "Sem SUPABASE_SERVICE_ROLE_KEY no ambiente", falta.
- **Nomes:** `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_URL`. O código aceita a URL também como
  `NEXT_PUBLIC_SUPABASE_URL`: confira na lista de variáveis da Vercel se uma das duas existe, e só crie
  `SUPABASE_URL` se nenhuma existir. A chave é **a mesma** do upload de
  vídeo da bancada; onde copiá-la no painel do Supabase está no Passo 4 de
  `docs/TUTORIAL_ESTACAO_PASSO_A_PASSO.md`. Ambiente **Production**, e **Redeploy** depois.
- **Como conferir:** a aba Cadastro de uma conta criada por `/cadastrar` passa a mostrar "Criado em",
  "Último login" e "Entra por".

### P-C2-04 · Pedido ao Agente A — checar a conta desativada nas portas de entrada

- **O que:** a ficha do usuário desativa a conta em duas metades — bloqueia o login no Supabase e grava a
  situação em `aurea.admin_situacao_contas`. Duas portas não passam pelo Supabase e são da frente A:
  a **entrada pelo catálogo de demonstração** e a **sessão já aberta** (cookie de 7 dias). A função está
  pronta: `contaDesativada(email)` em `src/server/admin/situacao.ts` — responde `false` sem banco, com o
  banco falhando e para qualquer conta da equipe do painel, então não tranca ninguém por acidente.
- **Onde, sugestão:**
  1. `src/server/actions/auth.ts`, em `login()`, antes de cada `setSession` (o do catálogo e o do
     Supabase): `if (await contaDesativada(email)) return { ok: false, error: 'Esta conta está desativada. Fale com o atendimento.' }`;
  2. `src/app/entrar/callback/route.ts`, antes do `setSession`: `falha(request, 'conta desativada')`;
  3. a sessão aberta: o casco `src/app/(app)/layout.tsx` não pode apagar cookie (Server Component), e
     `/entrar` devolve a pessoa para `/inicio` quando há sessão — então o fechamento pede uma rota que
     limpe a sessão (por exemplo, um Route Handler de saída) e as duas checagens apontando para ela.
- **Quem:** Agente A. **O que fica esperando:** RA-44.
- **Como conferir:** desativar pela ficha uma conta do catálogo e tentar entrar com ela → recusa com a
  mensagem; com a sessão aberta, a próxima navegação volta para `/entrar`.

### P-C2-05 · Pedido ao Agente A — tela de nova senha no link de recuperação

- **O que:** "Enviar link de redefinição" (ficha do usuário) chama `resetPasswordForEmail`, com o
  `redirectTo` no callback de login. O callback já aceita o link e autentica a pessoa, mas manda para
  `/inicio`, e trocar a senha em Minha conta pede a senha atual — que a pessoa esqueceu.
- **Sugestão:** em `src/app/entrar/callback/route.ts`, quando `type=recovery`, redirecionar para uma tela
  de nova senha que chame `supabase.auth.updateUser({ password })` sem pedir a atual (a sessão de
  recuperação já prova quem é).
- **Quem:** Agente A. **O que fica esperando:** RA-43 — até lá, a "senha provisória" da ficha é o caminho
  que funciona inteiro.

### P-C2-06 · Pedido ao Agente A — o número do WhatsApp do CS como canal de SAC

- **O que:** quando o P-C2-02 conectar o número, ele entra nos canais de SAC de
  `src/domain/documentos-legais/parametros.ts` (A3), que alimentam `/suporte`. O agente não inventa
  número: **o valor é o número do celular do atendimento que o Gabriel conectar.**
- **Quem:** Agente A (A3), ou a C3, se os canais já tiverem virado configuração (seção 6 do plano de
  finalizações). **O que fica esperando:** nada no painel.

### P-C2-07 · O que acende sozinho quando A2, A3, B1 e B2 chegarem à `main` (informativo)

- **Sem commit nenhum:** aba Cadastro com os aceites formais (`aceites_documentos`, A3); aba Mercado
  com o histórico da fila (`ofertas_historico`, A2); aba Financeiro com recebimentos do gateway
  (`recebimentos_gateway`, B1) e planos de custódia (`planosCustodia`, B2). As leituras perguntam se a
  tabela existe e mostram "disponível depois da X" enquanto não existe.
- **Com um commit pequeno da própria frente C** (não é pedido a ninguém): a coluna "Posição na fila"
  da aba Mercado passa a chamar `posicaoNaFila` (A2), e o bloco "Pagamento manual de fatura" da aba
  Financeiro passa a chamar a ação de liquidação da B2. Os dois dependem de código que ainda não está
  na `main`; entram na C3, que começa com A e B2 na `main`, ou antes, se chegarem durante a C2.

### P-C2-08 · A gaveta `aurea_local_admin` recebeu as tabelas da C2 (informativo)

- O `db:migrate` com `AUREA_DB_SCHEMA=aurea_local_admin` aplicou a 022 e a 023 em 14/09. Dado de teste
  novo: a conta `teste.painel@exemplo.com.br` (criada, com cadastro, ajuste de R$ 150,25, marca de
  inadimplência, desativada e uma nota), três conversas de teste, a etiqueta "Retirada". A Evolution
  usada na conferência era um servidor falso local, desligado ao fim.
- **O que fica esperando:** nada. O `DROP SCHEMA` do P-C1-04 apaga tudo junto.

### P-C2-09 · Aviso ao Agente A — `settings.legalAcceptance` não sobrevive à gravação no Postgres

- **O que achei:** `normalizarUser` em `src/server/db/diff.ts` monta o `settings` gravado só com as quatro
  preferências (`twoFA`, `notifEnvios`, `notifNegociacoes`, `notifNovidades`). Qualquer outro campo —
  inclusive `legalAcceptance`, que `registrarAceiteLegal` (`src/server/auth/legal.ts`) grava — some na
  primeira gravação com banco. Em produção, portanto, esse aceite antigo não fica guardado. A C2 esbarrou
  nisso ao decidir onde gravar a situação da conta, e por isso usou tabela própria (023).
- **Por que avisar:** o plano da A3 diz que `settings.legalAcceptance` "continua sendo preenchido"; se
  alguma tela ou a faixa de termos atualizados contar com ele no Postgres, vai ler vazio. A ficha do
  usuário da C2 já trata a ausência (mostra "Sem aceite registrado nas preferências da conta") e passa a
  ler `aceites_documentos` sozinha quando a migration 016 existir.
- **Quem:** Agente A, se quiser que o campo persista; ou nada, se `aceites_documentos` já substituir o
  uso. **O que fica esperando no painel:** nada.
