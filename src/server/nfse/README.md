# `src/server/nfse/` — o envio das notas à Sefin Nacional

Só servidor: carrega o certificado e-CNPJ A1 da empresa. Nada daqui pode ser importado por Client Component.

| Arquivo | O que faz |
|---|---|
| `certificado.ts` | Abre o .pfx das variáveis `NFSE_CERT_PFX_BASE64` + `NFSE_CERT_SENHA` com `node-forge` (o OpenSSL 3 do Node recusa a cifra antiga do arquivo) e entrega chave, certificado e cadeia em PEM |
| `assinatura.ts` | XMLDSig enveloped sobre `infDPS` (RSA-SHA256, exc-c14n), com `xml-crypto` |
| `sefin.ts` | Cliente HTTPS com TLS mútuo: `POST /nfse`, `GET /dps/{id}`, `GET /nfse/{chave}`. `NFSE_AMBIENTE=producao` emite de verdade; sem ela, produção restrita (notas sem validade jurídica) |
| `municipio.ts` | CEP → código IBGE do município (ViaCEP), que a nota exige do tomador |
| `emissao.ts` | `processarNotasPendentes`: reivindica a fila, barra cadastro incompleto, reserva número, monta, assina, envia, grava. Recupera envio interrompido sem emitir duas vezes; troca de formato em recusa de esquema (E1235) e de número em E0014 |
| (cancelamento) | `processarNotasPendentes` também registra na Sefin o cancelamento das notas `cancelando` (`enviarEvento`, evento 101101) |
| `agendar.ts` | Dispara o envio logo depois da operação, com `after()` |

## Fluxo

1. A operação (negociação, fatura paga) roda em `mutateState` → `mutarEstado` grava os pedidos em
   `aurea.nfse_emissoes` **na mesma transação** (`src/server/db/repositories/nfse.ts`, migration 044).
2. `src/server/state.ts` chama `agendarEmissaoNfse()` quando a mutação pediu nota.
3. O cron diário `/api/cron/faturamento` reenvia o que ficou (rede, Sefin fora, cadastro completado depois).
4. O painel `/admin/resultados/fiscal` mostra a fila e reprocessa (`src/server/actions/admin/fiscal.ts`).

## Variáveis

`NFSE_CERT_PFX_BASE64`, `NFSE_CERT_SENHA` (no `.env.local` e na Vercel, Sensitive), `NFSE_AMBIENTE`
(`producao` | qualquer outro = restrita), `NFSE_SERIE` (padrão 1; a API aceita 1–49999). No site publicado
(`VERCEL_ENV=production`) sem `NFSE_AMBIENTE=producao`, nada é enviado: a fila espera e as notas saem com a
data de cada fato quando a produção for ligada.

Documentação completa da integração (arquitetura, diagramas, dados, códigos de retorno, operação):
`docs/fiscal-contabil/API_NFSE_NACIONAL.md`. Desenho e decisões: `docs/fiscal-contabil/NFSE_INTEGRACAO_NO_SITE.md`.
