# Manutenção 22-11 | T6 PWA iPhone e login Google no app — MD de execução

## RETOMADA
- Escopo: item 10b do docx (Rogério: app não funciona, principalmente no iPhone). Sem aparelho. Pasta completa, sem build, sem commit/push (o Controle faz).
- Itens: (1) callback tolerante; (2) aviso no login em modo app; (3) avaliar start_url; (4) conferir cookies; (5) testes; (6) docs.
- Achado inicial: a tela de entrar NÃO tem "Esqueci minha senha" e não há ação de servidor para pedir o link (só `src/server/admin/usuarios.ts`). Criar seria backend novo no fluxo de senha, fora do pedido. O aviso aponta para o atendimento.
- Arquivos que vou tocar: `src/app/entrar/callback/route.ts` (+test), `src/components/login/LoginForm.tsx` e um componente novo de aviso (+test), `docs/pwa/*`.
- Status: ver bloco "Feito" abaixo (atualizado ao fim).

## Feito (22/11/2026)
1. Callback tolerante: `src/app/entrar/callback/route.ts` (+5 testes em `route.test.ts`).
2. Aviso em modo app: `AvisoDoGoogleNoApp.tsx` (+ `.test.ts`), ligado em `LoginForm.tsx`, estilo `.auth-hint` em `login.css`. Botão do Google intacto.
3. `start_url`: avaliado, mantido em `/inicio`; motivo em DIAGNOSTICO_PWA ("T6").
4. Cookies conferidos por leitura e documentados (tabela no DIAGNOSTICO).
5. Vitest `src/components/login src/app/entrar src/lib/pwa src/middleware.test.ts`: 9 arquivos, 122 testes verdes. `tsc --noEmit`: nenhum erro nos meus arquivos; há erros em `Conselho.tsx`/`kpis.test.ts` (T5, outra sessão, não meus).
6. Docs: DIAGNOSTICO_PWA (bloco T6) e ROTEIRO_IPHONE_REAL (passo 5) atualizados.
## Pendente / decisão do Gabriel
- Não existe "Esqueci minha senha" para o cliente; criar é backend novo no fluxo de senha (não feito).
- Conferência no aparelho: passos 4, 5 e 7 do roteiro.
