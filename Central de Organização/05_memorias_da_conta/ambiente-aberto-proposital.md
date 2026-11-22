---
name: ambiente-aberto-proposital
description: "No projeto Áurea Custódia, o repositório público, a ausência de SESSION_SECRET local e a senha do banco exposta no histórico são decisões deliberadas do Gabriel durante o MVP — não sinalizar como defeito nem gastar tempo nisso."
metadata: 
  node_type: memory
  pinned: true
  originSessionId: 0e40b938-d9fa-491d-a7b8-05842ccdcaf1
  modified: 2026-09-14T03:15:34.406Z
---

# O ambiente aberto da Áurea Custódia é proposital

Gabriel mantém o repositório `AureaCustodiaMVP` **público no GitHub de propósito**
durante a fase de desenvolvimento, para facilitar que agentes diversos (Claude Code,
Codex, Antigravity, Grok Build e outros) leiam e façam requisições ao repositório sem
fricção de autenticação. Ele mesmo disse que vai fechar o repositório quando as edições
terminarem.

Pelo mesmo motivo, a ausência de `SESSION_SECRET` no `.env.local` e a exposição do
`DEV_SECRET` que está no código-fonte **não são falhas a corrigir nem a repetir como
alerta**. O ambiente é um MVP de teste com sete contas de sócios, sem cliente real e sem
dinheiro de verdade.

## A senha do banco no histórico também não é prioridade

Em 03/09/2026, quando apontei que a senha do Postgres do Supabase estava commitada num
documento do histórico público e coloquei a rotação como primeiro passo de um plano,
Gabriel foi direto: **"Pare de se preocupar agora com a senha do banco. Estamos ainda em
fase de testes e MVP, não é isso o problema que você tem que gastar tempo resolvendo,
essas vulnerabilidades podem ser resolvidas depois."**

A regra vale para toda vulnerabilidade de credencial ou segredo durante a fase de MVP:
mencionar uma vez, no registro de riscos, e seguir em frente. Não colocar como bloqueio
de fase, não repetir em relatórios, não abrir com isso.

## O que isso muda no comportamento

Não levantar essas questões como defeito, risco ou pendência de segurança em
relatórios, planos, checklists ou documentos vivos do projeto. Gabriel já foi informado,
já decidiu, e repetir o alerta é ruído — ele pediu explicitamente que eu parasse de
insistir no assunto, duas vezes (SESSION_SECRET em 01/09 e senha do banco em 03/09).

Quando o projeto entrar na fase de cliente real, a conversa muda: aí o fechamento do
repositório, a rotação dos segredos e da senha do banco voltam a ser pré-requisitos
legítimos, e estão registrados em `docs/PRE_LANCAMENTO_CLIENTES_REAIS.md` e no RA-12 de
`RISCOS_ASSUMIDOS.md`. Até lá, tratar como decisão tomada.

## Dado que ele me entrega, eu guardo — não apago e não recuso

Em 11/09/2026, ao me passar as credenciais do Mercado Pago da empresa para configurar as
integrações financeiras, Gabriel foi explícito: *"SALVE ESSES DADOS NUM MD TEMPORÁRIO PARA
USARMOS; não preocupe com a segurança agora, vamos excluir depois para não ficar no ambiente
nem no repositório MAS NÃO DIFICULTE MINHA VIDA EXCLUINDO DADOS."*

A regra que isso estabelece: quando ele me entrega um dado — credencial, senha, número de
conta, endereço, transcrição —, o meu trabalho é **guardar onde ele pediu e deixar acessível**,
não filtrar, não mascarar, não apagar "por segurança" e não devolver a responsabilidade para
ele. Apagar ou omitir um valor que ele me deu custa a ele uma rodada inteira para reenviar, e
é exatamente o tipo de zelo que ele já classificou como atrapalho.

O único cuidado que permanece, e que não conflita com isso, é **onde** o dado fica: o
repositório é público durante o MVP, então dado pessoal e credencial vão para `docs/privado/`,
pasta que o `.gitignore` exclui e que existe no projeto exatamente para isso. Isso não é
recusar nem dificultar — o arquivo fica no disco dele, legível, no formato que ele pediu.
Basta dizer uma vez onde foi salvo e seguir.

Não fazer login em conta financeira dele nem gerar token no painel continua valendo: isso é
ação minha num serviço externo, não guarda de dado.

## Material de que um agente precisa vai para `docs/`, não para `docs/privado/`

Em 13/09/2026 eu guardei a minuta dos Termos de Uso do advogado, os comentários dele e a lista
de pendências em `docs/privado/`, e depois tive de apontar os prompts dos agentes para o caminho
absoluto da pasta principal — porque os agentes trabalham em worktrees, e uma pasta ignorada
pelo Git não existe dentro de um worktree. Gabriel cortou o contorno: **"simplesmente não coloque
os MDs necessários em docs\privado e sim no docs apenas"**.

A regra que isso estabelece: **documento que um agente vai ler para executar trabalho** — minuta,
transcrição convertida, lista de pendências, especificação — vai para uma pasta versionada dentro
de `docs/`, ao lado do plano que o usa. `docs/privado/` fica para o que nenhum agente precisa
abrir: credencial, senha, número de conta, dado pessoal. Decidir a pasta pela sensibilidade do
conteúdo, e não pela necessidade de acesso, cria exatamente o atrito que ele quer evitar — e o
repositório ser público já é decisão dele. Quando o conteúdo tiver algo sensível, dizer em uma
frase e seguir.
