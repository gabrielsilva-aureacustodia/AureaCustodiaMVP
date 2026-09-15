# `src/components/admin/` — a interface do painel administrativo

Tudo que o painel `/admin` desenha. As páginas estão em `src/app/(admin)/`; o servidor, em
`src/server/admin/` e `src/server/actions/admin/`.

## Estrutura

| Arquivo ou pasta | O que é | Cliente? |
|---|---|---|
| `navegacao.tsx` | **A navegação inteira, declarada uma vez**, com a permissão de cada item — inclusive os de C2 e C3. Título da topbar e atalhos do painel inicial saem daqui | não (dados) |
| `AdminProvider.tsx` | Contexto do painel: `membro`, `pode(chave)` e `run(acao)` (toast + `router.refresh()`) | sim |
| `AdminSidebar.tsx` | Menu lateral filtrado por permissão, com as classes do casco do app (gaveta mobile de graça) | sim |
| `AdminTopbar.tsx` | Título pela rota, nome e papel do membro, tema, voltar ao app, sair | sim |
| `Blocos.tsx` | `Cartao`, `SemPermissao`, `AreaEmConstrucao`, `Indisponivel`, `AvisoSemBanco` | não |
| `SeletorPeriodo.tsx` | Ano, mês ou trimestre — navega trocando `?ano=&mes=&trimestre=` | sim |
| `BotaoAcao.tsx` | Botão que dispara uma Server Action pelo `run()`; deixa as páginas serem Server Components | sim |
| `formatos.ts` | `dinheiro`, `dataHora` e `horaOuData` (sempre no fuso de Brasília), `percentual`, `duracao`, `numero` | não |
| `resultados/` | Financeiro, Contábil, Indicadores e Uso. Ver [README](resultados/README.md) | misto |
| `equipe/` | Membros e papéis. Ver [README](equipe/README.md) | sim |
| `inicio/` | Painel inicial por variante do papel. Ver [README](inicio/README.md) | não |
| `cs/` | **C2.** A caixa de conversas do WhatsApp em três colunas, com polling de 5 s. Ver [README](cs/README.md) | sim |
| `usuarios/` | **C2.** Lista de contas, criação de conta e a ficha em sete abas com as ações. Ver [README](usuarios/README.md) | misto |
| `entrada/` | A entrada do painel em `/painel`: login que volta para `/admin` e a explicação para conta fora da equipe. Ver [README](entrada/README.md) | sim |
| `bancada/` | **C3.** A bancada web: fila, câmera e gravação, uma linha por moeda, quadro de caixas. Ver [README](bancada/README.md) | sim |
| `moedas/` | **C3.** Filtro e tabela do acervo, verificação da corrente, vídeo da análise. Ver [README](moedas/README.md) | sim |
| `logistica/` | **C3.** Envios e retiradas com alerta de prazo e etiquetas. Ver [README](logistica/README.md) | sim |
| `configuracao/` | **C3.** Formulário por grupo com simulação, versão publicada do documento, catálogo de moedas. Ver [README](configuracao/README.md) | sim |

## Regras desta pasta

1. **O menu esconde; quem recusa é o servidor.** `pode()` só lê a lista de permissões que o layout
   mandou. Toda Server Action confere de novo.
2. **Nenhuma importação de valor de `@/server/*`** além das Server Actions (`@/server/actions/admin/*`).
   Tipos (`import type`) de `@/server/admin/*` são permitidos: somem na compilação.
3. **Nada do `AppProvider`.** O painel não usa o `AppState` do cliente; os dados vêm dos Server
   Components de cada página, e `run()` refaz a página depois de uma escrita. A exceção é a tela
   de CS, que se atualiza sozinha por polling e usa o próprio `executar()` para não refazer a
   página inteira a cada mensagem.
4. **Data e hora sempre por `formatos.ts`**, com fuso explícito — senão o HTML do servidor (UTC)
   diverge do navegador.
5. **CSS em `src/styles/admin.css`, classes `.adm-*`, sem media query** — a gaveta e o layout de
   celular vêm das classes do casco (`.sidebar`, `.main`, `.nav-item`), que `responsive.css` já ajusta.
6. **Alvo de toque de 44 px** em todo botão, campo e item de menu.
7. **Elementos que valem contar no registro de uso ganham `data-uso="area:gesto"`.**

## Conexões

| Pasta | Relação |
|---|---|
| `src/domain/admin/` | Tipos e regra pura: `MembroAdmin`, `temPermissao`, `PERMISSOES`, `lerPeriodo`, `ResumoUso` |
| `src/domain/kpis.ts` | O tipo `Kpis` que `resultados/Indicadores` desenha |
| `src/server/actions/admin/` | As escritas do painel |
| `src/components/shell/Sidebar.tsx` | `SidebarProvider`, `useSidebar` e `useLogout` reaproveitados |
| `src/components/ui/` | `useToast` e `ModalHost` |
| `src/components/providers/RegistroDeUso.tsx` | Montado no layout do painel e no do app |

## O painel antigo

O painel antigo de `/relatorios` foi removido na E3, e o conteúdo vive em `resultados/`.

