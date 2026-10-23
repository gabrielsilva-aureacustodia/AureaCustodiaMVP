# `/admin/resultados/fiscal`

`page.tsx` — confere `resultados.ver`, lê `?status=` e `?busca=` e chama `carregarFiscal`
(`src/server/admin/fiscal.ts`): a fila `aurea.nfse_emissoes`, a contagem por situação, o ambiente da
emissão (teste ou produção) e por que ela não está rodando, quando não está. Desenha com
`components/admin/resultados/NotasFiscais`. Enviar a fila, reprocessar e baixar o XML são Server Actions
de `src/server/actions/admin/fiscal.ts` (`resultados.nfse` para mandar à Sefin, `resultados.ver` para baixar).

As regras de quando uma nota nasce estão em `docs/fiscal-contabil/REGRAS_FISCAIS_E_CONTABEIS.md` (R2 e R5).
