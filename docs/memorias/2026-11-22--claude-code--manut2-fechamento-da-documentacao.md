# Fechamento da Manutenção 22-11 (Processo Padrão) — memória do agente

- **Data:** 2026-11-22 · **Agente:** claude-code (Processo Padrão da Manutenção 22-11, a partir dos MDs de execução de T1–T5) · **Projeto/branch:** `main` (pasta completa, sem worktree)

## 1. Estado em uma tela
RETOMADA do ESTADO-GERAL corrigida (bateria e push foram em 18/11 19:07; hoje foram T1–T5); perguntas da B ao contador encaixadas em `LACUNAS_E_PERGUNTAS.md` nº 34–36; `INDICE_VEGA.md` com a linha de 22/11 e as migrations 058/059. `docs/manutencao-2026-11/garantias/` NÃO foi commitado: espera o Controle.

## 2. Decisões e o porquê
- Pergunta ao contador da B é só documento: **nada fiscal codificado**. Decisão fiscal ou de cobrança não se toma sem o Gabriel.
- Migration 059 estava sem commit na abertura: aplica no banco junto com o commit que a cria ([[migration-nova-se-aplica-no-commit]]).

## 3. O que aprendi (armadilhas, comandos, caminhos)
- Commit de só MD vai direto, sem build ([[commit-so-de-docs-sem-verificacao]]). Antes do push: `gh auth switch --user gabrielsilva-aureacustodia` ([[push-sempre-com-conta-aureacustodia]]).
- Arquivos CRLF: editar preservando CRLF (python com `newline=''`).
