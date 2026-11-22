# Catálogo de Ativos Visuais — Real Olímpico (Frente 2)

**Worktree:** `C:\dev\AureaCustodiaMVP-assets`  
**Branch:** `assets/real-olimpico-visuais`  
**Data:** 25/10/2026 (Rodada 1 + Rodada 2 + Pedido Landing Page + Rodada 3 + Rodada 3b)  
**Método:** Composição Fotográfica Pericial (Pixels da Foto Real, Cores RGBA Corrigidas) + Prompt-Lens Reduzido / 4K + SVG Semântico em `currentColor` / Tema Claro e Escuro  
**Destino pós-merge:** Frentes 3 (Landing Page), 4 (Plataforma do Cliente) e 5 (Painel Admin)  

---

## 1. Mapeamento Geral de Ativos por Frente e Componente

### 1.1 Moedas Físicas Oficiais (Frentes 3 e 4)

| Identificador | Proporção | Formatos Entregues | Frente(s) de Destino | Componente Brandbook | Método / Fidelidade |
|---|---|---|---|---|---|
| `moedas-bandeira-tres-quartos-transparente` | 1:1 | PNG mestre (alfa), WebP (640-1920), AVIF (640-1920) | **Frente 3, 4** | `.ro-cartao-moeda`, `.ro-vitrine-luz` | **Composição da Foto Real (Cores RGBA Corrigidas, ouro nobre #c9a24b)** em 3/4 com bordo chanfrado e canal alfa |
| `moedas-direitos-humanos-tres-quartos-transparente` | 1:1 | PNG mestre (alfa), WebP (640-1920), AVIF (640-1920) | **Frente 3, 4** | `.ro-cartao-moeda`, `.ro-vitrine-luz` | **Composição da Foto Real (Cores RGBA Corrigidas, ouro nobre #c9a24b)** em 3/4 com bordo chanfrado e canal alfa |
| `moedas-bandeira-reverso` | 1:1 | PNG mestre, WebP (640-1920), AVIF (640-1920) | **Frente 3, 4** | Vitrine ortogonal pericial | Foto pericial oficial da moeda Entrega da Bandeira |
| `moedas-bandeira-anverso` | 1:1 | PNG mestre, WebP (640-1920), AVIF (640-1920) | **Frente 3, 4** | Ficha técnica da moeda | Anverso com a efígie da República |
| `moedas-direitos-humanos-reverso` | 1:1 | PNG mestre, WebP (640-1920), AVIF (640-1920) | **Frente 3, 4** | Vitrine ortogonal pericial | Foto pericial oficial da moeda Direitos Humanos 1998 |
| `moedas-direitos-humanos-anverso` | 1:1 | PNG mestre, WebP (640-1920), AVIF (640-1920) | **Frente 3, 4** | Ficha técnica da moeda | Anverso oficial com dístico 1 Real 1998 |
| `moedas-dupla-par-hero` | 16:9 | PNG mestre, WebP (640-1920), AVIF (640-1920) | **Frente 3 (Landing)** | Hero section | Composição editorial dupla com as duas moedas |

### 1.2 Cenários e Cofre de Custódia (Frentes 3 e 4)

| Identificador | Proporção | Formatos Entregues | Frente(s) de Destino | Componente Brandbook | Função / Alt Sugerido |
|---|---|---|---|---|---|
| `cenarios-cofre-custodia-hero` | 16:9 | PNG mestre, WebP (640-1920), AVIF (640-1920) | **Frente 3 (Landing)** | Hero section desktop | "Interior do cofre blindado de custódia física institucional de alta segurança" |
| `cenarios-cofre-custodia-hero-retrato` | 4:5 | PNG mestre, WebP (640, 960, 1080), AVIF (640, 960, 1080) | **Frente 3 (Landing)** | Herói no celular (`<source media="(max-width: 860px)">`) | Cofre com terço superior escuro `#081226` para o título no celular |
| `cenarios-faixa-abertura-painel` | 21:9 | PNG mestre, WebP (640-1920), AVIF (640-1920) | **Frente 4 (Plataforma)** | `.ro-faixa` do `/inicio` | **Composição da Foto Real:** moeda Bandeira à direita com desfoque óptico e 60% limpo à esquerda |
| `cenarios-lacre-de-custodia` | 4:3 | PNG mestre, WebP (640-1920), AVIF (640-1920) | **Frente 3, 4** | Faixa de confiança e envio recebido | **Composição da Foto Real (Rodada 3b):** bandeja de aço escovado a 30°, envelope transparente e etiqueta creme em branco com moeda DH real selada |
| `cenarios-gavetas-seguranca-card` | 4:3 | PNG mestre, WebP (640-1920), AVIF (640-1920) | **Frente 3, 4** | Card de segurança | Gaveteiro modular de custódia individualizada |
| `cenarios-cofre-porta-loop` | 16:9 | MP4 (540 KB) + WebM (393 KB) + poster WebP | **Frente 3 (Landing)** | Chamada final (`<video loop muted>`) | Vídeo de 6s em laço suave contínuo da porta e gavetas do cofre |

### 1.3 Cenas da Jornada "Como Funciona" (Frente 3 — `movimento/JornadaPresa.tsx`)

| Identificador | Proporção | Formatos Entregues | Passo da Jornada | Descrição / Alt Sugerido |
|---|---|---|---|---|
| `jornada-cena-01-envio` | 4:3 | PNG mestre, WebP (640-1920), AVIF (640-1920) | **Passo 1 (Envio)** | Caixa rígida cinza-chumbo com fita dourada e etiqueta em branco sobre madeira escura |
| `jornada-cena-02-pericia` | 4:3 | PNG mestre, WebP (640-1920), AVIF (640-1920) | **Passo 2 (Perícia)** | Balança analítica de precisão, paquímetro de aço e lupa pericial sobre feltro azul-marinho |
| `jornada-cena-03-cofre` | 4:3 | PNG mestre, WebP (640-1920), AVIF (640-1920) | **Passo 3 (Cofre)** | Gaveta modular em aço escovado deslizando sobre trilhos com forro aveludado dentro do cofre |
| `jornada-cena-04-recibo` | 4:3 | PNG mestre, WebP (640-1920), AVIF (640-1920) | **Passo 4 (Recibo)** | Smartphone exibindo certificado oficial creme com moldura guilloché e selo de autenticidade |

### 1.4 Pilares da Reserva de Valor (Frente 3 — `reserva/`)

| Identificador | Dimensão | Formato | Pilar da Landing | Descrição |
|---|---|---|---|---|
| `reserva-spot-proteja` | 96×96 | SVG semântico (`currentColor`) | **Proteja** | Escudo nobre com fechadura mecânica pericial |
| `reserva-spot-valorize` | 96×96 | SVG semântico (`currentColor`) | **Valorize** | Medalhão circular com seta curva ascendente e brilhos de autenticidade |
| `reserva-spot-ganhe` | 96×96 | SVG semântico (`currentColor`) | **Ganhe** | Recibo de custódia convertendo-se em moedas que entram em uma carteira |

### 1.5 Molduras e Selos Periciais (Frentes 3 e 4 — `ReciboIlustrado.tsx`)

| Identificador | Dimensão | Formato | Componente | Descrição |
|---|---|---|---|---|
| `fundos-textura-guilloche-moldura` | 330×220 | SVG semântico (`currentColor`) | `ReciboIlustrado.tsx` | Moldura retangular de papel-moeda com faixa de 6px e rosetas nos 4 cantos |
| `selo-pericia` | 96×96 | SVG semântico (`currentColor`) | `ReciboIlustrado.tsx` | Selo circular serrilhado de garantia e conferência pericial |

### 1.6 Cards Open Graph (Frentes 3 e 4)

| Identificador | Proporção | Formatos Entregues | Frente(s) de Destino | Função |
|---|---|---|---|---|
| `og-landing-real-olimpico` | 16:9 | PNG mestre, WebP/AVIF (640, 960, 1200, 1440, 1920) | **Frente 3 (Landing)** | Metadata oficial de compartilhamento no WhatsApp e redes |
| `og-moeda-bandeira` | 16:9 | PNG mestre, WebP/AVIF (640, 960, 1200, 1440, 1920) | **Frente 3, 4** | **Composição da Foto Real (Cores corrigidas):** moeda Bandeira à direita, 55% da esquerda livre para `next/og` |
| `og-moeda-direitos-humanos` | 16:9 | PNG mestre, WebP/AVIF (640, 960, 1200, 1440, 1920) | **Frente 3, 4** | **Composição da Foto Real (Cores corrigidas):** moeda DH 1998 à direita, 55% da esquerda livre para `next/og` |
| `og-recibo-de-custodia` | 16:9 | PNG mestre, WebP/AVIF (640, 960, 1200, 1440, 1920) | **Frente 4 (Plataforma)** | Recibo pericial creme sobre ardósia, com versão `-1200` inclusa |

### 1.7 Spots de Onboarding e Estados Vazios (Temas Claro e Escuro)

| Identificador | Proporção | Tema | Frente(s) de Destino | Componente |
|---|---|---|---|---|
| `onboarding-spot-custodia-segura` / `-escuro` | 4:3 | Claro / Escuro | **Frente 3, 4** | Cofre blindado circular com volante pericial |
| `onboarding-spot-recibo-autentico` / `-escuro` | 4:3 | Claro / Escuro | **Frente 3, 4** | Emissão do certificado oficial de custódia |
| `onboarding-spot-negociacao-marketplace` / `-escuro` | 4:3 | Claro / Escuro | **Frente 3, 4** | Negociação instantânea no marketplace |
| `onboarding-spot-retirada-fisica` / `-escuro` | 4:3 | Claro / Escuro | **Frente 3, 4** | Embalagem blindada para resgate físico com seguro |
| `onboarding-spot-recibo-emitido` / `-escuro` | 4:3 | Claro / Escuro | **Frente 4** | Aviso de emissão de recibo com check |
| `onboarding-spot-saque-solicitado` / `-escuro` | 4:3 | Claro / Escuro | **Frente 4** | Envelope de custódia com ampulheta de processamento |
| `onboarding-spot-etiqueta-frete` / `-escuro` | 4:3 | Claro / Escuro | **Frente 4** | Caixa de segurança com etiqueta de remessa e carimbo postal |
| `onboarding-spot-custodia-a-pagar` / `-escuro` | 4:3 | Claro / Escuro | **Frente 4** | Moeda com cadeado aberto e calendário de custódia |
| `onboarding-spot-envio-em-analise` / `-escuro` | 4:3 | Claro / Escuro | **Frente 4** | Lupa pericial examinando moeda na bandeja |
| `onboarding-vazio-sem-ordens` / `-escuro` | 4:3 | Claro / Escuro | **Frente 4** | Estado vazio do livro de ordens (balança equilibrada) |
| `onboarding-vazio-sem-itens` / `-escuro` | 4:3 | Claro / Escuro | **Frente 4** | Estado vazio do cofre individual (gaveta aberta com sinal +) |
| `admin-spot-auditoria-bancada` | 4:3 | Neutro | **Frente 5** | Bancada de auditoria pericial |
| `admin-spot-conciliacao-cofre` | 4:3 | Neutro | **Frente 5** | Conciliação diária de cofre físico e recibos |

### 1.8 Marca e Ícones de Aplicação (`public/visuais/marca/`)

| Identificador | Dimensão | Formato | Uso |
|---|---|---|---|
| `icon-512.png` | 512×512 | PNG com fundo `#081226` e margem 12% | PWA splash icon, manifest.json |
| `icon-192.png` | 192×192 | PNG com fundo `#081226` e margem 12% | PWA home screen icon, manifest.json |
| `icon-180.png` | 180×180 | PNG com fundo `#081226` e margem 12% | Apple touch icon (`apple-touch-icon.png`) |
| `favicon-32.png` | 32×32 | PNG com fundo `#081226` e margem 12% | Favicon desktop navegador |
| `favicon-16.png` | 16×16 | PNG com fundo `#081226` e margem 12% | Favicon abas pequenas |

---

## 2. Conformidade e Segurança

- **100% dos arquivos < 5 MB:** Todo o acervo respeita a regra estrita de peso leve do repositório.
- **Zero Segredos:** Varredura em todos os arquivos de texto (.json, .md, .svg, .sh, .py) sem ocorrências de tokens ou chaves.
- **Fidelidade Numismática:** Regra do Brandbook §8.1 rigorosamente atendida: as faces das moedas derivam diretamente das fotografias reais de alta resolução com conversão BGRA->RGBA, eliminando qualquer inversão de canais ou alucinação de legendas por IA.
