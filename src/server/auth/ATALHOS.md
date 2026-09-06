# Atalhos assumidos em `src/server/auth/`

## RA-17 🟡 — contingência do seed

Se o Supabase Auth não estiver configurado, `login()` e `changePassword()` mantêm o caminho
histórico das sete contas do seed. Com `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`, esse
caminho fica inativo e todas as credenciais são tratadas pelo Supabase.

O cadastro novo nunca usa essa contingência. Ele exige configuração do Supabase, decisão
explícita `AUREA_SIGNUP_ENABLED=true` e versões legais. Depois da confirmação, o servidor
provisiona R$ 5.000,00 e seis moedas fictícias para permitir os testes pedidos.

Remover o caminho do seed quando todas as contas dos sócios tiverem sido recriadas e os
ambientes local, Preview e Production estiverem configurados.
