# Ficha da frente A — Segurança: senha nas ações sensíveis

```
ID / branch:   A · manut-seguranca-senha          Onda de merge: 2          Migration reservada: 051 (só se precisar)
Item do Rogério: 1            Prazo: 30/11/2026   Base: 9e21fe1
Aceite em uma frase: quem invadir uma conta não consegue sacar, comprar, vender, nem trocar senha, e-mail ou Pix sem a senha (ou o código) do dono.
```

## Pedido do Rogério (as palavras dele)
"Estou preocupado com a segurança do site, melhorar a segurança conforme WhatsApp de 02/11: usar senha para retirar dinheiro, para comprar, para vender, mudar dados pessoais, pois alguém pode invadir e mudar senha e dado de Pix do usuário; estudar jeito seguro."

## Aceite
- [ ] **Estudo** `ESTUDO_REAUTENTICACAO.md` (até 2 páginas, linguagem de sócio): a ameaça (conta invadida troca senha e Pix e saca), as opções (senha atual a cada ação · senha com janela curta · código por e-mail · conta só Google), a recomendação, o atrito para o cliente e o custo.
- [ ] **Módulo único** `src/server/auth/reautenticacao.ts`: confere a senha atual contra o Supabase Auth **sem trocar a sessão do cliente** (cliente sem persistência de sessão, chave publicável) e guarda a prova numa janela curta (cookie assinado ou estado de sessão). Conta que **só entra com Google** (sem senha) confirma por **código de 6 dígitos no e-mail**, de validade curta.
- [ ] **Guarda de uma linha** na entrada de cada ação sensível: `solicitarSaque`, `changePassword`, `verificarTrocaEmail`, `updatePersonal` e `salvarCadastro` (quando muda Pix ou dado pessoal), `buyLot`, `publishBid`, `iniciarCompraDireta`, oferta pré-paga (`reserva.ts`), `publishOffer`, `sellToBid`, e `solicitarRetirada` (D8).
- [ ] **Um modal só** (`src/components/seguranca/ModalConfirmarSenha.tsx`, Client Component): a ação devolve `{ ok:false, precisaSenha:true }`, o modal abre, o cliente confirma e a ação é reenviada **sem recarregar a tela**. Foco preso, Esc fecha, alvo de toque 44 px, claro e escuro.
- [ ] Toda troca de senha, e-mail ou Pix emite um **evento de segurança** gravado em `audit_log` (contrato A→C: a frente C envia o aviso por e-mail; sem C, fica só no log).
- [ ] **Nenhum caminho sensível sem guarda:** teste que lista as exportações sensíveis e **falha** se uma estiver sem a chamada.
- [ ] Testes: módulo (senha certa/errada, janela vencida, conta só Google, código vencido), ações com e sem confirmação. `npm run typecheck`, `npm test` ao fim.

## Ler (e só isto)
- `CLAUDE.md` · `RISCOS_ASSUMIDOS.md` (na raiz; só as linhas de senha, sessão e Google) · `src/server/auth/README.md`, `client.ts`, `config.ts`, `provisioning.ts` · `src/server/session*.ts`
- `src/server/actions/account.ts` (todas as sensíveis acima), `auth.ts` (`login`, `definirNovaSenha`), `market.ts`, `sell.ts`, `payments.ts` (`iniciarCompraDireta`), `reserva.ts`, `custody.ts` (**só** `solicitarRetirada`)
- `src/components/account/AccountModals.tsx`, `ModalCadastro.tsx` (onde o cliente troca Pix) · `src/server/db/derivar.ts` (como `audit_log` é gravado)

## Touch
- `src/server/auth/reautenticacao*.ts` (novo) · `src/components/seguranca/**` (novo) · `src/styles/` (só um arquivo novo de CSS, importado antes de `responsive.css`)
- Uma linha de guarda em cada ação listada acima (`account.ts`, `market.ts`, `sell.ts`, `payments.ts`, `reserva.ts`) e **uma** em `custody.ts` (`solicitarRetirada`)

## Do not touch
- `src/domain/**` (superfície protegida) · `src/lib/email/**` (C) · `src/components/login/**` e `src/app/entrar|cadastrar` (D) · o resto de `custody.ts` (B)

## Fora de escopo
Autenticador por aplicativo (TOTP), captcha, limite de tentativas criado por nós (R10: o Supabase já limita o login — **registre como fato**, não crie trava), bloqueio por dispositivo ou IP.

## Decisões pendentes (padrão adotado até o Gabriel mudar)
- **D3:** pedir senha sempre em saque e em troca de Pix, senha, e-mail e dados; em compra e venda, **janela de 5 minutos**. Conta só Google: código por e-mail.
- **D8:** a retirada física de moedas também pede.
- O valor da janela mora numa constante em um único arquivo, para mudar em uma linha.

## Tópicos
| T | O quê | Aceite do tópico |
|---|---|---|
| T1 | Estudo (com o Específico) e decisão do desenho | `ESTUDO_REAUTENTICACAO.md` escrito |
| T2 | Módulo de reautenticação + testes | senha, janela e código funcionam isolados |
| T3 | Guardas nas ações + teste "nenhuma sem guarda" | teste verde |
| T4 | Modal único e ligação nas telas (saque, Pix, compra, venda, retirada, dados) | fluxo completo no navegador local |
| T5 | Evento de segurança em `audit_log` + testes finais | typecheck e suíte da branch verdes |

## Específico (sim)
Pesquisa: padrão de reautenticação ("step-up") do OWASP; como chamar `signInWithPassword` no servidor **sem** substituir a sessão; OTP por e-mail do Supabase e limites de envio. Entrega com fontes e data.

## Contratos e superfície protegida
- Server Actions: só guardas de uma linha, dentro do pedido. Nada em `domain/`.
- A→C: evento de segurança. A→todos: o módulo é o único lugar que confere senha.
