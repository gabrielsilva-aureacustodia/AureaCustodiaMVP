# Quadro dos itens do docx × estado real (T4 · N1)

```
Chat:        Manutenção 22-11 | T4 Pendências do docx | Branch
Conferido:   2026-11-22, só leitura (MDs, arquivos da main, Vercel por MCP, HTTP em produção). Nada editado em código.
Git:         main = 66d6673 (1 à frente de origin/main 5f76b36; o commit é só de documentos).
Produção:    dpl_5rq3uYFnggrhNbNREsYJYgtYXpXM, READY, commit 5f76b36 (último deploy de produção; nenhum depois dele).
             /, /entrar, /cadastrar e /painel respondem 200.
Fontes:      00_MD_EXECUTIVO §1, ESTADO-GERAL (RETOMADA), registro/_QUADRO.md e _CONTROLE.md, PENDENCIAS_ABERTAS.md,
             LACUNAS_E_PERGUNTAS.md, GARANTIA e PLANO desta pasta.
Legenda:     "Provado" = teste verde na main (relato do Controle, 18/11 19:07: suíte 198 arquivos / 2.274 testes verdes, typecheck, eslint e build OK)
             e/ou leitura HTTP no ar. NENHUM item tem conferência visual logada em produção (ninguém digita senha); isso é o "provado" que falta em todos.
```

> **Resumo.** Os 15 itens (e o 10 duplicado, dividido em 10a/10b) têm código mesclado na `main` e **estão no ar desde o deploy de 18/11 19:09**. Nenhum precisa ser refeito. O que falta é: (1) conferência visual logada, (2) ações do Gabriel/Rogério/contador listadas no fim, (3) duas lacunas **de código** que o quadro achou (item 3 depende de variável e item 8 de vídeo gravado). **Atenção:** a main local tem trabalho de T1–T3 sem commit; isso **não** está em produção e não entra neste quadro.

## 1. Quadro item × (código? main? produção? provado?)

| # | Pedido (resumo) | Frente | No código | Na main | Em produção | Provado | O que falta e quem falta |
|---|---|---|---|---|---|---|---|
| 1 | Confirmação por senha em saque, compra, venda e dados pessoais | A | sim (`src/server/auth/reautenticacao.ts`, 14 Server Actions) | sim (merge 704bdc5) | sim (0f55132, depois 5f76b36) | testes por arquivo + suíte; **link real do "esqueci minha senha" NÃO testado** | **Gabriel:** (a) testar "esqueci minha senha" com link real (RA-50; se recusar o cliente legítimo, `EXIGIR_LINK_RECENTE_NA_NOVA_SENHA = false`); (b) modelo "Magic Link" do Supabase com `{{ .Token }}` (HTML no MD da A) para conta só Google receber código. Aval das 14 Server Actions: pedido pelo Controle em 18/11, aplicado pelo merge. |
| 2 | 1º mês de custódia junto com envio e compra | B | sim (frete + 1º mês numa cobrança; 6 vias de compra) | sim (4d5e40e) | sim | 82 testes da B + suíte | **Gabriel/contador (fiscal):** (a) na recusa de moeda o mês volta ao saldo, mas a NFS-e do mês **não** é cancelada e, na recusa total, a fatura segue `paga`; (b) pergunta ao contador: nota na data do pagamento antecipado ou só no aceite? (as perguntas 1–3 da B estão no registro da B; **não constam** em `LACUNAS_E_PERGUNTAS.md`, que só tem a nº 21 — falta encaixar). |
| 3 | E-mail de confirmação de compra e movimentações + custo | C | sim (`src/server/emails/`, fila `aurea.emails_pendentes`, migration 053) | sim (19687d1 + encaixes E1/E3, E2 `2539656`, E4 `0f55132`) | **código sim; e-mail NÃO sai** | testes por arquivo | **Gabriel/Rogério:** `RESEND_API_KEY` **não existe na Vercel** (conferido hoje por MCP; `EMAIL_REMETENTE` existe = `Real Olímpico <nao-responda@avisos.realolimpico.com.br>`). Ordem: (1) registrar no DNS da HostGator os 3 registros de `avisos.realolimpico.com.br` (DKIM TXT + 2 CNAME, em `registro/DNS_RESEND_avisos.md`; com o Rogério, que tem o acesso); (2) "Verify" no Resend; (3) criar a chave (só depois do domínio verificado); (4) variável sensitive production+preview + redeploy; (5) e-mail de teste. Sem a chave tudo vira `simulado`. Custo estimado: R$ 0 (Resend grátis). Gabriel mandou não vigiar o DNS. |
| 4 | Tela inicial com Google antes do e-mail | D | sim (`src/components/login`, `/cadastrar`, `/entrar`) | sim (bf82437) | sim (200 em `/cadastrar`; 22:53 de 17/11 conferido "Continuar com o Google") | HTTP + testes | **Gabriel:** conferência visual em 320/375/430 px, claro e escuro. **Agente (depois de aprovado):** nada de código. |
| 5 | Pagamentos de fornecedores de internet e IA em dia | Controle | — (operacional) | — | — | — | **Gabriel/Rogério:** faturas e boletos; roteiro em `docs/manutencao-2026-11/OPERACIONAL_FORNECEDORES.md`. Não é código. |
| 6 | Espaço para vídeos de autenticidade | L | sim (documento + script de medição só leitura) | sim (daf7a68) | n/a (relatório) | medição em produção de 18/11: 32 arquivos, 328,77 MB; Free esgota em jan/2027, Pro dura ~20 meses | **Gabriel:** confirmar o plano do Supabase no painel (Free × Pro) e aprovar o que a seção 1 de `docs/RELATORIO_ARMAZENAMENTO_VIDEOS.md` lista (Pro e limite de bitrate); decidir os vídeos sem análise (hoje 2 órfãos: RO-ENV-0006-9 e RO-ENV-0154-2; os outros 4 foram ligados em 22/11). Retenção de vídeo continua com o jurídico. **Não apagar nada sem ele.** |
| 7 | KPIs do conselho automatizados | J | sim (`/admin/resultados/kpis`, migration 057) | sim (2974350) | sim; migration 057 aplicada em 18/11 | testes (corrigido `db.test.ts`) | **Gabriel:** D2 (lista de KPIs do WhatsApp de 3/11, hoje só o slide "3.1" + KPIs existentes) e J1–J5; origem analógica × digital só como proposta. Teste visual: lançar um gasto de teste e cancelar. |
| 8 | Demonstração de como cadastrar | D | **parcial:** bloco "Veja como se cadastrar" existe (`DemonstracaoDoCadastro.tsx`); **vídeo plugável, sem vídeo ligado** | sim | bloco sim; vídeo não | — | **Agente (depois do deploy, já liberado):** gravar a demonstração em `/cadastrar` sem criar conta e antes do consentimento do Google, e ligar a constante do vídeo — decisão do Controle de 17/11. Não há registro de que foi gravado. Precisa de turno do Gabriel (navegador com gravação). |
| 9 | Notas fiscais acessíveis ao cliente | G | sim (`/conta/notas`, XML oficial + PDF auxiliar sem QR, "Ver nota" em `/conta/faturas`) | sim (9d223e4 + 98ef14f) | sim; `/conta/notas` sem sessão manda para `/entrar` | `notas.test.ts` com dois clientes (isolamento) | **Gabriel:** 13 pedidos presos por cadastro incompleto esperam "Reprocessar" por cliente em `/admin/resultados/fiscal`; 13 faturas pagas até 22/10 sem nota (R$ 326,00) vão ao contador; layout oficial do DANFSe é tarefa fiscal. Conferência visual logada. |
| 10a | Cancelar a NF de R$ 30 do Rogério e tudo que o envio gerou | H | sim (cancelar envio: cliente, equipe e bancada; migration 056) | sim (0d45d9a) | sim; migration 056 aplicada | testes da H + suíte | **Caso do Rogério já resolvido à mão em produção** (NFS-e nº 41 cancelada em 14/11 22:41; saldo R$ 187,30 = ledger). **Gabriel:** D-H5 (corte olha criação do envio ou pagamento do 1º mês?; padrão = criação; casos fora: RO-ENV-0017, RO-ENV-0045); **a equipe não tem tela para cancelar nota** (pergunta aberta). D-H1 decidida (envio postado e cancelado não devolve frete). |
| 10b | App (PWA) não funciona no iPhone | E | sim (PWA, `layout.tsx` metadata, `docs/pwa/ROTEIRO_IPHONE_REAL.md`) | sim (4c00dca) | sim (`apple-mobile-web-app-capable` no `<head>` de `/entrar`) | leitura HTTP + 86 testes | **Gabriel:** **teste no iPhone e no Android reais** (roteiro de até 10 linhas). Causa mais provável: sessão separada do app instalado e login Google dentro dele; só aparelho real decide. Não existe como provar por agente. |
| 11 | +R$ 4 no faturamento dos Correios | K | sim (`acrescimoDoFreteCents`, padrão 400, editável em `/admin/configuracao`) | sim (3145510) | sim | testes `correios.test.ts` | **Gabriel:** aprovar o texto da tela ("O valor do frete inclui R$ 4,00 de taxa de postagem"). D5 (por objeto postado, só no envio) confirmado em 18/11 **segundo a K**: confirmar com ele. **Contador:** pergunta nº 21 (LACUNAS) — até lá o acréscimo não gera NFS-e e fica no lançamento `frete` (fora do resultado). A retirada não tem R$ 4 (cobra taxa fixa R$ 50/R$ 180, editável). |
| 12 | Número da moeda no recibo do cliente | I | sim (`src/components/recibo/Certificate.tsx`, `numeroDaMoeda`) | sim (c25f71c + 2acff72) | sim (deploy 22:53 de 17/11) | 15 testes | **Gabriel:** conferência visual do recibo (mobile 375–430 px, escuro, PDF no leitor real). Obs.: a investigação T3 do 22/11 mostra posição × código por regra de 05/10; não altera este item. |
| 13 | Cancelar validação na bancada | H | sim ("Cancelar validação"; não escreve na cadeia de hash — D-H3) | sim | sim | testes da H | **Gabriel:** conferência visual sem cancelar nada real. |
| 14 | Cancelar envios não postados | H | sim (cliente em `/envios` via `CancelarEnvio`; equipe) | sim | sim | testes da H | **Gabriel:** conferência visual em `/envios`. |
| 15 | Extrato reflete o saldo real | F | sim (`statement.ts`, invariante saldo = soma do extrato) | sim (86cb7ef) | sim (do cliente) | `statement-invariante.test.ts` 17/17 + suíte | **Ficha do admin (`AbaFinanceiro`) e cartão "Taxas pagas" NÃO foram tratados pela F** → é o T1 (código local sem commit, fora de produção). F deixou aberto: oferta de compra pré-paga já gasta cai em "Saldo anterior e ajustes" (decisão: fica como está). Conferência visual de `/conta/extrato` (última linha "Saldo depois" = saldo do topo). |
| — | Frente M: auditoria de marketing | M | — | — | — | — | **ADIADA por ordem do Gabriel (17/11). Não executada.** Quando ele abrir, entra como branch própria. |

## 2. Achados deste quadro (conferir antes de acreditar nos MDs)

1. **`PENDENCIAS_ABERTAS.md` está velho** (18/09/2026) e não menciona nenhum dos 15 itens. Não serve de fonte para este tema; a lista viva é o `_QUADRO.md` + `ESTADO-GERAL`. As linhas B-7, B-8, N-01, N-02 e P-C2-02 dele continuam por reconferir (ESTADO-GERAL, pendência 4). Nesta conferência só a `CRON_SECRET` e a `AUREA_RELATORIOS_TOKEN` aparecem como existentes em produção; as demais (`MP_*`) também existem (`MP_SANDBOX` em produção, valor criptografado, não decifrado).
2. **`ESTADO-GERAL` (RETOMADA) diz "falta bateria pesada, push e conferência"**: a bateria e o push foram feitos em 18/11 19:07 (`_QUADRO.md`, linha de 19:07). O ESTADO-GERAL ficou desatualizado nesse ponto — **a corrigir pelo Processo Padrão** (ver §4).
3. **Perguntas ao contador da B** (1º mês no envio; cancelar nota na recusa) estão só em `registro/B.md`; **não foram encaixadas em `LACUNAS_E_PERGUNTAS.md`** (a K deveria). Conferido: a nº 21 existe, as da B não. Texto pronto no item 2 acima.
4. **`registro/*.md` das frentes estão congelados em 17/11 22:20** (A, B, C, H, I). Não usar como estado; usar o `_QUADRO.md`.
5. **Variáveis de produção:** não existe `NEXT_PUBLIC_AUREA_CONTA_PROPRIA_EMAIL` nem `…_CEO_EMAIL` (T2 ainda não ligado); não existe `RESEND_API_KEY`; `AUREA_ADMIN_EMAILS` e `MP_PAYOUTS_ATIVO` também não (esperado).
6. **Código pronto-mas-quebrado fora de T1–T3:** nenhum encontrado nesta leitura. Nada editado.

## 3. Lista de quem falta (consolidada)

| Quem | Ação | Item |
|---|---|---|
| Gabriel | **`RESEND_API_KEY`:** depende dos 3 registros DNS em `avisos.realolimpico.com.br` (Rogério tem a HostGator); eu crio a variável por MCP quando a chave existir | 3 |
| Gabriel | Teste no iPhone e Android reais (`docs/pwa/ROTEIRO_IPHONE_REAL.md`) | 10b |
| Gabriel | Link real do "esqueci minha senha" + modelo Magic Link `{{ .Token }}` no Supabase | 1 |
| Gabriel | Decisão da frente L: plano do Supabase (Free × Pro), limite de bitrate, 2 vídeos órfãos | 6 |
| Gabriel | Aprovar o texto do frete (D5 confirmado "segundo a K") | 11 |
| Contador (Túlio) | Pergunta nº 21 (R$ 4); perguntas da B (nota no pagamento antecipado × no aceite; cancelar nota na recusa) | 11, 2 |
| Gabriel | D-H5, tela para cancelar nota, reprocessar os 13 pedidos presos, 13 faturas sem nota (R$ 326,00) ao contador | 10a, 9 |
| Gabriel | D2 e J1–J5 (KPIs) | 7 |
| Gabriel/Rogério | Fornecedores (item 5) | 5 |
| Agente (precisa turno do Gabriel) | Gravar o vídeo da demonstração em produção e ligar a constante | 8 |
| Tester | Conferência visual logada: `/conta/extrato`, `/conta/notas`, `/conta/faturas`, `/envios`, recibo, `/admin/resultados/kpis`, `/admin/configuracao`, `/admin/logistica`, bancada | 4, 7, 9, 12–15 |
| Processo Padrão | Corrigir o RETOMADA do ESTADO-GERAL; encaixar as perguntas da B em LACUNAS | — |

## 4. Aceite do T4 (cruzado com a Garantia e o plano)

- Quadro "item × estado em produção × quem falta" publicado (este arquivo): **sim**.
- Nada refeito sem necessidade: **sim** (nenhum código tocado).
- "Estado em produção" foi conferido por MCP da Vercel (deploy e nomes de variáveis, sem decifrar) e por HTTP; **a conferência visual logada fica com o Tester/Gabriel** e por isso a coluna "Provado" não diz "visual" em nenhum item.
- Frente M: não executada (ordem do Gabriel).
