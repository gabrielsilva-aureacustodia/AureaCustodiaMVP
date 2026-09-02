# `docs/` — a documentação viva do projeto

## Como está organizado

```
docs/
├── EXECUCAO_POR_MODULO.md           O passo a passo técnico de cada fase (M1 a M7)
├── SETUP_CONTAS_E_SERVICOS.md       O que o Gabriel precisa cadastrar, sem jargão
├── SETUP_SUPABASE_PASSO_A_PASSO.md  O detalhe do Supabase — escolhas irreversíveis
├── FRENTES_PARALELAS.md            Quem edita o quê, com três agentes em paralelo
├── prompts/                        Mensagens de abertura de cada frente
├── EXECUCAO_POS_FRENTES_PARALELAS.md  Auditoria das três branches e o plano do que falta
├── EXECUCAO_BRANCH_C_O_QUE_FALTA.md   Frente C em detalhe: correções, integração e tutoriais
├── EXECUCAO_BRANCH_A_O_QUE_FALTA.md   Frente A: relatório simples do que falta, com mensagem para o agente
├── ARQUITETURA_E_PASTAS.md          O mapa do repositório e o contrato entre as pastas
├── CATALOGO_DE_FEATURES.md          O que foi pedido, o que existe, o que falta
├── DECISOES_D1_D9_E_PLANO.md        A ata das decisões e o plano que sai delas
├── MUDANCAS_MERCADO_MULTI_ATIVO.md  Registro técnico da entrega do mercado multi-ativo
├── PLANO_EXECUCAO_CRITICAL_DEBUGS.md  O plano dos Critical Debugs, verificado
├── GUIA_CLAUDE_CODE_AUREA.md        Onboarding de quem entra no projeto
├── PRE_LANCAMENTO_CLIENTES_REAIS.md O que falta antes do primeiro cliente real
│
├── diario/                          Documentos vivos, reescritos por leitura
│   ├── RITUAL_DE_SESSAO.md            Abertura e fechamento de toda sessão (detalhado)
│   ├── RITUAL_DE_SESSAO_RESUMO.md     O mesmo, só os comandos
│   ├── CRITICAL_DEBUGS.md             Defeitos abertos, com teste de aceite
│   ├── VERSION_COMPARISON_DAILY.md    APPEND-ONLY — a memória longa do projeto
│   ├── VERSION_COMPARISON_RESUMO.md   A versão curta da anterior
│   ├── FRENTES_DE_TRABALHO.md         As cinco frentes e seus critérios de aceite
│   ├── LEITURA_REPOSITORIO_*.md       Leituras do repositório
│   ├── PADRAO_OPERACIONAL_DIARIO.md   O processo diário
│   └── EXPLICACAO_DO_PROCESSO_DIARIO.md
│
└── referencia/                      Material de consulta, muda pouco
    ├── CONTAS_DE_TESTE.md             As 7 contas e suas senhas
    ├── QUESTIONARIO_D7_ESTACAO.md     As cinco decisões da estação de validação
    └── AUREA_DOCUMENTO_EXPLICATIVO.docx
```

## Os três tipos de documento, e a regra de cada um

### Vivos — `diario/`

Reescritos a cada leitura do repositório. **Item resolvido sai do `CRITICAL_DEBUGS.md`**; o
registro de que existiu fica no `VERSION_COMPARISON_DAILY.md`.

### Append-only — `diario/VERSION_COMPARISON_DAILY.md`

**Nunca se edita entrada anterior.** Correção se faz com entrada nova apontando para a
antiga. É a memória longa: um registro alterável não vale como prova.

### Permanentes — a raiz de `docs/` e `referencia/`

Mudam quando o assunto muda, não por rotina.

## Por onde começar

| Se você… | Leia |
|---|---|
| Nunca abriu este projeto | `CLAUDE.md` (raiz) → `ARQUITETURA_E_PASTAS.md` |
| Vai começar uma sessão de trabalho | `diario/RITUAL_DE_SESSAO_RESUMO.md` |
| Quer saber o que falta fazer | `CATALOGO_DE_FEATURES.md` |
| Vai executar um módulo | `EXECUCAO_POR_MODULO.md` |
| Vai abrir uma frente nova em outro chat | `FRENTES_PARALELAS.md` → `prompts/` |
| Vai juntar as três frentes de 02/09 | `EXECUCAO_POS_FRENTES_PARALELAS.md` |
| Precisa criar uma conta ou serviço | `SETUP_CONTAS_E_SERVICOS.md` |
| Quer saber que atalhos a plataforma deve | `../RISCOS_ASSUMIDOS.md` (raiz) |
| Vai mexer numa pasta específica | O `README.md` da própria pasta |
| Quer saber por que algo é assim | `MUDANCAS_MERCADO_MULTI_ATIVO.md` ou o `VERSION_COMPARISON_DAILY.md` |
| Precisa das contas de teste | `referencia/CONTAS_DE_TESTE.md` |

## Quem atualiza o quê

| Documento | Quando |
|---|---|
| `CATALOGO_DE_FEATURES.md` | Ao entregar ou especificar uma feature |
| `diario/CRITICAL_DEBUGS.md` | Ao resolver um defeito ou encontrar um novo |
| `diario/VERSION_COMPARISON_DAILY.md` | A cada leitura diária — **acrescentando**, nunca editando |
| `diario/RITUAL_DE_SESSAO.md` | Só quando a **estrutura** muda: banco, serviço, variável, dependência ou processo de deploy. Não muda por causa de feature |
| `README.md` de uma pasta | **No mesmo commit** em que um arquivo é criado ou removido nela |
