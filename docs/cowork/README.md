# `docs/cowork/` — o que o Claude Cowork executa no navegador

Esta pasta existe porque parte do que falta na Áurea Custódia **não é código**: é entrar num
painel externo, gerar uma credencial, colar num campo e conferir que pegou. Nenhum agente que
só mexe no repositório faz isso. O Cowork faz, porque opera o navegador com as sessões que o
Gabriel já tem abertas.

```
Criado em:   18/09/2026
Base:        main em 7368d21 (Merge da E4) — 838 testes verdes, typecheck e lint limpos
Repositório: https://github.com/gabrielsilva-aureacustodia/AureaCustodiaMVP (público)
Site:        https://aurea-custodia-mvp.vercel.app
```

## Os documentos

| Arquivo | O que resolve | Pendência | Urgência |
|---|---|---|---|
| [`PROMPT_COWORK.md`](PROMPT_COWORK.md) | **O texto para colar na primeira mensagem do Cowork.** Contexto do projeto, do Git e das regras | — | primeiro de tudo |
| [`01_MERCADO_PAGO_PRODUCAO.md`](01_MERCADO_PAGO_PRODUCAO.md) | Credencial de produção, webhook e as variáveis na Vercel | B-7 | **crítica** |
| [`02_QA_PAINEL_LOGADO.md`](02_QA_PAINEL_LOGADO.md) | Conferência visual das 15 telas do painel e das 4 do site | P-C1-02, P-C3-02, P-M-01 | alta |
| [`03_TAREFAS_CURTAS.md`](03_TAREFAS_CURTAS.md) | Parcelamento, balde de vídeos, gaveta de teste do banco | B-8, P-C3-04, P-C1-04 | média |
| [`04_WHATSAPP_EVOLUTION.md`](04_WHATSAPP_EVOLUTION.md) | Atendimento por WhatsApp em `/admin/cs` | P-C2-02 | baixa |

## A regra da pasta

**Nenhum valor secreto mora aqui.** O repositório é público de propósito durante o MVP. Senha,
credencial e chave ficam em `docs/privado/`, que o `.gitignore` exclui — cada documento diz qual
arquivo abrir e, se o Cowork não alcançar o disco do Gabriel, qual pergunta fazer a ele.

## O que fica fora do Cowork

- **Correios (API CWS).** Depende de contrato comercial assinado, não de um formulário. Roteiro em
  [`../tutoriais/TUTORIAL_CORREIOS_CONTRATO.md`](../tutoriais/TUTORIAL_CORREIOS_CONTRATO.md).
- **Domínio `aureacustodia.com.br`.** É o último passo do projeto e mexe em DNS que sustenta o
  e-mail corporativo no Google Workspace. Não encostar.
- **E8.** É branch de código, para um agente de repositório, não para o navegador — a única que resta.
  E5 e E6 foram canceladas em 18/09/2026.
