---
name: teste-visual-nunca-vai-para-producao
description: "Página, bloco, texto ou ativo criado só para conferir visualmente nunca pode entrar em commit nem chegar à produção"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 517e8692-a274-4169-8885-bc2745998d75
  modified: 2026-10-25T12:13:11.554Z
---

Toda página, rota, bloco, texto de exemplo ("Ilustração com versão escura", "Faixa em veludo", valores inventados) ou
cópia de ativo criada só para conferir algo no navegador é **temporária**: fica fora do Git e sai antes de qualquer
`git add`. Nada de demonstração em rota de produção.

**Why:** em 25/10/2026 eu criei `src/app/(app)/marca-teste/` e copiei vetores da Frente 2 para `public/visuais/` da
worktree do Brandbook para ver os componentes; o Gabriel interrompeu: "isso tem que sair da produção depois hein,
assim como esses vetores e blocos de teste, tome cuidado com isso".

**How to apply:**
- Marcar o arquivo temporário no topo ("TEMPORÁRIA — apagar antes do commit") e anotar no MD de execução que existe.
- Antes de todo commit: `git status` + busca pelo marcador e pelos textos de exemplo; apagar a página, os ativos
  copiados e o `.next`; só então `git add` por caminho explícito (nunca `git add -A`/`.`).
- Ativo de outra frente não se copia para a minha branch: referencio o caminho e deixo o arquivo chegar pelo merge
  dela.
- Vitrine permanente de componentes só com decisão do Gabriel (rota pública é superfície protegida).
Ver [[commit-so-depois-do-merge]].
