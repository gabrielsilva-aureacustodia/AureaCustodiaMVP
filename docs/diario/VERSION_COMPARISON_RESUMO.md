# Version Comparison — RESUMO DO DIA

**28/08/2026 · `8e0f0a5` versus — (não há versão anterior)**

---

## Aviso

Esta é a **primeira leitura**. Não existe versão anterior para comparar, então este documento
não faz o que fará nos próximos dias. A partir da próxima leitura, ele terá uma única função:
dizer, em uma página, **o que mudou de comportamento desde ontem**.

Hoje ele registra a **linha de base**: o que o projeto virou entre 15 e 19 de agosto.

---

## O que o projeto ganhou desde que nasceu

### Deixou de ser um arquivo e virou uma aplicação

| Antes (monolito HTML) | Agora |
|---|---|
| 1 arquivo, 2.816 linhas | 100 arquivos, 12.590 linhas em `src/` |
| Dados no `window.storage`, que só existe no ambiente de artefatos | Postgres, Redis ou memória, escolhido sozinho |
| Regra de negócio rodando no navegador do usuário | Regra rodando no servidor |
| Uma página só, trocando `display:none` | 13 telas com URL própria |
| Logos em base64 dentro do código | Arquivos servidos com cache |

**O que isso significa na prática:** no monolito, qualquer pessoa com o console do navegador
aberto podia comprar de graça. Agora quem decide é o servidor.

### O mercado passou a ter duas moedas

Entrou a **Moeda dos Direitos Humanos** (R$ 1 de 1998, tiragem de 600 mil, a menor do Plano
Real), negociada entre R$ 380 e R$ 520.

**A regra que mudou:** cada moeda tem sua própria fila. Quem quer comprar Direitos Humanos
entra na fila da Direitos Humanos, e uma oferta de Bandeira Olímpica — por mais barata que
esteja — nunca é vendida para ele. Dentro de cada fila, quem oferece mais compra primeiro;
empatou no preço, ganha quem chegou antes.

Consequência: média de 7 dias, mediana de 24h e os gráficos passaram a ser **por tipo de
moeda**. Sem isso, uma Direitos Humanos de R$ 450 entraria na mesma média de uma Bandeira de
R$ 285, e o gráfico mostraria uma alta que nunca aconteceu.

### Seis defeitos do monolito foram corrigidos

Todos autorizados pelos sócios. Os dois que envolviam dinheiro:

- **O preço errava 100 vezes.** Digitar `250.00` no padrão americano virava R$ 25.000,00 — em
  silêncio, num campo cujo valor vira ordem de venda real.
- **Existia "compra fantasma".** O sistema movia o dinheiro e depois tentava mover a moeda. Se
  a moeda não estivesse mais com o vendedor, o dinheiro trocava de mãos e a moeda não, com o
  histórico registrando uma negociação que não aconteceu. Isso existia em dois caminhos
  diferentes do código, e os dois foram fechados.

### Nasceu uma camada de processo

Três dias depois das telas, e sem uma linha de código de produto: `CLAUDE.md` com as regras
que o agente não pode violar, `/commit` com checklist de sete passos, `/publicar` com a
pergunta que evita quebrar produção, e o documento dos 24 bloqueantes de cliente real.

**Vale registrar:** foi a decisão mais madura do histórico. Investir em processo antes de
investir em feature é o que permitiu esta leitura ser rápida.

---

## O que entrou junto e precisa de atenção

| O quê | Por quê |
|---|---|
| **A chave dos dados subiu para v6** | Ofertas e negociações antigas não têm tipo de moeda. Ordem antiga casaria com qualquer outra, misturando os dois mercados. Por isso o banco de teste foi zerado |
| **O extrato recalcula a comissão** | Se a taxa de 0,5% + R$ 1,00 mudar um dia, o extrato passa a mostrar valores diferentes para negociações que já aconteceram |
| **O depósito é simulado** | Não há Pix, cartão nem boleto. A ação só soma um número ao saldo, com teto de R$ 100.000 |
| **A taxa de custódia é registrada mas não é cobrada** | Não existe ação de pagamento no MVP. Está escrito na própria tela |

---

## Erros críticos encontrados nesta leitura

Dois, e nenhum deles aparece como erro na tela — o que os torna piores:

**1. A senha do cofre pode estar em branco.** Se `SESSION_SECRET` não estiver configurada na
Vercel, o sistema usa um valor que está escrito no código-fonte. Quem tem acesso ao código
entra como qualquer usuário. **Conferir hoje.**

**2. Um arquivo de exemplo manda usar a versão errada dos dados.** O `.env.example` e o guia
de instalação mandam escrever `aurea-market-v5`, mas o sistema está em v6. Quem seguir a
instrução e ligar no banco compartilhado faz os dois mercados voltarem a se misturar — sem
erro, sem aviso, sem tela quebrada.

---

## Próxima comparação

A partir da próxima leitura, este documento terá no máximo uma página e responderá só isto:
**o que mudou de ontem para hoje, e o que preciso saber antes de codar.**
