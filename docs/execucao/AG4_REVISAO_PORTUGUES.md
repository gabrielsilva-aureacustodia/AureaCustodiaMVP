# AG4 — Revisão de português do site e o nome do Rogério

Branch: `exec/ag4-revisao-portugues`, a partir de `main` em `c520233`.
Sem dependência das outras. Faça por último, para varrer também os textos que
AG1, AG2 e AG3 escreveram.

## 1. Rogério Pena → Rogério Siqueira

O nome correto do sócio é **Rogério Siqueira**. Troque em todo lugar onde
aparecer "Rogério Pena" — interface, landing, textos institucionais, documentos
de `docs/`.

**Não troque identificadores.** O e-mail de semente
`rogeriopena@testeaurea.com.br` é chave de conta e de teste: mexer nele quebra
fixtures e a `AUREA_ADMIN_EMAILS`. Só o nome de exibição muda.

Ocorrências conhecidas em `docs/` (a lista não é exaustiva, varra o repositório):
`docs/alteracoes/RELATORIO-Guilherme.md`, `docs/finalizacoes/RELATORIO_AGENTE_C.md`,
`docs/publish_docs/RELATORIO_AGENTE_A.md` (inclusive a narrativa "Nossa história"
da landing, que fala do cofundador pelo nome).

## 2. Revisão de português do site inteiro

Varredura de **todo texto que o usuário lê**: interface, landing, termos,
política de privacidade, tabela de taxas, material educativo, mensagens de erro.

O que procurar, em ordem de risco:

- **Concordância de gênero da marca.** A marca passou de "Áurea Custódia"
  (feminino) para "Real Olímpico" (masculino) em 20/09/2026, e a troca
  masculinizou por tabela palavras que não eram a marca. Em 21/09 foram
  corrigidos "Conto Real Olímpico" → "Conta Real Olímpico" e "Plataformo Real
  Olímpico" → "Plataforma Real Olímpico" nos Termos, além de "não estará
  obrigada" → "obrigado" e "atuará como Controladora" → "Controlador". **Procure
  o mesmo defeito fora dos documentos legais**: telas, e-mails, landing.
  - Onde o sujeito é **o Real Olímpico**, a concordância é masculina.
  - Onde o sujeito é **a AUREA CUSTODIA LTDA** (razão social), é feminina — e
    está certo assim. Não "corrija" para masculino.
- Verbos e tempos trocados, vírgula que muda o sentido, frase sem verbo.
- Coerência de tratamento: o site fala com o usuário por "você".

**Não reescreva a substância dos documentos jurídicos.** Corrija gramática. Se
encontrar uma cláusula que diz algo diferente do que deveria, **aponte no
relatório** em vez de reescrever — o texto é do advogado (Felipe Moraes).

Se mexer no texto de um documento legal, **o hash muda** e a versão precisa
subir (hoje em `2.1`). Veja a nota no topo de
`src/domain/documentos-legais/termos-de-uso-v1.ts` e atualize os vetores
congelados em `canonico.test.ts`, `admin/documentos.test.ts` e `db/db.test.ts`.

## 3. Vocabulário proibido — conferir de novo na passagem

Proibidas pelo jurídico em qualquer texto sobre o produto: **token, NFT, cripto,
ativo digital, ativo, investimento, investidor, corretora, assessor de
investimento, rentabilidade, retorno**. Use **recibo**, **moeda**, **item**,
**marketplace**, **potencial de valorização**, e todo número exibido é
**estimado** ou **aproximado**.

**A exceção:** descrever o mercado de fora não é descrever o Real Olímpico. Em
`/graficos/comparacoes` (que na AG3 vira subpágina de Mercado), "BTC: ativo
digital escasso" **fica** — o sujeito é o Bitcoin, não a empresa. Julgue pelo
sujeito da frase.

## 4. Marca × razão social

- Interface, título de página, e-mail e material público: **Real Olímpico**.
- Onde há CNPJ, contrato, objeto postal e descritor de fatura de cartão:
  **AUREA CUSTODIA LTDA**. Trocar esses pela marca faz o pacote ser recusado na
  agência dos Correios e a cobrança não bater com o cadastro do adquirente.
- Identificadores internos **não** mudam: schema `aurea.*`, variáveis `AUREA_*`,
  `STORE_KEY`, e-mails `@testeaurea.com.br`.

## Ordem de leitura

1. `CLAUDE.md` — seção "Restrições de marca, jurídico e regulatório"
2. `src/domain/documentos-legais/` — os quatro documentos
3. `src/components/landing/LandingPage.tsx`
4. `src/app/(app)/` — as telas
5. `src/styles/` — só se algum texto estiver preso em CSS

## Fechamento

`npm run typecheck`, `npm run lint`, `npm test` e `npm run build` — **uma vez
cada, no fim**. Não rode teste entre as etapas. Depois commit e push da branch.

No relatório final, liste em uma seção à parte as frases que você **não**
corrigiu por serem decisão do advogado, e não erro de português.
