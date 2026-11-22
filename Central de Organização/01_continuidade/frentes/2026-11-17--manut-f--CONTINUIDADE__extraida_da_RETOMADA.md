# Continuidade da frente F · Extrato igual ao saldo (extraída)

> **Arquivo gerado pela Central de Organização em 22/11/2026.** A frente F não tem arquivo `--CONTINUIDADE.md` próprio; o estado vivo dela mora no bloco RETOMADA do MD de execução `docs/diario/execucoes/2026-11-18--manut-f-extrato-igual-ao-saldo--MD_EXECUCAO.md`. Este arquivo é só uma cópia desse bloco (o original manda; releia lá). Nada foi inventado.

---

## RETOMADA

1. Se você é um agente novo: leia a **ANALISE_EXTRATO_X_SALDO.md** (mesma pasta) e depois `src/domain/statement.ts` (o cabeçalho explica o invariante).
2. O invariante: **soma dos impactos das linhas = saldo da conta**, e `saldoApos` de cada linha é a soma acumulada. Quem o guarda é `src/domain/statement-invariante.test.ts`
   (17 cenas, todas montadas pelos caminhos reais do produto). **O Controle o reexecuta depois do merge das frentes B e H.**
3. Nada foi commitado. Typecheck completo, build e suíte inteira **não rodaram** (ordem do Controle: memória). Só `eslint` dos 7 arquivos de código e `vitest` de 3 arquivos, um por vez.
4. Conferência visual (320–430 px e desktop): **só em produção**, depois do deploy do Controle — `/conta/extrato` de uma conta de sócio: a última linha "Saldo depois" tem de ser igual ao saldo do topo.

