# Execução — Redesign da Landing Page (Real Olímpico)

**Data:** 01/10/2026  
**Branch:** `landing/redesign-real-olimpico`  
**Base metodológica:** `C:\dev\aprendizado_frontend\` (Guias 02, 03, 04, 05, 07, 11, 16, 24, 28) e `CLAUDE.md`.

---

## 1. O que foi construído

Reescrita completa dos 5 blocos da landing page institucional do Real Olímpico (`src/components/landing/LandingPage.tsx`) com nova identidade visual refinada em `src/styles/landing.css`:

1. **Bloco 1 (Hero):**
   - Título: *"Transforme seus itens de colecionador em liquidez"*
   - Parágrafo: *"É possível ganhar dinheiro com moedas de colecionador e itens similares, sem depender do mercado paralelo. Você pode proteger seus itens de qualquer calamidade e ainda ganhar dinheiro com eles, sem nunca colocar nas mãos de estranhos."*
   - Composição visual à direita: fotos reais das duas moedas (*Entrega da Bandeira Olímpica 2012* e *Direitos Humanos 1998*), recortadas, sem fundo, dispostas lado a lado em diagonal com aura metálica sutil e sombras realistas de profundidade.

2. **Bloco 2 (Novo — Reserva de Valor):**
   - Título: *"Um novo conceito de reserva de valor"*
   - Parágrafo: *"Imagine ter uma reserva como ouro ou prata, mas sem precisar investir valores absurdos ou pagar caro na custódia, usando apenas seus itens de colecionador. Imagine ainda, com itens de alto valor que você já tem em casa, crescer seu patrimônio, sem precisar entender de jargões técnicos. Essa é a nossa proposta, através de um marketplace simples e seguro, começando pelas moedas de colecionador, pelas quais temos tanto carinho."*
   - Card amplo com badge *"Patrimônio Tangível"*, acento dourado superior e tipografia balanceada.

3. **Bloco 3 (Processo — Substitui "Do recebimento à negociação"):**
   - Título: *"Sua coleção protegida, registrada e pronta para negociar."*
   - Três cards com ícones personalizados (`src/components/landing/LandingIcons.tsx`):
     - **Custódia Segura:** *"O item é recebido, avaliado e mantido em acervo custodiado, em cofre especializado."*
     - **Recibo lastreado:** *"Cada item aprovado recebe um comprovante digital ligado ao registro de custódia."*
     - **Marketplace:** *"Colecionadores negociam itens elegíveis dentro da plataforma, ganhando dinheiro sobre a valorização e negociação."*

4. **Bloco 4 (Nossa história — "De colecionador para colecionador"):**
   - Conteúdo integral e histórico de Rogério Siqueira preservado.
   - Reorganização em grade responsiva de 2 cartões com ícones temáticos dedicados (*O desafio cotidiano* e *A solução estruturada*).

5. **Bloco 5 (Segurança Factual — "Acervo físico em cofre especializado"):**
   - Parágrafo factual sem promessa de retorno: *"Nós asseguramos a sua moeda com os mesmos cofres, carros fortes e mecanismos de segurança que bancos como o Sicoob utilizam. Seus itens não serão tocados, após a avaliação, nem mesmo por nós."*
   - Três pilares de segurança bancária com ícones: *Cofres especializados*, *Carros fortes* e *Itens intocados*.

6. **Posicionamento Institucional & Rodapé:**
   - Citação institucional de conformidade jurídica preservada integralmente.
   - Rodapé com razão social *AUREA CUSTODIA LTDA* (CNPJ 68.071.452/0001-06) e navegação legal.

---

## 2. Metodologias aplicadas e conformidade

| Técnica | Guia de Origem | Custo Medido | Por que serve ao projeto |
|---|---|---|---|
| **Design Tokens & Identidade** | Guia 02 | 0 KB | Preservação rígida de `--gold` (`#c9a24b`) e todas as variáveis `--navy*`. |
| **Tipografia Fluida** | Guia 03 | 0 KB (CSS) | `clamp()` com intercepto em `rem` + `vw` e `text-wrap: balance/pretty`; garante zoom acessível até 200% sem quebra. |
| **Layout Intrínseco & Grid** | Guias 04 e 05 | 0 KB (CSS) | `auto-fit` e `minmax(0, 1fr)` sem quebras artificiais de breakpoint; zero overflow horizontal em 320px, 375px e 1440px. |
| **Hero em Camadas** | Guia 11 | ~0 KB adicionais | Apresentação numismática em camadas (glow radial + fotos das moedas reais + badges de identificação). |
| **Scroll Reveal Progressivo** | Guia 07 | ~0.4 KB JS | IntersectionObserver nativo único (`once: true`, `rootMargin: -40px`); progressive enhancement total (visível com JS desativado) e respeito a `prefers-reduced-motion`. |
| **Acessibilidade & Alvos de Toque** | Guia 16 | 0 KB | Alvos mínimos de 44px em botões/links e `aria-hidden="true"` em todos os SVGs decorativos. |

### Técnicas descartadas e justificativa:
- **WebGL / Three.js / Canvas pesado (Guias 10 e 12):** Descartado para manter foco institucional, sobriedade bancária/numismática e First Load JS ultra-baixo (~112 kB).
- **Smooth Scroll com bibliotecas (Lenis / Motion - Guia 08):** Descartado; o CSS puro atende com excelência e menor custo computacional.
- **Preloaders ou cursores customizados (Guia 24):** Anti-padrões explicitamente evitados.

---

## 3. Verificação e Testes

- `npm run typecheck`: **Aprovado (0 erros)**
- `npm run lint`: **Aprovado (0 erros, 15 warnings pré-existentes de regras legadas)**
- `npm run build`: **Aprovado (30/30 rotas estáticas e dinâmicas geradas com sucesso)**
- Teste visual:
  - **Desktop (1440px):** Composição diagonal nítida das moedas, halo dourado, cartões com bordas e espaçamento balanceado.
  - **Mobile (375px e 320px):** Redução proporcional das moedas e tipografia, empilhamento fluído de cartões e ausência de rolagem horizontal.
