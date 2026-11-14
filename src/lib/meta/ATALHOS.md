# Atalhos tomados em `src/lib/meta/` (e em `src/server/meta/`, `src/components/meta/`)

```
Módulo:        src/lib/meta/ · src/server/meta/ · src/components/meta/ · src/app/layout.tsx
Data:          14/11/2026
Registro raiz: RISCOS_ASSUMIDOS.md, RA-61
```

## Atalhos e riscos registrados

### 1. Sem faixa de consentimento de cookies
- **Situação:** o Pixel roda para todo visitante assim que o ID está configurado. Não existe faixa de cookies no site.
- **Como se paga:** o jurídico define a base legal (LGPD). Se for consentimento, chamar `fbq('consent','revoke')` antes
  do `init` em `MetaPixel.tsx` e `fbq('consent','grant')` quando a pessoa aceitar.

### 2. Política de Privacidade não cita o Pixel
- **Situação:** texto legal não foi tocado.
- **Como se paga:** parágrafo novo, escrito pelo jurídico, sobre Pixel e API de Conversões da Meta.

### 3. CompleteRegistration do e-mail conta antes da confirmação
- **Como se paga:** se o relatório mostrar muita conta nunca ativada, trocar o disparo para o callback de confirmação
  (já existe o gancho em `src/app/entrar/callback/route.ts`).

### 4. Sem `value` e sem eventos de uso
- **Situação:** só PageView, CliqueCriarConta e CompleteRegistration. Nenhum evento de dinheiro, moeda ou negociação.
- **Como se paga:** decisão do Gabriel sobre o que enviar à Meta; depois, novos nomes em `eventos.ts` e envio em
  `src/server/meta/`.
