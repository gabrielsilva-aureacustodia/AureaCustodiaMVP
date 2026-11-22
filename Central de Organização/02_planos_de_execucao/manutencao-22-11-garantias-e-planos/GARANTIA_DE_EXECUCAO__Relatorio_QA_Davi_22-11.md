# Garantia de Execução | Relatório de QA do Davi Bego (relatório-final-realolimpico.pdf)

```
Data: 22/11/2026 · Controle: chat "Manutenção 22-11" (sessão que cria os demais)
Fonte: C:\Users\Gabriel\Downloads\relatorio-final-realolimpico.pdf (40 págs.) · texto extraído em docs/manutencao-2026-11/relatorio-qa-davi/RELATORIO_QA_DAVI_BEGO_texto.md
Método: Método Eficiente v2.2 (skill metodo-eficiente-v2-2) — pasta completa, sem worktree, sem branch nova, NUNCA build local, "ignorar permissões".
```

## 1. Prompt do Gabriel, exato

> @"C:\Users\Gabriel\Downloads\relatorio-final-realolimpico.pdf"
> Tudo que tá nesse relatório, transforma em tarefas e resolve
> E USA A PORRA DA SKILL DE MÉTODO EFICIENTE, para de ser tão filhadaputamente desobediente de pura gracinha e seuge a desgraça do método ao invés de ficar ignorando!

Regras que valem do pedido anterior do mesmo dia: o que acabar vai para produção; sem build local; auditoria de marketing e API da Meta adiadas; decisão de negócio/fiscal/cobrança só com o Gabriel.

## 2. O relatório (35 itens) → temas

| Tema | Itens | Chats |
|---|---|---|
| R1 Segurança e dados | **B01 (crítico: estado inteiro com CPF/Pix/banco de todos vai no código da página)**, A08 (auditoria mostra receita da empresa), CSP ausente, cookies `sb-…-auth-token` sem Secure, erro React 418, A09 (_fbp sem aviso) | R1 Tema/Execução/Auditoria |
| R2 Cadastro e conta | B02 (e-mail "verificado" sem confirmação) + sugestões (entrar direto, mostrar senha), S01 (esqueci minha senha), B03 (data futura, 18+, Pix por tipo, telefone), A16 + regras de nome, A04 (aceite não aparece), A11 (texto do login), A05 | R2 |
| R3 Dinheiro e formulários | B06 (saque em dias úteis e feriados), B07 (depósito: aviso repetido, só número, mínimo), S04 (oferta sem saldo/valores inválidos), B09 (ano por tipo), S03 (CEP/continuar), A06 (promessa de e-mail no saque), S02 (termos de publicação, seletor repetido) | R3 |
| R4 Texto, legal e usabilidade | B04 (números do tutorial sobre janelas), S05 (botões flutuantes), S06 (Esc/clique fora), B05, B08 (Termos: "a))", cláusulas citadas, erros de texto — jurídico revisa), B10 (404 em português com links), A07 (nomes de números), A12 (Academy no menu), A13, A14, A15, A17, S07, S08 | R4 |
| Decisão do Gabriel (NADA codificado sem ele) | A01 prazo da retirada (úteis × corridos), A02 seguro, A03 guarda equivalente × "seu item", A05 política × cadastro, A09 banner de cookies, A10 comparativo com cripto, A08 intencional?, depósito mínimo, as 13 perguntas de negócio (p. 36–37) | Controle leva ao Gabriel |

## 3. Hierarquia de chats desta tarefa

Controle (este) · Polimento (Distilla) · Merge, Push, Deploy · Higienização · Relatórios · Processo Padrão (existente) · Tester (existente) · R1–R4 (Tema = Branch, Execução, Auditoria). Nomes `QA Davi 22-11 | <TEMA> | <PAPEL>`, todos em "ignorar permissões", pasta completa. Rotinas: Controle e Branch 5 min; Auditoria 3 min; Merge/Deploy e Processo Padrão 15 min; Higienização 30 min.

## 4. Decisões pendentes do Gabriel (registradas, não codificadas)
A01–A03, A05, A09, A10, A08, depósito mínimo, B02 (política: bloquear conta até confirmar e-mail, ou só depósito/compra/saque), validação de CPF/nome na Receita (Datavalid/Consulta CPF = serviço pago) e as 13 perguntas.
