# H · Correios — cancelar pré-postagem: o que o projeto faz e como a ação nova deve se comportar (17/11/2026)

## Conclusão (sem rodeio)

1. **O cancelamento que o projeto usa funciona e está provado em produção:** `DELETE /prepostagem/v1/prepostagens/{id}` (`cancelarPrePostagem`, `src/lib/shipping/cws/prepostagem.ts:172`). Provas: teste real de 22/10/2026 (`{"resultadoCancelamento":"Cancelamento realizado com sucesso!"}`, em `docs/EXECUCAO_CORREIOS_CWS.md:58`) e o caso real do `RO-ENV-0036`, cuja etiqueta foi cancelada em 13/11/2026 06:53 (`canceladaEm` gravado; ver `h-caso-rogerio.md`). O manual público dos Correios confirma que o cancelamento aceita **o id da pré-postagem ou o código do objeto** (Manual de Integração, Rev. 04/2025 V2.4, p. 60, item N).
2. **O que o `DELETE` responde quando a etiqueta já está postada (3), pré-atendida (1), estornada (6), expirada (4) ou cancelada (5) NÃO está documentado em fonte pública e NUNCA foi medido no projeto.** Só li o código e o manual público. A documentação completa (swagger do CWS) fica atrás de login (`cws.correios.com.br` redireciona para `cas.correios.com.br/login`) e não consegui abri-la. O código só sabe que erro HTTP vira `ErroCorreios(status, mensagens)`; a mensagem `'Objeto já postado'` que aparece nos testes (`admin/logistica.test.ts:276`) é **inventada pelo teste**, não é resposta real.
3. **Por isso a ação nova não deve decidir pela resposta do `DELETE`:** deve **consultar primeiro** (`consultarPrePostagem`, que o projeto já usa e cujos números de status vêm de testes reais) e só chamar `DELETE` quando o status provar que o pacote não foi postado. Quem não deve ser chamado: `DELETE` em 3, 4, 5, 6 e 1.
4. **Duas lacunas no código atual que a ação nova herdaria** (detalhe na seção 3): (a) a varredura diária, ao **refazer** um cancelamento que falhou, não consulta o status — se o `DELETE` já tinha dado certo nos Correios e só a gravação de `canceladaEm` falhou, o `DELETE` repetido pode dar erro para sempre e a etiqueta fica "ativa" no nosso lado; (b) o prazo de validade da etiqueta tem três números diferentes nas fontes (7, 15 e 90 dias).
5. **Recomendação de ordem para ação feita por pessoa (cliente ou equipe): consultar → `DELETE` → só então estornar** (a ordem inversa da varredura diária; justificativa na seção 4). Se a Execução preferir manter a ordem do MD (estornar e depois cancelar), a seção 4 diz o risco residual.

---

## 1. Como o projeto fala com os Correios hoje

| Peça | Onde | O que faz de verdade |
|---|---|---|
| `chamarCws(caminho, {metodo, query, corpo})` | `src/lib/shipping/cws/cliente.ts:139` | Token de 24 h em memória (renova com 10 min de folga ou no 401, **uma** vez). Timeout de 20 s. Resposta `!ok` → `ErroCorreios(mensagens da API ou "Os Correios responderam HTTP N.", status, msgs[])`. Corpo vazio → `null`. **Contrato não configurado → `ErroCorreios(..., 0)`**. |
| `cancelarPrePostagem(id)` | `prepostagem.ts:172` | `DELETE /prepostagem/v1/prepostagens/{id}`, sem corpo, e **ignora o corpo da resposta** (só `void`). Não tem teste unitário na biblioteca (`cws.test.ts` não cobre) — só dublês nos testes de quem a chama. |
| `consultarPrePostagem(codigoObjeto)` | `prepostagem.ts:184` | `GET /prepostagem/v2/prepostagens?codigoObjeto=…` (manual item M: a consulta aceita id, código ou e-ticket) → `{ id, codigoObjeto, statusAtual, descricao }` do 1º item, ou `null` se não há item. Mapa de status no comentário do código: **1 pré-atendido, 2 pré-postado, 3 postado, 4 expirado, 5 cancelado, 6 estornado, 7 pendente** (7→2 confirmado em 22/10; os demais vêm do comentário — o manual público **não** traz essa tabela). |
| `cancelarSemLancar(id, protocolo)` | `src/server/shipping/frete-envio.ts:307` | Chama `cancelarPrePostagem`, **engole qualquer erro** (só `console.error`) e devolve `true/false`. Usado (i) quando a emissão perde a corrida e sobra uma etiqueta (`:297`, `:302`) e (ii) na varredura diária (`:431`). |
| `desconsiderarEnviosVencidos` | `frete-envio.ts:351` | Consulta antes de agir. `STATUS_NAO_POSTADO = {2, 4, 5, 7}` libera; **1, 3, 6, status ausente, sem resposta ou erro de consulta seguram** o envio ("na dúvida, não se desfaz um envio que pode estar a caminho", `:321-327`). Status **5** vira "já cancelada" e **pula o `DELETE`** (`:380`, `:426`). Depois da transação, cancela e grava `prePostagem.canceladaEm`; falha fica para a volta seguinte. |
| `cancelarEtiquetaRetirada` | `src/server/actions/admin/logistica.ts:299` | **`DELETE` primeiro**; se os Correios recusam, devolve `"Os Correios recusaram: <mensagens>"`, audita `{ok:false}` e **não altera a ficha** ("a etiqueta continua valendo e a nossa ficha não pode dizer o contrário"). Sem consulta prévia. |
| `prePostagemAtiva(envio)` | `src/domain/envios.ts:79` | Etiqueta existe **e** `canceladaEm` vazio. É a única definição de "etiqueta ativa" do sistema — por isso `canceladaEm` precisa ser gravado. |

Erros que `chamarCws` pode lançar e que a ação nova precisa distinguir:

| O que acontece | O que chega | Leitura |
|---|---|---|
| Contrato ausente (dev local) | `ErroCorreios` status **0** | Não há etiqueta possível (a emissão exige contrato). Ação segue sem I/O. |
| Correios recusam (HTTP 4xx/5xx) | `ErroCorreios` status N, `mensagens[]` | Recusa explícita ou falha do lado deles. Mostrar as mensagens, nada alterado. |
| Timeout (20 s) ou rede | **exceção que NÃO é `ErroCorreios`** (o `AbortSignal.timeout` do `fetch` propaga como está; o comentário de `cliente.ts:135-138` diz o contrário) | **Estado incerto**: o `DELETE` pode ter acontecido. A próxima tentativa tem de consultar antes de agir. |

## 2. O que acontece em cada status — o que se SABE × o que se SUPÕE

| `statusAtual` | Significado | O que se sabe | O que se supõe (sem fonte) |
|---|---|---|---|
| **7 pendente** | ~1 s depois de criada, enquanto os Correios emitem a declaração de conteúdo | Medido em 22/10/2026 (`prepostagem.ts:211-219`). | Se o `DELETE` é aceito nessa janela — não medido. A janela é de ~1 s; só aparece em duplo clique logo depois de pagar o frete. |
| **2 pré-postado** | Etiqueta emitida, aguardando postagem (rastro FC/82) | `DELETE` aceito e rastro vira FC/84 "cancelado" (22/10 e 13/11). | — |
| **1 pré-atendido** | Pelo comentário do código: "o cliente está no balcão" | Só o comentário (`frete-envio.ts:323-324`). | Que o `DELETE` seria recusado, e que é postagem em curso. |
| **3 postado** | Objeto aceito numa agência | A varredura trata como "pode estar a caminho". | Resposta do `DELETE` (provável recusa 4xx com mensagem em `msgs`); o manual do PPN diz que só "Aguardando Postagem" é cancelável (varejo sem contrato). |
| **4 expirado** | Prazo de postagem passou sem postar | Conta como "não postado" na varredura. | Se o `DELETE` é aceito, recusado ou indiferente. |
| **5 cancelado** | Já cancelada (por nós, pelo portal ou pelos Correios) | A varredura **não chama `DELETE`** nesse caso. | **Se um segundo `DELETE` dá erro ou sucesso** — é o ponto de idempotência e é desconhecido. |
| **6 estornado** | Sem definição no manual público | A varredura trata como "segura o envio". | Que significa postagem estornada/cobrança revertida — não confirmado. |

**Prazo de validade (três números).** Glossário do Manual de Integração (p. 5): "Expiração… atualmente esse prazo é de **7 dias corridos**". Manual do PPN (pré-postagem de varejo, cartão de crédito): **15 dias corridos**. A resposta real do **nosso contrato**: `prazoPostagem` ≈ **90 dias** (22/10: "validade padrão de 90 dias"; `RO-ENV-0036`: criada em 09/11, `prazoPostagem` 07/02/2027). **Vale o que a API devolve** (`PrePostagemRegistro.prazoPostagem`). Efeito prático: dentro da regra de 3 dias a etiqueta **nunca** está expirada; o status 4 só aparece em cancelamento de envio abandonado há meses (a ação da equipe).

## 3. Lacunas do código atual (a ação nova não deve herdá-las)

1. **Refazer cancelamento sem consultar** (`frete-envio.ts:390-395` + `:425-432`). O mapa `aCancelar` inclui envios **já desconsiderados** com etiqueta ativa, mas `jaCanceladasNosCorreios` só é preenchido para os candidatos novos (`envioVenceuPrazoDePostagem` exclui quem já tem `desconsideradoEm`). Cenário: o `DELETE` deu certo nos Correios, a segunda `mutateState` (que grava `canceladaEm`) falhou → na volta seguinte o `DELETE` repete numa etiqueta já cancelada. **Se a API devolver erro** (provável, mas não medido), `cancelarSemLancar` dá `false` para sempre: a etiqueta fica "ativa" para o sistema, o envio nunca "fecha" e o log se repete todo dia. **Correção sugerida (dentro da ação nova, sem mexer na varredura):** antes de qualquer `DELETE`, consultar; status 4 ou 5 → gravar `canceladaEm` sem `DELETE`.
2. **Timeout deixa o estado incerto** e hoje o código trata "erro" e "incerto" do mesmo jeito. A ação nova deve tratar "exceção que não é `ErroCorreios`" como **incerto** e responder "nada foi alterado, tente de novo" — sem estornar.
3. **Sem teste do `DELETE` na biblioteca** e sem nenhuma mensagem real de recusa registrada. Todos os testes usam dublê.
4. **`isEnvioDesconsiderado` não desconsidera, na leitura, envio vencido com etiqueta ativa** (`envios.ts:133`, `:194`): o servidor só decide depois de perguntar aos Correios. A ação de cancelamento é a segunda porta para o mesmo estado e precisa seguir a mesma cautela.

## 4. Recomendação — como a ação deve se comportar em cada situação

**Ordem (ação feita por pessoa: cliente em `envios`, equipe em `/admin/logistica`, "Cancelar validação" na bancada):**

1. Ler o envio. Sem etiqueta ativa (`prePostagemAtiva` nulo) → **não há I/O**; vai direto ao núcleo (estornos).
2. Com etiqueta ativa e `etapaAtual === 'Protocolo gerado'`: `consultarPrePostagem(codigoObjeto)` e aplicar a tabela abaixo.
3. Se a tabela mandar cancelar: `cancelarPrePostagem(id)`. **Só depois que ele voltar `ok`** (ou que a consulta já tenha dito 4/5) abrir a `mutateState` com o núcleo (frete + 1º mês + nota) e gravar `prePostagem.canceladaEm` **na mesma transação** do núcleo.
4. Reconferir **dentro** da transação (guarda dupla, como a Execução já planejou).

**Por que `DELETE` antes do estorno (para ação de pessoa).** O `DELETE` é a única prova forte de "não foi postado": se o pacote tivesse sido postado, a API recusaria. Estornar antes e cancelar depois (a ordem da varredura e do item 6 do MD) deixa uma janela com **dinheiro devolvido e etiqueta viva** — o cliente poderia postar e os Correios cobrariam o frete da Áurea de um envio que o sistema deu por cancelado. É também o padrão que o projeto já usa em `cancelarEtiquetaRetirada` (`logistica.ts:313`). O custo da ordem recomendada: se o `DELETE` passar e a transação falhar, resta "etiqueta cancelada, envio ainda aberto" — recuperável, porque a ação repetida consulta, vê status 5 e segue direto ao estorno. A varredura diária continua como está: ela já consultou e não tem uma pessoa esperando.

| Situação na consulta | O que a ação faz | `DELETE`? | Estorna frete / 1º mês / nota | Mensagem sugerida (pt-BR) |
|---|---|---|---|---|
| **sem etiqueta** (nunca emitida, ou `canceladaEm` já gravado) | segue | não | sim / sim / sim | — |
| **7 pendente** | tratar como 2: tentar `DELETE`; se recusar, **não alterar nada** | sim | só depois do `DELETE` ok | erro: "A etiqueta ainda está sendo preparada pelos Correios. Tente de novo em alguns segundos." |
| **2 pré-postado** | segue | **sim** | sim / sim / sim | "Etiqueta dos Correios cancelada." |
| **5 cancelado** (já estava) | idempotente: grava `canceladaEm`, **não chama `DELETE`** | não | sim / sim / sim | (silencioso para o cliente; a equipe vê "etiqueta já estava cancelada nos Correios") |
| **4 expirado** | igual ao 5 | não | sim / sim / sim | idem |
| **1 pré-atendido** | **recusa**, nada muda | não | não | "O pacote está sendo atendido numa agência agora. Aguarde alguns minutos e tente de novo, ou fale com o atendimento." |
| **3 postado** | **recusa** o cancelamento do envio (cliente). Na bancada, o pacote já postado/recebido segue a regra D-H1 do MD: 1º mês e nota voltam, frete não — **sem `DELETE`** | não | cliente: não / equipe-bancada: **só 1º mês e nota** | "Este envio já foi postado nos Correios e não pode mais ser cancelado por aqui. Fale com o atendimento." |
| **6 estornado** | **recusa** e manda para a equipe; nunca estornar automaticamente | não | não | "Os Correios registram este objeto como estornado. Não dá para cancelar automaticamente — fale com o atendimento." |
| **`null` / sem item / sem `statusAtual`** | **recusa** (na dúvida não se desfaz) | não | não | "Não conseguimos confirmar a situação da etiqueta com os Correios agora. Nada foi alterado." |
| **consulta com erro / timeout** | **recusa**, nada alterado | não | não | "Os Correios não responderam. Nada foi alterado — tente de novo em instantes." |
| **`DELETE` recusado** (`ErroCorreios` 4xx/5xx) | **não altera nada**; audita `{ok:false}` com as mensagens | — | não | `Os Correios recusaram: <mensagens>` (mesmo padrão de `mensagemDosCorreios`) |
| **`DELETE` com timeout** (exceção não-`ErroCorreios`) | **incerto → não altera nada**; a próxima tentativa consulta e cai no 5 | — | não | "Os Correios não responderam. Nada foi alterado — tente de novo." |
| **contrato ausente** (status 0) | só dev local; sem etiqueta possível | — | — | — |

**Idempotência.** Duas chamadas seguidas: a 1ª cancela; a 2ª encontra `canceladaEm` gravado ⇒ "sem etiqueta" ⇒ cai no núcleo, que já devolve `ok:true` sem mexer (envio já cancelado). Se o estado local não gravou mas os Correios já cancelaram ⇒ status 5 ⇒ sem `DELETE`. Nunca depender do texto do erro do `DELETE` para saber se "já estava cancelada".

**Testes que fecham a tabela** (dublê de `consultarPrePostagem`/`cancelarPrePostagem`, como em `frete-envio.test.ts:299-354`): um por linha, mais (i) "`DELETE` ok e transação falha → repetir a ação conclui sem `DELETE` (status 5)", (ii) "timeout no `DELETE` → nada estornado", (iii) "3 postado → nenhum `DELETE`, nenhum estorno de frete".

**Se a Execução mantiver "estornar primeiro, cancelar depois"** (item 6 do MD): funciona com a mesma tabela de status, mas precisa aceitar a janela "dinheiro devolvido + etiqueta viva" e contar com a varredura diária para refazer o `DELETE` — e então a lacuna 1 da seção 3 passa a ser obrigatória de corrigir.

## 5. O que falta medir (precisa de "sim" — não fiz)

Para trocar os "supõe" por fatos bastaria **uma** medição barata e sem efeito colateral: usar a etiqueta **já cancelada** do `RO-ENV-0036` (código do objeto em `envios.pre_postagem->>'codigoObjeto'`) para (1) `GET` e confirmar `statusAtual: 5` e a `descStatusAtual` literal; (2) `DELETE` no mesmo id e registrar o HTTP e as mensagens (resposta ao segundo cancelamento — a idempotência). O `GET` é leitura; o `DELETE` é uma chamada de escrita (de efeito nulo, mas escrita) na API de produção do contrato, com a credencial da empresa — por isso **não executei**: o pedido era ler o código e a documentação. Postado (3), pré-atendido (1) e estornado (6) não dá para provocar sem uma postagem real; para esses vale perguntar ao suporte dos Correios (CWS, "Fale com o suporte de integração") ou abrir o swagger logado, e registrar a resposta aqui.

## Fontes e limites

- **Código lido (worktree em 17/11/2026, base 9e21fe1; os números de linha de `envios.ts` já incluem edições não commitadas da Execução):** `src/lib/shipping/cws/prepostagem.ts`, `cliente.ts`; `src/server/shipping/frete-envio.ts`; `src/server/actions/admin/logistica.ts` e seu teste; `src/server/actions/frete-envio.test.ts`; `src/domain/envios.ts` (`prePostagemAtiva`, `isEnvioDesconsiderado`); `docs/EXECUCAO_CORREIOS_CWS.md`. Também vi que `src/domain/cancelar-envio.ts` (Execução, ainda não commitado) já só diz qual etiqueta cancelar e deixa o I/O de fora.
- **Manual de Integração Correios API, Rev. 04/2025 V2.4** — [PDF público](https://www.correios.com.br/atendimento/developers/arquivos/manual-para-integracao-correios-api), consultado em 17/11/2026: item 15 (API de pré-postagem, p. 50), item M (consulta, p. 60), **item N (cancelamento, p. 60: "pelo id da pré-postagem ou pelo código do objeto")**, glossário "Expiração" (7 dias corridos). Não traz tabela de status nem de erros do cancelamento.
- **[Manual do Usuário PPN](https://www.correios.com.br/atendimento/developers/manual-do-usuario-ppn)**, 17/11/2026: só "Aguardando Postagem", "Postado" e "Cancelado" (varejo, sem contrato); expiração 15 dias corridos; só "Aguardando Postagem" é cancelável. **Perguntas frequentes do PPN**: nada sobre cancelamento.
- **Swagger do CWS: não acessível** (redireciona para `cas.correios.com.br/login`). Nenhuma fonte pública documenta a resposta do `DELETE` por status; **nada na seção 2 coluna "o que se supõe" foi confirmado**.
