# Atalhos assumidos em `src/domain/documentos-legais/`

## A marca nos documentos ainda é "Áurea" — RA-57

Em 20/09/2026 o site passou a se chamar **Real Olímpico** em toda a interface, mas os
documentos desta pasta não foram tocados: `termos-de-uso-v1.ts`,
`politica-privacidade-v1.ts`, `tabela-de-taxas-v1.ts` e `clausula-arbitragem-v1.ts`
continuam escrevendo "Plataforma Áurea", "Conta Áurea" e "Serviços Áurea".

O motivo é o hash. `canonico.ts` converte cada documento em texto canônico e o assina com
SHA-256; mudar uma palavra muda a assinatura, o que obriga a subir
`VERSAO_TERMOS_VIGENTE` em `src/domain/legal.ts` e a pedir aceite novo de quem já aceitou
a versão 1.0. Isso é decisão de produto — e de advogado —, não ajuste de texto de tela.

**Se você veio aqui para trocar a marca:** o caminho certo é reescrever o preâmbulo
definindo o termo curto, no padrão de contrato —
`AUREA CUSTODIA LTDA., CNPJ 68.071.452/0001-06, nome fantasia Real Olímpico ("Real Olímpico")` —
e só então substituir as referências à plataforma ao longo do texto. A **razão social
continua** no preâmbulo e em todo ponto que cite CNPJ: a parte contratante é a empresa, e
a marca é como ela se apresenta. Subir a versão vigente faz parte do mesmo commit.

O detalhe completo está em `RISCOS_ASSUMIDOS.md`, entrada RA-57.
