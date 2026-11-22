# AG1 — Execução da bancada: cadastro sem envio

- 21/09/2026 — Execução iniciada na branch `exec/ag1-bancada-cadastro-sem-envio`; plano e regras gerais lidos. Falta ler o território indicado, implementar, validar, commitar e publicar.
- 21/09/2026 — Território obrigatório lido; branch confirmada na base `c520233`. Falta implementar e validar.
- 21/09/2026 — Serviço de cadastro sem envio criado com protocolo normal, lote já recebido e peso padrão; persistência ganhou origem e dados iniciais em `Envio`, `diff`, repositório e migration 033. Falta fechar UI, permissões e validação.
- 21/09/2026 — As duas opções foram montadas na bancada e na ficha do usuário; “Cadastro direto” foi renomeado e “Cadastro sem envio” ganhou permissão e Server Action próprias. Falta revisão estática e ciclo final.
- 21/09/2026 — Testes de contrato atualizados para o catálogo de permissões e para a persistência dos dados do novo envio. Falta concluir a revisão estática e rodar o ciclo final uma vez.
- 21/09/2026 — Revisão de Next.js/React e consistência do diff concluídas; nenhum atalho de teste ou segurança foi adotado. Falta somente typecheck, lint, testes, build, commit e push.
- 21/09/2026 — Typecheck e lint passaram (lint com 9 avisos preexistentes); a suíte teve 911 sucessos e 3 falhas de contrato do RBAC, pois a primeira implementação reconcedia permissões retiradas pela tela. Corrigido para concessão inicial do papel Sócio e contagens atualizadas. Falta repetir a validação e publicar.
- 21/09/2026 — Segunda suíte confirmou a correção funcional (913 testes passaram) e encontrou só uma última expectativa antiga de 23 permissões do dev; ajustada para 24. Falta suíte final, build, commit e push.
- 21/09/2026 — Validação final concluída: typecheck passou; lint passou com 9 avisos preexistentes; 913 testes passaram e 1 ficou ignorado; build passou. Falta somente inventário de segurança, commit e push.
