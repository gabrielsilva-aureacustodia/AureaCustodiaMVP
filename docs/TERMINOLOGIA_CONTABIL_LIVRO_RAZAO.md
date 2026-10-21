# Terminologia contábil do livro-razão — o que a norma brasileira pede (21/10/2026)

Pedido do Gabriel: descobrir o nome certo, na contabilidade e na lei brasileira, para o lançamento que o livro-razão
chamava de **"Variação de saldo não explicada por negociação, depósito ou abertura"**, para a organização do
contábil oficial. Este arquivo registra o que a pesquisa achou, o que foi mudado no código e o que continua em aberto.

> **Aviso honesto:** pesquisei fontes públicas (texto da ITG 2000 (R1) em sites de legislação contábil e material
> didático). **Não li o texto oficial no site do CFC** e não sou o contador da empresa. A terminologia abaixo deve ser
> confirmada pelo contador antes de virar padrão definitivo.

## 1. O que a norma diz

A norma que organiza a escrituração contábil no Brasil para entidades de qualquer porte é a **ITG 2000 (R1) —
Escrituração Contábil** (Interpretação Técnica Geral do CFC). Os itens que importam aqui:

| Item | O que diz | O que significa para o nosso livro-razão |
|---|---|---|
| **6** | Todo lançamento tem: data do fato; conta devedora; conta credora; **histórico que represente a essência econômica da transação**; valor; e identificação única do lançamento | "Variação não explicada" **não representa essência econômica nenhuma** — é a falta dela |
| **7** | Número de identificação em ordem sequencial, ligado ao documento de origem | Já temos o número (`id`) e a referência interna; falta o documento nos ajustes |
| **8** | "A terminologia utilizada no registro contábil deve expressar a essência econômica da transação" | O texto genérico viola isto diretamente |
| **31** | Erro se corrige por **retificação**, de três formas: **estorno**, **transferência** e **complementação** | Não existe "ajuste sem explicação" como natureza de lançamento |
| **32** | O histórico da retificação deve precisar **o motivo, a data e a localização do lançamento de origem** | O histórico do ajuste tem de citar o motivo e o nº do lançamento original |
| **33** | **Estorno** = lançamento inverso ao feito erroneamente, anulando-o totalmente | É o que o #310 faz em relação ao #308 |
| **34** | **Transferência** = regulariza conta indevidamente debitada/creditada | Sem equivalente hoje (não há plano de contas por lançamento) |
| **35** | **Complementação** = aumenta ou reduz o valor registrado antes | Cobrança a maior/menor que se completa |
| **36** | **Lançamento extemporâneo** (fora da época devida): o histórico deve trazer **a data efetiva da ocorrência e a razão do registro extemporâneo** | É exatamente a cobrança retroativa de custódia |

Observação de vocabulário: no meio contábil, "lançamento de **ajuste**" costuma significar o ajuste de **fim de
período** (apropriação por competência, provisões) — **não** correção de erro. Correção de erro é **retificação**
(ITG 2000) e, quando afeta demonstrações de períodos anteriores, **retificação de erro de período anterior**
(NBC TG 23). Por isso o rótulo "Ajuste" para esses lançamentos é impreciso.

## 2. Como cada movimentação do caso do Gerais se chama

| # | O que foi | Nome correto |
|---|---|---|
| 308 | Débito de R$ 2,00 direto no saldo, por decisão da equipe, cobrando a custódia da RO-000011 que não foi cobrada na compra por instabilidade do sistema | **Lançamento extemporâneo** de cobrança de custódia (item 36), feito por débito direto em conta do cliente |
| 309 | Fatura de custódia paga (custódia da compra, R$ 2,00) | Registro da **receita de serviço de custódia** (já é o nome certo) |
| 310 | Crédito de R$ 2,00 que desfaz o #308 para não cobrar duas vezes | **Estorno** do lançamento nº 308 (item 33) |

Resultado líquido: uma única cobrança de R$ 2,00, reconhecida como receita de custódia; saldo do cliente R$ 91,50.

## 3. O que foi mudado no código

1. **Texto automático do sistema** (`ajuste` gerado quando o saldo muda sem fato gerador): deixou de ser "Variação de
   saldo não explicada por negociação, depósito ou abertura" e passou a **"Diferença de saldo a regularizar, sem
   negociação, depósito ou abertura que a justifique — pendente de retificação (ITG 2000)"**. A diferença não é só de
   palavras: ela diz que o item está **pendente de retificação**, que é o que a norma manda fazer com ele.
2. **Ajuste manual pela equipe** (`/admin/usuarios/...` → ajustar saldo): o **motivo que a pessoa digita agora vai
   para o histórico do próprio lançamento** ("Ajuste manual de saldo autorizado pela equipe — <motivo>"), em vez de
   ficar só na trilha. Vale daqui para a frente.
3. **Aviso da DRE:** a pendência passou a dizer "a regularizar: precisam de histórico e retificação por estorno,
   transferência ou complementação (ITG 2000)", e **não conta como pendência** o ajuste que já tem motivo registrado.
4. **Rótulo na ficha do cliente:** "Ajuste" → **"Ajuste / retificação"**.
5. **Lançamentos que já existem** (#308 e #310): o livro-razão é encadeado por hash e **não se reescreve** — a própria
   regra da casa é "corrige-se com lançamento inverso, nunca editando". Em vez de editar, a equipe **anota** na
   trilha o histórico correto (ação `admin.financeiro.explicar_lancamento`), e a ficha passa a mostrar esse texto no
   lugar do genérico, **com o texto original do livro-razão logo abaixo**. O relatório de exportação do livro-razão
   ganhou a coluna `Motivo_Trilha` (última, para não deslocar as colunas que as planilhas já leem).

Textos anotados para o Gerais (seguem os itens 32, 33 e 36):

- **#308:** *"Cobrança retroativa de custódia não cobrada por instabilidade sistêmica — lançamento extemporâneo (ITG
  2000, item 36): custódia do 1º mês da moeda RO-000011, comprada em 21/10/2026, debitada diretamente do saldo do
  cliente e regularizada pela fatura de custódia do lançamento nº 309."*
- **#310:** *"Estorno do lançamento nº 308 (ITG 2000, item 33): a cobrança retroativa de custódia foi regularizada pela
  fatura de custódia (lançamento nº 309), sem novo débito ao cliente. O saldo permanece R$ 91,50."*

## 4. O que continua em aberto (para decidir com o contador)

1. **Reescrever o texto gravado no livro-razão é possível, mas tem custo:** a descrição entra no hash, então mudar o
   #308 e o #310 exige **recalcular o hash de todos os lançamentos dali em diante** e atualizar tabela, exportações
   e qualquer cópia externa (planilhas do Google). É a mesma cirurgia feita em 05/10 nas análises. Só faz sentido com
   cópia de segurança e verificação da cadeia antes e depois — e quebra a garantia de "livro que ninguém reescreve".
   **Não fiz**; a anotação resolve a leitura sem isso. Se vocês quiserem mesmo assim, é uma decisão separada.
2. **Nosso livro-razão não tem "conta devedora" e "conta credora" por lançamento** (item 6 b e c). Ele é um **razão
   auxiliar dos saldos dos clientes** (uma perna por movimentação, com saldo após), e o contábil oficial (Diário e
   Razão geral, partidas dobradas) é montado a partir das exportações. Se o contador quiser o lançamento já em
   partidas dobradas, é um trabalho maior (plano de contas por tipo de lançamento) — não foi feito.
3. **Nome do tipo no banco:** o tipo interno continua `ajuste` (mudar exige migration e mexe no hash). A tela e a
   DRE já dizem "ajuste / retificação". Um dia vale separar em `retificacao` (estorno, complementação) e
   `regularizacao`.
4. **Ajustes antigos sem motivo na trilha** continuam aparecendo como pendência da DRE, o que é o comportamento
   certo: são diferenças a regularizar até alguém anotar o motivo.

## 5. Fontes consultadas

- ITG 2000 (R1) — Escrituração Contábil (texto): [normaslegais.com.br](https://www.normaslegais.com.br/legislacao/itg-2000-r1-escrituracao-contabil.htm)
- Resumo didático da ITG 2000 (estorno, transferência, complementação): [Estratégia Concursos](https://www.estrategiaconcursos.com.br/blog/itg-2000-tj-sp/)
- Lançamentos extemporâneos no SPED ECD (registro I200): [Alterdata](https://ajuda.alterdata.com.br/bdcc/sped-ecd-tudo-o-que-voce-precisa-saber-sobre-lancamentos-extemporaneos-95068789.html)
- NBC TG 23 (R2) — Políticas Contábeis, Mudança de Estimativa e Retificação de Erro: [okai.com.br](https://okai.com.br/documento/2017-12-22/nbc-tg-23-r2-politicas-contabeis-mudanca-de-estimativa-e-retificacao-de-erro)
