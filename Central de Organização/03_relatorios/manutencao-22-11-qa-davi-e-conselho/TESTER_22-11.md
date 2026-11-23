# TESTER — validação no ar, 22/11/2026

Alvo: https://realolimpico.com.br (deploy 6c3f79f). Browser embutido, só leitura. Nenhuma conta criada, nenhuma senha digitada por mim, nenhum botão que grave dado clicado. O Gabriel logou sozinho no painel (conta de equipe "Gabriel Silva"). Servidor local NÃO foi usado.

## Públicas — 375 / 768 / 1280, claro e escuro

| Tela | Resultado |
|---|---|
| `/` | OK. Sem erro de console, sem 4xx/5xx. Sem rolagem horizontal. Carga: 0,4–0,9 s; **1ª visita fria 3,2 s** (dcl 2,7 s) |
| `/entrar` | OK. "Entrar com o Google" presente. Carga 0,1–2,7 s |
| `/cadastrar` | OK. Google vem ANTES do campo de e-mail; "Prefiro usar e-mail e senha" e bloco "Veja como se cadastrar" presentes. Carga 0,1–0,4 s |
| `/painel` | OK. Login da equipe (e-mail/senha + Google). Carga 0,15–0,4 s |
| `/conta/extrato`, `/admin/*` sem sessão | Redirecionam para `/entrar` e `/painel` (certo) |

Escuro: fundo `rgb(8,18,38)` nas quatro. Claro: só medi o fundo em 1280 na home (mesmo valor, porque a página é escura por padrão) — **não comparei visualmente claro × escuro das páginas públicas** (baixa gravidade).

## Logadas (sessão do Gabriel, admin)

| Tela | Viewport | O que vi | Gravidade |
|---|---|---|---|
| `/admin/resultados/financeiro` — Saldo dos clientes | 1280 e 375 | OK. R$ 913,50 = soma dos lançamentos = saldo nas contas; "Diferença a explicar" R$ 0,00. 175 contas. Sem estouro lateral | — |
| idem | 1280 | **Pergunta, não bug confirmado:** "Custódia paga" no fecho do saldo = −R$ 1.056,00, enquanto "Custódia faturada … R$ 790,00 já paga(s)" e DRE 3.1.02 = R$ 790,00. Diferença R$ 266,00 (pode ser custódia da compra / estornos). Vale o Controle conferir se é esperado | baixa |
| idem | 1280 | "Receita mês a mês": no texto do gráfico a ordem dos rótulos (set R$ 643,30 / out R$ 223,30 / nov) não bate com a tabela (set 261,80 / out 643,30 / nov 223,30). Pode ser só a ordem de leitura do texto; **não conferi o gráfico visualmente com print** | média até conferir |
| `/admin/resultados/kpis?aba=conselho` | 1280 e 375 | OK. Cinco blocos presentes, "—" onde não há dado (CAC sem gasto informado). Contas de cálculo batem (226×R$2,89=R$653; 17/253=6,72%; 11/384=2,86%; 14/(14+17)=45,16%). Sem estouro lateral | — |
| `/admin/configuracao` | 1280 | OK. Taxas vigentes 0,5%+R$1,00, custódia R$2,00, saque R$5,00; simulação R$302,50/R$297,50/R$5,00 correta. Abas Catálogo, Operacional, Integrações, Histórico presentes (não abri) | — |
| `/admin/bancada` | 1280 | OK. Fila vazia. Caixas: 244+9 = 253 moedas, igual ao "253 moedas" dos KPIs. Dados com erro de digitação: caixa **"GANDEIRA CAIXA 4"** (EB-004) e **EB003** sem hífen (padrão das outras é EB-00x). Tipo de caixa "Posições" aparece na lista | baixa (dado) |
| `/conta/extrato` | 1280 e 375 | OK. Cartões "Taxas pagas" com comissões/custódia/tarifas (T1) presentes. Sem estouro lateral | — |
| `/conta/notas` | 1280 | OK, estado vazio com texto correto | — |
| `/conta/faturas` | 1280 | OK, 1 fatura "Cancelada" | — |
| `/envios` | 1280 | OK, protocolo desconsiderado exibido | — |
| `/recibos` | 1280 | A conta do Gabriel não tem moeda, então **recibo (número da moeda) NÃO pôde ser testado** — precisa de conta com moeda aceita (login do Gabriel/sócio) | — |

## Achados gerais

1. **Telas do admin demoram a hidratar:** todas mostram "Carregando a tela…" por mais de 4 s em alguns carregamentos (financeiro e KPIs) e depois aparecem. Em outros, 0,5 s. Variável. Média.
2. **Tour "Bem-vindo" cobre toda tela do admin e do cliente** a cada carga nesta sessão; não o fechei (grava estado). Não é erro, só registro.
3. Console sem erros em todas as telas visitadas. Rede sem 4xx/5xx (só `ERR_ABORTED` em POST `/api/eventos` e POST do RSC na navegação, normais).
4. **Interferência minha:** meu primeiro `navigate` em 768 px caiu em `accounts.google.com` porque o Gabriel estava clicando em "Entrar com Google" no mesmo painel. Não fui eu que cliquei. Já combinado: não mexo no browser enquanto ele loga.

## Não coberto

- Recibo com número da moeda (sem moeda na conta logada).
- 768 px das telas logadas; modo escuro das telas logadas.
- Abas Catálogo/Operacional/Integrações/Histórico da Configuração.
- Nada de "precisa de login" restante além do recibo: o Gabriel logou.

## Limpeza

Nada criado, nada alterado. Emulação de viewport restaurada para desktop.

---

# Rodada 2 — reteste do Relatório QA do Davi (deploy 4b2f48f READY)

Só leitura, via fetch sem credenciais nas páginas públicas. Telas logadas e B01 NÃO testados (B01 só com conta de teste do repositório).

| Item | Resultado no ar |
|---|---|
| CSP (R1) | Só `content-security-policy-report-only` (não bloqueia); script-src com 'unsafe-inline'. x-frame-options, HSTS, referrer-policy ok |
| Cookies Secure (R1) | `sb-…-auth-token.0/.1` e `code-verifier` com Secure=false (sessão pode ser anterior ao deploy; precisa login novo) |
| A09 `_fbp` | Sem banner de cookies (decisão do Gabriel, esperado) |
| B10 404 | OK, em português com links |
| A11 `/entrar` | Subtítulo "Entre com o e-mail e a senha…"; "Prefiro usar e-mail e senha"; "Esqueci minha senha" presente |
| B02 passo 4 de `/cadastrar` | Texto igual ("Depois confirme o cadastro no e-mail") — conferir a política com o Gabriel |
| B08 Termos | "a))" sumiu; **ainda** "A observará" (14.5.4) e "Cláusula 13.2" citada em 14.4/14.6 apontando para a definição da LGPD |
| A01 Termos 7.5.6 | "30 dias úteis" (decisão do Gabriel, esperado) |
| Academy | "até30" corrigido; seguro e "mesma moeda" com texto novo |
| Taxas seção 2 | Seguro postal por conta do remetente (texto coerente) |

Pendente (exige login/conta de teste): B01, A08 `/recibos`, 418, B06, B07, S04, B09, S03, B04, S05, S06, A12, A13 etc.
Achados enviados ao R1 e ao R4. Nada criado/alterado.

## Resposta do R1 (rodada 2)
- CSP só Report-Only é de propósito nesta fase; próximo passo é ler as violações no console de uma página logada (/mercado, /conta com pagamento) e então bloquear com nonce. **Pendente:** anotar violações (precisa de tela logada).
- Cookies `sb-*`: gravados só em `src/server/auth/client.ts:29` com secure em produção; os vistos são anteriores ao deploy. **Pendente:** confirmar após SAIR/ENTRAR com conta de teste.
- B01: view-source de /inicio e GET /api/state sem e-mail/CPF/Pix de outra conta — **pendente**, só conta de teste (testes automatizados já existem).
- 418: correção = fuso America/Sao_Paulo; **pendente** conferir console logado em Mercado, Compras e Recibos, de preferência após 21h de Brasília.
- A08 mostrar saldo/receita da empresa é de propósito (pergunta aberta ao Gabriel).

## Rodada 3 — a4d5488 (R1: faixa de cookies + CSP bloqueante) READY
Conferido na home/`/inicio` (sessão do Gabriel já aberta, só leitura), sem clicar em Aceitar/Recusar:
- Cabeçalho `content-security-policy` agora ENFORCED (sem `report-only`). script-src ainda com 'unsafe-inline' (nonce é passo futuro).
- Faixa "Cookies no Real Olímpico" aparece com Saiba mais / Recusar / Aceitar.
- Pixel NÃO carrega antes do aceite: `fbq` indefinido e nenhum script de connect.facebook.net. O cookie `_fbp` antigo continua no navegador (gravado antes do deploy).
- Console: 1 erro "Failed to load resource: 404" sem URL identificável (nenhum recurso 4xx em `performance`); pode ser da navegação anterior ao admin. Sem mensagem "Refused to…/Content Security Policy".
Não conferido: Pix/cartão, login Google, bancada com vídeo, PDF/XLSX, Pixel após "Aceitar" (exigem ação/tela logada).
Aguardando READY do f8ede77 (R4).
