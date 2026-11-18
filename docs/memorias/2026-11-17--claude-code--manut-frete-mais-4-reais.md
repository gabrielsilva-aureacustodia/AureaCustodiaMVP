# Frete: acréscimo de R$ 4,00 (frente K) — memória do agente

- **Data:** 2026-11-18 · **Agente:** claude-code · **Projeto/branch:** manut-frete-mais-4-reais (`claude/manut-frete-mais-4-c9a96a`, base main = 0f55132)

## 1. Estado em uma tela
O frete que o cliente paga no envio passou a ser **preço do contrato dos Correios + acréscimo por objeto postado** (R$ 4,00 de padrão). O acréscimo é o parâmetro `acrescimoDoFreteCents` no grupo **Operacional** de `/admin/configuracao`, com histórico. Soma dentro de `calcularFreteCorreios` (`src/lib/shipping/correios.ts`); `Envio.frete.valorCents` é o **total cobrado** e o contrato fica à parte em `valorContratoCents` / `acrescimoCents`. Tudo a jusante (saldo, Pix, cartão, ledger `frete`, estorno do cancelamento da frente H) lê `valorCents` e continua certo sem mudar. A tela do envio diz "O valor do frete inclui R$ 4,00 de taxa de postagem" (texto a aprovar pelo Gabriel). **Não existe:** NFS-e do acréscimo, tratamento próprio na DRE, acréscimo na retirada (ela não cota frete dos Correios).

## 2. Decisões e o porquê
- Parâmetro **operacional, não taxa** — a ficha proíbe tocar `TAXAS_PADRAO`/`fees.ts`; no grupo `taxas` ele publicaria versão nova da Tabela de Taxas, e frete não é taxa de negociação.
- Soma **dentro de `lib/shipping`** — a estimativa do passo 1 (`cotarFreteEnvio`), o frete que se paga e a tela nascem do mesmo número, sem mudar nenhuma Server Action.
- `Envio.frete.valorCents` = **total** (contrato H→K: o estorno devolve o total); `envios.frete` é jsonb, então **sem migration** (a 058 não foi usada). `config_plataforma.chave` é texto livre: também sem migration.
- **Retirada não ganha acréscimo**: ela paga taxa fixa (R$ 50/R$ 180, editável no painel) e o frete dela vai direto para a fatura do contrato; nenhuma ação cota a saída. Se o Rogério quis R$ 4 a mais na retirada, é mudar a taxa pela tela. (D5 a confirmar com o Gabriel.)
- **Fiscal sem inventar:** o acréscimo não gera NFS-e; a DRE o soma, como todo frete, em "frete repassado" (fora do resultado) — pergunta nº 21 em `docs/fiscal-contabil/LACUNAS_E_PERGUNTAS.md`.
- Exceções ao Do-not-touch da ficha, declaradas: `src/server/actions/custody.ts` (2 linhas: `CotacaoFreteDoEnvio.acrescimoCents?`) porque a tela precisa do valor congelado na cotação; `src/domain/types.ts` (2 campos opcionais em `FreteEnvio`, superfície protegida); `envios/page.tsx` e `ResumoDoPagamentoDoEnvio.tsx` porque "sem margem do Real Olímpico" passou a ser falso.

## 3. O que aprendi (armadilhas, comandos, caminhos)
- Testes que passam por `cotarFreteDoServidor` com a configuração real agora leem o acréscimo (padrão 400): `src/server/actions/frete-envio.test.ts` e `primeiro-mes-no-envio-recusa.test.ts` ganharam um dublê de `carregarParametrosOperacionais` com acréscimo **0** para seguirem provando o frete do contrato; o bloco "acréscimo do frete" do fim do primeiro o liga em R$ 4,00.
- `acrescimo-vigente.ts` usa `import()` dinâmico de `@/server/config/carregar`: quem informa `acrescimoCents` à mão nunca carrega a camada de banco.
- Rodar teste sem estourar a memória: `$env:VITE_CONFIG_NATIVE_IGNORE_WARNING='true'; npx vitest run <um arquivo>` (um por vez).
- O texto público da Tabela de Taxas v1 (`src/domain/documentos-legais/tabela-de-taxas-v1.ts`, §1.2) ainda diz que o frete "é escolhido e pago diretamente pelo cliente nos Correios" — já era falso desde 22/10 (frete pago no site) e fica mais distante com o acréscimo. É documento legal versionado: decisão do Gabriel, não mexi.

## 4. Como continuar (próximos passos exatos)
1. Gabriel aprova (ou muda) o texto da tela e confirma D5 (por objeto, só no envio).
2. Conferência visual **em produção**, depois do deploy do Controle: `/envios`, passo do frete — frete = contrato + R$ 4,00, frase embaixo, total = frete + 1º mês. Mudar o valor em `/admin/configuracao` → Operacional e ver a cotação seguinte mudar.
3. Contador responde a pergunta 21; só então decidir NFS-e/DRE do acréscimo (ledger/DRE/NFS-e estão fora da K). O contrato e o acréscimo já estão separados em `Envio.frete` para isso.

## 5. Pendências e riscos
- **Frete já cotado e não pago** antes do deploy mantém o valor antigo (sem o acréscimo) até a cotação ser refeita (24 h ou nova abertura da tela).
- DRE: o acréscimo entra em "frete repassado" com a observação "repassada aos Correios" — imprecisa para os R$ 4,00; ajustar depois da resposta do contador (`dre.ts`, fora da K).
- Não rodei: `npm run build`, typecheck completo, suíte inteira, `banco.test.ts` (PGlite) — memória do computador; é do Controle no merge.

## 6. Ligações
`docs/diario/execucoes/2026-11-17--manut-k-frete-mais-4-reais--MD_EXECUCAO.md` · `src/lib/shipping/README.md` (seção "O acréscimo do frete") · `docs/fiscal-contabil/LACUNAS_E_PERGUNTAS.md` (pergunta 21) · [[2026-11-17--claude-code--manut-cancelar-envio-e-nota]] (o estorno devolve o total) · [[2026-11-17--claude-code--manut-primeiro-mes-no-envio]] (frete + 1º mês no mesmo pagamento).
