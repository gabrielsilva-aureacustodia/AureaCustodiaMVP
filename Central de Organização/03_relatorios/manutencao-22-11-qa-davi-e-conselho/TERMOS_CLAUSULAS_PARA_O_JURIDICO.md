# Termos e Política — pontos para o jurídico decidir (QA Davi, B08/A13)

Data: 22/11/2026 · Origem: relatório do Davi Bego, item B08 · Feito por: QA Davi 22-11 | R4. **Nada abaixo foi alterado no texto** — são decisões do jurídico.

> **ATUALIZAÇÃO:** os Termos ficaram na **2.1** (hash original). Só a forma foi aplicada. As correções de texto abaixo estão no patch `TERMOS_v2.2_PATCH_AGUARDANDO_APROVACAO.diff`, **não aplicado**, até o OK do Gabriel/jurídico.

## O que JÁ foi feito (formatação) e o que está no patch (erros materiais, v2.2 — NÃO aplicado)
- Listas sem o "a))" duplo, nos Termos e na Política (era só a tela somando um ")" a letras que já o traziam).
- Os parágrafos agora **mostram o número** (14.4, 7.3.3, 13.2…) que o próprio site cita — os números sempre estiveram no dado, a tela não os desenhava. Isso muda a apresentação, não o texto canônico.
- Erros de redação: "Este Termos de Uso rege" → "Estes Termos de Uso regem"; "o Termos de Uso" → "os Termos de Uso" (e deste/neste/do/dos equivalentes); 14.5.4 "A observará" → "A arbitragem observará"; "1 (uma moeda)" → "1 (uma) moeda"; "reestabelecer" → "restabelecer".
- A Política não teve texto alterado (só a formatação das listas e a numeração na tela), então **não** ganhou versão nova.
- **A nova versão dos Termos (2.2) só vale para os clientes depois de publicada em /admin/configuracao** ("publicar a versão vigente"): o texto novo tem hash novo, e a faixa "termos atualizados" pede o aceite de novo. Publicar é decisão de produção — fica para o Merge/Deploy ou para o Gabriel.

## Para o jurídico decidir (não alterado)
1. **"Capítulo 14.4" nas telas e nas declarações de aceite.** 14.4 é uma *cláusula* (Arbitragem) dentro do Capítulo 14, não um capítulo. Aparece em: cadastro (`RegisterForm.tsx`), Minha conta → Configurações, `conta/aceites/[id]`, e na declaração gravada em `src/server/documentos/aceites.ts` (texto que a pessoa assina — trocar muda o aceite). Sugestão do QA: "Cláusula 14.4".
2. **Cláusula 14.4 e o documento "Cláusula de Arbitragem" separado citam "negociações previstas na Cláusula 13.2".** A 13.2 é definição da LGPD (Capítulo 13 = Proteção de Dados); a negociação é a **14.2**. Provável remissão trocada — o jurídico confirma o número.
3. **O mesmo "A observará o Direito brasileiro."** existe em `clausula-arbitragem-v1.ts` (documento de assinatura específica, Lei 9.307 art. 4º §2º). Corrigi só nos Termos; corrigir lá cria nova versão do documento de assinatura — decisão do jurídico.
4. **Tabela de Taxas citava "Decisão F-1 e Cláusula 7.3.3".** A 7.3.3 existe nos Termos (prazo de recebimento da venda), mas não trata de comissão de negociação; troquei por "conforme os Termos de Uso" (código interno saiu do texto do cliente — A13). Confirmar qual cláusula, se alguma, fundamenta a comissão dos dois lados.
5. **"Cláusula 13.1" na definição de termos (Termos, ~linha 1145)** — conferir se a remissão está certa.
6. **Perguntas de regra do relatório que tocam texto legal** (decisão do Gabriel, p. 36–37): prazo da retirada "30 dias úteis" (Termos cap. 7) × "30 dias corridos para postar" (Academy/Retiradas) — A01; seguro — A02; guarda por moeda equivalente × "seu item" — A03; arbitragem opcional no cadastro × obrigatória acima de R$ 100 mil — pergunta 7; verificação de identidade com documentos (Termos cap. 6) × Política que diz não pedir fotos — pergunta 8; Política "cadastro progressivo" × formulário da 1ª compra — A05.
