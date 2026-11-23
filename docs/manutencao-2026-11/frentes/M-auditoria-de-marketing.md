# Ficha da frente M — Análise do tráfego pago (marketing) e o que melhorar

```
ID / branch:   M · SEM branch e SEM chat de branch    Onda de merge: —    Migration: —
Item do Rogério: último parágrafo        Estado: REDEFINIDA em 17/11/2026 (decisão do Gabriel)
Quem faz:      o chat de preparação (o que montou este pacote), no navegador interno, quando o Gabriel liberar o gerenciador de anúncios
```

## ORDEM DO GABRIEL (17/11/2026, depois da redefinição): a M fica por ÚLTIMO e fora desta rodada
A **melhoria do site com base na auditoria de marketing** (qualquer mudança de código ou de página que a análise sugerir) **não entra nesta execução**. O Gabriel vai abrir **uma branch específica para ela, depois**. Portanto:
- Nenhuma frente (A–L), o Controle ou o chat de preparação **implementa melhoria de marketing agora**.
- A M **não é onda, não bloqueia merge, commit, push nem deploy** das frentes A–L e **não entra na lista "o que falta" do Controle**: no relatório final ela aparece como **"adiada por decisão do Gabriel — branch própria depois"**.
- A análise do tráfego descrita abaixo só acontece **no fim**, quando o Gabriel pedir e abrir o gerenciador de anúncios; o resultado serve de insumo para a branch dele. Até lá, nada a fazer.

## Pedido do Rogério (as palavras dele)
"Além disto, na auditoria de marketing aparecem algumas sugestões para o site, favor ver lá."

## O que o Gabriel decidiu (17/11/2026)
A auditoria de marketing **não faz parte do sistema** e o documento dela **não foi localizado** (repositório, Drive, Downloads, Sintetica). Em vez de esperar o documento, o Gabriel vai deixar o **gerenciador de anúncios aberto e logado no navegador interno do aplicativo** e a análise sai **do tráfego de verdade**: o que está funcionando, o que está desperdiçando verba e o que melhorar — inclusive no site.

## Natureza da frente
**Leitura e recomendação.** Nenhuma branch, nenhum código, nenhuma alteração na conta de anúncios.
- Quem entra na conta é **o Gabriel** (login e verificação são dele). O agente **não digita senha nem código**.
- **Somente leitura:** não cria, pausa, edita nem exclui campanha, conjunto, anúncio, público, orçamento ou pixel. Se uma melhoria exige mexer na conta, vira **recomendação escrita** para o Gabriel executar.
- Dado de cliente (nome, e-mail, telefone de lead) **não** vai para MD nem para log: só números agregados.

## Aceite
- [ ] **`ANALISE_DE_TRAFEGO.md`** em `docs/manutencao-2026-11/entregas/` (fora do Git), com a **conclusão no topo** em linguagem de sócio e três blocos: **(1) o que está funcionando, (2) o que está desperdiçando verba, (3) o que melhorar** — cada recomendação com **evidência (número e período), esforço e risco**.
- [ ] **Números lidos da conta** no período que o Gabriel indicar: gasto, alcance, cliques, CTR, CPC, CPM, resultados (cadastros/conversões), **custo por resultado**, frequência, e **por campanha, público, posicionamento, dispositivo e criativo**.
- [ ] **Funil e medição:** o Pixel e a API de Conversões já estão no ar e comprovados (`docs/META_PIXEL.md`, `META_PIXEL_RELATORIO_2026-11-14.md`). Conferir **quais eventos o gerenciador recebe** e se o que o site manda (cadastro, etc.) aparece; apontar eventos faltando, duplicados ou com qualidade de correspondência baixa.
- [ ] **O que o site pode melhorar** a partir do tráfego (página de destino, velocidade, chamada, tela de cadastro — a frente D já põe o Google primeiro): só **recomendação**; vira tarefa de código **depois** do merge das ondas 1 a 4 e **só com o OK do Gabriel** (E5: melhoria nunca no meio).
- [ ] **Ligação com a frente J (KPIs/CAC):** os números de gasto e resultado vão para uma tabela que a J (ou o Controle) possa usar como **entrada do CAC**. Orçamento de referência do conselho: R$ 2.500/mês em tráfego e R$ 3.600/mês pelo serviço (slide "3.1 Cronograma, Números e Metrificação").
- [ ] Vocabulário: nada de investimento, rentabilidade, token, NFT, cripto ou ativo digital nas recomendações de texto de anúncio.

## O que o Gabriel precisa me dar
1. **Abrir o gerenciador de anúncios no navegador interno, logado** (Meta Ads Manager, pelo que o projeto usa; se houver Google Ads ou outro, diga qual).
2. **A conta de anúncios e o período** (por exemplo, "desde o início da campanha" ou "últimos 30 dias").
3. Se existir, o **link ou arquivo da auditoria de marketing** — ela continua valendo como complemento, mas **não bloqueia** mais.

## Fora de escopo
Criar ou editar anúncio, mexer em orçamento, texto jurídico, regra de negócio, qualquer mudança no código do site.

## Entrega ao Controle
Quando pronta, o caminho do `ANALISE_DE_TRAFEGO.md` vai ao Controle (para o relatório final dos 16 itens e para a frente J) e ao Gabriel, com a conclusão em até 5 linhas.
