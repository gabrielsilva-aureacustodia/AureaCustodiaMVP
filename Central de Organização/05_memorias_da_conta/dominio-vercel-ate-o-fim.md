---
name: dominio-vercel-ate-o-fim
description: "O site oficial do Real Olímpico é https://realolimpico.com.br (publicado, hospedado na Vercel) — todo link para cliente/convite usa ele, não o vercel.app. aureacustodia.com.br é só e-mail corporativo, nunca site."
metadata:
  node_type: memory
  pinned: false
  originSessionId: 22aafff8-a5af-4bbe-b7ae-265d5b5f30c5
  modified: 2026-11-06T17:34:50.010Z
---

# O domínio oficial do site é realolimpico.com.br

**Atualizado em 06/11/2026.** Em 15/09/2026 o site ainda rodava só no endereço da Vercel e o Gabriel
mandou não usar o domínio próprio. Isso **mudou**: o domínio oficial `https://realolimpico.com.br`
já está publicado (Production da Vercel; `/cadastrar` responde 200; `www` redireciona para a raiz).
Em 06/11/2026 montei um convite de cadastro com o link `aurea-custodia-mvp.vercel.app` e o Gabriel
reclamou: "já estamos publicados, me dá o link oficial".

## Como aplicar

- **Link que vai para cliente ou sócio (convite, WhatsApp, e-mail, material): `https://realolimpico.com.br/...`.**
  Cadastro: `https://realolimpico.com.br/cadastrar`; login: `/entrar`; painel da equipe: `/painel`.
- O alias `aurea-custodia-mvp.vercel.app` continua existindo e serve para teste interno, mas não é o
  link que se entrega.
- `aureacustodia.com.br` **nunca foi o site**: é só o e-mail corporativo (Google Workspace). Não
  testar nem apontar erro nele.
- Antes de montar qualquer link público, confirmar o domínio vigente com um curl — memória de domínio
  envelhece rápido (esta já errou uma vez por isso).
