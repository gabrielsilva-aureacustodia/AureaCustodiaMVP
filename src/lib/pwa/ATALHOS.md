# Atalhos tomados em `src/lib/pwa/` (e nos arquivos do PWA)

```
Módulo:        src/lib/pwa/ · src/components/pwa/ · src/app/manifest.ts · src/app/sw.js/ · middleware · next.config.mjs
Data:          04/11/2026
Registro raiz: RISCOS_ASSUMIDOS.md, RA-60
```

## Atalhos e riscos registrados

### 1. Nada foi provado em aparelho de verdade
- **Situação:** os testes rodaram num Chrome emulado (larguras de 320 a 768 px, tema claro e escuro) e, para o iPhone, num
  Chrome que se apresenta como iPhone por troca do `userAgent`. **Não** foram verificados num Android nem num iPhone reais:
  o diálogo de instalação do Chrome (`beforeinstallprompt`), o "Adicionar à Tela de Início" do Safari, a barra de status
  preta, a tela de abertura do iPhone, o que acontece depois de desinstalar.
- **Como se paga:** depois do deploy, instalar num Android (Chrome) e num iPhone (Safari) e seguir a lista em
  `docs/pwa/MD_EXECUCAO.md`, seção "Teste em aparelho real".

### 2. iPhone: nenhum sinal de instalação visto do Safari
- **Situação:** o app instalado tem armazenamento isolado do Safari, então a página não sabe se está instalada. O botão
  "Já adicionei ao meu iPhone" esconde o convite por 30 dias. Quem desinstalar só vê o botão voltar quando o prazo
  vencer; quem instalar sem tocar nele continua vendo o convite. Limite da Apple, não da implementação.

### 3. Sem `screenshots` no manifesto e sem tela de abertura por aparelho
- **Situação:** o Android mostra o diálogo simples de instalação (não a versão "rica", com capturas), e o iPhone, sem imagem de
  abertura própria, tende a abrir com fundo branco por cerca de 1 s (comportamento conhecido do iOS, **não verificado
  aqui**). Nada disso impede instalar nem usar.
- **Como se paga:** capturas do visual final da landing no manifesto; imagens de abertura por tamanho de iPhone.

### 4. O `middleware` deixa passar seis caminhos estáticos sem sessão
- **Situação:** `manifest.webmanifest`, `sw.js`, `offline.html`, `pwa/`, `icon.png` e `apple-icon.png` saíram do `matcher`
  (e `/sw.js` entrou em `ROTAS_PUBLICAS_EXATAS`). É necessário: o navegador busca esses arquivos **sem cookie**, e um
  redirecionamento para `/entrar` quebraria a instalação. São arquivos públicos, sem dado de ninguém.
- **Risco:** arquivo novo em `public/pwa/` fica fora da rede de segurança da sessão. Não ponha nada privado ali.

### 5. `htmlLimitedBots: /.*/` vale para o site inteiro
- **Situação:** desliga a transmissão da metadata no `<body>` (Next 15) para todas as rotas, para que `manifest` e as
  tags `apple-mobile-web-app-*` saiam no `<head>` em qualquer navegador. A resposta passa a esperar a metadata resolver;
  aqui ela é estática, e o custo é próximo de zero, mas não foi medido em produção.
- **Como se paga:** medir o tempo até o primeiro byte das rotas dinâmicas depois do deploy; se pesar, trocar por uma
  lista de agentes só do iPhone.

### 6. Página aberta por horas segue com o código antigo até a pessoa sair e voltar
- **Situação:** o service worker novo assume na hora, mas a página só recarrega quando o app vai para segundo plano (ou
  até 5 s depois de voltar, sem campo em edição). Quem fica parado na mesma tela continua na versão velha do código.
  Mesmo risco de antes do PWA (nenhum HTML é guardado); a diferença é que agora a atualização acontece sozinha.

### 7. Os ícones vieram do emblema oficial, compostos por script
- **Situação:** `scripts/gerar-icones-pwa.mjs` põe o emblema oficial (`/brand/logo-real-olimpico-emblema.png`) sobre
  `#081226`, em 192, 512 e 512 "maskable" (emblema a 68%, para sobreviver ao corte circular do Android), e **substituiu**
  `src/app/apple-icon.png`. Não se desenhou nada novo, e o Gabriel aprovou o visual em 05/11/2026.
- **O que resta:** ver o ícone na tela inicial de um aparelho real (item 1). O ícone anterior continua no git, se for
  preciso voltar: `git checkout src/app/apple-icon.png`.
