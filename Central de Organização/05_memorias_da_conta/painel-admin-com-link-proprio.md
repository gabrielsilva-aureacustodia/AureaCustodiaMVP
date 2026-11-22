---
name: painel-admin-com-link-proprio
description: O painel administrativo da Áurea Custódia precisa de um link de entrada próprio que leve direto ao painel — um link que cai no site do cliente conta como painel inexistente.
metadata: 
  node_type: memory
  pinned: false
  originSessionId: 22aafff8-a5af-4bbe-b7ae-265d5b5f30c5
  modified: 2026-09-15T02:56:45.860Z
---

# O painel administrativo tem link próprio, e o link se confere pelo caminho de quem entra

Em 14/09/2026 publiquei o painel administrativo e mandei ao Gabriel o endereço
`https://aurea-custodia-mvp.vercel.app/admin`, conferido só por `curl` (respondia 307 para o login).
Ele abriu e viu o site comum: **"O LINK NÃO TEM O PAINEL ADMINISTRATIVO QUE VOCÊ CRIOU, SÓ ABRE O SITE
NORMALMENTE. O PAINEL ADMINISTRATIVO PRECISA SER UM LINK SEPARADO SE NÃO NÃO FUNCIONA."**

A causa foi o caminho que uma pessoa real percorre: `/admin` sem sessão mandava para `/entrar`, que
depois do login sempre leva a `/inicio`; e o e-mail real dele não estava no bootstrap de administradores,
então o guarda o jogava no site do cliente sem aviso. O teste automatizado e o `curl` passavam, e o
produto não funcionava para ele.

## O que isso muda

- **O painel tem uma entrada própria** (hoje `/painel`): um link que, aberto do zero, pede login e
  termina dentro do painel, e que diz com qual conta a pessoa está quando ela não tem acesso. Nunca
  entregar o painel como um caminho escondido atrás do login do site.
- **Antes de mandar um link ao Gabriel, conferir o percurso inteiro de quem clica**: sem sessão, depois
  do login, e com o e-mail real dele — não só o código HTTP da primeira resposta. Se eu não puder
  entrar logado (não digito senha), dizer isso junto com o link, em vez de afirmar que funciona.
- O e-mail real do Gabriel (`gabriel.silva@aureacustodia.com.br`) precisa abrir o painel sem depender
  de variável de ambiente que alguém tenha que lembrar de configurar.
