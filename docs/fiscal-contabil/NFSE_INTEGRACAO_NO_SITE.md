# Como a NFS-e Nacional entra no site

Estudo de 22/10/2026, **implementado em 23/10/2026** para custódia e comissões (branch `nfse-nacional-emissao`).
Fontes técnicas em `pesquisa/PESQUISA_NFSE_NACIONAL.md`; regras em `REGRAS_FISCAIS_E_CONTABEIS.md`.

## 0. O que foi entregue e como foi provado (23/10/2026)

| Parte | Onde | Prova |
|---|---|---|
| Que operação gera nota | `src/domain/nfse/pedidos.ts` | 8 testes: 2 notas por negociação (comprador e vendedor), 1 por fatura **paga** com a data do pagamento e o período do ciclo ("25/10/2026 A 25/11/2026"), nenhuma para fatura em aberto |
| XML do pedido (DPS) | `src/domain/nfse/dps.ts`, `codigos.ts` | 11 testes que reproduzem as notas nº 1, 2 e 3 do contador campo a campo |
| Certificado, assinatura, envio | `src/server/nfse/` | **6 notas autorizadas na produção restrita** (testes nº 1 a 6, "sem validade jurídica"). A Sefin calculou ISS 5% → R$ 0,10 e 3% → R$ 0,06, base de IBS/CBS R$ 1,83 e R$ 1,87 e CBS R$ 0,02: idêntico às notas do contador |
| Fila no banco, na transação do dinheiro | migration `044_nfse_emissoes.sql`, `repositories/nfse.ts`, `estado.ts` | 6 testes contra Postgres embutido: pedidos gravados com a negociação e com o pagamento, sem duplicar; numeração sem repetição; um envio por linha |
| Ponta a ponta | `emissao.ts` | Fila → Sefin restrita: 2 autorizadas, 1 barrada antes do envio (cliente sem endereço na intermediação); envio "morto no meio" recuperado sem segunda nota; número já usado (E0014) trocado sozinho |
| Painel | `/admin/resultados/fiscal` | Lista, filtros, XML, "Enviar fila agora" e "Reprocessar" (permissão `resultados.nfse`) |
| Reenvio diário | `/api/cron/faturamento` | Reenvia pendências e recusas por cadastro (até 5 tentativas) |
| **Respostas do contador (23/10/2026)** | migration `045_nfse_tarifas_e_cancelamento.sql`, `pedidos.ts`, `eventos.ts`, `emissao.ts` | Tarifa de saque (no pedido) e taxa de retirada (na retirada paga) com o código 11.04.01; inscrição municipal na DPS, com reenvio sem ela quando a Sefin responde E0120 (a restrita respondeu); **cancelamento** da nota da tarifa quando o saque é recusado (evento 101101) — testado na restrita: nota de teste nº 7 emitida e cancelada pelo serviço, e a nº 1 cancelada à mão |

**Achados da produção restrita que mudaram o código:** o .pfx da AC Safeweb não abre no OpenSSL 3 (conexão
feita com chave e cadeia em PEM); a Sefin exige a declaração `<?xml … encoding="UTF-8"?>` (E1229); e em
23/10/2026 a restrita já roda parte da NT 009 (`finNFSe` na raiz, `xDescServ` depois do `cNBS`, CST fora do
`gIBSCBS`, mas `indDest` ainda no grupo IBSCBS). Recusa de esquema (E1235) não gera nota nem gasta número,
então o envio tenta o formato seguinte.

**Não feito ainda:** PDF (DANFSe) gerado pela plataforma; cancelamento manual de uma nota pelo painel (o
automático, do saque recusado, existe); consolidado sob demanda (seção 5b); emissão retroativa das operações
anteriores a 23/10/2026 (decisão do Gabriel). O frete não terá nota: é despesa do cliente (contador, 23/10/2026).

## 1. A API em uma tela

| Item | Valor |
|---|---|
| Custo | gratuito ("sistema próprio e gratuito", PBH) — o único custo é o certificado e-CNPJ A1 |
| Testes | Produção restrita: `https://sefin.producaorestrita.nfse.gov.br/SefinNacional` (`tpAmb` = 2; notas "sem validade jurídica") |
| Produção | `https://sefin.nfse.gov.br/SefinNacional` (`tpAmb` = 1) — confirmar no Swagger com o certificado |
| Emitir | `POST /nfse` com `{"dpsXmlGZipB64": "<DPS assinada → GZip → Base64>"}`; resposta **síncrona** com `chaveAcesso` e `nfseXmlGZipB64` |
| Consultar | `GET /nfse/{chave}`; `HEAD /dps/{id}` (já existe nota para esta DPS?) e `GET /dps/{id}` (qual a chave?) |
| Cancelar | `POST /nfse/{chave}/eventos` com evento 101101 assinado |
| Conferir tudo o que foi emitido (inclusive pelo contador) | ADN `GET /contribuintes/DFe/{NSU}` (lotes de 50; 1 h de espera quando não há novidade) |
| Autenticação | mTLS com o e-CNPJ A1 da AUREA CUSTODIA LTDA **e** assinatura XMLDSig da DPS com o mesmo certificado |
| Leiaute | v1.01 hoje; **NT 009 obrigatória em 01/12/2026** (já está na produção restrita) → construir direto na NT 009 |
| PDF (DANFSe) | geramos nós (a API oficial de PDF foi suspensa em 03/08/2026), no leiaute nacional v2.0 com QR Code |

## 2. Onde cada peça mora (respeitando as três camadas)

```
src/domain/nfse/            PURO: monta a DPS a partir de um fato (custódia, comissão, tarifa),
                            calcula o Id, escolhe os códigos pela tabela de R3, valida campos obrigatórios.
                            Testável sem rede, comparando com as 3 notas do contador.
src/server/nfse/            SÓ SERVIDOR: assinatura (xml-crypto), mTLS (https.Agent com o .pfx),
                            cliente da Sefin/ADN, fila e reprocessamento, numeração da DPS com FOR UPDATE.
src/server/db/migrations/   04x_nfse.sql: tabela aurea.nfse_emissoes (abaixo) e contador de nDPS por série.
src/app/api/cron/nfse/      reenvio das pendentes e conferência diária contra o ADN.
src/app/(admin)/admin/resultados/fiscal/   painel: notas emitidas, pendentes, rejeitadas, canceladas.
src/lib/pdf/                DANFSe gerado localmente (jsPDF já é dependência).
```

Nenhum módulo de `src/server/nfse/` pode ser importado por Client Component (certificado e senha estão nele).

## 3. A tabela de emissões (proposta)

`aurea.nfse_emissoes`: `id`, `fato_tipo` (custodia | comissao_compra | comissao_venda | tarifa_saque | …), `fato_ref`
(fatura, negociação, saque), `lancamento_id` (ledger), `tomador_email`, `tomador_cpf`, `valor_cents`, `competencia`
(data, Brasília), `serie`, `n_dps`, `id_dps`, `xml_dps_assinado`, `status` (pendente | enviada | autorizada |
rejeitada | cancelada | substituida), `erros` (json), `chave_acesso`, `n_nfse`, `xml_nfse`, `autorizada_em`,
`tentativas`, `criada_em`. Única por (`fato_tipo`, `fato_ref`, `tomador_email`) — garante uma nota por fato.

## 4. O fluxo de uma emissão

1. O fato acontece dentro de `mutateState()` (negociação casada, fatura paga, saque processado). **Na mesma
   transação**, grava-se o lançamento e uma linha `pendente` em `nfse_emissoes`. Assim nenhuma receita fica sem
   pedido de nota, e a falha da Sefin nunca desfaz uma negociação.
2. Logo depois (fora da transação), o servidor reserva o próximo `nDPS` da série (com `SELECT … FOR UPDATE`), monta,
   assina e envia.
3. **201** → grava chave, nº, XML; liga a nota ao lançamento; o extrato do cliente passa a mostrar "NFS-e nº X".
   **400** → `rejeitada` com os códigos de erro (ex.: E0187 endereço faltando) e alerta no painel; o número da DPS
   pode ser reaproveitado. **Timeout/5xx** → antes de reenviar, `HEAD /dps/{id}`: se já existir nota, recupera a chave;
   senão reenvia com o mesmo número.
4. O cron reprocessa pendentes e confere diariamente contra o ADN, inclusive notas emitidas à mão pelo contador.
5. Cancelamento: a correção do painel que estorna uma receita (R9) dispara o evento de cancelamento da nota ligada.

## 5. Pontos de disparo no código atual

| Receita | Onde nasce hoje | Tomador |
|---|---|---|
| Comissão do comprador e do vendedor | casamento em `src/domain/market.ts` / lançamentos `comissao` em `src/domain/ledger.ts` (`lancamentosDeTrade`) | comprador; vendedor |
| Custódia do 1º mês na compra | `src/domain/custodia-da-compra.ts` (fatura `origem: 'compra'` já paga) | comprador |
| Custódia | **somente no pagamento da fatura** (decisão de 23/10/2026): baixa em `src/server/payments/conciliacao.ts` (Pix/cartão) e pagamento com saldo em `src/server/actions/plano-custodia.ts`. A nota leva a data e a hora do pagamento e o período do ciclo, que começa no aceite. Fatura não paga não dispara nada | dono da moeda |
| Tarifa de saque | `solicitarSaque` em `src/server/actions/account.ts` — no pedido, o dia em que o dinheiro se move (contador) — 11.04.01 | quem sacou |
| Taxa de retirada física | retirada que passa a `paga` (`src/server/actions/custody.ts`, conciliação) — 11.04.01 | quem retirou |
| Cancelamento da tarifa de saque | saque que passa a `falhou` (recusa pelo painel ou Pix devolvido) | — |

## 5b. Consolidado sob demanda no Admin (decisão de 23/10/2026)

Tela em `/admin/resultados/fiscal`: escolher cliente e período e gerar um destes dois:

- **Demonstrativo consolidado**: PDF ou XLSX, não fiscal. Traz as NFS-e do período (número, chave, competência,
  serviço, valor), os totais por serviço e os lançamentos do livro-razão de cada nota. É o padrão.
- **NFS-e consolidada fiscal**: só para operações sem nota individual autorizada. O painel recusa operação que já
  tenha nota, porque emitir de novo faturaria o mesmo serviço duas vezes. Fica gravada em `nfse_emissoes` com
  `fato_tipo = 'consolidada'` e a lista das operações que cobre.

Exige permissão própria (ex.: `resultados.nfse`) e grava `admin.fiscal.consolidar` na trilha.

## 6. Variáveis de ambiente (novas)

**Emissão real ligada em 23/10/2026:** `NFSE_AMBIENTE=producao` na Vercel, só em Production (o Preview
continua na produção restrita, e o `.env.local` também — testar localmente não emite nota de verdade).

`NFSE_CERT_PFX_BASE64` e `NFSE_CERT_SENHA` **já estão no `.env.local`** desde 23/10/2026, com o e-CNPJ A1 válido até
04/08/2027 (o original fica em `docs/privado/certificados/`, fora do Git). **Na Vercel, cadastradas em 23/10/2026**
como *Sensitive*, em Production e Preview. Demais: `NFSE_AMBIENTE` (`restrita` | `producao`),
`NFSE_SERIE` (ex.: `1`), `NFSE_ATIVO` (`true` liga a emissão; sem ela, as notas ficam `pendente` e o painel diz isso —
mesmo padrão do `MP_PAYOUTS_ATIVO`). A função precisa rodar em runtime **Node.js** (não Edge).

## 7. Ordem de trabalho sugerida

1. Respostas do contador às perguntas bloqueantes (`LACUNAS_E_PERGUNTAS.md`, bloco A).
2. ~~Certificado A1~~ — temos, no `.env.local` e na Vercel (Production e Preview).
3. `src/domain/nfse/` com testes que reproduzem as três notas do contador.
4. Assinatura + cliente + produção restrita: emitir as mesmas três notas em teste e comparar centavo a centavo.
5. Tabela, fila, cron e painel fiscal.
6. Ligar em produção com `NFSE_ATIVO=true`, primeiro só custódia, depois comissões.
