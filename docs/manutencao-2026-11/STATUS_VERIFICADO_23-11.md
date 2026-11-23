# Status verificado, item a item (23/11/2026, tarde)

Pedido do Gabriel: conferir CADA item do `RELATORIO_FEATURES.pdf` (gerado 23/11 04:xx) contra a realidade, e resolver o que faltasse.
O que vale aqui é o que foi **medido hoje**, não o que o relatório diz. Fontes: Vercel (MCP), banco de produção em leitura (`BEGIN READ ONLY`), código no `main`, site público.

## 1. O que foi medido

| Conferência | Resultado |
|---|---|
| Deploy de produção | `66ce916` (HEAD do `main`, 23/11 10:51), estado READY; `main` = `origin/main`; 8 deploys de produção de 22/11 a 23/11, todos READY |
| Site público | `/cadastrar` tem "Continuar com o Google" e "Prefiro usar e-mail e senha"; `/entrar` tem "Receber link de acesso por e-mail"; CSP em modo bloqueante; sem cache de CDN |
| Variáveis da isenção na Vercel | `NEXT_PUBLIC_AUREA_CONTA_PROPRIA_EMAIL` (rogeriosiqueira@pbh.gov.br) e `NEXT_PUBLIC_AUREA_CONTA_CEO_EMAIL` (siqueiraroger1@gmail.com) existem em production, preview e development |
| `RESEND_API_KEY` na Vercel | **não existe** (as demais variáveis de e-mail existem). Nenhum e-mail do sistema sai sem ela |
| Typecheck (`tsc --noEmit`) | sem erro |
| Testes de `src/domain` | 74 arquivos, 902 testes, todos verdes |
| Testes de `src/server` (usam Postgres embutido) | **não rodaram aqui**: a máquina tinha 0,7 GB livres de 15,7 GB (65 processos do Claude ocupam 10 GB) e os workers morreram. Não é falha de código; precisa rodar de novo com a máquina livre |
| Livro-razão × saldo | 177 contas, saldo total R$ 893,50; para TODAS, saldo = soma dos lançamentos (0 divergências) e o último `saldo_apos` = saldo |
| Cadeia de hashes do livro-razão | **não reverificada por mim** (a tentativa de rodar o verificador do app fora do Next falhou); a sessão de 22/11 registrou "confere" |
| Cadeia de hashes das análises | confere (257), registrado em 22/11 e repetido pelo dry-run de hoje |

## 2. Os 18 itens do relatório

Legenda: **PROVADO** = medido hoje no banco, na Vercel ou no site; **CÓDIGO** = existe no `main` publicado e tem teste, mas a tela logada não foi vista por mim; **PENDENTE** = depende de outra pessoa ou de decisão.

| # | Item | Estado | Evidência / o que falta |
|---|---|---|---|
| A | Saldo dos clientes no Financeiro | CÓDIGO + PROVADO (dado) | `Financeiro.tsx`, `domain/admin/financeiro.ts`; cartões revistos em `afef75f` (23/11). Dado: saldo total R$ 893,50, fecha com o livro. Falta olhar a tela logada |
| B | Contas da ficha fecham | CÓDIGO + PROVADO (dado) | `statement.ts` soma custódia nas taxas; saldo = livro em todas as contas |
| C | Botão "Ver tutorial" no celular | CÓDIGO | commit `0a9deae`; só se vê logado, no celular |
| 1 | Senha para ações sensíveis | CÓDIGO | `server/actions/account.ts` e outros com teste; cookie PKCE do Supabase continua sem `secure`/`httpOnly` (padrão da biblioteca, anotado) |
| 2 | 1º mês no envio e na compra | CÓDIGO | testes de domínio verdes |
| 3 | E-mails de compra e movimentação | **PENDENTE** | fila e registro prontos, mas **sem `RESEND_API_KEY` nada é enviado** (o relatório dizia "sistema pronto", e é só isso). Tarefa de 23/11 em `02_planos_de_execucao/TAREFA_GRANDE_PENDENTE__TUDO_DE_EMAIL_23-11.md` |
| 4 | Cadastro com Google primeiro | PROVADO | texto no site público |
| 5 | Fornecedores | só roteiro | `OPERACIONAL_FORNECEDORES.md`; não é código |
| 6 | Vídeos das moedas | PROVADO + 1 achado | 154 de 253 moedas aprovadas têm vídeo. As 99 sem vídeo são 98 de "cadastro sem envio" ou "cadastro direto" (entrada sem filmagem, por desenho) e **1 de envio postal: RO-ENV-0019 (SEDEX), sem vídeo**. 2 vídeos sem dono no Storage (RO-ENV-0006, RO-ENV-0154) seguem listados, não apagados |
| 7 | KPIs do conselho | CÓDIGO | `/admin/resultados/kpis`; decisões D2 e J1–J5 abertas com o Gabriel |
| 8 | Demonstração do cadastro | PROVADO (passos) | bloco "Veja como se cadastrar" existe; o **vídeo** não foi gravado nem ligado |
| 9 | Notas fiscais para o cliente | CÓDIGO | tela Notas e botão "Ver nota"; 54 notas autorizadas no banco |
| 10 | Nota nº 41 do Rogério | PROVADO | 2 notas canceladas no banco |
| 10b | App no iPhone | **PENDENTE** | só o Gabriel testa no aparelho (roteiro de 10 linhas) |
| 11 | Frete + R$ 4,00 | CÓDIGO | editável em Configuração; **texto da tela sem aprovação do Gabriel e classificação fiscal sem resposta do contador (pergunta nº 21)** |
| 12 | Nº da moeda no recibo | CÓDIGO | `numero-da-moeda.ts` com teste, inclusive no PDF |
| 13 | Cancelar validação na bancada | CÓDIGO | `bancada.ts` com teste |
| 14 | Cancelar envio não postado | CÓDIGO | devolução do frete e do 1º mês com teste; sem tela de cancelar nota para a equipe (decisão D-H5 aberta) |
| 15 | Extrato = saldo | PROVADO (dado) | saldo = livro em 177 de 177 contas |

## 3. O que FALTAVA e foi corrigido hoje em produção (todos com backup em arquivo)

1. **Fatura de custódia pendente do CEO** `FAT-2026-11-siqueiraro-D21-1795248793877` (95 moedas, R$ 190,00, vencimento 21/12): foi emitida pelo cron em 21/11, antes da regra "o CEO não paga custódia", e continuava aparecendo para ele pagar. Passou a `cancelada`. Nenhuma nota fiscal existia (fatura em aberto não gera). O cron de hoje não emite mais para as duas contas isentas (`ehIsentoDeCustodia` em `cobranca-de-entrada.ts`).
2. **Pesos iniciais dos 3 envios "ambíguos"** que o relatório de 22/11 deixou: RO-ENV-0003 (900 mg → 7000), RO-ENV-0048 (9 mg → 7000) e RO-ENV-0014 (789 mg → 7890). Não eram ambíguos: as análises desses envios têm 7000 mg (99 moedas e 26 moedas) e 7890 mg (1 moeda). Agora nenhum envio tem peso inicial abaixo de 1 g. `peso_inicial_mg` não entra no hash.
3. **5 notas fiscais presas** (ids 54, 56, 61, 62 e 64; R$ 2,00 + R$ 10,00 + R$ 2,00 + R$ 2,00 + R$ 8,00 = R$ 24,00 de serviço): rejeitadas por "cliente sem cadastro completo", depois de gastar as 5 tentativas automáticas, mas os clientes JÁ completaram o cadastro (CPF e nome). `tentativas` voltou a 0; a rodada diária (cron 08:00 UTC) as reenvia sozinha. Conferir amanhã se saíram autorizadas.

## 4. O que continua aberto e NÃO dá para resolver sem outra pessoa

- **8 notas fiscais rejeitadas** (ids 50, 51, 57, 59, 60, 65, 69, 70; clientes sem CPF/nome no cadastro; um deles com o e-mail digitado errado (`gamil.com`)): precisam que o cliente complete o cadastro. É decisão do Gabriel como cobrar isso e se a equipe preenche. Competência de novembro: o prazo é o fim do mês.
- **Posições das 18 moedas nas caixas** (EB-002: RO-000191…203; EB003: RO-000209…213): o Gabriel respondeu "Opção A" em 22/11 (o lugar físico vale) e o reverso foi aplicado. Elas ficam fora da ordem do código **de propósito**: a vaga livre mais baixa é reutilizada (RO-000202 e 203 ocuparam as posições 83 e 84, que estavam vagas, enquanto 191–201 foram para 85–95). Para a posição seguir o código, é preciso mover as moedas físicas; se o Gabriel quiser isso, é só dizer.
- **E-mails**: `RESEND_API_KEY` (valor só existe na tela do Resend), DNS e testes. Tarefa de hoje.
- **Teste no iPhone/Android**, **texto do frete**, **pergunta nº 21 ao contador**, **vídeo "Veja como se cadastrar"**, **plano do Supabase para vídeos**, **CPF por API**, **LTV (12 meses)**.
- **Custódia que o CEO já pagou** antes da regra de isenção (por exemplo R$ 2,00 em 22/11, 05:13): não foi devolvida. Devolver é decisão de cobrança do Gabriel (existe `estornarFaturaPaga`).
- **Conferência visual logada** (Financeiro do admin, isenção Áurea/CEO nas telas, botão de vídeo na ficha, tutorial no celular): nenhuma sessão viu essas telas logadas. Precisa de uma sessão de navegador logada pelo Gabriel.

## 5. Por que o relatório de 23/11 passou a impressão de "tudo feito"

O PDF junta numa frase "NO AR" o que está no código e o que o dono VIU funcionando. Só o primeiro foi medido. Itens 3, 8, 10b e 11 estão no ar como código mas não entregam ainda o resultado que a frase promete (e-mail não sai, vídeo não existe, iPhone não testado, texto do frete sem aprovação). A regra daqui para frente: relatório separa "publicado" de "conferido na tela por quem pediu".
