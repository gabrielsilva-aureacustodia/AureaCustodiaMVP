# Leitura do Repositório — RESUMO · 11/09/2026

**Para executar, não para ler.** Versão detalhada ao lado, em `LEITURA_REPOSITORIO_DETALHADO.md`.

```
main em:  ab3db39
Base ontem: f7a5e8c
Testes:   343 (eram 197)
Banco:    Supabase com 12 migrations aplicadas
```

---

## O que mudou desde ontem

As três frentes da publicação entraram na `main`, na ordem B → C → A.

- **B** — cadastro formal, compra direta, saque (D+3, taxa fixa), faturamento mensal da custódia
- **C** — retirada física da moeda, Correios de saída, etiqueta, extinção do recibo, bloqueio por débito
- **A** — termos por blocos, `/academy`, posicionamento na landing, extrato anonimizado, tutorial do domínio

## Estado dos quatro comandos

```
npm run typecheck   ✓
npm run lint        ✓
npm test            ✓  343
npm run build       ✓  25 páginas
```

## O que foi corrigido no merge

1. **Restrição do ledger** — as frentes B e C se sobrescreviam; a da C apagaria `saque` e
   `taxa_saque`. Corrigido com a união dos 11 tipos na migration 012.
2. **Numeração de migration** — as duas criaram 009 e 010. As da C viraram **011** e **012**.

## O que exige decisão sua

| # | Assunto |
|---|---|
| 1 | **CD-11** — o extrato diz "Custódia anual · R$ 25,00" e o modelo vigente é R$ 2,00/moeda/mês |
| 2 | **D-2** — prazo da retirada: D+30 total, ou D+30 + D+5 de trânsito? |
| 3 | Percorrer a jornada completa com conta nova antes de abrir ao público |

## Não esqueça

- **A próxima migration é a 013.**
- `src/domain/types.ts` precisa de dono único na próxima rodada paralela (CD-12).
- As três branches continuam existindo com worktrees em `C:/dev/AureaCustodiaMVP-{cadastro,juridico,banco}`.

## Comandos do dia

```bash
cd C:\dev\AureaCustodiaMVP
git pull
npm install
npm run typecheck; npm test; npm run build
npm run db:check
npm run dev
```
