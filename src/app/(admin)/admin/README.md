# `src/app/(admin)/admin/` — as rotas `/admin/*`

| Arquivo ou pasta | O que é |
|---|---|
| `layout.tsx` | Confere sessão e membro no servidor (`membroDaPagina`) e monta o casco: `AdminProvider`, `AdminSidebar`, `AdminTopbar`, `ModalHost` e `RegistroDeUso` |
| `page.tsx` | Painel inicial (`PainelInicial`), carregando só o que o papel alcança (`carregarPainelInicial`) |
| `error.tsx` | Fronteira de erro das telas do painel: mostra o aviso dentro do casco, com o menu funcionando |
| `resultados/` | Central de Resultados: financeiro, contábil, KPIs e uso |
| `equipe/` | Membros e papéis |
| `cs/`, `usuarios/` | Atendimento por WhatsApp e ficha do usuário (C2) |
| `bancada/`, `moedas/`, `logistica/`, `configuracao/` | Bancada web, auditoria do acervo, logística e configuração do site (C3) |

Toda página confere a própria permissão. O mapa completo, com a permissão de cada rota, está em
[`../README.md`](../README.md).
