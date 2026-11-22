---
name: dados-completos-em-infraestrutura
description: "Nunca entregar valor de configuração pela metade — todo registro DNS, variável de ambiente, chave ou URL vai literal e completo, e o resultado é confirmado depois de aplicado."
metadata: 
  node_type: memory
  pinned: true
  originSessionId: 40d1667a-effd-4b9d-b38d-76d8c47b8df9
  modified: 2026-09-06T06:35:19.475Z
---

# Informação de infraestrutura se entrega completa e se confirma depois

Gabriel foi taxativo em 06/09/2026, depois que duas orientações minhas incompletas o
levaram a editar servidores errado no mesmo dia: **"NUNCA MAIS ME MANDE DADOS INCOMPLETOS.
Mexer com MX de servidores de e-mail, mexer com environment tables, isso não é brincadeira!
ENTREGA AS INFORMAÇÕES COMPLETAS e confirma tudo sempre."**

## Os dois casos que provocaram a regra

**O registro MX.** Deduzi o provedor de e-mail pelos resquícios de SPF e DKIM na zona, sem
confirmar, e mandei apontar o MX para o Titan. A caixa dele é Google Workspace. Ele ficou
sem receber e-mail por horas e, junto, sem o segundo fator de acesso ao GitHub.

**A variável de ambiente.** Num passo a passo de painel escrevi *"Value: a string do pooler
6543 (a mesma do `.env.local`)"* em vez de repetir a string inteira. Ele colou um valor
truncado, e a produção passou a falhar com `getaddrinfo ENOTFOUND base` — um erro que não se
parece com a causa e que derrubou até o login que não dependia daquela conexão.

## As três regras

**1. Valor literal e completo, sempre.** Ao pedir que ele preencha qualquer campo —
variável de ambiente, URL, chave, registro DNS, string de conexão — escrever o valor
inteiro num bloco de código próprio, mesmo que já tenha aparecido antes na conversa. Nunca
descrever ("a string do pooler", "a mesma de antes", "aquela chave"): descrição vira
colagem parcial.

**2. Verificar antes de mandar mudar.** Não deduzir configuração de infraestrutura a partir
de indício. Consultar a fonte — DNS autoritativo, documentação vigente do painel, o valor
que comprovadamente funciona — e só então instruir. Se não der para verificar, dizer isso
em vez de afirmar.

**3. Confirmar depois de aplicado.** Quando ele executar, verificar o resultado de fato
(consultar o nameserver, rodar o healthcheck, bater na rota) e dizer se pegou. Não encerrar
com "deve funcionar agora".

## Por que isso importa mais aqui do que em código

Código errado quebra na hora e se corrige com um commit. DNS e variável de ambiente têm
propagação, cache e efeito colateral em sistemas que não estavam na conversa — e-mail
corporativo, segundo fator, banco de produção. Cada rodada errada custa horas e pode
trancá-lo fora de ferramentas de trabalho.

## A regra irmã: escolher a variante que não quebra nada

Esta memória trata de **entregar o valor completo e conferir depois**. Existe uma segunda regra,
do mesmo episódio de fundo, em `minimo-necessario-nao-corta-salvaguarda.md`: quando uma edição
de infraestrutura tem duas formas de ser feita e uma delas **não pode causar dano**, essa é a
forma certa — mesmo que custe um campo a mais —, e não se pergunta ao Gabriel se ele quer a
proteção. "Fazer só o mínimo necessário" corta verificação repetida e cerimônia, nunca corta o
passo barato que remove um modo de falha.

## Painel externo: entregar a URL, nunca o caminho do menu

Regra elevada para cá em 20/09/2026 porque o Gabriel precisou repetir a mesma correção **duas
vezes na mesma sessão** — primeiro sobre o cPanel da HostGator, depois sobre o Google Cloud:
*"Já falei pra por favor sempre me passar links exatos. A interface do Google Cloud não é nem um
pouco intuitiva."*

Quando ele precisa mexer em painel de terceiro — Vercel, Supabase, HostGator, Google Cloud,
Mercado Pago —, o que se entrega é **a URL que ele cola no navegador**, verificada na
documentação vigente, e não uma sequência de cliques. Ele já está logado, muitas vezes com
autenticação de dois fatores, então um link o põe na tela certa em um segundo, enquanto uma
descrição de menu o faz caçar — e interfaces mudam, então a descrição costuma estar velha.

Descrever navegação só se justifica para o que acontece **depois** que a URL abre, e mesmo aí
vale ter conferido os rótulos na fonte.

Endereços já verificados neste projeto:

- HostGator, zona de DNS: `https://cliente.hostgator.com.br/dominios` — Portal do Cliente,
  **não cPanel**; ele não usa cPanel.
- Google Cloud, credenciais OAuth: `https://console.cloud.google.com/apis/credentials`
  (confirmado na documentação do próprio Google em 20/09/2026).
- Supabase, URLs de autenticação:
  `https://supabase.com/dashboard/project/vjbqikfamqdttbmaqrxf/auth/url-configuration`.

Vale notar que o navegador embutido do app **bloqueia** `supabase.com`, `console.cloud.google.com`
e `developers.google.com`, então esses painéis são sempre dele. Para verificar a URL antes de
mandar, dá para buscar a documentação por `curl` na linha de comando, que não passa pelo bloqueio.

### Sem o link, o caminho nomeado — nunca a descrição vaga

Ainda em 20/09/2026, depois de receber o link exato, o Gabriel acrescentou: *"mesmo sem o link
exato, você poderia ter simplesmente me falado que era pra entrar na seção Google Auth Platform,
depois no Clients para editar o Oauth, assim eu teria conseguido fazer bem mais fácil."*

O erro ali foi pior do que falta de link: **eu tinha o caminho específico e entreguei a versão
vaga.** O documento do próprio repositório dizia "Google Auth Platform → Clients", e eu escrevi
apenas "no Google Cloud, na credencial OAuth". Informação boa na mão, versão ruim na resposta.

A regra completa, em ordem de preferência: **(1) a URL exata**, verificada; **(2) não tendo URL,
os nomes das seções na ordem de clique** — "Google Auth Platform → Clients → o cliente Web →
Authorized JavaScript origins"; **(3) nunca** uma referência genérica que o obrigue a procurar.

E antes de descrever qualquer caminho, checar se o repositório já registra o caminho certo —
várias vezes ele está em `docs/`, e repassá-lo custa uma linha.

Vale também para o identificador do recurso: o Client ID do Google
(`20810811802-mjf28vmfcbutbo8k5nr6pqjqe6l74k8h.apps.googleusercontent.com`) carrega o número do
projeto no prefixo, e com ele o link vira
`https://console.cloud.google.com/apis/credentials?project=20810811802`, que abre já no projeto
certo. Quando o identificador aparecer em algum lugar — resposta de API, variável, documento —,
usá-lo para estreitar o link em vez de mandar ele escolher o projeto na mão.
