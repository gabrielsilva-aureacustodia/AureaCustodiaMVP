# Auditoria final do sistema (30/10/2026)

Escopo desta rodada: código e configuração em `origin/main` (46fa74d). **Produção não foi lida**: a CLI da Vercel não tem login da conta da Áurea neste ambiente e não há credencial do banco (ver "Limites"). Nada foi escrito em produção ou em API externa.

## Resultado em uma tabela
| Área | Situação | Evidência |
|---|---|---|
| Dependências (`npm audit --omit=dev`) | **Corrigido**: 5 vulnerabilidades (2 críticas, 3 altas) → 0 | `next` 15.5.23→15.5.28, `node-forge` →1.4.2, `sharp` →0.35.5, `dompurify` →3.4.17, `source-map-js`; só o `package-lock.json` mudou (faixas do `package.json` já permitiam) |
| Suíte, lint, typecheck, build | Verdes depois da atualização | 1451 testes ok (1 pulado), 0 erros de lint (15 avisos antigos), `tsc` ok, `next build` ok |
| Webhook Mercado Pago | OK | HMAC-SHA256 do manifesto, `timingSafeEqual`, janela de 5 min; sem `MP_WEBHOOK_SECRET` só aceita com `MP_WEBHOOK_ALLOW_UNSIGNED=true` (fecha por padrão) |
| Painel `/admin` | OK | Todas as Server Actions de `src/server/actions/admin/*` passam por `permissaoParaAcao`/`comPermissao(s)`; ações de equipe que vivem em `custody.ts` (`bloquearReciboPorDebito`, `desbloquearRecibo`, `avancarStatusRetirada`, `advanceAnalysis`) conferem permissão |
| Crons | OK no código | Autenticação corrigida na ordem 3 (PR #9); `vercel.json` travado por teste |
| RLS (migrations) | OK no código | As 52 tabelas criadas nas 47 migrations têm `ENABLE ROW LEVEL SECURITY`. **Não comparado com o schema de produção** |
| Ledger com hash encadeado | Código e testes existem (`hash.test.ts`, `ledger.test.ts`); **cadeia de produção não verificada** |
| Integrações Correios/NFS-e | Ver `2026-10-30--integracoes-gov-correios.md` |

## Corrigido neste PR
- Atualização de dependências com vulnerabilidade conhecida (lockfile). `next` 15.5.28 fecha as falhas críticas do Next.js; `node-forge` é usado na assinatura da NFS-e e, por isso, **vale uma emissão em produção restrita antes de ligar `NFSE_AMBIENTE=producao`** (a NFS-e não tem teste de servidor — lacuna já registrada).

## Decisão do Gabriel / só documentado
1. **Conferência de produção pendente** (Etapas 2 e 3 da ordem): precisa de acesso somente-leitura ao banco e da CLI da Vercel logada. Roteiro em `ACESSO.md` (fora do Git).
2. Testes de servidor da NFS-e (maior lacuna fiscal).
3. `advanceAnalysis` sem tela e texto da bancada sobre "marcado como Recebido na Logística" (agora automático).
4. Plano da Vercel, `CRON_SECRET`, `CORREIOS_*`, `NFSE_*`, `MP_*`, `SUPABASE_*`: presença **não conferida**.
5. RLS e policies de produção x migrations: não conferidos (pode haver diferença se alguma migration foi aplicada à mão).

## Limites
Sem login na Vercel da Áurea e sem credencial do banco, não há como afirmar nada sobre dados, usuários, cadeia de hash, NFS-e emitidas, cobranças do Mercado Pago ou execuções dos crons.
