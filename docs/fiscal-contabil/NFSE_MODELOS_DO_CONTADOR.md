# As três NFS-e-modelo do contador e a reunião de 16/10/2026

Fonte primária deste arquivo: os PDFs (DANFSe v2.0) que o Túlio Monteiro emitiu em 22/10/2026 a pedido da reunião,
a ata automática da reunião (Gemini) e o roteiro "Aurea Custodia - Contábil" escrito pelo Gabriel. Os significados
de cada código vêm de `pesquisa/PESQUISA_NFSE_NACIONAL.md` (fontes lá).

## 1. O que a reunião decidiu

**Roteiro do Gabriel ("Como vamos classificar os recebíveis"):**

- Armazenamento (custódia): nota fiscal; separação na DRE e na conta do cliente.
- Intermediação: nota fiscal; separação na DRE e na conta do cliente.
- Saldo de clientes: conta do cliente separada no livro-razão; depósito comprovado pelo comprovante da transação
  financeira; receitas (comissões e custódia) separadas.

**O que o contador confirmou (ata):**

1. Custódia e comissão são **receitas que exigem NFS-e**; depósito em conta **não é receita**.
2. O livro-razão precisa de **uma conta por cliente**, e a DRE separa as receitas por tipo.
3. Para movimentos internos entre clientes (que o extrato do Mercado Pago não mostra), **relatórios detalhados do
   sistema com dia, hora e histórico são documentação suficiente**, desde que a contabilidade feche os saldos:
   dinheiro dos clientes na conta da empresa = saldos dos clientes + receitas retidas.
4. Pix fixo com confirmação manual (para fugir de custo de integração bancária) **é aceitável**, com o mesmo
   requisito de fechamento dos saldos e com comprovantes, notas e relatórios.
5. Próximos passos: o contador emitiria três notas-modelo (feito em 22/10); o Gabriel organiza os dados contábeis na
   DRE e na conta de cada cliente com o **código de tributação nacional** e estuda automatizar a emissão.

**Cuidado com a ata automática:** ela diz "intermediação de 1% mais taxa fixa de R$ 1,00 totalizando R$ 2,00" e cita
"custódia mensal de R$ 200 / custódia de R$ 12". A regra vigente é **0,5% + R$ 1,00 por moeda, de cada lado** (CLAUDE.md,
`TAXAS_PADRAO`); numa negociação de R$ 200,00 isso dá exatamente os **R$ 2,00** de cada nota. Os números da ata são
transcrição imprecisa da conversa — vale o que está nas notas emitidas.

## 2. As três notas

| | NFS-e nº 1 | NFS-e nº 2 | NFS-e nº 3 |
|---|---|---|---|
| Serviço | Custódia mensal | Comissão do comprador | Comissão do vendedor |
| Competência | 07/10/2026 | 12/10/2026 | 14/10/2026 |
| Emissão (NFS-e e DPS) | 22/10/2026 09:05:13 | 22/10/2026 09:26:50 | 22/10/2026 09:30:48 |
| Nº DPS / série | 7 / 70000 | 20 / 70000 | 24 / 70000 |
| Chave de acesso | 3106200 2 2 68071452000106 0000000000001 2610 084178161 4 | …0000000000002 2610 672678768 3 | …0000000000003 2610 754363765 0 |
| Tomador | ROGERIO PENA SIQUEIRA, CPF 461.651.346-53, **sem endereço** | o mesmo, **com endereço** (R Muzambinho, 488, apto 402, Serra, BH, CEP 30.210-530) | o mesmo, com endereço |
| Código de tributação nacional / municipal | **11.04.01 / 001** | **10.05.01 / 003** | **10.05.01 / 003** |
| NBS | **1.0602.90.00** | **1.0201.00.00** | **1.0201.00.00** |
| Descrição do código | Armazenamento, depósito e guarda de bens de qualquer espécie | Intermediação de bens móveis não abrangidos em outros itens / subitens | idem |
| Descrição do serviço | CUSTODIA MENSAL - 10/2026 - 1 MOEDA | INTERMEDIACAO NA COMPRA DE MOEDA | INTERMEDIACAO NA VENDA DE MOEDA |
| Valor do serviço | R$ 2,00 | R$ 2,00 | R$ 2,00 |
| ISS | 5,00% → R$ 0,10, não retido | 3,00% → R$ 0,06, não retido | 3,00% → R$ 0,06, não retido |
| PIS / COFINS (apuração própria) | R$ 0,01 / R$ 0,06 | R$ 0,01 / R$ 0,06 | R$ 0,01 / R$ 0,06 |
| Retenções federais | 0 - PIS/COFINS/CSLL não retidos | idem | idem |
| IBS/CBS: CST / cClassTrib | 000 / 000001 | 000 / 000001 | 000 / 000001 |
| Indicador de operação | **050101** / 3106200 BH | **100301** / 3106200 BH | **100301** / 3106200 BH |
| Exclusões da base IBS/CBS | R$ 0,17 (ISS 0,10 + PIS 0,01 + COFINS 0,06) | R$ 0,13 (0,06 + 0,01 + 0,06) | R$ 0,13 |
| Base IBS/CBS | R$ 1,83 | R$ 1,87 | R$ 1,87 |
| IBS UF / Mun / CBS | 0,10% / 0,00% / 0,90% | idem | idem |
| CBS apurada / IBS apurado | R$ 0,02 / R$ 0,00 | R$ 0,02 / R$ 0,00 | R$ 0,02 / R$ 0,00 |
| Valor total e líquido | R$ 2,00 | R$ 2,00 | R$ 2,00 |
| Tributos aproximados (Lei 12.741) | Fed. 11,33% · Est. 0% · Mun. 5% | Fed. 11,33% · Est. 0% · Mun. 3% | idem |
| Ambiente gerador / tipo de ambiente | 2 (Sefin Nacional) / 1 (produção) | idem | idem |
| Simples Nacional | Não optante | idem | idem |
| Destinatário / intermediário | não identificados | idem | idem |

## 3. O que cada código quer dizer

- **11.04.01** — desdobramento nacional do subitem 11.04 da LC 116 ("armazenamento, depósito, carga, descarga,
  arrumação e guarda de bens de qualquer espécie"). O ISS é devido **onde o bem está guardado**.
- **10.05.01** — desdobramento do subitem 10.05 ("agenciamento, corretagem ou intermediação de bens móveis ou imóveis
  não abrangidos em outros itens… por quaisquer meios"). ISS devido no estabelecimento do prestador (BH).
- **001 / 003** — códigos municipais de BH (3 dígitos), que BH exige quando o ISS é dela.
- **NBS 1.0602.90.00** — serviços de armazenagem não classificados em outra posição. **1.0201.00.00** — serviços de
  intermediação na distribuição de mercadorias. A correlação oficial (Anexo VIII) liga exatamente esses pares.
- **cIndOp 050101** — serviço prestado fisicamente sobre bem móvel: o IBS/CBS pertence ao local do **fornecedor** (BH).
- **cIndOp 100301** — demais serviços: o IBS/CBS pertence ao **domicílio do cliente**. É por isso que as notas de
  intermediação trazem o endereço do tomador, e por isso o endereço é obrigatório nelas (a de custódia não trouxe).
- **CST 000 / cClassTrib 000001** — tributação integral de IBS e CBS.
- **5% e 3%** — Lei Municipal 8.725/2003, art. 14: 3% para os subitens 10.04 a 10.08 (inclui 10.05) e 5% residual
  (inclui 11.04).
- **Ambiente gerador 2 / tipo de ambiente 1** — nota gerada pela Sefin Nacional, em produção.
- **Série 70000** — faixa exclusiva do Emissor Web (site do governo). Pela API, a série tem de ficar entre 00001 e
  49999.
- **Chave de acesso (50 dígitos)** = município (7) + ambiente gerador (1) + tipo de inscrição (1; 2 = CNPJ) + CNPJ (14) +
  nº da NFS-e (13) + ano/mês da emissão (4) + código aleatório (9) + dígito verificador (1).

## 4. O que as notas ensinam para a automação

1. A numeração das NFS-e é única para a empresa em todos os canais: as automáticas continuarão do **nº 4**.
2. **Competência = dia do fato** (07, 12 e 14/10), mesmo emitindo dias depois.
3. **Cada lado da negociação é uma nota**, com o próprio cliente como tomador.
4. **Endereço do tomador é necessário na intermediação**; na custódia o contador emitiu sem.
5. A alíquota de ISS **não** vai no pedido: a Sefin aplica a de BH sozinha.
6. Os valores de IBS/CBS são **calculados pela Sefin**, não por nós; nós informamos só os códigos.
7. Com R$ 2,00 por nota, o arredondamento importa (PIS 0,013 → 0,01; CBS 0,0165 → 0,02): o teste na produção
   restrita precisa conferir centavo por centavo contra estas três notas.
