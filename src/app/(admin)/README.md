# `src/app/(admin)/` — o painel administrativo (`/admin`)

O ambiente da equipe da Áurea: Central de Resultados, equipe e papéis e, nas etapas seguintes,
atendimento, usuários, bancada, moedas, logística e configuração do site. Desenho em
[`docs/PLANO_EXECUCAO_ADMIN.md`](../../../docs/PLANO_EXECUCAO_ADMIN.md); frente C da rodada de
finalizações.

## Por que um route group próprio

`(app)/layout.tsx` monta o `AppProvider`, que carrega o `AppState` inteiro e o relê a cada 10 s.
O painel lê ledger, trilha, papéis e indicadores — nada disso está no `AppState`. Aqui o layout, o
provider (`AdminProvider`) e a folha (`src/styles/admin.css`) são próprios. Os parênteses fazem o
grupo não aparecer na URL: as rotas são `/admin/...`.

## Estrutura

```
(admin)/
└── admin/
    ├── layout.tsx              sessão + membro (servidor), casco do painel, registro de uso
    ├── page.tsx                painel inicial por variante do papel
    ├── error.tsx               falha ao carregar uma tela, sem derrubar o casco
    ├── resultados/
    │   ├── page.tsx            redireciona para financeiro
    │   ├── financeiro/         DRE, receita por linha, cartões e fluxo mês a mês     resultados.ver
    │   ├── contabil/           lançamentos, alíquotas, plano de contas, exportações  resultados.ver
    │   ├── kpis/               indicadores do negócio                                resultados.ver
    │   └── uso/                uso da plataforma e trilha de auditoria               resultados.ver | admin.auditoria
    ├── equipe/                 membros do painel e papéis                            admin.membros | admin.papeis
    ├── cs/                     atendimento com WhatsApp e ficha do cliente           cs.ver
    ├── usuarios/               lista de contas e criação de conta                    usuarios.ver
    │   └── [email]/            ficha completa em sete abas, com as ações da conta    usuarios.ver
    ├── bancada/                (C3) bancada de análise no navegador                  bancada.ver
    ├── moedas/                 (C3) auditoria do acervo                              bancada.auditoria
    ├── logistica/              (C3) envios, retiradas e etiquetas                    logistica.ver
    └── configuracao/           (C3) taxas, catálogo e parâmetros                     config.ver
```

As páginas marcadas com (C3) são provisórias desde a C1: o menu nasceu completo, e a etapa
seguinte substitui o `page.tsx` sem tocar na navegação. As de CS e usuários entraram na C2.

## A regra de toda página daqui

**Server Component que confere a permissão antes de carregar qualquer dado:**

```tsx
const membro = await membroDaPagina()                       // sem sessão → /entrar; não é da equipe → /inicio
if (!temPermissao(membro, 'resultados.ver')) return <SemPermissao permissoes={['resultados.ver']} />
const dados = await carregarFinanceiro(periodo)             // só depois
```

O layout faz o mesmo guarda, mas layout e página renderizam em paralelo no App Router — a página
não pode contar com ele. Filtros e período moram na URL (`?ano=&mes=&trimestre=`, `?aba=`,
`?ator=&acao=`): o Server Component lê e carrega.

## Sem segundo login

Quem entrou por `/entrar` e é membro abre `/admin` direto: o mesmo cookie assinado do app. Quem
está em `AUREA_ADMIN_EMAILS` (ou, sem a variável, nas contas de demonstração) e não aparece na
tabela de membros entra como `dev` (RA-40).

## Conexões

| Pasta | Relação |
|---|---|
| `src/components/admin/` | Toda a interface do painel |
| `src/server/admin/` | `membroDaPagina`, e os carregadores das telas (`resultados.ts`, `rbac.ts`, `atendimento.ts`, `ficha.ts`) |
| `src/app/api/webhooks/whatsapp/` | Por onde as mensagens do WhatsApp chegam à tela de CS |
| `src/server/actions/admin/` | As escritas, cada uma conferindo a permissão de novo |
| `src/app/(app)/relatorios/` | Redireciona para `/admin/resultados/financeiro` desde a C1 |
| `src/components/shell/Sidebar.tsx` | O item "Administração" do menu do app aponta para cá |
