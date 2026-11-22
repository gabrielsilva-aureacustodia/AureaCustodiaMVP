# Estudo — pedir a senha de novo nas ações que mexem em dinheiro e em dados

```
Frente:   A · Segurança (manut-seguranca-senha)        Pedido: Rogério, WhatsApp de 02/11/2026
Data:     17/11/2026                                    Estado: padrão adotado; o Gabriel muda quando quiser (D3 e D8)
Moradia sugerida no merge: docs/seguranca/ESTUDO_REAUTENTICACAO.md (o Controle decide)
```

## 1. O risco, em uma frase

Hoje a senha só é pedida **no login**. Quem consegue abrir a conta de um cliente — celular emprestado ou perdido, aba esquecida aberta, cópia do acesso — fica 7 dias dentro dela e faz tudo sem digitar nada: **troca a senha, troca a chave Pix e pede o saque**. O dono perde o dinheiro e ainda fica trancado do lado de fora.

## 2. As opções

| Opção | Como funciona | Segurança | Incômodo para o cliente |
|---|---|---|---|
| **A. Senha a cada ação** | Toda ação sensível pede a senha de novo | Máxima | Alto em compra e venda (digita a cada clique) |
| **B. Senha com janela curta** | Digita uma vez; vale por alguns minutos | Alta; a janela é o único "buraco" | Baixo: quem compra três moedas seguidas digita uma vez |
| **C. Código por e-mail** | Chega um código de 6 dígitos no e-mail da conta | Alta, mas depende da caixa de e-mail do cliente | Médio: espera o e-mail chegar |
| **D. Conta que só entra com Google** | Não tem senha para pedir → usa o código por e-mail (C) | Igual à C | Igual à C |

Padrão do OWASP (referência mundial de segurança de sites): exigir "a credencial atual" antes de trocar senha ou e-mail e antes de transações sensíveis é prática recomendada (Authentication Cheat Sheet, seção *Require Re-authentication for Sensitive Features*, consultada em 17/11/2026).

## 3. Recomendação (é o que já está ligado)

| O que o cliente faz | Como confirma | Vale por |
|---|---|---|
| **Sacar** | senha | só aquela ação |
| **Trocar senha, e-mail, chave Pix ou dados pessoais** | senha | só aquela ação |
| **Pedir retirada física de moeda** (D8) | senha | só aquela ação |
| **Comprar, vender, anunciar, ofertar** | senha | **5 minutos** |

Conta que só entra com Google: o mesmo quadro, com o **código de 6 dígitos enviado ao e-mail da conta**, que vale 10 minutos.

**Não pedimos** (decisão minha, o Gabriel muda): ver telas, depositar, cancelar oferta, ligar aviso por e-mail, pagar fatura de custódia, frete ou retirada com saldo (nesses o dinheiro vai para a própria Real Olímpico — o invasor não ganha nada) e o **primeiro** preenchimento do cadastro (não há Pix antigo para proteger; o saque seguinte já pede a senha).

## 4. O atrito, na prática

Um saque ou uma troca de Pix: **uma digitação**. Compras e vendas em sequência: **uma digitação a cada 5 minutos**. A janela aparece como uma caixinha na própria tela — a pessoa não sai do que estava fazendo e a ação continua sozinha depois de confirmar.

## 5. O custo

- **Senha:** R$ 0 (o Supabase já confere senha para o login).
- **Código por e-mail:** um e-mail por confirmação, só para contas Google. O custo do e-mail está sendo calculado pela frente C (e-mails de movimentação).
- **Desenvolvimento:** dentro da frente A, sem prestador novo.

## 6. O que o Supabase já limita (fato — não criamos trava nossa)

Consulta em 17/11/2026, `supabase.com/docs/guides/auth/rate-limits`:

- conferir senha: **150 pedidos a cada 5 minutos por IP** (picos de até 30);
- conferir código por e-mail: **30 pedidos a cada 5 minutos por IP**;
- pedir um código novo para o mesmo usuário: **1 a cada 60 segundos**.

O limite é por IP e por janela de tempo, **não** bloqueia a conta depois de N erros. Fica registrado como fato; trava de tentativas própria está fora desta frente (regra R10).

## 7. O que o Gabriel precisa fazer (uma coisa, só para contas Google)

O e-mail do código sai do modelo **"Magic Link"** do Supabase, e o modelo padrão envia um *link*, não o código. Para o código aparecer, o modelo precisa conter `{{ .Token }}` (Supabase, "Passwordless email logins", consultado em 17/11/2026). O site não usa login por link, então trocar esse modelo não afeta nada. O texto pronto está na seção "Pendência do Gabriel" do MD de execução. **Sem isso, contas Google recebem um link e não conseguem confirmar** (contas com senha não são afetadas).

## 8. Desenho decidido (lista curta, para o time técnico)

1. **Um módulo só**: `src/server/auth/reautenticacao.ts`. Quem confere senha ou código é ele; nenhuma outra frente implementa isso (contrato A → todos).
2. **A senha é conferida sem mexer na sessão do cliente**: cliente do Supabase sem persistência de sessão, chave publicável; a sessão criada na conferência é descartada na hora.
3. **A prova é um cookie assinado** (`aurea_reauth`): e-mail, momento, nível (`sempre` ou `janela`) e HMAC com o `SESSION_SECRET`. O de nível `sempre` vale 1 minuto e é apagado no primeiro uso; o de `janela` vale 5 minutos. As duas durações moram numa constante, em um arquivo só.
4. **Guarda de duas linhas** na entrada de cada ação: a ação devolve `{ ok:false, precisaSenha:true, metodo, nivel }`, o modal abre e a ação é reenviada sem recarregar a tela.
5. **Conta só Google**: `signInWithOtp` (sem criar usuário) e `verifyOtp` do Supabase; o prazo de 10 minutos é conferido do nosso lado (o do Supabase, de 1 hora, é do projeto inteiro).
6. **Evento de segurança** em `audit_log` para troca de senha, e-mail e Pix (a frente C liga o aviso por e-mail).
7. **Teste de varredura**: lista as ações sensíveis e **falha** se alguma estiver sem a guarda.

## 9. Pontos em aberto (para o Gabriel / Controle)

- **RA-50 — tela de nova senha do link de redefinição** (`definirNovaSenha`, `src/server/actions/auth.ts`): hoje troca a senha **sem pedir a atual** para quem tem a sessão aberta. É exatamente o buraco da conta invadida. Está fora da lista de arquivos da frente A; **peço autorização** ao chat de branch para pôr a guarda nela (quem chega pelo link do e-mail continua sem digitar a senha antiga — o link já prova o e-mail).
- Conta criada pelo painel **sem senha** (RA-43) aparece com login por e-mail mas sem senha: para entrar na confirmação ela usa "esqueci a senha" uma vez.
