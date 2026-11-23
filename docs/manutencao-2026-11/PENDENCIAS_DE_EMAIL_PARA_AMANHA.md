# TAREFA GRANDE PENDENTE — tudo de e-mail (Gabriel resolve em 23/11/2026, por qualquer conta)

Documento ÚNICO de e-mail. Quem abrir isto em qualquer conta/chat sabe o que falta, em ordem. Todo item novo de e-mail entra aqui na hora.

## DECISÕES JÁ TOMADAS (22/11/2026, Gabriel)
- **A conta NASCE CONFIRMADA. Não há confirmação de e-mail no cadastro, nunca.** "As pessoas não conseguem usar a confirmação." O código do B02 (R2) foi revertido: `registerWithEmail` cria a conta e deixa entrar; sem marca `email_pendente`; `salvarCadastro` sem bloqueio; `situacaoDoEmailDaConta` sempre confirmado. O autoconfirm do Supabase (`mailer_autoconfirm: true`) **fica ligado** — não desligar.
- **Regra geral: nunca criar limitação para cadastro.** A pessoa cadastra rápido e fácil.
- E-mail serve só para: troca/recuperação de senha, avisos de segurança, confirmação de compra/movimentação e demais trâmites.
- Nada de e-mail foi feito em 22/11; tudo abaixo é de 23/11.

## Destrava tudo
1. Gabriel + Rogério: registros DNS do Resend em `avisos.realolimpico.com.br` (HostGator). Depois a `RESEND_API_KEY` — o Controle cria na Vercel por MCP/CLI e confere (`EMAIL_REMETENTE` já existe: `Real Olímpico <nao-responda@avisos.realolimpico.com.br>`).
2. Desenhar os **modelos de e-mail** (visual, texto, marca Real Olímpico, sem palavras proibidas pelo jurídico).

## O que falta (depende do item 1)
| Origem | Item | Estado |
|---|---|---|
| Docx 3 | E-mail de confirmação de compra e movimentação (frente C) | código pronto (`src/server/emails/`, fila `aurea.emails_pendentes`, migration 053); não envia sem a chave |
| Docx 1 | Aviso de segurança (troca de senha, e-mail, Pix; frente A) | código pronto; idem |
| QA Davi S01 / docx 1 | "Esqueci minha senha": link real nunca testado; modelo Magic Link do Supabase com `{{ .Token }}` | pendente |
| QA Davi A06 | Promessa "Você recebe um e-mail quando o saque for pago" | texto trocado por "Acompanhe o andamento no Extrato"; voltar ao texto de e-mail quando o envio ligar |
| QA Davi (R2) | "Aguarde 1 minuto" no reenvio de link | texto pronto; testar com e-mail real (o reenvio de link de acesso/senha segue existindo) |
| QA Davi A14 | Dois e-mails de contato (contato@ × suporte@) | decidir qual vale; depende da caixa no Google Workspace |
| QA T6 | A tela de entrar NÃO tem "Esqueci minha senha" ("Esqueci minha senha" na tela de entrar não existe); o cliente não pede link, só a equipe envia | decidir se o botão nasce junto com o e-mail |
| Docx 3 | Custo do envio | Resend: levantar o plano quando a chave existir |
| QA Davi B02 | ~~Confirmação de e-mail no cadastro~~ | **ENCERRADO por decisão: não existe.** Contas antigas com marca pendente não são mais barradas |

## Roteiro de amanhã
1. DNS no HostGator → verificar domínio no Resend. 2. Chave → Vercel. 3. Testar "esqueci minha senha" e avisos com e-mail de teste do Gabriel (autoconfirm continua ligado). 4. Modelos de e-mail. 5. Religar textos do saque (A06). 6. Tester reconfere no ar.
