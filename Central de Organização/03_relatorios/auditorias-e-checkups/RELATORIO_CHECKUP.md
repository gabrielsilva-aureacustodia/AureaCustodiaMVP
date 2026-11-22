# Relatório do check-up final — Real Olímpico (30/10/2026)

Branch `fix/aurea-checkup-final` (base `main` d29727a). **Só leitura**: GET e navegação em
`https://realolimpico.com.br` e no alias da Vercel `https://aurea-custodia-mvp.vercel.app`. Nenhum
formulário enviado, nenhuma compra, pagamento, login, conta criada, POST, migration ou deploy.
Nenhum segredo foi lido ou gravado aqui.

## Resumo para o Rogério

- A parte pública do site está sã: 9 páginas abertas, sem erro de console, sem requisição quebrada
  e sem rolagem lateral no celular.
- Tudo que é privado fecha para quem não entrou: páginas mandam para `/entrar` (cliente) ou
  `/painel` (equipe); APIs respondem `401` em JSON, sem vazar dado.
- **Nenhum defeito que exigisse correção de código foi encontrado sem login.** Por isso este PR só
  traz os dois documentos.
- A área logada (cliente e `/admin`) **não foi testada**: não há credencial liberada. Está em
  "Pendências".

## 1. Erros de console e de rede

Varredura com Playwright (Chrome), 22 rotas × desktop 1280×800 e celular 390×844 = 44 cargas, em
produção e no alias. Resultado idêntico nos dois (0 diferenças em status, destino, título, erros).

| Item | Resultado |
|---|---|
| Erros/avisos de console | **0** nas 44 cargas |
| Exceções de página (`pageerror`) | 0 |
| Respostas HTTP ≥ 400 nos recursos da página | 0 |
| Requisições falhas | 8, todas `net::ERR_ABORTED` em `?_rsc=` (prefetch do Next cancelado quando o clique navega). Benigno, não é defeito |
| Rolagem horizontal | nenhuma em nenhuma rota |
| `h1` por página | exatamente 1 |
| Imagens sem `alt` | 0 |

Alvos de toque < 44 px no celular (medidos por `getBoundingClientRect`): só links de texto no meio de
frases (Termos, Política, Taxas, "Criar conta") — isenção usual de links em linha — e o botão de
mostrar senha (40×40), que **já tem** área de toque ampliada a 44 px por `::before`
(`src/styles/login.css:62`). Sem ação.

## 2. Rotas da API e o que respondem (sem sessão)

| Rota | Status | Formato | Observação |
|---|---|---|---|
| `GET /api/crypto` | 200 | JSON `{series:[{t,btc,eth,usdt}…]}` | Pública por desenho (cotações) |
| `GET /api/state` | 401 | JSON `{error:"Sessão expirada."}` | Rede do middleware |
| `GET /api/rastreios` | 401 | idem | idem |
| `GET /api/relatorios`, `/api/relatorios/dre`, `/api/relatorios/sheets` | 401 | idem | idem |
| `GET /api/admin/conciliacao` | 401 | idem | idem |
| `GET /api/envios/etiqueta/X`, `/api/retiradas/etiqueta/X` | 401 | idem | idem |
| `GET /api/eventos` | 401 | idem | A rota só aceita POST; a rede barra antes |
| `GET /api/estacao`, `/api/estacao/fila` | 401 | JSON `{error:"Chave da estação inválida."}` | Token do equipamento |
| `GET /api/cron/faturamento`, `/api/cron/shipping` | 401 | JSON `{ok:false,error:"Não autorizado"}` | Conferem `CRON_SECRET` (`src/server/cron-auth.ts`); sem o cabeçalho, nada roda |
| `GET /api/webhooks/mercadopago` | 405 | vazio | Só POST; POST **não** testado (escrita) |

Todas respondem rápido (0,6–1,5 s) e nenhuma devolve segredo, stack trace ou HTML onde se espera JSON.
Cabeçalhos de `/entrar`: `Strict-Transport-Security`, `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Cache-Control: no-store`. **Não há
`Content-Security-Policy`** (ver observações).

Não testadas, por exigirem escrita ou credencial: `POST /api/eventos`, `/api/relatorios/sheets`,
`/api/webhooks/{mercadopago,mercadopago-payouts,whatsapp}`, `/api/estacao/analise/*`,
`/api/estacao/video/url` e as versões autenticadas de todas as GET acima.

## 3. Cliques testados (Playwright, produção e alias, resultado igual)

| Rota | Elemento | Resultado |
|---|---|---|
| `/` | links `/entrar`, `/cadastrar`, `/taxas`, `/academy`, `/termos`, `/privacidade`, `/suporte` | 200, destino correto |
| `/` | botões Reverso / Anverso (moeda) | ok, sem erro |
| `/` | botões R$ 180 / 450 / 1.200 (simulador) | ok, sem erro |
| `/entrar` | links `/` e `/cadastrar`; "Mostrar senha" | ok |
| `/entrar`, `/cadastrar`, `/painel` | "Entrar/Continuar com Google" | **não clicado** (inicia autenticação) |
| `/cadastrar` | links Termos, Privacidade, Taxas, Entrar | 200 |
| `/painel` | link "Entrar no site do cliente" | 200 `/entrar` |
| `/academy`, `/termos`, `/privacidade`, `/suporte`, `/taxas` | todos os links internos (8 cada) | 200 |
| mesmas 5 páginas | "Imprimir / Salvar PDF" | ok, sem erro de console |
| `/inicio /mercado /compras /vender /conta /envios /recibos /retirada /relatorios` | acesso sem sessão | 307 → `/entrar` |
| `/admin`, `/admin/usuarios` | acesso sem sessão | → `/painel` (regra do CLAUDE.md, RA-48) |
| `/entrar/nova-senha` | sem sessão de recuperação | → `/entrar` |

## 4. Corrigido neste PR

Nada no código. Os testes não revelaram defeito reproduzível sem login; mexer em código por
suposição contraria a regra de não refatorar o que não foi pedido.

## 5. Observações (sem ação, para decisão de quem cuida do produto)

1. **Rota inexistente nunca mostra 404**: `/rota-inexistente` vai para `/entrar` (o middleware exige
   sessão em tudo que não está na lista pública). É consequência do desenho "fechado por padrão"; só
   incomoda quem digita URL errada. Decisão de produto.
2. **`/favicon.ico`, `/robots.txt`, `/sitemap.xml` dão 404.** O ícone existe como `src/app/icon.png`
   (o navegador usa o `<link>`); robots/sitemap só importam se o site for indexado.
3. **Sem `Content-Security-Policy`.** Os demais cabeçalhos de segurança estão presentes. Adicionar CSP
   exige mapear scripts do Mercado Pago/Supabase; fica como melhoria, não como defeito.
4. `/api/eventos` e as demais POST dependem de sessão e não puderam ser exercitadas.

## 6. Pendências (exigem login ou escrita)

Precisam de credencial de produção, ainda não liberada, ou de ambiente de homologação:

- Área do cliente logada: `/inicio`, `/mercado`, `/compras`, `/vender`, `/conta/*`, `/envios`,
  `/recibos`, `/retirada`, `/relatorios` — console, rede e cliques.
- Painel `/admin/*` (usuários, moedas, bancada, saques, logística, cs, equipe, configuração,
  resultados): idem, além de conferir permissão por perfil.
- Respostas autenticadas de `/api/state`, `/api/rastreios`, `/api/relatorios/*`,
  `/api/admin/conciliacao` e etiquetas.
- Webhooks e fluxo de pagamento/saque/frete (só em ambiente de teste, nunca em produção).
- O alias `aurea-custodia-mvp.vercel.app` responde igual à produção (provavelmente aponta para o
  mesmo deploy); um preview de branch com URL própria não foi informado, então não foi testado.
- Roteiro sugerido para quando houver conta de teste: repetir `crawl` em cada rota logada, clicando
  apenas em botões de leitura (abas, filtros, ordenação) e parando antes de qualquer confirmação.
