# Mínimo necessário × salvaguarda — a distinção

```
Origem:   correção do Gabriel em 20/09/2026, durante a publicação do domínio realolimpico.com.br
Vale para: todo agente que trabalha neste repositório
Prioridade: prevalece sobre qualquer otimização de tempo, token ou número de passos
```

Este documento existe porque a regra de eficiência de sessão — *fazer só o mínimo necessário* —
foi aplicada ao item errado, e a aplicação errada quase custou um domínio inteiro. Ele separa,
com exemplos, **o que a regra manda cortar** de **o que ela nunca manda cortar**.

---

## 1. O episódio

Ao apontar `realolimpico.com.br` para a Vercel, o levantamento da zona mostrou:

| Registro | Valor | Observação |
|---|---|---|
| `A` (raiz) | `162.240.81.81` | servidor da HostGator — é o que a publicação precisa trocar |
| `MX` | `realolimpico.com.br` | **aponta para o próprio domínio** |
| `mail` | apelido da raiz | acompanha o `A` |
| `TXT` / SPF | inexistente | — |

O `MX` apontar para o próprio domínio significa que o e-mail é entregue onde quer que o domínio
resolva. Trocar o `A` para a Vercel entrega o e-mail num servidor que não fala SMTP: some.

Existiam dois caminhos, ambos conhecidos no momento da decisão:

- **Caminho A.** Trocar o `A` e deixar o `MX` como está. Um passo. Quebra o e-mail do domínio.
- **Caminho B.** Criar um registro `A` chamado `mail` apontando para `162.240.81.81`, mudar o
  `MX` para `mail.realolimpico.com.br`, e então trocar o `A` da raiz. Dois campos a mais. Não
  quebra nada, use-se o e-mail ou não.

O erro foi apresentar os dois como alternativas equivalentes e adotar o Caminho A como padrão,
com a justificativa de que "provavelmente ninguém usa esse e-mail" — apoiada em indício
(ausência de SPF, ausência de site) e não em verificação.

A resposta do Gabriel: *"se tem um jeito de fazer uma edição sem causar danos em nada, NÃO
EXISTE RAZÃO NENHUMA DE FAZER O JEITO QUE FODE TUDO."*

---

## 2. A distinção

### 2.1 O que "mínimo necessário" manda cortar

Verificação repetida e cerimônia — trabalho que **não produz informação nova**:

- rodar `lint` e `typecheck` a cada arquivo salvo, em vez de ao fim de um bloco funcional;
- rodar a suíte inteira depois de cada escrita, em vez de no fim da branch, ou por partes quando
  aparece erro e é preciso depurar;
- reler no código o que um documento de execução já responde;
- refazer conferência de algo já confirmado na mesma sessão;
- relatório, checklist ou resumo que ninguém pediu.

Isso gasta tempo e token e não muda o resultado. Cortar é obrigação.

### 2.2 O que "mínimo necessário" nunca manda cortar

O passo barato que **remove um modo de falha** de uma operação difícil de reverter.

O teste é de assimetria, e é simples: *quanto custa fazer* contra *quanto custa não ter feito*.
No caso acima, fazer custava dois campos num formulário — nenhum token relevante, nenhum minuto
humano, nenhum dinheiro. Não fazer custava um domínio de e-mail e uma sessão de depuração.
Quando a conta é essa, não existe decisão a tomar.

---

## 3. A regra

> Quando uma ação tem duas variantes que chegam ao mesmo resultado e uma delas **não pode causar
> dano**, a variante inofensiva é a correta.

Ela não é zelo excessivo, não é escopo inflado e não é trava. É o jeito certo de fazer aquilo.

**Decorrência: não transformar isso em pergunta.** Se o caminho seguro é gratuito, perguntar
"você quer que eu proteja isso?" gasta uma rodada do Gabriel para comprar nada. Faça o seguro e
diga em uma linha o que fez. Pergunta se reserva para quando as duas opções têm custo real e
diferente entre si.

---

## 4. Onde a regra pega com mais força

Em tudo que é lento ou impossível de reverter, e principalmente no que tem propagação e cache
fora do alcance de quem edita:

- **DNS e roteamento de e-mail** — `A`, `CNAME`, `MX`, `NS`, `TXT`/SPF/DKIM/DMARC;
- **variável de ambiente de produção** — sobretudo `NEXT_PUBLIC_*`, que só entra no bundle em
  build novo e por isso falha em silêncio;
- **migração de banco** e qualquer alteração de schema;
- **exclusão** de arquivo, registro, branch remota ou recurso em painel externo;
- **publicação externa** — webhook, domínio, chave de integração.

Código errado quebra na hora e se conserta com um commit. Registro de DNS errado quebra coisas
que nem estavam na conversa — e-mail corporativo, segundo fator de autenticação — e cobra horas
de quem não tem como depurar aquilo.

---

## 5. Indício não substitui verificação — e o caminho seguro dispensa os dois

No episódio, a conclusão "ninguém usa esse e-mail" veio de sinais indiretos. Ainda que estivesse
certa, ela era **desnecessária**: existindo o caminho que preserva o e-mail a custo zero, não há
por que deduzir coisa alguma sobre o uso dele.

Quando o caminho seguro existe, ele torna a investigação dispensável. Quando não existe, aí sim
é hora de verificar na fonte — e de dizer claramente que não deu para verificar, em vez de
afirmar.

---

## 6. Relação com as outras regras do repositório

- **`docs/Regras_eficiencia_de_sessao_v1.md`** — este documento não a revoga; delimita o alvo
  dela. A eficiência mira cerimônia, não salvaguarda.
- **Não criar travas em ambiente de teste** (`CLAUDE.md`) — continua valendo e não conflita.
  Uma *trava* impede o pedido de acontecer (feature flag, gate de ambiente, aceite obrigatório);
  uma *salvaguarda* faz o pedido acontecer sem estrago colateral. A primeira é proibida, a
  segunda é obrigatória.
- **`RISCOS_ASSUMIDOS.md`** — atalho assumido se registra e o projeto anda. Mas atalho que
  destrói infraestrutura de terceiro não é atalho assumido: é defeito.
