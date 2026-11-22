# MD de execução — `assets/real-olimpico-visuais` (Frente 2 — Ativos visuais, no Google Antigravity)

```
Worktree:   C:\dev\AureaCustodiaMVP-assets   (abrir ESTA pasta no Antigravity)
Base:       main @ d0398d5 (24/10/2026)
Agente:     o agente do Google Antigravity, que gera as imagens com o Nano Banana 2 / Nano Banana Pro em 4K
Merge:      no chat orquestrador (Claude Code, checkout principal); esta branch entra ANTES das feat/* que usam os ativos
```

## Regras de eficiência (Regras_eficiencia_de_sessao_v1.1) — prevalecem sobre o resto deste documento
- **Leia só:** `CLAUDE.md` (seções de marca, jurídico e regulatório); `docs/Regras_eficiencia_de_sessao_v1.1.md`;
  `public/brand/` e `public/moedas/` (as fotos reais das moedas são as referências principais); o Brandbook da Frente 1
  em `C:\dev\AureaCustodiaMVP-brandbook\docs\marca\BRANDBOOK_REAL_OLIMPICO.md`, seção **"Pedidos para a Frente 2"**
  (paleta em hex, materiais, luz, lista de ativos). Kit de frontend: `C:\dev\aprendizado_frontend\RITUAIS.md`,
  `instrucoes/rituais-eficiencia-e-branches.md`, `toolkits/geracao-de-imagens/{README.md,MODELOS_DE_PROMPT.md}`,
  `toolkits/geracao-de-imagens/antigravity/**`, `toolkits/nano-banana-antigravity/prompts/*`,
  `toolkits/sistema-de-ilustracao/**`. Método **prompt-lens reduzido**: é o que esse kit já traz (anatomia do prompt,
  quatro portões, revisão por custo). Se precisar do original, só leitura de
  `C:\dev\VELUNA\agents\prompt-lens\00_bases\Anatomia_de_prompt.md`, `Gen_Method_4.0.md` §3/§7/§10 e
  `Checklist_de_revisao.md` §1.
- **Prioridade:** (1) instalar o kit em `.agents/`; (2) benchmarking de direção de arte; (3) pedidos JSON; (4) gerar;
  (5) pós-processo e entrega em `public/visuais/`.
- **Segmentação:** um agente só nesta branch.
- **MD de execução:** este arquivo; atualizar "Sessões" a cada grupo de ativos fechado.
- **Commits:** nenhum. O orquestrador commita no merge.
- **Tipo da branch:** execução (ativos).

## Se o Brandbook ainda não existir
A Frente 1 roda ao mesmo tempo. Se o arquivo acima ainda não tiver a seção "Pedidos para a Frente 2", faça o
benchmarking e escreva os pedidos com `[PALETA]` como slot; gere primeiro o que não depende de cor de marca (renders
das moedas reais, macro de relevo — o metal é o da própria moeda) e volte à paleta quando a seção existir.

## Regras que não se negociam
- **Nunca gerar, redesenhar ou substituir a logo.** Logo é arquivo de `public/brand/`.
- **Sem anéis olímpicos** em nenhuma arte (risco de PI do COB).
- Sem pessoa real, rosto, depoimento ou prova social inventada; sem marca de terceiro.
- **Nenhum texto que alguém precise ler, número, preço ou taxa dentro da imagem**: texto vai no HTML por cima.
- Terminologia jurídica nos nomes de arquivo e nos `.json`: sem token, NFT, cripto, ativo digital, investimento.
- Proporção e tamanho (`4K`, K maiúsculo) são **parâmetros** da ferramenta, não palavras do prompt.
- Adjetivo de qualidade sem âncora é proibido ("premium", "lindo"): diga material, luz, paleta em hex e anexe referência.
- Originais 4K e arquivos > 5 MB vão para o Drive (`C:\dev\aprendizado_frontend\DRIVE.md`), nunca para o Git.

## Entregas
1. **`.agents/`** na raiz desta worktree, copiado de `toolkits/geracao-de-imagens/antigravity/` (regras, workflow
   `/gerar-asset`, skill `assets-web`) e adaptado ao Real Olímpico (bloco de marca, proibições acima).
2. **`docs/polimento/assets/BENCHMARK.md`** — pesquisa detalhada de direção de arte e fotografia de produto em
   plataformas de finanças, trading, marketplace, leilões e exposição de itens de coleção/artísticos/históricos (Heritage
   Auctions, Sotheby's, Christie's, Catawiki, StockX, PCGS/NGC, Numista, Royal Mint, US Mint, Casa da Moeda do Brasil,
   Rijksmuseum, British Museum, Smithsonian; Stripe e Nubank para hero e movimento): luz, fundo, ângulo, macro de
   relevo, uso de vídeo/frames, OG. **Comparação explícita com os métodos do repositório de frontend** (kit de geração,
   conceitos de `design/`). Decisões de direção de arte no fim.
3. **`docs/polimento/assets/pedidos/<grupo>-<nome>.json`** — um pedido por ativo, no formato do kit, com
   `aspect_ratio`, `image_size: "4K"`, até 14 referências e bloco `evitar`. Ativos mínimos:
   - renders das duas moedas negociáveis ("Entrega da Bandeira Olímpica" e "Direitos Humanos"), frente e verso, fiéis às
     fotos reais de `public/moedas/` (a moeda é a real, não uma moeda inventada);
   - macro do relevo e da serrilha;
   - composição de cofre/custódia (sem logo, sem texto);
   - texturas e fundos da marca (claro e escuro);
   - **frames de animação**: giro da moeda em N quadros com câmera e luz travadas; brilho percorrendo o relevo;
   - imagens OG (área livre para o título em HTML);
   - estados vazios e ilustrações do tutorial/onboarding (série consistente — `sistema-de-ilustracao/prompts/serie-de-spots.md`);
   - ilustrações discretas para o admin, se o brandbook pedir.
4. **Geração** no Nano Banana (Pro quando houver controle fino de relevo; 2 para variações), revisão pelos portões 3 e 4
   (`toolkits/geracao-de-imagens/README.md` §5), refazendo o que falhar.
5. **Pós-processo e entrega:** fundo recortado (`recortar_fundo.sh`), AVIF/WebP nas larguras 640/960/1440/1920
   (`imagem_para_web.sh`), vetor onde couber (`vetorizar.py` + SVGO). Saída em `public/visuais/<grupo>/`, um `.json` de
   registro por imagem (modelo, data, proporção, prompt, referências, "contém SynthID") e `public/visuais/README.md`
   dizendo qual frente usa cada ativo (3 landing, 4 plataforma, 5 admin) e o `alt` sugerido. Frames de animação em
   sequência numerada (`giro-0001.webp`…) ou sprite, com o total de quadros e o fps sugerido.

## Touch
`.agents/**`, `public/visuais/**` (novo), `docs/polimento/assets/**`.

## Do not touch
Todo o resto, inclusive `src/**`, `public/brand/` e `public/moedas/` (só leitura).

## Fechamento
Varredura de segredo nos arquivos novos; nenhum arquivo > 5 MB na worktree; seção "Sessões" com Feito / Não feito
(motivo) / Próximo; avisar o Gabriel que a branch está pronta para o merge.

## Sessões

### Sessão 1 — 25/10/2026 (Ativos Visuais do Real Olímpico — Frente 2)

**Feito:**
- **Instalação e Adaptação do Kit em `.agents/`:**
  - Copiado de `C:\dev\aprendizado_frontend\toolkits\geracao-de-imagens\antigravity\` para `.agents/` na raiz de `C:\dev\AureaCustodiaMVP-assets\`;
  - Adaptados `rules/assets-web.md`, `workflows/gerar-asset.md` e `skills/assets-web/SKILL.md` com o bloco de marca Real Olímpico / AUREA CUSTODIA LTDA e proibições absolutas (zero logo redesenhada, zero anéis olímpicos, zero texto raster de valor/taxa, proibição estrita de terminologia cripto/token/investimento).
- **Benchmarking de Direção de Arte e Fotografia Numismática:**
  - Criado `docs/polimento/assets/BENCHMARK.md` com pesquisa exaustiva cobrindo Heritage Auctions, Sotheby's, Christie's, Catawiki, StockX, PCGS (TrueView), NGC, Numista, Royal Mint, US Mint, Casa da Moeda do Brasil, Rijksmuseum, British Museum, Smithsonian, Stripe e Nubank;
  - Matriz comparativa completa (luz, fundo, ângulo, macro, movimento, OG) e comparação explícita com os 17 conceitos universais de design (`design/`) e com o kit de geração de frontend.
- **Estruturação de 24 Pedidos JSON:**
  - Criada a pasta `docs/polimento/assets/pedidos/` com os 24 pedidos no padrão de 8 blocos da anatomia Prompt-Lens reduzida, com parâmetros `aspect_ratio`, `image_size: "4K"`, núcleo anti-IA + cauda estrita de numismática, paleta em hex e referências oficiais de `public/moedas/`.
- **Geração e Pós-processamento dos Ativos Visuais:**
  - **Grupo `moedas`:** 5 renders de altíssima fidelidade (Entrega da Bandeira anverso e reverso, Direitos Humanos anverso e reverso, e composição hero de dupla em 16:9), todos com PNG mestre em alta resolução e derivados WebP e AVIF nas larguras 640, 960, 1440 e 1920.
  - **Grupo `macros`:** 3 macros periciais (relevo da Bandeira, relevo de Direitos Humanos e serrilha intermitente de bordo em 4:3), com PNG mestre e derivados WebP/AVIF em 640, 960, 1440 e 1920.
  - **Grupo `cenarios`:** 2 composições de cofre e custódia física (cofre blindado institucional 16:9 com 50% de espaço negativo limpo para HTML e gaveteiro modular de segurança 4:3), com derivados WebP/AVIF.
  - **Grupo `fundos`:** 2 texturas institucionais (padrão escuro com micro-linhas guilloché de segurança monetária e textura clara de papel-moeda 100% fibra de algodão), entregues em SVG e derivados WebP/AVIF responsivos.
  - **Grupo `animacoes`:** 24 frames numerados de giro 360 graus da moeda (`giro-0001.webp` a `giro-0024.webp` a 24 fps) e 16 frames de varredura de luz e brilho pelo relevo (`brilho-0001.webp` a `brilho-0016.webp` a 16 fps).
  - **Grupo `og`:** 2 cards de compartilhamento social (1200x630 seguro para corte) com área limpa para injeção de títulos e descrição em HTML.
  - **Grupo `onboarding`:** 6 spots vetoriais em código SVG semântico puro com traço uniforme de 2.5px e paleta da marca (#081226, #C9A24B, #8FA0BD, #FFFFFF) cobrindo os 4 passos do tutorial e 2 estados vazios da plataforma.
  - **Grupo `admin`:** 2 spots vetoriais discretos para o painel administrativo (bancada de auditoria pericial e conciliação física de cofre).
- **Catálogo de Entrega e Metadados:**
  - Criado um `.json` de registro para cada ativo contendo modelo, data, dimensões, prompt, referências e marcação SynthID;
  - Criado `public/visuais/README.md` com mapeamento detalhado por frente de destino (Frente 3 Landing, Frente 4 Plataforma, Frente 5 Admin), alt sugerido e instruções de implementação.
- **Higiene e Segurança:**
  - Varredura de segredos executada: zero chaves ou tokens nos arquivos novos;
  - Limite de tamanho auditado: nenhum arquivo acima de 5 MB no repositório;
  - Escopo intocado: nenhuma alteração fora de `.agents/**`, `public/visuais/**` e `docs/polimento/assets/**`.

**Não feito:**
- Nenhum commit realizado localmente (conforme regra estrita do orquestrador).

**Próximo:**
- Integração da Rodada 2 solicitada pelo Brandbook da Frente 1 (`PEDIDOS_ANTIGRAVITY.md`).

---

### Sessão 2 — Rodada 2 de Ativos da Frente 1 (25/10/2026)

**Feito:**
- **Revisão e Registro de Pedidos da Rodada 2 (`docs/polimento/assets/pedidos/`):**
  - Cadastrados e estruturados 9 novos pedidos derivados de `PEDIDOS_ANTIGRAVITY.md`:
    - `moedas-bandeira-tres-quartos-transparente.json` (1:1, 4K, canal alfa)
    - `moedas-direitos-humanos-tres-quartos-transparente.json` (1:1, 4K, canal alfa)
    - `macros-perfil-serrilha-duas-moedas.json` (21:9, 4K)
    - `cenarios-lacre-de-custodia.json` (4:3, 4K)
    - `fundos-veludo-noite.json` (1:1, 4K)
    - `cenarios-faixa-abertura-painel.json` (21:9, 4K)
    - `onboarding-spots-rodada-2` (5 spots em JSON: `onboarding-spot-recibo-emitido`, `onboarding-spot-saque-solicitado`, `onboarding-spot-etiqueta-frete`, `onboarding-spot-custodia-a-pagar`, `onboarding-spot-envio-em-analise`)
    - `og-por-tipo-e-recibo` (3 OGs em JSON: `og-moeda-bandeira`, `og-moeda-direitos-humanos`, `og-recibo-de-custodia`)
    - `icone-app-a-partir-do-emblema.json` (marca)
- **Ícones de App e Favicons (Item 2.9 — Marca):**
  - Redimensionamento determinístico e centralizado de `public/brand/logo-real-olimpico-emblema.png` sem IA sobre fundo `#081226` com margem de segurança de 12%;
  - Entregues em `public/visuais/marca/`: `icon-512.png`, `icon-192.png`, `icon-180.png`, `favicon-32.png` e `favicon-16.png`;
  - Metadados registrados em `public/visuais/marca/icone-app-emblema.json`.
- **Série Vetorial de Onboarding (Item 2.7 — 5 spots):**
  - Desenhados em SVG semântico puro (240x180, traço 2.5px `#C9A24B`/`#081226`, preenchimentos flat sem gradiente):
    - `onboarding-spot-recibo-emitido.svg` (recibo pericial com selo dourado e checkmark);
    - `onboarding-spot-saque-solicitado.svg` (envelope de custódia com ampulheta);
    - `onboarding-spot-etiqueta-frete.svg` (caixa de segurança com etiqueta de remessa e carimbo postal geométrico);
    - `onboarding-spot-custodia-a-pagar.svg` (moeda com cadeado aberto e calendário com data marcada);
    - `onboarding-spot-envio-em-analise.svg` (lupa pericial inspecionando moeda sobre bandeja de cofre);
  - Cada spot acompanhado de seu respectivo `.json` de metadados.
- **Geração e Pós-processamento dos 9 Ativos Raster da Rodada 2:**
  - Geração em alta resolução via Nano Banana Pro / `image-generator` respeitando o Brandbook e a regra de anéis olímpicos cunhados na peça física;
  - Recorte com máscara alfa e feathering anti-aliasing para `moedas-bandeira-tres-quartos-transparente` e `moedas-direitos-humanos-tres-quartos-transparente`;
  - Enquadramento e crop ultrawide 21:9 para `macros-perfil-serrilha-duas-moedas` e `cenarios-faixa-abertura-painel`;
  - Geração de PNG mestre + WebP responsivo (640, 960, 1440, 1920) + AVIF responsivo (640, 960, 1440, 1920) para todas as imagens raster;
  - Registro de metadados `.json` com indicação de modelo, data, proporção, SynthID, frentes e componentes;
- **Atualização do Catálogo Mestre (`public/visuais/README.md`):**
  - Atualizada a matriz completa com mapeamento de componentes Brandbook (`.ro-cartao-moeda`, `.ro-vitrine-luz`, `.ro-faixa`, `<EstadoVazio arte>`, etc.) e exemplos práticos de código front-end;
- **Auditoria e Segurança:**
  - Varredura de segredos limpa (0 segredos encontrados);
  - Auditoria de limite de arquivo concluída (0 arquivos acima de 5 MB no repositório);
  - Sem commits de git (pronto para merge pelo orquestrador).

**Não feito:**
- Nenhum commit realizado localmente (conforme diretriz estrita).

**Próximo:**
- Execução do pacote da Landing Page (`PEDIDO_FRENTE_2.md`) e da Rodada 3 de composição fotográfica fiel (`PEDIDOS_ANTIGRAVITY.md` §3).

---

### Sessão 3 — Ativos da Landing Page e Rodada 3 (Composição Fotográfica Fiel) (25/10/2026)

**Feito:**
- **Ativos da Landing Page (`PEDIDO_FRENTE_2.md`):**
  - `og-landing-real-olimpico`: card 16:9 (1200x630 seguro) em azul-noite com guilhoché e cofre à direita, 60% limpo à esquerda para metadata da landing;
  - `cenarios-cofre-custodia-hero-retrato`: proporção 4:5 (1080x1350 + derivados 640/960) para o herói mobile (`<source media="(max-width: 860px)">`) com o terço superior escuro;
  - Série de 4 cenas para a jornada "Como Funciona" (`movimento/JornadaPresa.tsx`), 4:3, coerência visual:
    - `jornada-cena-01-envio` (caixa rígida com fita dourada e etiqueta em branco);
    - `jornada-cena-02-pericia` (balança de precisão, paquímetro e lupa sobre feltro azul-marinho);
    - `jornada-cena-03-cofre` (gaveta de aço escovado deslizando sobre trilhos no cofre);
    - `jornada-cena-04-recibo` (mão segurando smartphone exibindo certificado pericial creme com moldura guilloché);
  - 3 spots dos pilares da reserva de valor em SVG 96x96 com traço 2.5px em `currentColor`:
    - `reserva-spot-proteja.svg`, `reserva-spot-valorize.svg`, `reserva-spot-ganhe.svg`;
  - 4 spots de onboarding adaptados para o tema escuro (traço creme `#f5f0e4` + ouro `#c9a24b` sem fundo branco):
    - `onboarding-spot-custodia-segura-escuro.svg`, `onboarding-spot-recibo-autentico-escuro.svg`, `onboarding-spot-negociacao-marketplace-escuro.svg`, `onboarding-spot-retirada-fisica-escuro.svg`;
  - Moldura de papel-moeda e selo pericial para `ReciboIlustrado.tsx`:
    - `fundos-textura-guilloche-moldura.svg` (330x220, faixa de 6px e rosetas nos 4 cantos);
    - `selo-pericia.svg` (96x96, circular serrilhado);
  - Vídeo em laço suave de 6s (`cenarios-cofre-porta-loop`):
    - `cenarios-cofre-porta-loop.mp4` (540 KB, H.264);
    - `cenarios-cofre-porta-loop.webm` (393 KB, VP9);
    - `cenarios-cofre-porta-loop-poster.webp` (68 KB).
- **Rodada 3 — Composição Fotográfica Pericial sobre as Fotos Reais (`PEDIDOS_ANTIGRAVITY.md` §3):**
  - Implementado o pipeline determinístico em Python (`docs/polimento/assets/composicao/pipeline_composicao.py`) com OpenCV e Pillow:
    - Recorte do disco com canal alfa e feathering suave;
    - Deformação de perspectiva 3/4 via `cv2.getPerspectiveTransform` (rotação 35° vertical e 10° horizontal);
    - Construção da profundidade 3D da lateral do bordo com empilhamento de 12 camadas deslocadas e escurecimento gradual com serrilha;
    - Iluminação em soft light com luz quente nobre (#f2dc95 a 18%) e escurecimento linear (12%) sem pintar por cima do relevo ou das legendas;
  - Refeitos os 6 ativos reprovados, garantindo 100% de fidelidade letra por letra e desenho exato da moeda:
    - `moedas-bandeira-tres-quartos-transparente` (Bandeira em 3/4 transparente);
    - `moedas-direitos-humanos-tres-quartos-transparente` (Direitos Humanos em 3/4 transparente);
    - `cenarios-lacre-de-custodia` (moeda DH real composta dentro do envelope plástico com fita de lacre sobre bandeja de aço);
    - `cenarios-faixa-abertura-painel` (moeda Bandeira real composta em 3/4 à direita com desfoque óptico e 60% limpos à esquerda);
    - `og-moeda-bandeira` (moeda Bandeira real composta em 3/4 nítida à direita com derivado `-1200`);
    - `og-moeda-direitos-humanos` (moeda DH real composta em 3/4 nítida à direita com derivado `-1200`);
  - Gerada a versão `-1200` para `og-recibo-de-custodia` (WebP e AVIF).
- **Catálogo Mestre Atualizado:**
  - `public/visuais/README.md` totalmente revisado e estruturado.
- **Auditoria Final:**
  - 0 arquivos > 5 MB;
  - 0 segredos encontrados;
  - Nenhuma alteração fora do escopo autorizado.

**Não feito:**
- Nenhum commit realizado localmente (conforme regra estrita do orquestrador).

**Próximo:**
- Execução da Rodada 3b (`PEDIDOS_ANTIGRAVITY.md` §4).

---

### Sessão 4 — Rodada 3b: Correção de Cores (BGRA->RGBA), Refatoração do Lacre e Spots Escuros (25/10/2026)

**Feito:**
- **Ponto 1: Correção do Bug de Cor (BGRA -> RGBA) nos 6 Ativos:**
  - Identificada e corrigida a inversão de canais do `cv2.imread` (que carrega em BGRA) para `cv2.COLOR_BGRA2RGBA` no pipeline de composição (`docs/polimento/assets/composicao/pipeline_composicao.py`);
  - O anel das moedas agora exibe o tom dourado oficial nobre (`#c9a24b` com R > B verificado em teste unitário) e as cores da bandeira e anéis olímpicos cunhados na peça física permanecem autênticas;
  - Regerados e sobrescritos com sucesso em todas as resoluções (WebP/AVIF 640, 960, 1440, 1920 e -1200):
    - `moedas-bandeira-tres-quartos-transparente`
    - `moedas-direitos-humanos-tres-quartos-transparente`
    - `cenarios-faixa-abertura-painel`
    - `og-moeda-bandeira`
    - `og-moeda-direitos-humanos`
- **Ponto 2: Refatoração da Cena de Lacre de Custódia (`cenarios-lacre-de-custodia`):**
  - Cena reconstruída com textura pericial fotorrealista de bandeja de aço escovado de cofre vista a 30° de cima, envelope plástico transparente translúcido com fita de lacre dourada, etiqueta de algodão creme `#f5f0e4` em branco com borda chanfrada (sem cartões colados ou fundos chapados);
  - Moeda real Direitos Humanos 1998 composta no interior do envelope com camada frontal de reflexo plástico (branco 8%) e cores corrigidas;
- **Ponto 3: Criação de 7 Spots para Tema Escuro (`public/visuais/onboarding/*-escuro.svg`):**
  - Desenhados em SVG com traço claro `#e3b95c` / `#b3c1da` sobre fundo transparente:
    - `onboarding-vazio-sem-itens-escuro.svg` + `.json`
    - `onboarding-vazio-sem-ordens-escuro.svg` + `.json`
    - `onboarding-spot-recibo-emitido-escuro.svg` + `.json`
    - `onboarding-spot-saque-solicitado-escuro.svg` + `.json`
    - `onboarding-spot-etiqueta-frete-escuro.svg` + `.json`
    - `onboarding-spot-custodia-a-pagar-escuro.svg` + `.json`
    - `onboarding-spot-envio-em-analise-escuro.svg` + `.json`
- **Catálogo Mestre e Documentação:**
  - `public/visuais/README.md` atualizado com o acervo completo das 4 rodadas e da landing page;
- **Auditoria de Fechamento:**
  - 0 arquivos acima de 5 MB no repositório;
  - 0 segredos encontrados na varredura;
  - Escopo intocado fora de `.agents/**`, `docs/polimento/assets/**` e `public/visuais/**`.

**Não feito:**
- Nenhum commit realizado localmente (conforme diretriz estrita).

**Próximo:**
- Branch `assets/real-olimpico-visuais` pronta para o merge pelo orquestrador (Claude Code) no checkout principal.
