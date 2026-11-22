# Ficha da frente G — Notas: NFS-e acessível ao cliente

```
ID / branch:   G · manut-notas-do-cliente         Onda de merge: 2          Migration reservada: 055 (só se faltar coluna)
Item do Rogério: 9            Prazo: 30/11/2026   Base: 9e21fe1
Aceite em uma frase: o cliente abre "Notas fiscais" na conta, vê só as dele e baixa o XML e o PDF de cada uma.
```

## Pedido do Rogério (as palavras dele)
"Notas acessíveis aos clientes (WhatsApp de quinta-feira 5/11)."

## Aceite
- [ ] **T1 — o que existe de verdade** (somente leitura, `BEGIN READ ONLY`, sem `SET`; o Específico faz): em `aurea.nfse_emissoes`, quantas notas estão **emitidas** (com `numero_nfse`, `chave_acesso`, `xml_nfse`) × quantas são só **pedidos**; e se as notas de outubro (`Documentos\Real Olímpico\NFs e GOV`) saíram pelo sistema ou à mão pelo contador. O resultado vira uma tabela no MD. **A frente não inventa nota**: se a emissão à Sefin ainda não roda em produção, a página funciona com o que houver e o relatório **diz isso**.
- [ ] **Página `/conta/notas`** ("Notas fiscais" no menu): lista **só as notas do próprio cliente** — competência, serviço, valor, número, data — com **download do XML** e do **PDF (DANFSe)** quando existirem. Nota **cancelada** aparece como "Cancelada em…" (e continua listada). Fatura paga **sem nota ainda** aparece como "Nota em preparação" (sem prometer prazo).
- [ ] **Link "Ver nota"** nas faturas pagas de `/conta/faturas` (só o link).
- [ ] **Segurança e LGPD:** Server Action com sessão, filtrando pelo dono; nunca devolve XML de outro cliente (o XML tem CPF/CNPJ do tomador). Teste prova que a conta A não lê a nota da conta B.
- [ ] Texto sem vocabulário proibido; mobile de 320 a 430 px; alvo de 44 px; claro e escuro.
- [ ] Testes + `npm run typecheck` e `npm test` ao fim.

## Ler (e só isto)
`docs/fiscal-contabil/NFSE_INTEGRACAO_NO_SITE.md` e o README da pasta · `src/server/nfse/README.md`, `emissao.ts`, `sefin.ts` (para saber **como buscar o DANFSe pela chave de acesso**) · `src/server/db/repositories/nfse.ts` · migrations `044_nfse_emissoes.sql` e `045_nfse_tarifas_e_cancelamento.sql` · `src/domain/nfse/pedidos.ts`, `eventos.ts` · `src/app/(app)/conta/faturas/` · `src/components/shell/Sidebar.tsx` (**só** a linha do menu).

## Touch
`src/app/(app)/conta/notas/**` (novo) · `src/server/nfse/consulta*.ts` (novo, **leitura**) · `src/server/actions/notas.ts` (novo) · `Sidebar.tsx` (uma linha — G é o dono dela) · `conta/faturas` (o link).

## Do not touch
Emissão, assinatura, certificado, `src/domain/nfse/codigos.ts` (**decisão fiscal é do Gabriel**) · `src/server/nfse/emissao.ts` além de ler · cancelamento (H).

## Fora de escopo
Emitir ou reemitir nota, corrigir nota, enviar nota por e-mail (C, se o Gabriel quiser depois), nota de frete (não existe: despesa do cliente).

## Tópicos
| T | O quê | Aceite do tópico |
|---|---|---|
| T1 | Medir o que existe em produção (Específico) + como obter o PDF | tabela no MD |
| T2 | Consulta de leitura + Server Action (só o dono) | teste de isolamento entre contas |
| T3 | Página `/conta/notas` + menu | navegador local |
| T4 | Link nas faturas + nota cancelada/em preparação | estados conferidos |
| T5 | Suíte da branch | verde |

## Específico (sim)
Leitura de produção (somente leitura) e pesquisa de como a Sefin Nacional entrega o PDF da nota (DANFSe) a partir da chave de acesso. Entrega com fonte e data.

## Superfície protegida
Nenhuma esperada.
