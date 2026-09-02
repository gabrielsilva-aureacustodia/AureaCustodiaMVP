# Atalhos assumidos nesta pasta

> Notas locais dos atalhos tomados em `src/components/`.
> O documento que compila todos está na raiz: [`RISCOS_ASSUMIDOS.md`](../../RISCOS_ASSUMIDOS.md).

---

## RA-09 🟡 — dois controles não são operáveis por teclado

**Arquivos:** `shell/Topbar.tsx` (o "Sair") e `app/(app)/vender/page.tsx` (o aceite de
termos, classe `.terms`)

Os dois são `<div>`/`<span>` com `onClick`, **sem `role`, sem `tabIndex`, sem tratamento de
tecla**. Quem navega por teclado não consegue acioná-los; um leitor de tela não os anuncia
como controles.

**Como isso foi descoberto:** durante um teste manual, o aceite de termos não apareceu na
árvore de acessibilidade e foi preciso clicar por coordenada para conseguir publicar um
anúncio. Se um agente automatizado não consegue, uma pessoa com leitor de tela também não.

**Por que ficou:** são herdados do port fiel do monolito, e a regra da época era não
refatorar o que não foi pedido. **Os componentes criados depois — `market/Folder.tsx` e
`market/TipoSelector.tsx` — já nasceram acessíveis**, com `<button>`, `aria-expanded` e
rádio nativo. Isso deixou uma inconsistência dentro da mesma tela: metade dos controles
funciona por teclado, metade não.

**Como se paga:** trocar por `<button type="button">` com os `aria-*` correspondentes. É
meia hora de trabalho, e o CSS não muda (as classes `.terms` e `.logout` continuam valendo).

---

## RA-10 🟡 — recálculos sem memoização

**Arquivos:** os componentes de mercado e venda, junto com as páginas que os usam.

Nenhum agrupamento está em `useMemo`. As telas reconstroem as pastas por categoria e as
contagens por tipo a cada render — e o `AppProvider` traz estado novo **a cada 10
segundos**.

**Custo hoje:** imperceptível. São 7 contas, ~90 moedas e poucas ofertas.
**Custo com volume:** O(tipos × moedas × ofertas) a cada 10 segundos vira lentidão visível.

**Por que ficou:** otimização prematura esconde mais do que resolve. O ponto está mapeado
para quando o volume justificar.

---

## O que NÃO é atalho nesta pasta

- **Componente compartilhado ser apresentacional** (quem tem o estado é a página) é
  desenho, não dívida — evita que a lista discorde do contador ao lado dela.
- **Os nomes de classe do monolito** são contrato, não legado a limpar.
