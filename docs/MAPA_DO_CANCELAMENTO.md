# Mapa do cancelamento de envio (frente H — 17/11/2026)

```
Serve a:  cancelar um envio que não virou moeda (cliente ou equipe) e a validação na bancada, devolvendo tudo o que ele gerou.
Pedidos:  Rogério, itens 10a, 13 e 14 (WS de 9/11). O contador exige cancelar nota fiscal DENTRO DO MÊS.
Código:   src/domain/cancelar-envio.ts (regra pura) · src/server/shipping/cancelar-envio.ts (ordem com I/O)
          src/server/actions/cancelar-envio.ts (cliente) · admin/logistica.ts e admin/bancada.ts (equipe)
```

## 1. O que um envio gera, e o que cada cancelamento desfaz

| O que o envio gera | Onde mora | Já existia para desfazer? | O que o cancelamento faz | Lacuna que a frente fecha |
|---|---|---|---|---|
| **Frete** (cliente paga no site) | `Envio.frete` (`pago` → `estornado`) | `desconsiderarEnvio` devolve o valor TOTAL ao saldo (22/10) | Mesma função: saldo += `frete.valorCents`, status `estornado`. O ledger lê a transição `pago → estornado` e lança o `estorno` | Só rodava no vencimento de 3 dias. Agora também no cancelamento |
| **Etiqueta** (pré-postagem dos Correios) | `Envio.prePostagem` (`id`, `canceladaEm`) | `desconsiderarEnviosVencidos` consulta o status e cancela | **Consulta → cancela a etiqueta → só então estorna** (a prova de "não postado" é o DELETE aceito; estornar antes deixaria uma janela com dinheiro devolvido e etiqueta viva). Status 2 e 7 → DELETE; 4 e 5 → sem DELETE, só anota o `canceladaEm`; 1, 3, 6, sem resposta ou erro de rede → recusa e nada muda. Se o DELETE passa e o resto falha, a nova tentativa consulta, vê 5 e vai direto ao estorno | Cancelamento pedido pelo cliente/equipe |
| **1º mês de custódia** (pago antes da moeda chegar) | `PlanoCustodia` (`protocoloEnvio`) + `FaturaCustodia` `origem:'contratacao'` (`planoId`) | `estornarFaturaPaga` (03/11), só chamada à mão pelo painel | Fatura **paga** → `estornarFaturaPaga` (saldo += valor, fatura `cancelada`). Fatura **pendente** → só `cancelada`. Plano → `cancelado` | **O R$ 30 do Rogério** (15 moedas × R$ 2,00): o desconsiderar de 3 dias nunca devolveu o 1º mês |
| **NFS-e do 1º mês** | `aurea.nfse_emissoes` (chave `custodia:<fatura>`) | `cancelamentosDeNfse` vê "fatura paga → cancelada" e marca `cancelando` | Nada novo: sai sozinha da transição acima, na mesma transação. O envio do evento 101101 à Sefin sai na PRÓXIMA rodada da fila (job das 05:00 de Brasília ou "Enviar fila agora"): a rodada que roda logo depois da operação pula a nota marcada há menos de 60 s — ver §4 | Nenhuma — só precisa de a fatura passar a `cancelada` pelo caminho certo |
| **Assinatura no cartão** (débito recorrente do plano) | `PlanoCustodia.assinaturaId` | `cancelarAssinaturaRecorrente` (Mercado Pago) | Cancelada ANTES de gravar; se o gateway falhar, nada é alterado | Sem isto o cartão seguiria sendo cobrado todo mês por um envio que não existe |
| **Fila da bancada** | `ETAPAS_DA_BANCADA` (`Recebido…`/`Em análise física`) | — | Envio cancelado sai da fila; `abrirAnalise` e `fecharAnalise` o recusam | `filaDeAnalise` só olhava a etapa |
| **Análise aberta** | **não há linha em `analises`** (as linhas nascem em `fecharAnalise`) | — | Nada a escrever na corrente de hash: o cancelamento fica no `Envio` e no `audit_log` | — |
| **Moeda + recibo** (só se já aceitos) | `codigosAtivosGerados`, `Recibo emitido` | — | **Recusa.** O caminho é a retirada (a moeda já existe e está custodiada) | — |

O que **não** acontece: nota de frete (frete é despesa do cliente, sem NFS-e — contador, 23/10/2026), estorno de `plano.estornadoCents` (aquele campo é só da moeda recusada na análise e o `derivar.ts` o lança também como `estorno`: tocar nele aqui seria **estornar duas vezes**), devolução ao banco ou ao cartão (tudo volta ao **saldo**; reembolso fora do saldo está fora de escopo).

## 2. Modelo adotado (confirmado no T1)

1. **Três campos opcionais em `Envio`** — `canceladoEm`, `canceladoPor` (`'cliente' | 'equipe'`), `motivoCancelamento` — **e o cancelamento também grava `desconsideradoEm`/`motivoDesconsideracao`.** Assim todas as guardas que já tratam "envio encerrado sem moeda" valem para o cancelado sem edição (lista na seção 3). `statusFaseEnvio` olha `canceladoEm` ANTES e devolve a fase `cancelado`.
2. **Núcleo puro** `cancelarEnvio(state, protocolo, { agora, por, motivo })`: roda dentro do `mutateState`, devolve o resumo (frete, 1º mês, fatura, plano, etiqueta a cancelar, aviso de mês).
3. **Divergência do rascunho do chat de branch (anotada):** envio JÁ desconsiderado mas ainda não cancelado **não é "nada a fazer"** — o núcleo completa o que faltar (1º mês pago antes de 17/11 nunca foi devolvido). Cada parte é idempotente por si: frete só se ainda `pago`, fatura só se ainda `paga`. Só o envio já **cancelado** é no-op.
4. **Desconsiderar automático (T6) e o corte D-H5:** `desconsiderarEnvio` passou a devolver também o 1º mês — **só para envio criado a partir do corte** (`DEVOLUCAO_AUTOMATICA_DO_PRIMEIRO_MES_VALE_PARA_ENVIO_CRIADO_A_PARTIR_DE`, valor 1794967250154 = 17/11/2026 23:00:50 em Brasília, o instante em que o fluxo novo da B foi ao ar (ordem do Controle); `0` liga o retroativo. O motivo do envio antigo diz ao cliente que o 1º mês é cancelado com a equipe — decisão de cobrança e fiscal do Gabriel, para não devolver sozinho, no primeiro deploy, o 1º mês de envio antigo). A comparação vive numa função só, `primeiroMesEntraNaDevolucaoAutomatica(state, envio)`, usada por `desconsiderarEnvio` e pelo filtro de candidatos da varredura (`desconsiderarEnviosVencidos`), que ganhou o candidato "envio vencido, **novo**, com 1º mês pago, sem frete e sem etiqueta". Envio antigo continua como sempre: só o frete volta. **O cancelamento MANUAL não tem corte** — é por ele que a equipe trata os antigos à mão. Se o Gabriel preferir que o corte olhe a data de PAGAMENTO do 1º mês (o `RO-ENV-0045` foi criado em 16/11 e pode ser pago depois do deploy), a troca é uma linha dentro dessa função.
5. **Frete só volta se o pacote não foi postado** (D-H1). A regra vive numa constante única, `DEVOLVE_FRETE_DE_ENVIO_JA_POSTADO = false`, lida num só `if` e travada por teste.
6. **Ordem da ação de servidor (substituída pela decisão da branch em 17/11):** ler → (se há etiqueta ativa e o envio não foi postado) **consultar os Correios e, se ainda vale, cancelar a etiqueta** (status 2 e 7 → DELETE; 4 e 5 → sem DELETE; 1, 3, 6, sem resposta ou exceção de rede → recusa sem alterar nada) → (se há assinatura no cartão) cancelar no gateway → **uma** `mutateState` com a guarda dupla dentro, que estorna e já grava o `canceladaEm` da etiqueta. O DELETE aceito é a prova de "não postado"; a nova tentativa depois de um DELETE que passou consulta, vê o status 5 e vai direto ao estorno.
7. **Auditoria da equipe:** `admin.logistica.cancelar_envio` com motivo (mín. 10 caracteres), protocolo, valores devolvidos e `detalhes.via: 'logistica' | 'bancada'`. Permissão: `logistica.expedir` no painel de logística e `bancada.analisar` na bancada.

## 3. Todas as guardas que o cancelamento precisa respeitar

| Onde | O que olha | Cobre o cancelado? |
|---|---|---|
| `domain/envios.ts` — `isEnvioDesconsiderado`, `envioVenceuPrazoDePostagem`, `prazoPostagemEnvio`, `statusFaseEnvio` | `desconsideradoEm` | Sim (e `prazoPostagemEnvio`/`statusFaseEnvio` ganham o texto "cancelado") |
| `domain/rastreio.ts` — `postagemDoEnvioPeloRastreio`, `recebimentoDoEnvioPeloRastreio` | `desconsideradoEm` → `null` | Sim: o rastreio não avança envio cancelado, nem dentro da mutação |
| `server/shipping/rastreios.ts` — `pendentes()` | `!desconsideradoEm` | Sim: o job deixa de consultar o objeto |
| `server/shipping/frete-envio.ts` — `recusaDoEnvioParaFrete`, `emitirPrePostagemDoEnvio` (2 pontos), varredura | `isEnvioDesconsiderado`/`desconsideradoEm` | Sim: Pix de frete que cair depois vira **saldo**, não frete; não emite etiqueta nova; a varredura refaz o cancelamento da etiqueta que falhou |
| `server/actions/custody.ts` — `markPosted` | `isEnvioDesconsiderado` | Sim: devolve "protocolo desconsiderado" |
| `domain/admin/logistica.ts` — `linhaDeEnvio` | `isEnvioDesconsiderado` | Sim: `aberto = false`; ganha `cancelado` para a tela esconder o botão |
| `app/(app)/envios/page.tsx` (linhas 293, 539) e `components/custody/HistoricoEnvios.tsx` | `isEnvioDesconsiderado` | Sim (tira da lista ativa e do wizard); a lista ganha o bloco "Cancelado" |
| `server/estacao/analise.ts` — `filaDeAnalise`, `abrirAnalise`, `fecharAnalise` | **só a etapa** | **NÃO** — ganha guarda (3 linhas). `CAMPOS_DA_ANALISE` e a fórmula do hash ficam como estão |
| `server/actions/custody.ts` — `advanceAnalysis` | só a etapa | Não, e **não se edita** (arquivo da frente B). Fica de fora sem risco: exige `bancada.analisar` e age só no envio do próprio membro |

## 4. NFS-e: como a Sefin trata o cancelamento, a janela e o tempo

- **Evento 101101** (`src/domain/nfse/eventos.ts`), motivo `2` "serviço não prestado", com a justificativa "Custodia … cobrada por engano: valor devolvido ao saldo do cliente, servico nao prestado".
- **Janela:** em Belo Horizonte o cancelamento direto vale até **730 dias** da emissão — a regra do sistema não é a janela; o prazo que importa é o **do contador: dentro do mês** da nota. O núcleo devolve `avisoDoMes` quando a fatura foi paga num mês diferente do mês do cancelamento, e a tela da equipe mostra o aviso (a nota é cancelada mesmo assim, mas o contador precisa saber).
- **Quando sai (CORRIGIDO em 17/11 com a leitura do Específico — a primeira versão deste mapa dizia "logo depois"):** a mutação marca a nota como `cancelando` na MESMA transação e `agendarEmissaoNfse()` dispara a fila logo depois da operação, **mas `reivindicarCancelamentos` (`db/repositories/nfse.ts`) só pega nota `cancelando` com `atualizado_em` anterior a 60 s** — a nota recém-marcada é pulada. Ela sai na **próxima** rodada da fila: outra mutação que peça nota, o botão **"Enviar fila agora"** do painel fiscal (`enviarFilaDeNotas`, permissão `resultados.nfse`) ou o job diário (`/api/cron/faturamento`, 08:00 UTC = 05:00 de Brasília). No pior caso a nota fica `cancelando` até a manhã seguinte — e a mensagem que a equipe recebe ao cancelar diz isso. Casos reais: a nota 33 (estornada em 03/11) saiu às 05:13 de 04/11; a nota 41 (Rogério) ficou `cancelando` ~1 minuto porque alguém rodou a fila. Nota que ainda não saiu (pendente/rejeitada/erro) é cancelada direto no banco, sem evento. Evento recusado deixa a nota `cancelando` com o erro à vista no painel de NFS-e (`gravarFalhaDoCancelamento`).
- **Sem certificado/produção desligada:** a nota fica `cancelando` na fila e sai com o ambiente ligado, como as demais.

## 5. O que ficou de fora (e por quê)

- Reembolso ao banco/cartão do cliente — tudo volta ao saldo (D-H4).
- Cancelar moeda já aceita — o caminho é a retirada.
- Mudar a regra dos 3 dias, a Tabela de Taxas ou qualquer decisão fiscal (alíquota, código de serviço).
- `advanceAnalysis` (botão de avanço de demonstração em `custody.ts`) — dono é a frente B.
