---
name: contrato-correios-cws
description: "Contrato Correios da AUREA CUSTODIA (Platinum 1, nº 9912766936) e como o acesso às APIs do CWS funciona — token de 24h, catálogo filtrado pela credencial"
metadata:
  node_type: memory
  type: reference
  originSessionId: 1f0fee96-03ff-4e67-8250-624965d98b1c
  modified: 2026-10-22T15:32:07.081Z
---

Contrato Correios Empresas **PLATINUM 1, nº 9912766936**, AUREA CUSTODIA LTDA (CNPJ 68.071.452/0001-06),
assinado pela Áurea em 15/10/2026, vigência 120 meses. Atendimento: AGF Bandeirantes (BH).
Código administrativo **26348179** (Serviços Online – Logística Reversa, cadastrado em 19/10/2026 com o
e-mail do Rogério). Seis meses sem postar cancela o contrato sozinho (cláusula 9.1.2).

Cartão de postagem **0080378641** (ativo, 16/10/2026 a 15/10/2036), **DR 20** (MG), login Meu Correios = CNPJ.
Serviços no cartão (via API Meu Contrato, 22/10/2026): 03220 SEDEX CONTRATO AG, 03298 PAC CONTRATO AG,
**03247 SEDEX REVERSO**, **03301 PAC REVERSO**, 05991 LR SEDEX PC, 06637 LR PAC PC (245 serviços no total).
Token por contrato liberou as APIs de id 34, 35, 41, 76, 78, 87 (SRO-Rastro), 566, 586, 587; o token por
**cartão de postagem** (o que o servidor deve usar) libera também 36, 37, 80, 83, 93. Credenciais gravadas no
`.env.local` em 22/10/2026 (`CORREIOS_USUARIO`, `_CODIGO_ACESSO`, `_CARTAO_POSTAGEM`, `_CONTRATO`, `_DR`) e testadas:
geram token de PRODUCAO.

Acesso às APIs (cws.correios.com.br, levantado em 22/10/2026):
- Gera-se um **código de acesso** em "Gestão de acesso a API's" (exige a senha do Meu Correios — quem
  digita é o Gabriel; regerar invalida o anterior). Usuário Meu Correios + código de acesso = Basic Auth em
  `POST https://api.correios.com.br/token/v1/autentica/cartaopostagem` → token Bearer de **24h**.
  Token fixo em variável de ambiente não serve; o código atual (`CORREIOS_TOKEN` em `src/lib/shipping/`) assume isso.
- O catálogo da Documentação só mostra Token, Token-Certificado e AR Eletrônico até haver credencial; as specs
  OpenAPI públicas estão em `https://api.correios.com.br/<api>/v3/api-docs` (preco, prazo, srorastro,
  prepostagem, meucontrato, faturas, cep, coleta).
- Logística reversa existe em dois caminhos: o SOAP antigo do manual (e-ticket, `solicitarPostagemReversa`) e a
  **Pré-postagem REST** com `logisticaReversa: "S"` + `dataValidadeLogReversa` — o REST é o preferível.
- O rastreio correto é `/srorastro/v1/objetos/{codigo}`; o código atual chama `/sro/v1/...`.

Senha do Serviços Online apareceu em print no chat de 22/10/2026 — foi recomendada a troca. Ver [[ambiente-aberto-proposital]].
