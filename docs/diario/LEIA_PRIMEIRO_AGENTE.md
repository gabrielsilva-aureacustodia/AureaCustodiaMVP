# LEIA_PRIMEIRO_AGENTE — abertura, execução e fechamento de sessão

```
Projeto:     Áurea Custódia / Real Olímpico
Atualizado:  2026-11-09
Origem:      síntese do que este repositório já pratica (CLAUDE.md, Regras de eficiência v1.1, docs/diario/RITUAL_DE_SESSAO*.md)
             com o padrão de continuidade da Sintetica (C:\dev\Sintetica\processo\04_RITUAL_DE_SESSAO.md, R11, B4)
Precedência: 1) o que o Gabriel diz agora · 2) CLAUDE.md · 3) este arquivo · 4) rituais antigos em docs/diario/ · 5) memória do agente
```

> Este arquivo **não cria regra nova**. Ele junta, em um lugar, regras que o Gabriel já deu a este projeto e à Sintetica, para qualquer chat continuar de onde o outro parou. Se achar que falta uma regra, sugira em uma linha e não implemente.

## 1. Ato zero — classificar o pedido (antes de qualquer ferramenta)

| Tipo | Sinais | O que fazer |
|---|---|---|
| **P** | pergunta, "onde está", "me diz" | Responde e **para**. Sem ritual, sem leitura extra, sem commit |
| **E** | "implementa", "corrige", "continua de onde parou" | Execução recortada pelo MD da frente |
| **L** | "leitura", "o que mudou", "analisa" | Leitura que não altera código de produto |
| **N** | projeto/frente nova | Cria o MD de execução da frente antes de editar |

Pedido misto: separa (primeiro L, depois E). Pedido exato = pedido fechado.

## 2. Abertura (tipo E ou L)

1. `CLAUDE.md` (carrega sozinho no Claude Code).
2. `docs/INDICE_VEGA.md` — seção 1 e a seção da frente. **Não releia o repositório se um MD responde.**
3. `docs/diario/execucoes/ESTADO-GERAL-*--MD_EXECUCAO.md` (bloco RETOMADA) e o MD da frente.
4. `docs/memorias/README.md` e a memória mais recente do assunto.
5. `git status -sb` e `git log -5`, uma vez.
6. Código somente do que a lista "Ler" da frente mandar.

## 3. Durante

- **MD de execução atualizado a cada tópico concluído.** É o relatório de andamento; sem ele a sessão não é continuável.
- Planeje antes de editar quando tocar mais de um arquivo; descreva o plano e espere aprovação (CLAUDE.md, "Como trabalhar comigo").
- **Superfície protegida** (`constants.ts`, `fees.ts`, `market.ts`, `types.ts`, contrato de `store/types.ts`, Server Actions): parar e perguntar.
- **Decisão de negócio, fiscal ou de cobrança nunca vira regra sem o Gabriel.** Opinião do agente vai rotulada como opinião.
- Subagente ou sessão paralela só com pedido expresso dele. "Crie branches" = worktree + MD + prompt pronto para ele colar em outro agente.
- Falha de ferramenta ou bloqueio: avisar na hora, em mensagem própria, com o comando pronto para ele rodar (PowerShell, sem `&&`).
- Atalho de teste ou segurança tomado para entregar rápido: entra em `RISCOS_ASSUMIDOS.md` **e** no `ATALHOS.md` da pasta, no mesmo commit.
- Nunca commitar `.env.local`, segredo ou token. Valores de chave ficam fora de MD; só os nomes das variáveis.
- Migration nova: aplicada no banco junto com o commit que a cria (`npm run db:migrate`).
- O que não puder ser feito por inteiro: primeira linha em negrito dizendo o que **não** será feito.

## 4. Verificação e commit

- `npm run typecheck`, `npm test`, `npm run build` ao fim do bloco funcional, **não por edição**.
- Commit só de MD: direto, sem typecheck/teste/build (só a checagem de segredo).
- Plano de execução escrito para outro agente é arquivo de trabalho local e não se commita antes de executado.
- Commits só depois do merge das branches; skills `/commit` e `/publicar` fazem o checklist.
- Se o Gabriel pediu push, faz o push e informa o que não foi testado.

## 5. Fechamento (nesta ordem)

1. **Primeira linha da resposta: estado do Git** (branch, ahead/behind, o que está sem commit).
2. Atualizar o MD de execução com o **estado real**: feito / em andamento / não feito / o que quebrou, e o **próximo ato** explícito. Sessão sem próximo ato é sessão abandonada.
3. Rodar o teste da branch (não por arquivo).
4. Migration, variável de ambiente, banco ou DNS tocados → registrar e dar push imediato.
5. Atualizar `docs/INDICE_VEGA.md` se mudou estrutura, regra de negócio, migration ou frente (seções 3, 4, 5, 6 e 8).
6. **Salvar memória R11** em `docs/memorias/AAAA-MM-DD--<agente>--<assunto>.md` (modelo: `C:\dev\Sintetica\docs\memorias\_MODELO.md`: estado em uma tela, decisões e porquê, armadilhas, como continuar, pendências, ligações) e acrescentar a linha em `docs/memorias/README.md`.
7. Nome e descrição do chat/agente/branch batem com o que foi feito. Trabalho novo = chat novo com nome novo.

## 6. Higiene (só depois de merge + testes + OK do Gabriel)

1. Informar resultado e o que foi mesclado.
2. **Perguntar antes de apagar**; listar proposta de remoção e de manutenção.
3. Mandar MDs de execução e logs para a `main` **antes** de limpar worktrees e branches.
4. MD de execução de branch mesclada não se apaga: vai para `docs/diario/execucoes/arquivo/`.
5. Teste visual, página de conferência e ativo temporário saem antes do commit e nunca vão à produção.

## 7. Como passar o bastão para outro chat (ou para o Vega)

Cole no chat novo, sem mais nada:

```text
Projeto Áurea Custódia / Real Olímpico, C:\dev\AureaCustodiaMVP. Leia, nesta ordem: CLAUDE.md,
docs/diario/LEIA_PRIMEIRO_AGENTE.md, docs/INDICE_VEGA.md (seção 1 e a da frente) e o bloco RETOMADA de
docs/diario/execucoes/ESTADO-GERAL-2026-11-09--MD_EXECUCAO.md. Depois execute o "Próximo ato" de lá,
sem pedir de novo o que os MDs já respondem. Ao fim, atualize o MD de execução, o índice e salve a memória R11.
```

Para o Vega: o ponto de entrada é `docs/INDICE_VEGA.md` (mapa) e a ficha `C:\dev\Sintetica\contexto\projetos\aurea-custodia.md` (resumo e ponteiro).
