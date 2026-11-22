---
name: email-corporativo-e-google-workspace
description: "O e-mail corporativo @aureacustodia.com.br fica no Google Workspace, não no Titan — a documentação do projeto está errada nesse ponto e me levou a dar uma orientação de DNS que quebrou o recebimento."
metadata: 
  node_type: memory
  pinned: false
  originSessionId: 40d1667a-effd-4b9d-b38d-76d8c47b8df9
  modified: 2026-09-06T04:47:41.237Z
---

# O e-mail da Áurea Custódia é Google Workspace, não Titan

Gabriel confirmou em 06/09/2026 que lê `gabriel.silva@aureacustodia.com.br` **no Google
Workspace / Gmail**. Esse é o provedor de e-mail real do domínio `aureacustodia.com.br`.

## Por que isso precisa ficar registrado

A documentação do repositório afirma o contrário. O
`docs/GUIA_VERCEL_HOSTGATOR_EMAIL_E_DOMINIOS.md` descreve o e-mail como HostGator/Titan e
traz uma tabela mandando apontar os MX para `mx1.titan.email` e `mx2.titan.email`. A zona
DNS também tinha resquícios que reforçavam essa leitura errada: um SPF
`include:spf.titan.email`, um DKIM `titan1._domainkey` e um CNAME
`webmail → titan.hostgator.com.br`.

Confiando nesses sinais, orientei o Gabriel a restaurar os MX do Titan enquanto ele estava
sem receber e-mail. Era a orientação errada: com a caixa no Google, apontar o MX para o
Titan mantém o e-mail quebrado, porque o Titan não conhece o usuário. Os sinais corretos
de que o domínio é Google Workspace estavam na mesma zona — `google._domainkey` e
`google-site-verification` — e eu não os interpretei.

## O que isso muda no comportamento

Em qualquer tarefa que toque DNS, e-mail, autenticação ou envio transacional deste
domínio, partir de que o correio é Google Workspace: os MX são os do Google
(`smtp.google.com`, ou o conjunto `aspmx.l.google.com` e seus `alt`), e o SPF precisa de
`include:_spf.google.com`. Não tratar o guia HostGator/Titan como fonte da verdade nesse
ponto até ele ser corrigido.

O e-mail corporativo é também o segundo fator de acesso do Gabriel a serviços do projeto,
o GitHub da Áurea Custódia entre eles. Quebrar a entrega de e-mail o tranca fora de
ferramentas de trabalho, então mudança de MX nesse domínio é operação sensível, não
ajuste de rotina.
