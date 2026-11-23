# Ficha da frente L — Vídeos: espaço e armazenamento barato

```
ID / branch:   L · manut-armazenamento-videos     Onda de merge: 1          Migration reservada: —
Item do Rogério: 6            Prazo: 30/11/2026   Base: 9e21fe1
Aceite em uma frase: o Gabriel sabe quanto espaço os vídeos de autenticidade ocupam, quanto sobra, quando acaba e qual é a opção mais barata — com número, fonte e data.
```

## Pedido do Rogério (as palavras dele)
"Verificar a questão de espaço para gravar as filmagens da confirmação de autenticidade das moedas. Se não tivermos mais espaço, comprar mais ou ver local barato de armazenamento."

## Natureza da frente
**Medição e proposta, só leitura.** L **não** compra, **não** migra, **não** apaga vídeo, **não** muda bucket, política ou produção. Comprar ou migrar é decisão (e ação) do Gabriel.

## Aceite
- [ ] **`RELATORIO_ARMAZENAMENTO_VIDEOS.md`** com a **conclusão no topo** e números **medidos**: quantidade e tamanho total dos vídeos no balde; tamanho médio por vídeo; vídeos por moeda e por mês; crescimento mensal; **espaço contratado** (plano atual do Supabase) e **quanto resta**; projeção em **3, 6 e 12 meses** em 3 cenários de volume.
- [ ] **Custo comparado** (preço por GB/mês **e** de saída/egress): Supabase Storage (plano atual) × Cloudflare R2 × Backblaze B2 (e outro, se achar), **cada preço com data e página de origem**; custo mensal projetado por cenário.
- [ ] **Alavancas baratas**, sem executar: reduzir o peso do vídeo na gravação (resolução, taxa de bits, duração em `GravadorDeVideo`), compactar em segundo plano, **política de retenção** (a retenção LGPD de foto e vídeo **ainda está pendente** no projeto — **pergunta ao Gabriel/jurídico**, L não decide).
- [ ] **Recomendação em uma frase** e a lista do que o Gabriel precisa **comprar ou aprovar**. Se há folga: diga "sem urgência" e **até quando**.
- [ ] Um script de **medição somente leitura** (`scripts/medir-armazenamento.mjs`) que o Gabriel possa rodar de novo (lista objetos e soma tamanhos; não escreve, não apaga). Fora de `src/*.test.ts`. A chave de serviço vem do `.env.local` e **nunca** aparece em MD, log ou saída.

## Ler (e só isto)
`docs/TUTORIAL_BALDE_SUPABASE.md` · `src/components/admin/bancada/GravadorDeVideo.tsx` · `src/server/estacao/video.ts`, `src/server/admin/video.ts` · `alinhar-videos.cjs` (**só ler**; script de produção, **não executar**) · `docs/SETUP_CONTAS_E_SERVICOS.md` (plano do Supabase) · `CLAUDE.md` (LGPD) · `docs/privado/README.md` (**não citar valores**; a pasta é ignorada pelo Git).

## Touch
Só documentos e `scripts/medir-armazenamento.mjs` (novo, somente leitura).

## Do not touch
Bucket, objetos, políticas, escrita em produção, `GravadorDeVideo.tsx` (qualquer **mudança** de gravação é **proposta** para o Gabriel aprovar; não implementar sem ele), os `.cjs` da raiz.

## Fora de escopo
Migrar vídeos, apagar vídeos, comprar plano, política de retenção (é do jurídico).

## Tópicos
| T | O quê | Aceite do tópico |
|---|---|---|
| T1 | Entender como e onde o vídeo é gravado e guardado | mapa no MD |
| T2 | Medir o balde (somente leitura, `BEGIN READ ONLY` quando for banco) | números no relatório |
| T3 | Preços (Específico) | tabela com fonte e data |
| T4 | Projeções e recomendação | relatório completo |
| T5 | Script de medição reutilizável | roda e só lê |

## Específico (sim)
Pesquisa dos preços de armazenamento (cada um com data e página). Entrega a tabela e a fonte.

## Superfície protegida
Nenhuma.
