# `/admin/moedas` — a auditoria do acervo

Plano do Admin, seções 3.5 e 3.6; frente C, sub-branch C3. Pede `bancada.auditoria`.

| Arquivo | O que faz |
|---|---|
| `page.tsx` | Os cartões do acervo, "Verificar corrente" e a tabela de toda moeda do sistema, com o filtro na URL (`?busca=&tipo=&situacao=&analise=&caixa=`) |
| `[codigo]/page.tsx` | O recibo de qualquer conta: código, hash e situação; a análise de origem com os quinze campos na ordem do hash; o vídeo; o envio de origem; as retiradas com a etiqueta |

A leitura é a do relatório `estoque` — o estado inteiro — cruzada com as análises e as retiradas por
`src/domain/admin/moedas.ts`. A verificação usa `conferirCadeia()` e `verificarCadeia()`, as funções
que já existem, e fica na trilha como `admin.moedas.verificar`.
