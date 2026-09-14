# Diário de Bordo — Agente A (Mercado e Termos)

Rodada de Finalizações — 13/09/2026  
Branch base: `feat/a-mercado-e-termos`  
Worktree isolada: `C:\dev\AureaCustodiaMVP-mercado`

---

## A1 — Comissão dos Dois Lados no Mercado

- **Status**: Concluída e integrada
- **Branch de trabalho**: `feat/a1-comissao-dois-lados` (commit `2181d41`)
- **Merge commit na base**: `5b00d3b`
- **Anotação**: A1 pronta para main — merge 5b00d3b

### Resumo das Entregas de A1
1. **Tabela Única de Taxas (`src/domain/fees.ts`)**:
   - `TAXAS_PADRAO`: 50 bp (0,5%) + R$ 1,00/moeda para comprador e para vendedor.
   - Trade canônico (1 moeda a R$ 200,00): comprador paga R$ 202,00, vendedor recebe R$ 198,00, Áurea retém R$ 4,00.
   - `comissaoPorMoeda`, `custoDeCompraPorMoeda`, `liquidoDeVendaPorMoeda`.
2. **Motor de Mercado (`src/domain/market.ts`)**:
   - Débito do comprador: `price + feeComprador`.
   - Crédito do vendedor: `price - feeVendedor`.
   - Verificação de saldo suficiente incluindo a comissão do comprador.
   - Trade grava `feeComprador` e `feeVendedor`.
3. **Persistência e Migração (`src/server/db/`)**:
   - Migration `014_comissao_dois_lados.sql` criada com `fee_comprador`, `fee_vendedor` e constraint `trades_fee_soma_check`.
   - Repositório, normalização e diff atualizados.
4. **Ledger e Extrato (`src/domain/ledger.ts`, `statement.ts`)**:
   - 4 lançamentos por trade: `compra` (-30000), `comissao` (-250), `venda` (+30000), `comissao` (-250).
   - Extrato do usuário lê comissão congelada direto do trade (resolução CD-09 e encerramento RA-06).
5. **Relatórios e Interface**:
   - Colunas adicionadas no relatório de negociações: `Comissao_Comprador`, `Comissao_Vendedor`, `Comissao_Total`.
   - Previews de compra (`/mercado`) e venda (`/vender`) atualizados com detalhes claros de comissão.
6. **Testes e Build**:
   - 48 arquivos de teste passando (355 testes OK, 1 skipped de banco real).
   - `npm run typecheck` e `npm run build` passando com zero erros.

---

## A2 — Fila Justa por Ordem de Cadastro, Edição de Preço e Histórico de Negociações (Decisão F-3)

- **Status**: Concluída e integrada
- **Branch de trabalho**: `feat/a2-livro-de-ordens` (commit `636fd83`)
- **Merge commit na base**: `45ddb37`
- **Anotação**: A2 pronta para main — merge 45ddb37

### Resumo das Entregas de A2
1. **Fila Justa por Ordem de Chegada (`prioridade_em`)**:
   - `aurea.ofertas` agora inclui a coluna `prioridade_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()` (migration `015_fila_justa_ofertas.sql`).
   - Na criação inicial da oferta, `prioridade_em = criada_em`.
   - Ordenação estrita no livro: `preco ASC, prioridade_em ASC` para venda; `preco DESC, prioridade_em ASC` para compra.
2. **Edição de Preço com Perda de Fila**:
   - O vendedor pode alterar o preço de uma oferta ativa sem cancelamento manual prévio (`editarPrecoOferta`).
   - Se o preço for alterado, a oferta vai para o fim da fila daquele novo preço (`prioridade_em = clock_timestamp()`).
   - Se houver ordem de compra compatível ao novo preço, o casamento é executado imediatamente.
3. **Casamento Automático de Ordens no Banco**:
   - Rotina transacional atômica no banco (`casarOfertasNoBanco`) em `src/server/db/livro-de-ordens.ts`.
   - Bloqueio seletivo (`FOR UPDATE`) para evitar concorrência e race condition.
   - Liquidação contábil simultânea (4 lançamentos no ledger, baixa de custódia e gravação de trade com `feeComprador` e `feeVendedor`).
4. **Histórico Público de Negociações no Mercado**:
   - Tabela e feed em `/mercado` exibindo últimas negociações realizadas: data/hora, quantidade, preço unitário e volume total (sem expor a identidade dos clientes).
5. **Testes**:
   - Nova suíte de testes de integração `src/server/db/livro-de-ordens.test.ts` (5 testes passando cobrindo casamento direto, ordem inversa, desempate por prioridade e perda de fila ao mudar preço).

---

## A3 — Termos de Uso Oficiais, Tabela de Taxas, SAC e Prova Jurídica de Aceite

- **Status**: Concluída e integrada
- **Branch de trabalho**: `feat/a3-termos-oficiais` (commit `b032384`)
- **Merge commit na base**: `16b1b56`
- **Anotação**: A3 pronta para main — merge 16b1b56 — encerramento do RA-03 e abertura de RA-25 / RA-26

### Resumo das Entregas de A3
1. **Domínio Estruturado dos Documentos Legais (`src/domain/documentos-legais/`)**:
   - `termos-de-uso-v1.ts`: Transcrição integral da minuta oficial do advogado (`2026-09-13_minuta_termos_de_uso_v1`), estruturada em 17 capítulos, preâmbulo, resumo em 6 pontos, definições, marketplace, custódia e SLAs.
   - `politica-privacidade-v1.ts`: Política de privacidade completa v1.0, bases legais LGPD, direitos do titular e tratamento de dados cadastrais/pagamento.
   - `tabela-de-taxas-v1.ts`: Tabela oficial de taxas v1.0 refletindo `TAXAS_PADRAO` (50 bp + R$ 1,00/moeda nos dois lados), com cálculo dinâmico da operação canônica de R$ 200,00 e menção ao frete dos Correios com seguro.
   - `clausula-arbitragem-v1.ts`: Cláusula compromissória de arbitragem (Lei 9.307/1996, art. 4º, § 2º) destacada em negrito no Capítulo 14.4 dos termos e disponível para aceite destacado e autônomo.
2. **Normalização Canônica e Hash SHA-256 Congelado**:
   - Normalização canônica determinística (`canonico.ts`) com salt e formatação uniforme de preâmbulos, capítulos, artigos, parágrafos, incisos e alíneas.
   - Teste de vetor congelado garantindo o hash imutável dos Termos v1.0: `eeffba3c0218116aedc8b559d82003c0584a1060e12d344ce5d74d72be855421`.
3. **Persistência de Documentos e Cadeia de Prova de Aceite (`src/server/db/`)**:
   - Migration `016_documentos_e_aceites.sql`:
     - Tabela `aurea.documentos_legais`: armazena documentos estruturados com versão, chave, hash canônico e flag `vigente`.
     - Tabela `aurea.aceites_documentos`: log append-only imutável de aceites formais com chave de usuário, chave do documento, versão, hash canônico, hash anterior e hash do aceite (cadeia de blocos criptográfica a partir de Gênesis de 64 zeros), IP de conexão, User-Agent e carimbo ISO-8601 UTC.
     - Políticas RLS rigorosas: usuários consultam apenas seus próprios aceites; administradores auditam todos os aceites; inserções validadas pelo repositório.
   - Repositórios `src/server/db/repositories/documentos.ts` e `aceites.ts`.
4. **Camada de Aplicação e Server Actions (`src/server/`)**:
   - `documentos/aceites.ts`: `registrarAceitesFormais`, `listarAceitesDoUsuario`, `obterComprovantePorId`, `verificarSeUsuarioAceitouDocumento`.
   - `actions/legal.ts`: `aceitarTermosVigentes`, `assinarClausulaArbitragem`, `listarMeusAceites`, `obterComprovanteAceite`, `verificarStatusArbitragem`.
   - `actions/auth.ts` & `app/entrar/callback/route.ts`: captura de IP, User-Agent e registro automático e não bloqueante dos aceites nos fluxos de registro por e-mail e OAuth Google.
5. **Páginas Públicas e Interface do Usuário**:
   - `/termos`: Renderização completa dos 17 capítulos dos Termos de Uso v1.0, com preâmbulo, sumário executivo, negrito explícito no Capítulo 14.4 (arbitragem), links cruzados dinâmicos para `/taxas` e `/suporte`, pílula com hash SHA-256 canônico e botão de impressão.
   - `/privacidade`: Política de privacidade v1.0 sem aviso de rascunho, estruturada com hash canônico e botão de impressão.
   - `/taxas`: Tabela de taxas oficial lendo do domínio (`TAXAS_PADRAO`), exibindo a fórmula da comissão, simulação dinâmica com a moeda canônica a R$ 200,00 e aviso de seguro e frete dos Correios.
   - `/suporte`: Página oficial do SAC disponibilizando `suporte@aureacustodia.com.br`, horário de atendimento, SLA de até 5 dias úteis e transparência quanto aos canais em homologação (RA-26).
   - `/cadastrar`: Card informativo ("sign-in wrap") com links para `/termos`, `/privacidade` e `/taxas`; card recolhível opcional e desmarcado para assinatura expressa da cláusula compromissória de arbitragem (não bloqueante).
   - `Topbar.tsx`: Banner superior discreto, dismissível e não bloqueante alertando usuários logados sobre a vigência dos Termos v1.0.
   - `/conta/configuracoes`: Painel "Documentos e Aceites" listando o histórico de documentos aceitos pelo usuário com data, versão, hash, link para emissão de comprovante e card para adesão à arbitragem se ainda não assinada.
   - `/conta/aceites/[id]`: Folha de comprovante formal auditável e imprimível com estilo `@media print`, exibindo dados do titular, hash canônico, elo anterior da cadeia, hash SHA-256 do aceite, carimbo temporal UTC, IP e User-Agent.
6. **Regras de Negócio e Riscos**:
   - **Encerramento do RA-03**: Minutas oficiais homologadas, versão 1.0 vigente, cadeia de custódia de dados e prova formal de aceite.
   - **Abertura do RA-25**: Prazos operacionais provisórios dos Termos v1.0 documentados.
   - **Abertura do RA-26**: SAC operado provisoriamente via e-mail corporativo documentado.
   - **Regra de Gabriel (13/09/2026)**: O aceite é não bloqueante — a ausência de aceite não impede cadastro nem operações no mercado de demonstração.
7. **Bateria de Verificação**:
   - 52 arquivos de teste passando (385 testes OK, 1 skipped de banco real).
   - `npm run typecheck` com 0 erros.
   - `npm run build` Next.js compilando todas as 28 rotas estáticas e dinâmicas com sucesso.
