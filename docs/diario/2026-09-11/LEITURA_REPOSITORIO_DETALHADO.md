# Leitura do Repositório — DETALHADO · 11/09/2026

**Escrito para uma IA entrar em contexto no início de sessão, ou para o Gabriel quando
precisar do porquê.**

```
Leitura:     local, worktrees das três frentes + main
main em:     ab3db39
Base lida:   f7a5e8c (10/09/2026, Fase 0)
Cobertura:   19 commits, 108 arquivos, +11.881 / −428 linhas, 51 arquivos novos
Banco:       Supabase aws-0-sa-east-1, schema aurea, 12 migrations aplicadas
```

---

## 1. Onde o projeto está

A plataforma deixou de ser "marketplace com custódia" e passou a ter **o circuito do dinheiro
fechado nos dois sentidos**. Antes desta rodada o cliente conseguia pôr dinheiro e comprar,
mas não conseguia tirar nem o dinheiro nem a moeda. Agora consegue os dois:

- **Saque de recursos** — taxa fixa, prazo D+3, dados bancários obrigatórios, lançamento
  contábil e relatório próprio.
- **Retirada física da moeda** — duas modalidades excludentes (comum R$ 50, segura R$ 180),
  prazo D+30, endereço obrigatório e confirmado, extinção do recibo no ato do pedido,
  etiqueta dos Correios e rastreio.

Junto vieram o **cadastro formal progressivo** (só exigido no primeiro movimento de dinheiro,
como o plano manda), o **faturamento mensal da custódia**, o **aceite dos termos por blocos** e
o material educativo em `/academy`.

O endereço dos Correios deixou de ser fictício: **Caixa Postal 7990, AGF Bandeirantes, Belo
Horizonte/MG, CEP 30315-970**, com termo de assinatura. Isso fecha a decisão D-6, que
bloqueava toda a geração de etiqueta.

## 2. Como as três frentes entraram

A ordem **B → C → A** está na seção 7.2 do plano executivo e não é arbitrária: B e C escrevem
texto novo de interface, e A entra por último justamente para varrer a terminologia desse
texto antes de o site ir ao ar.

**Merge de B** — limpo, sem conflito. 276 testes.

**Merge de C** — seis conflitos, todos resolvidos pela **união** dos dois lados, nenhum por
substituição: `ledger.ts` (as três funções de lançamento coexistem), `types.ts`,
`custody.ts` (as duas seções de Server Action coexistem, a da C renumerada para 6),
`derivar.ts` (os dois laços independentes), `dados.ts` (os dois relatórios) e `db.test.ts`.

**Merge de A** — um conflito, e ele conta uma história: o lado da frente A estava **vazio**,
porque os tipos de aceite legal que ela escreveu já tinham chegado pela branch C, idênticos.

## 3. Os dois defeitos que o merge revelou

### 3.1 A restrição do ledger — o grave

O livro-razão tem uma restrição no banco que enumera os tipos de lançamento aceitos. As
frentes B e C precisaram alargá-la ao mesmo tempo, e cada uma escreveu um `DROP` seguido de um
`ADD` **com a própria lista**. A frente B antecipou o tipo da C; a frente C não antecipou os
dois da B.

Como o aplicador de migrations roda os arquivos em ordem alfabética e as duas escolheram
números colidentes, a migration da frente C rodaria por último e **substituiria** a lista —
removendo `saque` e `taxa_saque`.

O efeito seria: o banco recusando todo lançamento de saque, **sem erro de compilação, sem
teste vermelho e sem sinal na interface**, até o primeiro saque de um cliente real falhar por
violação de restrição.

Por que nenhuma frente podia ver isso sozinha: os arquivos têm nomes diferentes, então o Git
junta os dois sem conflito; e cada frente testa contra um banco isolado, onde só a própria
migration existe.

A correção foi reescrever a migration da frente C declarando a **união completa** dos onze
tipos, e renumerá-la para ser a última a tocar a restrição. Conferido no banco depois de
aplicada.

### 3.2 A numeração de migration

Mesma raiz: cada frente olhou a `main`, viu que a última era a `006`, e seguiu. As duas
criaram uma `009` e uma `010`. As da frente C viraram **011** e **012**, com o motivo escrito
no cabeçalho de cada arquivo.

## 4. O que a auditoria encontrou além disso

**A custódia tem dois mecanismos vivos** (CD-11, 🔴). A decisão D-3 trocou faixas anuais por
R$ 2,00/moeda/mês. A frente B construiu o modelo novo, mas o antigo não saiu, e é o antigo
que aparece em três textos visíveis ao cliente — dizendo "anual", com um valor da tabela de
faixas aposentada. **A plataforma informa hoje um preço de custódia que não é o vigente.**

**`src/domain/types.ts` não tem dono** (CD-12, 🟠). As três frentes escreveram tipos umas das
outras ali. Não deu prejuízo porque as definições batiam — foi sorte, não desenho.

## 5. O que está verde, e conferido

Os quatro comandos passam na `main`: typecheck, lint, **343 testes** e build de 25 páginas
sem warning novo. A contagem fecha por soma exata — 197 da base + 79 de B + 45 de C + 21 de
A — o que prova que nenhuma resolução de conflito engoliu teste.

A varredura de terminologia proibida sobre o texto **novo** de B e C voltou limpa. As únicas
ocorrências são o posicionamento negativo que o jurídico exige ("não é corretora", "não
negociamos tokens"), vocabulário de segurança ("hash criptográfico"), `token` técnico de
ambiente e CSS, e a tela de comparações, liberada pelo Gabriel porque ali o sujeito da frase
é o Bitcoin e não a Áurea.

Com o servidor no ar e o banco migrado, foram percorridas: início, minha conta, extrato,
retiradas físicas e academy. Console e log do servidor limpos. A trava de saque aparece no
padrão pedido — botão visível, desabilitado, **com o motivo escrito ao lado**. O extrato não
mostra mais nome de contraparte.

## 6. Onde mexer com cuidado

- **`src/domain/fees.ts`** — superfície protegida, e é onde mora o nó do CD-11.
- **`src/domain/types.ts`** — fonte da verdade do modelo, e o arquivo que colidiu nas três
  frentes.
- **`src/server/db/migrations/`** — a próxima é a **013**; antes de escolher número, conferir
  as branches vivas, não só a `main`.
- **Restrição de lista no banco** — quem reescrever declara a lista inteira, nunca só o valor
  da própria frente.

## 7. O que continua aberto

Detalhado em [`../../publish_docs/RELATORIO_EXECUCAO_PUBLICACAO.md`](../../publish_docs/RELATORIO_EXECUCAO_PUBLICACAO.md),
seções 5 e 6. Em resumo: o preço da custódia (CD-11), o prazo da retirada (D-2), a jornada
completa percorrida com conta nova, o texto final do advogado, a pauta do Guilherme e o
apontamento do domínio.
