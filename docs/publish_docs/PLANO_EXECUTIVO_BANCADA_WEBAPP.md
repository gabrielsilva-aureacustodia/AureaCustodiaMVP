# Plano Executivo — a bancada dentro do Painel Administrativo

```
Projeto:     Áurea Custódia / Real Olímpico — frente E, fase 2
Escrito em:  10/09/2026
Objetivo:    o programa da bancada deixar de ser um .exe baixado e passar a ser
             uma tela do painel administrativo, aberta no navegador
Estado:      plano — a execução acontece na branch do painel
```

> **Para o Rogério, em um parágrafo.** Hoje a bancada é um programa que se instala no
> notebook. Isso funciona, mas cada pessoa precisa receber um arquivo de 96 MB, e quando
> mudarmos alguma coisa todo mundo precisa receber de novo. A proposta é que a mesma
> bancada vire **uma página do painel administrativo**: quem tem acesso abre o navegador,
> entra com a própria conta e usa. Atualização passa a ser automática para todos. O que se
> perde é descrito na seção 3, e há uma coisa que o navegador não consegue fazer sozinho.

---

## 1. O que já está pronto e não se refaz

A conversão é menor do que parece, porque a parte difícil não está na tela.

| Camada | Onde está | Precisa mudar? |
|---|---|---|
| Fórmula do hash, congelada com vetor de teste | `src/domain/analise.ts` | **Não** |
| Tabela `aurea.analises`, migration 004 | `src/server/db/` | **Não** |
| Regra de negócio: fila, veredito, criação da moeda | `src/server/estacao/analise.ts` | **Não** |
| Rotas `/api/estacao/*` | `src/app/api/estacao/` | Só a autorização (seção 4) |
| Assinatura da URL de upload | `src/server/estacao/video.ts` | **Não** |
| A tela: câmera, gravação, formulário, vereditos | `estacao/renderer/` | **Sim** — vira componente React |
| Disco local e fila offline | `estacao/main.js` | **Sim** — vira armazenamento do navegador |

**Cerca de 80% do trabalho da frente E é aproveitado inteiro.** O que se reescreve é a
casca: a tela e o acesso ao disco.

---

## 2. A decisão que mais afeta o custo

Você disse que o painel será outra branch e **"não no mesmo site exato"**. Isso admite duas
leituras, e elas custam coisas muito diferentes.

### Opção A — Mesma aplicação Next, rota separada (recomendada)

O painel é um grupo de rotas dentro deste mesmo projeto — por exemplo `/admin/bancada` —, e
opcionalmente ganha um domínio próprio apontando para o **mesmo deploy**
(`painel.aureacustodia.com.br`, na Vercel, é configuração de domínio, não projeto novo).

- ✅ **Sem CORS.** A página e a API são a mesma origem
- ✅ **Sem cookie entre domínios.** A sessão que já existe simplesmente funciona
- ✅ Um deploy, um build, um lugar para o `src/domain` compartilhado
- ✅ A branch continua separada: o isolamento que você quer é de *código em
  desenvolvimento*, e branch resolve isso

### Opção B — Aplicação Next separada, outro projeto na Vercel

- ❌ **CORS em todas as rotas** `/api/estacao/*`
- ❌ **Cookie entre origens**: a sessão precisaria de `SameSite=None; Secure`, o que
  enfraquece a proteção contra CSRF que hoje é de graça
- ❌ O `src/domain` teria que virar pacote compartilhado, ou ser duplicado — e duplicar a
  fórmula do hash é exatamente o que a frente E foi desenhada para evitar
- ✅ Isolamento total de deploy: derrubar o painel não derruba o site

**Recomendação: Opção A.** O ganho da B é isolamento de deploy, que resolve um problema que
ainda não temos; o custo dela é CORS, cookie entre domínios e o risco de duplicar o hash.
Se um dia o painel precisar sair, sair é mais fácil do que voltar.

Esta é a primeira coisa a decidir, porque tudo abaixo assume a Opção A.

---

## 3. As quatro garantias do Electron, e o que as substitui

Aqui está o núcleo honesto deste plano. O `.exe` não foi escolhido por capricho — ele
entregava quatro coisas. Três têm substituto no navegador. Uma não tem.

### 3.1 "Grava no disco antes de enviar" → **OPFS**, com uma ressalva

O navegador tem o *Origin Private File System* (`navigator.storage.getDirectory()`): um
sistema de arquivos real, privado da origem, que aguenta arquivos grandes e sobrevive a
fechar a aba. A gravação vai para lá **antes** de qualquer tentativa de envio, exatamente
como hoje.

**A ressalva:** esse espaço é do navegador, não do Windows. Limpar dados de navegação apaga.
Mitigação: pedir `navigator.storage.persist()` na primeira vez — o Chrome concede a sites que
o usuário instalou ou usa com frequência, e passa a proteger contra despejo automático.

**O que se perde de verdade:** o operador não abre mais `C:\AureaEstacao\analises\` no
Explorer. A tela precisa oferecer um botão de **baixar o vídeo**, e é a única forma de tirar
o arquivo de lá.

### 3.2 Fila offline → **IndexedDB**, com paridade real

Isto não perde nada, e vale dizer por quê: o `.exe` também só reenvia **enquanto está
aberto** — o temporizador de um minuto morre junto com o programa. Uma aba aberta tem
exatamente a mesma capacidade. A fila vira uma tabela no IndexedDB, e o reenvio acontece a
cada minuto enquanto a aba estiver aberta, mais uma tentativa ao abrir.

### 3.3 Escolher a câmera → **igual**

`enumerateDevices` e `getUserMedia` são as mesmas APIs. O código de `abrirFluxo()`, a queda
para "qualquer câmera", a lembrança da escolha e os prazos de 8 segundos migram como estão.

### 3.4 Forçar o DirectShow → **NÃO TEM SUBSTITUTO EM CÓDIGO**

> ⚠️ **Este é o risco principal deste plano, e ele é concreto porque já aconteceu nesta
> máquina.**

Em 10/09/2026, com a webcam USB da bancada conectada, `enumerateDevices()` e
`getUserMedia()` **travaram** — mais de vinte segundos sem responder, sobrevivendo a
reiniciar o programa. A causa é o MediaFoundation, a pilha de captura padrão do Chromium. O
`.exe` resolve isso sozinho, com uma opção de linha de comando que ele passa a si mesmo.

**Uma página não pode passar opção de linha de comando para o navegador que a abriu.**

O que existe é uma configuração **por máquina**, feita uma vez pelo operador:

```
chrome://flags/#enable-media-foundation-video-capture
```

Mudar de **Default** para **Disabled** e reiniciar o navegador.

**O que o webapp pode fazer** — e deve — é **diagnosticar com precisão**. Os prazos de 8
segundos já existem no código de hoje; no painel, quando eles estourarem, a tela deve
mostrar exatamente esse endereço e esse passo, em vez de um "não consegui abrir a câmera"
genérico. A diferença entre um operador perdido e um operador resolvido é essa mensagem.

**Consequência para o roteiro:** o `.exe` **não é descartado**. Ele vira a alternativa para
a bancada cuja máquina se recusar a cooperar. Como servidor e domínio são os mesmos, manter
os dois custa quase nada — a tela é a única coisa duplicada.

---

## 4. Autenticação — a mudança de conceito

Hoje: a estação é uma **máquina**, com chave própria (`AUREA_ESTACAO_TOKEN`), porque ela não
é um usuário e não tem sessão.

No painel: quem opera é uma **pessoa logada**. E aqui há uma regra que não pode ser
quebrada:

> ⚠️ **A chave da estação NÃO pode ir para o navegador.** Qualquer coisa embutida numa
> página é visível para quem abre o inspetor. Uma chave que abre a rota de criar ativo, num
> pacote JavaScript público, é o mesmo defeito do monolito original — onde qualquer pessoa
> com o console aberto comprava de graça.

**A mudança:** `autorizarEstacao()` passa a aceitar **duas** identidades:

```
sessão de administrador  OU  chave de máquina
```

É exatamente o molde que `src/server/relatorios/acesso.ts` já usa há semanas, e reaproveitar
`ehAdmin()` faz o painel e os relatórios responderem à mesma pergunta de uma forma só.

O ganho colateral é grande: **o operador deixa de ser um campo digitado.** Hoje o
`analise.operador` é o que a pessoa escreveu na configuração — dá para escrever o e-mail de
outro. Com sessão, ele passa a vir do cookie assinado, e o campo `operador` do hash passa a
ser uma afirmação verificada em vez de uma declaração. **Isso paga metade do RA-21 sem
mexer na fórmula**, porque o campo já existe.

Arquivos que mudam:

| Arquivo | Mudança |
|---|---|
| `src/server/estacao/acesso.ts` | aceitar sessão de admin além do token |
| `src/app/api/estacao/*/route.ts` | ler a sessão e repassar |
| `src/server/estacao/analise.ts` | `operador` vem da sessão, não do corpo |
| `estacao/renderer/app.js` | nada — o `.exe` continua usando o token |

---

## 5. O que se escreve de novo

```
src/app/(painel)/bancada/
├── page.tsx                    Server Component: lê a fila, confere que é admin
├── Bancada.tsx                 Client Component: o que hoje é renderer/app.js
├── Camera.tsx                  seleção, preview, gravação
├── Vereditos.tsx               um bloco por moeda
└── bancada.css                 o que hoje é renderer/estilo.css

src/lib/bancada/
├── deposito.ts                 OPFS: grava, lê e apaga o vídeo local
├── fila.ts                     IndexedDB: enfileira, tenta, marca recusado
└── formatos.ts                 a lista FORMATOS e iniciarGravador(), portados
```

**A tradução da ponte.** O que hoje passa por `window.estacao` vira:

| Hoje (Electron) | No painel |
|---|---|
| `site.fila()` | `fetch('/api/estacao/fila')` — mesma origem, cookie vai junto |
| `site.fechar(carga)` | grava no IndexedDB, depois `fetch` |
| `video.gravar(...)` | escreve no OPFS, pede a URL assinada, envia direto |
| `config.ler/gravar` | some: o endereço é a própria origem e o operador vem da sessão |
| `pasta.abrir()` | vira um botão **Baixar o vídeo** |

**O que some é bom sinal:** a tela de configuração inteira desaparece. Sem endereço para
digitar, sem chave para colar, sem operador para escrever errado.

**TypeScript strict.** Hoje `estacao/` é JavaScript puro e fica fora do `tsconfig`. Ao
entrar em `src/`, o código passa a ser conferido — sem `any`, tipos vindos de
`src/domain/types.ts`. É trabalho real, e é o que impede a tela de divergir do contrato.

---

## 6. Duas coisas a verificar antes de começar

**CORS do Supabase Storage.** Hoje quem envia o vídeo é o processo Node do Electron, que não
tem CORS. No navegador, o `PUT` para a URL assinada é uma requisição de outra origem. O
Supabase Storage costuma responder com CORS permissivo, mas **isso precisa ser confirmado
com um envio de verdade** antes de a fase 3 começar — não depois.

**Limite de armazenamento do navegador.** OPFS respeita a cota da origem, que varia com o
disco livre. Um vídeo de 5 minutos em 1080p passa de 100 MB. Vale medir com uma gravação
real de bancada antes de prometer que o vídeo fica guardado localmente.

---

## 7. As fases

### Fase 1 — Autorização por sessão · meio dia

Fazer `/api/estacao/*` aceitar administrador logado além do token, e o `operador` passar a
vir da sessão. **Pode ser feita agora, antes do painel existir**, e não quebra o `.exe`.

✅ **Aceite:** um administrador logado consegue chamar `/api/estacao/fila` pelo navegador,
sem token; o `.exe` continua funcionando com o token.

### Fase 2 — A tela dentro do painel · 2 dias

Portar `renderer/` para componentes React. Câmera, gravação, vereditos e fechamento, com o
vídeo ainda em memória.

✅ **Aceite:** uma análise completa, do começo ao fim, pelo navegador — moeda criada com
recibo e hash real.

### Fase 3 — OPFS e a fila · 1,5 dia

Vídeo gravado no OPFS antes de qualquer envio; fila no IndexedDB com reenvio; botão de
baixar.

✅ **Aceite:** desligar a rede no meio, fechar a análise, **recarregar a página**, religar a
rede e ver a análise subir sozinha — com o vídeo intacto.

### Fase 4 — Diagnóstico da câmera · meio dia

Quando os prazos de 8 segundos estourarem, mostrar o passo do `chrome://flags` em vez de uma
mensagem genérica.

✅ **Aceite:** numa máquina com o problema, o operador lê a tela e resolve sozinho, sem
pedir ajuda.

### Fase 5 — Aposentar ou manter o `.exe` · decisão

Depois de a bancada rodar um mês pelo navegador, decidir. A recomendação é **manter**
enquanto houver uma máquina que precise do DirectShow.

**Total: cerca de 4,5 dias de trabalho.**

---

## 8. Riscos

| Risco | Gravidade | O que fazer |
|---|---|---|
| A pilha de captura travar no navegador, sem poder forçar DirectShow | **Alta** | Fase 4: diagnosticar com precisão. E manter o `.exe` como alternativa |
| CORS do Supabase Storage bloquear o envio do navegador | Média | Confirmar com um envio real **antes** da fase 3 |
| Navegador despejar o OPFS e apagar um vídeo não enviado | Média | `navigator.storage.persist()` e botão de baixar |
| A chave da estação vazar para o pacote JavaScript | **Alta** | Nunca embutir. A sessão é a identidade no painel — seção 4 |
| Duplicar a fórmula do hash em dois projetos | **Alta** | É o argumento decisivo pela Opção A na seção 2 |
| Aba fechada no meio de uma gravação longa | Média | Escrever no OPFS em blocos durante a gravação, não só no fim |

---

## 9. O que este plano não muda

- **A fórmula do hash.** Congelada, com vetor de teste. O painel calcula tanto quanto o
  `.exe` calcula: nada. Quem calcula é o servidor, com o relógio dele.
- **As regras de negócio.** Envio inteiro de uma vez, papel único, endereço pela caixa.
- **O ritual da etiqueta.** O aviso de LGPD ao lado do botão de gravar continua, porque o
  problema é de bancada, não de programa.
- **O vídeo não trava a análise.** RA-23 continua valendo, e no navegador vale mais ainda:
  agora há mais um lugar onde o armazenamento pode falhar.

---

## 10. O primeiro passo

A **Fase 1** não depende do painel existir, não quebra nada e é meio dia de trabalho. Ela
pode entrar na branch de hoje: assim, no dia em que o painel nascer, a bancada já responde a
quem está logado.
