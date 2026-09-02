# `src/lib/` — integrações externas e exportadores

Tudo que fala com o mundo de fora, ou que gera arquivo para o usuário baixar.

## Estrutura atual

| Pasta / arquivo | O que faz | Roda em |
|---|---|---|
| `coingecko.ts` | Busca cotações BTC/ETH/USDT, com fallback simulado | Servidor (`api/crypto`) |
| `charts.ts` | Medidas e escalas dos gráficos | Cliente |
| `qr-seed.ts` | Padrão determinístico do QR do recibo | Ambos |
| `pdf/nft-receipt.ts` | Gera o recibo NFT em PDF (jsPDF) | **Cliente** |
| `xlsx/audit-export.ts` | Planilha da auditoria pública de estoque | **Cliente** |
| `export/statement-export.ts` | Extrato da conta em CSV e XLSX | **Cliente** |

## O padrão dos exportadores

Os três geradores de arquivo seguem o mesmo desenho, e não por acaso:

1. **Rodam no cliente.** O navegador monta o arquivo e dispara o download
2. **Import dinâmico da biblioteca.** `jsPDF` e `SheetJS` são grandes e só carregam quando
   alguém clica em exportar — não podem pesar no carregamento inicial
3. **Não exibem toast.** Quem chama monta a mensagem. A única exceção que escapa é a falha
   de carregamento da biblioteca, com texto próprio
4. **A conversão de linhas é compartilhada** entre formatos. No extrato, CSV e XLSX consomem
   a mesma `toFileRows()` — duplicar a conversão faria os dois arquivos divergirem com o
   tempo

## Dois documentos, duas regras opostas

| Exportador | Leva dado de proprietário? |
|---|---|
| `xlsx/audit-export.ts` | ❌ **Nunca.** A tela promete isso em texto: auditoria pública é do estoque, não das pessoas |
| `export/statement-export.ts` | ✅ **Sim.** É o extrato do dono, entregue ao dono |

Confundir os dois é erro de negócio, não de código.

## Detalhes de CSV que parecem frescura e não são

O `statement-export.ts` usa **ponto e vírgula** como separador, **vírgula** decimal e um
**BOM UTF-8** no começo.

- Com vírgula de separador, o Excel em português joga a linha inteira numa célula só — e o
  arquivo "não funciona" para quem recebeu
- Sem o BOM, o Excel lê o UTF-8 como Latin-1 e "Custódia" vira "CustÃ³dia"
- O escape de aspas e separador existe porque a observação de um anúncio é texto livre: um
  ponto e vírgula digitado partiria a linha em duas colunas

## A dependência `xlsx`

Vem de `vendor/xlsx-0.20.3.tgz`, **versionado no repositório**. A SheetJS retirou o pacote
do registro npm em 2023 e distribui pelo próprio CDN — o que fazia todo `npm install` e
todo deploy depender de um servidor de terceiro estar no ar. Item CD-05, resolvido em
01/09/2026.

**Ao atualizar a versão:** baixe o `.tgz` novo para `vendor/`, troque o caminho no
`package.json`, regenere o lockfile e confirme com
`npm ci --loglevel=http | grep cdn.sheetjs.com` — não pode haver nenhuma linha.

## O que virá aqui

Registrado para ninguém inventar um lugar diferente:

```
lib/payments/    Mercado Pago: cobrança, split, verificação de webhook
lib/shipping/    Correios: etiqueta, rastreio, modalidade PAC/SEDEX
lib/storage/     Supabase Storage: URLs assinadas para upload direto
```

Cada uma nasce com seu `README.md`.

### Regras que já valem para elas

- **Chave de API só no servidor**, sempre em variável de ambiente
- **A integração fica atrás de uma interface própria** — trocar de fornecedor depois deve
  ser troca de implementação, não de aplicação
- **`lib/shipping/` não pode representar carta comum.** `type ModalidadeEnvio = 'PAC' |
  'SEDEX'`, porque o regimento dos Correios permite confisco de dinheiro circulável em
  carta, e moeda comemorativa é dinheiro circulável
- **`lib/payments/` nunca toca em número de cartão.** Sempre checkout hospedado ou
  tokenização — tocar em PAN traz o PCI-DSS inteiro para o escopo

## O que quebra se você mexer aqui

| Se você mexer em… | Quebra ou muda… |
|---|---|
| `charts.ts` | Todos os gráficos, nas três telas de `/graficos` |
| `qr-seed.ts` | O QR de **recibos já emitidos** — o padrão é determinístico por design |
| `pdf/nft-receipt.ts` | O documento precisa continuar dizendo o mesmo que a tela do certificado |
| `xlsx/audit-export.ts` | Os nomes das chaves são o contrato do arquivo — pode haver script lendo por eles |
