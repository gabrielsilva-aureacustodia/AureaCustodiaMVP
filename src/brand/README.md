# `src/brand/` — a marca Real Olímpico em código (futuro `@real-olimpico/marca`)

Tudo que é **marca** e não é **negócio**: cor, tipografia, espaço, movimento, logo e os padrões visuais. Organizado
para virar um package próprio no fim do polimento, como o `@k2con/ui` do K2CON. Documento de referência:
`docs/marca/BRANDBOOK_REAL_OLIMPICO.md`.

## Arquivos

| Arquivo | O que é | Quem consome |
|---|---|---|
| `tokens.css` | camadas 1 (primitivos `--ro-noite-*`, `--ro-ouro-*`…) e 2 (papéis `--ro-fundo`, `--ro-texto`…) por tema | `app/globals.css` (1.º import) |
| `componentes.css` | padrões `.ro-*`: sobretítulo, selo, aviso, tabela, abas, faixa, cartão de moeda, aro, serrilha, guilhoché | `app/globals.css` (depois de `base.css`) |
| `tokens.ts` | espelho em TypeScript dos primitivos e papéis sólidos + `contraste()` | gráficos, PDF (jsPDF), `next/og`, e-mail |
| `fontes.ts` | Newsreader + Inter via `next/font`; `classesDasFontes` vai no `<html>` | `app/layout.tsx` |
| `componentes/Logo.tsx` | `<LogoMarca>` e `<LogoEmblema>` (só os arquivos oficiais de `public/brand/`) | telas |
| `index.ts` | exporta tokens TS e logo (não exporta fontes: `next/font` exige import direto) | telas |
| `__tests__/tokens.test.ts` | contrato: espelho TS = CSS, AA nos dois temas, nenhum alias legado some | `npm test` |

Componentes React de interface que usam estes tokens (`<Selo>`, `<Aviso>`, `<EstadoVazio>`, `<Esqueleto>`) vivem em
`src/components/ui/` — sobem para o package junto, na extração.

## As três camadas
```
1. primitivos   src/brand/tokens.css :root            único lugar com hex
2. papéis       src/brand/tokens.css body[data-theme]  só var() da camada 1; trocam com o tema
3. aliases      src/styles/tokens.css                  nomes do monolito (--gold, --bg…) → papéis; legado, não crescer
```
CSS novo lê **papel** (`--ro-texto`, `--ro-primaria-texto`), nunca primitivo nem alias.

## Regras do package
1. Não importa nada de `@/domain`, `@/server` nem `@/lib`: número de negócio (taxa, prazo, preço) não é marca.
2. Cor nova entra como primitivo **e** papel, com o par de contraste no teste.
3. `--cert-*` e `--coin-*` (em `src/styles/tokens.css`) não mudam sem motivo escrito: certificado = PDF, moeda = metal.
4. Server Component por padrão; `'use client'` só com estado ou evento.

## Extração para package (proposta P6)
`packages/marca/` com `exports`: `./tokens.css`, `./componentes.css`, `./fontes`, `.` (index); o app passa a importar
`@real-olimpico/marca/tokens.css` em `globals.css` e `@real-olimpico/marca/fontes` no layout; `transpilePackages`.
Nenhum caminho de tela muda além desses imports.
