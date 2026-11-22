# MD de execução — Manutenção 22-11 | T2 Isenção Áurea e PJ

## RETOMADA (atualizar a cada tópico)

- **Estado (22/11/2026):** N1 e N2 prontos no código local, com testes verdes e typecheck limpo. Nada commitado, nada ligado em produção. Falta: Gabriel confirmar e-mails (§4.4) → Controle cria as variáveis → Merge/Deploy.
- **Variáveis criadas (22/11, depois da confirmação do Gabriel):** `NEXT_PUBLIC_AUREA_CONTA_PROPRIA_EMAIL` e `NEXT_PUBLIC_AUREA_CONTA_CEO_EMAIL` na Vercel (projeto aurea-custodia-mvp; production, preview e development; tipo plain, porque `NEXT_PUBLIC` vai ao navegador) e no `.env.local` (ignorado pelo Git). Elas só passam a valer num deploy NOVO, que leva junto o código de isenção ainda sem commit. Antes disso a produção segue sem isenção.
- **Sem build local, sem commit, sem push.** Quem faz é o chat Merge/Deploy.
- **Plano:** `docs/manutencao-2026-11/garantias/PLANO_HIPERDETALHADO__Manutencao_Pendencias_22-11.md`, T2.

- **REGRA CORRIGIDA (Gabriel, 22/11, via Controle):** e-mails confirmados (Áurea = rogeriosiqueira@pbh.gov.br; CEO = siqueiraroger1@gmail.com). O CEO NÃO paga custódia em nenhuma moeda dele (ciclo, entrada, compra); comissão normal com clientes; Áurea↔CEO sem comissão. Cliente que compra do CEO ou da Áurea paga a custódia dele. Implementado: `ehIsentoDeCustodia` (Áurea ou CEO) em `isencao.ts`, usada em `custodia-da-moeda.ts`, `cobranca-de-entrada.ts`, `market.ts` e na tabela da negociação (comprador isento ⇒ custódia 0). Testes atualizados (CEO↔cliente nos dois sentidos, moeda e ciclo do CEO). PJ confirmado. As variáveis continuam por criar pelo Controle; a conta da Áurea na `src/server/admin/resultados.ts` ainda usa só `ehContaDaAurea` (arquivo do T1).

## Superfície protegida tocada (CLAUDE.md §3)

| Arquivo | Toque | Quem |
|---|---|---|
| `src/domain/market.ts` | `matchOrders`/`transferirMoedaVendida` usam `taxasDaNegociacao` | código local pré-existente, revisado aqui |
| `src/server/actions/*` (market, sell, payments, reserva) | mesma troca de tabela | idem |
| `src/domain/fees.ts`, `constants.ts`, `types.ts` | **não tocados** | — |

## Tópicos

### N1 — Isenção (feito, local)
- [x] Revisão: `isencao.ts` + fiação em `matchOrders`, `transferirMoedaVendida`, `buyLot`, `sellToBid`, `iniciarCompraDireta`, reserva (saldo e conciliação), pré-pago, `emitirFaturasDosCiclos`, `custodiaImpedeNegociar`. Sem erro de lógica encontrado.
- [x] `src/domain/isencao.test.ts` (10 casos): variável vazia, Áurea compra, Áurea vende, Áurea↔CEO nos dois sentidos (sem comissão e, pela regra corrigida, sem custódia do CEO), CEO↔cliente, cliente↔cliente, e-mail exato, sem fatura de ciclo, trava, NFS-e.
- [x] Comissão zero não gera NFS-e: `pedidosDaNegociacao` já pula `valor <= 0`; coberto pelo teste.
- Ponto de atenção (não codificado): oferta de compra PRÉ-PAGA do CEO paga o total sem saber da contraparte; se casar com a Áurea, o motor cobra menos que o pago (hoje trata-se como melhoria de preço). Conferir no teste em produção.
- Fatura R$ 52 da Áurea já está cancelada no banco; sem a variável o cron a reemite no próximo ciclo.

### N2 — Conta PJ (feito, local)
- [x] `validarCnpj`/`validarDocumento`/`formatarDocumento` em `src/domain/cpf.ts` (+ testes em `cpf.test.ts`).
- [x] `temCadastroCompleto` (cadastro.ts) aceita CPF ou CNPJ. O campo continua `cadastro.cpf` (tipo protegido, sem renomear).
- [x] Cliente: `ModalCadastro` ("CPF ou CNPJ", máscara pelo tamanho) e `salvarCadastro` ("CPF ou CNPJ inválido.").
- [x] Admin: `domain/admin/usuarios.ts` (aviso), `AbaCadastro.tsx` (rótulo, máscara, exibição CNPJ).
- Mensagens dos testes `account.test.ts`, `reautenticacao-acoes.test.ts`, `admin/usuarios.test.ts` atualizadas.

### O que mais depende de CPF — só lista; perguntas ao Gabriel
1. **NFS-e do tomador** (`domain/nfse/dps.ts:180,196`): exige 11 dígitos e usa a tag `CPF`. PJ vira "problema" na fila (não emite errado). Emitir para PJ exige tag `CNPJ` e eventual ajuste de código fiscal — decisão fiscal/contador.
2. **Saques/Pix** (`domain/saques.ts:77-90`): chave "cpf" com 14 dígitos já é tratada como CNPJ no Mercado Pago; regra de titularidade (conta de mesma titularidade) para PJ é decisão de cobrança.
3. **Etiquetas** de envio/retirada, `NotasDoCliente`, `nota-pdf`, `retirada`: leem `cadastro.cpf`; precisam só de rótulo "CPF/CNPJ" — baixo risco, não alterado.
4. **Data de nascimento** continua obrigatória no cadastro; para PJ é data de abertura? Pergunta.
5. A conta da Áurea hoje (`rogeriosiqueira@pbh.gov.br`) tem CPF ou CNPJ no cadastro? Verificar antes de ligar.

## Verificação
- `npm run typecheck`: limpo. `vitest src/domain src/server/actions`: domínio 822 verdes (1 vermelho do T1); actions 1195 verdes antes do ajuste do CEO, 5 vermelhos **fora do escopo de T2**: `statement.test.ts` (T1: taxas pagas agora incluem custódia) e 4 em `frete-envio.test.ts` (esperam estorno de frete, D-H1 diz que não volta; arquivos não tocados por mim).
- Sem build local.
