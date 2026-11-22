# MD de execução | Manutenção 22-11 · T3 Balcão: vídeos, peso, caixas e hashes

## RETOMADA (atualizar a cada tópico)

```
Chat:      Manutenção 22-11 | T3 Balcão vídeos peso caixas | Branch (filho do Controle)
Método:    v2.2 — pasta completa, sem worktree, sem branch, SEM build local, sem commit/push
Lido:      CLAUDE.md, Garantia e Plano hiperdetalhado (Manutenção 22-11), GravadorDeVideo.tsx, BancadaWeb (trechos de vídeo),
           diff local de peso, corrigir-videos-e-posicoes.cjs (cabeçalho)
Não lido:  video.ts (server), RELATORIO_ARMAZENAMENTO_VIDEOS, TUTORIAL_BALDE_SUPABASE, scripts antigos de caixa
Estado:    N1 diagnosticado (código já corrigido desde 30/10) · N2 código revisado + teste verde, DADOS NÃO corrigidos (lista abaixo)
           · N3 só explicação + dry-run; --aplicar NÃO rodado (aguarda "sim" do Gabriel)
Pendente:  decisão do Gabriel (posições; 14 envios com peso < 1 g; 2 órfãos); typecheck global tem 1 erro de T2 (isencao.test.ts:119)
```

## Escritas em produção feitas POR ESTE CHAT (autorizadas pelo Gabriel: "Peso e posições")
1. `node corrigir-videos-e-posicoes.cjs --aplicar`: 18 posições reordenadas (EB-002: RO-000191…203; EB003: RO-000209…213), cadeia de hashes refeita do GENESIS e `recibos.hash` atualizado. Conferido depois: corrente confere (257), dry-run diz "Nada a corrigir".
2. `UPDATE aurea.envios SET peso_inicial_mg=7000` em 11 envios de Bandeira que tinham 7 (RO-ENV-0015, 0016, 0018, 0023, 0038, 0039, 0040, 0041, 0042, 0043, 0046). Transação com trava de contagem = 11. `peso_inicial_mg` não entra no hash.
**Não alterados (ambíguos):** RO-ENV-0014 (789), RO-ENV-0003 (900), RO-ENV-0048 (9) — aguardam o Gabriel.
Pendente: o lugar FÍSICO das 18 moedas precisa ser ajustado para bater com as posições novas; conferir ficha do admin e recibo do cliente em produção.
(Antes disso, só `BEGIN READ ONLY … ROLLBACK`.) As escritas anteriores do dia (ligar vídeos de RO-ENV-0012/0024/0037/0044, refazer cadeia do GENESIS e `recibos.hash`, cancelar a fatura R$ 52) são da Garantia §2, feitas antes deste chat.

## N1 — Vídeos

**Causa de "análise fechada sem caminho de vídeo" (medida em 22/11, leitura):**

| Grupo | Análises | Causa |
|---|---|---|
| RO-DIR-0001…0004 (cadastro direto, 23–24/09) | 27 | Sem vídeo por natureza: a moeda já estava em custódia, não houve procedimento filmado |
| RO-ENV-0009, 0013, 0010, 0014, 0018, 0019, 0038, 0048 (bancada, "recebida em mão", "comprada no evento"…, 06/10–20/11) | 53 | Todos são **cadastro sem envio**: moeda entregue em mão/comprada, o operador fechou **sem vídeo** (a bancada permite e grava a ausência no hash). Não é falha de upload |
| RO-ENV-0012 (3), 0024, 0037, 0044 | 6 | Aqui sim: vídeo subiu e o caminho não foi carregado. **Ligados em 22/11** (Garantia §2) |

- A hipótese "upload termina depois do clique em Fechar" **não procede no código atual**: `BancadaWeb` desabilita Fechar enquanto `video.gravando` (`BancadaWeb.tsx:117,207,392`); `GravadorDeVideo` mantém `gravando: true` no pai até `subir()` terminar (a mudança só é emitida em `subir`), e envio que falhou vira `naoSubiu`, exigindo segunda confirmação para fechar (correção de 30/10/2026). **Não verifiquei** as datas de fechamento dos envios 12, 24, 37 e 44 contra a correção de 30/10 (os de número 37 e 44 podem ser posteriores). Se forem, há outra causa ainda não achada (ex.: troca de envio na tela zerando o caminho: o `useEffect` de `GravadorDeVideo` chama `aoMudar({caminho:null})` ao mudar `protocolo`/`habilitado`). Cabe uma auditoria dessas 4 datas antes de dizer "causa fechada".
- Os 26 caminhos do banco apontam para objetos que existem (32 objetos no Storage).
- **Órfãos (NÃO apagados):** `RO-ENV-0006/RO-ENV-0006-9.webm` (8,8 MB, 23/09) e `RO-ENV-0154/RO-ENV-0154-2.webm` (1,3 MB, 19/09). Em produção os envios vão de RO-ENV-0001 a 0048 (45 linhas): **RO-ENV-0154 nunca existiu lá** (é de teste, anterior ao banco real) e **RO-ENV-0006 não está mais na tabela** (envio apagado/limpo de teste; nenhuma análise o cita). Sem dono a quem ligar. Decisão de apagar ou arquivar: Gabriel.
- **Pendente de conferência no ar** (Tester, navegador logado): botão de vídeo na ficha das moedas dos envios 12, 24, 37, 44. Não consegui conferir aqui (admin exige sessão).

## N2 — Peso padrão

- Código local revisado: `pesoPadraoOuInicial` ignora < 1 g (`PESO_MIN_MG`); `cadastro-direto.ts` e `cadastro-sem-envio.ts` só aceitam ≥ 1000 mg; formulário pede gramas e converte (vírgula ou ponto). Coerente com a rota da estação (mesma faixa 1–100 g).
- Teste novo em `src/domain/admin/bancada.test.ts` (7000 → "7"; 7 → "7"; 789 → "7,84"; 999 → "7"; 1000 → "1"). `vitest` desse arquivo: **10/10 verde**.
- `tsc --noEmit`: **1 erro, fora do T3** — `src/domain/isencao.test.ts(119,12)` (T2).
- Dado gravado em `analises.peso_mg` está certo (7000/7840/7890). O defeito é só `envios.peso_inicial_mg` < 1000 — **14 envios, todos `cadastro_sem_envio` (leitura, nada corrigido):**

| Envio | Tipo | peso_inicial_mg | Proposta |
|---|---|---|---|
| RO-ENV-0015, 0016, 0018, 0023, 0038, 0039, 0040, 0041, 0042, 0043, 0046 (11) | Bandeira | 7 | padrão 7000 |
| RO-ENV-0048 | Bandeira | 9 | **ambíguo** (9 g? provável erro) — confirmar |
| RO-ENV-0003 | Bandeira | 900 | **ambíguo** (0,9 g; provavelmente 7 g) — confirmar |
| RO-ENV-0014 | Direitos Humanos | 789 | provável 7,89 g = 7890 (existe análise de 7890) |

`peso_inicial_mg` não entra no hash. Correção por UPDATE só depois do "sim" do Gabriel nesta lista.

## N3 — Código × posição × hash

**Regra vigente (05/10/2026):** dentro de cada caixa, a posição segue a **ordem do código da moeda, por tipo**. Uma caixa guarda um tipo; quando há moeda de outro tipo no meio da sequência de códigos (ex.: Direitos Humanos entre códigos de Bandeira na EB-002), a posição **pula**, e isso não é erro. RO-000183 em EB-002/posição 75 está **conforme** (o dry-run de 22/11 não a lista entre as 18 fora de ordem).

**O que não está conforme (dry-run, `corrigir-videos-e-posicoes.cjs`, sem escrever):** 18 análises —
- EB-002: RO-000191…000201 (posições 85→83 … 95→93) e RO-000202/203 (83/84 → 94/95): 13 moedas, rotação de 83–95.
- EB003: RO-000209…000213 (2,3,4,5,1 → 1,2,3,4,5): 5 moedas.
- Corrente atual dos hashes confere (257). Aplicar refaz a corrente do GENESIS e `recibos.hash`.

**Não rodei `--aplicar`.** Pergunta ao Gabriel: reordenar (muda o que está escrito, só vale se a moeda física for movida também) ou manter o lugar físico e aceitar a exceção? Padronização dos nomes das caixas EB003/EB-004 também é dele. Item 5 do plano (teste "posição segue o código dentro do tipo") **não feito**: só faz sentido depois da decisão, senão o teste nasce vermelho com os dados de hoje.

## Cruzamento com a Garantia (§ do Plano T3)

| Aceite T3 | Estado |
|---|---|
| Causa do "sem vídeo" documentada | feito (acima) |
| …e corrigida | fluxo de bloqueio no código desde 30/10; 4 órfãos ligados em 22/11; **causa dos 4 não fechada** (datas não conferidas) |
| Peso certo na bancada e no cadastro | código + teste feitos; **dados dos 14 envios pendentes de "sim"** |
| Posições alinhadas se o Gabriel autorizar | **aguardando decisão** |
| Hash chain confere | confere hoje (257); refeita pelo script de 22/11 |
| Botão de vídeo no admin em produção | **não conferido** (precisa do Tester logado) |

## Atualização (pedido do Controle: lugar físico vale)
- Decisão do Gabriel chegou DEPOIS de as 18 posições já terem sido aplicadas (o "Peso e posições" dele nesta sessão). Estado hoje: posições reordenadas pelo código. O reverso (voltar ao lugar físico original) é o mapeamento do dry-run invertido: EB-002: 191→85, 192→86, … 201→95, 202→83, 203→84; EB003: 209→2, 210→3, 211→4, 212→5, 213→1. Não aplicado; aguarda o plano ir ao Gabriel.
- Posição/caixa moram só em `analises` (+ hash e `recibos.hash`); mudar posição NÃO toca código de moeda. Referências aos 18 códigos: `recibos` 18, `sell_offers` 0, `retiradas` 0, `reservas_compra` 0. Ledger/trades/estado jsonb e donos das moedas: NÃO levantados.
- **Causa dos 4 vídeos órfãos (audit_log):** em 12, 24, 37 e 44 o servidor recebeu `caminhoVideo: null` DEPOIS de `assinar_video` (vídeo assinado e no Storage 32 s a 1h46 antes do fechamento); 24 e 37 têm novas aberturas ("abrir") após o vídeo. Causa provável (não reproduzida em tela): trocar de envio na fila e voltar fazia o `useEffect` de `GravadorDeVideo` zerar o caminho já enviado. Correção feita: o gravador guarda o caminho por protocolo (`subidos`) e o devolve ao voltar. `tsc`: só o erro de T2. Sem teste de componente.

## ESCRITA EM PRODUÇÃO #3 — reverso das 18 posições (Opção A, "Sim, Opção A" do Gabriel via Controle, 22/11)
- Uma transação: `posicao_caixa` das 18 moedas de volta ao lugar físico original (EB-002: 191→85 … 201→95, 202→83, 203→84; EB003: 209→2, 210→3, 211→4, 212→5, 213→1); códigos intactos. Trava: cada UPDATE precisava afetar 1 linha, e posição repetida na caixa abortaria.
- Hash chain refeita do GENESIS (257) e `recibos.hash` (253). **Resultado:** COMMIT, 0 quebras; depois, em releitura: 0 quebras e 0 recibos com hash diferente da análise. RO-000183 segue em EB-002/75.
- Backup antes (fora do repo): `C:\Users\Gabriel\AppData\Local\Claude-Data\claude_pzs8sxrjxfjjc\side-session-notes\local_e60062ca-6f76-4427-b0f8-5a8d5c7ed6b5\backup-analises-recibos-22-11-antes-do-reverso.json` (analises + recibos, estado com as posições "por código").
- Script usado: `docs/diario/execucoes/2026-11-22--manut2-t3-reverso-posicoes.cjs.txt` (cópia; roda a partir da raiz).
- `corrigir-videos-e-posicoes.cjs` (raiz) NÃO deve ser rodado de novo sem `--so-videos`: reordenaria as posições pelo código outra vez.
- Regra vigente passa a ser: posição = lugar físico; as 18 moedas são exceção à ordem do código.
