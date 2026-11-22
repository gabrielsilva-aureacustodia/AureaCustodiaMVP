# Relatório de Modificações (detalhado) — frente A (segurança)

Base comparada: 9e21fe1 (branch claude/manut-seguranca-senha-606459, sem commit).

| Item | Tipo | Path | Consequência |
|---|---|---|---|
| Módulo de reautenticação | contrato / crítico | `src/server/auth/reautenticacao*.ts` | Único lugar que confere senha atual (sem trocar a sessão) ou código de 6 dígitos por e-mail; prova em cookie assinado (`aurea_reauth`, HMAC com `SESSION_SECRET`); janela de 5 min em compra/venda, `sempre` em saque/troca de dados |
| Guarda em 14 ações | crítico (superfície protegida: Server Actions) | `src/server/actions/{account,market,sell,payments,reserva,custody}.ts` | Ação sem confirmação devolve `{ ok:false, precisaSenha:true }`; estado não muda |
| Guarda em `definirNovaSenha` | crítico (superfície protegida, autorizada pelo Controle) | `src/server/actions/auth.ts`, `src/server/auth/sessao-de-recuperacao.ts` | Trocar a senha sem a atual só vale para sessão aberta por link de e-mail há ≤30 min; **depende do `amr` que o link real grava: conferir em produção** |
| Modal único + rede central | pasta nova | `src/components/seguranca/**`, `AppProvider.run()` | Ação sensível pede confirmação e é reenviada sem recarregar; telas esquecidas também são cobertas pela rede central |
| CSS novo | estrutural | `src/styles/seguranca.css`, `globals.css` (+4 linhas) | Importado antes de `responsive.css` (cascata preservada) |
| Evento de segurança | contrato A→C | `src/server/auth/reautenticacao-eventos.ts` → `aurea.audit_log` | Ações `seguranca.senha_alterada`, `seguranca.email_alterado`, `seguranca.pix_alterado`; a frente C envia o aviso por e-mail (`avisarSeguranca`) |
| Testes | estrutural | varreduras do servidor e das telas | Falham se uma ação sensível ficar sem guarda ou sem `confirmar(` na tela; ação nova entra na lista no mesmo commit |

**Não mudou de estrutura:** `src/domain/**`, `store/types.ts`, `src/lib/email/**`, login/cadastro (frente D), resto de `custody.ts` (frente B). Sem migration (051 não usada). Sem variável de ambiente nova.

**Fora da lista Touch literal da ficha (anotados no MD):** 12 testes de ação existentes (mock da guarda), 3 páginas, `ModalOfertaPrePaga`, `ReservasEmAberto`, `ModalSolicitarRetirada` (área da frente I), `AppProvider.tsx` e `auth.ts` (autorizados).

**Atualizações de MD de pasta / ENV:** nenhuma feita pela branch. Para o Controle no merge: RA-50 em `RISCOS_ASSUMIDOS.md`, `src/server/actions/ATALHOS.md`, `src/server/auth/ATALHOS.md`; `src/server/auth/README.md` (arquivos novos); onde mora o `ESTUDO_REAUTENTICACAO.md`.
