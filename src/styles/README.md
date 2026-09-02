# `src/styles/` — CSS global por área

CSS global com os nomes de classe do monolito preservados. **Não são CSS Modules e não
devem virar.**

## ⚠️ A ordem dos imports é a cascata

`app/globals.css` é o único CSS importado pelo layout raiz, e ele importa os demais **numa
ordem que não pode mudar**:

```
tokens → base → login → shell → home → market → wizard → nft → reports → account → responsive
```

**Por que isso é frágil de um jeito específico:** quase toda regra de `responsive.css` tem a
**mesma especificidade** da regra de desktop que ela sobrescreve (`.main`, `.panel`,
`.sidebar`, `.stats`). Media query **não soma especificidade** — quem decide o vencedor é
quem vem depois.

**Trocar duas linhas do `globals.css` derruba o layout mobile em silêncio:** sem erro de
build, sem aviso no console. O sintoma aparece só no celular de alguém.

`responsive.css` **precisa ser o último**. Sempre.

## Arquivos

| Arquivo | Área | Cuidado |
|---|---|---|
| `tokens.css` | Cores e tipografia | **Primeiro, sempre.** Todo o resto lê `var(--...)` |
| `base.css` | Reset e compartilhados: `.btn`, `.panel`, `.field`, `.toast`, `.modal`, `.table-scroll` | Mudança aqui atinge tudo |
| `login.css` | Tela de login | |
| `shell.css` | Sidebar e topbar | |
| `home.css` | Painel inicial e `.stats` | |
| `market.css` | Mercado, venda, `.offer`, `.sell-coin`, pastas e seletor de tipo | O maior arquivo |
| `wizard.css` | Envios (telas 1.3, 4.1, 4.2) | |
| `nft.css` | Recibos e certificado | O certificado **ignora o tema de propósito** |
| `reports.css` | Gráficos e `.audit-table` | |
| `account.css` | Minha conta e configurações | |
| `responsive.css` | **Todas as media queries** | **Último import, obrigatoriamente** |

## Convenções

1. **Cor só existe num arquivo.** Nada de literal nem de fallback dentro de `var()`. Se a
   cor descreve **metal** e não tema (a moeda é dourada no claro e no escuro), o token vive
   no `:root` de `tokens.css`, fora dos blocos de tema
2. **Alvo de toque mínimo: 44px.** Já custou duas correções registradas — um override mais
   específico em `responsive.css` derrubava o mínimo justamente no botão mais clicado
3. **Media query só em `responsive.css`.** Espalhá-las pelos arquivos de área quebra a
   regra de ordem acima
4. **Nome de classe do monolito é contrato.** `.btn`, `.panel`, `.offer`, `.nav-item`
   aparecem em dezenas de componentes

## O certificado e o tema

`nft.css` mantém o `.cert` com fundo creme e tintas fixas nos dois modos, porque **é o mesmo
documento que sai em PDF**. Nenhuma cor do certificado é escrita à mão nos componentes — a
regra inteira está aqui.

## O que quebra se você mexer aqui

| Se você mexer em… | Quebra ou muda… |
|---|---|
| `app/globals.css` (a ordem) | **O layout mobile inteiro**, em silêncio |
| `tokens.css` | Todas as cores da aplicação |
| `base.css` | Todo botão, painel, campo, modal e toast |
| `responsive.css` | O comportamento em celular e tablet |
| `market.css` | `/mercado` **e** `/vender` |

## Como testar uma mudança de CSS

`npm run build` **não acusa erro de CSS** — a folha compila torta do mesmo jeito. A
verificação é visual:

1. `npm run dev` e abra a tela afetada
2. Reduza a janela para menos de 560px (celular) e para 1080px (a fronteira da gaveta)
3. Confira no modo claro **e** no escuro
