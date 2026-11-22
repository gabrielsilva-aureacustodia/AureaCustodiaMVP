# Relatório de Execuções (resumo) — frente I

```
Branch: claude/manut-numero-da-moeda-3dedde (base 9e21fe1, 0 commits, sem migration)
Feito:
- T1 número da moeda = Coin.id ("Moeda nº RO-000042")
- T2 folha, tela do recibo e cartão da lista mostram o número
- T3 PDF mostra o número (sub-linha; primeiro campo +8 pt)
- T4 15 testes novos verdes (inclui hash intacto); tsc exit 0
Não feito:
- **npm test (suíte completa)** e **ESLint dos 7 arquivos** (memória da máquina)
- **conferência visual em produção** (375–430 px, PDF no leitor real) — por ordem do Gabriel
Bloqueio para você: nada
Próximo ato: Controle aplica numeroDaMoeda={linha.codigo} no Admin (cliente/page.tsx, depois da linha 78), roda suíte e ESLint, mescla
Teste: parcial — 15/15 verdes + typecheck verde; suíte completa não rodou
```
