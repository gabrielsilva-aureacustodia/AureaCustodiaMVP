# `src/lib/pwa/` — o app instalável (PWA)

Regras e plumbing do Real Olímpico como aplicativo de celular: o que decide **quando oferecer a instalação**,
**como o app se atualiza sozinho** e **o texto do service worker**. A tela (banner, painel, botão da página inicial)
fica em [`src/components/pwa/`](../../components/pwa/README.md). O pedido e as decisões estão em
[`docs/pwa/MD_EXECUCAO.md`](../../../docs/pwa/MD_EXECUCAO.md).

## Arquivos

```
src/lib/pwa/
├── instalacao.ts        Regras PURAS (sem DOM) + a loja de estado (`criarLoja`). Quase tudo que importa está aqui.
├── instalacao.test.ts   39 testes: user agents reais, prioridade dos caminhos, expiração, reaparecer, recusa, loja.
├── navegador.ts         A ÚNICA ponte com o navegador: localStorage, `beforeinstallprompt`, `appinstalled`, standalone.
├── atualizacao.ts       Registro do service worker e a política de recarga segura (`decidirRecarga`).
└── service-worker.ts    `montarServiceWorker(versao)`: devolve o TEXTO do `/sw.js` (ver `src/app/sw.js/route.ts`).
```

Fora desta pasta, mas parte do mesmo desenho: `src/app/manifest.ts` (manifesto), `src/app/sw.js/route.ts` (a rota
do service worker), `public/offline.html`, `public/pwa/*.png` (ícones, gerados por `scripts/gerar-icones-pwa.mjs`),
`src/app/apple-icon.png` (ícone do iPhone), `src/styles/pwa.css`.

## Como a instalação é decidida

`resolverCaminho()` escolhe **um** caminho, nesta prioridade:

| Caminho | Quando | O que a tela faz |
|---|---|---|
| `instalado` | aberto como app (`display-mode: standalone`, `navigator.standalone`) ou instalação confirmada | nada: botão e banner somem |
| `nativo` | o Chrome entregou `beforeinstallprompt` | botão "Instalar" abre o diálogo do sistema |
| `abrir-no-navegador` | Instagram, Facebook, TikTok… (navegador embutido) | painel diz "abra no Chrome/Safari" + copiar endereço |
| `ios` | iPhone/iPad | painel na aba iPhone (Compartilhar → Adicionar à Tela de Início) |
| `android` | Android sem o evento | painel na aba Android (menu ⋮ → Instalar app) |
| `indisponivel` | computador sem suporte | nenhum convite |

**Reaparece se desinstalar (Android/Chrome):** o Chrome só dispara `beforeinstallprompt` quando o app NÃO está
instalado. Quando o evento chega, a marca "instalado" do `localStorage` é apagada. É o único sinal confiável.

**iPhone:** o Safari não dá nenhum sinal de instalação (o app instalado tem armazenamento isolado). Por isso o botão
"Já adicionei ao meu iPhone" esconde o convite por `DIAS_DO_JA_ADICIONEI` (30) dias; depois volta. Limite da Apple.

**Banner flutuante** (`avisoLiberado`): só celular/tablet, só em `ROTAS_DO_AVISO`, só depois de `ESPERA_DO_AVISO_MS`
(6 s) e cede enquanto o botão da página inicial está na tela. "Agora não" some por 7 dias, depois 30.

## Como a atualização funciona

1. O deploy muda `VERCEL_DEPLOYMENT_ID`, que está **dentro do texto** do `/sw.js`. Navegador só atualiza um service
   worker quando os bytes mudam — sem a versão dentro do texto, `registration.update()` nunca acharia nada.
2. A página checa `registration.update()` ao voltar para a tela e a cada 30 minutos. O worker novo instala,
   `skipWaiting` + `clients.claim`, e apaga os caches `ro-casco-*` das versões antigas.
3. A página recebe `controllerchange` e recarrega **só em momento seguro** (`decidirRecarga`): app em segundo plano, ou
   até 5 s depois de voltar sem nenhum campo sendo editado. Quem está usando a tela **não é interrompido** (um reload no meio
   de um Pix ou de uma venda perderia o que a pessoa fazia).

Em desenvolvimento (`next dev`) o service worker **não registra** e ainda desregistra o que sobrou, para não segurar
código velho enquanto se mexe.

## O que o service worker guarda — e o que nunca guarda

Guarda: `/_next/static/**` (arquivos com hash no nome), `/pwa/**`, `/brand/**` e `offline.html`.
**Nunca** guarda HTML, `/api/**`, respostas de Server Action, pedido que não seja GET nem outra origem. Saldo, ofertas
e custódia velhos são pior que "sem conexão". Sem rede, só a navegação cai em `offline.html`.

## Como testar

```bash
npm test -- src/lib/pwa           # regras puras e loja
npm run build && npm start        # o service worker só registra em build de produção
```

Teste de produção local **sem tocar no banco real**: suba `next start` com `POSTGRES_URL`, `DATABASE_URL`, `KV_*` e
`UPSTASH_*` vazias (o `.env.local` não sobrescreve variável já definida) — o estado cai em memória.

Para ver a interface do iPhone num Chrome: um proxy local que injeta, no começo do `<head>`, um script trocando
`navigator.userAgent` (só `userAgent` e `maxTouchPoints` são lidos — ver `detectarAmbiente`). **Não** deixe esse tipo de
atalho no código do produto. Para simular "deploy novo" sem outro build: um proxy que acrescenta um sufixo à versão no
texto do `/sw.js`.

## Armadilhas

- **`src/middleware.ts` precisa deixar passar** `manifest.webmanifest`, `sw.js`, `offline.html`, `pwa/`, `icon.png` e
  `apple-icon.png`. Sem isso o navegador, que busca esses arquivos **sem cookie de sessão**, recebe um 307 para `/entrar`
  e o app deixa de ser instalável (e o ícone some para quem está deslogado). `/sw.js` também está em
  `ROTAS_PUBLICAS_EXATAS` (`src/server/rotas-publicas.ts`), e o `middleware.test.ts` confere as rotas do disco.
- **`htmlLimitedBots: /.*/`** em `next.config.mjs`: sem isso o Next 15 transmite a metadata no `<body>` e as tags
  `apple-mobile-web-app-*` e o `manifest` não saem no `<head>`. Vale para o site inteiro.
- **O ouvinte de `beforeinstallprompt` é um `<script>` inline no `layout.tsx`**, e não `next/script` com
  `beforeInteractive`: este vira uma fila (`self.__next_s`) que só roda quando o pacote principal carrega, quase tão
  tarde quanto a hidratação.
- **Trocar o ícone:** edite o script `scripts/gerar-icones-pwa.mjs` (ele parte do emblema oficial em `/brand/`) e rode
  `node scripts/gerar-icones-pwa.mjs`. Não redesenhe nem substitua a marca à mão.
- **Texto de produto:** sem as palavras que o jurídico proibiu (token, NFT, cripto, ativo digital, investimento).

Atalhos e riscos desta área: [`ATALHOS.md`](./ATALHOS.md) · `RISCOS_ASSUMIDOS.md`, RA-60.
