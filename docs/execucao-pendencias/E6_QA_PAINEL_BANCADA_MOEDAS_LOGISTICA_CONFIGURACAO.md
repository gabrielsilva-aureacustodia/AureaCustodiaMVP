# E6 · Revisão e testes da C3: bancada, moedas, logística e configuração

```
Branch:                exec/e6-qa-painel-bancada-moedas-logistica-configuracao
Base:                  origin/main que contém docs/execucao-pendencias/00_PLANO_MESTRE.md (commit de base feito
                       pelo integrador antes do envio: documentos, bloco oxc no vitest.config.mts,
                       EntradaDoPainel.test.ts e seções sem trava do RA-01)
Worktree sugerido:     C:\dev\AureaCustodiaMVP-e6
Pendências de origem:  P-C3-02 (parte automatizável, docs/finalizacoes/PENDENCIAS_AGENTE_C.md:319)
                       e P-C3-04 (docs/finalizacoes/PENDENCIAS_AGENTE_C.md:369) · revisão de RA-45 e RA-46
RA reservados:         RA-55 (só se surgir atalho novo; o esperado é não usar)
Migration reservada:   029 (o esperado é não usar: nada aqui pede tabela nova)
Relatório de saída:    docs/execucao-pendencias/relatorios/E6.md (relatorios/README.md já existe na base;
                       a branch só cria o próprio relatorios/E6.md)
Porta local:           3106 (npm run dev -- -p 3106; nunca a 3000, que é a da pasta principal do Gabriel)
```

> Revisado em 15/09/2026 contra a crítica de sobreposição (docs/execucao-pendencias/00_PLANO_MESTRE.md).

> **Para o Rogério.** A C3 colocou no painel a bancada de análise pelo navegador, a auditoria das
> moedas, a logística e a tela onde a equipe muda taxas e o catálogo. Tudo isso foi entregue com testes
> das regras, mas nenhuma tela foi aberta de verdade por um teste. Esta branch escreve esses testes e
> corrige o que a revisão achou. Quatro pontos o cliente ou a equipe já veriam hoje. Primeiro, a página
> pública da Tabela de Taxas arredonda uma comissão de 1,25% para "1,3%", enquanto o contrato diz
> 1,25%. Segundo, a tela de venda escreve "0,5% + R$ 1,00" fixo, mesmo depois de a equipe mudar a
> taxa (o valor em reais já sai certo, só o texto fica velho). Terceiro, na ficha de uma moeda, o botão
> "Ver como o cliente vê" dá "página não encontrada" para qualquer moeda que não seja de quem clicou.
> Quarto, quem dispensou o aviso de termos novos não vê o próximo aviso até recarregar a página. Na
> bancada, um navegador sem suporte à gravação falha sem dizer nada. Quando a branch terminar, esses
> pontos estarão corrigidos e as quatro telas terão teste que as abre com um membro da equipe simulado.
> A conferência logada em produção fica menor, mas continua com o Gabriel.

---

## Objetivo final — pronto quando

1. As quatro páginas da C3 têm teste que as renderiza com membro simulado, e os testes passam:
   `npx vitest run "src/app/(admin)/admin/configuracao/pagina.test.ts" "src/app/(admin)/admin/bancada/pagina.test.ts" "src/app/(admin)/admin/moedas/pagina.test.ts" "src/app/(admin)/admin/logistica/pagina.test.ts"`.
2. `Select-String -Path src\app\taxas\page.tsx -Pattern 'toFixed\(1\)'` não devolve linha, e
   `src/app/taxas/pagina.test.ts` prova que 125 pontos-base aparecem como "1,25%".
3. `Select-String -Path "src\app\(app)\vender\page.tsx" -Pattern '0,5% \+ R\$ 1,00'` não devolve linha.
   O rótulo da comissão sai de `rotuloDaComissao(taxas, 'vendedor')`.
4. Em `/admin/moedas/[codigo]`, o link para `/recibos/<codigo>` só aparece quando a moeda é de quem está
   logado. O teste `o link "Ver como o cliente vê" só aparece para a moeda do próprio membro` passa.
5. A faixa de aceite volta quando a lista de documentos pendentes muda, mesmo depois de "Lembrar depois"
   ou de um aceite feito na mesma página (`src/components/shell/faixaDeAceite.test.ts`).
6. A integração da configuração com o Postgres embutido está coberta num arquivo novo
   (`src/server/config/config-no-banco.test.ts`): taxa mudada, documento publicado, faixa pendente,
   aceite que limpa a faixa, publicação repetida que não cria versão nova e leitura que falha caindo no
   padrão.
7. A bancada não quebra calada sem câmera ou sem `MediaRecorder`: `src/components/admin/bancada/gravacao.test.ts` passa.
8. `npm run typecheck`, `npm run lint`, `npm test` e `npm run build` passam no worktree. A suíte parte
   de **86 arquivos, 741 testes passando e 1 pulado** (a main com o commit de base desta rodada) e só
   cresce: com os 12 arquivos novos desta branch, a chegada tem 98 arquivos. Nenhum teste antigo foi
   alterado, com uma exceção prevista: `src/domain/admin/catalogo.test.ts` ganha casos.
9. A branch está no GitHub e **não** foi mesclada na main.

---

## O que o código faz hoje

Conferido na base (origin/main que contém `docs/execucao-pendencias/00_PLANO_MESTRE.md`), lendo o código e rodando a suíte.

### Já resolvido (só confirmar e registrar no relatório)

- **Permissão das Server Actions.** As onze ações de C3 conferem a própria permissão antes de tudo. O
  teste existe em `src/server/actions/admin/acoes.test.ts:220-234`.
- **Gravação da configuração no banco.** Valor, histórico e trilha vão juntos. A publicação da Tabela
  nasce na versão 1.1, e uma publicação que falha não desfaz a taxa. Tudo testado no PGlite em
  `src/server/admin/banco.test.ts:780-851`. Catálogo, caixas e fechamento da bancada estão em `:853-960`.
- **Falha de leitura não trava.** `src/server/config/carregar.ts:75-90` devolve o padrão do código sem
  banco, sem a tabela ou com erro.
- **Telas do cliente** (só a leitura da configuração vigente; a comissão de compra pelo gateway, parte do
  RA-24, não é desta branch). Mercado (`src/app/(app)/mercado/page.tsx:70,184-185,533`), valores da venda
  (`vender/page.tsx:172-174,586-593`), envios (`envios/page.tsx:170-173,769-770`), depósito
  (`src/components/account/AccountModals.tsx:304-414`), recibo, `LotCard` e `CoinPicker` já leem taxas,
  catálogo e limite de `useApp()`. O ciclo usa `config.syncMs` (`AppProvider.tsx:271-301`).
- **Moedas.** A lista já avisa "Mostrando X de N" (`src/components/admin/moedas/TabelaDeMoedas.tsx:26`).
- **CSS do bloco C3.** `src/styles/admin.css:157-194` já usa `min(100%, …)` nas grades e 44px nos
  alvos de toque (`.adm-btn-compacto`, `.adm-check`, `.adm-etiqueta-botao`, `.adm-cs-item`).

### Lacunas de teste

- **Nenhum teste abre uma tela da C3.** `vitest.config.mts` só inclui `src/**/*.test.ts`, com ambiente
  `node`. O `tsconfig.json` usa `"jsx": "preserve"`, e sem ajuste importar um `page.tsx` falha com *"make
  sure to not set jsx to preserve"*. O commit de base desta rodada já pôs na main o bloco
  `oxc: { jsx: { runtime: 'automatic' } }` em `vitest.config.mts`, validado por
  `src/components/admin/entrada/EntradaDoPainel.test.ts`; com ele as quatro páginas renderizam com
  `renderToStaticMarkup` de `react-dom/server`. Esta branch não edita esse arquivo. O teste precisa de
  `vi.mock('server-only')`, de `vi.mock('@/server/admin/acesso', membroDaPagina)`, de
  `vi.mock('next/navigation', useRouter)` e de `ToastProvider` + `AdminProvider` em volta. Sem banco,
  `getState()` usa o seed em memória. `next/link` e `next/form` renderizam sem dublê.
- **Nada testa a guarda das páginas.** `SemPermissao` em `configuracao/page.tsx:86`, `bancada/page.tsx:31`,
  `moedas/page.tsx:29`, `moedas/[codigo]/page.tsx:36` e `logistica/page.tsx:28`.
- **Formulário de configuração.** Nada testa `FormGrupoConfig` desabilitado para quem tem só `config.ver`
  (`FormGrupoConfig.tsx:129,157`). Nada testa o botão "Publicar a versão vigente", que só aparece com
  `confere === false` e `podePublicar` (`DocumentoPublicado.tsx:40-49`).
- **`src/server/config/` não tem teste nenhum.** Faltam `carregarConfiguracaoDoSite`, `documentosPendentesDeAceite`,
  `carregarDocumentosVigentes` e `configDoCliente`. A faixa de aceite depende deles.
- **Gravador de vídeo.** `GravadorDeVideo.tsx` não tem lógica separada que se teste.
- **Tela de celular.** Não há conferência de 375px, nem automática nem registrada.

### Bugs encontrados

1. **A Tabela de Taxas pública arredonda o percentual.** `src/app/taxas/page.tsx:74` e `:82` usam
   `(bp / 100).toFixed(1)`. A configuração aceita duas casas (`lerPercentual`, `src/domain/admin/configuracao.ts:127-131`),
   e o texto do contrato usa `percentualNoTexto` (`src/domain/admin/documentos.ts:40-43`). Com 125 bp a
   página mostra "1,3%" e o contrato diz "1,25%". Com 25 bp, "0,3%" contra "0,25%".
2. **O rótulo da comissão na venda está fixo.** `src/app/(app)/vender/page.tsx:376` e `:585` dizem
   `Comissão de venda (0,5% + R$ 1,00/moeda)`. O valor ao lado já usa a tabela vigente. O texto fixo de
   `src/app/(app)/conta/extrato/page.tsx:242` não entra aqui: a E4 reescreve essa nota sem número
   nenhum, porque a taxa é editável.
3. **"Ver como o cliente vê" dá 404.** `src/app/(admin)/admin/moedas/[codigo]/page.tsx:68-70` liga para
   `/recibos/<codigo>`, e `src/app/(app)/recibos/[coinId]/page.tsx:53-54` só abre a moeda do próprio
   usuário (`notFound()` de propósito). Para toda moeda de outra conta, o botão leva a uma página de erro.
4. **A faixa de aceite não volta.** Em `src/components/shell/Topbar.tsx:164-176`, `dispensado` e
   `aceitoAgora` ficam `true` até recarregar a página. Se a equipe publicar outra versão nesse meio
   tempo, `aceitesPendentes` muda no ciclo seguinte (`AppProvider.tsx:228-231`), mas a faixa continua
   escondida. Além disso, `:204-207` chama `aceitarTermosVigentes()` direto. Se o aceite falhar, nada
   aparece na tela: não há toast e o estado não é relido.
5. **Gravação sem `MediaRecorder` quebra calada.** `GravadorDeVideo.tsx:228-229` chama
   `MediaRecorder.isTypeSupported` sem conferir se `MediaRecorder` existe. Em navegador sem suporte, o
   `ReferenceError` estoura dentro de `void comecar()` (`:289`), e o aviso de `:256` nunca aparece. É
   exatamente o desfecho que o comentário de `:255` quer evitar.
6. **Permissão de câmera negada gera mensagem errada.** `GravadorDeVideo.tsx:144-146` diz "Confira o
   cabo e se outro programa está usando a webcam" também para `NotAllowedError`.
7. **Envio de vídeo sem prazo segura o fechamento.** O `fetch` PUT de `GravadorDeVideo.tsx:195` não tem
   prazo. Enquanto ele não termina, o pai continua com `gravando: true` (`:252`). O botão fica desabilitado
   (`BancadaWeb.tsx:243`) e a mensagem diz "Pare a gravação antes de fechar" (`:96-98`), mas a gravação
   já parou: o vídeo está subindo.
8. **Mensagens erradas nas ações da bancada.**
   - `src/server/actions/admin/bancada.ts:49` troca **qualquer** tabela ausente (código 42P01) pela frase da
     tabela de caixas (migration 025), inclusive ao abrir ou fechar análise.
   - `verificarCorrenteNoPainel` (`:127-149`) e `urlDoVideoNoPainel` (`:151-168`) gravam a trilha dentro do
     mesmo `try`. Se só a linha da trilha falhar, a conferência feita vira "Falha ao salvar dados", e a
     URL já assinada vira "O armazenamento não devolveu o vídeo".
9. **Publicar a versão vigente duas vezes cria versão repetida.** `publicarDocumentoVigente`
   (`src/server/admin/configuracao.ts:190-203`) não compara o texto com a última versão publicada. Duas
   abas, ou um segundo clique depois do `router.refresh`, geram 1.2 com o mesmo hash da 1.1.
10. **Logística corta a lista em silêncio e engana no rastreio.**
    - `src/server/admin/logistica.ts:77-78` corta em 300 linhas sem avisar.
    - `PainelLogistica.tsx:21` diz "rastreio ainda não consultado" para toda retirada (`:217`). Só que o
      job grava rastreio apenas de envio (`src/server/shipping/rastreios.ts:70-75`), então para retirada o
      texto nunca vai mudar.

### Melhorias pequenas que cabem

- **Catálogo.** O formulário "Criar tipo de moeda" nasce com a ordem vazia (`CatalogoDeMoedas.tsx:24`), e
  o servidor recusa. Sugerir a próxima ordem, de 10 em 10, como a semeadura faz (`catalogo.ts:97-108`).
- **Mensagem da aba Catálogo.** Com `origem === 'banco'` e a semeadura falhando, a aba diz "precisa do
  banco com a migration 024" (`configuracao/page.tsx:137` e `CatalogoDeMoedas.tsx:100`), e isso é falso.
  Separar os dois casos.

---

## Tarefas

Ordem de execução. Um commit por bloco (ver Entrega).

### 0. Preparar o worktree

```powershell
git -C C:\dev\AureaCustodiaMVP fetch origin
git -C C:\dev\AureaCustodiaMVP show origin/main:docs/execucao-pendencias/00_PLANO_MESTRE.md | Select-Object -First 1
git -C C:\dev\AureaCustodiaMVP worktree add C:\dev\AureaCustodiaMVP-e6 -b exec/e6-qa-painel-bancada-moedas-logistica-configuracao origin/main
```
```powershell
cd C:\dev\AureaCustodiaMVP-e6; npm install; if ($?) { npx vitest run }
```
Anote no relatório o número de arquivos e testes de partida (o esperado é 86 arquivos, 741 passando e 1
pulado). Rode a suíte com o servidor de desenvolvimento deste worktree parado.

Se precisar ver uma tela no navegador durante o trabalho, suba o servidor só na porta 3106 e use só este
endereço local:

```powershell
npm run dev -- -p 3106
```
```
http://localhost:3106
```

### 1. Conferir que a base já renderiza página no Vitest

- **Arquivo:** nenhum. O bloco `oxc: { jsx: { runtime: 'automatic' } }` já está em `vitest.config.mts`
  (commit de base desta rodada). **Não edite `vitest.config.mts`**: nem `oxc`, nem `include`, nem
  `environment`. Não existe `vitest.config.ts`.
- **O que fazer:** confirmar que o bloco está lá e que o teste que o valida passa:

```powershell
Select-String -Path vitest.config.mts -Pattern "runtime: 'automatic'"
```
```powershell
npx vitest run src/components/admin/entrada/EntradaDoPainel.test.ts
```

- Se o `Select-String` não devolver linha, a base está errada: registre no relatório e avise a integração,
  sem editar o arquivo.
- **Por quê:** é a única forma de testar a tela logada sem digitar senha e sem criar rota que pule login.
  Os testes que renderizam tela continuam com nome `*.test.ts` (o `include` é `src/**/*.test.ts`) e usam
  `renderToStaticMarkup` de `react-dom/server`.

### 2. Testes que abrem as quatro telas (sem banco)

Cada arquivo segue o mesmo molde. Os arquivos de teste são `.ts`, então use `createElement`, sem JSX.

```ts
vi.mock('server-only', () => ({}))
const m = vi.hoisted(() => ({ membroDaPagina: vi.fn() }))
vi.mock('@/server/admin/acesso', () => ({ membroDaPagina: m.membroDaPagina, permissaoParaAcao: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }), redirect: vi.fn(), usePathname: () => '/admin' }))
// renderizar(membro, arvore) = renderToStaticMarkup(createElement(ToastProvider, null, createElement(AdminProvider, { membro }, arvore)))
```

No `beforeEach`, apague `POSTGRES_URL` e `DATABASE_URL` e restaure no `afterEach`, como faz
`src/server/admin/acesso.test.ts:31-43`. O membro é um `MembroAdmin` com a lista de `permissoes` do caso.

**2a. `src/app/(admin)/admin/configuracao/pagina.test.ts`** (novo)
- `sem config.ver mostra o aviso de permissão e não lê a configuração`: a prova é o HTML devolvido por
  `renderToStaticMarkup`. Ele contém o aviso de `SemPermissao` e **não** contém nenhum texto que só
  existe com a configuração lida, como o rótulo `Comissão de venda — percentual`.
- `aba taxas com config.ver e sem config.taxas: campos desabilitados e a frase de só leitura`: espera
  `disabled` nos inputs e "Seu papel vê a configuração, mas não edita".
- `aba taxas com config.taxas: os onze campos, a simulação e o botão Salvar desabilitado até mudar algo`.
- `sem banco: aviso de padrão do código e nenhum formulário editável`.
- `documento que não confere mostra "Publicar a versão vigente" só para quem pode publicar`: mocke
  `@/server/config/documentos` com `carregarDocumentosVigentes` devolvendo `confere: false` e
  `doBanco: true`, e simule `carregarConfiguracaoDoSite` com `origem: 'banco'`.
- `aba pedida inválida cai em taxas` (`?aba=xyz`).
- `aba histórico sem banco diz que não há histórico gravado`.
- `aba integrações lista só nomes de variável, nunca valor`: defina `process.env.SUPABASE_SERVICE_ROLE_KEY = 'valor-secreto-de-teste'`
  e espere que o HTML não contenha `valor-secreto-de-teste`.

**2b. `src/app/(admin)/admin/bancada/pagina.test.ts`** (novo)
- Mocke `@/server/estacao/analise` só com `filaDeAnalise` (o arquivo é da E2: não o edite, só o dublê).
- `sem bancada.ver mostra o aviso de permissão e não chama filaDeAnalise`.
- `com bancada.ver a fila mostra protocolo, cliente e quantidade`.
- `fila vazia mostra "Nenhum envio recebido esperando análise."`.
- `sem bancada.analisar o quadro de caixas não oferece cadastro`: use o texto exato do botão em
  `QuadroDeCaixas.tsx`.

**2c. `src/app/(admin)/admin/moedas/pagina.test.ts`** (novo, cobre a lista e a ficha)
- `sem bancada.auditoria as duas páginas mostram o aviso de permissão`.
- `a lista mostra o resumo e o acervo do seed`: pegue um código com `getState()`.
- `código inexistente mostra "Moeda não encontrada"`.
- `o link "Ver como o cliente vê" só aparece para a moeda do próprio membro`: é o teste da tarefa 5. Rode
  uma vez com o e-mail do membro igual ao dono da moeda e outra com e-mail diferente.

**2d. `src/app/(admin)/admin/logistica/pagina.test.ts`** (novo)
- `sem logistica.ver mostra o aviso de permissão`.
- `os cartões mostram os prazos da aba Operacional`: mocke `carregarParametrosOperacionais` com
  `validacaoDiasUteis: 3` e espere "validação em 3 dia(s) útil(eis)".
- `sem logistica.etiquetas não há link de etiqueta`: mocke `carregarLogistica` com uma linha de envio.
- `?ver=retiradas esconde a tabela de envios`.

### 3. Tabela de Taxas e rótulo da comissão com duas casas

- **Novo** `src/domain/admin/rotulos-de-taxa.ts`, regra pura e leve, para poder ir ao navegador sem
  arrastar o texto dos Termos que `documentos.ts` importa:
  - `percentualDaTabela(bp: number): string`, com o **mesmo algoritmo** de `percentualNoTexto`
    (`toFixed(2)`, tira zeros à direita, vírgula);
  - `rotuloDaComissao(taxas: TabelaDeTaxas, lado: 'comprador' | 'vendedor'): string`, que devolve
    `${percentualDaTabela(bp)} + ${brl(fixa)}/moeda`.
- `src/app/taxas/page.tsx:74,82`: trocar o `toFixed(1)` por `percentualDaTabela(...)`.
- `src/app/(app)/vender/page.tsx:376,585`: `Comissão de venda ({rotuloDaComissao(taxas, 'vendedor')})`.
  Em `:522`, `taxas` já está no escopo. Mexa **só** nessas duas linhas e na linha de import.
- **Não** edite `src/domain/admin/documentos.ts`: o texto do contrato entra no hash.
- **Testes:**
  - `src/domain/admin/rotulos-de-taxa.test.ts` (novo):
    - `percentualDaTabela é idêntico a percentualNoTexto de 0 a 2000 pontos-base`;
    - `125 bp vira "1,25%", 50 vira "0,5%", 100 vira "1%", 0 vira "0%"`;
    - `com TAXAS_PADRAO o rótulo do vendedor é 0,5% + brl(100)/moeda`.
  - `src/app/taxas/pagina.test.ts` (novo): mocke `@/server/taxas/carregar` (`carregarTabelaDeTaxas` com
    `comissaoCompradorBp: 125`) e `@/server/config/documentos` (`carregarDocumentoVigente` com o
    `documentoTabelaDeTaxas` dessa tabela). Caso: `percentual com duas casas aparece igual ao contrato`,
    que espera "1,25%" e nenhum "1,3%".

### 4. Faixa de aceite que volta quando sai versão nova

- **Novo** `src/components/shell/faixaDeAceite.ts` (puro, sem React):
  - `assinaturaDasPendencias(pendentes: readonly string[] | null): string`: devolve `'sem-banco'` para
    `null` e, para lista, o `JSON` da lista ordenada.
  - `faixaDeAceite({ aceitesPendentes, versaoDosTermosAceita, resolvidoPara }): { mostrar: boolean; documentos: string[] | null }`.
    - Com banco, mostra quando há pendência **e** `assinaturaDasPendencias(pendentes) !== resolvidoPara`.
    - Sem banco, mantém a regra de hoje (`versaoDosTermosAceita !== '1.0'`) enquanto `resolvidoPara === null`.
- `src/components/shell/Topbar.tsx:164-230`:
  - troque `dispensado` e `aceitoAgora` por um único `resolvidoPara`. "Lembrar depois" e o aceite bem
    feito gravam `assinaturaDasPendencias(aceitesPendentes)`;
  - troque a chamada direta por `run(() => aceitarTermosVigentes())`, pegando `run` de `useApp()`. Assim
    a falha vira toast e a lista é relida na hora.
- **Por quê:** a faixa existe para avisar da versão nova (RA-46). Esconder a segunda versão porque a
  primeira foi dispensada contraria isso. A faixa **continua sem bloquear nada**.
- **Teste:** `src/components/shell/faixaDeAceite.test.ts` (novo):
  - `sem pendência não mostra`;
  - `pendência nova mostra os documentos`;
  - `dispensada fica escondida enquanto a lista é a mesma`;
  - `lista diferente depois de dispensar mostra de novo`;
  - `aceito e depois nova publicação mostra de novo`;
  - `sem banco segue a versão dos termos da conta`;
  - `a ordem da lista não muda a assinatura`.

### 5. Ficha da moeda sem link quebrado

- `src/app/(admin)/admin/moedas/[codigo]/page.tsx:68-70`: renderize o link `/recibos/…` só quando
  `linha.dono === membro.email`. Nos outros casos, mostre um texto curto (`adm-fraco`), por exemplo
  "O recibo no app abre só para o dono da moeda; esta ficha é a visão da equipe."
- **Por quê:** `/recibos/[coinId]` recusa moeda de terceiros de propósito (fecha a enumeração de acervo
  alheio). O conserto é no painel, não na rota do cliente.
- **Teste:** o caso da tarefa 2c.

### 6. Gravador de vídeo: sem câmera, sem gravador e envio com prazo

- **Novo** `src/components/admin/bancada/gravacao.ts` (puro, sem React e sem `window`):
  - `FORMATOS_DE_GRAVACAO`: mova a lista de `GravadorDeVideo.tsx:30-36` para cá.
  - `formatosPossiveis(suportado: ((mime: string) => boolean) | null)`: devolve a lista a tentar. Com
    `null` (sem `MediaRecorder`), devolve `[]`.
  - `diagnosticoDoNavegador({ temGetUserMedia, temMediaRecorder, contextoSeguro }): string | null`: a
    frase de por que não dá para gravar, ou `null`. Sem `https`, cite "endereço https ou localhost".
  - `deveAbrirOutraCamera(nomeDoErro: string): boolean`: `true` só para `NotFoundError` e
    `OverconstrainedError`, como em `:130`.
  - `mensagemDeFalhaDaCamera(nomeDoErro: string, detalhe: string): string`:
    - `NotAllowedError` ou `SecurityError`: permissão negada, com a instrução de liberar no cadeado do endereço;
    - `NotReadableError` ou `TrackStartError`: câmera em uso por outro programa;
    - `NotFoundError`: nenhuma câmera ligada;
    - resto: a frase de hoje.
  - `prazoDoEnvioMs(bytes: number): number`: 120 s + 10 s por MB, com teto de 15 min.
- `GravadorDeVideo.tsx`:
  - em `comecar`, use `formatosPossiveis(typeof MediaRecorder === 'undefined' ? null : (m) => MediaRecorder.isTypeSupported(m))`
    e, com lista vazia, mostre o aviso de `:256`;
  - em `ligar`, use `deveAbrirOutraCamera` e `mensagemDeFalhaDaCamera`;
  - em `subir`, faça o `fetch` com `AbortController` e `prazoDoEnvioMs(blob.size)`. Estourou, vira
    `nao_subiu` com o link de cópia, igual à falha de rede de hoje;
  - `aoMudar` passa a enviar também `enviando: boolean`.
- `BancadaWeb.tsx:57,96-98,246`: guarde `enviando`. Com `enviando`, a mensagem é "Espere o vídeo terminar
  de subir antes de fechar." e o rodapé diz "Enviando o vídeo…".
- **Por quê:** a análise sempre pode ser fechada sem vídeo (RA-23). O prazo existe para **soltar** o
  botão, não para travar nada.
- **Não mude:** sem microfone, câmera lembrada, `x-upsert`, nome do arquivo, `PUT` sem cabeçalho de
  autorização.
- **Teste:** `src/components/admin/bancada/gravacao.test.ts` (novo):
  - `sem MediaRecorder não há formato para tentar`;
  - `isTypeSupported falso pula o formato e a opção sem mime fica por último`;
  - `navegador sem getUserMedia explica o que falta`;
  - `endereço http fora do localhost cita https`;
  - `permissão negada não fala de cabo`;
  - `câmera em uso diz que outro programa está usando`;
  - `só NotFoundError e OverconstrainedError abrem outra câmera`;
  - `prazo do envio cresce com o tamanho e para em 15 minutos`.

### 7. Mensagens certas nas ações da bancada

- `src/server/actions/admin/bancada.ts`:
  - `comPermissao` ganha um parâmetro com a frase de tabela ausente. Só `salvarCaixaNoPainel` usa
    `SEM_TABELA_CAIXAS`; as outras usam uma frase genérica: "O banco ainda não tem todas as tabelas. Rode npm run db:migrate."
  - Em `verificarCorrenteNoPainel` e `urlDoVideoNoPainel`, a gravação da trilha fica num `try/catch`
    próprio: loga `[admin]` e devolve o resultado mesmo assim. É o mesmo desenho de `auditarSemDerrubar`
    (`src/server/admin/bancada.ts:70-78`). A tentativa de gravar continua em toda chamada.
- **Teste:** `src/server/actions/admin/bancada-e-config.test.ts` (novo; **não** cresça `acoes.test.ts`).
  Copie os `vi.mock` de `acoes.test.ts:64-138` que as ações de bancada e config usam.
  - `verificar corrente devolve a conferência mesmo quando a linha da trilha falha`;
  - `assistir ao vídeo entrega a URL mesmo quando a linha da trilha falha`;
  - `tabela ausente ao fechar análise não fala da tabela de caixas`;
  - `tabela ausente ao cadastrar caixa fala da migration 025`;
  - `recusada, nenhuma dessas ações tenta gravar trilha`.

### 8. Configuração no Postgres embutido: faixa, publicação repetida e falha de leitura

- `src/server/admin/configuracao.ts` → `publicarDocumentoVigente`. Antes de chamar a porta, leia a
  configuração e a última versão publicada (`buscarDocumentoVigente`, de
  `src/server/db/repositories/documentos.ts:99`). Se `sha256Hex(conteudoDoDocumento(chave, gravados))`
  for igual ao hash dela, devolva `{ ok: true, mensagem: 'A <nome> já está publicada na versão X.' }`
  sem publicar. Idempotência não é trava: o resultado é o mesmo, sem versão repetida.
- **Novo** `src/server/config/config-no-banco.test.ts`, com **uma** instância de PGlite criada no próprio
  arquivo. Não use `bancoDeTeste()`: o cabeçalho de `src/server/admin/testing/pglite.ts` reserva essa
  instância para `banco.test.ts`. No `beforeAll`, faça `new PGlite()` (`@electric-sql/pglite`), escreva
  no teste um executor igual ao `executorPGlite` (uma transação por chamada) e rode `aplicarMigrations`
  (`@/server/db/migrar`); no `afterAll`, `db.close()`. Não edite nada em `src/server/admin/testing/`.

```ts
vi.mock('server-only', () => ({}))
const b = vi.hoisted(() => ({ executar: null as null | Executor }))
vi.mock('@/server/db/client', () => ({
  bancoConfigurado: () => b.executar !== null,
  executarNoBanco: (fn: Parameters<Executor>[0], o?: Parameters<Executor>[1]) => (b.executar as Executor)(fn, o),
}))
vi.mock('@/server/state', () => ({ mutateState: vi.fn(async () => ({ result: undefined })), getState: vi.fn() }))
```

  A porta de publicação do teste chama as funções reais: `garantirDocumentosVigentes` (repositório) e
  `publicarVersaoDocumento` (`src/server/documentos/publicar.ts`). Casos:
  - `sem nada gravado vale o padrão do código e configDoCliente leva TAXAS_PADRAO, DEPOSITO_MAX e SYNC_MS`;
  - `valor gravado inválido direto na tabela cai no padrão`: faça `UPDATE aurea.config_plataforma` com lixo;
  - `executor que lança devolve origem falha com o padrão, e documentosPendentesDeAceite devolve null`;
  - `conta sem aceite tem os três documentos pendentes; registrarAceitesFormais limpa a lista`;
  - `mudar a comissão publica a Tabela 1.1, confere fica true e só tabela_de_taxas volta a pendente`;
  - `o novo aceite grava a versão 1.1 e o hash publicado`;
  - `publicação que falha deixa confere false até publicarDocumentoVigente completar`;
  - `publicar a versão vigente duas vezes não cria 1.2`;
  - `tipo desligado do mercado sai de isNegociavel e tipo sem envio novo sai da lista de envio, pelo catálogo carregado`;
  - `limite de depósito e ciclo mudados chegam a configDoCliente`.

### 9. Logística: total visível e rastreio de retirada honesto

- `src/server/admin/logistica.ts`: `DadosDaLogistica` ganha `totalEnvios` e `totalRetiradas` (tamanho
  antes do corte).
- `PainelLogistica.tsx`:
  - acima de cada tabela, "Mostrando X de N — refine o filtro para ver o resto." quando houver corte
    (mesma frase de `TabelaDeMoedas.tsx:26`);
  - `Rastreio` recebe `origem: 'envio' | 'retirada'`. Para retirada sem rastreio gravado, o texto é
    "rastreio automático só acompanha envios". A causa vai ao relatório como observação para a frente B.
- **Teste:** `src/server/admin/logistica.test.ts` (novo). Mocke `@/server/state`,
  `@/server/shipping/retiradas` e `@/server/shipping/rastreios`.
  - `mais de 300 envios: corta a lista e informa o total`;
  - `retirada que falha vira aviso sem derrubar os envios`;
  - `rastreio só vem para o que está visível`.

### 10. Catálogo: ordem sugerida e mensagem certa

- `src/domain/admin/catalogo.ts`: `proximaOrdemDoCatalogo(tipos: readonly { ord: number }[]): number`,
  que devolve o maior `ord` + 10 (10 com lista vazia).
- `CatalogoDeMoedas.tsx`:
  - o formulário de criação nasce com `ord` preenchido por essa função;
  - a nota de `:100` separa os casos. Sem banco ou sem a migration 024: a frase de hoje. Com banco e
    catálogo vazio: "O catálogo ainda não foi semeado no banco — recarregue a aba; se continuar, veja o log `[admin] semeadura do catálogo falhou`."
  - Para isso, `configuracao/page.tsx:137` passa `origem={config.origem}`.
- **Teste:**
  - `src/domain/admin/catalogo.test.ts` (acrescentar): `próxima ordem é a maior mais 10, e 10 com catálogo vazio`;
  - `pagina.test.ts` da configuração: `catálogo vazio com banco não manda rodar migration`.

### 11. Guarda de 375px no CSS da C3

- **Novo** `src/styles/admin-c3-responsivo.test.ts`. Lê `src/styles/admin.css` do marcador
  `/* === C3 ·` até o fim e confere três coisas:
  - todo `minmax(` usa `min(100%,`;
  - não há `min-width:` nem `width:` em px acima de 343 (a tela de 375px menos as margens de 16px);
  - todo `.adm-…-btn`, `button` ou `input` com `min-height` declarado nesse bloco tem pelo menos 44px.
- **Por quê:** é a parte da conferência de celular que um teste consegue fazer. A visual fica no roteiro
  do Gabriel.
- Se o teste achar problema, corrija **só** dentro do bloco C3 de `admin.css`.

### 12. Documentação e riscos (no mesmo commit das mudanças correspondentes)

- `RISCOS_ASSUMIDOS.md`:
  - **RA-45** (linha do índice e bloco): o envio do vídeo tem prazo proporcional ao tamanho e solta o botão;
  - **RA-46** (linha e bloco): a faixa volta a cada lista nova de pendências, e publicar de novo o mesmo
    texto não cria versão;
  - não toque no RA-47 (é da E2);
  - RA-55, só se usado: entra no índice e no corpo em ordem numérica, logo depois do maior RA da base
    (RA-48). Conflito nesse arquivo é esperado e a integração resolve pela união; não tente prever.
- `ATALHOS.md`, só o bloco do RA desta branch:
  - `src/components/admin/bancada/ATALHOS.md` (RA-45);
  - `src/server/admin/ATALHOS.md` (blocos RA-45 e RA-46);
  - `src/server/config/ATALHOS.md` (bloco RA-46 apenas).
- `README.md`, só a linha nova:
  - `src/components/admin/bancada/README.md` (`gravacao.ts`);
  - `src/domain/admin/README.md` (`rotulos-de-taxa.ts`);
  - `src/components/README.md` (`shell/faixaDeAceite.ts`): junto da linha `shell/` (hoje `:10`), longe da
    linha `relatorios/` (`:20`), que a E3 apaga;
  - `src/server/config/README.md` (o teste no banco).

---

## Território

### Pode editar

| Caminho | Observação |
|---|---|
| `src/app/(admin)/admin/bancada/**`, `moedas/**`, `logistica/**`, `configuracao/**` | `page.tsx`, `README.md` e os `pagina.test.ts` novos |
| `src/components/admin/bancada/**`, `moedas/**`, `logistica/**`, `configuracao/**` | inclui `gravacao.ts` e `gravacao.test.ts` novos |
| `src/server/admin/bancada.ts`, `configuracao.ts`, `moedas.ts`, `logistica.ts`, `video.ts` | e `src/server/admin/logistica.test.ts` novo |
| `src/server/actions/admin/bancada.ts`, `config.ts` | e `src/server/actions/admin/bancada-e-config.test.ts` novo |
| `src/server/config/carregar.ts`, `documentos.ts`, `integracoes.ts`, `README.md` | e `config-no-banco.test.ts` novo |
| `src/domain/admin/bancada.ts`, `caixas.ts`, `moedas.ts`, `logistica.ts`, `configuracao.ts`, `catalogo.ts`, `integracoes.ts` e os `.test.ts` deles | só acrescentar casos nos testes existentes |
| `src/domain/admin/rotulos-de-taxa.ts` e `.test.ts` | novos |
| `src/app/taxas/page.tsx`, `src/app/taxas/pagina.test.ts`, `src/app/suporte/page.tsx`, `src/app/termos/page.tsx` | `termos` e `suporte` só se um teste mostrar defeito |
| `src/components/shell/faixaDeAceite.ts` e `.test.ts` | novos |
| `docs/execucao-pendencias/relatorios/E6.md` | novo |

### Compartilhados, com regra de convivência

| Arquivo | Regra |
|---|---|
| `src/app/(app)/vender/page.tsx` | Só as linhas `:376`, `:585` e um import. A E4 pode mexer no bloqueio de venda por inadimplência e também acrescenta import de `@/domain/…` antes de `@/domain/constants`; a integração resolve pela união |
| `src/components/shell/Topbar.tsx` | Só o bloco da faixa (`:150-230`) |
| `src/styles/admin.css` | Só o bloco `/* === C3 ·` (`:157` ao fim) |
| `RISCOS_ASSUMIDOS.md` | Só as linhas e blocos do RA-45, RA-46 e, se usado, RA-55 (índice e corpo em ordem numérica, depois do RA-48). Conflito é esperado e a integração resolve pela união |
| `src/server/admin/ATALHOS.md` | Só os blocos RA-45 e RA-46 (a E5 pode acrescentar RA-54) |
| `src/server/config/ATALHOS.md` | Só o bloco RA-46 (a E2 edita o RA-47); não tocar no `---` que separa os dois. RA-55, se usado, entra depois de "O que NÃO é atalho" |
| `src/components/README.md` | Só acrescentar a linha de `shell/faixaDeAceite.ts`, logo abaixo da linha `shell/` (`:10`). Não encostar na linha `relatorios/` (`:20`), que a E3 apaga |
| `src/domain/admin/README.md` | Só acrescentar a linha do arquivo novo |
| `src/server/admin/portas.ts` | Não deve precisar. Se precisar, só `portaDaBancadaDoServidor`, `portaDeVideoDoServidor` e `portaDePublicacaoDoServidor` |

### Não pode editar

| Caminho | Dono |
|---|---|
| `src/server/estacao/analise.ts`, `src/server/payments/conciliacao.ts` | E2 (em teste, só `vi.mock`) |
| `src/components/relatorios/`, `src/server/actions/contabil.ts`, `src/server/relatorios/acesso.ts` | E3 |
| `src/app/(app)/conta/extrato/page.tsx` (inclui o texto fixo de `:242`), `src/app/(app)/envios/page.tsx`, `src/app/(app)/retirada/**`, `src/components/recibo/**`, `src/server/actions/sell.ts`, `custody.ts`, `src/server/custodia/**` | E4 |
| `src/server/auth/**`, `src/app/entrar/**`, `src/server/session.ts`, `src/server/db/diff.ts`, `src/app/api/state/route.ts`, `src/app/(app)/layout.tsx` | E1 |
| `src/components/providers/AppProvider.tsx` | não editar; o bloco do 401 (`:211-216`) é da E1. A tarefa 4 só usa `run` e `aceitesPendentes`, que `useApp()` já entrega |
| `vitest.config.mts` | ninguém edita: o bloco `oxc` já está na base |
| `src/server/admin/testing/**` | ninguém edita; o teste da tarefa 8 cria a própria instância de PGlite |
| `src/app/painel/**`, `src/components/admin/entrada/**`, `src/server/admin/acesso.ts`, `src/app/(admin)/admin/page.tsx`, `layout.tsx`, `error.tsx`, `README.md`, `resultados/`, `equipe/`, `cs/`, `usuarios/` | E5 |
| `src/components/admin/AdminProvider.tsx`, `AdminSidebar.tsx`, `AdminTopbar.tsx`, `Blocos.tsx`, `BotaoAcao.tsx`, `SeletorPeriodo.tsx`, `formatos.ts`, `navegacao.tsx`, `inicio/`, `resultados/`, `equipe/`, `cs/`, `usuarios/` | E5 |
| `src/server/admin/usuarios.ts`, `cs.ts`, `rbac.ts`, `ficha.ts`, `situacao.ts`, `identidade.ts`, `atendimento.ts` | E5 |
| `src/server/actions/admin/acoes.test.ts`, `src/server/admin/banco.test.ts` | ninguém cresce; teste novo vai em arquivo novo |
| `docs/finalizacoes/**`, `docs/publish_docs/**` | E7 e integração |
| `src/domain/constants.ts`, `fees.ts`, `market.ts`, `types.ts`, `analise.ts`, `hash.ts`, `ledger.ts`, `src/domain/documentos-legais/**`, `src/domain/admin/documentos.ts` | superfície protegida e hash dos documentos |
| `src/server/documentos/**`, `src/server/shipping/**`, `src/server/db/migrations/**`, `src/server/db/repositories/**` | A3, B e banco (só leitura) |
| `package.json`, `package-lock.json`, `CLAUDE.md`, `AGENTS.md` | nenhuma dependência nova: `react-dom/server` já existe |

---

## Testes exigidos

| Arquivo | Novo ou alterado | O que prova |
|---|---|---|
| `src/app/(admin)/admin/configuracao/pagina.test.ts` | novo | guarda da página, formulário só leitura, botão de publicar só com permissão e documento divergente, aba inválida, sem banco, integrações sem valor secreto, catálogo vazio com banco |
| `src/app/(admin)/admin/bancada/pagina.test.ts` | novo | guarda, fila, fila vazia, cadastro de caixa só com `bancada.analisar` |
| `src/app/(admin)/admin/moedas/pagina.test.ts` | novo | guarda das duas páginas, acervo do seed, moeda inexistente, link do recibo só para o dono |
| `src/app/(admin)/admin/logistica/pagina.test.ts` | novo | guarda, prazos da configuração nos cartões, etiqueta só com permissão, filtro `ver` |
| `src/app/taxas/pagina.test.ts` | novo | percentual com duas casas igual ao contrato |
| `src/domain/admin/rotulos-de-taxa.test.ts` | novo | mesmo percentual do contrato de 0 a 2000 bp; rótulo com a tabela padrão |
| `src/components/shell/faixaDeAceite.test.ts` | novo | faixa volta com lista nova depois de dispensar ou aceitar; regra sem banco |
| `src/components/admin/bancada/gravacao.test.ts` | novo | sem `MediaRecorder`, sem câmera, permissão negada, câmera em uso, prazo do envio |
| `src/server/actions/admin/bancada-e-config.test.ts` | novo | trilha que falha não esconde resultado; frase de tabela ausente certa |
| `src/server/config/config-no-banco.test.ts` | novo (1 PGlite) | padrão, valor inválido, falha de leitura, pendência de aceite, publicação 1.1, aceite da 1.1, publicação que falha, publicação repetida, catálogo e limites no cliente |
| `src/server/admin/logistica.test.ts` | novo | corte com total, retirada indisponível, rastreio só do visível |
| `src/domain/admin/catalogo.test.ts` | alterado (só acrescenta) | próxima ordem |
| `src/styles/admin-c3-responsivo.test.ts` | novo | bloco C3 cabe em 375px e mantém 44px |

Rodar um por vez enquanto desenvolve, com `npx vitest run <caminho entre aspas>`. No fim, a suíte inteira,
com o servidor de desenvolvimento deste worktree (porta 3106) parado. Compare a contagem de arquivos com
a base mais os novos desta branch: 86 + 12 = 98. Arquivo que "sumiu" da contagem é worker morto (o
`config-no-banco.test.ts` sobe um PGlite próprio): rode esse arquivo sozinho com
`npx vitest run <arquivo>` e registre as duas execuções no relatório.

---

## Regras que valem nesta branch

- **Palavras proibidas** em texto de tela, comentário, nome de arquivo, teste, commit e relatório: token,
  NFT, cripto (inclusive dentro de outra palavra), ativo digital, ativo, investimento, investidor,
  corretora, rentabilidade, retorno. O termo é "recibo"; o objeto é "moeda" ou "item". Nas frases novas,
  escreva "aceita envio novo" em vez de nomear o campo booleano do catálogo.
- **Nenhuma trava que o Gabriel não pediu.** Nada de feature flag, gate de ambiente, confirmação
  obrigatória ou modo fechado por padrão.
  - A faixa de aceite continua sem bloquear operação.
  - O prazo do envio de vídeo **solta** o botão, não o prende.
  - Idempotência na publicação devolve sucesso.
  - Falha de leitura cai no comportamento padrão.
- **Nada tranca o Gabriel nem a equipe para fora.** Não mexa em `src/server/admin/acesso.ts`. Checagem
  nova que falhar responde "liberado".
- **Dinheiro sempre em centavos inteiros.** Os rótulos formatam com `brl()`, nunca com conta em `float`
  gravada.
- **A fórmula do hash não muda.** Nem a da análise (os quinze campos de `estacao/CONTRATO.md` e o vetor de
  `src/domain/analise.test.ts`), nem a do ledger (`src/domain/hash.ts`, `ledger.ts`), nem o texto de
  `src/domain/admin/documentos.ts`. Conferir: `git diff origin/main --stat -- src/domain/analise.ts src/domain/hash.ts src/domain/ledger.ts src/domain/admin/documentos.ts src/domain/documentos-legais estacao`
  não mostra nada.
- **Nada de `@/server/*` em Client Component.** `gravacao.ts`, `faixaDeAceite.ts` e `rotulos-de-taxa.ts`
  são puros. `vender/page.tsx` importa só de `@/domain/admin/rotulos-de-taxa`.
- **Server Action do painel confere a permissão por conta própria** e tenta gravar `admin.<area>.<verbo>`
  em toda chamada. Na tarefa 7 a trilha fica em `try/catch`, mas nunca deixa de ser tentada.
- **Tabelas de trilha só recebem INSERT** (`audit_log`, `config_historico`, `eventos_uso`, `notas`). O
  `UPDATE` com lixo do teste da tarefa 8 é em `config_plataforma`, que não é trilha.
- **Comentários em português**, explicando o porquê, com o bloco no topo de cada arquivo novo dizendo que
  armadilha ele evita. Arquivo novo em pasta existente ganha linha no `README.md` da pasta.
- **Atalho novo** entra em `RISCOS_ASSUMIDOS.md` (RA-55) **e** no `ATALHOS.md` da pasta, no mesmo commit.
- **Não mexer em DNS, e-mail ou domínio.** Não criar conta em serviço externo nem gerar credencial.
- **Nunca criar rota, script ou cookie que pule autenticação.** Tela logada se confere por teste com
  membro simulado ou pelo roteiro do Gabriel.
- **Ambiente:** Windows, PowerShell 5.1. Não há `&&`: use `;` e `if ($?) { … }`. Caminho com parênteses
  vai entre aspas. O repositório é público de propósito.

---

## O que NÃO fazer

- Não editar `src/server/estacao/analise.ts` (E2) nem mudar o que a bancada web manda para ele.
- Não trocar o texto de `/conta/extrato` (E4) nem sugerir `rotuloDaComissao` para ele: a E4 reescreve
  essa nota sem número.
- Não instalar `@testing-library/*`, `jsdom` nem `happy-dom`, e não editar `vitest.config.mts`.
- Não crescer `acoes.test.ts` nem `banco.test.ts`. Não subir mais de uma instância de PGlite por arquivo
  novo, e só `config-no-banco.test.ts` sobe uma, criada no próprio arquivo (sem `bancoDeTeste()`).
- Não mexer no bloco do 401 de `AppProvider.tsx` (E1).
- Não mudar taxa em produção pelo roteiro desta branch: a conferência do percentual com duas casas pela
  tela é do roteiro consolidado da integração, que muda percentual e fixa numa mesma gravação e depois
  volta ao padrão.
- Não rodar o servidor de desenvolvimento na porta 3000.
- Não "consertar" `/recibos/[coinId]` para abrir moeda alheia: a restrição é deliberada.
- Não publicar documento na leitura da página, nem forçar aceite para operar.
- Não guardar rascunho da bancada em `localStorage` nem gravar vídeo em partes: o RA-45 fica como está,
  só com o prazo do envio.
- Não mudar `TAXAS_PADRAO`, `COIN_TYPES`, `DEPOSITO_MAX` nem os intervalos de `DEFINICOES_CONFIG`.
- Não mexer no job de rastreio (`src/server/shipping/rastreios.ts`): a retirada sem rastreio vai como
  observação para a frente B.
- Não fazer merge na main.

---

## Entrega

1. **Commits**, sem acento, cada um terminando com a linha de coautoria do agente, se houver (por exemplo
   `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`):
   - `Testes renderizam as telas da C3 com membro simulado` (tarefa 2; a tarefa 1 não gera commit)
   - `Tabela de Taxas e rotulo da venda mostram o percentual com duas casas` (tarefa 3)
   - `Faixa de aceite volta quando sai versao nova e mostra falha do aceite` (tarefa 4, RA-46)
   - `Ficha da moeda so liga o recibo do app para o dono` (tarefa 5)
   - `Bancada web explica camera e gravador ausentes e da prazo ao envio do video` (tarefas 6 e 7, RA-45)
   - `Configuracao testada no Postgres embutido e publicacao repetida sem versao nova` (tarefa 8, RA-46)
   - `Logistica mostra o total cortado e o rastreio de retirada; catalogo sugere a ordem` (tarefas 9 e 10)
   - `Guarda de 375px no bloco C3 do admin.css e documentacao` (tarefas 11 e 12)
2. **Antes de cada push**, no worktree e com o servidor de desenvolvimento dele parado:

```powershell
npm run typecheck; if ($?) { npm run lint }; if ($?) { npm test }; if ($?) { npm run build }
```
```powershell
git push -u origin exec/e6-qa-painel-bancada-moedas-logistica-configuracao
```

3. **Relatório** em `docs/execucao-pendencias/relatorios/E6.md`, com:
   - o que foi feito, tarefa por tarefa, com caminho e linha;
   - testes: contagem de partida (86 arquivos, 741 passando, 1 pulado) e de chegada (esperado: 98
     arquivos), a lista dos arquivos novos com o número de casos e, se algum arquivo sumiu da contagem,
     a execução dele sozinho;
   - o que foi conferido e como. Teste automatizado, comando `Select-String` dos itens 2 e 3 do Objetivo,
     `git diff --stat` da regra do hash. Diga explicitamente que nenhuma tela foi aberta logada;
   - riscos: RA-45 e RA-46 atualizados; RA-55 e migration 029 "não usados", se for o caso;
   - observações para outras frentes:
     - frente B: o rastreio de retirada não é gravado pelo job (a E6 só corrige o texto da tela);
   - passos manuais com valor literal completo (a seção abaixo);
   - a última linha: `E6 pronta para integração — <hash do último commit>`.

---

## Passos manuais que sobram para o Gabriel

Nenhuma variável de ambiente nova. Ficam só as conferências que um teste não faz: câmera de verdade,
Storage de verdade e o olho no celular. Entrar pela entrada própria do painel:

```
https://aurea-custodia-mvp.vercel.app/painel
```

1. **Bancada com câmera real, num envio de teste.** Fechar a análise em produção emite recibo e grava a
   análise encadeada por hash, sem volta. Por isso o passo usa só um envio criado para ele, por uma conta
   de demonstração, e nunca um envio que já esteja na fila.
   - **Criar o envio de teste.** Numa janela anônima (para não trocar a sessão do painel), abrir o endereço
     abaixo e entrar com `solares@testeaurea.com.br` e a senha `12345678`.

```
https://aurea-custodia-mvp.vercel.app/envios
```

   - Escolher quantidade `1`, anexar qualquer foto em "Foto do item" e clicar em **Continuar** (se abrir o
     cadastro, preencher com dados fictícios da conta de demonstração). No passo seguinte, marcar a
     confirmação e clicar em **Gerar protocolo**. **Anotar o protocolo** que aparece (formato
     `RO-ENV-0000`) e o nome da conta, `Solares`.
   - **Não** clicar em "Pagar depois": pagar a fatura de custódia no próprio fluxo, pelo simulador de
     pagamento, para a conta de demonstração não ficar com fatura pendente. Se ela ficar pendente mesmo
     assim, quitar no fim deste roteiro (último item do passo 1). Depois, clicar em **Marcar como postado (simulado)**, **Continuar para
     acompanhamento** e **uma vez** em **Simular avanço de etapa (ambiente de teste)**. Parar quando a
     linha do tempo mostrar "Recebido pela custódia": outro clique leva a "Em análise física", e a bancada
     não abre análise nessa etapa.
   - **Analisar.** Na janela normal, logado no painel, abrir o endereço abaixo no Chrome ou no Edge e
     escolher **só** o envio com o protocolo anotado, da conta Solares. Permitir a câmera, gravar 5
     segundos, parar e esperar "Gravação enviada para o armazenamento". Depois, **Fechar análise**.

```
https://aurea-custodia-mvp.vercel.app/admin/bancada
```

   - **Quitar a fatura, se ficou pendente.** No painel, abrir a ficha da conta de demonstração no endereço
     abaixo, ir à aba **Financeiro** e clicar em **Quitar com o saldo**. A conta não pode terminar o
     roteiro com fatura de custódia pendente.

```
https://aurea-custodia-mvp.vercel.app/admin/usuarios/solares@testeaurea.com.br
```

2. **Permissão negada.** Na mesma tela, bloquear a câmera no cadeado da barra de endereço e recarregar.
   A mensagem precisa falar de permissão, não de cabo.
3. **Vídeo na ficha.** Abrir pela lista abaixo a moeda do protocolo anotado no passo 1 (conta Solares) e
   clicar em **Assistir ao vídeo**. Como a moeda é de outra conta, o botão "Ver como o cliente vê" não
   aparece.

```
https://aurea-custodia-mvp.vercel.app/admin/moedas
```

4. **Taxa com duas casas.** Fica no roteiro consolidado da integração
   (`docs/execucao-pendencias/INTEGRACAO.md`), que numa **mesma gravação** muda o percentual da comissão
   para `1,25` e a parte fixa para `1,50`, confere a Tabela de Taxas e a tela de venda, e depois volta
   ao padrão. Cada Salvar na aba Taxas publica versão nova da Tabela de Taxas e reabre a faixa de aceite
   para todas as contas; por isso a integração junta tudo numa gravação só, e este roteiro não salva
   nada em `/admin/configuracao`.

5. **Celular (375px).** No celular, ou no Chrome com F12 → ícone de celular → largura 375, abrir as quatro
   telas. Nenhuma pode ter rolagem para o lado fora das tabelas, e os botões precisam ser fáceis de tocar.

```
https://aurea-custodia-mvp.vercel.app/admin/bancada
```
```
https://aurea-custodia-mvp.vercel.app/admin/moedas
```
```
https://aurea-custodia-mvp.vercel.app/admin/logistica
```
```
https://aurea-custodia-mvp.vercel.app/admin/configuracao
```
