# Pendências de e-mail — resolvem-se juntas, em 23/11/2026 (decisão do Gabriel)

Regra do Gabriel (22/11/2026): **tudo que envolve e-mail fica para amanhã**, quando ele e o Rogério tiverem acesso ao HostGator para ligar os registros DNS. Até lá ninguém tenta "resolver" e-mail; **todo item que depender de e-mail entra aqui**, sempre.

## Destrava tudo
1. Gabriel + Rogério: registros DNS do Resend em `avisos.realolimpico.com.br` (HostGator). Depois, a `RESEND_API_KEY` — o Controle cria a variável na Vercel por MCP/CLI e confere (`EMAIL_REMETENTE` já existe: `Real Olímpico <nao-responda@avisos.realolimpico.com.br>`).
2. Desenhar os **modelos de e-mail** (visual, texto, marca Real Olímpico, sem palavras proibidas pelo jurídico).

## O que depende disso
| Origem | Item | Estado hoje |
|---|---|---|
| Docx 3 | E-mail de confirmação de compra e movimentação (frente C) | código pronto (`src/server/emails/`, fila `aurea.emails_pendentes`, migration 053); **não envia** sem a chave |
| Docx 1 | Aviso de segurança por e-mail (troca de senha, e-mail, Pix; frente A) | código pronto; idem |
| QA Davi B02 | Confirmação de e-mail no cadastro | código do R2 pronto; **só fecha de verdade** se o Supabase de produção desligar o autoconfirm (`mailer_autoconfirm: true` hoje) ou se o caminho `signInWithOtp` funcionar; **fluxo de e-mail nunca testado**; contas antigas (ex.: `a@a.co`) seguem "verificadas" |
| QA Davi B02 | `SUPABASE_SERVICE_ROLE_KEY` precisa estar na Vercel para a conta nova receber a marca de e-mail pendente (conferir) | a conferir |
| QA Davi S01 / docx 1 | "Esqueci minha senha": link real nunca testado; modelo Magic Link do Supabase com `{{ .Token }}` | pendente |
| QA Davi A06 | Promessa "Você recebe um e-mail quando o saque for pago" | texto trocado por "Acompanhe o andamento no Extrato" enquanto o envio está desligado; **voltar a texto de e-mail quando o envio ligar** |
| QA Davi (R2) | "Aguarde 1 minuto para pedir outro link" (reenvio) | texto pronto; testar com e-mail real |
| QA Davi A14 | Dois e-mails de contato (contato@ × suporte@) | decisão de qual vale; depende da caixa configurada no Google Workspace |
| Docx 3 | Custo do envio de e-mail ("ver quanto custa") | Resend: levantar o plano quando a chave existir |
| Sicoob/Bancos | (nenhum) | — |

## Roteiro de amanhã (ordem)
1. DNS no HostGator → verificar o domínio no Resend. 2. Chave → Vercel. 3. Desligar o autoconfirm no Supabase (painel do projeto `vjbqikfamqdttbmaqrxf`, Authentication → Providers → Email) e testar cadastro, confirmação, reenvio e "esqueci minha senha" com um e-mail **de teste do Gabriel**. 4. Modelos de e-mail. 5. Religar os textos do saque (A06). 6. Tester reconfere no ar.
