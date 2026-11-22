# QA Davi 22-11 | R3 Dinheiro e formulários | Execução — 22/11/2026

## RETOMADA
Sem commit/push/build local (Método v2.2). Tudo abaixo está **só no working tree**; o chat Merge/Deploy commita.
Feito: B06, B07, S04, B09, S03, S02, A06. Typecheck limpo; vitest dos testes novos verde (22 testes).
Pendente/fora do meu tema: `saque.test.ts` falha por `normalizarNome is not defined` em `src/server/actions/account.ts` (edição em andamento do R2, não minha) — reconferir quando R2 fechar.
Perguntas ao Gabriel: ver o fim.

## Verificação prévia (código de hoje) e o que fiz
| Item | Ainda existia? | O que mudou |
|---|---|---|
| B06 | Sim (`calcularDataLimiteSaque` somava dias corridos; tela e servidor usavam) | Novo `src/domain/dias-uteis.ts` (feriados nacionais fixos + Carnaval, Sexta Santa, Corpus Christi pela Páscoa; dia de Brasília). `dates.ts` agora usa `somarDiasUteis` → tela e `solicitarSaque` (previsaoPagamentoEm) ficam iguais. Teste: pedido sex 20/11/2026 → qua 25/11. |
| B07 | Sim | `src/domain/validacao-dinheiro.ts` (`validarDeposito`, `somenteNumerico`, `DEPOSITO_MINIMO_CENTS = 0` desligado). `ModalDeposito`: um só aviso (classe de erro, `role=alert`), saldo "—" com valor inválido, campo só dígitos/`,`/`.` (sem letras nem menos). Mesmo filtro no campo do Sacar. |
| S04 | Sim | `motivoOfertaDeCompraInvalida`; `/compras`: botão desabilitado + motivo (qtd ≤0/não inteira, preço ≤0, sem saldo na modalidade "Com saldo" usando `custoDeCompraPorMoeda`×qtd). Campos filtrados. Pré-pago não olha saldo. |
| B09 | Sim (lista 2016–1980) | `/envios`: select de Ano travado no `anoPadrao` do tipo. Servidor (`createProtocol`) não valida ano — fora do pedido, ver observação. |
| S03 | Em parte: "CEP não encontrado" existia mas deixava endereço/estimativa velhos e sem destaque; Continuar sem motivo | Erro em destaque (`role=alert`), limpa endereço/cotação, trata exceção; "Para continuar, falta: a foto do item" acima do Continuar. CEP não é exigido para continuar (não era no código). |
| S02 | Sim | `/vender`: removido o 2º seletor (coluna "Escolha as moedas"); "termos de publicação" vira link para `/termos` (nova aba). Não existe documento próprio "termos de publicação": aponta para os Termos de Uso. |
| A06 | Sim | Sacar: removida "Você recebe um e-mail quando o saque for pago"; texto agora diz que o aviso por e-mail ainda não está ativo. Notificações já dizia isso (texto fixo, sem flag) — **quando o envio ligar, reverter a frase**. |

Arquivos: `src/domain/dias-uteis.ts(+.test)`, `src/domain/validacao-dinheiro.ts(+.test)`, `src/domain/dates.ts`, `src/components/account/AccountModals.tsx`, `src/app/(app)/compras/page.tsx`, `src/app/(app)/envios/page.tsx`, `src/app/(app)/vender/page.tsx`.

## Ajuste pedido pelo Controle (Polimento) — A06
Sacar: frase trocada por "Acompanhe o andamento no Extrato." (sem menção a e-mail) enquanto o envio estiver desligado; quando ligar, reavaliar. Não verifiquei se o saque aparece no Extrato com esse nome — o Tester confere.

## frete-envio.test.ts vermelho (pedido do Controle)
Causa: **teste dependente da data, código certo.** Os 4 testes montavam o envio vencido com `createdAt = Date.now() - 3 dias`. A devolução automática do 1º mês só vale para envio criado a partir do corte D-H5 (`1794967250154` ≈ 18/11/2026, `domain/envios.ts`, frente H de 17/11). Enquanto "hoje − 3 dias" era antes do corte, só o frete voltava (teste verde); a partir de 22/11 virou envio "novo" e o mês também volta (saldo 10000, não 9600). Não é o acréscimo de R$ 4,00 nem mudança de regra de cobrança.
Correção só no teste: os 4 passam a usar envio criado 1 ms antes do corte (regra do envio antigo, determinística) e acrescentei um teste do envio novo (frete + 1º mês voltam). 34/34 verdes, typecheck limpo. Nenhuma regra de cobrança alterada.

## Perguntas ao Gabriel (nada decidido por mim)
1. **Depósito mínimo**: qual valor? (`DEPOSITO_MINIMO_CENTS` em `validacao-dinheiro.ts`, hoje 0 = desligado; cada Pix tem custo do intermediador.)
2. **Prazo do saque em dias úteis**: confirmar que "D+3 úteis" conta só feriado **nacional** (sem estadual/municipal). Ligado à A01 (retirada: úteis × corridos).
3. **"Termos de publicação"**: apontar para os Termos de Uso basta, ou quer um texto próprio?
4. Servidor aceita qualquer ano em `createProtocol`: travar também no servidor?

## Aceite pendente
Tester confere telas (sem ação real): Sacar (previsão), Depositar (100000,01 / letras / -1), Compras (saldo 0), Envios (Ano travado, CEP 00000000, Continuar), Vender (um seletor, link).
