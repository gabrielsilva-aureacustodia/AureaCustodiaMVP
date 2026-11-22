# A09 — proposta de texto do banner de cookies (NÃO LIGADA)

```
Estado: SÓ TEXTO PROPOSTO. Nada foi implementado nem ligado. Decisão do Gabriel (e jurídico).
Fato do código: o Meta Pixel carrega em páginas públicas sem consentimento (RA-61 em RISCOS_ASSUMIDOS.md) e grava o cookie `_fbp`.
```

## Decisões que ele precisa tomar
1. Banner de consentimento antes de carregar o Pixel (padrão LGPD/ANPD para cookie de publicidade), ou manter como está registrado no RA-61?
2. Se houver banner: Pixel só carrega **depois** do "Aceitar" (o componente `MetaPixel` já aceita `pixelId = null` para não carregar nada — o gancho existe).
3. Citar a Meta na Política de Privacidade (texto jurídico: versão nova do documento).

## Texto proposto — faixa (rodapé da página)

> **Cookies no Real Olímpico.** Usamos cookies essenciais para o site funcionar e, com a sua permissão, cookies de publicidade da Meta (Facebook e Instagram) para medir se os nossos anúncios chegam a quem se interessa. Você pode recusar sem perder nada do serviço. [Aceitar] [Recusar] [Saiba mais]

## Texto proposto — "Saiba mais" / trecho da Política de Privacidade

> **Cookies e rastreamento.** O Real Olímpico usa (i) cookies essenciais, necessários para entrar na sua conta e manter a sessão segura; e (ii) mediante consentimento, o Pixel da Meta Platforms, que grava o cookie `_fbp` para medir a efetividade de campanhas e enviar eventos de conversão (como "cadastro concluído"). Não enviamos à Meta a sua senha, CPF, dados bancários ou o conteúdo da sua conta. Você pode retirar o consentimento a qualquer momento nas configurações do navegador ou pelo contato do encarregado indicado nesta Política.

(Pendente do jurídico: nome e contato do encarregado, base legal exata, prazo de retenção do `_fbp`.)

## Para ligar, quando decidido
Banner client-only que grava a escolha em localStorage; `MetaPixel` recebe `pixelId` só se a escolha for "aceito"; a API de Conversões do servidor (`src/server/meta/`) também deve respeitar a escolha — **conferir com o Gabriel** antes, porque mexe na campanha que está medida e comprovada (memória meta-pixel-capi).
