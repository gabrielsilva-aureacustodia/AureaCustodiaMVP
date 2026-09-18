# 03 · Tarefas curtas — parcelamento, balde de vídeos, gaveta de teste

```
Pendências:  B-8, P-C3-04, P-C1-04
Executor:    Claude Cowork, no navegador
Tempo:       5 a 15 minutos cada
```

Três tarefas independentes. Faça na ordem que quiser. Cada uma diz logo no começo se depende de
uma decisão do Gabriel.

---

# Tarefa A · Parcelamento sem acréscimo (B-8)

> ⛔ **DEPENDE DE DECISÃO. Não execute sem resposta.** Antes de qualquer clique, pergunte:
>
> *Decisão B-8: hoje, no padrão do Mercado Pago, **o comprador paga os juros** do parcelamento, e
> o parcelamento em até 12x já funciona assim, sem eu mexer em nada. A alternativa é a **Áurea
> absorver os juros** — o cliente vê "sem acréscimo" e a empresa recebe o valor menos a tarifa e
> a taxa de parcelamento. Quer que eu ligue a absorção, ou deixo como está?*
>
> **Se a resposta for "deixa como está":** não faça nada. Anote a decisão no relatório e pule
> para a Tarefa B. Isso já é uma entrega — a decisão fica registrada.

**Se a resposta for ligar a absorção:**

**A.1** Abra `https://www.mercadopago.com.br/costs-section` (seção **Taxas e parcelas**). Se o
endereço tiver mudado, procure no menu da conta por **Taxas** ou **Custos**.

**A.2** No topo, escolha a ferramenta **Checkout**.

**A.3** Clique em **Parcelamento** e depois em **Oferecer**.

**A.4** Ligue **Oferecer parcelado vendedor** e escolha o máximo de parcelas:

- **12x** — é o que o plano anual de custódia usa.
- **2x** — é o que a retirada segura usa.

Se a tela só aceitar um número, escolha **12**.

**A.5 Conferir:** no checkout de um plano anual, as parcelas aparecem **sem acréscimo**.

**A.6** Avise o Gabriel, com estas palavras: *Ligado. A partir de agora a Áurea recebe o valor
menos a tarifa e menos a taxa de parcelamento, que cresce com o número de parcelas que o cliente
escolher.*

---

# Tarefa B · O balde dos vídeos da bancada (P-C3-04)

**Para quê:** os vídeos da análise de cada moeda são guardados no Supabase. A variável
`SUPABASE_STORAGE_BUCKET` já existe na Vercel de produção — **falta confirmar que o balde com
esse nome existe de verdade**. Se não existir, a bancada analisa e emite recibo normalmente, mas o
vídeo não sobe e o cliente não consegue reassistir (RA-23).

**B.1** Abra `https://supabase.com/dashboard/project/vjbqikfamqdttbmaqrxf/storage/buckets`.

> 🔴 **PONTO DE PAUSA HUMANA.** Se pedir login, peça ao Gabriel. Se o Supabase mandar confirmação
> por e-mail ou celular, peça que ele aprove.

**B.2** Procure um balde chamado **`analises`**.

- **Se existir:** anote se está marcado como público ou privado e **não mude nada**. Tarefa
  concluída.
- **Se NÃO existir:** clique em **New bucket**, nome exatamente `analises`, deixe **privado** (não
  marque "Public bucket") e clique em **Create**.

> **Por que privado.** O vídeo mostra a moeda de um cliente identificado. Balde público deixaria
> qualquer pessoa com a URL assistir. O código assina cada leitura com a chave de serviço — ele já
> espera um balde privado.

**B.3 Conferir:** o balde `analises` aparece na lista, privado.

---

# Tarefa C · Apagar a gaveta de teste do banco (P-C1-04)

> ⛔ **DEPENDE DE CONFIRMAÇÃO. É uma remoção, e remoção não se faz por conta própria.**

**Contexto para explicar ao Gabriel:** em 14/09 foi criado um schema chamado `aurea_local_admin`
no banco, só para conferir o painel sem tocar no banco de verdade. Tem só dado de demonstração.
Apagar é opcional e não afeta a produção.

**C.1** Pergunte: *Posso apagar o schema de teste `aurea_local_admin` do banco? Ele tem só dado de
demonstração de 14/09. O banco da plataforma é o schema `aurea` e não vou encostar nele.*

**Se a resposta não for um sim claro, não execute.**

**C.2** Com o sim, abra `https://supabase.com/dashboard/project/vjbqikfamqdttbmaqrxf/sql`.

**C.3** Clique em **New query**, cole **exatamente** isto e clique em **Run**:

```sql
DROP SCHEMA aurea_local_admin CASCADE;
```

> 🔴 **Leia o nome duas vezes antes de rodar.** `aurea_local_admin`. **Não** `aurea`. O schema
> `aurea` é o banco da plataforma inteira — apagá-lo destrói contas, moedas, negociações, o
> livro-razão e a trilha de auditoria. Se o que estiver escrito na tela não for exatamente
> `aurea_local_admin`, **não clique em Run**.

**C.4 Conferir:** abra **Database → Schemas**. `aurea_local_admin` sumiu; `aurea` e `public`
continuam lá.
