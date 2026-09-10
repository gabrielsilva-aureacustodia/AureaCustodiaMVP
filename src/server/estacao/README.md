# `src/server/estacao/` — o lado servidor da bancada

Frente E. É o que recebe as chamadas do programa que roda no notebook da bancada
(`estacao/`, na raiz do repositório) e transforma o veredito do operador em moeda com
recibo.

> **Módulos exclusivos de servidor.** Os três arquivos têm `import 'server-only'`. Nenhum
> deles pode ser importado de Client Component: `acesso.ts` lê a chave da estação e
> `video.ts` lê a chave de serviço do Supabase.

---

## Os arquivos

| Arquivo | O que faz |
|---|---|
| `acesso.ts` | Decide se quem bateu na rota é a bancada. Comparação de token em tempo constante |
| `analise.ts` | A fila, a abertura do procedimento e o fechamento — onde a moeda nasce |
| `video.ts` | Assina a URL de upload do vídeo no Supabase Storage |

---

## As três coisas que explicam o desenho

### 1. A estação não é um usuário

Ela não tem sessão, não tem cookie e não aparece em `state.users`. É uma máquina numa
bancada, identificada por `AUREA_ESTACAO_TOKEN`. Reaproveitar a sessão de um sócio
significaria que fechar o navegador dele derruba a análise no meio, e que o vídeo de
custódia ficaria assinado por "quem estava logado", não por quem operou.

É por isso que isto **não é uma Server Action**: Server Actions são chamadas pelo navegador
com o cookie da sessão. Aqui quem chama é um programa Electron, por HTTP, com chave própria.

### 2. O recibo carrega o hash real

`advanceAnalysis` em `src/server/actions/custody.ts` continua existindo e serve à
demonstração pela tela — ela emite recibo com `genHash()`, que sorteia. As duas escrevem o
mesmo estado, pela mesma transação, e nenhuma sabe da outra.

A diferença que importa: **esta emite com o hash real da análise**, encadeado no anterior.
É a dívida RA-05 sendo paga onde ela importa — na moeda que existe de verdade. Moeda do seed
continua com o hash simulado, porque ela nunca passou por bancada nenhuma e fingir o
contrário seria pior do que declarar a simulação.

### 3. O relógio é o do servidor

`validadoEm` sai de `Date.now()` deste processo. **Não existe campo de horário na entrada da
rota** — e essa ausência é a garantia. Notebook de bancada tem relógio errado com
frequência, e um hash que depende do relógio de uma máquina destrói a única coisa que ele
entrega: a reprodutibilidade.

---

## O que fica gravado

`AppState.analises` — lista **append-only**, como `trades` e `deposits`. Persistida em
`aurea.analises` (migration 004), com repositório em
`src/server/db/repositories/analises.ts`.

Tabela própria, e não colunas em `coins`, porque **moeda recusada nunca vira linha em
`coins`** — e mesmo assim precisa de registro: é ele que explica ao cliente por que o pacote
está voltando, e é ele que entra na corrente de hashes. Uma análise sem moeda é um estado
que `coins` não sabe representar.

---

## O que NÃO subiu de versão, e por quê

`STORE_KEY` continua em `aurea-market-v6`. A regra da casa é subir a versão quando o formato
de `AppState` muda — mas ela existe para mudança que deixa **registro velho preso**, como a
v6 fez com `tipoMoeda` (uma ordem da v5 sem esse campo ficava no livro sem nunca casar).

Acrescentar uma lista vazia não é esse caso: `garantirFormato()` em `src/server/state.ts`
preenche `analises: []` quando ela falta, e a migration 004 é inteiramente aditiva. Apagar o
acervo de demonstração dos sócios aqui seria custo sem ganho nenhum.

---

## Contrato e fórmula

As rotas, os códigos de erro e a fórmula congelada do hash — com vetor de teste — estão em
[`estacao/CONTRATO.md`](../../../estacao/CONTRATO.md). Os atalhos assumidos estão em
[`estacao/ATALHOS.md`](../../../estacao/ATALHOS.md) e em `RISCOS_ASSUMIDOS.md` (RA-20 a
RA-23).
