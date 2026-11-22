# Ficha da frente J — KPIs: painel do conselho no admin

```
ID / branch:   J · manut-kpis-do-conselho         Onda de merge: 1          Migration reservada: 057 (só se persistir o gasto de marketing em tabela)
Item do Rogério: 7            Prazo: 30/11/2026   Base: 9e21fe1
Aceite em uma frase: os KPIs que o conselho pediu aparecem calculados sozinhos no painel de resultados, e o que depende de dado de fora (gasto de mídia) tem entrada manual simples.
```

## Pedido do Rogério (as palavras dele)
"Montar a proposta de KPIs indicada pelo conselho, se possível de forma automatizada dentro do sistema de gerenciamento do site (WhatsApp de 3/11)."

## O que eu achei (e o que **falta**)
- **Falta a lista final do conselho:** o WhatsApp de 3/11 não está no repositório (**pergunta D2 ao Gabriel**). Só achei o slide **"3.1 Cronograma, Números e Metrificação"** em `C:\Users\Gabriel\Documents\Real Olímpico\Apresentação MKT Conselho\` (9 imagens): *CAC analisado diariamente e semanalmente · análise analógica e digital · atendimento comercial analisado semanalmente*; orçamento provável **R$ 2.500/mês em tráfego** + **R$ 3.600/mês** pelo serviço, com orçamento separado para o analógico.
- KPIs de negócio **já existem** em `src/domain/kpis.ts` (comissão por lado, acervo, contas, funil, tempos, faturas, fila, planos).

## Aceite
- [ ] **`PROPOSTA_DE_KPIS.md`** (até 2 páginas, linguagem de sócio): para cada KPI — **definição, fórmula, fonte do dado (banco, Meta Pixel/API de Conversões, entrada manual), frequência (diário/semanal/mensal) e dono** — partindo do slide acima e dos KPIs existentes. Termina com uma **tabela para o Gabriel completar** com a lista do WhatsApp de 3/11.
- [ ] **No painel** (`/admin/resultados/kpis` ou aba nova "Aquisição e atendimento"): novos cadastros, clientes **ativados** (1ª transação), **CAC** = gasto de mídia informado ÷ clientes ativados (dia, semana e mês), funil visita → cadastro → ativação (com os dados do Pixel/CAPI **quando houver**), atendimento (casos abertos e tempo de resposta de `/admin/casos`), **origem analógica × digital** (se o cadastro tiver campo de origem; senão **propor**, não inventar).
- [ ] **Entrada manual do gasto de marketing** por mês e canal, numa tela de admin simples (permissão existente; grava `admin.<area>.<verbo>` em `audit_log`). Tráfego pago vem de fora: **nenhum número inventado**.
- [ ] Domínio **puro e testado** (`kpis.ts`): sem fonte, o resultado é **`null`**, nunca zero (padrão do arquivo). Respeita as permissões do admin.
- [ ] Vocabulário: nada de investimento/rentabilidade/token/cripto nos rótulos. `npm run typecheck` e `npm test` ao fim.

## Ler (e só isto)
`src/domain/kpis.ts` e `kpis.test.ts` · `src/server/admin/resultados.ts` · `src/components/admin/resultados/**` · `src/app/(admin)/admin/resultados/**` · `src/domain/admin/permissoes.ts` · `docs/META_PIXEL.md`, `docs/META_PIXEL_RELATORIO_2026-11-14.md` · `docs/atendimento/DESENHO.md` · `docs/PLANO_EXECUCAO_ADMIN.md` (seção Resultados) · as 9 imagens da apresentação do conselho (**só leitura**).

## Touch
`src/domain/kpis.ts` · `src/server/admin/resultados.ts` · `src/components/admin/resultados/**` · `src/app/(admin)/admin/resultados/**` · `src/server/actions/admin/` (**arquivo novo** para a entrada de gasto) · `src/domain/admin/permissoes.ts` (**só** se precisar de permissão nova — anotar).

## Do not touch
Regras de custódia, taxas, ledger/DRE · landing, Pixel no site (a integração do Pixel **já está no ar**; J só **lê** o que ela produz).

## Fora de escopo
Criar campanha, mexer no gerenciador de anúncios, relatório contábil.

## Decisões pendentes
**D2:** lista final dos KPIs do conselho. Padrão: construir o que o slide e os KPIs existentes cobrem e deixar a tabela para completar.

## Tópicos
| T | O quê | Aceite do tópico |
|---|---|---|
| T1 | Proposta de KPIs (Específico lê as imagens e define fórmulas) | `PROPOSTA_DE_KPIS.md` |
| T2 | Domínio: novos KPIs puros e testados | testes verdes |
| T3 | Entrada manual do gasto + permissão + auditoria | teste de permissão |
| T4 | Telas no painel | navegador local, desktop e celular |
| T5 | Suíte da branch | verde |

## Específico (sim)
Lê as imagens do conselho e propõe a definição de cada KPI (CAC, ativação, funil, atendimento) com fórmula e fonte. Entrega o arquivo com a conclusão no topo.

## Superfície protegida
Nenhuma esperada.
