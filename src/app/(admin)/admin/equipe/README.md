# `/admin/equipe`

`page.tsx` — entra com `admin.membros` ou `admin.papeis`. Com banco, carrega a equipe por
`carregarEquipe` (`src/server/admin/rbac.ts`); sem banco, mostra os papéis de sistema do código e
a lista do ambiente. Desenha com `components/admin/equipe/PainelEquipe`; as escritas estão em
`src/server/actions/admin/equipe.ts`.
