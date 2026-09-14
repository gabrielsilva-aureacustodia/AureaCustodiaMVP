# Atalhos assumidos nesta pasta

> Nota local do atalho tomado em `src/app/api/eventos/` (registro de uso, frente C).
> O documento que compila todos está na raiz: [`RISCOS_ASSUMIDOS.md`](../../../../RISCOS_ASSUMIDOS.md).

---

## RA-41 🟡 — registro de uso sem consentimento de rastreamento

**Arquivo:** `route.ts`

A rota grava as páginas abertas e os cliques marcados de quem está logado, sem aviso nem
consentimento — é ambiente de teste com contas de sócios. Também não há trava de frequência: um
navegador pode mandar lotes à vontade (o lote é limitado a 50 eventos e 64 KB).

**O que já protege:** sem sessão nada é gravado; o e-mail vem do cookie assinado, nunca do corpo;
IP e user agent completo não são gravados; a rota chega normalizada, sem e-mail nem identificador.

**Como se paga:** aviso na política de privacidade e prazo de retenção antes de cliente real;
limite de frequência se aparecer abuso.
