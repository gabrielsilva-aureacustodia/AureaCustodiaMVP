# `docs/publish_docs/` — o que precisa ser publicado, e como

Documentos de **planejamento de publicação**: o que sai do computador do Gabriel e vai para
o ar, e o desenho do que ainda não existe mas já tem forma decidida.

Esta pasta é separada do resto de `docs/` de propósito. O que está aqui **descreve o
futuro**; o resto de `docs/` descreve o que já está construído. Misturar os dois é como uma
leitura de repositório passa a mentir: alguém abre um plano, acha que é relato, e conta com
uma feature que não existe.

---

## O que tem aqui

### A publicação oficial para clientes — leia nesta ordem

| Documento | O que responde |
|---|---|
| [`PLANO_EXECUTIVO_PUBLICACAO.md`](PLANO_EXECUTIVO_PUBLICACAO.md) | **O quê e o porquê.** Os treze blocos que faltam para abrir a plataforma ao público, a tabela de preços e prazos nova, e as seis decisões que travam execução |
| [`EXECUCAO_3_BRANCHES_PUBLICACAO.md`](EXECUCAO_3_BRANCHES_PUBLICACAO.md) | **Quem e quando.** Três agentes em paralelo, com território de arquivos, cronologia sessão a sessão e ordem de merge |
| [`PROTOCOLO_DO_AGENTE.md`](PROTOCOLO_DO_AGENTE.md) | **Como.** As onze regras que todo agente segue: ritual de sessão, teste por feature, tutorial de ação manual, registro de pendência, e o que fazer quando uma permissão bloqueia |

Os três se leem em ordem e não se repetem: o plano executivo não explica *como* trabalhar, e
o protocolo não explica *o que* construir.

### O painel administrativo dos sócios — vem depois da publicação

| Documento | O que responde |
|---|---|
| [`PLANO_EXECUTIVO_BANCADA_WEBAPP.md`](PLANO_EXECUTIVO_BANCADA_WEBAPP.md) | Como o programa da bancada (hoje um `.exe`) vira uma tela do painel administrativo, no navegador. Cinco fases, ~4,5 dias |
| [`DADOS_VIDEOS_E_IDENTIDADE_NO_PAINEL.md`](DADOS_VIDEOS_E_IDENTIDADE_NO_PAINEL.md) | Onde o vídeo fica e quem pode assistir; como cada registro se amarra à pessoa certa; o que é gravado automaticamente |

Os dois se leem em ordem: o primeiro é o roteiro, o segundo é o desenho de dados que ele
assume. **Nenhum dos dois entra na publicação** — mas o bloco 13 do plano executivo garante
que tudo construído agora já nasça pronto para eles.

---

## A fonte que não está no repositório

O plano executivo nasceu da reunião com o jurídico de **09/09/2026** (Felipe Moraes e
Eduarda Teixeira Martins, 38 minutos). A transcrição fica em **`docs/privado/`**, que está no
`.gitignore` e **não sobe para o GitHub** — o repositório é público durante o MVP, e o
documento traz estratégia jurídica, estratégia comercial que o próprio advogado pediu para
não publicar, e dado pessoal de terceiros.

Um agente que clonar o repositório **não terá esse arquivo**. Ele não precisa: tudo o que
virou decisão de produto está escrito no plano executivo, com a razão explicada. Se precisar
do original, peça ao Gabriel.

---

## Os três achados que estes documentos trouxeram

Vale conhecer antes de abrir qualquer um deles, porque são o que muda decisão:

**1. O navegador não consegue forçar a pilha de captura do Windows.** O `.exe` resolve
sozinho um travamento de câmera que aconteceu nesta máquina em 10/09/2026; uma página não
pode. Existe configuração por máquina em `chrome://flags`. Consequência: o `.exe` **não é
descartado** quando o painel nascer.

**2. Não existe UUID de usuário na plataforma.** A chave de junção de tudo é o e-mail, como
texto, em sete tabelas. O Supabase Auth emite um UUID e o provisionamento o descarta. A
correção é aditiva e pequena — e fica mais cara a cada conta nova.

**3. As análises da bancada entram na trilha de auditoria como `'sistema'`.** As rotas da
estação não têm cookie de sessão, então o autor se perde. A tabela `analises` sabe quem
operou; a trilha, que é o documento feito para auditar, não. E trilha é append-only: o que
entrou errado fica errado.

---

## Regra desta pasta

**Documento que descreve algo já construído sai daqui** e vai para `docs/`, ou vira entrada
no `VERSION_COMPARISON_DAILY.md`. Um plano cumprido deixa de ser plano.

**Nada é copiado para cá.** Se um documento precisa viver aqui, ele é **movido** — duas
cópias divergem no primeiro dia em que alguém atualiza só uma, e o repositório já teve esse
problema três vezes (ver a seção "Regra: nada na raiz" em [`../README.md`](../README.md)).
