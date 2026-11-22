# Registro — frente H (cancelar-envio-e-nota)
Atualizado: 2026-11-17 22:27
Worktree: C:\dev\AureaCustodiaMVP\.claude\worktrees\manut-cancelar-envio-e-nota-9f78d5        Branch: claude/manut-cancelar-envio-e-nota-9f78d5
Sessões: branch=(esta sessão, filha do Controle local_e259126b-4373-4132-9e89-79edb7fa94ec) · execução=NÃO ABRIU (cartão task_7172faac) · auditoria=NÃO ABRIU (cartão task_68f24ac2) · específico=NÃO ABRIU (cartão task_47c31d40)
Estado: bloqueada (filhos)
Tópico atual: nenhum tópico começou; MD de execução pronto em docs\diario\execucoes\2026-11-17--manut-h-cancelar-envio-e-nota--MD_EXECUCAO.md (na worktree)
Feito: Passo 0; leitura da ficha e do núcleo do código; MD de execução (T1-T7, modelo adotado, decisões D-H1 a D-H4); rotina de 5 min criada (job 08e250c2, expira em 24/11/2026)
Falta: T1 a T7 (a Execução ainda não existe)
Bloqueio (para quem): Controle/Gabriel: o app barrou os 3 filhos ("5 sessões em andamento, o máximo"). Libere vaga (uma das manut-* terminar) e clique nos cartões da frente H, ou o Controle os abre como irmãos (02_MODELO, seção 8). Os prompts estão nos cartões.
Superfície protegida tocada: nada ainda (previsto: types.ts, só campos opcionais de cancelamento no Envio)
Migration: nada ainda (056_envio_cancelado.sql prevista: 3 colunas aditivas em aurea.envios)
Touch ampliado (precisa do OK do Controle): types.ts · migrations/056 + db/repositories/envios.ts + db/diff.ts (persistir os campos) · components/custody/HistoricoEnvios.tsx (a lista do cliente mora aqui, não em envios/page.tsx) · domain/admin/logistica.ts + página de /admin/logistica (botão) · server/estacao/analise.ts (só guardas)
Testes da branch: não rodou
Linhas para os índices (o Controle aplica no merge): a preencher no fim
Nota: o hook PreToolUse do Write recusa escrever neste caminho (fora da worktree); este arquivo é gravado por PowerShell, como a ficha manda.
