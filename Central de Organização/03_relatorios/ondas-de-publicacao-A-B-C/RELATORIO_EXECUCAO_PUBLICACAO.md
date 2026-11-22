# Relatório de Execução da Publicação — as três frentes na `main`

**Áurea Custódia · auditoria do merge de 11/09/2026**

```
Base:        f7a5e8c (Fase 0, 10/09/2026)
Resultado:   ab3db39
Trazido:     19 commits · 108 arquivos · +11.881 linhas · 51 arquivos novos
Testes:      197 -> 343
Ordem:       B -> C -> A, como manda a seção 7.2 do plano executivo
```

> **Para o Rogério.** Três equipes trabalharam ao mesmo tempo, cada uma numa cópia separada
> do projeto. Este documento conta o que aconteceu quando as três cópias viraram uma só.
> A notícia boa: tudo entrou e o sistema funciona. A notícia que importa: juntar revelou
> **dois erros que nenhuma das três equipes conseguiria ver sozinha**, e um deles teria
> quebrado o saque de dinheiro sem dar nenhum aviso.

---

# 1. O que entrou

| Frente | Branch | Commits | O que traz |
|---|---|---|---|
| **B** | `feat/cadastro-financeiro` | 5 | Cadastro formal progressivo, compra direta pelo gateway, saque com taxa fixa e prazo D+3, faturamento mensal da custódia com inadimplência e DRE consolidada |
| **C** | `feat/retirada-logistica` | 7 | Máquina de estados da retirada física, telas do cliente, Correios de saída, etiqueta de postagem, carimbo no PDF, extinção imediata do recibo e bloqueio por débito |
| **A** | `feat/juridico-textos-dominio` | 4 | Aceite dos termos por blocos, rota `/academy`, posicionamento institucional na landing, tutorial do domínio com rollback, e a anonimização do extrato pessoal |

As três estavam **verdes isoladamente** antes do merge: B com 276 testes, C com 242, A com
218. A `main` tinha 197.

---

# 2. Os dois erros que só o merge revelou

Esta é a parte do relatório que justifica ter feito o merge com auditoria em vez de
`git merge` três vezes seguidas.

## 2.1 🔴 A restrição do ledger — o erro grave

**O que era.** O livro-razão tem uma regra no banco que lista quais tipos de lançamento são
aceitos: depósito, compra, venda, comissão e assim por diante. Quem precisa de um tipo novo
tem de reescrever essa lista.

As frentes B e C precisaram disso ao mesmo tempo, e nenhuma via a outra:

- **B** escreveu a lista com os tipos dela (`saque`, `taxa_saque`) **e já incluiu o da C**
  (`taxa_retirada`), por antecipação.
- **C** escreveu a lista só com o tipo dela, **sem os dois da B**.

**Por que era invisível.** As duas migrations têm nomes de arquivo diferentes, então o Git
junta as duas sem acusar conflito nenhum. O aplicador roda os arquivos em ordem alfabética,
e `010_retiradas_ledger` vinha depois de `009_saques`. A última a rodar **substitui** a
lista da anterior.

**O que teria acontecido.** O banco passaria a recusar todo lançamento de saque. Sem erro de
compilação, sem teste vermelho, sem nada na tela — até o primeiro cliente real clicar em
"Sacar" e a operação falhar por violação de restrição. A funcionalidade inteira da frente B
morreria em silêncio.

**O que foi feito.** A migration da frente C foi reescrita para declarar a **união completa**
das três frentes e renumerada para ser a última a tocar a restrição. Conferido no banco
depois de aplicada:

```
CHECK (tipo IN ('saldo_inicial','deposito','compra','venda','comissao',
                'custodia','estorno','ajuste','saque','taxa_saque','taxa_retirada'))
```

Os onze tipos estão lá.

**A regra que fica:** quem reescrever uma restrição de lista declara a **lista inteira**,
nunca só o valor que lhe interessa. Está registrado em
`src/server/db/migrations/README.md` e no cabeçalho da própria `012`.

## 2.2 🟠 Duas migrations com o mesmo número

B criou `009_saques` e `010_faturamento_custodia`. C criou `009_retiradas` e
`010_retiradas_ledger`. Mesma causa: cada uma olhou a `main`, viu que a última era a `006`, e
seguiu a partir dali.

Como os nomes completos diferem, o merge junta as quatro em silêncio e o histórico do banco
fica com dois "009". As da frente C viraram **011** e **012**, porque B entrou primeiro. O
motivo está escrito no cabeçalho de cada arquivo, para quem abrir daqui a seis meses não
achar que foi descuido.

---

# 3. O que a auditoria encontrou além dos conflitos

## 3.1 🟠 A custódia tem dois mecanismos vivos ao mesmo tempo

A decisão **D-3** trocou a custódia de faixas anuais (R$ 5 / 15 / 25 / 30 / 60) por
**R$ 2,00 por moeda por mês**. A frente B implementou o modelo novo: tabela
`faturas_custodia`, faturamento mensal, inadimplência.

**O modelo velho não saiu.** O campo `custodyCharges` continua no estado, continua sendo
preenchido pelo seed, e continua sendo o que aparece em três lugares visíveis ao cliente:

| Onde | O que o cliente lê hoje |
|---|---|
| `/conta/extrato` | "Custódia **anual** de 15 moeda(s) — Pago · R$ 25,00" |
| `/envios` | "Taxa de custódia **anual** (nova **faixa**)" |
| Livro-razão do contador | "Custódia **anual** de N moeda(s)" |

Os R$ 25,00 são valor da **tabela de faixas que foi aposentada**. A palavra "faixa" também
descreve o modelo que não existe mais. E a função `custodyFeeForCount`, que a D-3 mandou sair
do código, sobreviveu como apelido apontando para o cálculo mensal — então o rótulo diz
"anual" e a conta por trás é mensal.

**Não corrigi por conta própria**, porque isso é preço dito ao cliente e a escolha é dos
sócios. São duas perguntas, e as duas são de negócio:

1. O `custodyCharges` do seed deve ser apagado e substituído pelas faturas mensais da frente
   B, ou os dois convivem de propósito?
2. Enquanto convivem, o texto deve dizer "mensal" e mostrar o valor mensal?

Enquanto isso não for decidido, **a plataforma informa um preço de custódia que não é o
preço vigente**. É o item mais relevante desta auditoria depois do ledger.

## 3.2 🟠 O "território de arquivos" não se sustentou

O plano prometia que cada frente teria seus arquivos e que por isso o paralelismo
funcionaria. Em `src/domain/types.ts` isso não aconteceu:

- A frente **B**, no primeiro commit dela, escreveu os tipos da **retirada física** — que são
  da frente C.
- A frente **C**, no primeiro commit dela, escreveu os tipos de **aceite legal** — que são da
  frente A, e **idênticos até nos comentários**.
- Quando a frente A finalmente entrou, o lado dela do conflito estava **vazio**: o trabalho
  dela já tinha chegado por outro caminho.

Não deu prejuízo desta vez, porque as definições batiam. Mas foi sorte, não desenho: se duas
frentes tivessem escrito o mesmo tipo com campos diferentes, o merge escolheria um e o
sistema compilaria com o modelo errado. **`src/domain/types.ts` é arquivo de dono único.**
Frente que precisa de um tipo de outra frente pede, não escreve.

## 3.3 🟡 Seis pendências manuais que eram a mesma coisa

Os arquivos de pendência traziam seis itens separados — B-1, B-3, B-4, B-5, C-1 e C-2 — todos
dizendo "aplicar a migration no Supabase". Depois do merge viraram uma ação só, já executada:

```
+ 007_cadastro_usuario   + 008_compra_direta      + 009_saques
+ 010_faturamento_custodia + 011_retiradas        + 012_retiradas_ledger
```

`npm run db:check` confirma as doze aplicadas, RLS ligada em todas as tabelas e nada em
`public`.

---

# 4. O que foi conferido, e como

## 4.1 Os quatro comandos, na `main` depois dos três merges

```
npm run typecheck   ✓
npm run lint        ✓
npm test            ✓  47 arquivos · 343 testes · 1 pulado
npm run build       ✓  25 páginas, sem warning novo
```

A contagem de testes fecha por soma: **197** da base + **79** da frente B + **45** da frente C
+ **21** da frente A = **342**, mais o pulado. Nenhum teste se perdeu na resolução dos
conflitos — e isso importa, porque resolver conflito errado costuma sumir com teste sem
ninguém notar.

## 4.2 A varredura de terminologia sobre o texto NOVO

É a razão de a frente A entrar por último. Rodada sobre as telas que B e C escreveram
(`/retirada`, cadastro, saque, `/academy`, landing, termos, privacidade):

```
grep -rn "NFT\|token\|cripto\|ativo digital\|investimento" src/ --include="*.tsx"
```

**Zero ocorrências indevidas.** Tudo que aparece é uma de quatro coisas legítimas:

1. **Posicionamento negativo** — "não é corretora", "não é plataforma de ativos digitais",
   "não negociamos tokens, criptomoedas ou ativos virtuais". A seção 1.3 do plano **exige**
   essas frases por escrito.
2. **Vocabulário de segurança** — "hash criptográfico", "criptografia em trânsito". Outro
   sentido da palavra.
3. **`token` técnico** — variável de ambiente e token de tema do CSS.
4. **A tela de comparações**, liberada pelo Gabriel em 10/09/2026: o sujeito da frase ali é o
   Bitcoin, não a Áurea.

O contraste na própria tela de comparações mostra que a regra está sendo aplicada com
critério: "Real Olímpico: **recibo de custódia** com lastro físico" ao lado de
"BTC: ativo digital escasso".

## 4.3 As telas, com o servidor no ar

Entrei como `rogeriopena@testeaurea.com.br`, senha `12345678`, com o banco já migrado:

| Tela | O que confirmei |
|---|---|
| Início | Sobe, 155 moedas em custódia, menu com os rótulos da Fase 0 |
| Minha conta | Botão **"Sacar"** presente e **desabilitado com o motivo ao lado**: "Cadastre sua chave Pix ou dados bancários para liberar saques (prazo D+3)". É o padrão PayPal que o Gabriel pediu |
| Extrato | "Compra no marketplace" / "Venda no marketplace" — **nenhum nome de contraparte**. O item A-2 está fechado |
| Retiradas físicas | Estado vazio correto, com o aviso de que o recibo é extinto no ato e o prazo D+30 |
| Academy | Publicada, versionada (`1.0-2026-09-10`), com o posicionamento negativo completo |

**Console do navegador e log do servidor: limpos.**

## 4.4 As travas

O plano autoriza exatamente três, e não há nenhuma a mais. Conferido no código e na tela:

1. **Saque** exige dados bancários — visto funcionando.
2. **Retirada** exige endereço completo e confirmado — a Server Action recusa antes de
   começar a contar o prazo.
3. **Operar** exige aceite dos termos na versão vigente.

O cadastro e o login continuam livres. A tela "Cadastro temporariamente fechado" só aparece
quando o Supabase não está configurado no ambiente — é dependência técnica real, não trava de
política.

---

# 5. A definição de pronto do plano, item a item

| Item | Situação |
|---|---|
| `grep` de terminologia proibida retorna zero em texto visível | ✅ |
| Nenhum nome de contraparte visível em qualquer tela | ✅ |
| Endereço real dos Correios em `correios.ts` | ✅ Caixa Postal 7990, AGF Bandeirantes, Belo Horizonte/MG, CEP 30315-970 |
| `typecheck`, `lint`, `test` e `build` verdes na `main` | ✅ |
| Cliente novo consegue criar conta → cadastro → depositar → comprar → vender → **sacar** → **pedir a moeda de volta** | 🟡 O caminho existe inteiro em código e as telas sobem, mas **ninguém percorreu ponta a ponta com uma conta nova de verdade** |
| Termos e política na versão do Felipe, com aceite por blocos | 🟡 O aceite por blocos está pronto e funcionando. O texto ainda é o rascunho `1.0-2026-09-10`; a versão do advogado chegaria em 12/09 |
| Custódia mensal cobrando, com fatura visível no extrato | 🔴 O faturamento existe, mas o extrato mostra a cobrança **antiga** com rótulo "anual" — item 3.1 |
| As pendências manuais de cada agente lidas e resolvidas ou aceitas | 🟡 As de migration foram resolvidas. Restam **D-2** (prazo) e as decisões do item 3.1 |
| Pauta do Guilherme percorrida | ⬜ Não iniciada |
| Domínio apontado e e-mail corporativo testado depois | ⬜ Não iniciado. O tutorial e o rollback estão prontos (frente A) |

---

# 6. O que precisa de decisão sua

| # | Assunto | Quem decide |
|---|---|---|
| 1 | **O preço da custódia dito ao cliente** (item 3.1). O `custodyCharges` legado sai, ou convive? E o texto passa a dizer "mensal"? | Gabriel e sócios |
| 2 | **D-2** — o prazo da retirada é D+30 total, ou D+30 para postar mais D+5 de trânsito? A frente C deixou numa constante isolada, como o plano mandou | Gabriel |
| 3 | **Percorrer a jornada completa** com uma conta nova antes de abrir ao público. É o único item da definição de pronto que nenhum teste automatizado cobre | Gabriel |

---

# 7. Para quem vier depois

**A próxima migration é a 013.** As 007 a 012 estão ocupadas, e a numeração paralela já
custou uma correção.

**`src/domain/types.ts` precisa de dono único.** Foi onde as três frentes colidiram, e é o
arquivo que define o modelo de dados inteiro.

**Trabalho paralelo exige checar as branches vivas antes de escolher número de migration ou
reescrever restrição de banco.** As duas colisões desta rodada vieram da mesma raiz: cada
frente olhou só para a `main`.

**Os três relatórios de frente continuam válidos** e detalham o que cada uma fez:
[`RELATORIO_AGENTE_A.md`](RELATORIO_AGENTE_A.md), [`RELATORIO_AGENTE_B.md`](RELATORIO_AGENTE_B.md),
[`RELATORIO_AGENTE_C.md`](RELATORIO_AGENTE_C.md). Este documento cobre só o que aconteceu
**entre** elas.
