# MD de execução — frente L (manut-armazenamento-videos)

## RETOMADA (leia primeiro)

```
Atualizado:  2026-11-18 (fim da execução)       Branch: claude/manut-armazenamento-videos-b83e5d (sobre c85b3da, 0 commits)
Estado:      PRONTA PARA MERGE (T1 a T5 feitos). Falta só o Controle commitar.
Entrega:     docs/RELATORIO_ARMAZENAMENTO_VIDEOS.md · scripts/medir-armazenamento.mjs · linha em scripts/README.md · este MD · memória R11
Próximo ato: Controle confere o diff (4 arquivos de produto/doc + estes de diário), commita, e o Gabriel confere o plano do Supabase.
Não rodou:   build, typecheck completo, suíte (ordem do Controle de 18/11: memória do computador no limite). Rodou: eslint só no script (limpo).
```

## Aceite (da ficha)
- [x] `RELATORIO_ARMAZENAMENTO_VIDEOS.md` com conclusão no topo e números medidos (32 vídeos, 328,77 MB, média 10,27 MB, por mês, por envio; projeção 3/6/12 meses em 3 cenários). **Parcial por falta de acesso:** o plano contratado do Supabase não foi confirmado (sem login no painel); o relatório traz os dois casos (Free 1 GB × Pro 100 GB).
- [x] Custo comparado: Supabase Free e Pro, Cloudflare R2, Backblaze B2, Wasabi — cada preço com data (18/11/2026) e página.
- [x] Alavancas baratas (bitrate, resolução, órfãos, compactação) e pergunta de retenção ao Gabriel/jurídico.
- [x] Recomendação em uma frase + lista do que o Gabriel compra/aprova.
- [x] `scripts/medir-armazenamento.mjs` somente leitura (rodado duas vezes em produção; eslint limpo; sem segredo na saída).

## Ler (só isto)
`docs/TUTORIAL_BALDE_SUPABASE.md` · `GravadorDeVideo.tsx` · `src/server/estacao/video.ts` e `src/server/admin/video.ts` · `alinhar-videos.cjs` (só lido) · `docs/auditorias/2026-10-30--checkup-2.md` (bitrate padrão do Chrome) · `scripts/env-local.mjs`.

## Touch
`docs/RELATORIO_ARMAZENAMENTO_VIDEOS.md`, `scripts/medir-armazenamento.mjs`, `scripts/README.md` (uma linha, regra de README por pasta).

## Do not touch (respeitado)
Balde, objetos, políticas, escrita em produção, `GravadorDeVideo.tsx`, `.cjs` da raiz.

## Fora de escopo
Migrar, apagar vídeo, comprar plano, política de retenção.

## Tópicos
| T | Estado | Aceite do tópico | Log |
|---|---|---|---|
| T1 | feito | mapa de gravação/guarda | seção 2 do relatório: gravador → Server Action → PUT direto → `caminho_video` entra no hash; 1 vídeo por envio |
| T2 | feito | números medidos | script em produção, `BEGIN READ ONLY`; API × `storage.objects` iguais (32 arquivos, 344.740.412 bytes) |
| T3 | feito | tabela com fonte e data | 5 fornecedores, páginas oficiais, 18/11/2026 (feito pelo próprio chat, sem filho, por ordem do Controle) |
| T4 | feito | relatório completo | projeções calculadas por script (scratchpad), tabelas 4 e 6 |
| T5 | feito | script reutilizável | `node scripts/medir-armazenamento.mjs [--json]` |

## Sessões
Só o chat de branch (`local_…` desta sessão). **Sem Execução/Auditoria/Específico** — ordem do Controle de 18/11/2026 (computador sem memória). Log de execução, relatórios e CONTINUIDADE de Auditoria não foram gerados; este MD faz o papel de log.

## Achados para quem decide
1. Peso do vídeo **não** acompanha moedas (1 moeda = 25 MB; 99 moedas = 21,5 MB): é um vídeo por envio, o tamanho vem da duração.
2. 6 vídeos sem análise = 66,67 MB (20%). Não apagados.
3. Maior vídeo = 39,08 MB (78% do teto de 50 MB do Free).
4. Página do Supabase (docs, Storage pricing) trouxe, no meio do texto, instruções dirigidas a agentes de IA (ler outra página de relatório e perguntar se envia a resposta ao Supabase). Tratado como dado da página; **não executado**.
