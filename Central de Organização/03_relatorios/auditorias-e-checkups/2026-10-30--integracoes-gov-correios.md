# Auditoria das integrações Gov e Correios (30/10/2026)

Método: leitura do código em `origin/main` (bad056b) e dos commits desde 15/09. Nenhuma chamada a API externa ou a produção. Variáveis da Vercel: **não conferido** (sem acesso); só nomes aparecem aqui.

## Resumo executivo
- **Correios (CWS, contrato novo):** integrada nos fluxos do cliente e do admin. Todo caminho usa o cliente novo (`src/lib/shipping/cws/*`); não há rastro de SIGEP, rastreio público ou WebService antigo no código. A falha que deixava a moeda fora do balcão (entrega não avançava o envio) foi corrigida no PR #7; o cron agora fecha sem `CRON_SECRET` (PR #9).
- **Gov:** há duas APIs. (1) **Sefin Nacional / NFS-e** (`src/server/nfse/`), integrada com certificado e-CNPJ A1, fila no painel e reenvio pelo cron diário. (2) **ViaCEP** (não é do Gov, mas entra no cadastro): CEP e código IBGE do município exigido pela nota. Não há login gov.br nem consulta de CPF/CNPJ à Receita (validação é local).
- **Corrigido agora:** a NFS-e não aparecia na aba Integrações do admin nem no `.env.example`; o texto de "Tarefas agendadas" ainda dizia "mensal".
- **Só documentado:** testes de `src/server/nfse/`, código sem tela (`advanceAnalysis`), coexistência do "informar postagem" manual com a pré-postagem, Vercel não verificada.

## Tabela por ponto

| Onde | API | Cliente novo? | Env vars (nomes) | Erros tratados | Testes | Situação |
|---|---|---|---|---|---|---|
| Cliente: cotação de frete no envio (`custody.ts` `cotarFreteEnvio/cotarFreteDoEnvio`, `frete-envio.ts`) | CWS preço/prazo | Sim (`calcularFreteCorreios` → `cotarServico`) | `CORREIOS_USUARIO`, `_CODIGO_ACESSO`, `_CARTAO_POSTAGEM`, `_CONTRATO`, `_DR` | Falha dos Correios sobe como erro (não cai mais na tabela); sem contrato = tabela marcada `origem: 'tabela'` | `cws.test.ts`, `correios.test.ts` | OK |
| Cliente: pagar frete e emitir pré-postagem (`frete-envio.ts`, `emitirEtiquetaDoEnvio`) | CWS pré-postagem | Sim | idem | Cancelamento da pré-postagem no desfazer; checagem de situação (`consultarPrePostagem`) | `cws.test.ts` | OK |
| Cliente: etiqueta PDF (`/api/envios/etiqueta/[protocolo]`) | CWS rótulo | Sim (`baixarRotuloPdf`) | idem | 401 sem sessão, 404 fora do dono (ou equipe com `logistica.etiquetas`), 503 sem contrato | `cws.test.ts` | OK |
| Cliente: CEP (`consultarCepEnvio`, `lib/shipping/cep.ts`) | CWS CEP → ViaCEP | Sim (cadeia CWS, depois ViaCEP) | idem | Timeout 4 s; com contrato **não** inventa endereço; sem contrato usa endereço de demonstração (só dev) | `cep.test.ts` | OK |
| Cliente: tela de envios/rastreio (`/api/rastreios`, `envios/page.tsx`) | lê banco, não a API | n/a (regra M6) | `correiosConfigurado()` | Estado "não consultado" | `rastreios.test.ts` (repo) | OK |
| Cron diário `/api/cron/shipping` (06:00 BRT) | SRO-Rastro | Sim (`rastrearObjetos`) | `CRON_SECRET` | Lote falho → `indisponivel` sem apagar retrato bom; `SRO-020`/fora do contrato → `nao_encontrado` com a mensagem; 401 renova token 1×; timeout | `route.test.ts`, `rastreios.test.ts`, `cws.test.ts` | OK; `CRON_SECRET` na Vercel **não conferido** |
| Rastreio → envio (postado, **entregue→bancada**) | SRO-Rastro | Sim | — | Status pelo par código/tipo (`PO`, `OEC`, `BDE/BDI/BDR 01`, `FC 82/84`, devolução tipo 23); frase só para código desconhecido | testes do PR #7 | Corrigido (PR #7) |
| Admin: `/admin/logistica` "Atualizar rastreio agora" (`atualizarRastreiosAgora`) | SRO-Rastro | Sim | — | Permissão `logistica.expedir`, trilha `admin.logistica.atualizar_rastreio` | `logistica.test.ts` | OK |
| Admin: etiqueta de retirada (`emitirEtiquetaRetirada`, `cancelarEtiquetaRetirada`, `/api/retiradas/etiqueta/[id]`) | CWS pré-postagem/rótulo | Sim | idem | Rollback da pré-postagem se a gravação falha | `logistica.test.ts` | OK |
| Admin: `marcarRetiradaPostadaManual` | — (manual) | n/a | — | Valida código SRO | `logistica.test.ts` | OK (contingência) |
| Admin: aba Integrações | env | — | lista Correios (5) e cron | só nomes, nunca valores | `integracoes.test.ts` | **Faltava NFS-e → corrigido** |
| NFS-e: emissão (`src/server/nfse/emissao.ts`, `sefin.ts`, `agendar.ts`) | Sefin Nacional | Única integração fiscal | `NFSE_CERT_PFX_BASE64`, `NFSE_CERT_SENHA`, `NFSE_AMBIENTE`, `NFSE_SERIE` | 400 com `erros[]` registrado; timeout/5xx = `FalhaTransitoriaSefin` e confere `HEAD /dps/{id}` antes de reenviar; E0014/E1235 tratados; cadastro incompleto barrado; sem `NFSE_AMBIENTE=producao` no site publicado nada é enviado | só `src/domain/nfse/nfse.test.ts` (domínio) | Integrada; **sem teste de servidor** |
| NFS-e: reenvio diário (`/api/cron/faturamento`, 05:00 BRT) | Sefin | Sim | `CRON_SECRET` | falha não desfaz o faturamento | `route` sem teste | OK |
| Admin: `/admin/resultados/fiscal` (`enviarFilaDeNotas`, `reprocessarNotas`, `baixarXmlNfse`) | Sefin | Sim | — | permissão por ação | sem teste de ação | OK; sem teste |
| NFS-e: IBGE do município (`municipio.ts`) | ViaCEP | — | — | falha → cadastro incompleto/pendente | sem teste | OK; sem teste |

## Código morto, sem tela e API antiga
- Busca por SIGEP, rastreamento público e WebService antigo: **nada encontrado**. `CORREIOS_TOKEN` e `gerarPrePostagemCorreios` já foram removidos (comentários no código).
- `advanceAnalysis` (`src/server/actions/custody.ts`): nenhuma tela chama. Continua exportada (endpoint) mas fechada por `bancada.analisar` **e** exige que o envio seja do próprio usuário logado, então na prática ninguém a usa. Foi a causa indireta do caso Sidnei. **Recomendação:** decidir com o Gabriel se sai, e tirar a menção "marcado como Recebido na Logística" do texto da bancada (`BancadaWeb.tsx:241`), que agora é automática.
- `markPosted` (cliente informa o código à mão): ainda ligada em `envios/page.tsx`; recusa quando há etiqueta ativa (`tem-etiqueta`). Convive bem com a pré-postagem; só vale para envio antigo/sem contrato.
- Ação sem botão ou botão sem ação: nenhum achado nas ações de logística e fiscal (todas têm componente).

## Corrigido neste PR
1. Aba Integrações do admin passa a mostrar a NFS-e (certificado, senha, ambiente) com observação do ambiente; `NFSE_AMBIENTE` é a única nova variável "não secreta" exibida. Teste novo.
2. `.env.example` ganhou o bloco NFS-e (só nomes e instruções).
3. Texto de "Tarefas agendadas" corrigido (faturamento diário 05:00 e rastreio 06:00 BRT).

## Só documentado (recomendações)
1. **Testes de servidor da NFS-e** (`emissao.ts`, `sefin.ts` com dublê de HTTPS, `municipio.ts`): maior lacuna; é o fluxo fiscal, vale uma frente própria.
2. **Vercel não conferida:** confirmar `CRON_SECRET`, `CORREIOS_*` (5) e `NFSE_*` com `vercel env ls production`.
3. **Cota/429 dos Correios:** um 429 derruba o lote inteiro para `indisponivel` (o retrato bom é preservado). Aceitável hoje (poucos objetos); revisitar se o volume passar de 50 por rodada.
4. **Plano Hobby:** o cron roda em janela de 1 h; confirmar o plano real.
5. Texto da bancada sobre "Recebido pela custódia na Logística" (ver acima).
