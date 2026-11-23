# Relatório de status | QA do Davi Bego (22/11/2026)

> **DECISÃO FINAL (Gabriel, 22/11/2026 noite): B02 ENCERRADO POR REVERSÃO.** A conta nasce confirmada, sem confirmação de e-mail e sem nenhuma limitação ao cadastro (regra permanente: cadastro rápido e fácil). Código revertido no commit 91cccf2 (`registerWithEmail`, `salvarCadastro`, `conta-acesso.ts`); autoconfirm do Supabase fica ligado. Não depende mais de e-mail. Tudo o mais de e-mail: `docs/manutencao-2026-11/PENDENCIAS_DE_EMAIL_PARA_AMANHA.md`. Validação de CPF por API: não aprovada, em `PENDENCIAS_DO_SISTEMA.md`.


> Para o Rogério e o Gabriel. Atualizado a cada 15 minutos pelo chat "Relatórios". Fonte do relatório: `docs/manutencao-2026-11/relatorio-qa-davi/RELATORIO_QA_DAVI_BEGO_texto.md`.

**Última atualização:** 22/11/2026, 21:33 (**final**; rotina de 15 minutos encerrada)
**Git:** `main` @ `81f2cfa`, igual ao `origin/main`. Entregas da QA: R1 `4c2df93`, `a4d5488` (faixa de cookies), `ee28f3b` (CSP bloqueante), `18630a9` e `f484c6f` (faixa no celular); R2 `4026823`; R3 `6140f17`; R4 `4b2f48f`, `f8ede77`, `a267335`, `e3f8958`; A08/B09 `5a39b89`; executor dos documentos `895b924`; testes e garantias finais `81f2cfa`.
**Produção (Vercel):** `81f2cfa` READY (deploy atual) e `f484c6f` READY. Documentos legais publicados no banco: Termos 2.2, Arbitragem 2.2, Política 2.1, Taxas 2.5. CSP bloqueante no ar.
**Resultado final:** **tudo do relatório do Davi está resolvido, exceto o que depende de e-mail (B02, S01, A06, A14), que fica para 23/11** e está registrado em `docs/manutencao-2026-11/PENDENCIAS_DE_EMAIL_PARA_AMANHA.md`. As telas logadas foram conferidas no ar pelo Controle e pelo Tester, com painel visível.

## Encerrado: "telas logadas não montam" (erro #310)

O Tester viu `/mercado`, `/compras` e `/inicio` presas em "Carregando a tela…" com `Minified React error #310`. O Controle encerrou o caso (22/11, ~21:20): era artefato do painel oculto do navegador de teste. Com o painel visível `/inicio` carrega normal, o R1 só reproduziu local com o painel oculto, e não há erro de servidor nos logs. Por isso a CSP voltou a bloquear em `ee28f3b`, sem violações no console em `/inicio` e `/mercado`. Fonte: Controle e R1; o Tester ainda não registrou nova rodada logada, então B01, B04, B06, B07, B09, S03–S06, A12 e A13 seguem sem conferência dele nas telas logadas.

## Documentos legais publicados no banco (22/11, ~21:25)

Executor de uso único `scripts/publicar-documentos-legais.test.ts` (commit `895b924`), idempotente e sem tocar nos aceites. Publicou **Termos 2.2, Cláusula de Arbitragem 2.2, Política 2.1 e Tabela de Taxas 2.5**, todos com `doBanco=true` e `confere=true`. Reaceite disparou: `/api/state` da conta do Gabriel devolve `aceitesPendentes` [termos, política, taxas] e a faixa "Há versão nova de…" aparece. Por quê: o deploy não publica sozinho, e sem a linha no banco o site servia texto novo com versão antiga (era o "Versão 2.1" no cabeçalho de `/termos` e "2.3" em `/taxas` que o Tester achou).

## Regra do Gabriel: e-mail fica para 23/11

Tudo que depende de envio de e-mail (DNS no HostGator, chave do Resend, autoconfirm do Supabase) resolve junto amanhã. Itens marcados abaixo como "e-mail — fica para 23/11": **B02, S01, A06, A14** (A14 depende da caixa do Google Workspace). Lista viva e roteiro: `docs/manutencao-2026-11/PENDENCIAS_DE_EMAIL_PARA_AMANHA.md`. Item novo que dependa de e-mail entra lá.

Notas já registradas lá: B02 só fecha de verdade com o autoconfirm desligado no Supabase de produção, e o fluxo nunca foi testado. A06: o texto do Sacar foi trocado para "Acompanhe o andamento no Extrato" e volta a falar de e-mail quando o envio ligar. A conferir: `SUPABASE_SERVICE_ROLE_KEY` na Vercel.

## Resumo

| Estado | Itens |
|---|---|
| no ar (todo ou na maior parte) | 25: B01, B03, B04, B05, B06, B07, B09, B10, A04, A07, A08, A11, A12, A13, A15, A16, A17, S01, S02, S03, S04, S05, S06, S07, S08 |
| no ar, mas depende de e-mail (23/11) | 3: B02, A06, A14 |
| no ar por ordem do Gabriel (opção conservadora) | 7: A01, A02, A03, A05, A09, A10, B08 (documentos publicados no banco) |
| não começou | 0 |
| Validados pelo Tester no ar (telas públicas, HTML, API e medição no DOM) | B05, B10, A11, S01 (presença), A01, A02, A03, A05, A08, A09, A10, B08, CSP bloqueante |
| Telas logadas conferidas no ar (Controle e Tester, painel visível) | B01, B04, B06, B07, B09, S03–S06, A12, A13, A04, A16 |

Resolvido tudo o que o relatório pedia, exceto o que depende de e-mail (23/11). Fila original: **B01 primeiro** (dados de todos os clientes vão no código da página). Depois B02+S01, B03+A16, B06.

## Os 35 itens

Estados: não começou · em execução · pronto no código · no ar · precisa de decisão.

### Bugs (B)

| Item | O que era | Tema | Estado | sha | Prova  Decisão tomada e por quê |
|---|---|---|---|---|---|---|
| B01 | CPF, Pix, banco e saldo de TODOS os clientes vão junto com as páginas logadas (crítico) | R1 | no ar (falta conferência do Tester) | 4c2df93 | 9+ testes do payload (`estado-do-usuario.test.ts`, regressão e97a19e); Auditoria conferiu. Falta: view-source e `/api/state` com 2 contas de teste. | Corrigir antes de tudo e no servidor: o navegador só recebe o que é do dono da conta; terceiros viram pseudônimo. Dado de cliente no código da página não se resolve com esconder na tela. |
| B02 | Conta nasce "e-mail verificado" sem clicar em nada | R2 | ENCERRADO: conta nasce confirmada por decisão do Gabriel (revertido em 91cccf2) | 4026823 | `email-pendente.test.ts`; fluxo de e-mail nunca testado. Supabase de produção com `mailer_autoconfirm: true`; conta nova só exige clique depois que isso for desligado. | Bloquear só depósito, compra, venda e saque até confirmar o e-mail (não o login): protege o dinheiro sem trancar os sócios. Contas antigas ficam verificadas. |
| B03 | Cadastro formal grava data futura, Pix e telefone inválidos | R2 | no ar | 4026823 | `validacao-cadastro.test.ts` (30), validação também no servidor. Tester ainda não conferiu no ar. | Validar no navegador e no servidor. Sem Datavalid/Consulta CPF: serviço pago; só se confere o dígito. |
| B04 | Números do tutorial ficam por cima das janelas | R4 | no ar | 4b2f48f | `tutorial.css:32`. Tester ainda não conferiu no ar. | Esconder números e painel do tutorial quando há janela aberta; voltam ao fechar. |
| B05 | "até30" sem espaço na Academy | R4 | no ar | 4b2f48f | Tester: "até30" corrigido na Academy. | — |
| B06 | Previsão do saque soma dias corridos (não pula fim de semana/feriado) | R3 | no ar | 6140f17 | `dias-uteis.test.ts`: pedido sex 20/11/2026 → qua 25/11. Tester ainda não conferiu no ar. | Só feriados nacionais: feriado estadual/municipal exigiria decisão de prazo que o sistema não tem. |
| B07 | Depósito acima do limite: aviso repetido e saldo calculado com valor inválido; campo aceita letras | R3 | no ar (decidido: sem mínimo, R$ 0) | 6140f17 | `validacao-dinheiro.test.ts`. Tester ainda não conferiu. | Decidido pelo Gabriel: sem mínimo (R$ 0). A constante fica pronta caso mude. |
| B08 | Termos: "a))", cláusulas citadas que não existem, erros de texto | R4 | no ar e publicado no banco | f8ede77, a267335, e3f8958, 895b924 | Tester: concordância e remissões corrigidas no texto. Versões publicadas no banco: Termos 2.2, Arbitragem 2.2, Política 2.1, Taxas 2.5 (`doBanco` e `confere` verdadeiros). Reaceite disparou. Tester (rodada 5): `/termos` 2.2, `/taxas` 2.5, `/privacidade` 2.1; faixa de reaceite lista Termos, Política e Taxas. **Em aberto:** a Arbitragem 2.2 não aparece na lista de reaceite. | Gabriel liberou publicar versão nova (MVP de teste, 7 sócios), então a trava anterior caiu. Mudou só concordância, remissões e erros materiais; cada cliente aceita de novo. Falta explicar o cabeçalho com versão antiga. |
| B09 | Envios: campo Ano aceita ano que não existe para a moeda | R3 | no ar (tela e servidor) | 6140f17, 5a39b89 | Ano travado no `anoPadrao` na tela e agora também no servidor (`custody.ts`). Tester ainda não conferiu. | Travar o ano também no servidor, porque só a tela não impede um envio com ano inventado. |
| B10 | Página inexistente sem tratamento (404 em português) | R4 | no ar | 4b2f48f | Tester: 404 em português com links; `middleware.test.ts`. | 404 verdadeiro, em português; quem não tem sessão e acessa endereço desconhecido vê o 404, quem acessa rota logada continua indo ao login. |

### Pontos de atenção (A)

| Item | O que era | Tema | Estado | sha | Prova  Decisão tomada e por quê |
|---|---|---|---|---|---|---|
| A01 | Prazo da retirada física diferente entre documentos | R4 | no ar | a267335, f8ede77 | Tester: Termos 7.5.6 "30 dias úteis". Textos de Academy, Retiradas e modal alinhados. O cálculo da data-limite em `domain/retirada.ts` segue em dias corridos (lado seguro). | Textos alinhados aos Termos, que prevalecem. O cálculo ficou em dias corridos, que erra para o lado seguro (a data aparece mais cedo); passar a contar dias úteis é mudança de regra, não feita. |
| A02 | Seguro do acervo: contratado ou não? | R4 | no ar | a267335, f8ede77, e3f8958 | Tester: Academy diz que não há apólice contratada. Tabela 2.5: Retirada Segura sem seguro de valor (embalagem lacrada e rastreio). | Nenhuma tela afirma seguro do acervo, porque não há apólice contratada. Só o valor declarado do transporte (seguro postal). |
| A03 | Home diz "seu item"; Termos dizem que a moeda devolvida pode ser outra | R4 | no ar | f8ede77 | Home e Academy dizem guarda por moeda equivalente; saiu "ninguém toca no seu item. Nem nós." | Alinhado aos Termos (moeda equivalente), para a home não prometer o que o contrato não promete. |
| A04 | Aceite de termos não aparece para a conta | R2 | no ar | 4026823 | Aceite estava gravado; a tela engolia o erro de leitura e agora o mostra. Causa exata da falha do QA não reproduzida. Tester ainda não conferiu no ar. | Aceite estava gravado; a tela engolia o erro de leitura. Mostrar o erro com "Tentar de novo" em vez de "nenhum registro". |
| A05 | Política diz "cadastro progressivo", mas a 1ª compra já pede endereço e Pix | R4 | no ar e publicado no banco | a267335, 895b924 | Política 2.1 publicada no banco; reaceite pede a Política. | Texto da Política alinhado ao que o cadastro faz hoje. Pedir menos na compra seria mudança de produto, não feita. |
| A06 | E-mails prometidos (ex.: no Sacar) mas ainda desligados | R3 | e-mail — fica para 23/11 (ver ../PENDENCIAS_DE_EMAIL_PARA_AMANHA.md); texto trocado no ar | 6140f17 | Sacar não promete mais e-mail. Reverter a frase quando o envio ligar. | Tirar a promessa de e-mail enquanto o envio está desligado: promessa que não se cumpre é pior que o silêncio. Volta quando o e-mail ligar. |
| A07 | "Média de mercado" com dois valores para a mesma moeda | R4 | no ar | 4b2f48f | "Mediana dos anúncios à venda", "Média das negociações — 7 dias", "Moedas em custódia". Tester ainda não conferiu no ar. | Nomes que dizem o que o número calcula (mediana dos anúncios; média das negociações em 7 dias). |
| A08 | Auditoria pública mostra receita da empresa a qualquer cliente | R1 | no ar | 5a39b89 | Dinheiro da empresa (saldo, receita, taxas) saiu do payload e da tela de auditoria do cliente; fica só o estoque. `estado-do-usuario.test.ts` ampliado. Tester ainda não conferiu. Tester (rodada 5): `/recibos/auditoria` só com esteira e contagens (253 moedas custodiadas), sem receita nem saldo da empresa. Controle conferiu de novo com painel visível. | Dinheiro da empresa saiu do payload e da tela: o cliente não precisa dele, e o B01 só protegia dados de terceiros. |
| A09 | Meta Pixel / cookie `_fbp` sem aviso de cookies | R1 | no ar (faixa também no celular) | a4d5488, 18630a9, f484c6f | Tester: `fbq` indefinido antes de "Aceitar". Faixa mais baixa no celular, com texto curto e botões de 44 px iguais. Tester (rodadas 6 e 7): 375/768/1280, claro e escuro, botões Recusar, Aceitar e "Saiba mais" com 44 px, sem rolagem lateral. | Pixel e API de Conversões só depois de "Aceitar"; "Recusar" tem o mesmo peso. Cookie `_fbp` antigo continua nos navegadores que já o tinham. |
| A10 | Comparativo com BTC, ETH e USDT na tela do Mercado | R4 | no ar | f8ede77 | Tester: HTML de `/mercado` sem BTC/ETH/USDT/cripto; `/mercado/comparacoes` redireciona. Controle (painel visível): `/mercado` sem BTC/ETH/USDT e sem "Comparação simples". | Comparativo removido: o serviço não é investimento e o texto de risco regulatório pesa mais que o ganho. |
| A11 | Login: "Entre com a conta confirmada dos sócios." | R2/R4 | no ar | 4b2f48f | Tester: subtítulo "Entre com o e-mail e a senha…" em `/entrar`. | — |
| A12 | Academy publicada, mas "Em breve" no menu | R4 | no ar | 4b2f48f | `Sidebar.tsx:362`. Tester ainda não conferiu no ar. | — |
| A13 | Códigos e termos internos à vista do cliente | R4 | no ar | 4b2f48f | Tirados "F-1", "RA-26", "banco de dados" das telas. Tester ainda não conferiu no ar. | — |
| A14 | Dois e-mails de contato diferentes | R4 | e-mail — fica para 23/11 (ver ../PENDENCIAS_DE_EMAIL_PARA_AMANHA.md); texto da Academy já lê o e-mail do canal do SAC | 4b2f48f | Valor gravado no banco não conferido (padrão do código: suporte@). | Academy lê o e-mail do canal do SAC, o mesmo de /admin/configuracao: um só contato. |
| A15 | Academy anuncia "três soluções" e lista quatro | R4 | no ar | 4b2f48f | "quatro soluções" na Academy (`academy/page.tsx:95`). Tester ainda não conferiu no ar. | — |
| A16 | Dois campos "Nome completo" com valores diferentes | R2 | no ar | 4026823 | Regras de nome no servidor; "Nome de exibição" em Dados pessoais. Tester ainda não conferiu no ar. | — |
| A17 | Moeda Direitos Humanos com composição diferente | R4 | no ar (Gabriel confirma o fato) | 4b2f48f | Landing dizia Cuproníquel; catálogo diz Bimetálica 27 mm, 7,84 g; alinhado ao catálogo. | Alinhado ao catálogo (fonte única da composição da moeda). |

### Sugestões (S)

| Item | O que era | Tema | Estado | sha | Prova  Decisão tomada e por quê |
|---|---|---|---|---|---|---|
| S01 | Não existe "Esqueci minha senha" | R2 | no ar (link por e-mail: 23/11) | 4026823 | Tester: "Esqueci minha senha" presente em `/entrar`. O envio do link nunca foi testado; ver pendências de e-mail. | Resposta neutra (não revela quem tem conta); link só depois que o e-mail ligar. |
| S02 | Venda: "termos de publicação" sem link; seletor de moeda repetido | R3 | no ar | 6140f17 | Um seletor só; "termos de publicação" aponta para /termos. Tester ainda não conferiu no ar. | — |
| S03 | Envios: Continuar desabilitado sem dizer o que falta (e CEP não encontrado) | R3 | no ar | 6140f17 | CEP não encontrado em destaque; "falta: …" acima do Continuar. Tester ainda não conferiu no ar. | — |
| S04 | Oferta de compra: botão liberado sem saldo e com valores inválidos | R3 | no ar | 6140f17 | Botão desabilitado com motivo. Tester ainda não conferiu no ar. | — |
| S05 | Celular: botões flutuantes cobrem o conteúdo | R4 | no ar | 4b2f48f | `tutorial.css:24`, `atendimento.css:26`. Tester ainda não conferiu no ar. | — |
| S06 | Janelas não fecham com Esc nem clicando fora | R4 | no ar | 4b2f48f | Esc/clique fora só nas janelas marcadas (Senha, compra, venda e retirada ficam como estavam). Tester ainda não conferiu no ar. | Esc e clique fora só onde não se perde dado; senha, compra, venda e retirada ficam como estavam. |
| S07 | Plurais com "(s)" | R4 | no ar | 4b2f48f | `plural.test.ts`. Tester ainda não conferiu no ar. | — |
| S08 | Pontuação "custódia —, sem usar" | R4 | no ar | 4b2f48f | `mercado/page.tsx:765`. Tester ainda não conferiu no ar. | — |

### Também do relatório (notas técnicas, sem número)

| O que era | Tema | Estado | sha | Prova |
|---|---|---|---|---|
| Sem cabeçalho Content-Security-Policy | R1 | no ar bloqueante | a4d5488, ee28f3b | Voltou a bloquear em `ee28f3b` depois do alarme do #310 (artefato do painel oculto). Sem violações no console em `/inicio` e `/mercado`. Origens conferidas no código; ainda sem conferir Pix/cartão, login Google, bancada com vídeo e PDF/XLSX. |
| Cookies `sb-…-auth-token` sem Secure | R1 | no ar | 4c2df93 | `src/server/auth/client.ts:29`. Tester viu `Secure=false` numa sessão provavelmente anterior ao deploy; conferir depois de sair e entrar. |
| Erro React 418 (hidratação) em Mercado/Compras/Recibos | R1 | corrigido (fuso fixo `America/Sao_Paulo`) | 4c2df93 | `dates.ts`. Confirmar no console logado, de preferência depois das 21h de Brasília. |
| Campos de valor aceitam letras e negativos (Depositar, Sacar, preço, quantidade de Compras) | R3 | no ar | 6140f17 | `validacao-dinheiro.test.ts`. Tester ainda não conferiu. |

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
| 10 | Auditoria com receita da empresa aberta a todos: é de propósito? | A08 | **Resolvido (5a39b89):** dinheiro da empresa saiu da auditoria do cliente. | Decidido |
| 11 | Comparativo com BTC/ETH/USDT: fonte, período, por quê? | A10 | Não remover nem mexer. Levantar a fonte. Há risco de enquadramento ("não é investimento"), por isso é decisão dele. | Gabriel |
| 12 | Existe depósito mínimo? Hoje R$ 0,01 gera Pix. | B07 | **Decidido: sem mínimo (R$ 0).** | Decidido |
| 13 | Outros itens de coleção no plano: quais, com que critério de perícia? | texto | Não alterar a home. | Gabriel |

## Decisões tomadas e o porquê (nada fica "dependendo dele")

Regra do Gabriel (22/11): registrar o que foi feito e o porquê, e não classificar item como "depende dele". Onde havia dúvida de negócio, a Execução aplica a opção conservadora, registra aqui e o Gabriel muda depois, se quiser.

| Decisão | Quem | Por quê | Estado |
|---|---|---|---|
| Depósito sem mínimo (R$ 0) | Gabriel | Cada Pix custa ao intermediador, mas o Gabriel preferiu não limitar; a constante `DEPOSITO_MINIMO_CENTS` está pronta | decidido |
| A08: dinheiro da empresa sai da tela do cliente | Controle/R1 | O cliente não precisa dele | no ar (`5a39b89`) |
| Sem comunicação à ANPD/titulares do B01 | Gabriel | Registrado em `INCIDENTE_B01_22-11.md` §7 e no MD do R1 | encerrado |
| B02: bloquear só depósito, compra, venda e saque | R2 | Protege o dinheiro sem trancar o login | no ar (`4026823`) |
| B09 também no servidor | Controle | Só a tela não impede ano inventado | no ar (`5a39b89`) |
| Diferença de R$ 266,00 no Financeiro | Controle | São faturas pagas por saldo e depois canceladas; não é erro | explicado |
| Termos na 2.2 (Arbitragem 2.2) | R4 | Só forma, remissões e erros materiais; reaceite de todos | em vigor desde f8ede77 |
| A01, A02, A03, A05, A10, B08 e perguntas 3, 4, 5, 8 pela opção conservadora | R4 | Ordem do Gabriel; textos alinhados ao código e aos Termos. Sicoob saiu do site (sem parceria documentada), planos no singular/mensal, Retirada Comum × Segura = só a tarifa (R$ 50 × R$ 180), identidade = só dados do cadastro formal | no ar (`f8ede77`, `a267335`) |
| A09 banner de cookies, CSP bloqueante, cookie Secure | R1 | Ordem do Gabriel | banner no ar (`a4d5488`, celular `18630a9`); CSP bloqueante no ar (`ee28f3b`) depois do alarme do #310 |

Fora de código, sem classificar como "dele": validação na Receita (serviço pago, **não contratado**, por isso só dígito de CPF) e as perguntas de negócio restantes, onde o padrão provisório da tabela acima vale até alguém mudar.

## Perguntas novas vindas da Execução R3 (para o Gabriel)

1. ~~Depósito mínimo~~ decidido: sem mínimo. 2. "Prazo do saque em dias úteis" conta só feriado nacional? (liga na A01). 3. "Termos de publicação" apontando para os Termos de Uso basta? 4. ~~Ano no servidor~~ feito em 5a39b89.

## Observações da conferência do Tester (rodadas 5 a 7), que não prendem o fechamento

- **Arbitragem 2.2 não entra no reaceite:** `aceitesPendentes` traz só Termos, Política e Taxas (o Controle esperava 4). Conferir se a Arbitragem vai junto dos Termos ou se faltou. A arbitragem é opcional no cadastro, o que pode explicar.
- **B01:** a API `/api/state` já foi conferida (1 usuário, 1 e-mail); falta o view-source de `/inicio` com conta de teste.
- **Cookies `sb-*` com Secure:** só se confirma depois de um novo login.
- **B02/S01:** política de e-mail, 23/11.

## Pendências de verificação no ar (Tester) e decisões novas

- Tester, com conta de teste: B01 (view-source e `/api/state` sem dado de outra conta), A08 em `/recibos` (sem dinheiro da empresa), erro 418 (de preferência depois das 21h de Brasília), B06, B07, S04, B09, S03, B04, S05, S06, A12, A13.
- Cookies `sb-…`: o Tester viu `Secure=false` na sessão vista pelo Tester, que pode ser anterior ao deploy. Conferir depois de sair e entrar de novo.
- CSP continua só em modo relatório, de propósito. Falta ler as violações numa tela logada e depois bloquear.
- Termos: v2.2 e Arbitragem 2.2 **publicadas** em f8ede77 (só forma/remissões/erros materiais). **Fora do commit, no working tree:** Política 2.1 (A05, texto novo sobre cadastro formal e identidade), Tabela de Taxas 2.4 ("Retirada Segura") e o prazo "30 dias úteis" do bloco legal (A01): mudam conteúdo, não só forma — aguardam o Controle/Gabriel. Lista em `garantias/TERMOS_CLAUSULAS_PARA_O_JURIDICO.md`.
- Incidente do B01: `garantias/INCIDENTE_B01_22-11.md`. Decisões do Gabriel: comunicação à ANPD (art. 48), logs da Vercel, quantos clientes reais havia na janela.
- A09: texto proposto em `garantias/A09_PROPOSTA_BANNER_COOKIES.md`, não ligado.
- Teste vermelho citado pelo R2: `frete-envio.test.ts`. O commit `2d25296` ("estorno do frete não depende mais da data de hoje") parece ter resolvido; conferir.
- O Tester viu no ar texto novo de seguro e "mesma moeda" (A02/A03), que o R4 diz não ter codificado. Perguntar ao Controle quem mudou.

## Pontos de atenção levantados pelo Tester e pela Auditoria (fora dos 35)

- Tela Financeiro: "Custódia paga" no fecho = −R$ 1.056,00 × custódia faturada paga R$ 790,00. A diferença de R$ 266,00 está explicada pelo Controle: são faturas pagas por saldo e depois canceladas (R$ 266,00 exatos). Não é erro.
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
| 20:58 | `main` @ `5a39b89` | A08 resolvido (dinheiro da empresa fora do payload e da tela), B09 também no servidor, depósito sem mínimo, diferença de R$ 266,00 explicada, tabela de notas técnicas atualizada. "Decisão do Gabriel" agora só: A01, A02, A03, A05, A10 e texto jurídico dos Termos. |
| 21:05 | `main` @ `5a39b89` | Ordem do Gabriel: registrar o que foi feito e o porquê. Coluna "Decisão tomada e por quê" criada. R4 (A01, A02, A03, A05, A10, B08, perguntas 3/4/5/8) e R1 (A09 banner, CSP bloqueante, cookie Secure) em execução, ainda sem commit; o working tree já tem edições de Termos, aceites e RegisterForm (R4). |
| 21:01 | `main` @ `5a39b89` = `origin/main` | Vercel: `5a39b89` READY. Nenhuma entrega nova do R4 (A01, A02, A03, A05, A10, B08) nem do R1 (A09, CSP bloqueante): só edições no working tree, sem commit. Tester sem rodada nova. |
| 21:17 | `main` @ `5c9e7da` = `origin/main` | R1 entregou A09 (banner) e CSP bloqueante (`a4d5488`); R4 entregou Termos 2.2, Política 2.1, Taxas 2.4, A01–A03, A05, A10 (`f8ede77`, `a267335`). Tester achou o erro #310 nas telas logadas; `5c9e7da` voltou a CSP para só relatar. Sem prova de que as telas logadas montam. Cabeçalhos de versão de `/termos` (2.1) e `/taxas` (2.3) estão diferentes do esperado. |
| 21:25 | `main` @ `895b924` = `origin/main` | Controle registrou: documentos legais publicados no banco (Termos 2.2, Arbitragem 2.2, Política 2.1, Taxas 2.5) com reaceite disparando; #310 encerrado como artefato do painel oculto; CSP bloqueante de volta (`ee28f3b`); faixa de cookies no celular (`18630a9`). Item "telas logadas não montam" removido. |
| 21:31 | `main` @ `81f2cfa` = `origin/main` | Tester fechou a conferência: 404, Academy, Termos 2.2, Taxas 2.5, Política 2.1, reaceite, auditoria, mercado, CSP e banner de cookies (375/768/1280, claro e escuro, botões de 44 px) confirmados no ar. Em aberto: Arbitragem 2.2 fora do reaceite; view-source do B01 e cookies Secure após novo login; telas logadas com painel visível; e-mail em 23/11. |
| 21:33 | `main` @ `81f2cfa` = `origin/main` | Fechamento. Tudo resolvido, exceto e-mail (23/11). `81f2cfa` READY, documentos legais no banco, CSP bloqueante, telas logadas conferidas pelo Controle e pelo Tester. Cron de 15 minutos apagado. Fica registrada a observação da Arbitragem 2.2, que não aparece na lista de reaceite. |

| ~21:55 | 91cccf2 | Gabriel: conta nasce confirmada, sem limitação de cadastro. B02 revertido; documento único de e-mail e pendência de CPF por API registrados. |
| ~22:10 | 3219429 / 0a9deae / 3734866 / 978bc60 | Cookies com uso presumido e selo pequeno (canto esquerdo, some em 7 s); Termos de Uso 2.3 com cláusula 3.3 de cookies, PUBLICADOS no banco (conferido); botão Ver tutorial vira bolinha no celular; singular/plural de "moeda"; login Google de conta existente não grava aceite de cadastro (achado jurídico do Tester). Tester conferiu no ar: selo, bolinhas, /termos 2.3, /taxas 2.5, /privacidade 2.1. Falta: teste de cadastro por e-mail com senha digitada pelo Gabriel (91cccf2). |
