# Tutorial Operacional — Atendimento a Solicitações de Retirada Física

**Para os operadores e sócios da Áurea Custódia.**
Documento da frente do **Agente C** (Blocos 10, 11 e 13).

> **Objetivo:** Orientar passo a passo o que a operação deve fazer desde o momento em que um cliente solicita a retirada física de uma moeda até a confirmação da entrega domiciliar via Correios ou transporte seguro.

---

## 1. Como a solicitação nasce

1. O cliente acessa seu recibo digital em `/recibos/[coinId]`.
2. Clica no botão **"Solicitar retirada"**, seleciona a modalidade (**Comum — R$ 50,00** ou **Segura — R$ 180,00**), preenche o endereço completo de entrega (Trava 2) e dá ciência da cláusula de **moeda equiparável**.
3. Ao confirmar, o sistema realiza **automaticamente e no mesmo instante**:
   - Extingue de forma irreversível o recibo digital (`recibo.status = 'Extinto'`).
   - Debita a taxa de retirada do saldo do cliente com lançamento correspondente no Ledger contábil (`taxa_retirada`).
   - Cria o registro de retirada com status inicial **`paga`** e calcula o prazo limite de **D+30**.
   - Carimba visualmente o certificado na tela e no PDF com `"RECIBO EXTINTO — RETIRADA FÍSICA SOLICITADA"`.

---

## 2. Passo a Passo do Operador (Esteira de Expedição)

### Passo 1: Localizar a solicitação
- **Onde verificar:**
  - Pelo relatório autenticado da API: `GET /api/relatorios/retiradas` (ou na tela de acompanhamento `/retirada` conectado com a conta administradora da custódia).
- **O que conferir:**
  - `Id` da retirada (ex: `RET-RO-000001-1789123456789`).
  - `Coin_Id` e espécie da moeda (ex: *Entrega da Bandeira Olímpica*).
  - Modalidade solicitada (`comum` ou `segura`).
  - Dados congelados de entrega (Nome do destinatário, CPF, endereço completo, telefone).

---

### Passo 2: Emitir a Etiqueta Postal e Declaração de Conteúdo
1. Abra no navegador autenticado a rota da etiqueta:
   ```
   https://aureacustodia.com.br/api/retiradas/etiqueta/<retiradaId>
   ```
   *(Ou clique no botão **"🏷️ Imprimir etiqueta Correios"** no card da retirada na tela `/retirada`)*.
2. A página carregará a etiqueta formatada no padrão oficial dos Correios (100x150 mm) contendo:
   - **Remetente:** AUREA CUSTODIA LTDA — Caixa Postal 7990, CEP 30315-970, Belo Horizonte - MG.
   - **Destinatário:** Dados congelados do cliente.
   - **Chancela:** SEDEX com Aviso de Recebimento (AR) e Declaração de Valor.
   - **Declaração de Conteúdo:** Descrição regulamentar do item com indicação da moeda física e valor segurado de R$ 300,00.
3. Imprima a página (`Ctrl + P` ou botão nativo "Imprimir"):
   - Utilize impressora térmica de etiquetas (formato 100x150 mm) ou imprima em folha sulfite A4 dobrada.

---

### Passo 3: Separação Física no Cofre da Custódia
1. Dirija-se ao cofre de custódia da Central da Áurea.
2. Localize no acervo físico a moeda correspondente à espécie solicitada.
   - **Atenção:** Em conformidade com a cláusula de **acervo equiparável** aceita pelo cliente, a moeda devolvida não precisa ser a exata mesma unidade de entrada, mas deve obrigatoriamente pertencer à **mesma espécie e apresentar o mesmo padrão de conservação**.
3. Acondicione a moeda em envelope lacrado e resistente (envelope bolha ou caixa de segurança dos Correios).
4. Afixe a **Declaração de Conteúdo** dobrada no verso do pacote em envelope plástico transparente ("canguru").
5. Afixe a **Etiqueta de Postagem** na face principal do pacote.

---

### Passo 4: Atualizar status para "Separação"
Para registrar formalmente na trilha de auditoria e manter o cliente informado:
- Execute a Server Action `avancarStatusRetirada(retiradaId, 'separacao')` através do console/painel administrativo.
- **O que se espera ver:** O status da retirada passa a ser `separacao`, visível no card do cliente em `/retirada`.

---

### Passo 5: Postagem nos Correios e Rastreio
1. Leve o pacote à agência dos Correios (ou entregue na coleta de contrato).
2. O atendente dos Correios emitirá o comprovante de postagem com o **código de rastreamento** (formato: 2 letras + 9 dígitos + 'BR', por exemplo: `QB123456789BR`).
3. Imediatamente após a postagem, atualize o status para `postada` informando o código:
   - Execute `avancarStatusRetirada(retiradaId, 'postada', 'QB123456789BR')`.
   - **Regra do sistema:** O avanço para `postada` **obriga** o fornecimento do código de rastreamento válido. Sem ele, a ação é recusada.
- **O que o cliente vê:** O card da retirada exibe o código de rastreamento oficial em verde e o link direto para acompanhamento.

---

### Passo 6: Confirmação de Entrega
1. Quando os Correios confirmarem a entrega domiciliar (ou entrega do comprovante AR assinado):
2. Atualize o status final:
   - Execute `avancarStatusRetirada(retiradaId, 'entregue')`.
3. O protocolo da retirada é dado por concluído com histórico e timestamps auditados.

---

## 3. Em caso de Cancelamento Excepcional
- Caso o cliente desista antes da separação física ou ocorra erro de endereço com retorno da moeda à base:
  - Pode-se transicionar para `cancelada` via `avancarStatusRetirada(retiradaId, 'cancelada')`.
  - **Atenção:** Uma vez cancelada, caso a moeda retorne ao cofre, o operador deve reativar o recibo (`desbloquearRecibo(coinId)`) e proceder ao estorno contábil no painel administrativo se aplicável.
