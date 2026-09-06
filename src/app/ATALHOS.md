# Atalhos assumidos nesta pasta

> Notas locais dos atalhos tomados em `src/app/`.
> O documento que compila todos está na raiz: [`RISCOS_ASSUMIDOS.md`](../../RISCOS_ASSUMIDOS.md).

---

## RA-03 🔴 — não há termos de uso nem política de privacidade

**Alcance:** hoje nenhuma rota; **a partir da landing page com cadastro, bloqueante.**

O projeto não tem termos de uso com aceite versionado nem política de privacidade.

Enquanto as contas eram sete e fictícias, dava para adiar — não havia titular de dado
pessoal envolvido. **A landing page com cadastro público muda isso por completo:** cadastrar
usuário é coletar dado pessoal, e a LGPD exige finalidade declarada e base legal.

**O que precisa existir antes de abrir o cadastro:**

1. Termos de uso e política de privacidade, escritos por advogado
2. Aceite **no ato do cadastro**, não depois
3. Registro de **qual versão foi aceita e quando**, por usuário — versão sem registro não
   prova nada numa disputa
4. Política de retenção para fotos e dados pessoais (já registrada no `CLAUDE.md`)

**A landing pode ser construída antes. O cadastro não pode ser aberto ao público.**

---

## RA-10 🟡 — recálculos sem memoização nas telas

**Arquivos:** `(app)/mercado/page.tsx`, `(app)/vender/page.tsx`, `(app)/conta/extrato/page.tsx`

As três reconstroem estruturas a cada render — agrupamento de lotes por categoria, contagem
de moedas livres por tipo, e o extrato inteiro. O `AppProvider` traz estado novo a cada 10
segundos, então isso roda com frequência.

Detalhe do extrato: `userStatement()` percorre **todas** as negociações da plataforma para
filtrar as de uma conta. Cresce com o histórico global, não com o do usuário.

**Custo hoje:** imperceptível. **Com volume:** lentidão visível.

---

## RA-16.b 🟠 — `api/relatorios/` aceita o token de integração em `?token=` (03/09/2026)

**Pasta:** `api/relatorios/`

Existe porque o `IMPORTDATA` do Google Sheets não manda cabeçalho. O token fica na fórmula
da célula e no log do servidor, e lê todos os relatórios — inclusive os extratos de todas as
contas. É só leitura. Sem `AUREA_RELATORIOS_TOKEN`, o caminho está desligado. Ver
`src/server/relatorios/ATALHOS.md` e RA-16 na raiz.

---

## O que NÃO é atalho nesta pasta

- **Quase toda tela ser Client Component** é necessidade: elas dependem do estado vivo que
  o ciclo de 10 segundos mantém. Server Component congelaria a tela no instante da
  requisição.
- **O título vir do pathname** (na Topbar) é decisão de arquitetura, e está explicada no
  README da pasta.

---

## RA-15 ✅ — cadastro simulado e entrada sem senha (pago em 06/09/2026)

**Pastas removidas:** `criar-conta/`, `entrar-demo/`

As duas rotas foram removidas pela frente A. `/cadastrar` agora cria a identidade no
Supabase e só provisiona saldo e moedas fictícias depois da confirmação. `/entrar` exige
senha ou Google OAuth. Detalhes em `RISCOS_ASSUMIDOS.md`, RA-15 e RA-17.
