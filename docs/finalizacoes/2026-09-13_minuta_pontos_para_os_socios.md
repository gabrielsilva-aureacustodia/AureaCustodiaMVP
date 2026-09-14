# Minuta dos Termos de Uso v.1 — o que precisa de resposta dos sócios

Montado em 13/09/2026 a partir da minuta enviada pelo Felipe Moraes e dos 34 comentários
que ele deixou no Word (`2026-09-13_minuta_comentarios_do_advogado.md`, nesta pasta).

Nada aqui trava a publicação. O Agente A publica o texto do advogado como está (sub-branch
A3) e usa as sugestões da seção A enquanto as respostas não chegam. Trocar um valor depois é
editar uma constante e publicar nova versão do documento.

---

## A. Os quatro valores que ficaram em branco no texto

| # | Cláusula | O que falta | O que o sistema faz hoje | Sugestão até a resposta |
|---|---|---|---|---|
| 1 | Topo | Data de entrada em vigor | — | A data em que A3 for publicada em produção |
| 2 | 7.2.5 | Prazo para validar a custódia e emitir o Recibo de Unicidade, contado do recebimento e da aprovação | O recibo nasce no mesmo instante em que a bancada fecha a análise | até 2 (dois) dias úteis |
| 3 | 7.3.3 | Prazo para o vendedor receber o valor da venda | O saldo do vendedor é creditado no mesmo instante da negociação | até 1 (uma) hora |
| 4 | 7.6.2 | Prazo para o depósito virar saldo disponível | Crédito automático quando o Mercado Pago confirma. Pix leva segundos; cartão pode ficar em análise antifraude | até 2 (dois) dias úteis |

---

## B. Perguntas diretas do advogado

| # | Comentário | Pergunta | O que o sistema sustenta hoje |
|---|---|---|---|
| 1 | 5 | Quais meios de comunicação serão usados: e-mail, SMS, WhatsApp, ligação, Plataforma? | E-mail e Plataforma existem. WhatsApp chega com o CS do Admin (C2). SMS e ligação não existem |
| 2 | 4 | Qual é o SAC? | Não existe canal ainda. A3 cria a página `/suporte`; faltam o número de WhatsApp e o e-mail oficiais |
| 3 | 3, 6, 7, 11, 16, 19–21, 23, 25, 26 | A Tabela de Taxas vai existir e ter link? | Passa a existir em `/taxas` (A3), com link em todas as menções |
| 4 | 9 | Pedir cópia de documento de identidade no cadastro? | Decisão anterior: não pedir. O sistema não coleta documento — responder ao advogado para excluir a alínea 6.4(b) |
| 5 | 12 | O nome do recibo será "Recibo de Unicidade"? | A interface hoje diz "Recibo de custódia". Decidir se a interface passa a dizer "Recibo de Unicidade" |
| 6 | 18 | O valor da venda cai no saldo ou direto na conta bancária? | Sempre no saldo. Conta bancária só por saque |
| 7 | 22 | Retirada em até 30 dias **úteis** para o cliente **receber**? | Decisão D-2 (11/09): até 30 dias para preparar e postar, com o trânsito dos Correios por fora. O texto do advogado inclui o trânsito e fala em dias úteis — hoje as telas dizem outra coisa |
| 8 | 27 | Manter a alínea 12.1(e), que diz que ninguém tem garantia sobre a conta? | O roadmap prevê o recibo como garantia, e um dos blocos de aceite do sistema fala em moeda como garantia. Os dois conflitam com a alínea |
| 9 | 28 | O sistema deve barrar dados bancários de outra titularidade? | Não barra. Seria trava, e ficou fora das branches pela decisão de 13/09. Decisão de vocês |
| 10 | 29 | Vai haver Política de Privacidade formal? | Existe um rascunho interno em `/privacidade`. O advogado recomenda uma política formal |
| 11 | 31, 34 | Assinatura da cláusula de arbitragem com certificado digital (gov.br ou outro) | A3 entrega assinatura específica por caixa própria + nome completo digitado, com registro de prova. Certificado digital exige contratar um provedor de assinatura eletrônica |
| 12 | 15 | Oferecer mais de uma opção de envio para atribuir o risco do transporte ao cliente | O envio já oferece PAC e SEDEX, à escolha do cliente. B2 passa a gravar a escolha |
| 13 | 2, 10 | Cláusulas de LGPD e anticorrupção; Política de Compliance | Tarefa do jurídico |

---

## C. Pontos de texto para devolver ao advogado

A minuta é publicada como veio. Estes pontos voltam para ele revisar — nenhum foi alterado.

1. **Referências cruzadas no capítulo de conflitos.** O texto fala em "Cláusula 13.1" e
   "13.2", mas a Resolução de Conflitos é o capítulo 14; o 13 é Proteção de Dados.
2. **"Ativos mantidos em sua Conta Áurea"** (12.1.d). É uma das palavras que o próprio
   jurídico retirou do vocabulário da plataforma na reunião de 09/09.
3. **"Código Criptografado"** (7.3.2, 7.4.2, 7.5.2). O recibo é identificado por um hash
   SHA-256 encadeado ao anterior. Confirmar se o termo é esse.
4. **Definição de "Recibo de Unicidade".** Diz que o código é gerado "com emprego de
   Inteligência Artificial" — o sistema não usa IA para isso; é o hash SHA-256 da análise.
   Diz também que é "gerado a partir do envio"; ele nasce na aprovação da análise.
5. **Força Maior** (16.5). A frase está sem verbo: "A Áurea por quaisquer atrasos ou falhas
   decorrentes de evento de Força Maior." Falta "não se responsabiliza".
6. **Numeração do item 1.2.** Mistura alínea "a)" com subitem "1.2.2".
