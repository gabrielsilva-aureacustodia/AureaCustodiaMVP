# Relatório de Modificações — resumo · frente A (segurança)

```
Estrutural hoje:
- Módulo único de confirmação por senha/código (src/server/auth/reautenticacao*.ts) e modal único (src/components/seguranca/)
- Guarda em 14 Server Actions e em definirNovaSenha (auth.ts: superfície protegida, autorizada)
- Evento seguranca.* em audit_log (contrato com a frente C)
- Sem migration, sem variável de ambiente nova, sem src/domain
Você precisa clicar / autorizar:
- Gabriel: modelo "Magic Link" do Supabase com {{ .Token }}
- Controle, depois do deploy: testar "esqueci minha senha" com link real (RA-50) e a tela do modal
```
