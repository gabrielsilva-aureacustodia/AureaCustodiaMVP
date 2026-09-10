# Prompt — Fase 0 · Terminologia, vitrine e lacre

> **Esta fase roda sozinha, antes de tudo.** Copie o bloco abaixo inteiro como primeira
> mensagem de um chat novo. Os Agentes B e C só criam suas branches depois que este trabalho
> estiver na `main`.

---

Você vai trabalhar no repositório da **Áurea Custódia / Real Olímpico**
(`C:\dev\AureaCustodiaMVP`), executando a **Fase 0 da publicação oficial**.

Esta fase é **sequencial e bloqueante**: outros dois agentes estão esperando você terminar
para poderem começar. Ela é curta — meio dia — e mecânica. Trabalhe direto na `main`.

## Leia nesta ordem, antes de escrever qualquer linha

1. **`CLAUDE.md`** (raiz) — carregado automaticamente, são as regras do projeto
2. **`docs/publish_docs/PROTOCOLO_DO_AGENTE.md`** — as onze regras de execução. **Leitura
   obrigatória integral**, não é resumo
3. **`docs/publish_docs/PLANO_EXECUTIVO_PUBLICACAO.md`**, **seções 1 e 5** — a terminologia
   proibida e as decisões já fechadas
4. **`docs/publish_docs/EXECUCAO_3_BRANCHES_PUBLICACAO.md`**, **seção 3** — as suas quatro
   tarefas, com os arquivos e as linhas já levantados
5. **`docs/diario/RITUAL_DE_SESSAO_RESUMO.md`** — a abertura de sessão

## O que fazer

As quatro tarefas estão detalhadas na seção 3 do plano de execução. Em resumo:

- **F0.1** — trocar a terminologia proibida em todo texto visível ao cliente
- **F0.2** — renomear os identificadores internos (`Nft` → `Recibo`, pasta `components/nft/`,
  `nft-receipt.ts`, `nft.css`). **Isso foi decidido em 10/09/2026 — faça.** Consequência
  obrigatória: `STORE_KEY` sobe para `'aurea-market-v7'` e entra a migration **004**
- **F0.3** — tirar a exigência de "lacre original" do texto de envio; fica só "envelope lacrado"
- **F0.4** — tirar nome de comprador e vendedor da vitrine. **Anonimato total**, no formato
  `Vendedor #A93F`, derivado do id da oferta. Quando a oferta for do próprio usuário,
  continua aparecendo **"você"**

## Regras que valem em cima de tudo

- **Não invente escopo.** Esta fase é renomear texto e esconder nome. Não conserte outra
  coisa, não refatore, não melhore nada de passagem. Em 06/09/2026 uma tarefa de cadastro
  virou alteração de DNS e derrubou o e-mail corporativo da empresa por horas
- **Não acrescente trava nenhuma** — nem *feature flag*, nem confirmação, nem validação nova
- `src/domain/types.ts` e `src/domain/constants.ts` são **superfície protegida**. Você tem
  autorização para mexer neles **apenas** no que a F0.2 exige
- `responsive.css` continua sendo o **último** import de `globals.css`. A cascata depende disso
- Comentários em português, explicando o *porquê*

## Como fechar

Antes do commit, os quatro verdes:

```
npm run typecheck && npm run lint && npm test && npm run build
```

Depois, com `npm run dev` no ar e senha `12345678`, percorra as **doze telas autenticadas** —
início, mercado, vender, recibos, um recibo aberto, envios, conta, extrato, configurações,
gráficos, comparações, auditoria. Confirme: nenhuma palavra proibida, nenhum nome de
contraparte, nenhum erro no console. Escreva no relatório o que você clicou.

E rode a varredura:

```
grep -rn "NFT\|token\|cripto\|ativo digital\|investimento" src/ --include="*.tsx"
```

## O que entregar

- Commit na `main`: `Adota a terminologia aprovada pelo juridico e fecha a vitrine`
- `docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_A.md`, criado, já com o item **D-6**
  (endereço real dos Correios — dono: Gabriel)
- `docs/publish_docs/RELATORIO_AGENTE_A.md`, começado

## Onde parar

Se a Camada 2 (F0.2) quebrar **mais de um teste que você não consiga explicar em uma
frase**: pare, entregue só a Camada 1, e registre o resto como **RA-24** em
`RISCOS_ASSUMIDOS.md` e no `ATALHOS.md` da pasta. A Camada 1 sozinha já libera os outros
dois agentes.

Se qualquer comando seu for bloqueado por permissão — `git push`, merge, o que for —
**não espere instrução**: me entregue o comando pronto para colar, em bloco de shell, com o
caminho completo. Minha máquina é Windows com PowerShell, então `&&` e `printf` não
funcionam.

## Comece assim

Sem editar nada ainda: rode `git log --oneline -10`, me diga em três linhas o que mudou, e
depois me mostre a lista completa de arquivos e linhas que você vai tocar, separada em
Camada 1 e Camada 2. Espere minha aprovação.
