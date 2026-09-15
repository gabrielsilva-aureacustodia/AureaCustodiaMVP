# `src/server/actions/admin/` — as Server Actions do painel

O equivalente, no desenho da Áurea, aos wrappers tipados da arquitetura de referência: a tela
chama, a ação confere a permissão e delega ao serviço em `src/server/admin/`.

## A regra que não tem exceção

**Toda ação confere a permissão por conta própria, antes de qualquer outra coisa**
(`permissaoParaAcao` de `src/server/admin/acesso.ts`). Esconder o botão é conveniência: uma Server
Action é um endpoint HTTP, e quem conhece o identificador dela a chama sem tela nenhuma. A recusa
fica na trilha como `admin.acesso.recusado`.

A ordem é sempre: **permissão → banco configurado → serviço**. Exceção do serviço vira a mensagem
de falha de gravação, nunca um erro na tela.

## Arquivos

| Arquivo | Ações | Permissão |
|---|---|---|
| `contabil.ts` | `lancarManualNoPainel`, `estornarManualNoPainel` | `contabil.lancar` |
| | `definirAliquotaNoPainel` | `contabil.parametros` |
| | `verificarLedgerNoPainel` | `resultados.ver` |
| | `enviarAoSheetsNoPainel` | `resultados.exportar` |
| `equipe.ts` | `adicionarMembroNoPainel`, `alterarMembroNoPainel` | `admin.membros` |
| | `criarPapelNoPainel`, `alterarPapelNoPainel`, `excluirPapelNoPainel` | `admin.papeis` |
| `cs.ts` (C2) | `atualizarAtendimentoNoPainel` (o polling de 5 s, só leitura) | `cs.ver` |
| | `responderNoPainel`, `enviarMidiaNoPainel`, `iniciarConversaNoPainel`, `anotarConversaNoPainel`, `mudarSituacaoDaConversaNoPainel`, `atribuirConversaNoPainel`, `criarEtiquetaNoPainel`, `etiquetarConversaNoPainel`, `atualizarContatoNoPainel` | `cs.responder` |
| | `conferirCanalNoPainel` | `cs.canais` |
| `usuarios.ts` (C2) | `criarUsuarioNoPainel` | `usuarios.criar` |
| | `editarCadastroNoPainel`, `ajustarSaldoNoPainel`, `marcarInadimplenciaNoPainel`, `mudarSituacaoDaContaNoPainel`, `redefinirSenhaNoPainel`, `anotarUsuarioNoPainel` | `usuarios.editar` |
| | `editarDadosBancariosNoPainel` | `usuarios.editar` **e** `usuarios.dados_bancarios` |
| | `quitarFaturaComSaldoNoPainel` (C3 — chama `pagarFaturaCustodiaComSaldo` da frente B) | `usuarios.editar` |
| `bancada.ts` (C3) | `atualizarBancadaNoPainel` (a fila, só leitura) | `bancada.ver` |
| | `abrirAnaliseNoPainel`, `assinarVideoNoPainel`, `fecharAnaliseNoPainel`, `salvarCaixaNoPainel` | `bancada.analisar` |
| | `verificarCorrenteNoPainel`, `urlDoVideoNoPainel` | `bancada.auditoria` |
| `config.ts` (C3) | `salvarConfiguracaoNoPainel` (taxas, operacional, termos, canais), `publicarDocumentoNoPainel` | `config.taxas` |
| | `salvarTipoDeMoedaNoPainel` | `config.catalogo` |
| `acoes.test.ts` | 51 testes: cada ação pede a sua permissão e, recusada, não chama o serviço nem olha o banco; dados bancários pedem as duas; ator = e-mail do membro, e o membro é o operador da análise; o grupo `sistema` da configuração é recusado; tabela ausente vira a instrução do `db:migrate`; exceção vira mensagem | — |

## A trilha

Cada escrita grava `admin.<area>.<verbo>` em `aurea.audit_log`, na mesma transação, com `ator` = e-mail
do membro: `admin.contabil.lancar`, `admin.contabil.estornar`, `admin.contabil.parametro`,
`admin.resultados.verificar_ledger`, `admin.resultados.enviar_sheets`, `admin.membros.adicionar`,
`admin.membros.alterar`, `admin.papeis.criar`, `admin.papeis.alterar`, `admin.papeis.excluir`.

Desde a C2: `admin.cs.responder`, `admin.cs.enviar_midia`, `admin.cs.anotar`, `admin.cs.situacao`,
`admin.cs.atribuir`, `admin.cs.criar_etiqueta`, `admin.cs.etiquetar`, `admin.cs.contato`,
`admin.cs.conferir_canal`, `admin.usuarios.criar`, `admin.usuarios.editar_cadastro`,
`admin.usuarios.editar_dados_bancarios`, `admin.usuarios.ajustar_saldo`,
`admin.usuarios.marcar_inadimplente`, `admin.usuarios.desmarcar_inadimplente`,
`admin.usuarios.desativar`, `admin.usuarios.ativar`, `admin.usuarios.redefinir_senha` e
`admin.usuarios.anotar`. A trilha de dado pessoal guarda **quais campos** mudaram, nunca os valores,
e senha nunca entra.

Desde a C3: `admin.usuarios.quitar_fatura`, `admin.bancada.analisar` (com `origem: 'bancada_web'`),
`admin.bancada.caixa`, `admin.moedas.verificar`, `admin.moedas.ver_video`, `admin.config.taxas`,
`admin.config.operacional`, `admin.config.termos`, `admin.config.sac`,
`admin.config.publicar_documento` e `admin.config.catalogo`. Mudança de configuração também entra em
`aurea.config_historico`, com o valor antigo e o novo.

O polling da caixa de conversas (`atualizarAtendimentoNoPainel`) é leitura e não grava trilha.

## Conexões

| Pasta | Relação |
|---|---|
| `src/server/admin/` | `acesso.ts` (a recusa), `contabil.ts`, `rbac.ts`, `cs.ts`, `usuarios.ts`, `bancada.ts` e `configuracao.ts` (os serviços), `portas.ts` (banco, estado, Supabase, provedor de WhatsApp, estação, publicação e vídeo), `auditar.ts` (a trilha) |
| `src/server/relatorios/sincronizar.ts` | O envio ao Google Sheets reaproveitado |
| `src/components/admin/` | Quem chama, sempre pelo `run()` do `AdminProvider` |

