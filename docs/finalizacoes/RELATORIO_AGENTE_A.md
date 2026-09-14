# Diário de Bordo — Agente A (Mercado e Termos)

Rodada de Finalizações — 13/09/2026  
Branch base: `feat/a-mercado-e-termos`  
Worktree isolada: `C:\dev\AureaCustodiaMVP-mercado`

---

## A1 — Comissão dos Dois Lados no Mercado

- **Status**: Concluída e integrada
- **Branch de trabalho**: `feat/a1-comissao-dois-lados` (commit `2181d41`)
- **Merge commit na base**: `5b00d3b`
- **Anotação**: A1 pronta para main — merge 5b00d3b

### Resumo das Entregas de A1
1. **Tabela Única de Taxas (`src/domain/fees.ts`)**:
   - `TAXAS_PADRAO`: 50 bp (0,5%) + R$ 1,00/moeda para comprador e para vendedor.
   - Trade canônico (1 moeda a R$ 200,00): comprador paga R$ 202,00, vendedor recebe R$ 198,00, Áurea retém R$ 4,00.
   - `comissaoPorMoeda`, `custoDeCompraPorMoeda`, `liquidoDeVendaPorMoeda`.
2. **Motor de Mercado (`src/domain/market.ts`)**:
   - Débito do comprador: `price + feeComprador`.
   - Crédito do vendedor: `price - feeVendedor`.
   - Verificação de saldo suficiente incluindo a comissão do comprador.
   - Trade grava `feeComprador` e `feeVendedor`.
3. **Persistência e Migração (`src/server/db/`)**:
   - Migration `014_comissao_dois_lados.sql` criada com `fee_comprador`, `fee_vendedor` e constraint `trades_fee_soma_check`.
   - Repositório, normalização e diff atualizados.
4. **Ledger e Extrato (`src/domain/ledger.ts`, `statement.ts`)**:
   - 4 lançamentos por trade: `compra` (-30000), `comissao` (-250), `venda` (+30000), `comissao` (-250).
   - Extrato do usuário lê comissão congelada direto do trade (resolução CD-09 e encerramento RA-06).
5. **Relatórios e Interface**:
   - Colunas adicionadas no relatório de negociações: `Comissao_Comprador`, `Comissao_Vendedor`, `Comissao_Total`.
   - Previews de compra (`/mercado`) e venda (`/vender`) atualizados com detalhes claros de comissão.
6. **Testes e Build**:
   - 48 arquivos de teste passando (355 testes OK, 1 skipped de banco real).
   - `npm run typecheck` e `npm run build` passando com zero erros.
