# Relatório — espaço e custo do armazenamento dos vídeos de autenticidade

```
Para:        Gabriel (decisão) e Rogério (pergunta de 11/11/2026)
Medido em:   18/11/2026, 18:47 (Brasília), por scripts/medir-armazenamento.mjs — somente leitura
Frente:      L (manut-armazenamento-videos)      Natureza: medição e proposta. Nada foi comprado, movido, apagado ou alterado.
Pergunta:    "Verificar a questão de espaço para gravar as filmagens da confirmação de autenticidade
              das moedas. Se não tivermos mais espaço, comprar mais ou ver local barato de armazenamento."
```

## 1. Conclusão (leia só isto, se tiver pouco tempo)

**Hoje os vídeos ocupam 328,77 MB (0,32 GB), em 32 arquivos.** É medido, não estimado: a soma pela API do Supabase e a soma direto no banco deram exatamente o mesmo número.

**O que eu não consegui saber, e por quê:** qual é o plano contratado do Supabase. Ele não está no código, nem no banco, nem na Vercel, e o painel do Supabase pede login (que não é meu). O último registro do projeto, de setembro, diz "plano Free". **Todo o resto depende disso:**

| Se o plano for… | Espaço total | Sobra hoje | Quando acaba (ritmo de novembro) |
|---|---|---|---|
| **Free** (o que os documentos indicam) | 1 GB | **695 MB** | **entre 7 e 22 de janeiro de 2027**; em **semanas** se houver lançamento com mais envios (seção 4) |
| **Pro** (US$ 25/mês) | 100 GB | 99,7 GB | **sem urgência: 20 meses, mesmo com 500 envios por mês**; no ritmo de hoje, mais de 20 anos |

**O gargalo não é dinheiro, é o plano.** Guardar vídeo custa de zero a centavos por mês em qualquer fornecedor (tabela 6). O único custo que aparece é o plano Pro do Supabase, US$ 25 fixos (≈ R$ 138), que não é "preço do vídeo": ele compra o projeto inteiro sem o teto de 1 GB.

**Recomendação em uma frase:** confirmar hoje o plano no painel do Supabase e, se for Free, assinar o Pro antes de meados de dezembro e limitar o peso da gravação (ganho estimado de 40%, sem custo); **não** migrar para Cloudflare R2 ou Backblaze B2 agora, porque a economia seria de centavos e traria um segundo fornecedor, trabalho de programação e uma conversa de LGPD sobre sair do Brasil.

**O que o Gabriel precisa comprar ou aprovar:**

1. **Conferir o plano** (2 minutos): painel do Supabase → página de cobrança da organização (`https://supabase.com/dashboard/org/_/billing` redireciona para a organização certa depois do login) e anotar o plano e o uso de "Storage".
2. **Se for Free: aprovar o Pro, US$ 25/mês (≈ R$ 138).** Também resolve duas coisas que o Free tem e um site em produção não deveria ter: o projeto é pausado após 1 semana sem uso e cada arquivo é limitado a 50 MB (preços na tabela 5).
3. **Aprovar a proposta de limitar o peso da gravação** (seção 7, alavanca 1): uma linha de código em dois lugares, que eu não implementei porque `GravadorDeVideo.tsx` é intocável nesta frente.
4. **Decidir o que fazer com 6 vídeos que nenhuma análise usa** (66,67 MB, 20% do total; lista na seção 3). Eu não apaguei nada.
5. **Pergunta ao jurídico (não é minha decisão):** por quanto tempo guardar vídeo de moeda? A política de retenção de foto e vídeo continua pendente no projeto (seção 8).

## 2. Como o vídeo é gravado e guardado (T1)

```
Bancada web (GravadorDeVideo.tsx)  ou  estação Electron (estacao/main.js, "video:gravar")
   │  grava no navegador/estação: MediaRecorder, SEM áudio, resolução pedida 1920x1080,
   │  formato VP9/WebM (cai para VP8, WebM, MP4), sem limite de duração e sem limite de bitrate
   ▼
Server Action assinarVideoNoPainel → urlDeUploadDeVideo (src/server/estacao/video.ts)
   │  o servidor assina uma URL de envio; a chave de serviço NUNCA sai do servidor
   ▼
PUT direto do navegador para o Supabase Storage, balde "analises" (privado)
   │  caminho:  <protocolo do envio>/<protocolo>-N.webm      ex.: RO-ENV-0011/RO-ENV-0011-1.webm
   ▼
fecharAnaliseNoPainel grava o caminho em aurea.analises.caminho_video
   │  e esse campo ENTRA no hash encadeado da análise
   ▼
Leitura: só o painel assiste (botão "Vídeo" na ficha da moeda), por URL assinada de 10 minutos
```

O que isto significa para espaço:

- **É um vídeo por envio, não por moeda.** Uma gravação cobre o procedimento inteiro, com todas as moedas do envio. Por isso o peso do vídeo **não** acompanha a quantidade de moedas: o RO-ENV-0015 tem 1 moeda e 25,17 MB; o RO-ENV-0003 tem 99 moedas e 21,54 MB. O que pesa é **quanto tempo a câmera ficou ligada**.
- **Nada compacta, nada limita e nada apaga.** Não há tampa de duração, de resolução ou de taxa de bits (`videoBitsPerSecond` não é definido); regravar sobe um arquivo novo e o anterior fica no balde (é provavelmente a origem dos 6 vídeos sem análise); nenhuma rotina apaga vídeo; a duração não é guardada em lugar nenhum.
- **O caminho do arquivo é prova.** Mudar o caminho muda o hash da análise e de todas as seguintes (foi o que o `alinhar-videos.cjs` precisou refazer do GENESIS em 22/09). Qualquer migração de fornecedor tem de **manter o caminho relativo idêntico**, senão a corrente de hashes quebra.
- **Cadastro direto (RO-DIR) não grava vídeo** — não tem câmera (auditoria de 30/10). Das 231 análises, 27 são assim.
- **Balde privado, sem limite próprio e sem restrição de tipo** (conferido em `storage.buckets`): quem manda é o limite global do projeto, que no Free é de 50 MB por arquivo.

## 3. O que está guardado hoje (T2, medido)

Fonte: `node scripts/medir-armazenamento.mjs`, 18/11/2026. Conferência cruzada API × `storage.objects` (Postgres, `BEGIN READ ONLY`, sem `SET`): **arquivos 32 × 32 e bytes 344.740.412 × 344.740.412 — iguais.** É o único balde do projeto.

| | Valor |
|---|---|
| Arquivos (todos `.webm`) | **32**, cada um numa pasta de envio |
| Tamanho total | **328,77 MB** (0,32 GB) |
| Média por vídeo | **10,27 MB** |
| Mediana | 7,84 MB |
| Menor / maior | 1,23 MB / **39,08 MB** (RO-ENV-0011, 5 moedas) |
| Tamanho do banco (`pg_database_size`) | 23,90 MB (o Free permite 500 MB; sem risco) |

**Por mês de gravação (fuso de Brasília):**

| Mês | Vídeos | Tamanho | Média |
|---|---|---|---|
| setembro/2026 | 4 | 40,17 MB | 10,0 MB |
| outubro/2026 | 4 | 98,02 MB | 24,5 MB |
| novembro/2026 (1 a 18) | **24** | 190,58 MB | 7,9 MB |

Novembro é o primeiro mês com volume: **24 vídeos em 18 dias = 40 por mês, ≈ 318 MB por mês** no peso real do mês. Os meses anteriores são poucos para tirar tendência.

**Análises × vídeos (`aurea.analises`):**

| | |
|---|---|
| Análises (moedas) | 231, em 41 envios (bancada 204, cadastro direto 27) |
| Com vídeo / sem vídeo | 150 / 81 (os 81: 27 do cadastro direto + 54 da bancada, anteriores ao vídeo funcionar ou fechadas sem ele) |
| Vídeos distintos apontados pelas análises | 26 (média de 5,77 moedas por vídeo) |
| Peso por moeda analisada com vídeo | 1,75 MB |
| Moedas analisadas por mês | setembro 127 · outubro 57 · novembro 47 (envios: 6 · 10 · 25) |
| **Arquivos no balde que nenhuma análise aponta** | **6 arquivos, 66,67 MB (20% do total)** |
| Análises com caminho de vídeo sem arquivo no balde | 0 (nenhuma prova perdida) |

Os 6 sem análise (só protocolo, nenhum dado pessoal): `RO-ENV-0006/RO-ENV-0006-9.webm` (8,44 MB) · `RO-ENV-0012/RO-ENV-0012-3.webm` (27,00 MB) · `RO-ENV-0024/RO-ENV-0024-1.webm` (8,36 MB) · `RO-ENV-0037/RO-ENV-0037-1.webm` (14,94 MB) · `RO-ENV-0044/RO-ENV-0044-1.webm` (6,69 MB) · `RO-ENV-0154/RO-ENV-0154-2.webm` (1,23 MB). O sufixo (`-9`, `-3`, `-2`) sugere regravação; **causa não confirmada**. O que está no balde e a análise aponta pesa 262,10 MB.

**Duração (estimada, não medida).** A duração não é guardada. Se o Chrome gravou no padrão dele de ≈ 2,5 Mbps (premissa da auditoria de 30/10, que diz ≈ 19 MB por minuto; eu não gravei para conferir), o vídeo médio dura ≈ 33 segundos e o maior (39 MB) ≈ 2 minutos. **O risco que isso revela:** no Free o teto é 50 MB por arquivo, que a 2,5 Mbps são **2 min 40 s** de gravação. O maior vídeo já usa 78% do teto; um envio mais demorado falha com "413" (a bancada avisa e guarda a gravação, mas o vídeo não sobe).

## 4. Projeção em 3, 6 e 12 meses (T4)

**Como se calcula (para o Gabriel refazer com números dele):** *vídeos por mês × 10,27 MB*. Regra de bolso: **cada 100 envios por mês acumulam ≈ 1 GB por mês.** Ponto de partida: 0,32 GB em 18/11/2026. Os três cenários são **hipóteses minhas de volume** (o projeto não tem previsão de envios) e valem como régua, não como previsão:

| Cenário | Envios/mês | Crescimento |
|---|---|---|
| **A — ritmo de hoje** | 40 (o de novembro) | 0,40 GB/mês |
| **B — lançamento** | 150 | 1,50 GB/mês |
| **C — escala** | 500 | 5,01 GB/mês |

**Espaço ocupado (GB) no peso atual da gravação:**

| Cenário | Hoje | em 3 meses (fev/27) | em 6 meses (mai/27) | em 12 meses (nov/27) |
|---|---|---|---|---|
| A | 0,32 | 1,52 | 2,73 | 5,14 |
| B | 0,32 | 4,83 | 9,35 | 18,37 |
| C | 0,32 | 15,37 | 30,41 | 60,50 |

**Se a gravação for limitada a 1,5 Mbps** (−40% sobre o que entra daqui para a frente; estimativa, seção 7):

| Cenário | em 3 meses | em 6 meses | em 12 meses |
|---|---|---|---|
| A | 1,04 | 1,77 | 3,21 |
| B | 3,03 | 5,74 | 11,15 |
| C | 9,35 | 18,37 | 36,43 |

**Quando acaba:**

| | Free (1 GB) | Pro (100 GB) |
|---|---|---|
| A, peso atual | **07/01/2027** (51 dias) | mais de 20 anos |
| A, ritmo real de novembro em MB (318 MB/mês) | **22/01/2027** | — |
| A, com bitrate 1,5 Mbps | 10/02/2027 | — |
| B, peso atual | **01/12/2026** (14 dias) | 66 meses |
| C, peso atual | **22/11/2026** (4 dias) | **20 meses** (≈ jul/2028) |

**Saída de dados (egress).** Cada vez que alguém assiste, o vídeo desce inteiro (≈ 10 MB). Free dá 5 GB por mês (≈ 490 exibições); Pro dá 250 GB (≈ 24 mil). Hoje só o painel assiste, então é desprezível; vira conta se um dia o cliente puder reassistir o próprio vídeo.

## 5. Preços (T3) — consultados em 18/11/2026 nas páginas oficiais

Valores em dólar, como cada fornecedor cobra. Para reais: **≈ R$ 5,50 por US$** (referência: PTAX de venda de 05/11/2026 = R$ 5,4621, segundo notícia achada em busca; **não é a cotação do dia**) **mais o IOF do cartão internacional**. Conferir o câmbio no dia de pagar.

| Fornecedor | Armazenamento | Saída de dados (egress) | Franquia grátis | Pegadinhas | Fonte |
|---|---|---|---|---|---|
| **Supabase Free** | incluso: 1 GB | 5 GB/mês | — | **50 MB por arquivo**; projeto pausado após 1 semana sem uso; US$ 0 | [supabase.com/pricing](https://supabase.com/pricing) |
| **Supabase Pro** | incluso: 100 GB; excedente **US$ 0,0213 por GB/mês** | 250 GB/mês; excedente **US$ 0,09 por GB** | — | **US$ 25/mês fixos pelo projeto inteiro** (não só vídeo); sem pausa; arquivo até 500 GB (o texto da página; valor incomum, conferir antes de contar com ele) | [supabase.com/pricing](https://supabase.com/pricing) · [docs: Storage pricing](https://supabase.com/docs/guides/storage/management/pricing) |
| **Cloudflare R2** (Standard) | **US$ 0,015 por GB/mês** | **grátis** | 10 GB/mês de armazenamento, 1 milhão de operações A e 10 milhões de B | operações: US$ 4,50 por milhão (A) e US$ 0,36 por milhão (B); a franquia só vale para o Standard | [developers.cloudflare.com/r2/pricing](https://developers.cloudflare.com/r2/pricing/) |
| **Backblaze B2** | **US$ 6,95 por TB/mês** (≈ US$ 0,00695 por GB) | grátis até 3× o que está guardado; acima, US$ 0,01 por GB | 10 GB grátis; chamadas de API A, B e C grátis | sem mínimo mensal e sem tempo mínimo de guarda; **a página não traz data (rodapé "© 2024")** — confirmar o preço no momento de contratar | [backblaze.com/cloud-storage/pricing](https://www.backblaze.com/cloud-storage/pricing) |
| **Wasabi** (pago por uso) | **US$ 7,99 por TB/mês**, **cobrando no mínimo 1 TB** | sem cobrança de saída | — | **mínimo mensal de 1 TB = ≈ US$ 7,99 por mês mesmo guardando 5 GB**; apagar não alivia por 90 dias | [wasabi.com/pricing](https://wasabi.com/pricing) |

Não consultei S3 da Amazon nem Google Cloud: cobram saída de dados e não trazem vantagem de preço neste porte.

## 6. Custo mensal projetado (peso atual da gravação, US$/mês)

Conta feita sobre o espaço ocupado em cada ponto da seção 4. "Free" mostra **não cabe** onde passa de 1 GB.

| Cenário | Quando | Espaço | Supabase Free | Supabase Pro | Cloudflare R2 | Backblaze B2 | Wasabi |
|---|---|---|---|---|---|---|---|
| A | 3 meses | 1,52 GB | **não cabe** | 25,00 | 0,00 | 0,00 | 7,99 |
| A | 6 meses | 2,73 GB | **não cabe** | 25,00 | 0,00 | 0,00 | 7,99 |
| A | 12 meses | 5,14 GB | **não cabe** | 25,00 | 0,00 | 0,00 | 7,99 |
| B | 3 meses | 4,83 GB | **não cabe** | 25,00 | 0,00 | 0,00 | 7,99 |
| B | 6 meses | 9,35 GB | **não cabe** | 25,00 | 0,00 | 0,00 | 7,99 |
| B | 12 meses | 18,37 GB | **não cabe** | 25,00 | 0,13 | 0,06 | 7,99 |
| C | 3 meses | 15,37 GB | **não cabe** | 25,00 | 0,08 | 0,04 | 7,99 |
| C | 6 meses | 30,41 GB | **não cabe** | 25,00 | 0,31 | 0,14 | 7,99 |
| C | 12 meses | 60,50 GB | **não cabe** | 25,00 | 0,76 | 0,35 | 7,99 |

**Leitura:** nos três cenários, R2 e B2 custam **de zero a menos de 1 dólar por mês** durante 12 meses; Wasabi é o único mais caro que o necessário por causa do mínimo de 1 TB; o Pro é o único valor "de verdade" (≈ R$ 138) e, no Supabase, o excedente passado de 100 GB custa só US$ 2,13 por mês a cada 100 GB. O R2 é mais barato que o Supabase por GB, mas a diferença é de centavos.

### As três saídas, lado a lado

| | 1. Pro no Supabase | 2. Ficar no Free e mandar o vídeo para R2/B2 | 3. Só limitar o peso da gravação |
|---|---|---|---|
| Custo | US$ 25/mês (≈ R$ 138) | US$ 0 até ≈ 10 GB; depois centavos | US$ 0 |
| Esforço | nenhum de código: é assinar | **médio**: trocar a assinatura e a leitura em `video.ts` (estação e painel), liberar CORS no balde novo para o envio do navegador, guardar variáveis novas na Vercel e copiar os 32 arquivos **com o mesmo caminho** (senão o hash quebra) | pequeno: uma linha em `GravadorDeVideo.tsx` e outra no gravador da estação |
| Riscos | nenhum de código | segundo fornecedor para vigiar; **o vídeo sai do Brasil** (o projeto do Supabase roda em São Paulo, `sa-east-1`; nas páginas de preço do R2 e do B2 **não vi região no Brasil**, a conferir); o Free continua pausando por inatividade e limitado a 50 MB por arquivo | só adia: de 07/01 para 10/02/2027 no Free |
| Resolve o espaço? | **sim, por mais de 20 meses no cenário C** | sim, por muitos anos | não sozinho |

## 7. Alavancas baratas (só proposta: nada foi mexido)

1. **Limitar a taxa de bits da gravação** — de ≈ 2,5 Mbps (padrão do Chrome) para ≈ 1,5 Mbps, passando `videoBitsPerSecond: 1_500_000` ao `MediaRecorder` em `GravadorDeVideo.tsx` e no gravador da estação (`estacao/renderer/app.js`). **Ganho estimado: 40%** (11,25 MB por minuto, em vez de 18,75) e o teto de 50 MB do Free passa de 2 min 40 s para ≈ 4 min 30 s. Já estava proposto na auditoria de 30/10 e não foi feito. **Antes de aprovar:** gravar 60 segundos de um procedimento real com os dois valores e ver se a moeda continua legível — o vídeo é prova do laudo, e o que vale é o Rogério olhar o resultado, não o número. *(Ganho estimado, não medido.)*
2. **Resolução e quadros por segundo** — hoje o pedido é 1920×1080. Em cena parada, reduzir para 1280×720 e 15 quadros por segundo pode economizar mais, mas é a alavanca que mais mexe na nitidez: só com teste do Rogério. *(Não medido.)*
3. **Parar de deixar arquivo órfão** — ao regravar, o arquivo anterior fica no balde (20% do total hoje). Proposta: apagar o anterior no ato de regravar, ou uma faxina periódica dos arquivos que nenhuma análise aponta. **Só com decisão do Gabriel**; hoje eu apenas listei.
4. **Compactar em segundo plano** (regravar em formato mais eficiente depois do envio) — **não recomendo agora**: precisaria de um processador de vídeo fora da Vercel (que não roda isso), pelo mesmo ganho que a alavanca 1 dá de graça.
5. **Política de retenção** — decide o tamanho de tudo daqui a 12 meses mais do que qualquer ajuste acima, mas **não é minha decisão** (seção 8).

## 8. Perguntas para o Gabriel e o jurídico

A retenção de foto e vídeo, que o `CLAUDE.md` registra como pendente antes de qualquer cliente real, **não está definida**; eu não decido. O que precisa ser respondido:

1. **Por quanto tempo guardar o vídeo de uma moeda?** Enquanto ela estiver na custódia? Mais quanto depois de vendida, devolvida ou recusada?
2. **Pode apagar o vídeo e manter só a prova de que ele existiu?** Hoje o laudo guarda o **caminho** do arquivo dentro do hash, não o hash do vídeo em si; apagar o arquivo deixaria um caminho apontando para o vazio. Se a resposta for "pode apagar", é preciso **gravar o SHA-256 do vídeo antes de apagar** (decisão de produto, a desenhar à parte).
3. **Pode o vídeo sair do Brasil?** Só importa se a opção 2 da seção 6 for adiante; o Supabase de hoje está em São Paulo.

## 9. Como repetir a medição

```powershell
node scripts/medir-armazenamento.mjs          # relatório em texto
node scripts/medir-armazenamento.mjs --json   # o mesmo em JSON, para planilha
```

Somente leitura: a única chamada à API é `list`; o Postgres roda em `BEGIN READ ONLY`, sem `SET` de sessão; não assina URL, não escreve, não apaga. Lê `SUPABASE_SERVICE_ROLE_KEY` e `POSTGRES_URL` do `.env.local` (ou do ambiente) e **não imprime nenhum valor**, só o endereço do projeto e o nome do balde. Fora de `src/*.test.ts`, de propósito.

## 10. Limites desta medição (o que não foi verificado)

- **O plano do Supabase não foi confirmado** (sem login no painel; Vercel só tem a integração Upstash). "Free" é indício dos documentos de setembro, não fato.
- **A taxa de bits real e a duração dos vídeos não foram medidas.** Os números em minutos usam o padrão do Chrome citado na auditoria de 30/10.
- **Não verifiquei o que o Supabase faz quando o Free estoura** (restringe o projeto? bloqueia envio?). Trate como "a gravação para de subir"; a bancada guarda a cópia local e avisa, mas o vídeo não entra na análise.
- **Os cenários de volume são hipóteses.** O projeto ainda é um MVP de teste com contas de sócios; parte dos 32 vídeos são de teste.
- **Preços**: lidos nas páginas oficiais em 18/11/2026. A do Backblaze não traz data; a do Supabase diz "from $25/month". Confirmar no ato de contratar.
- **Região do R2 e do B2**: não verificada além das páginas de preço.
