# E3 · Limpeza do painel antigo de relatórios

```
Branch:               exec/e3-limpeza-relatorios-antigos
Base:                 origin/main com o commit de base da integração (os oito documentos desta
                      pasta, o bloco oxc em vitest.config.mts e o RA-01 de
                      src/server/actions/ATALHOS.md já corrigido) — precisa ter src/app/painel/page.tsx
Worktree sugerido:    C:\dev\AureaCustodiaMVP-e3
Pendências de origem: P-C1-03 (docs/finalizacoes/PENDENCIAS_AGENTE_C.md)
RA reservados:        nenhum (só corrige o texto do RA-16 que cita o arquivo removido)
Migration reservada:  nenhuma
Relatório de saída:   docs/execucao-pendencias/relatorios/E3.md
Servidor local:       não precisa; se subir, só na porta 3103
```

> Revisado em 15/09/2026 contra a crítica de sobreposição (docs/execucao-pendencias/00_PLANO_MESTRE.md).

> **Para o Rogério.** Até 13/09 os relatórios financeiros da empresa tinham uma tela própria em
> `/relatorios`. Desde então tudo isso mudou para o painel administrativo, onde cada pessoa da
> equipe só vê e só mexe no que o papel dela permite. A tela antiga ficou esquecida no código: não
> aparece para ninguém, mas continua lá, com uma regra de acesso mais frouxa que a do painel. Esta
> branch apaga essa tela velha e as ações que só ela usava. Para quem usa o site, nada muda. Para a
> empresa, sobra um único lugar onde se lança despesa, se estorna lançamento e se preenche alíquota.
> E nenhum programador vai religar, sem querer, a porta antiga que não confere o papel.

---

## Objetivo final — pronto quando

1. A pasta `src/components/relatorios/` e o arquivo `src/server/actions/contabil.ts` não existem mais
   (`Test-Path` devolve `False` para os dois).
2. `src/server/relatorios/acesso.ts` exporta exatamente `ehAdmin`, `tokenDeIntegracaoValido`,
   `autorizarRelatorioNoPainel` e o tipo `Autorizacao`. A função síncrona `autorizarRelatorio` não
   existe mais. Um teste confere a lista de exportações.
3. O comando abaixo, rodado na raiz do worktree, não imprime nada:
   ```powershell
   git grep -nE 'RelatoriosPainel|@/server/actions/contabil|autorizarRelatorio([^N]|$)' -- src
   ```
4. `npm run typecheck`, `npm run lint`, `npm test` e `npm run build` verdes no worktree da E3.
5. `/relatorios` continua redirecionando para `/admin/resultados/financeiro`. As rotas
   `/api/relatorios/*` (JSON, CSV, XLSX e `sheets`) seguem no mesmo endereço, com a mesma
   autorização. A entrada `/painel` segue intacta: os testes de `src/server/admin/acesso.test.ts`
   e `src/server/auth/destino.test.ts` passam sem alteração.
6. Nenhum README, ATALHOS ou índice de `docs/ARQUITETURA_E_PASTAS.md` aponta para arquivo que não
   existe mais.

---

## O que o código faz hoje

Conferido em `40bb8c8`. As linhas de `src/server/actions/ATALHOS.md` já estão na numeração do commit
de base, em que a seção RA-01 ganhou duas linhas.

### O que sai

**`src/components/relatorios/RelatoriosPainel.tsx`** (690 linhas, `'use client'`)
- É a tela antiga de oito abas: DRE, Análise, Livro-razão, Auditoria, Extratos, Lançamentos,
  Alíquotas e Integração.
- Importa as cinco ações de `@/server/actions/contabil` (`:32-38`) e usa o `run()` do `AppProvider`.
- Lê `/api/relatorios/<nome>` em JSON (`:106`), abre os arquivos CSV e XLSX (`:144`) e monta o
  exemplo de fórmula do Sheets (`:654`).
- **Ninguém importa este componente.** Todas as ocorrências de `RelatoriosPainel` em `src/` estão
  na própria pasta ou em READMEs.

**`src/components/relatorios/README.md`**
- O topo (`:3-6`) já avisa que a pasta ficou sem rota e que a remoção foi pedida.

**`src/app/(app)/relatorios/page.tsx:17-31`**
- Só redireciona para `/admin/resultados/financeiro` e leva `ano`, `mes` e `trimestre` junto.
- **Não renderiza o painel antigo e fica como está.**

**`src/server/actions/contabil.ts`** (236 linhas, `'use server'`)
- Cinco ações: `registrarLancamentoManual` (`:72`), `estornarLancamentoManual` (`:119`),
  `definirParametroContabil` (`:164`), `sincronizarGoogleSheets` (`:199`) e
  `verificarIntegridadeLedger` (`:207`).
- A porta de todas é `administrador()` (`:56-62`). Ela usa só `ehAdmin` (a lista do ambiente),
  **sem consultar papel nem permissão**, e grava na trilha com códigos antigos
  (`contabil.lancamento`, `contabil.estorno`, `contabil.parametro`, `ledger.verificacao`), sem o
  prefixo `admin.`.
- O único arquivo que importa as ações é `RelatoriosPainel.tsx`. Nenhum teste as importa.
- Nenhum outro arquivo de `src/` usa os códigos de trilha acima. As linhas antigas continuam no
  `audit_log` e seguem aparecendo no relatório de auditoria, porque a leitura não filtra por esses
  códigos.
- **O painel já tem a versão com papéis** em `src/server/actions/admin/contabil.ts`:
  - `lancarManualNoPainel` (`:51`)
  - `estornarManualNoPainel` (`:60`)
  - `definirAliquotaNoPainel` (`:64`)
  - `verificarLedgerNoPainel` (`:68`)
  - `enviarAoSheetsNoPainel` (`:77`)

  A regra pura está em `src/domain/admin/contabil.ts`, o serviço em `src/server/admin/contabil.ts`,
  e os testes em `src/server/actions/admin/acoes.test.ts`. Nada da versão antiga fica sem
  substituto.
- Os repositórios que as duas versões usam (`garantirCatalogos`, `inserirLancamentoManual`,
  `listarLancamentosManuais` e `gravarParametro`, em `src/server/db/repositories/contabil.ts`) e
  `sincronizarSheetsComoAtor` (`src/server/relatorios/sincronizar.ts`) **continuam em uso** pelo
  painel e pelas rotas. Não saem.

**`src/server/relatorios/acesso.ts:57-73`, a função `autorizarRelatorio` (síncrona)**
- Não tem nenhum chamador em `src/` além de `acesso.test.ts`.
- As três rotas de `/api/relatorios/*` usam `autorizarRelatorioNoPainel`:
  - `src/app/api/relatorios/route.ts:10`
  - `src/app/api/relatorios/sheets/route.ts:15`
  - `src/app/api/relatorios/[relatorio]/route.ts:34`

**`src/server/relatorios/acesso.test.ts:57-78`**
- O bloco `describe('autorizarRelatorio')`, com quatro casos, sai junto com a função, e o import da
  linha `:14` perde o nome dela.
- Três dos quatro casos já têm equivalente em `acesso-painel.test.ts`, nos casos de `:45` e `:52`.
- **Falta um:** "quem já entra pela sessão continua entrando mesmo com uma chave de integração
  errada na URL" (`:60`). A tarefa 3 leva esse caso para a versão do painel.

### O que fica

| O quê | Onde | Quem usa |
|---|---|---|
| `ehAdmin` | `acesso.ts:31` | `src/server/actions/custody.ts:904`, `src/app/api/retiradas/etiqueta/[id]/route.ts:39` |
| `tokenDeIntegracaoValido` | `acesso.ts:44` | `autorizarRelatorioNoPainel` e os testes |
| tipo `Autorizacao` | `acesso.ts:53-55` | o que `autorizarRelatorioNoPainel` devolve |
| `autorizarRelatorioNoPainel` | `acesso.ts:91-109` | as três rotas de `/api/relatorios/*` e `acesso-painel.test.ts` |
| rota `/relatorios` (redirecionamento) | `src/app/(app)/relatorios/page.tsx` | favoritos e links salvos |
| formato JSON de `/api/relatorios/<nome>` | `src/app/api/relatorios/[relatorio]/route.ts` | contrato público em `docs/API_RELATORIOS.md`; perde o consumidor interno, mas continua valendo para integrações |

### Comentários que ficam falsos com a remoção (ou já são)

**Em `src/server/relatorios/acesso.ts`:**
- `:75-78`: "A mesma decisão de `autorizarRelatorio`…" aponta para a função que sai.
- A mesma frase diz que `/api/admin/conciliacao` usa esta função, mas
  `src/app/api/admin/conciliacao/route.ts:3` usa `carregarMembro` e `temPermissao` direto.

**Em `src/server/relatorios/acesso.test.ts:1-8`:**
- O cabeçalho diz que a função é a mesma "em `/relatorios` e em `/api/admin/conciliacao`", o que não
  vale desde a C1.

**READMEs, ATALHOS e índices que citam o que sai:**

| Arquivo | Trecho |
|---|---|
| `src/components/README.md` | `:20`, linha `relatorios/` |
| `src/components/admin/README.md` | `:57-62`, seção "O painel antigo" |
| `src/server/actions/README.md` | `:70`, linha `contabil.ts` |
| `src/server/actions/admin/README.md` | `:71`, linha `src/server/actions/contabil.ts` |
| `src/server/actions/ATALHOS.md` | `:61-69`, seção RA-16.c, que é inteira sobre o arquivo que sai |
| `src/server/relatorios/README.md` | `:18` (lista `autorizarRelatorio`) e `:33` (linha `src/server/actions/contabil.ts`) |
| `src/server/relatorios/ATALHOS.md` | `:45-47`, RA-16.c, lista de arquivos |
| `src/server/db/README.md` | `:139-142`, "Quem depende desta pasta" |
| `src/app/api/relatorios/README.md` | `:28`, o consumidor em JSON |
| `src/domain/admin/contabil.ts` | `:4-7`, comentário "Aquele arquivo continua existindo" |
| `docs/ARQUITETURA_E_PASTAS.md` | `:68`, link para o README que some |
| `RISCOS_ASSUMIDOS.md` | `:49` (coluna de arquivos do RA-16) e `:552` (item **c**) |

**Documentos históricos que citam os arquivos e não se editam:**
- `docs/EXECUCAO_AGENTE_B_LEDGER_DRE.md`
- `docs/diario/*`
- `docs/publish_docs/EXECUCAO_3_BRANCHES_PUBLICACAO.md`
- `docs/prompts/PUBLICACAO_AGENTE_B.md`
- `docs/CHECKUP_GERAL_03_09.md`
- `docs/finalizacoes/*`

---

## Tarefas

### 0. Preparar o worktree

No PowerShell, a partir da pasta principal:

```powershell
git -C C:\dev\AureaCustodiaMVP fetch origin
```

```powershell
git -C C:\dev\AureaCustodiaMVP worktree add C:\dev\AureaCustodiaMVP-e3 -b exec/e3-limpeza-relatorios-antigos origin/main
```

```powershell
Set-Location C:\dev\AureaCustodiaMVP-e3; npm install
```

```powershell
Test-Path C:\dev\AureaCustodiaMVP-e3\src\app\painel\page.tsx
```

O último comando precisa devolver `True`. Se devolver `False`, a base está velha: pare e registre
no relatório.

Antes de mexer em qualquer arquivo, rode `npm test` e anote o total de arquivos e de testes. É a
linha de base para o relatório. O esperado na base é **86 arquivos de teste, 741 testes passando e 1
pulado**. Rode a suíte com nenhum servidor de desenvolvimento deste worktree ligado.

### 1. Apagar o painel antigo e as ações sem tela

**Comando:**

```powershell
git rm -r src/components/relatorios; if ($?) { git rm src/server/actions/contabil.ts }
```

**Por quê:** nada importa esses arquivos (conferido acima). As cinco ações têm substituto com papel
e trilha `admin.*` em `src/server/actions/admin/contabil.ts`. Enquanto a versão antiga existir,
basta um import esquecido para expor uma escrita contábil que não confere o papel.

**Prova:**
- `npm run typecheck` verde. Se algo ainda importasse os arquivos, o `tsc` acusaria.
- `Test-Path src/components/relatorios` e `Test-Path src/server/actions/contabil.ts` devolvem
  `False`.

### 2. Tirar `autorizarRelatorio` de `src/server/relatorios/acesso.ts`

**O que fazer:**
1. Apague as linhas `57-73`, ou seja, o comentário de bloco e a função `autorizarRelatorio`.
2. Mantenha `ehAdmin`, `tokenDeIntegracaoValido`, `type Autorizacao` e
   `autorizarRelatorioNoPainel` **sem mudar assinatura nem comportamento**.
3. Reescreva o comentário de `autorizarRelatorioNoPainel` (`:75-90`) para que ele se explique
   sozinho. Três pontos precisam estar lá:
   - A razão da ordem que antes estava no comentário da função removida: a sessão vem primeiro,
     porque quem está logado com a permissão não precisa da chave de integração, e uma chave errada
     na URL de quem está logado não derruba a leitura.
   - A lista correta de quem chama: as rotas de `/api/relatorios/*`. Tire `/api/admin/conciliacao`,
     que confere o papel por conta própria.
   - O que já está escrito sobre `resultados.ver` × `resultados.exportar` e sobre os códigos 401 e
     403.

   Se o comentário mencionar a função removida, chame-a de "a versão síncrona antiga", sem o nome.
   Com o nome, a busca do item 3 de "pronto quando" acusa uma ocorrência. Vale também para
   `acesso.test.ts` e para os READMEs.
4. No comentário de `ehAdmin` (`:24-29`), a frase que manda chamar `autorizarRelatorioNoPainel` ou
   `carregarMembro` continua verdadeira: não mexa.

**Por quê:** a função síncrona decide só pela lista do ambiente e ignora os papéis. Desde a C1 ela
não tem chamador. Deixá-la exportada convida alguém a usá-la numa rota nova.

**Prova:** tarefa 3 e `npm run typecheck`.

### 3. Ajustar `src/server/relatorios/acesso.test.ts`

**O que fazer:**
1. **Cabeçalho (`:1-8`).** Diga que o arquivo testa a lista do ambiente (`ehAdmin`), a chave de
   integração e o que o módulo exporta. Diga também que a decisão com papéis está em
   `acesso-painel.test.ts`. Tire a menção a `/relatorios` e a `/api/admin/conciliacao`.
2. **Import (`:14`).** Fica
   `import { autorizarRelatorioNoPainel, ehAdmin, tokenDeIntegracaoValido } from './acesso'`.
3. **Bloco antigo (`:57-78`).** Apague o `describe('autorizarRelatorio', …)` inteiro.
4. **Dublê de `carregarMembro`.** Acrescente o mesmo dublê que `acesso-painel.test.ts` usa
   (`vi.hoisted` + `vi.mock('@/server/admin/acesso', () => ({ carregarMembro }))`). Assim o teste
   novo não depende de banco. `ehAdmin` não chama `carregarMembro`, então os casos atuais não
   mudam.
5. **Dois casos novos**, num `describe('o que sobrou do acesso aos relatórios', …)`:
   - `it('o módulo exporta só a lista do ambiente, a chave de integração e a decisão do painel')`
     - Faça `const modulo = await import('./acesso')`.
     - Confira `Object.keys(modulo).filter((k) => !k.startsWith('__')).sort()` com
       `['autorizarRelatorioNoPainel', 'ehAdmin', 'tokenDeIntegracaoValido']`. O filtro descarta
       chaves internas que o carregador de módulos do Vitest possa acrescentar.
     - Confira também `expect('autorizarRelatorio' in modulo).toBe(false)`.
     - **O que prova:** a função síncrona não volta sem alguém mudar este teste de propósito. Tipos
       não aparecem em `Object.keys`, então `Autorizacao` não entra na lista.
   - `it('quem entra pela sessão com a permissão continua entrando mesmo com chave errada na URL')`
     - `carregarMembro.mockResolvedValue` com um membro que tem `resultados.ver`.
     - Com `process.env.AUREA_RELATORIOS_TOKEN` definido com 16 caracteres ou mais, espere
       `await autorizarRelatorioNoPainel(EMAIL, 'errado')` igual a
       `{ ok: true, ator: EMAIL, via: 'sessao' }`.
     - **O que prova:** o único caso do bloco removido que não tinha equivalente na versão do
       painel.
   - Use um e-mail de exemplo que não seja do seed, por exemplo `contador@exemplo.com.br`.
   - O `afterEach` existente já limpa `AUREA_RELATORIOS_TOKEN`. Acrescente
     `carregarMembro.mockReset()` num `beforeEach`.
6. **Não mexa** nos quatro casos de `ehAdmin` e `tokenDeIntegracaoValido` (`:25-55`).

**Prova:**

```powershell
npx vitest run src/server/relatorios
```

Tudo verde. O arquivo passa de 8 para 6 casos, e `acesso-painel.test.ts` continua com 4, sem
alteração.

### 4. Corrigir o comentário de `src/domain/admin/contabil.ts`

**O que fazer:** só o bloco `:3-7`. Troque "Aquele arquivo continua existindo (é de outra área e
segue funcionando…)" por uma frase dizendo que essas regras vieram das ações da tela antiga
`/relatorios`, removidas na E3, e que o painel é agora o único caminho de escrita contábil.
**Nenhuma linha de código muda.**

**Prova:** `git diff src/domain/admin/contabil.ts` mostra só linhas de comentário.

### 5. Atualizar READMEs, ATALHOS e o índice de pastas

Cada edição mexe **só no trecho citado**.

| Arquivo | O que fazer |
|---|---|
| `src/components/README.md:20` | Apagar a linha `relatorios/` da tabela. Nada mais: não acrescentar nem reordenar linhas (a E6 acrescenta a dela junto de `shell/`, `:10`) |
| `src/components/admin/README.md:57-62` | Reescrever só a seção "O painel antigo", deixando uma frase: o painel antigo de `/relatorios` foi removido na E3, e o conteúdo vive em `resultados/`. Sem citar o nome do componente. Não tocar a tabela "Conexões" (a E5 põe a linha dela lá) nem acrescentar nada depois da seção |
| `src/server/actions/README.md:70` | Apagar a linha `contabil.ts` da tabela "Quem chama estas ações" |
| `src/server/actions/admin/README.md:71` | Apagar a linha `src/server/actions/contabil.ts` da tabela "Conexões" |
| `src/server/actions/ATALHOS.md:61-69` | Trocar só a seção RA-16.c (do título até o `---` de `:70`) por uma nota curta: pago por remoção na E3, porque o arquivo não existe mais e as escritas contábeis passam por `src/server/actions/admin/contabil.ts`, com permissão por papel e testes em `acoes.test.ts`. A seção RA-01 (`:8-27`) já chega corrigida na base, encerrada e sem trava: a E3 não mexe nela |
| `src/server/relatorios/README.md:18` | Na linha de `acesso.ts`, tirar `autorizarRelatorio` e deixar `ehAdmin`, `tokenDeIntegracaoValido` e `autorizarRelatorioNoPainel` |
| `src/server/relatorios/README.md:33` | Apagar a linha `src/server/actions/contabil.ts` de "Quem chama" |
| `src/server/relatorios/README.md:25` | Opcional: acrescentar `acesso.test.ts` e `acesso-painel.test.ts` com as contagens reais |
| `src/server/relatorios/ATALHOS.md:45-47` | No RA-16.c, tirar `src/server/actions/contabil.ts` da lista de arquivos. Acrescentar uma frase: a parte de Server Action saiu com a remoção, e continuam sem teste de rota as `/api/relatorios/*` em si e `dados.ts` |
| `src/server/db/README.md:139-142` | Trocar "`src/server/relatorios/` + `src/server/actions/contabil.ts`" por "`src/server/relatorios/` e `src/server/admin/contabil.ts`" (esse arquivo importa os repositórios contábeis; conferir com `git grep -n "repositories/contabil" -- src`) |
| `src/app/api/relatorios/README.md:28` | Trocar o consumidor em JSON por `src/components/admin/resultados/` (os botões de CSV e XLSX de `Financeiro.tsx` e o exemplo de fórmula de `Contabil.tsx`). Registrar que o JSON segue no contrato para integrações |
| `docs/ARQUITETURA_E_PASTAS.md:68` | Apagar a linha `src/components/relatorios/` |

**Por quê:** a regra da organização do repositório é um README verdadeiro por pasta. Link para
pasta apagada é o primeiro lugar onde o próximo agente tropeça.

**Prova:** o comando do item 3 de "pronto quando" não imprime nada, e este também não:

```powershell
git grep -n "components/relatorios" -- src docs/ARQUITETURA_E_PASTAS.md
```

### 6. Corrigir o texto do RA-16 em `RISCOS_ASSUMIDOS.md`

**O que fazer:** só nas linhas do RA-16.
1. **Linha 49**, coluna de arquivos: tirar `src/server/actions/contabil.ts`.
2. **Linha 552**, item **c**: trocar "Rotas de `/api/relatorios` e `actions/contabil.ts` sem teste"
   por "Rotas de `/api/relatorios` sem teste".
3. **Depois do bloco "Atualização de 03/09/2026" (`:558-562`)**, acrescentar um bloco curto
   "Atualização de dd/09/2026 (E3)", com a data do dia. Ele diz três coisas:
   - O arquivo de ações contábeis sem papel foi removido.
   - `acesso.test.ts` deixou de testar a função síncrona.
   - A matriz sessão × chave de integração está em `acesso-painel.test.ts`.

**Não criar RA novo.** A limpeza não toma atalho. Se outra branch já tiver entrado na main e o
arquivo conflitar, quem resolve é a integração, pela união em ordem numérica: não tente prever.

**Prova:** `git diff RISCOS_ASSUMIDOS.md` mostra alterações só entre as linhas 49 e ~570.

### 7. Ciclo completo e relatório

```powershell
npm run typecheck; if ($?) { npm run lint }; if ($?) { npm test }; if ($?) { npm run build }
```

Rode a suíte com o servidor de desenvolvimento deste worktree parado.

**No relatório, confira e anote:**
- **Total de testes.** A linha de base menos 2: saem 4 casos e entram 2. Partindo da base, o esperado
  é **86 arquivos, 739 testes passando e 1 pulado** (a E3 não cria nem apaga arquivo de teste). Se a
  contagem de arquivos vier menor que 86, um worker morreu: rode de novo o arquivo que sumiu sozinho,
  com `npx vitest run <arquivo>`, e registre no relatório.
- **Rotas no build.** A saída do `next build` continua listando `/relatorios`, `/api/relatorios`,
  `/api/relatorios/[relatorio]`, `/api/relatorios/sheets`, `/painel` e `/admin`.
- **Buscas vazias.** O resultado vazio dos dois `git grep`.

---

## Território

### Pode editar

| Caminho | Regra |
|---|---|
| `src/components/relatorios/` (pasta inteira) | **Apagar** |
| `src/server/actions/contabil.ts` | **Apagar** |
| `src/server/relatorios/acesso.ts` | Só remover `autorizarRelatorio` e reescrever o comentário de `autorizarRelatorioNoPainel`. Nenhuma assinatura muda |
| `src/server/relatorios/acesso.test.ts` | Livre dentro da tarefa 3 |
| `src/server/relatorios/README.md` | Só as linhas `:18`, `:25` e `:33` |
| `src/server/relatorios/ATALHOS.md` | Só a seção RA-16.c |
| `src/app/api/relatorios/README.md` | Só a linha do consumidor em JSON |
| `docs/ARQUITETURA_E_PASTAS.md` | Só a linha `src/components/relatorios/` |
| `docs/execucao-pendencias/relatorios/E3.md` | Arquivo novo, livre |

### Arquivos compartilhados (outra branch pode tocar)

| Caminho | Quem mais pode tocar | Regra de convivência |
|---|---|---|
| `RISCOS_ASSUMIDOS.md` | E1 (RA-43, RA-44, RA-49, RA-50), E2 (RA-24, RA-47, RA-51), E4 (RA-52, RA-53), E5 (RA-54), E6 (RA-55) | E3 edita **só** as linhas do RA-16 (`:49`, `:552` e o bloco novo depois de `:562`). Não reordena nem reformata a tabela |
| `src/server/actions/ATALHOS.md` | E1 e E4 (atalhos de `auth.ts` e `custody.ts`, acrescentados no fim do arquivo) | Só a seção `## RA-16.c` (`:61-69`), entre o título e o `---` seguinte. A RA-01 já está corrigida na base e não se toca; a RA-04 (`:72-83`) fica entre a E3 e o fim |
| `src/components/README.md` | E6 (linha de `shell/faixaDeAceite.ts`, junto de `shell/`, `:10`) | Só apagar a linha `relatorios/` (`:20`). Nenhuma linha nova, nenhuma reordenação |
| `src/server/actions/README.md` | E1, E4 | Só apagar a linha `contabil.ts` da tabela "Quem chama estas ações" |
| `src/server/actions/admin/README.md` | E5, E6 | Só apagar a linha `src/server/actions/contabil.ts` da tabela "Conexões" |
| `src/components/admin/README.md` | E5 (linha na tabela "Conexões"), E6 | Só a seção `## O painel antigo` (`:57-62`, a última do arquivo). Não tocar "Conexões" nem acrescentar nada depois da seção |
| `src/domain/admin/contabil.ts` | E5 (Central de Resultados) | Só o comentário de bloco do topo (`:1-12`). Nenhuma linha de código |
| `src/server/db/README.md` | E1 (P-C2-09 em `diff.ts`), E4 (migration 027) | Só a frase de "Quem depende desta pasta" (`:139-142`) |

### Não pode editar

| Caminho | Motivo |
|---|---|
| `src/server/relatorios/acesso-painel.test.ts`, `dados.ts`, `sincronizar.ts`, `sheets.ts`, `exportar.ts`, `jwt.ts` | Continuam em uso; área de QA da E5 (Central de Resultados) |
| `src/app/api/relatorios/route.ts`, `sheets/route.ts`, `[relatorio]/route.ts` | Contrato público (`docs/API_RELATORIOS.md`); o formato JSON fica |
| `src/app/(app)/relatorios/page.tsx` | O redirecionamento para favoritos antigos fica |
| `src/server/actions/admin/**`, `src/server/admin/**`, `src/components/admin/**` (fora a seção citada do README), `src/app/(admin)/**` | E5 e E6 |
| `src/app/painel/**`, `src/components/admin/entrada/**`, `src/server/admin/acesso.ts`, `src/domain/admin/permissoes.ts` | A entrada própria do painel (E5 faz o QA; ninguém quebra) |
| `src/server/actions/auth.ts`, `src/app/entrar/**`, `src/server/auth/**`, `src/server/db/diff.ts`, `src/app/(app)/layout.tsx` | E1 |
| `src/server/payments/**`, `src/server/estacao/**` (inclusive o comentário de `estacao/acesso.ts:21`, que continua verdadeiro) | E2 |
| `src/server/actions/custody.ts`, `src/app/api/retiradas/**` (usam `ehAdmin`, que fica) | E4 e E6 |
| `src/server/config/**`, `src/server/taxas/**` | E6 e E2 |
| `src/server/db/repositories/contabil.ts`, `src/domain/dre.ts`, `src/domain/ledger.ts`, `src/domain/hash.ts` | Continuam em uso pelo painel; o hash não muda |
| `src/components/shell/Sidebar.tsx`, `src/components/providers/AppProvider.tsx` | Fora do pedido; o comentário de `AppProvider.tsx:106-110` cita `acesso.ts`, que continua existindo |
| `src/styles/**` | Nenhuma classe sai: `.chart-tab`, `.audit-table` e as outras são do monolito e têm outros usuários |
| `docs/finalizacoes/**` | Quem marca o P-C1-03 como feito é a integração |
| `docs/publish_docs/**` e o índice de pendências | E7 |
| Documentos históricos (`docs/diario/`, `docs/prompts/`, `docs/EXECUCAO_AGENTE_B_LEDGER_DRE.md`, `docs/CHECKUP_GERAL_03_09.md`) | Registro do que foi, não do que é |
| `CLAUDE.md` | O parágrafo de `/relatorios` continua verdadeiro |
| `vitest.config.mts` | Chega pronto no commit de base; nenhuma branch edita |

---

## Testes exigidos

| Arquivo | Situação | O que prova |
|---|---|---|
| `src/server/relatorios/acesso.test.ts` | Alterado | `ehAdmin` (2 casos, sem mudança): a lista do ambiente, com e sem `AUREA_ADMIN_EMAILS`. `tokenDeIntegracaoValido` (2 casos, sem mudança): desligada sem variável, só o valor exato vale. **Novo:** o módulo exporta exatamente `autorizarRelatorioNoPainel`, `ehAdmin` e `tokenDeIntegracaoValido`. **Novo:** membro com `resultados.ver` entra pela sessão mesmo com chave de integração errada na URL. **Removidos:** os 4 casos de `describe('autorizarRelatorio')` |
| `src/server/relatorios/acesso-painel.test.ts` | Sem alteração, precisa passar | Ler × exportar, fora da equipe 403 e 401, chave de integração com e sem sessão |
| `src/server/actions/admin/acoes.test.ts` | Sem alteração, precisa passar | As cinco escritas contábeis do painel conferem permissão e gravam trilha `admin.*`: o substituto do que sai |
| `src/server/admin/acesso.test.ts`, `src/server/auth/destino.test.ts` | Sem alteração, precisam passar | A entrada `/painel` e a volta do login para `/admin` seguem funcionando |
| `src/app/api/admin/conciliacao/route.test.ts` | Sem alteração, precisa passar | A rota de conciliação não dependia da função removida |

Não é preciso teste novo para a remoção dos arquivos: o `tsc` e o `next build` falham se sobrar
qualquer import.

---

## Regras que valem nesta branch

- **Palavras proibidas** em comentário, README, ATALHOS, nome de teste, commit e relatório: token,
  NFT, cripto, ativo digital, ativo, investimento, investidor, corretora, rentabilidade, retorno.
  - O termo é "recibo"; o objeto é "moeda" ou "item".
  - Em texto novo, diga **"chave de integração"**.
  - Os identificadores que já existem (`tokenDeIntegracaoValido`, `AUREA_RELATORIOS_TOKEN`, o
    parâmetro `?token=` do contrato) **não se renomeiam nesta branch**. Renomear quebra a planilha
    do contador e a variável da Vercel. Cite-os só entre crases.
- **Nada tranca a equipe para fora.** `autorizarRelatorioNoPainel`, `ehAdmin` e
  `tokenDeIntegracaoValido` saem desta branch com o mesmo comportamento com que entraram. Nenhuma
  checagem nova.
- **Nenhuma trava** que o Gabriel não pediu: nada de feature flag, gate de ambiente, confirmação
  obrigatória ou modo fechado por padrão.
- **A fórmula do hash não muda:** nem a da análise (os quinze campos de `estacao/CONTRATO.md` e o
  vetor de `src/domain/analise.test.ts`) nem a do ledger (`src/domain/hash.ts`, `ledger.ts`). Esta
  branch não encosta nesses arquivos.
- **Tabelas de trilha só recebem INSERT.** As linhas antigas `contabil.*` e `ledger.verificacao` do
  `audit_log` ficam onde estão. Nada de script de limpeza.
- **Nada de `@/server/*` em Client Component.** A remoção só diminui esse risco: o componente
  apagado importava Server Actions pelo mecanismo permitido, e nada novo entra.
- **Comentários em português**, explicando o porquê. Todo comentário reescrito diz por que a função
  síncrona saiu, não só que saiu.
- **Não mexer em DNS, e-mail ou domínio.** Não criar conta em serviço externo nem gerar credencial.
  Esta branch não pede variável de ambiente nova.
- **A branch não faz merge na main.** Antes de cada push:
  `npm run typecheck; npm run lint; npm test; npm run build`.
- **Ambiente:** Windows, PowerShell 5.1. Não existe `&&`: use `;` e `if ($?)`. O repositório é
  público de propósito.
- **Porta.** A E3 não precisa de servidor. Se subir um, é só com `npm run dev -- -p 3103`, e toda URL
  local usa `http://localhost:3103`. Nunca a 3000, que é a da pasta principal do Gabriel. Pare o
  servidor antes de rodar a suíte.

---

## O que NÃO fazer

- **Não apagar nem mudar** `ehAdmin`, `tokenDeIntegracaoValido`, `Autorizacao` ou
  `autorizarRelatorioNoPainel`. Não tornar `ehAdmin` assíncrona: um `if (!ehAdmin(x))` esquecido
  viraria `!Promise`, que é sempre falso, e todo mundo passaria a ser administrador (o motivo está
  em `acesso.ts:24-29`).
- **Não apagar** `src/app/(app)/relatorios/page.tsx` nem o item de menu que leva ao painel. O
  redirecionamento atende quem tem o endereço antigo salvo.
- **Não remover** o formato JSON de `/api/relatorios/<nome>`, mesmo sem consumidor interno. Ele está
  no contrato de `docs/API_RELATORIOS.md`.
- **Não remover** `sincronizarSheetsComoAtor`, os repositórios de
  `src/server/db/repositories/contabil.ts` nem classes CSS. Todos têm outros usuários.
- **Não "aproveitar"** para mexer em `acesso-painel.test.ts`, `acoes.test.ts` ou nas telas de
  `src/components/admin/resultados/`. Isso é da E5.
- **Não editar** `docs/finalizacoes/PENDENCIAS_AGENTE_C.md` para marcar o P-C1-03 como feito. É da
  integração.
- **Não reescrever** documentos históricos que citam os arquivos removidos.
- **Não criar** rota, script ou cookie que pule autenticação para "conferir" a tela. Esta branch não
  tem tela nova para conferir.
- **Não fazer merge na main**, nem rebase de branch de outro agente.

---

## Entrega

**Commits** (sugestão, sem acento), um por bloco lógico, cada um terminando com a linha de coautoria
do agente, se houver:

1. `Remove o painel antigo de relatorios e as acoes contabeis sem tela (P-C1-03)`: tarefa 1.
2. `Tira a autorizacao sincrona de relatorios e ajusta os testes de acesso`: tarefas 2 e 3.
3. `Atualiza READMEs, ATALHOS e RA-16 depois da remocao do painel antigo`: tarefas 4, 5 e 6.
4. `Relatorio da E3`: o relatório de saída, com o hash do commit 3.

Exemplo da linha final de um commit feito por Claude:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

**Push da branch**, sem merge na main:

```powershell
git push -u origin exec/e3-limpeza-relatorios-antigos
```

**Relatório** em `docs/execucao-pendencias/relatorios/E3.md` (crie a pasta `relatorios/` se não
existir), com:
- **O que foi feito.** Arquivos apagados, com contagem de linhas. Funções removidas. Comentários e
  READMEs corrigidos.
- **Testes.** Total antes e depois (esperado: menos 2), os dois casos novos pelo nome, e a saída
  resumida do `npm test`.
- **O que foi conferido e como.** Os dois `git grep` sem resultado; `Test-Path` dos arquivos
  apagados; a lista de rotas do `next build` com `/relatorios`, `/api/relatorios/*`, `/painel` e
  `/admin`; o diff de `src/domain/admin/contabil.ts` só com comentário; o diff de
  `RISCOS_ASSUMIDOS.md` só no RA-16.
- **Riscos.** O formato JSON de `/api/relatorios/<nome>` fica sem consumidor interno e continua no
  contrato. As linhas antigas de trilha `contabil.*` permanecem no `audit_log`.
- **Passos manuais.** Nenhum. Diga isso explicitamente.
- **Linha final:** `E3 pronta para integração — <hash do último commit>`.

---

## Passos manuais que sobram para o Gabriel

Nenhum. A branch não cria migration, variável de ambiente nem tela nova. Depois do merge, o
`/relatorios` de produção continua levando à Central de Resultados, como hoje.
