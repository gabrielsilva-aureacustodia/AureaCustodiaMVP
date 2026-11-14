# Pixel da Meta no Real Olímpico

Criado em 14/11/2026. Registro de risco: **RA-61** (`RISCOS_ASSUMIDOS.md`). Atalhos: `src/lib/meta/ATALHOS.md`.

## Para que serve (versão para o Rogério)

A campanha de **tráfego para o site** leva gente ao site. O Pixel é um "contador" que a Meta nos empresta: ele avisa a
Meta quando alguém entra, clica em "Criar conta" e **termina o cadastro**. Com isso a Meta (1) mostra no relatório
quantos cadastros cada anúncio trouxe e (2) aprende a mostrar o anúncio para gente parecida com quem se cadastrou.
Sem o evento de cadastro, a campanha só enxerga cliques.

## Como funciona (duas pontas, um evento)

| Ponta | Onde está | Cobre |
|---|---|---|
| **Pixel** (navegador) | `src/components/meta/MetaPixel.tsx`, em `src/app/layout.tsx` | PageView, clique em "Criar conta", cadastro |
| **API de Conversões** (servidor) | `src/server/meta/` | o mesmo cadastro, mesmo com bloqueador de anúncio ou aba fechada |

O evento de cadastro sai **pelos dois** com o **mesmo ID**; a Meta junta e conta **um**. O ID nasce no servidor.

## Eventos

| Evento | Quando dispara | Tipo |
|---|---|---|
| `PageView` | toda página, inclusive navegação interna | padrão |
| `CliqueCriarConta` | clique em qualquer link para `/cadastrar` (`origem` = página do clique) | personalizado |
| **`CompleteRegistration`** | conta nova: e-mail (no envio do formulário) ou Google (1ª vez que vira conta). `status: true`, `content_name`: `cadastro_email` ou `cadastro_google` | padrão — **o da campanha** |

Regras: e-mail já cadastrado **não** dispara; confirmar o e-mail depois **não** dispara de novo; nenhum dado de dinheiro,
saldo ou moeda é enviado.

## Variáveis de ambiente (Vercel → Settings → Environment Variables, ambiente Production)

| Variável | O que é | Segredo? |
|---|---|---|
| `META_PIXEL_ID` | ID do conjunto de dados (só dígitos) | não |
| `META_CAPI_ACCESS_TOKEN` | chave da API de Conversões | **sim — marcar Sensitive** |
| `META_TEST_EVENT_CODE` | só para testar; remover depois | não |
| `META_GRAPH_VERSION` | opcional; padrão `v27.0` | não |

O ID é lido no servidor (não precisa do prefixo `NEXT_PUBLIC_`), mas as páginas públicas são geradas no build: **depois
de criar ou trocar `META_PIXEL_ID`, faça um novo deploy**.

## Como criar o Pixel (conta de anúncios Real Olimpico, 24176712608600366)

1. Gerenciador de Eventos → **Conectar dados** → **Web** → **Meta Pixel** → nome "Real Olímpico".
2. Quando perguntar como instalar, escolher **instalar o código manualmente** (já está no site; não colar o código dele).
3. Copiar o **ID** → `META_PIXEL_ID`.
4. Pixel → **Configurações** → **API de Conversões** → **Gerar chave de acesso** → `META_CAPI_ACCESS_TOKEN`.
5. Pixel → **Configurações** → ligar **Correspondência avançada automática**.
6. Domínio: Business Manager → Segurança da marca → **Domínios** → verificar `realolimpico.com.br` (a Meta exige para
   priorizar eventos).

## Como testar

1. Aba **Testar eventos** do Pixel → copiar o código `TEST...` → `META_TEST_EVENT_CODE` (Preview ou local).
2. Aba "Navegador": abrir o site com a URL informada → ver `PageView`.
3. Criar uma conta de teste → ver `CompleteRegistration` aparecer **uma vez**, com origem "Navegador e Servidor"
   (é a prova da deduplicação).
4. Remover `META_TEST_EVENT_CODE` e fazer deploy.

## Na campanha "Tráfego para Cadastro"

Objetivo de **Tráfego** otimiza clique/visita. Para otimizar **cadastro**, a campanha deve ter objetivo **Vendas/Leads**
(ou conversão no conjunto de anúncios) com o evento **Cadastro concluído** (`CompleteRegistration`). Isso só é possível
depois de o Pixel receber o evento ao menos uma vez.
