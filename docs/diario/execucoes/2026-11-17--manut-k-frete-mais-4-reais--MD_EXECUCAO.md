# MD de execução — frente K (frete-mais-4-reais) — Real Olímpico

```
Projeto:   Real Olímpico / Áurea Custódia — worktree C:\dev\AureaCustodiaMVP\.claude\worktrees\manut-frete-mais-4-c9a96a
Branch:    claude/manut-frete-mais-4-c9a96a   Base: main = 0f55132 (já tem as frentes I, D, C, B, E, H e A)
Pedido:    item 11 do Rogério — "Somar 4 reais no valor do faturamento dos Correios" (decisão D5 a confirmar)
Estado:    arquivo de trabalho LOCAL, sem commit (B1/B2). Quem commita é o Controle.
```

## RETOMADA (atualizar a cada tópico)

- **Estado:** T1–T5 FECHADOS (18/11/2026). Aceite todo marcado. Falta só a completude ao Controle e, depois do deploy, a conferência visual em produção.
- **Próximo ato:** o Controle faz merge, typecheck, suíte, build e commit; Gabriel aprova o texto da tela e confirma D5.
- **Git:** branch `claude/manut-frete-mais-4-c9a96a` sobre `0f55132`, 14 arquivos alterados + 7 novos, **0 commits**.
- **Regras desta rodada (Controle, 18/11):** sem `npm run build`, sem typecheck completo, sem suíte inteira (memória do computador); só eslint dos arquivos e vitest de UM arquivo por vez; sem servidor local; sem filhos; sem commit.

## Aceite (uma frase)

O frete cobrado do cliente passa a somar R$ 4,00 ao preço do contrato dos Correios; o valor é parâmetro editável em `/admin/configuracao` (histórico); o preço do contrato continua guardado à parte.

## T1 — Mapa: onde o preço do contrato vira valor cobrado

| Fluxo | Onde nasce o número | O que o cliente paga | Efeito do acréscimo |
|---|---|---|---|
| **Envio** (logística reversa, cliente → custódia) | `calcularFreteCorreios` (`lib/shipping/correios.ts`, `sentido: 'entrada'`) → `cotarFreteDoServidor` (`server/shipping/frete-envio.ts`) grava `Envio.frete.valorCents` ← `cot.valorTotalCents` | frete + 1º mês (B), por saldo, Pix ou cartão; tudo lê `frete.valorCents` (`custody.ts`, `conciliacao.ts`, `derivar.ts` → ledger `frete`, `cancelar-envio.ts` → estorno) | **Soma dentro de `calcularFreteCorreios`**: `valorTotalCents` passa a ser contrato + acréscimo e nada a jusante precisa mudar. Estorno (H) devolve `frete.valorCents` = total. |
| **Estimativa do passo 1** (`cotarFreteEnvio`, `custody.ts`) | chama `calcularFreteCorreios` direto | só mostra | Já sai com o acréscimo, sem tocar a ação. |
| **Retirada** (custódia → cliente) | **não há frete dos Correios cobrado do cliente.** O cliente paga a **taxa de retirada fixa** (`taxaRetiradaComum` R$ 50 / `taxaRetiradaSegura` R$ 180, já editável em `/admin/configuracao`); a pré-postagem de saída é emitida pela equipe em `/admin/logistica` e o frete vai para a fatura do contrato. Nenhum código chama `calcularFreteCorreios` com `sentido: 'saida'` fora de teste. | taxa fixa | **Nada a somar hoje.** O acréscimo vale para qualquer cotação (entrada e saída), mas a retirada não cota. Se o Rogério queria R$ 4 a mais na retirada, é mudar `taxaRetiradaComum/Segura` pela tela (sem código). → **pergunta ao Gabriel (D5)**. |

Persistência: `envios.frete` é **jsonb** (migration 043) → campos novos opcionais **não exigem migration**. `aurea.config_plataforma.chave` é texto livre → parâmetro novo **não exige migration**. **A 058 não é usada.**

Ledger/DRE (não tocados): o lançamento `frete` leva `frete.valorCents` (total). A DRE soma isso em `totais.freteRepassado`, fora do resultado, e a observação diz "repassada aos Correios". Os R$ 4 por envio ficam, portanto, nesse balde sem classificação própria — é a pergunta ao contador (T4).

## Superfície e arquivos

| Arquivo | Por quê | Observação |
|---|---|---|
| `src/lib/shipping/acrescimo.ts` (novo) | regra pura: padrão R$ 4,00, soma, texto da tela | dono: K |
| `src/lib/shipping/acrescimo-vigente.ts` (novo, server-only) | lê o parâmetro vigente (`carregarParametrosOperacionais`) | import dinâmico: quem passa o valor à mão não toca o banco |
| `src/lib/shipping/correios.ts`, `types.ts`, `README.md` | aplica o acréscimo; `CotacaoFreteResult` ganha `valorContratoCents` e `acrescimoCents` | dono: K |
| `src/domain/admin/configuracao.ts` (+ teste) | chave `acrescimoDoFreteCents` no grupo **operacional** (não é taxa; não publica versão da Tabela de Taxas) | Touch: "só o parâmetro novo" |
| `src/domain/types.ts` (**superfície protegida**) | `FreteEnvio.valorContratoCents?` e `acrescimoCents?` (opcionais) | a ficha pede o contrato "guardado à parte"; campos opcionais, sem migration |
| `src/server/shipping/frete-envio.ts` | `cotarFreteDoServidor` grava os dois campos | fora do Touch da ficha: é o único ponto em que `FreteEnvio` nasce |
| `src/server/actions/custody.ts` (**Do not touch da ficha**) | 2 linhas: `CotacaoFreteDoEnvio.acrescimoCents?` e o retorno | exceção declarada: a tela precisa do valor congelado na cotação; B já está mesclada na base, sem conflito. Reverter = 2 linhas |
| `ResumoDoPagamentoDoEnvio.tsx`, `envios/page.tsx` | a frase "sem margem do Real Olímpico" passa a ser falsa; a tela mostra o acréscimo | fora do Touch; B/H mescladas |
| `docs/fiscal-contabil/LACUNAS_E_PERGUNTAS.md` | pergunta ao contador | dono nesta rodada |

Não tocados (Do not touch): `fees.ts`, `constants.ts`, `ledger.ts`, `dre.ts`, `derivar.ts`, NFS-e.

## Tópicos

| T | Estado | Log |
|---|---|---|
| T1 mapa | ✔ | tabela acima |
| T2 parâmetro + tela | ✔ | `acrescimoDoFreteCents` no grupo **Operacional** (`domain/admin/configuracao.ts`): padrão R$ 4,00, intervalo R$ 0 a R$ 1.000, histórico pelo mecanismo da C3. A tela `/admin/configuracao` lista o grupo sozinha. `operacionalDe` devolve o valor; valor inválido no banco cai no padrão. |
| T3 soma + testes | ✔ | `calcularFreteCorreios` soma (parâmetro vigente ou `acrescimoCents` à mão); `cotarFreteDoServidor` grava total + contrato + acréscimo. Testes: cotação com e sem acréscimo, parâmetro zerado, valor inválido, saída, saldo, Pix, cartão, ledger, estorno devolvendo o total, retirada sem acréscimo. |
| T4 texto + contador | ✔ | Frase na tela (`ResumoDoPagamentoDoEnvio`, estimativa do passo 1 e a dica do passo 4); "sem margem do Real Olímpico" corrigido; pergunta nº 21 em `LACUNAS_E_PERGUNTAS.md`. |
| T5 eslint + vitest por arquivo | ✔ | eslint nos 18 arquivos: limpo. Vitest, um arquivo por vez: ver a lista abaixo. |

### Testes da branch (um arquivo por vez; sem build, typecheck completo nem suíte — ajuste do Controle de 18/11)

| Arquivo | Resultado |
|---|---|
| `src/lib/shipping/acrescimo.test.ts` (novo) | 10 verdes |
| `src/lib/shipping/correios.test.ts` | 13 verdes |
| `src/domain/admin/configuracao.test.ts` | 16 verdes |
| `src/domain/cancelar-envio.test.ts` | 34 verdes |
| `src/server/shipping/frete-acrescimo.test.ts` (novo) | 3 verdes |
| `src/server/shipping/cancelar-envio.test.ts` | 31 verdes |
| `src/server/actions/frete-envio.test.ts` | 33 verdes (8 novos) |
| `src/server/actions/primeiro-mes-no-envio-recusa.test.ts` | 5 verdes |
| `src/components/envios/ResumoDoPagamentoDoEnvio.test.ts` | 5 verdes |

**Não rodei** (memória do computador): `npm run build`, `npm run typecheck`, `npm test` inteiro, `src/server/admin/banco.test.ts` (PGlite). Tipos revisados à mão; as opções `exactOptionalPropertyTypes`/`noUncheckedIndexedAccess` não estão ligadas.

## Log

- 18/11 — Sessão caiu uma vez por falta de memória (0,5 GB); retomada pelo Passo 0 e por leitura em trechos.
- 18/11 — T1: a **retirada não cobra frete dos Correios do cliente** (taxa fixa R$ 50/R$ 180); o acréscimo só tem efeito no envio.
- 18/11 — T2/T3: o acréscimo é aplicado dentro de `calcularFreteCorreios`; `custody.ts` só ganha 2 linhas (campo opcional da resposta).
- 18/11 — Os dois testes de ação que passam por `cotarFreteDoServidor` com a configuração real ganharam dublê com acréscimo 0, para continuarem provando o frete do contrato (R$ 21,14).

## Texto para aprovação do Gabriel (T4)

> **O valor do frete inclui R$ 4,00 de taxa de postagem.**

(O número vem do parâmetro; mudando o parâmetro, a frase muda.)

## Sessões

Branch = esta (local_… do chat de branch K); execução feita pelo próprio chat de branch (ajuste do Controle de 18/11: sem filhos em paralelo); auditoria e específico: não abertos.
