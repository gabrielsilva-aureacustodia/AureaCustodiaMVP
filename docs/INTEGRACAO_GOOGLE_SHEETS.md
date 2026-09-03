# Integração com Google Sheets e Excel — o que o Gabriel configura

```
Escrito em: 03/09/2026 · frente B, módulos M4 e M7
Código:     src/server/relatorios/ · src/app/api/relatorios/
Contrato:   docs/API_RELATORIOS.md
```

> **Tudo o que é código está pronto.** O que resta são cadastros e variáveis de ambiente —
> nada aqui exige mexer no repositório. Dois caminhos, do mais simples ao mais completo.

---

## Caminho 1 — a planilha PUXA da plataforma (5 minutos, sem Google Cloud)

Serve para acompanhar: a planilha lê os relatórios de hora em hora, sozinha.

### 1.1 Criar o token

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

### 1.2 Definir na Vercel

Settings → Environment Variables:

| Variável | Valor |
|---|---|
| `AUREA_RELATORIOS_TOKEN` | o token gerado |
| `AUREA_ADMIN_EMAILS` | (opcional) e-mails dos sócios e do contador, separados por vírgula. Sem ela, valem as 7 contas do seed |

**Redeploy** depois — variável só entra no build seguinte.

### 1.3 Colar numa célula do Google Sheets

```
=IMPORTDATA("https://aurea-custodia-mvp.vercel.app/api/relatorios/dre.csv?ano=2026&token=SEU_TOKEN")
```

Uma aba por relatório: troque `dre` por `analise`, `ledger`, `negociacoes`, `extratos`,
`estoque`, `contas`, `custodia`, `auditoria`. Para um mês: `&mes=8`. Para um trimestre:
`&trimestre=3`.

O Sheets atualiza `IMPORTDATA` a cada hora, aproximadamente. Para forçar: File → Settings →
Calculation → Recalculation.

### 1.4 No Excel

**Dados → Obter dados → Da Web**, colando a mesma URL (com `token=`). O Excel pergunta o
separador; escolha ponto e vírgula. Depois: **Dados → Atualizar tudo**.

> ⚠️ O token fica escrito na fórmula. Quem abre a planilha vê o token, e o token lê **todos**
> os relatórios, inclusive os extratos de todas as contas. Compartilhe a planilha só com quem
> pode ver isso, e troque o token (`AUREA_RELATORIOS_TOKEN` + redeploy) ao trocar de contador.
> Registrado como RA-16.b.

---

## Caminho 2 — a plataforma ESCREVE na planilha (20 minutos, conta de serviço)

Serve para o contador trabalhar: ele cria abas próprias com fórmulas, e a plataforma só
reescreve as abas `aurea_*`. Um clique em "Enviar ao Google Sheets agora" na tela
`/relatorios` — ou um POST agendado — atualiza tudo.

### 2.1 Criar a conta de serviço no Google Cloud

1. https://console.cloud.google.com → um projeto (pode ser "aurea-relatorios").
2. **APIs e serviços → Biblioteca** → ativar **Google Sheets API**.
3. **IAM e administrador → Contas de serviço → Criar**. Nome: `aurea-sheets`. Não precisa de
   papel no projeto.
4. Na conta criada: **Chaves → Adicionar chave → JSON**. Baixa um arquivo `.json`.

Do arquivo, dois campos importam: `client_email` e `private_key`.

### 2.2 Compartilhar a planilha com a conta de serviço

Abra a planilha de destino no Google Sheets → **Compartilhar** → cole o `client_email`
(termina em `.iam.gserviceaccount.com`) com permissão de **Editor**.

O id da planilha é a parte da URL entre `/d/` e `/edit`:

```
https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit
                                       └──────── este trecho ────────┘
```

### 2.3 Definir na Vercel

| Variável | Valor |
|---|---|
| `GOOGLE_SHEETS_SPREADSHEET_ID` | o id da URL |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` do JSON |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | `private_key` do JSON, **inteira**, inclusive `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`. A Vercel aceita colar com as quebras de linha; se colar numa linha só, os `\n` literais são convertidos pelo código |

**Redeploy.**

### 2.4 Testar

Entrar em `/relatorios` → aba **Integração**. Os dois selos precisam estar verdes. Clicar em
**Enviar ao Google Sheets agora**. O toast diz quantas abas e linhas foram gravadas; a
planilha ganha as abas `aurea_dre`, `aurea_ledger`, `aurea_analise`…

Se falhar, o toast traz a resposta da API do Google inteira. Os dois erros comuns:

| Mensagem | Causa |
|---|---|
| `403 … The caller does not have permission` | A planilha não foi compartilhada com o `client_email` como Editor (2.2) |
| `invalid_grant` no OAuth | Chave colada incompleta, ou relógio do servidor muito fora — no primeiro caso, recole do JSON |

### 2.5 Agendar (opcional)

Duas formas, sem código novo:

- **Apps Script na própria planilha** (Extensões → Apps Script), com gatilho por tempo:

  ```javascript
  function atualizarAurea() {
    UrlFetchApp.fetch('https://aurea-custodia-mvp.vercel.app/api/relatorios/sheets?ano=2026', {
      method: 'post',
      headers: { Authorization: 'Bearer ' + PropertiesService.getScriptProperties().getProperty('AUREA_TOKEN') },
    })
  }
  ```

  Guarde o token em **Configurações do projeto → Propriedades do script**, não no código.

- **Cron da Vercel** (plano Pro para mais de uma execução por dia): acrescentar em
  `vercel.json` um item `{ "path": "/api/relatorios/sheets", "schedule": "0 6 * * *" }`. A
  rota aceita o token em `Authorization: Bearer`, que a Vercel manda como `CRON_SECRET` —
  portanto, para o cron, **defina `AUREA_RELATORIOS_TOKEN` com o mesmo valor de `CRON_SECRET`**
  ou acrescente o token em `?token=` no `path`.

---

## O que o contador recebe

| Aba / relatório | O que tem |
|---|---|
| `aurea_dre` | A DRE do período: receita bruta (comissões, custódia, outras), deduções (ISS, PIS, COFINS), receita líquida, despesas por conta, resultado operacional, base presumida, IRPJ, adicional, CSLL, resultado líquido. Cada linha diz de onde veio |
| `aurea_analise` | Margens, carga tributária, negociações, volume, comissão média, receita por moeda e por mês |
| `aurea_ledger` | Todo lançamento, com saldo após e hash encadeado |
| `aurea_lancamentos-manuais` | O que ele mesmo lançou pela tela (aluguel, pessoal, seguro) |
| `aurea_parametros` | As alíquotas em vigor — e as que faltam |
| `aurea_contas` | Saldo × soma do ledger por conta (diferença tem de ser zero) |
| `aurea_extratos`, `aurea_negociacoes`, `aurea_custodia`, `aurea_estoque`, `aurea_auditoria`, `aurea_exportacoes` | O detalhe |

**O que ele precisa fazer uma vez:** preencher as alíquotas na aba **Alíquotas** da tela
`/relatorios` (presunção de lucro, IRPJ, adicional e limite, CSLL, PIS, COFINS, ISS). Até lá,
a DRE mostra as linhas de imposto zeradas e a pendência escrita — de propósito, porque
alíquota errada em produção vira passivo fiscal (ver `docs/EXECUCAO_POR_MODULO.md`, M7).

---

## Para o Rogério

Há dois jeitos de a planilha do contador conversar com a plataforma. No primeiro, a planilha
vai buscar os números sozinha, com um endereço colado numa célula — é o mais simples e já
funciona com uma variável na Vercel. No segundo, a plataforma escreve na planilha quando
alguém aperta um botão — precisa de um "usuário robô" do Google com permissão de editar a
planilha. Nos dois casos os números são os mesmos da tela.
