# `src/domain/documentos-legais/` — Documentos Oficiais e Prova Canônica

Estrutura formal dos documentos legais e contratuais da **Áurea Custódia / Real Olímpico**.

## Filosofia e Arquitetura

1. **O texto como dado:** Cada documento legal vive como uma estrutura tipada (`DocumentoLegalEstruturado`)
   contendo capítulos, parágrafos, alíneas e parâmetros vinculados.
2. **Canonicidade estrita:** A função `textoCanonico(doc)` converte a estrutura em representação canônica
   (sem espaços no fim de linha, quebras normalizadas com `\n` e codificação Unicode NFC).
3. **Hash criptográfico imutável:** `hashDoDocumento(doc)` calcula o SHA-256 (`sha256Hex` puro) do
   texto canônico. Qualquer alteração de vírgula, prazo ou texto altera o hash e exige nova versão.
4. **Fonte única de parâmetros:** `parametros.ts` centraliza prazos operacionais, vigência e contatos.
   Os quatro prazos em branco da minuta foram preenchidos provisoriamente pelas decisões dos sócios (RA-25).
5. **Cláusula de Arbitragem com assinatura específica:** O Capítulo 14.4 é mantido em negrito integral
   e possui documento dedicado (`clausula_arbitragem`) para assinatura e consentimento em conformidade
   com a Lei 9.307/1996, art. 4º, §2º.

## Arquivos

- `types.ts`: Tipos fundamentais (`DocumentoLegalEstruturado`, `ChaveDocumento`, etc.).
- `parametros.ts`: Prazos, SAC e vigência.
- `termos-de-uso-v1.ts`: Minuta oficial dos Termos de Uso (17 capítulos).
- `tabela-de-taxas-v1.ts`: Tabela oficial de taxas incorporada por referência.
- `politica-privacidade-v1.ts`: Governança de privacidade e conformidade LGPD.
- `clausula-arbitragem-v1.ts`: Cláusula arbitral destacada.
- `canonico.ts`: `textoCanonico` e `hashDoDocumento`.
- `index.ts`: Catálogo `DOCUMENTOS_VIGENTES` com textos e hashes pré-calculados.

