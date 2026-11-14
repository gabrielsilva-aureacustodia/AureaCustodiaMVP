# Pixel da Meta no Real Olímpico — o que foi criado, o que foi integrado e por quê

Data: 14/11/2026 · Responsável pela execução: Claude Code, a pedido do Gabriel
Este documento tem **duas versões do mesmo assunto**: a **Parte A** é em linguagem simples (para sócios e para quem não é de tecnologia) e a **Parte B** é técnica (para quem vai manter o código). Pode ler só a que interessa. A **Parte C** vale para todos: o que foi comprovado e o que ainda falta.

---

## Resumo em 30 segundos

- **Dentro da Meta foi criada uma única coisa:** um **Pixel** (a Meta chama de "conjunto de dados") chamado **Real Olímpico**, com identificação **1445788774389944**, na conta de anúncios **Real Olimpico (24176712608600366)**. Nenhuma campanha, público ou anúncio foi alterado.
- **No site foi instalado** o código que "fala" com esse Pixel: ele avisa a Meta quando alguém entra no site, clica em "Criar conta" e, principalmente, **termina o cadastro**.
- **Já está no ar** em realolimpico.com.br e **comprovado em 3 rodadas de teste**: a Meta recebeu e processou todas as visitas e todos os cliques em "Criar conta", sem nenhum evento duplicado ou perdido (21 de 21 e 6 de 6).
- **Achei e corrigi um defeito meu de privacidade** (veja A.6): o Pixel também rodava no painel da equipe e enviaria à Meta a URL da ficha de um cliente, que contém o e-mail dele. A correção está pronta e testada, mas **ainda não foi publicada**.
- **Ainda não está completo:** falta a chave da API de Conversões (envio pelo servidor) e falta provar o evento de cadastro de ponta a ponta. Detalhes na Parte C.

---

# PARTE A — Versão simples

## A.1 O que é o Pixel e por que precisamos dele

Quando pagamos um anúncio no Facebook ou no Instagram, a Meta mostra quantas pessoas **clicaram**. Mas clicar não é o que importa para nós: o que importa é quantas dessas pessoas **criaram uma conta** no Real Olímpico.

O **Pixel** é um "contador" que a Meta nos empresta. Ele fica dentro do nosso site e avisa a Meta, em tempo real, o que a pessoa fez. Com isso:

1. **Sabemos qual anúncio traz cadastro**, e não só clique. Dá para parar de gastar no que só traz curioso.
2. **A Meta aprende quem se cadastra** e passa a mostrar o anúncio para pessoas parecidas com quem já se cadastrou. Sem esse aviso ela otimiza no escuro.
3. **Podemos refazer o contato** com quem visitou e não terminou o cadastro (campanhas de lembrete), se um dia quisermos.

Sem o Pixel, a campanha "Tráfego para Cadastro" mede visita; com o Pixel, ela passa a poder medir cadastro.

## A.2 O que foi criado dentro da Meta

| O que | Onde fica | Para que serve |
|---|---|---|
| **Pixel "Real Olímpico"** (identificação 1445788774389944) | Gerenciador de Eventos → Conjuntos de dados, na conta de anúncios Real Olimpico | É o "contador". Recebe os avisos do site e os entrega à Meta para os relatórios e para a otimização dos anúncios. |

Só isso foi criado na Meta. Duas decisões que tomei no meio do caminho e que você deve saber:

- O assistente da Meta trazia uma caixa **já marcada** que ligaria **todos** os conjuntos de dados do portfólio a um serviço de envio pelo servidor. **Desmarquei**, porque não foi pedido e nós já fazemos esse envio pelo nosso próprio código.
- Ao clicar em "Criar", a Meta informa que você concorda com os **Termos das Ferramentas Comerciais da Meta**. Isso é parte de criar qualquer Pixel.

**O que eu NÃO mexi na Meta:** campanhas, conjuntos de anúncios, anúncios, públicos, orçamento, forma de pagamento, domínio e usuários.

## A.3 O que foi colocado no site e o que cada coisa faz

O site agora avisa a Meta de três coisas:

| O que a pessoa fez | Aviso enviado | Para que serve |
|---|---|---|
| Entrou em qualquer página do site | **PageView** ("visita") | Mede visita e permite ver o caminho das pessoas. |
| Clicou em qualquer botão que leva a "Criar conta" | **CliqueCriarConta** | Mostra quantas pessoas **querem** se cadastrar. A diferença entre este número e o de cadastros mostra onde o formulário perde gente. |
| **Terminou o cadastro** (por e-mail ou pelo Google) | **CompleteRegistration** ("cadastro concluído") | **É o aviso mais importante.** É o resultado que a campanha deve buscar. |

Regras que protegem a qualidade do número:

- **Cada cadastro conta uma vez só.** O aviso sai por dois caminhos (pelo navegador e pelo nosso servidor, para não se perder se a pessoa usa bloqueador de anúncios) e a Meta junta os dois num só.
- **E-mail que já tem conta não conta como cadastro novo.**
- **Confirmar o e-mail depois não conta de novo.**
- **Nenhum dado de dinheiro, saldo ou moeda de ninguém é enviado à Meta.** Só vão o fato "se cadastrou" e dados de contato em forma embaralhada (veja A.5).

## A.4 Em que ponto o cadastro "conta"

- **Cadastro por e-mail:** conta quando a pessoa envia o formulário e a conta é criada, **antes** de confirmar o e-mail. Escolhi assim porque o aviso chega perto do anúncio, e é isso que a Meta usa para aprender. O custo: parte das pessoas nunca confirma o e-mail e será contada mesmo assim.
- **Cadastro pelo Google:** conta na **primeira vez** em que a conta Google vira conta do Real Olímpico.

## A.5 Privacidade (importante)

- O nome, o e-mail e o país vão para a Meta **embaralhados** (hash SHA-256): a Meta consegue reconhecer uma pessoa que ela já conhece, mas não lê o e-mail em texto.
- O Pixel **grava cookies** no navegador de quem visita (para reconhecer a mesma pessoa). **Hoje o site não tem faixa de aviso de cookies, e a Política de Privacidade não cita a Meta.** Isso é um risco com a LGPD e está registrado como **RA-61**. **O jurídico precisa decidir** antes de a campanha ganhar volume com clientes reais.
- A Meta liga por conta própria um evento automático de "clique em botão" (aparece nos testes como `SubscribedButtonClick`). Ele existe porque a Meta o ativa por padrão no Pixel; vale o jurídico saber, e dá para desativar nas Configurações do Pixel.

## A.6 Um defeito que encontrei e corrigi (precisa ser publicado)

**O que aconteceu:** o Pixel foi instalado em todas as páginas do site, inclusive nas do painel da equipe e nas telas de recibo. A Meta recebe o **endereço (URL)** de cada página visitada. No painel, a ficha de um cliente tem o e-mail dele no endereço (`/admin/usuarios/e-mail-do-cliente`). Então, se alguém da equipe abrisse a ficha de um cliente enquanto o Pixel estivesse ativo, a Meta receberia o e-mail desse cliente.

**Por que não apareceu antes:** os testes iniciais foram só em páginas públicas. Achei ao revisar o que o Pixel "enxerga".

**A correção:** o Pixel agora **não carrega e não registra visita** em `/admin`, `/painel`, `/recibos/…`, `/conta/aceites/…` e `/relatorios`. Se a pessoa entra nessas áreas navegando de uma página pública, o envio é suspenso enquanto ela estiver lá e volta ao sair.

**Situação:** corrigido no código, com testes, e verificado no navegador local. **Ainda NÃO está no ar.** Enquanto não for publicado, vale a equipe evitar abrir fichas de clientes num navegador que já visitou o site público (o risco real é pequeno, pois o Pixel hoje só roda se a pessoa carregou uma página do site), e o ideal é publicar logo.

---

# PARTE B — Versão técnica

## B.1 Arquitetura: dois canais, um evento

```
Navegador ── Pixel (fbevents.js) ── PageView, CliqueCriarConta, CompleteRegistration(eventID) ──► Meta
Servidor  ── API de Conversões (POST /{pixel}/events) ── CompleteRegistration(event_id) ───────► Meta
                                                              └─ mesmo ID + mesmo nome → deduplicação
```

- **Deduplicação:** a Meta conta um só quando `eventID` (navegador) = `event_id` (servidor) e os nomes batem, numa janela de 48 h. O ID nasce **no servidor** (`crypto.randomUUID()`) e vai ao navegador na resposta, para o par existir mesmo se o navegador nunca disparar.
- **Por que dois canais:** o servidor cobre bloqueador de anúncio, ITP do Safari e aba fechada antes do script rodar.

## B.2 O que existe na Meta

| Item | Valor |
|---|---|
| Conjunto de dados / Pixel | `Real Olímpico`, ID `1445788774389944` |
| Conta de anúncios | `act_24176712608600366` (Real Olimpico) |
| Portfólio empresarial | `756614763705244` |
| Método de configuração | "Adicionar o código do Pixel da Meta ao site por conta própria" (código manual) |
| Caixa desmarcada | "Conecte todos os conjuntos de dados novos e existentes à API de Conversões" |
| Sessão de teste | `test_event_code` `TEST5394` (da aba "Eventos de teste"; vale só para a sessão de teste da tela e não afeta os dados de produção) |

## B.3 O que existe na Vercel

| Variável | Valor / estado | Ambiente |
|---|---|---|
| `META_PIXEL_ID` | `1445788774389944` (comum, não é segredo) | **Production** apenas. Preview ficou de fora para não poluir os dados. |
| `META_CAPI_ACCESS_TOKEN` | **não criada ainda** | — |
| `META_TEST_EVENT_CODE` | opcional, só para testes | — |
| `META_GRAPH_VERSION` | opcional; padrão `v27.0` | — |

O ID também está no `.env.local` (ignorado pelo Git). Como as páginas públicas são geradas no build, **trocar `META_PIXEL_ID` exige novo deploy**.

## B.4 Arquivos do repositório (commit `e7d41d9` + correção de privacidade ainda não commitada)

| Arquivo | Função |
|---|---|
| `src/components/meta/MetaPixel.tsx` | Client Component. Carrega o snippet oficial via `next/script` (`afterInteractive`), faz `init` + `PageView` na 1ª carga, `PageView` a cada troca de rota (`usePathname`), lê o cookie do cadastro pelo Google e dispara o `CompleteRegistration`, e um ouvinte de clique em `a[href^="/cadastrar"]` dispara `CliqueCriarConta`. Inclui o `<noscript>` de reserva. **Não carrega e não dispara em áreas sem rastreio** (`caminhoSemRastreio`) e usa `fbq('consent','revoke'/'grant')` ao entrar/sair delas por navegação interna. O `PageView` deixou de estar no snippet e sai sempre do efeito, que conhece a rota. |
| `src/app/layout.tsx` | Monta `<MetaPixel pixelId={lerPixelId(process.env.META_PIXEL_ID)} />`. O ID é lido no servidor e validado (`^\d{8,20}$`) porque entra num `<script>` inline. Sem ID válido, nada renderiza e nada de terceiro carrega. |
| `src/lib/meta/eventos.ts` | Contrato compartilhado, incluindo `caminhoSemRastreio` (lista de prefixos: `/admin`, `/painel`, `/recibos/`, `/conta/aceites`, `/relatorios`): nomes de evento, `parametrosDoCadastro`, `novoEventId`, `lerPixelId`, (de)serialização do cookie `ro_meta_evt`. |
| `src/lib/meta/pixel.ts` | `rastrearPadrao` / `rastrearPersonalizado` / `definirEnvio`. Espera `window.fbq` existir (até 5 s) para não perder evento pedido antes do script carregar. |
| `src/server/meta/conversions-api.ts` | Envio à Graph API (`v27.0`), via `after()` (não atrasa a resposta). Timeout de 4 s; falha da Meta nunca propaga erro; sem `META_PIXEL_ID`/`META_CAPI_ACCESS_TOKEN` não faz nada. |
| `src/server/meta/normalizacao.ts` | Normalização + SHA-256 de e-mail (`em`), nome (`fn`, `ln`) e país (`country`). IP, user agent, `fbp` e `fbc` seguem sem hash, como a Meta exige. |
| `src/server/meta/cadastro.ts` | `registrarCadastroNaMeta` (e-mail) e `registrarCadastroGoogleNaMeta` (Google, deixa o ID num cookie de 120 s). |
| `src/server/actions/auth.ts` | `registerWithEmail` passou a devolver `data: { eventoCadastroId }` e agenda o evento só se a conta for nova (`identities.length > 0`). **Server Action alterada, com confirmação do Gabriel.** |
| `src/components/login/RegisterForm.tsx` | Dispara o par do Pixel com o ID recebido. |
| `src/app/entrar/callback/route.ts` | No 1º provisionamento via Google, chama `registrarCadastroGoogleNaMeta`. Falha ali é engolida (`.catch`) para nunca impedir o login. |
| `src/server/meta/meta.test.ts` | 19 testes: hashes (vetor oficial da Meta), `user_data`, corpo do pedido, ausência de e-mail em texto puro, ausência de requisição sem variáveis, falha de rede sem vazar segredo, contexto da requisição validação do ID e as áreas sem rastreio. |
| `.env.example`, `docs/META_PIXEL.md`, `src/lib/meta/ATALHOS.md`, `RISCOS_ASSUMIDOS.md` (RA-61) | Documentação e registro de risco. |
| `src/domain/custodia-paga-para-negociar.test.ts` | Correção não relacionada: teste dependia do relógio real e quebrou em 12/11/2026; relógio fixado. |

## B.5 Eventos e parâmetros

| Evento | Tipo | Quando | Parâmetros |
|---|---|---|---|
| `PageView` | padrão | 1ª carga e cada navegação | — |
| `CliqueCriarConta` | personalizado | clique em link para `/cadastrar` | `origem` (caminho da página do clique) |
| `CompleteRegistration` | padrão | conta nova (e-mail ou Google) | `status: true`, `content_name: cadastro_email \| cadastro_google`. **Sem `value`** (não há valor de cadastro definido; inventar um distorceria a otimização) |

`user_data` enviado pelo servidor: `em`, `fn`, `ln`, `country` (todos SHA-256), `client_ip_address`, `client_user_agent`, `fbp`, `fbc` (sem hash). `action_source: website`; `event_source_url` vem do `referer` (padrão: `https://realolimpico.com.br/cadastrar`).

## B.6 Decisões de projeto que valem registrar

1. **Cadastro por Google passa por cookie.** O fluxo sai do site para o Google e volta por redirecionamento do servidor, que não executa JavaScript. O callback grava `ro_meta_evt=CompleteRegistration.<id>.cadastro_google` (120 s, `SameSite=Lax`, legível pelo navegador de propósito); `MetaPixel` o consome na primeira montagem, dispara e apaga.
2. **ID lido no servidor, não `NEXT_PUBLIC_`.** Permite validação antes de entrar no HTML e evita expor variável de build.
3. **Envio em `after()`** para não somar latência ao cadastro.
4. **Correspondência avançada:** o servidor já manda `em`/`fn`/`ln` por hash; a "correspondência avançada automática" do Pixel (leitura de campos do formulário no navegador) **não foi ligada** ainda.

---

# PARTE C — Para todos

## C.1 O que foi comprovado (14/11/2026)

| Verificação | Resultado |
|---|---|
| Pixel `1445788774389944` existe na conta Real Olimpico | **Sim.** Tela do Gerenciador de Eventos mostra o conjunto "Real Olímpico" com essa identificação. |
| Variável na Vercel | **Sim.** Criada em Production. |
| Deploy em produção | **Sim.** Commit `e7d41d9`, estado `READY`, ligado a `realolimpico.com.br`. |
| Pixel presente no HTML do site publicado | **Sim.** `fbq` carregado, Pixel `1445788774389944` registrado, cookie `_fbp` criado. |
| A Meta recebe os eventos | **Sim**, em tempo real na aba "Eventos de teste": `PageView` (18:22:57 e 18:23:12) e `CliqueCriarConta` (18:23:12), todos **Processado**, origem **Navegador**, método **Configuração manual**. |
| Evento automático da Meta | Apareceu um `SubscribedButtonClick` ("conectado automaticamente"). Não foi criado por nós. |
| Testes automatizados e build | 163 arquivos / 1.558 testes verdes, typecheck limpo, build OK (antes da correção de privacidade; ver C.1b). |

O painel de **Visão geral** da Meta ainda mostrava "nenhuma atividade" no momento da checagem, o que é normal: ele pode levar até 30 minutos. A prova em tempo real é a aba "Eventos de teste".


## C.1b Testes repetidos no site publicado (14/11/2026, 18:26–18:3x)

Método: aba do Gerenciador de Eventos aberta em "Eventos de teste" (lista zerada antes de começar) e uma aba de navegação no site de produção percorrendo, **3 vezes seguidas**, o mesmo roteiro de 7 passos. Os números abaixo foram lidos da lista da própria Meta.

Roteiro de cada rodada: abrir `/` (carga completa) → clicar em "Criar conta" (vai a `/cadastrar`) → clicar em "Entrar" (vai a `/entrar`) → clicar em "Criar conta" de novo (volta a `/cadastrar`) → abrir `/taxas` → abrir `/academy` → abrir `/suporte`.

| Evento | Esperado por rodada | Rodada 1 | Rodadas 1 a 3 (total) | Esperado no total | Resultado |
|---|---|---|---|---|---|
| `PageView` | 7 | 7 | **21** | 21 | ✅ exato, sem duplicado |
| `CliqueCriarConta` | 2 | 2 | **6** | 6 | ✅ exato |
| `SubscribedButtonClick` (automático da Meta) | — | 1 | 3 | — | gerado pela Meta, 1 por rodada |
| `CompleteRegistration` | 0 (não se criou conta) | 0 | 0 | 0 | não testado (ver C.2) |

Todos com status **Processado**, origem **Navegador**, método **Configuração manual** (exceto o automático). O `PageView` saiu uma vez por página tanto em carga completa quanto em navegação interna (clique em link), que era o ponto de risco do desenho.

**Testes locais da correção de privacidade** (servidor de teste com ID falso, sem enviar nada à Meta real):

| Teste | Resultado |
|---|---|
| Navegar internamente de página pública para `/painel` | `consent revoke` emitido, nenhum `PageView` |
| Navegar de `/painel` para `/suporte` | `consent grant` + `PageView` emitidos |
| HTML servido em `/painel` | sem aviso de reserva do Pixel (`noscript`) |
| HTML servido em `/taxas` | com aviso de reserva do Pixel |
| Testes automatizados da lista de áreas (`/admin/usuarios/<e-mail>`, recibos, relatórios, e `/administrador` NÃO confundido com `/admin`) | 3 de 3 verdes |

**Não repeti em produção o teste do cadastro pelo Google** (cookie de evento pendente) porque dispararia um `CompleteRegistration` falso nos dados reais do Pixel, que ainda não tem histórico. Esse caminho foi testado no ambiente local e por testes unitários.

## C.2 O que AINDA NÃO foi comprovado nem feito

1. **`CompleteRegistration` de ponta a ponta.** Não criei a conta de teste: o formulário exige digitar uma **senha**, o que eu não faço, e o site é o de produção (a conta fica no banco real). Deixei a sessão de teste da Meta aberta e pronta; basta alguém criar uma conta de teste em realolimpico.com.br/cadastrar e eu conferir o evento chegando. O código está coberto por testes unitários e o fluxo foi simulado em ambiente local, mas **o evento ainda não foi visto chegando à Meta**.
2. **Envio pelo servidor (API de Conversões).** Depende da chave `META_CAPI_ACCESS_TOKEN`, ainda não criada. Sem ela só o Pixel do navegador funciona, o que já mede o cadastro, mas perde quem usa bloqueador de anúncio.
3. **Correspondência avançada automática** (Configurações do Pixel).
4. **Verificação do domínio** `realolimpico.com.br` no Business Manager (a Meta pede para priorizar eventos).
5. **Ajuste da campanha.** "Tráfego para Cadastro" usa o objetivo Tráfego, que otimiza clique. Para a Meta otimizar **cadastro**, o conjunto de anúncios precisa de conversão em "Cadastro concluído" (`CompleteRegistration`), o que só pode ser escolhido depois que o Pixel receber esse evento ao menos uma vez.
6. **Publicar a correção de privacidade** (A.6): precisa de novo commit e deploy, com a sua autorização.
7. **Eventos de uso** (depósito, envio de moeda, negociação): **não existem.** Dá para medir o funil por URL com "conversões personalizadas". Enviar evento financeiro à Meta é uma decisão do Gabriel, porque envolve dado financeiro de clientes.

## C.3 Riscos em aberto

- **RA-61 (LGPD):** Pixel ativo para todo visitante, sem faixa de cookies e sem texto na Política de Privacidade. **Decisão do jurídico.** Se a base legal for consentimento, a mudança é pequena e está descrita em `src/lib/meta/ATALHOS.md` (chamar `fbq('consent','revoke')` antes do `init` e `grant` ao aceitar).
- **Cadastro por e-mail conta antes da confirmação** do e-mail; pode superestimar contas realmente ativas.
- **Evento automático de clique** ligado por padrão pela Meta.
- **URL na Meta:** o Pixel envia a URL completa das páginas públicas, inclusive parâmetros (`?erro=...`). Hoje as páginas públicas não carregam dado pessoal na URL; manter assim.

## C.4 Próximos passos sugeridos, em ordem

0. **Publicar a correção de privacidade** (A.6).
1. Você cria uma **conta de teste** no site (eu preparo e confiro o evento na Meta) e conferimos o `CompleteRegistration` na aba "Eventos de teste".
2. Gerar a **chave da API de Conversões** e colá-la na Vercel como `META_CAPI_ACCESS_TOKEN` (Sensitive), seguido de deploy; repetir o teste e conferir a origem "Navegador e Servidor".
3. Ligar a correspondência avançada automática e verificar o domínio.
4. Decisão do jurídico sobre cookies/privacidade (RA-61).
5. Só então trocar a campanha para otimizar por "Cadastro concluído".

## C.5 Onde ver tudo

- Meta: Gerenciador de Eventos → Conjuntos de dados → **Real Olímpico** (conta de anúncios Real Olimpico).
- Vercel: projeto `aurea-custodia-mvp` → Settings → Environment Variables → `META_PIXEL_ID`.
- Código: commit `e7d41d9`; guia operacional em `docs/META_PIXEL.md`; riscos em `RISCOS_ASSUMIDOS.md` (RA-61).
