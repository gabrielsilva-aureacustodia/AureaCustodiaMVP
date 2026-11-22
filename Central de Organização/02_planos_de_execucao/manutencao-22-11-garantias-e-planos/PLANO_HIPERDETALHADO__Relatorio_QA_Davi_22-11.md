# Plano hiperdetalhado | Relatório de QA do Davi Bego (22/11/2026)

```
Dono: Controle · Garantia: GARANTIA_DE_EXECUCAO__Relatorio_QA_Davi_22-11.md (mesma pasta) · Texto do relatório: ../relatorio-qa-davi/RELATORIO_QA_DAVI_BEGO_texto.md
Cruzado com: 02_planos_de_execucao (00_MD_EXECUTIVO; frentes A reautenticação, C e-mails, D login/cadastro, F extrato, G notas, K frete) e o QUADRO_ITENS_DOCX_22-11.md.
Regra de verificação: o relatório é de 19–20/11 (produção de então). ANTES de editar, cada Execução confere se o item AINDA existe no código de hoje (frentes A–L e T1–T6 de 22/11 podem ter resolvido parte: ex.: S01 "esqueci minha senha", A06 e-mails, A12).
```

## R1 · Segurança e dados (prioridade máxima — B01 primeiro, antes de tudo)
**Ler:** `src/app/(app)/layout.tsx`, `src/components/providers/AppProvider.tsx`, `src/server/state.ts`, `src/domain/types.ts` (AppState), `src/server/session.ts`, `src/middleware.ts`, `next.config.*`, `src/app/(app)/recibos/auditoria/page.tsx`, `src/server/auth/*`, `src/components/providers/*`, docs/diario/LEIA_PRIMEIRO_AGENTE.md.
1. **B01** — hoje o layout serializa o `AppState` inteiro no HTML (users, sellOffers, buyOrders, trades, envios, deposits, saques, faturas, planos, reservas). Corrigir: o servidor monta uma **visão do usuário logado** (`estadoDoUsuario(state, email)`): só a conta dele, as listas dele, e o que for público do mercado já **agregado no servidor** (totais, livro de ofertas sem identificar terceiros). Nada de `users` de outros, nem CPF/Pix/banco/endereço de terceiros. Telas que leem `state.users`, `state.trades` etc. de todos devem passar a receber o agregado. Mapear TODA leitura de `state.*` em `src/components` e `src/app/(app)`. Testes: o payload serializado de um usuário não contém e-mail/CPF/Pix de outro (teste com 2 contas); snapshot dos campos. **Superfície protegida tocada** (types/state) — listar no MD; autorizado pelo Gabriel ao mandar resolver o relatório.
2. Depois do deploy de B01: **Relatório de incidente** (docs/ + Garantia): o que ficou exposto, desde quando (git log do layout), e levar ao Gabriel a decisão de comunicação ANPD/titulares (LGPD art. 48) — **decisão jurídica, nada comunicado pelo agente**. Verificar nos logs da Vercel se houve acesso suspeito (leitura, sem alterar).
3. **A08** — auditoria pública: deixar só o estoque; saldo/receita/taxas da empresa só para a equipe (decisão confirmada pelo relatório; Gabriel decide se mantém — registrar pergunta, **não ocultar financeiro sem aval se for intencional**: tratar como pergunta, mas B01 já impede vazamento de dados de terceiros).
4. **Cabeçalhos:** CSP (começar em modo `Content-Security-Policy-Report-Only` para não quebrar Mercado Pago/Meta/Supabase), cookies `sb-…-auth-token` com Secure (se vierem do Supabase SSR, configurar `secure: true` na criação). Erro React 418 (hidratação) em Mercado/Compras/Recibos: achar a causa (data/hora local no SSR) e corrigir.
5. **A09** cookies/_fbp: só registrar a decisão (banner de cookies + citar Meta na Política) — **decisão do Gabriel**; Execução prepara o texto proposto, não liga.
**Aceite:** view-source de página logada sem dados de terceiros (teste automatizado + conferência do Tester no ar com 2 contas **de teste do repositório**, nunca contas reais).

## R2 · Cadastro e conta
**Ler:** `src/components/login/*`, `src/app/cadastrar`, `src/app/entrar`, `src/server/actions/auth.ts`, `account.ts`, `src/domain/cadastro.ts`, `cpf.ts`, `src/components/account/*`, `src/domain/admin/usuarios.ts`, `docs/pwa/DIAGNOSTICO_PWA.md` (contrato com D).
1. **B02** — cadastro por e-mail nasce "verificado" sem clique. Usar a confirmação do Supabase Auth (link por e-mail). **Dependência:** e-mail transacional hoje desligado (RESEND_API_KEY pendente; o Supabase tem o próprio envio de confirmação — verificar se está ligado no projeto). Implementar o estado "e-mail não confirmado": conta criada, selo "Verificado" só depois do clique, e bloqueio de depósito/compra/saque até confirmar (política **a confirmar com o Gabriel**: padrão aplicado = bloquear depósito, compra e saque). Sem deixar conta travada para os sócios existentes (contas atuais ficam verificadas por migração/regra). Depois do clique: entrar direto no Início logado.
2. **S01** — "Esqueci minha senha" na tela de entrar (confirmar se já existe no código atual; T6 relata que o aviso do Google no app a menciona).
3. **B03 + A16** — validação no navegador **e no servidor**: data de nascimento (não futura, 18+), Pix por tipo (e-mail com @ e domínio, CPF com dígito, telefone com DDD, aleatória no formato), telefone com DDD válido (não repetido), nome (as 7 regras do relatório; "Nome de exibição" no Dados pessoais), campos obrigatórios marcados. **Não** integrar Datavalid/Consulta CPF (serviço pago, decisão do Gabriel).
4. **A04** — aceite de termos registrado no cadastro (documento, versão, data, canal) e mostrado em Segurança; investigar se grava e a tela não lê, ou não grava.
5. **A11** texto do login; botão "Mostrar senha" no cadastro; **A05** só levantar (decisão).
**Aceite:** testes de domínio para cada validação, e o fluxo de confirmação testado com o Supabase **sem criar contas reais em produção** (dev/mocks).

## R3 · Dinheiro e formulários
**Ler:** `src/components/account/*` (Sacar/Depositar), `src/domain/saques.ts`, `src/domain/feriados*` (criar se não existir), `src/server/actions/payments.ts`, `src/components/market/*` (oferta de compra), `src/app/(app)/envios`, `src/components/ship*`, vendas.
1. **B06** previsão do saque em **dias úteis** pulando fim de semana e feriados nacionais (tabela de feriados nacionais fixos e móveis, com teste: sexta 20/11/2026 feriado → 3º dia útil = quarta 25/11).
2. **B07** depósito: um só aviso com cara de erro, saldo não calculado com valor inválido, campo numérico (sem letras/negativo), **mínimo = decisão do Gabriel** (padrão: sem mínimo novo; deixar a constante pronta e a pergunta registrada).
3. **S04** oferta de compra: botão desabilitado sem saldo/valores inválidos, com motivo; quantidade/preço numéricos e positivos. **B09** ano pelo tipo (travado no `anoPadrao`). **S03** CEP não encontrado → aviso; Continuar mostra o que falta. **S02** link dos termos de publicação e um seletor só. **A06** tirar do Sacar a promessa de e-mail enquanto o envio estiver desligado (ou ligar quando a chave existir).
**Aceite:** testes de domínio (feriados, limites) + Tester confere telas sem executar ação real.

## R4 · Texto, legal e usabilidade
**Ler:** `src/components/pwa`, `src/components/tutorial*`, `src/app/not-found.tsx`, `src/app/termos`, `src/app/taxas`, `src/app/academy`, `src/app/suporte`, menu lateral, `src/styles/*`.
1. **B04** tutorial: esconder números/painel quando houver janela aberta. **S05** botões flutuantes sem cobrir conteúdo no celular (espaço no fim da página/ícone recolhido). **S06** Esc e clique fora fecham janelas (sem fechar as que exigem confirmação por perda de dados — manter o modal de senha/segurança como está).
2. **B10** página 404 em português, com menu, status 404 verdadeiro, links (logado × deslogado) e sugestão do relatório; **não** quebrar o redirecionamento do middleware para quem não tem sessão (logs do endereço acessado: só log, sem dado pessoal).
3. Texto: **B05** "até 30", **A11/A13/A14/A15/A17/S07/S08**, **A12** Academy ligada no menu, **A07** nomes que dizem o que o número é ("Menor preço à venda", "Moedas em custódia"), **B08**: numeração/"a))"/erros de texto dos Termos e da Política — alteração de **texto jurídico**: aplicar só formatação e os erros materiais listados (A arbitragem, "uma", restabelecer, Estes Termos) e publicar como **nova versão** dos documentos (versão/aceite versionado já existem); cláusulas citadas por número erradas (14.4, 7.3.3, 13.2) → levantar a lista e o jurídico decide (não inventar cláusula).
4. **A14** um e-mail de contato só: usar o do canal já configurado (conferir `/admin/configuracao`); se houver dúvida, perguntar.
**Aceite:** testes de componente onde houver, Tester em 375/768/1280, claro e escuro.

## Portões e ordem
1. R1 primeiro (B01 no ar antes de qualquer outra coisa); R2, R3, R4 em paralelo desde que sem tocar nos mesmos arquivos; **Execuções não commitam**.
2. Merge, Push, Deploy: `gh auth switch --user gabrielsilva-aureacustodia`, `git add` por caminho, `npm run typecheck` + vitest dos arquivos tocados, **sem build local**, migration → aplicar no commit, push, conferir o deploy READY na Vercel, avisar o Tester.
3. Tester valida no ar (375/768/1280), sem criar conta real nem executar ação financeira; achados vão ao Tema; achado corrigido passa pelo Polimento.
4. Fechamento: cada chat cruza o seu trabalho com a Garantia e o relatório; só então diz "feito"; resposta começa pelo estado do Git.

## Cruzamento final (preencher no fim)
| Item | Feito? | Prova |
|---|---|---|
| B01 | — | — |
| B02, S01, B03, A16, A04, A11 | — | — |
| B06, B07, S04, B09, S03, A06, S02 | — | — |
| B04, B05, B08, B10, S05, S06, S07, S08, A07, A12–A15, A17 | — | — |
| Decisões do Gabriel (A01–A03, A05, A08–A10, mínimo, as 13 perguntas) | levadas a ele | — |
