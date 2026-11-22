---
name: verificar-caminhos-de-painel
description: "Não descrever caminhos de menu de painéis externos (Cloudflare, HostGator, Supabase, Vercel) de memória — verificar a documentação atual antes, porque as interfaces mudam e Gabriel perde tempo procurando o que não existe."
metadata: 
  node_type: memory
  pinned: false
  originSessionId: 40d1667a-effd-4b9d-b38d-76d8c47b8df9
  modified: 2026-09-06T06:24:35.865Z
---

# Caminhos de painel se verificam antes de serem ditos

Em 06/09/2026 Gabriel me corrigiu três vezes no mesmo dia por eu descrever telas de
serviços externos que não existiam mais:

- no Cloudflare eu mandei clicar em **"Add a site"**; o botão hoje é **"Onboard a domain"**,
  dentro de **Domains**;
- na HostGator eu mandei procurar **Roteamento de E-mail** num cPanel que aquele domínio nem
  tinha, e apontei `financeiro.hostgator.com.br` quando o portal é `cliente.hostgator.com.br`;
- no Supabase eu mandei desligar a confirmação de e-mail em **Providers → Email**, caminho
  que também já mudou.

A reação dele foi **"ME DÁ OS CAMINHOS CERTOS ATUALIZADOS"**.

## O que isso muda no comportamento

Antes de escrever qualquer sequência de menus de um painel de terceiro, buscar a
documentação oficial vigente e citar os rótulos que ela mostra. Se não der para verificar,
dizer que o nome pode ter mudado e descrever o que procurar — a função, não o rótulo — em
vez de afirmar um caminho com confiança.

Vale também confirmar que o passo existe naquele ambiente antes de mandá-lo executar: o
cPanel que eu mandei abrir não existia porque o domínio não tinha hospedagem, e isso era
verificável.

Interfaces de SaaS mudam com frequência, meu conhecimento delas tem data de corte, e cada
caminho errado custa a ele uma rodada inteira de procura.

## Dar o link exato, não o caminho do menu — e na HostGator não é cPanel

Em 20/09/2026, apontando o `realolimpico.com.br` para a Vercel, eu de novo descrevi navegação de
painel de memória: mandei o Gabriel abrir o "Zone Editor do cPanel". Ele cortou: *"Para de falar
da porra do cPanel. Você já cometeu esse erro no passado. Eu em tese não preciso usar cPanel na
minha conta."* — e pediu **o link exato**, porque ele já está logado no Chrome dele e tem
autenticação de dois fatores, então cada tela a mais é tempo perdido.

**O fato verificado na documentação da HostGator Brasil:** a zona de DNS de domínio sem
hospedagem e dos planos Start, P, M, Turbo, Business e Plus se edita no **Portal do Cliente**, em

```
https://cliente.hostgator.com.br/dominios
```

De lá: *Configurar Domínio* → *Editar Zona Avançada de DNS* → *Ok, continuar para a Zona de DNS*
→ *Adicionar registro*. O cPanel é caminho alternativo, para quem tem plano de hospedagem, e não
é o dele.

**A regra que isso acrescenta** à verificação que esta memória já exigia: depois de confirmar o
caminho na fonte, entregar **a URL que ele cola no navegador**, não a sequência de cliques. Ele
está logado, com 2FA resolvido; um link o põe na tela certa em um segundo, enquanto uma lista de
menus o faz procurar. Descrever a navegação só se justifica para o que acontece **depois** que a
URL abre, e mesmo aí vale ter conferido os rótulos na documentação vigente.

É a mesma ideia de `entregar-comando-quando-bloqueado.md`: quando eu não posso executar, o que
eu entrego é a coisa pronta para ele acionar — lá um comando para colar, aqui um link para abrir.
