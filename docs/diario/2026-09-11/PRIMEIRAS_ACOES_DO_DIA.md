# Primeiras Ações do Dia — 11/09/2026

**Para o Gabriel, de manhã, sem ler mais nada.**

---

## 1. Confirme que a base está de pé

```bash
cd C:\dev\AureaCustodiaMVP; git pull; npm install; npm run typecheck; npm test; npm run build
```

Esperado: quatro verdes e **343 testes**. Se algum falhar, o trabalho do dia é esse e nada mais.

## 2. Publique o merge

As três frentes estão mergeadas na `main` local, mas **ainda não subiram**:

```bash
cd C:\dev\AureaCustodiaMVP; git push origin main
```

Esperado: `f7a5e8c..<hash>  main -> main`. Depois confira o deploy em vercel.com → Deployments.

## 3. Responda três coisas

Nenhuma delas é código. Todas travam a publicação.

**a) O preço da custódia.** Hoje o extrato do cliente diz *"Custódia anual de 15 moeda(s) —
R$ 25,00"*. O modelo que vocês decidiram é **R$ 2,00 por moeda por mês**. São três erros numa
linha: o período, o valor e a tabela de origem. Decisão: o mecanismo antigo sai e as faturas
mensais assumem, ou os dois convivem? Detalhe em `CRITICAL_DEBUGS.md`, item CD-11.

**b) O prazo da retirada (D-2).** É D+30 até a moeda chegar na casa do cliente, ou D+30 para a
Áurea postar **mais** D+5 de trânsito? Está numa constante isolada esperando a resposta.

**c) A jornada completa.** Ninguém percorreu, com uma conta nova de verdade, o caminho
inteiro: criar conta → cadastro → depositar → comprar → vender → sacar → pedir a moeda de
volta. É o único item da definição de pronto que nenhum teste automatizado cobre.

## 4. Se for mandar agente novo trabalhar

Diga a ele, sempre:

- A próxima migration é a **013**.
- Antes de escolher número de migration ou reescrever restrição de banco, **olhe as branches
  vivas**, não só a `main`.
- `src/domain/types.ts` precisa de **dono único** — foi onde as três frentes colidiram.

## 5. Nunca

- Commitar `.env.local`, token, senha ou credencial.
- Aplicar migration **antes** de o código correspondente estar no ar. Derruba a aplicação
  inteira, inclusive o login.
- Mexer em MX, SPF, DKIM ou DMARC do domínio — são do Google Workspace e derrubam o e-mail
  da empresa.
