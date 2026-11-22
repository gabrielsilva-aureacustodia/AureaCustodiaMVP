# Relatório de status | QA do Davi Bego (22/11/2026)

> Para o Rogério e o Gabriel. Atualizado a cada 15 minutos pelo chat "Relatórios". Fonte do relatório: `docs/manutencao-2026-11/relatorio-qa-davi/RELATORIO_QA_DAVI_BEGO_texto.md`.

**Última atualização:** 22/11/2026, 20:31 (2ª rodada)
**Git:** `main` @ `019947c` (commit do T6, de outro chat), igual ao `origin/main`. **Nenhum commit da QA ainda.** Tudo da QA está só no working tree. Coluna "sha publicado" vazia em todos.
**Produção:** o Tester validou o deploy `6c3f79f` (telas públicas e do painel OK; nada da QA ainda no ar). Vercel ainda não consultada (sem deploy novo para conferir).
**Execuções:** só existe o MD `qa-r3-dinheiro` (R3: 7 itens prontos no código). R1, R2 e R4 têm código no working tree mas ainda sem MD. A Auditoria já checou B01 parcialmente: falta o teste do payload (agora aparece `estado-do-usuario.test.ts`) e dois pontos médios. Vercel: sem deploy novo da QA.

## Regra do Gabriel: e-mail fica para 23/11

Tudo que depende de envio de e-mail (DNS no HostGator, chave do Resend, autoconfirm do Supabase) resolve junto amanhã. Itens marcados abaixo como "e-mail — fica para 23/11": **B02, S01, A06, A14** (A14 depende da caixa do Google Workspace). Lista viva e roteiro: `docs/manutencao-2026-11/PENDENCIAS_DE_EMAIL_PARA_AMANHA.md`. Item novo que dependa de e-mail entra lá.

Notas já registradas lá: B02 só fecha de verdade com o autoconfirm desligado no Supabase de produção, e o fluxo nunca foi testado. A06: o texto do Sacar foi trocado para "Acompanhe o andamento no Extrato" e volta a falar de e-mail quando o envio ligar. A conferir: `SUPABASE_SERVICE_ROLE_KEY` na Vercel.

## Resumo

| Estado | Itens |
|---|---|
| no ar | 0 |
| pronto no código (working tree, sem commit) | 7 (B06, B07, B09, A06, S02, S03, S04) |
| em execução (código no working tree, sem MD) | 6 (B01, B02, B03, S06, S07, A12) |
| precisa de decisão do Gabriel | 7 (A01, A02, A03, A05, A08, A09, A10), mais parte de B02, B07, B08, A14 |
| não começou | 15 |

Fila de prioridade: **B01 primeiro** (dados de todos os clientes vão no código da página). Depois B02+S01, B03+A16, B06.

## Os 35 itens

Estados: não começou · em execução · pronto no código · no ar · precisa de decisão.

### Bugs (B)

| Item | O que era | Tema | Estado | sha | Prova |
|---|---|---|---|---|---|
| B01 | CPF, Pix, banco e saldo de TODOS os clientes vão junto com as páginas logadas (crítico) | R1 | em execução (código escrito, sem MD qa-r1) | — | Auditoria (ciclo 2): layout e /api/state passam por `visaoDoUsuario`; `estado-do-usuario.test.ts` já aparece no working tree, ainda não conferido. Aberto: código de recibo de todas as moedas no payload; A08. |
| B02 | Conta nasce "e-mail verificado" sem clicar em nada | R2 | e-mail — fica para 23/11 (ver ../PENDENCIAS_DE_EMAIL_PARA_AMANHA.md); código: em execução (sem MD qa-r2; política: decisão do Gabriel) | — | `email-pendente.ts` e `conta-acesso.ts` no working tree; ainda não conferido. |
| B03 | Cadastro formal grava data futura, Pix e telefone inválidos | R2 | em execução (sem MD qa-r2) | — | `validacao-cadastro.ts` + teste no working tree; ainda não conferido. |
| B04 | Números do tutorial ficam por cima das janelas | R4 | não começou | — | — |
| B05 | "até30" sem espaço na Academy | R4 | não começou | — | — |
| B06 | Previsão do saque soma dias corridos (não pula fim de semana/feriado) | R3 | pronto no código (só no working tree) | — | MD qa-r3: typecheck limpo, vitest dos testes novos verde (22). teste: pedido sex 20/11/2026 → qua 25/11 (`dias-uteis.test.ts`). Falta ok do Gabriel: só feriado nacional. |
| B07 | Depósito acima do limite: aviso repetido e saldo calculado com valor inválido; campo aceita letras | R3 | pronto no código (mínimo: decisão do Gabriel) | — | MD qa-r3: typecheck limpo, vitest dos testes novos verde (22). `validacao-dinheiro.test.ts`; um só aviso, saldo "—" com valor inválido, campo só números; mínimo desligado (R$ 0). |
| B08 | Termos: "a))", cláusulas citadas que não existem, erros de texto | R4 | não começou (texto jurídico: só formatação e erros materiais; resto o jurídico decide) | — | — |
| B09 | Envios: campo Ano aceita ano que não existe para a moeda | R3 | pronto no código | — | MD qa-r3: typecheck limpo, vitest dos testes novos verde (22). select de Ano travado no `anoPadrao`; servidor ainda não valida o ano (pergunta ao Gabriel). |
| B10 | Página inexistente sem tratamento (404 em português) | R4 | não começou | — | — |

### Pontos de atenção (A)

| Item | O que era | Tema | Estado | sha | Prova |
|---|---|---|---|---|---|
| A01 | Prazo da retirada física diferente entre documentos | decisão do Gabriel | precisa de decisão | — | — |
| A02 | Seguro do acervo: contratado ou não? | decisão do Gabriel | precisa de decisão | — | — |
| A03 | Home diz "seu item"; Termos dizem que a moeda devolvida pode ser outra | decisão do Gabriel | precisa de decisão | — | — |
| A04 | Aceite de termos não aparece para a conta | R2 | não começou | — | — |
| A05 | Política diz "cadastro progressivo", mas a 1ª compra já pede endereço e Pix | decisão do Gabriel | precisa de decisão (R2 só levanta) | — | — |
| A06 | E-mails prometidos (ex.: no Sacar) mas ainda desligados | R3 | e-mail — fica para 23/11 (ver ../PENDENCIAS_DE_EMAIL_PARA_AMANHA.md); código: pronto no código | — | MD qa-r3: typecheck limpo, vitest dos testes novos verde (22). promessa de e-mail removida do Sacar. Reverter a frase quando o envio de e-mail ligar. |
| A07 | "Média de mercado" com dois valores para a mesma moeda | R4 | não começou | — | — |
| A08 | Auditoria pública mostra receita da empresa a qualquer cliente | R1 + decisão do Gabriel | precisa de decisão (intencional?) | — | — |
| A09 | Meta Pixel / cookie `_fbp` sem aviso de cookies | decisão do Gabriel | precisa de decisão (R1 só prepara o texto) | — | — |
| A10 | Comparativo com BTC, ETH e USDT na tela do Mercado | decisão do Gabriel | precisa de decisão | — | — |
| A11 | Login: "Entre com a conta confirmada dos sócios." | R2/R4 | não começou (T6 mexeu no login em 22/11: conferir se ainda existe) | — | — |
| A12 | Academy publicada, mas "Em breve" no menu | R4 | em execução (sem MD qa-r4) | — | `Sidebar.tsx` e `academy/page.tsx` alterados; ainda não conferido. |
| A13 | Códigos e termos internos à vista do cliente | R4 | não começou | — | — |
| A14 | Dois e-mails de contato diferentes | R4 | e-mail — fica para 23/11 (ver ../PENDENCIAS_DE_EMAIL_PARA_AMANHA.md); código: não começou (qual e-mail vale: confirmar com o Gabriel se houver dúvida) | — | — |
| A15 | Academy anuncia "três soluções" e lista quatro | R4 | não começou | — | — |
| A16 | Dois campos "Nome completo" com valores diferentes | R2 | não começou | — | — |
| A17 | Moeda Direitos Humanos com composição diferente | R4 | não começou | — | — |

### Sugestões (S)

| Item | O que era | Tema | Estado | sha | Prova |
|---|---|---|---|---|---|
| S01 | Não existe "Esqueci minha senha" | R2 | e-mail — fica para 23/11 (ver ../PENDENCIAS_DE_EMAIL_PARA_AMANHA.md); código: não começou (conferir no código de hoje) | — | — |
| S02 | Venda: "termos de publicação" sem link; seletor de moeda repetido | R3 | pronto no código | — | MD qa-r3: typecheck limpo, vitest dos testes novos verde (22). um seletor só; "termos de publicação" aponta para /termos. Gabriel: basta ou quer texto próprio? |
| S03 | Envios: Continuar desabilitado sem dizer o que falta (e CEP não encontrado) | R3 | pronto no código | — | MD qa-r3: typecheck limpo, vitest dos testes novos verde (22). CEP não encontrado em destaque e "falta: …" acima do Continuar. Falta conferência do Tester. |
| S04 | Oferta de compra: botão liberado sem saldo e com valores inválidos | R3 | pronto no código | — | MD qa-r3: typecheck limpo, vitest dos testes novos verde (22). botão desabilitado com motivo; teste em `validacao-dinheiro.test.ts`. |
| S05 | Celular: botões flutuantes cobrem o conteúdo | R4 | não começou | — | — |
| S06 | Janelas não fecham com Esc nem clicando fora | R4 | em execução (sem MD qa-r4) | — | `Modal.tsx` alterado no working tree; ainda não conferido. |
| S07 | Plurais com "(s)" | R4 | em execução (sem MD qa-r4) | — | `plural.ts` + teste no working tree; ainda não ligado/conferido. |
| S08 | Pontuação "custódia —, sem usar" | R4 | não começou | — | — |

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
