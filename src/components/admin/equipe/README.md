# `src/components/admin/equipe/` — membros e papéis

| Arquivo | O que faz |
|---|---|
| `PainelEquipe.tsx` | Membros (dar acesso, trocar papel, desativar e reativar), a lista do ambiente (definir papel cadastra a pessoa) e os papéis (criar, editar nome, ordem, painel inicial e permissões, excluir) com a matriz de permissões por módulo |

- Membros: controles só com `admin.membros`. Papéis: só com `admin.papeis`. Sem a permissão, a parte
  fica em modo leitura.
- **Sem confirmação obrigatória**: a mudança vale na hora e fica na trilha com antes e depois.
- As permissões do papel `dev` aparecem marcadas e travadas: ele tem todas, sempre.
- Escritas em `src/server/actions/admin/equipe.ts`; a regra (inclusive "nunca sem dev ativo") em
  `src/server/admin/rbac.ts`; o catálogo em `src/domain/admin/permissoes.ts`.
