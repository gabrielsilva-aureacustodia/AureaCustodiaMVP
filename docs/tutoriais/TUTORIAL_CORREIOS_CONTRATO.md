# Tutorial de Contratação e Integração dos Correios

**Para Gabriel Silva e Sócios da Áurea Custódia.**
Documento da frente do **Agente C** (Blocos 11 e 13).

> **Objetivo:** Registrar o status atual da contratação dos Correios, o que já está funcionando no sistema e o passo a passo para contratação do **Contrato Digital Correios Empresas** para postagens faturadas e integração de API.

---

## 1. O que já está formalizado e funcionando

1. **Caixa Postal Oficial (Decisão D-6):**
   - **Contrato:** Termo de Assinatura de Caixa Postal dos Correios nº 11846430 / 11846433.
   - **Titular:** AUREA CUSTODIA LTDA (CNPJ 68.071.452/0001-06).
   - **Caixa Postal:** `7990`
   - **Agência:** AGF Bandeirantes (Av. dos Bandeirantes, Belo Horizonte - MG).
   - **CEP Oficial de Recebimento e Remessa:** `30315-970`.
2. **No Código da Plataforma:**
   - O endereço da Central de Custódia em `src/lib/shipping/correios.ts` e `cep.ts` aponta para a Caixa Postal oficial.
   - Toda etiqueta de expedição gerada em `/api/retiradas/etiqueta/[id]` sai com a Caixa Postal 7990 como remetente.
   - O endereço fictício da Avenida Paulista foi **completamente eliminado**.

---

## 2. Como a operação funciona hoje (Modo Balcão / Etiqueta Pronta)

A plataforma **já emite a etiqueta postal e a declaração de conteúdo completas**:
1. O operador imprime a etiqueta pelo link `/api/retiradas/etiqueta/<retiradaId>`.
2. A etiqueta já conta com a chancela oficial do **SEDEX**, indicação de **Aviso de Recebimento (AR)** e **Declaração de Valor**.
3. A encomenda pode ser levada a qualquer agência dos Correios (preferencialmente a AGF Bandeirantes em BH):
   - O pagamento é feito no balcão (à vista ou via Pix).
   - O atendente bipará a etiqueta, carimbará o AR e emitirá o comprovante com o código de rastreio (ex: `QB123456789BR`).
   - O operador lança o código no sistema via `avancarStatusRetirada(retiradaId, 'postada', 'QB123456789BR')`.

---

## 3. O que falta para faturamento mensal e coleta (Contrato Digital)

Para que a Áurea não precise pagar no balcão a cada envio e tenha acesso a tarifas corporativas e geração de PLP em lote:

### Passo 1: Acesso ao Portal Correios Empresas
1. Acesse o portal oficial: [correios.com.br/para-sua-empresa](https://www.correios.com.br)
2. No menu superior, clique em **"Correios Empresas"** (ou acesse diretamente `cas.correios.com.br`).
3. Faça o cadastro com o Certificado Digital da empresa (e-CNPJ) da **AUREA CUSTODIA LTDA (CNPJ 68.071.452/0001-06)**.

---

### Passo 2: Assinatura do Contrato Digital (Correios Fácil)
1. No painel inicial do Correios Empresas, procure a opção **"Adesão ao Contrato Digital"** (ou "Cartão Correios Fácil").
2. Selecione o pacote inicial: **Bronze** (isento de cota mínima mensal — ideal para o volume de lançamento).
3. Selecione os serviços essenciais para a operação da Áurea:
   - **SEDEX Contrato** (código 03220 ou equivalente atual).
   - **PAC Contrato** (código 03298 ou equivalente atual).
   - **Serviços Adicionais Obrigatórios:**
     - **Aviso de Recebimento (AR digital/físico)**.
     - **Valor Declarado** (cobertura securitária de encomendas).
4. Aceite as condições e assine digitalmente o contrato com o certificado e-CNPJ.
5. Após aprovação (em até 48 horas úteis), os Correios fornecerão:
   - **Número do Contrato**.
   - **Número do Cartão de Postagem**.

---

### Passo 3: Obtenção das Credenciais de API (CWS — Correios Web Services)
Quando o volume justificar a automação da geração de PLP via API:
1. Acesse o portal de desenvolvedores dos Correios: [cws.correios.com.br](https://cws.correios.com.br)
2. Faça login com o **IdCorreios PJ**.
3. No menu lateral, clique em **"Gestão de Acesso a APIs"**.
4. Clique em **"Gerar Código de Acesso"** (este código funciona como a chave de API da empresa).
5. As credenciais resultantes devem ser salvas nas variáveis de ambiente na Vercel:
   ```env
   CORREIOS_USUARIO="68071452000106"
   CORREIOS_CARTAO_POSTAGEM="007xxxxxxx"
   CORREIOS_CODIGO_ACESSO="xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   ```

---

## 4. Checklist de Conferência

| Item | Situação | Responsável |
|---|---|---|
| Caixa Postal oficial 7990 ativa em BH | ✅ Concluído | Gabriel |
| Etiquetas e remetente apontando para Caixa Postal 7990 | ✅ Concluído no código | Agente C |
| Emissão de etiqueta e declaração de valor na plataforma | ✅ Concluído no código | Agente C |
| Assinatura do Contrato Digital Correios Empresas (PJ) | 🟡 Pendente comercial | Gabriel |
| Obtenção de Cartão de Postagem e Token CWS | 🟡 Próxima fase (volume) | Gabriel |
