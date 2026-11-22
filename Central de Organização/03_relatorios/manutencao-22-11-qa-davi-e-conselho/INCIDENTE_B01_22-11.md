# Incidente B01 — dados de todos os clientes no código das páginas logadas

```
Data do relatório: 22/11/2026 · Origem: relatório de QA do Davi Bego (19–20/11/2026), item B01
Autor: chat "QA Davi 22-11 | R1 Segurança e dados | Execução" · Estado: CORREÇÃO NO CÓDIGO, AINDA SEM COMMIT/DEPLOY
Decisão de comunicar ANPD/titulares: DO GABRIEL E DO JURÍDICO — este documento não comunica nada a ninguém.
Nenhum dado pessoal de cliente foi copiado para este arquivo.
```

## 1. O que ficou exposto

Qualquer conta **logada** recebia o `AppState` inteiro, por dois caminhos:

1. **No HTML da página** — `src/app/(app)/layout.tsx` passava `initialState={state}` ao `AppProvider`, e o Next serializa as props de Client Components no payload da página (`self.__next_f`).
2. **No polling de 10 s** — `GET /api/state` devolvia o mesmo objeto inteiro a cada ciclo.

O objeto continha, de **todos** os usuários:

| Lista | Dado de terceiro exposto |
|---|---|
| `users` | nome, e-mail, saldo, moedas e recibos; `cadastro` (CPF, nome completo, nascimento, telefone, endereço completo, chave Pix, banco, agência, conta); campo `pass` quando existia (legado: o Supabase Auth guarda hoje só o hash, mas o campo existia no tipo) |
| `envios` | e-mail do dono, código de rastreio, endereço de postagem, dados do frete |
| `deposits` | e-mail, valor, origem, referência externa do pagamento |
| `saques` | e-mail, valores, dados bancários/Pix do saque |
| `faturasCustodia`, `planosCustodia`, `retiradas`, `reservas` | e-mail, valores, dívida, comprador/vendedor |
| `buyOrders`, `sellOffers`, `trades` | e-mail de comprador e vendedor, comissão, valor pré-pago |
| `analises` | operador da bancada, pesos |

Quem não estava logado **não** recebia o objeto (as rotas redirecionam para `/entrar`) — conferido pelo próprio relatório e pelo código do layout.

## 2. Desde quando

Pelo `git log`: o layout autenticado e a rota `/api/state` nasceram no mesmo commit, **`ea0a5f3` (15/08/2026, "Fase 2: as 12 telas…")**, já com o estado inteiro. O desenho nunca foi diferente. A exposição **existe no código desde 15/08/2026**; o que muda, para efeito de impacto, é desde quando o site esteve **publicado com contas reais**:

- Até 20/09/2026 o ambiente era "MVP de teste" com 7 contas de sócios (CLAUDE.md) — dado de teste/sócios.
- **A data de entrada de cliente real e a quantidade de contas de cliente (não sócios) precisam ser lidas no banco/Supabase pelo Gabriel ou por quem tem acesso** — este chat não consultou produção e não afirma esse número. Ver §5.

## 3. Quem podia ver

Só quem tinha **conta logada** (cadastro aberto ao público em `realolimpico.com.br/cadastrar`, e a confirmação de e-mail era só um selo — item B02 do mesmo relatório). Na prática: **qualquer pessoa que criasse uma conta** podia ler, no código da página ou na resposta de `/api/state`, os dados de todos os demais clientes. O QA do Davi reproduziu com uma conta de teste.

## 4. A correção (no código, pendente de commit/deploy)

- Nova função pura `estadoDoUsuario(state, email, pseudônimo)` — `src/domain/estado-do-usuario.ts`. O cliente passa a receber a **visão dele**: só a própria conta (sem `pass`), só as próprias listas pessoais; o livro de ofertas e o histórico seguem públicos (preço é público), mas e-mail de terceiros vira **pseudônimo opaco** (HMAC-SHA256 com `SESSION_SECRET`), comissão/valor pré-pago/códigos de moeda de terceiros saem; totais públicos (estoque, volume, auditoria) vão **já somados** em `state.publico`.
- Aplicada nos **dois** caminhos: `(app)/layout.tsx` e `/api/state`. A ação `situacaoDoBloqueioPorPendencia` (lista de vendedores pausados) também devolvia e-mails de terceiros e passou a devolver pseudônimos.
- Teste automatizado `src/domain/estado-do-usuario.test.ts` (duas contas com valores sentinela: o texto serializado da visão de um não contém e-mail, CPF, Pix, banco, endereço, telefone, senha, rastreio ou depósito do outro, nem o e-mail de terceiros em ofertas/lances/negociações).
- O servidor continua sendo quem decide: nenhuma Server Action mudou; `mutateState()` segue lendo o estado completo.

**Outras superfícies que NÃO são o B01 mas devem ser olhadas pelo Tester no ar:** Server Actions e rotas `/api/*` que devolvam dado de outras contas (a varredura estática deste chat não achou nenhuma que devolva o estado), e o histórico do navegador/CDN: `/api/state` já respondia `no-store`, então não há cópia em cache de CDN esperada.

## 5. O que falta e é do Gabriel / jurídico (nada disso foi feito pelo agente)

1. **Existiam clientes reais (não sócios) com dados cadastrais completos durante a janela?** Quantos, desde quando. Só o banco de produção responde.
2. **Houve acesso indevido?** Este chat **não** leu os logs da Vercel (sem credencial de leitura nesta sessão; leitura sem alteração é o passo certo: `get_runtime_logs` por rota `/api/state` e por contas criadas em série no Supabase Auth). Padrão suspeito: muitas contas novas com e-mail inexistente seguidas de muitas leituras de `/api/state`. O Davi criou contas de teste — separar as dele.
3. **Comunicação à ANPD e aos titulares (LGPD art. 48):** depende de haver risco ou dano relevante aos titulares e de haver titulares reais afetados. **Decisão do Gabriel com o jurídico**; o prazo que a ANPD indica para comunicar é de 3 dias úteis após a ciência — a ciência, por este relatório, é de 20/11/2026 (data do relatório do Davi). Isto é apontamento, não parecer.
4. **Rotação de credenciais?** Nenhum segredo de ambiente estava no objeto (o `pass` legado, se houver linha antiga com ele, merece conferência no banco: se existir, trocar essas senhas).
5. Registrar a decisão em `RISCOS_ASSUMIDOS.md` quando tomada.

## 6. Cronologia

| Data | Fato |
|---|---|
| 15/08/2026 | Layout + `/api/state` nascem entregando o estado inteiro (`ea0a5f3`) |
| 19–20/11/2026 | QA do Davi reproduz e reporta (B01, crítico) |
| 22/11/2026 | Correção escrita e testada localmente (typecheck + vitest); sem commit, sem deploy |
| a definir | Deploy pelo chat Merge/Deploy; conferência pelo Tester com 2 contas de teste do repositório |

## 7. Decisão do Gabriel e fechamento (22/11/2026)

- **Comunicação à ANPD e aos titulares: não haverá.** Decisão do Gabriel: ninguém soube do problema além do QA, a falha apareceu em teste do Davi, e o que importa é corrigir já para não acontecer mais. Não envolve o jurídico. (Registro de decisão, não parecer.)
- **Correção:** R1 (commit `4c2df93`, "B01 visão do estado por usuário") publicada na `main` em 22/11/2026; o servidor passa a entregar a cada tela só a visão da conta logada (teste de payload com 11 casos). Conferência no ar: Tester, com contas de teste do repositório.
- **Senha legada:** a coluna `aurea.users.pass` tem **0** linhas preenchidas (conferido em 22/11, leitura) — nenhuma senha esteve no objeto.
- **Logs de acesso:** os logs de runtime da Vercel no plano atual guardam **1 hora**; os de 19–20/11 não existem mais e não há como provar nem descartar uso indevido por eles. O que se pôde ver (leitura): cadastros por dia em `auth.users` — 16/11: 8, 17/11: 22, 18/11: 16, 19/11: 7, 20/11: 9, **21/11: 26**; dos últimos 4 dias, 2 de 42 com cara de teste. O dia 21 destoa; pode ser o lançamento, não há como afirmar. Para o futuro: com o plano Pro a retenção sobe para 1 dia.
