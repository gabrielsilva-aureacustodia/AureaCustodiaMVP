# Balcão: posição = lugar físico, vídeo e armazenamento (T3) — memória do agente

- **Data:** 2026-11-22 · **Agente:** claude-code (Processo Padrão da Manutenção 22-11, a partir dos MDs de execução de T1–T5) · **Projeto/branch:** `main` (pasta completa, sem worktree)

## 1. Estado em uma tela
Na `main` (`1e6b775`): gravador de vídeo e peso padrão do balcão; em produção, 18 posições reordenadas (EB-002 RO-000191…203; EB003 RO-000209…213) com cadeia de hashes refeita do GENESIS e `recibos.hash` atualizado, e `peso_inicial_mg = 7000` em 11 envios de Bandeira. Falta o Gabriel ajustar o lugar FÍSICO das 18 moedas e decidir RO-ENV-0014, 0003 e 0048.

## 2. Decisões e o porquê
- **Posição da moeda = o lugar físico dela na caixa**, não um número sequencial qualquer: quando o código muda, a posição segue o lugar onde a moeda de fato está (decisão do Gabriel, 22/11/2026, "Peso e posições").
- **Vídeo de autenticidade é permanente e o Storage não pode faltar espaço:** nada de apagar vídeo; a frente L (`docs/RELATORIO_ARMAZENAMENTO_VIDEOS.md`) mostra Free esgotando em jan/2027 e Pro durando ~20 meses. Aprovar Pro e limite de bitrate segue com o Gabriel; retenção continua com o jurídico.
- Análise "fechada sem vídeo" em 53 casos é cadastro sem envio (moeda em mão): a bancada permite e grava a ausência no hash. Não é falha de upload. Só RO-ENV-0012, 0024, 0037 e 0044 tinham vídeo sem caminho (ligados em 22/11).

## 3. O que aprendi (armadilhas, comandos, caminhos)
- Script com escrita em produção: `corrigir-videos-e-posicoes.cjs` (raiz, sem commit), com `--aplicar`; sem a flag é dry-run. Regra de [[script-de-producao-fora-da-suite]]: nunca em `src/*.test.ts`.
- `peso_inicial_mg` não entra no hash; posição e e-mail entram. Reordenar posição exige refazer a cadeia.
- Backup antes do reverso em `side-session-notes/…/backup-analises-recibos-22-11-antes-do-reverso.json` (fora do repo).
