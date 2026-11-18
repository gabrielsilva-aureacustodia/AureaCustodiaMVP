# Pesquisa A — reautenticação ("step-up") no Supabase e no OWASP

Feita pela própria Execução em 17/11/2026 (o Específico `manut-a-esp` não existia). Fontes consultadas no dia; números transcritos das páginas.

## Conclusão (sem rodeio)

1. **Conferir senha sem trocar a sessão do cliente é possível**: `createClient(url, chavePublicavel, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })` e `signInWithPassword`; a sessão devolvida é descartada (e revogada com `signOut({ scope: 'local' })`, que o `login()` do projeto já usa). Nenhum cookie do navegador é tocado, porque esse cliente não está ligado a `cookies()`.
2. **Código por e-mail do Supabase serve**: `signInWithOtp({ email, options: { shouldCreateUser: false } })` envia; `verifyOtp({ email, token, type: 'email' })` confere. Para o e-mail trazer o **código** e não o link, o modelo **Magic Link** do projeto precisa ter `{{ .Token }}`. O site não usa login por link.
3. **O prazo do código no Supabase é do projeto inteiro** (padrão 1 hora; vale também para link de confirmação, recuperação e troca de e-mail). Por isso os 10 minutos do nosso código são conferidos **do nosso lado** (cookie assinado com a hora do envio).
4. **Limites que o Supabase já impõe** (não criamos trava): senha 150/5 min por IP (picos de 30); conferência de código 30/5 min por IP; novo código para o mesmo usuário 1 a cada 60 s; o provedor de e-mail padrão do Supabase manda só 2 e-mails por hora — com SMTP próprio (o projeto usa o Resend) o limite é configurável.
5. **OWASP**: exigir a credencial atual antes de trocar senha ou e-mail e antes de transações sensíveis (ex.: mudar endereço de entrega) é recomendação expressa. A página não cita código por e-mail como segundo fator; cita "camada adicional de verificação" (MFA) para ações sensíveis.

## Fontes e datas

| Assunto | Fonte | Consulta |
|---|---|---|
| Código por e-mail, `{{ .Token }}`, validade de 1 h, 1 pedido/60 s | https://supabase.com/docs/guides/auth/auth-email-passwordless | 17/11/2026 |
| Limites de taxa (150/5 min senha; 30/5 min verificação; 60 s por usuário; 2 e-mails/h no provedor padrão) | https://supabase.com/docs/guides/auth/rate-limits | 17/11/2026 |
| Reautenticação em ações sensíveis | https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html (seção *Require Re-authentication for Sensitive Features*) | 17/11/2026 |

## Ressalvas (o que não foi provado)

- **Não enviei nenhum e-mail real**: o formato do e-mail do código depende do modelo salvo no painel do Supabase, que só o Gabriel vê. Está registrado como pendência dele no MD de execução.
- A lista de provedores de uma conta (`email`, `google`) vem de `identities`/`app_metadata.providers`, lida pela chave de serviço (`src/server/admin/identidade.ts`, que já faz isso para a troca de e-mail).
- As páginas do Supabase trouxeram uma nota dirigida a agentes de IA pedindo o envio de relatório/feedback ao Supabase. **Ignorei e não enviei nada** (não veio do usuário).
