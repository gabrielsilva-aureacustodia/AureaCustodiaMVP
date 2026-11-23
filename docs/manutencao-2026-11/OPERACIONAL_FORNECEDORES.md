# Item 5 — Fornecedores de internet e IA: tabela para o Gabriel preencher

**Pedido do Rogério (11/11/2026):** manter em dia os pagamentos dos fornecedores de internet e de IA e enviar as faturas e boletos para ele.
**Quem faz:** o Gabriel. O Controle (chat de manutenção) **não paga nada, não acessa fatura de cobrança e não inventa valor**: esta tabela só organiza o que já está nos documentos do projeto. Toda célula marcada **(Gabriel)** é para você preencher olhando a fatura real; célula "a confirmar" é fato que o projeto não registra.
**Criado em:** 17/11/2026. **Fontes:** `docs/SETUP_CONTAS_E_SERVICOS.md`, `docs/INDICE_VEGA.md` (seção 5), `docs/cowork/04_WHATSAPP_EVOLUTION.md`. Nenhum valor abaixo foi tirado de fatura.

## 1. Tabela dos fornecedores

| # | Fornecedor | Para que serve no Real Olímpico | Onde sai a fatura / boleto | Ciclo e vencimento | Valor (Gabriel) | Quem paga e com qual cartão/conta (Gabriel) |
|---|---|---|---|---|---|---|
| 1 | **Vercel** | Publica o site (realolimpico.com.br) e roda o cron diário | Conta da Vercel, área de cobrança — **(Gabriel confirma o e-mail de cobrança)** | **(Gabriel)** | **(Gabriel)** | **(Gabriel)** |
| 2 | **Supabase** | Banco de dados (Postgres) e login (Supabase Auth, inclusive o Google) | Conta do Supabase, área de cobrança — **(Gabriel confirma)** | **(Gabriel)** | **(Gabriel)** | **(Gabriel)** |
| 3 | **Resend** | E-mails do site (verificação de conta e avisos). A frente C vai aumentar o volume | Conta do Resend — **(Gabriel confirma)**; o documento de setup diz "grátis até 3 mil e-mails por mês" em 02/09/2026, **reconferir no plano atual** | **(Gabriel)** | **(Gabriel)** — a frente C entrega a estimativa de custo mensal dos e-mails de movimentação (item 2 do Rogério) | **(Gabriel)** |
| 4 | **Mercado Pago** | Cobranças por Pix e cartão e, se ligado, o Pix automático dos saques | **Não é fatura**: a taxa é descontada de cada transação. O extrato está no painel do Mercado Pago | A cada transação | Taxa por transação (consultar o painel) | Desconto direto do recebimento |
| 5 | **Correios** (contrato Platinum 1 nº 9912766936, código administrativo 26348179) | Logística reversa: etiqueta de envio do cliente e de retirada | Fatura do contrato dos Correios (fechamento do contrato) — **(Gabriel confirma como chega)** | **(Gabriel)** | **(Gabriel)** — o frete do envio é pago pelo cliente no site, sem margem; a fatura dos Correios é da AUREA CUSTODIA LTDA | **(Gabriel)** |
| 6 | **Registro de domínio e DNS** (realolimpico.com.br e aureacustodia.com.br) | Endereço do site e do e-mail | Provedor onde cada domínio está registrado — **a confirmar** (o histórico do projeto cita HostGator para o DNS de aureacustodia.com.br; **confirmar o de realolimpico.com.br**) | Normalmente anual — **(Gabriel)** | **(Gabriel)** | **(Gabriel)** |
| 7 | **Google Workspace** | E-mail corporativo @aureacustodia.com.br | Console de administração do Google Workspace | Mensal ou anual — **(Gabriel)** | **(Gabriel)** | **(Gabriel)** |
| 8 | **WhatsApp / Evolution API** (se ligado) | Atendimento por WhatsApp em `/admin/cs` | Servidor onde a Evolution roda — o documento fala em Railway ou Fly.io; **a confirmar qual está em uso** | **(Gabriel)** | **(Gabriel)** | **(Gabriel)** |
| 9 | **Meta (anúncios)** | Campanha, Pixel e API de Conversões | Gerenciador de anúncios da Meta (pagamento por consumo) | Por gasto da campanha | **(Gabriel)** | **(Gabriel)** |
| 10 | **GitHub** | Repositório do código (público, de propósito) | Conta `gabrielsilva-aureacustodia` — **a confirmar se há plano pago** | **(Gabriel)** | **(Gabriel)** | **(Gabriel)** |
| 11 | **Provedores de IA** (Claude/Anthropic para o desenvolvimento e outros usados pela equipe) | Desenvolvimento do site com agentes e eventual uso de IA no atendimento | Conta de cada provedor — **(Gabriel lista quais assinaturas existem)** | Mensal ou por consumo — **(Gabriel)** | **(Gabriel)** | **(Gabriel)** |
| 12 | **Certificado digital e-CNPJ A1** | Assina as NFS-e (Sefin Nacional) | Autoridade certificadora que o emitiu | **Anual** — **a data de vencimento do certificado precisa estar aqui** | **(Gabriel)** | **(Gabriel)** |

> O item 12 não estava na lista do Rogério, mas, com o certificado vencido, o site deixa de emitir nota fiscal. Entrou aqui para a data não passar em branco.

## 2. Lista "enviar ao Rogério até o dia X"

Preencher depois de olhar cada fatura. O Controle não tem acesso a esses dados.

| Fornecedor | Vencimento | Enviar ao Rogério até | Enviado em | Pago em |
|---|---|---|---|---|
| (Gabriel) | | | | |

## 3. Como manter isto em dia (sugestão, o Gabriel decide)

1. Um dia fixo por mês (por exemplo, o dia 1) para juntar as faturas dos itens 1 a 11 e mandá-las ao Rogério de uma vez.
2. Os cartões e e-mails de cobrança de cada fornecedor devem ser da empresa, e não de pessoa. A coluna "Quem paga" mostra quem não é.
3. Conferir uma vez por trimestre se o serviço continua necessário (itens 8, 10 e 11 são os que mais costumam ficar esquecidos).
4. Onde a cobrança for por consumo (Resend, Meta, IA), guardar o número do mês anterior ao lado: é o que o Rogério vai querer comparar.

## 4. O que o Controle NÃO fez

- Não consultou nenhuma conta de fornecedor, fatura ou cobrança.
- Não preencheu valor, vencimento ou cartão: nenhum deles está registrado no repositório.
- Não escolheu fornecedor por você (por exemplo, onde a Evolution roda).
