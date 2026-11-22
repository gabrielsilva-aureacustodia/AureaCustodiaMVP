# Relatório de status | QA do Davi Bego (22/11/2026)

> Para o Rogério e o Gabriel. Atualizado a cada 15 minutos pelo chat "Relatórios". Fonte do relatório: `docs/manutencao-2026-11/relatorio-qa-davi/RELATORIO_QA_DAVI_BEGO_texto.md`.

**Última atualização:** 22/11/2026, 20:50 (3ª rodada)
**Git:** `main` @ `e23fa66`, igual ao `origin/main`. Os quatro temas estão commitados e publicados: R1 `4c2df93`, R2 `4026823`, R3 `6140f17`, R4 `4b2f48f` (mais testes `e97a19e` e `2d25296`).
**Produção (Vercel):** `4b2f48f` (R4) READY e, por cima, `e23fa66` READY, que é o deploy atual. Os deploys de `cb259d3` e `f4b0c97` foram cancelados, só de docs. O Tester já conferiu parte no ar (B05, B10, A11, S01, "a))" dos Termos). Falta ele conferir as telas logadas.
**Execuções:** os 4 MDs `qa-r1…r4` existem e as Auditorias apontaram os graves, já resolvidos (teste do payload do B01; Termos 2.2 voltaram para 2.1 sem publicar; teste do aviso do Google).

## Regra do Gabriel: e-mail fica para 23/11

Tudo que depende de envio de e-mail (DNS no HostGator, chave do Resend, autoconfirm do Supabase) resolve junto amanhã. Itens marcados abaixo como "e-mail — fica para 23/11": **B02, S01, A06, A14** (A14 depende da caixa do Google Workspace). Lista viva e roteiro: `docs/manutencao-2026-11/PENDENCIAS_DE_EMAIL_PARA_AMANHA.md`. Item novo que dependa de e-mail entra lá.

Notas já registradas lá: B02 só fecha de verdade com o autoconfirm desligado no Supabase de produção, e o fluxo nunca foi testado. A06: o texto do Sacar foi trocado para "Acompanhe o andamento no Extrato" e volta a falar de e-mail quando o envio ligar. A conferir: `SUPABASE_SERVICE_ROLE_KEY` na Vercel.

## Resumo

| Estado | Itens |
|---|---|
| no ar (todo ou na maior parte) | 24: B01, B03, B04, B05, B06, B07, B09, B10, A04, A07, A11, A12, A13, A15, A16, A17, S01, S02, S03, S04, S05, S06, S07, S08 |
| no ar, mas depende de e-mail (23/11) | 3: B02, A06, A14 |
| no ar só na forma; o resto precisa do jurídico | 1: B08 |
| precisa de decisão do Gabriel (nada codificado) | 7: A01, A02, A03, A05, A08, A09, A10 |
| não começou / em execução | 0 |
| Validados pelo Tester no ar | B05, B10, A11, S01 (só a presença do link), B08 ("a))") |

Falta a conferência do Tester nas telas logadas, com conta de teste do repositório, e as decisões do Gabriel. Fila original: **B01 primeiro** (dados de todos os clientes vão no código da página). Depois B02+S01, B03+A16, B06.

## Os 35 itens

Estados: não começou · em execução · pronto no código · no ar · precisa de decisão.

### Bugs (B)

| Item | O que era | Tema | Estado | sha | Prova |
|---|---|---|---|---|---|
| B01 | CPF, Pix, banco e saldo de TODOS os clientes vão junto com as páginas logadas (crítico) | R1 | no ar (falta conferência do Tester) | 4c2df93 | 9+ testes do payload (`estado-do-usuario.test.ts`, regressão e97a19e); Auditoria conferiu. Falta: view-source e `/api/state` com 2 contas de teste. |
| B02 | Conta nasce "e-mail verificado" sem clicar em nada | R2 | e-mail — fica para 23/11 (ver ../PENDENCIAS_DE_EMAIL_PARA_AMANHA.md); código no ar | 4026823 | `email-pendente.test.ts`; fluxo de e-mail nunca testado. Supabase de produção com `mailer_autoconfirm: true`; conta nova só exige clique depois que isso for desligado. |
| B03 | Cadastro formal grava data futura, Pix e telefone inválidos | R2 | no ar | 4026823 | `validacao-cadastro.test.ts` (30), validação também no servidor. Tester ainda não conferiu no ar. |
| B04 | Números do tutorial ficam por cima das janelas | R4 | no ar | 4b2f48f | `tutorial.css:32`. Tester ainda não conferiu no ar. |
| B05 | "até30" sem espaço na Academy | R4 | no ar | 4b2f48f | Tester: "até30" corrigido na Academy. |
| B06 | Previsão do saque soma dias corridos (não pula fim de semana/feriado) | R3 | no ar | 6140f17 | `dias-uteis.test.ts`: pedido sex 20/11/2026 → qua 25/11. Tester ainda não conferiu no ar. |
| B07 | Depósito acima do limite: aviso repetido e saldo calculado com valor inválido; campo aceita letras | R3 | no ar (mínimo: decisão do Gabriel) | 6140f17 | `validacao-dinheiro.test.ts`; mínimo desligado (R$ 0). Tester ainda não conferiu no ar. |
| B08 | Termos: "a))", cláusulas citadas que não existem, erros de texto | R4 | no ar só a forma; texto do contrato precisa de decisão | 4b2f48f | Tester: "a))" sumiu. Termos continuam na 2.1 (de propósito). Ainda errado no ar: "A observará" (14.5.4) e "Cláusula 13.2" citada em 14.4/14.6. Patch 2.2 e lista em `garantias/TERMOS_*` aguardam jurídico/Gabriel. |
| B09 | Envios: campo Ano aceita ano que não existe para a moeda | R3 | no ar (ano no servidor: pergunta ao Gabriel) | 6140f17 | Ano travado no `anoPadrao` na tela. Tester ainda não conferiu no ar. |
| B10 | Página inexistente sem tratamento (404 em português) | R4 | no ar | 4b2f48f | Tester: 404 em português com links; `middleware.test.ts`. |

### Pontos de atenção (A)

| Item | O que era | Tema | Estado | sha | Prova |
|---|---|---|---|---|---|
| A01 | Prazo da retirada física diferente entre documentos | decisão do Gabriel | precisa de decisão | — | — |
| A02 | Seguro do acervo: contratado ou não? | decisão do Gabriel | precisa de decisão | — | — |
| A03 | Home diz "seu item"; Termos dizem que a moeda devolvida pode ser outra | decisão do Gabriel | precisa de decisão | — | — |
| A04 | Aceite de termos não aparece para a conta | R2 | no ar | 4026823 | Aceite estava gravado; a tela engolia o erro de leitura e agora o mostra. Causa exata da falha do QA não reproduzida. Tester ainda não conferiu no ar. |
| A05 | Política diz "cadastro progressivo", mas a 1ª compra já pede endereço e Pix | decisão do Gabriel | precisa de decisão (R2 só levanta) | — | — |
| A06 | E-mails prometidos (ex.: no Sacar) mas ainda desligados | R3 | e-mail — fica para 23/11 (ver ../PENDENCIAS_DE_EMAIL_PARA_AMANHA.md); texto trocado no ar | 6140f17 | Sacar não promete mais e-mail. Reverter a frase quando o envio ligar. |
| A07 | "Média de mercado" com dois valores para a mesma moeda | R4 | no ar | 4b2f48f | "Mediana dos anúncios à venda", "Média das negociações — 7 dias", "Moedas em custódia". Tester ainda não conferiu no ar. |
| A08 | Auditoria pública mostra receita da empresa a qualquer cliente | R1 + decisão do Gabriel | precisa de decisão (intencional?) | — | — |
| A09 | Meta Pixel / cookie `_fbp` sem aviso de cookies | decisão do Gabriel | precisa de decisão (R1 só prepara o texto) | — | — |
| A10 | Comparativo com BTC, ETH e USDT na tela do Mercado | decisão do Gabriel | precisa de decisão | — | — |
| A11 | Login: "Entre com a conta confirmada dos sócios." | R2/R4 | no ar | 4b2f48f | Tester: subtítulo "Entre com o e-mail e a senha…" em `/entrar`. |
| A12 | Academy publicada, mas "Em breve" no menu | R4 | no ar | 4b2f48f | `Sidebar.tsx:362`. Tester ainda não conferiu no ar. |
| A13 | Códigos e termos internos à vista do cliente | R4 | no ar | 4b2f48f | Tirados "F-1", "RA-26", "banco de dados" das telas. Tester ainda não conferiu no ar. |
| A14 | Dois e-mails de contato diferentes | R4 | e-mail — fica para 23/11 (ver ../PENDENCIAS_DE_EMAIL_PARA_AMANHA.md); texto da Academy já lê o e-mail do canal do SAC | 4b2f48f | Valor gravado no banco não conferido (padrão do código: suporte@). |
| A15 | Academy anuncia "três soluções" e lista quatro | R4 | no ar | 4b2f48f | "quatro soluções" na Academy (`academy/page.tsx:95`). Tester ainda não conferiu no ar. |
| A16 | Dois campos "Nome completo" com valores diferentes | R2 | no ar | 4026823 | Regras de nome no servidor; "Nome de exibição" em Dados pessoais. Tester ainda não conferiu no ar. |
| A17 | Moeda Direitos Humanos com composição diferente | R4 | no ar (Gabriel confirma o fato) | 4b2f48f | Landing dizia Cuproníquel; catálogo diz Bimetálica 27 mm, 7,84 g; alinhado ao catálogo. |

### Sugestões (S)

| Item | O que era | Tema | Estado | sha | Prova |
|---|---|---|---|---|---|
| S01 | Não existe "Esqueci minha senha" | R2 | no ar (link por e-mail: 23/11) | 4026823 | Tester: "Esqueci minha senha" presente em `/entrar`. O envio do link nunca foi testado; ver pendências de e-mail. |
| S02 | Venda: "termos de publicação" sem link; seletor de moeda repetido | R3 | no ar | 6140f17 | Um seletor só; "termos de publicação" aponta para /termos. Tester ainda não conferiu no ar. |
| S03 | Envios: Continuar desabilitado sem dizer o que falta (e CEP não encontrado) | R3 | no ar | 6140f17 | CEP não encontrado em destaque; "falta: …" acima do Continuar. Tester ainda não conferiu no ar. |
| S04 | Oferta de compra: botão liberado sem saldo e com valores inválidos | R3 | no ar | 6140f17 | Botão desabilitado com motivo. Tester ainda não conferiu no ar. |
| S05 | Celular: botões flutuantes cobrem o conteúdo | R4 | no ar | 4b2f48f | `tutorial.css:24`, `atendimento.css:26`. Tester ainda não conferiu no ar. |
| S06 | Janelas não fecham com Esc nem clicando fora | R4 | no ar | 4b2f48f | Esc/clique fora só nas janelas marcadas (Senha, compra, venda e retirada ficam como estavam). Tester ainda não conferiu no ar. |
| S07 | Plurais com "(s)" | R4 | no ar | 4b2f48f | `plural.test.ts`. Tester ainda não conferiu no ar. |
| S08 | Pontuação "custódia —, sem usar" | R4 | no ar | 4b2f48f | `mercado/page.tsx:765`. Tester ainda não conferiu no ar. |

### Também do relatório (notas técnicas, sem número)

| O que era | Tema | Estado |
|---|---|---|
| Sem cabeçalho Content-Security-Policy (começar em modo "só relatar") | R1 | não começou |
| Cookies `sb-…-auth-token` sem Secure | R1 | não começou |
| Erro React 418 (hidratação) em Mercado/Compras/Recibos | R1 | não começou |
| Campos de valor aceitam letras e negativos (Depositar, Sacar, preço, quantidade de Compras) | R3 | não começou |

## As 13 perguntas de negócio e o padrão provisório do agente

Regra: **nada abaixo vira código ou texto no ar sem o Gabriel.** "Padrão provisório" = o que o agente faz enquanto não houver resposta, sem decidir nada pelo negócio.

| # | Pergunta do Davi | Itens | Padrão provisório do agente | Quem responde |
|---|---|---|---|---|
| 1 | Guarda: é a moeda que o cliente enviou ou moeda equivalente? O laudo é do exemplar ou da categoria? | A03 | Não mexer na home nem nos Termos. Levar as duas redações lado a lado. | Gabriel (+ jurídico) |
| 2 | Seguro do acervo: já contratado? A taxa de custódia o inclui? | A02 | Não afirmar seguro em nenhuma tela. Listar onde o site fala de seguro. | Gabriel |
| 3 | Sicoob: parceria formal e autorização para usar o nome? | texto | Não alterar. Levantar onde o nome aparece. | Gabriel (+ jurídico) |
| 4 | Retirada Comum (R$ 50) × Segura (R$ 180): qual a diferença? | texto | Não alterar valores. Propor um texto curto na Tabela de Taxas para o Gabriel aprovar. | Gabriel |
| 5 | Que "planos de custódia" existem (a tabela só tem R$ 2,00/moeda/mês)? | texto | Segundo o CLAUDE.md o plano é um só, mensal. Propor tirar "planos" no plural das telas, só com aval. | Gabriel |
| 6 | Compra que falha vira saldo e sair custa R$ 5 de saque: é intencional? | regra de cobrança | Não mudar a tarifa. Registrar a pergunta. | Gabriel |
| 7 | Arbitragem: opcional no cadastro × obrigatória acima de R$ 100 mil nos Termos | B08 | Não tocar na cláusula. Só levar ao jurídico. | Gabriel (+ jurídico) |
| 8 | Identidade: Termos (cap. 6) pedem documentos; Política (cap. 3) diz que não pede | A05 | Não alterar nenhum dos dois. Levantar a divergência. | Gabriel (+ jurídico) |
| 9 | Avisos: enquanto o e-mail está desligado, como o cliente sabe de venda/saque? | A06 | Tirar a promessa de e-mail do Sacar (A06) enquanto estiver desligado. Ligar quando a chave de envio existir. | Gabriel (chave de e-mail) |
| 10 | Auditoria com receita da empresa aberta a todos: é de propósito? | A08 | Deixar como está. O B01 já impede o vazamento de dados de terceiros. Ocultar financeiro só com aval. | Gabriel |
| 11 | Comparativo com BTC/ETH/USDT: fonte, período, por quê? | A10 | Não remover nem mexer. Levantar a fonte. Há risco de enquadramento ("não é investimento"), por isso é decisão dele. | Gabriel |
| 12 | Existe depósito mínimo? Hoje R$ 0,01 gera Pix. | B07 | Sem mínimo novo. Deixar a constante pronta (valor 0 = sem mínimo) e a pergunta registrada. | Gabriel |
| 13 | Outros itens de coleção no plano: quais, com que critério de perícia? | texto | Não alterar a home. | Gabriel |

## O que só o Gabriel responde

1. As 13 perguntas acima.
2. **B02:** quem não confirmou o e-mail fica bloqueado de quê? Padrão provisório: bloquear depósito, compra e saque; contas dos sócios atuais ficam verificadas.
3. **A01:** prazo da retirada física, dias úteis ou corridos.
4. **A09:** banner de cookies e citar a Meta na Política. O agente só prepara o texto.
5. **B01:** depois do deploy, comunicação à ANPD e aos titulares (LGPD art. 48) é decisão jurídica sua. O agente não comunica ninguém.
6. **Validação de CPF/nome na Receita** (Datavalid/Consulta CPF): serviço pago, não integrado.
7. **B08:** cláusulas citadas por número errado (14.4, 7.3.3, 13.2): o jurídico decide; o agente só levanta a lista.
8. **A14:** qual e-mail de contato vale, se `/admin/configuracao` não resolver.

## Perguntas novas vindas da Execução R3 (para o Gabriel)

1. Depósito mínimo: qual valor? (hoje desligado, R$ 0). 2. "Prazo do saque em dias úteis" conta só feriado nacional? (liga na A01). 3. "Termos de publicação" apontando para os Termos de Uso basta? 4. Travar o ano também no servidor (B09)?

## Pendências de verificação no ar (Tester) e decisões novas

- Tester, com conta de teste: B01 (view-source e `/api/state` sem dado de outra conta), A08 em `/recibos`, erro 418 (de preferência depois das 21h de Brasília), B06, B07, S04, B09, S03, B04, S05, S06, A12, A13.
- Cookies `sb-…`: ainda `Secure=false` na sessão vista pelo Tester, que pode ser anterior ao deploy. Conferir depois de sair e entrar de novo.
- CSP continua só em modo relatório, de propósito. Falta ler as violações numa tela logada e depois bloquear.
- Termos: v2.2 **não publicada**. O texto do contrato é do jurídico/Gabriel. Lista em `garantias/TERMOS_CLAUSULAS_PARA_O_JURIDICO.md`.
- Incidente do B01: `garantias/INCIDENTE_B01_22-11.md`. Decisões do Gabriel: comunicação à ANPD (art. 48), logs da Vercel, quantos clientes reais havia na janela.
- A09: texto proposto em `garantias/A09_PROPOSTA_BANNER_COOKIES.md`, não ligado.
- Teste vermelho citado pelo R2: `frete-envio.test.ts`. O commit `2d25296` ("estorno do frete não depende mais da data de hoje") parece ter resolvido; conferir.
- O Tester viu no ar texto novo de seguro e "mesma moeda" (A02/A03), que o R4 diz não ter codificado. Perguntar ao Controle quem mudou.

## Pontos de atenção levantados pelo Tester e pela Auditoria (fora dos 35)

- Tela Financeiro: "Custódia paga" no fecho do saldo = −R$ 1.056,00, e a custódia faturada paga = R$ 790,00. Diferença de R$ 266,00. Pode ser esperado (custódia da compra, estornos). Pergunta para o Controle.
- Gráfico "Receita mês a mês": a ordem dos rótulos no texto não bate com a tabela. Não conferido por print. Pode ser só a ordem de leitura.
- Caixas com erro de digitação: "GANDEIRA CAIXA 4" (EB-004) e "EB003" sem hífen. Dado, não código.
- Telas do admin às vezes demoram mais de 4 s para hidratar.
- Recibo com número da moeda ainda não testado (a conta logada não tem moeda).
- Tester ainda não cobriu: 768 px logado, modo escuro logado, abas Catálogo/Operacional/Integrações/Histórico da Configuração.

## Histórico das atualizações

| Hora | Git | O que mudou |
|---|---|---|
| ~20:30 | `main` @ `282e55d`, sem commit da QA | Relatório criado. Único movimento: B06 começou (`dias-uteis.ts`). |
| 20:31 | `main` @ `019947c`, sem commit da QA | R3 entregou 7 itens no código (MD qa-r3). R1/R2/R4 com código no working tree, sem MD. Auditoria cobra o teste de payload do B01. Saúde: `saque.test.ts` falha por edição do R2 em andamento (`normalizarNome`). |
| ~20:40 | sem mudança | Regra do Gabriel: itens de e-mail (B02, S01, A06, A14) marcados "fica para 23/11" e ligados ao arquivo de pendências. |
| 20:50 | `main` @ `e23fa66` = `origin/main` | R1–R4 commitados e no ar (Vercel READY em `4b2f48f` e `e23fa66`). 24 itens no ar, 3 de e-mail para 23/11, B08 só na forma, 7 aguardam o Gabriel. Falta o Tester conferir as telas logadas. |
