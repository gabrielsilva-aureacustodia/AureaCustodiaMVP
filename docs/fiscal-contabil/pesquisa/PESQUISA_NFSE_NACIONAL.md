# Pesquisa: emissão automática de NFS-e Padrão Nacional (Sistema Nacional NFS-e) — Real Olímpico / AUREA CUSTODIA LTDA

Data da pesquisa: 22/10/2026. Emitente: AUREA CUSTODIA LTDA, CNPJ 68.071.452/0001-06, Belo Horizonte/MG (IBGE 3106200), não optante do Simples Nacional.

**Como ler este documento.** Cada afirmação traz a fonte entre colchetes, com a referência no fim, em "Fontes". Quando a fonte não é oficial (fórum, biblioteca de código aberto, blog), isso está dito. O que não consegui confirmar está marcado como **[NÃO CONFIRMADO]** e repetido na seção final, "Não confirmado / perguntar ao contador".

As planilhas oficiais (Anexo I, II, B, C, VIII), os XSD v1.01 e o PDF de Perguntas e Respostas foram baixados do gov.br e lidos de verdade. Não li só os títulos. Os números de regra (E0xxx) vêm do Anexo I v1.01, de 09/02/2026 [F9].

---

## Resumo executivo (para o Rogério)

1. **A API existe, é oficial e não tem cobrança de uso.** A Prefeitura de BH descreve o Emissor Nacional como "sistema próprio e gratuito", com três canais: Web, celular e API [F20]. O único custo é o certificado digital e-CNPJ A1 (ICP-Brasil). A API não aceita usuário e senha; só certificado [F23, item 17.x].
2. **Como funciona.** O nosso servidor monta um XML chamado DPS, que é o "pedido de nota". Assina o XML com o certificado da Áurea, compacta (GZip), codifica em Base64 e manda num JSON para a Sefin Nacional. A conexão também é autenticada pelo mesmo certificado (mTLS). A resposta vem na hora, com a nota pronta (XML) e a chave de acesso de 50 dígitos [F1, F2, F14].
3. **Belo Horizonte já está 100% no padrão nacional.** O cronograma terminou em 01/02/2026 para todas as pessoas jurídicas, pela Portaria SMFA 75/2025, alterada pela 88/2025. O emissor local só vale para competências anteriores à migração [F19, F20, F21].
4. **Mudanças de calendário importantes:**
   - O destaque de IBS/CBS é obrigatório desde **01/10/2026** para os serviços do ISS em geral, e a partir de **01/12/2026** para plataformas digitais e outros casos. Até 31/12/2026, a ausência desses dados não rejeita a nota, mas deixa a empresa sujeita a sanções [F24].
   - O leiaute novo (**NT 009**) entra em produção em **01/12/2026** [F25].
   - A API oficial que gerava o PDF (DANFSe) foi **suspensa em 03/08/2026**. Agora o nosso sistema precisa gerar o PDF sozinho [F23, item 17.8; F26].
5. **Série das notas.** As notas que o contador emitiu pelo site usaram a série **70000**, que é exclusiva do Emissor Web. A integração por API **tem de usar série de 00001 a 49999**; caso contrário, a nota é rejeitada (E0010) [F9; F23, item 18.1].
6. **Dado do cliente que passa a ser obrigatório.** Para a nota de **intermediação** (cIndOp 100301), as regras exigem **tomador identificado com endereço completo e CEP** (E0187/E0234). O CPF precisa existir na base da Receita (E0207) [F9; F23, item 4.7]. Na prática, a plataforma vai precisar coletar e validar CPF e endereço de cada cliente antes de cobrar comissão.

---

## 1. A API

### 1.1 Ambientes e URLs base

A página oficial "APIs – Produção Restrita e Produção" lista estes endereços de documentação (Swagger) [F5]:

| API | Produção restrita (testes/homologação) | Produção |
|---|---|---|
| SEFIN Nacional (emissão, consulta, eventos) | `https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional/docs/index` | `https://sefin.nfse.gov.br/SefinNacional/docs/index` |
| ADN – Contribuintes (distribuição DF-e) | `https://adn.producaorestrita.nfse.gov.br/contribuintes/docs/index.html` | `https://adn.nfse.gov.br/contribuintes/docs/index.html` |
| Parâmetros Municipais | `https://adn.producaorestrita.nfse.gov.br/parametrizacao/docs/index.html` | `https://adn.nfse.gov.br/parametrizacao/docs/index.html` |
| DANFSe | `https://adn.producaorestrita.nfse.gov.br/danfse/docs/index.html` | `https://adn.nfse.gov.br/danfse/docs/index.html` |
| ADN (geral), ADN – Municípios, CNC | `adn.producaorestrita.nfse.gov.br/{docs, municipios/docs, cnc/docs}` | `adn.nfse.gov.br/{...}` |

**URLs base usadas de fato nas chamadas.** A página oficial lista as páginas de documentação, não as bases. As bases abaixo vêm de duas fontes:

- O Swagger oficial, copiado no repositório open-nfse, declara `host: sefin.producaorestrita.nfse.gov.br`, `basePath: /SefinNacional` [F14].
- A biblioteca open-nfse usa estas bases [F15]:
  - SEFIN: `https://sefin.producaorestrita.nfse.gov.br/SefinNacional` (restrita) e `https://sefin.nfse.gov.br/SefinNacional` (produção)
  - ADN Contribuintes: `https://adn.(producaorestrita.)nfse.gov.br/contribuintes`
  - DANFSe: `https://adn.(producaorestrita.)nfse.gov.br/danfse`
  - Parâmetros: `https://adn.(producaorestrita.)nfse.gov.br/parametrizacao`

Um desenvolvedor no fórum ACBr relata POST em `https://sefin.producaorestrita.nfse.gov.br/SefinNacional/nfse` com `tpAmb=2` [F31, não oficial].

**[NÃO CONFIRMADO em fonte oficial]:** a base exata de produção para o POST (`https://sefin.nfse.gov.br/SefinNacional/nfse`). É consistente com o Swagger e com a biblioteca, mas a página oficial só traz o link da documentação. Note também uma diferença de caminho na produção restrita: a documentação fica em `/API/SefinNacional/docs`, enquanto a base do Swagger é `/SefinNacional`. Confirmar abrindo o Swagger com o certificado.

**Produção restrita** é o ambiente de testes. Nele a DPS vai com `tpAmb = 2` ("Homologação"). Se o ambiente informado divergir do ambiente chamado, a nota é rejeitada (E0006) [F9]. Notas desse ambiente saem com a tarja "NFS-e SEM VALIDADE JURÍDICA" [F26 (NT 008)]. O Emissor Web de testes fica em `https://www.producaorestrita.nfse.gov.br/EmissorNacional/` [F20].

### 1.2 Endpoints da Sefin Nacional (emissão)

Fonte: Manual dos Contribuintes – APIs do Emissor Público Nacional, v1.2, out/2025 [F1], e o Swagger oficial [F14].

| Método e caminho | Para que serve |
|---|---|
| `POST /nfse` | Recebe a DPS e gera a NFS-e **de forma síncrona**. Se a DPS trouxer `subst/chSubstda`, o sistema gera a nota substituta e um evento de "Cancelamento por Substituição" da original [F1]. Respostas no Swagger: 201 (sucesso), 400 (rejeição de negócio), 403 (certificado inválido), 500 [F14]. |
| `GET /nfse/{chaveAcesso}` | Consulta a NFS-e pela chave de 50 posições [F1]. |
| `GET /dps/{id}` | Devolve a chave de acesso a partir do Id da DPS. Só responde a quem for prestador, tomador ou intermediário da nota [F1]. |
| `HEAD /dps/{id}` | Informa se já existe NFS-e gerada para aquela DPS. Basta qualquer certificado válido [F1]. **É útil para recuperar a nota depois de um timeout.** |
| `POST /nfse/{chaveAcesso}/eventos` | Registra eventos: cancelamento (código 101101), manifestações etc. [F1, F10]. |
| `GET /nfse/{chaveAcesso}/eventos[/{tipoEvento}[/{numSeqEvento}]]` | Consulta eventos da nota [F1]. |
| `POST /decisao-judicial/nfse` | Emissão por decisão administrativa ou judicial ("bypass"). Envia a NFS-e inteira, com `cStat 102` [F14, F20]. Não se aplica ao nosso caso. |

**Formato do corpo** (definições do Swagger oficial [F14]):

- **Envio da nota:** `NFSePostRequest = { "dpsXmlGZipB64": "<DPS assinada, GZip, Base64>" }`.
- **Sucesso:** `NFSePostResponseSucesso = { tipoAmbiente, versaoAplicativo, dataHoraProcessamento, idDps, chaveAcesso, nfseXmlGZipB64, alertas }`.
- **Erro:** `NFSePostResponseErro = { tipoAmbiente, versaoAplicativo, dataHoraProcessamento, idDPS, erros[] }`, em que cada erro tem `{codigo, descricao, complemento}`.
- **Eventos:** `EventosPostRequest = { "pedidoRegistroEventoXmlGZipB64": "..." }`. A resposta de sucesso traz `eventoXmlGZipB64`.
- **Consulta:** `NFSeGetResponseSucesso` traz `chaveAcesso` e `nfseXmlGZipB64`.

O Manual Integrado confirma o formato: XML em UTF-8, "compactados no padrão GZip com representação base64binary", trafegando dentro de mensagens JSON numa API REST [F3, §6.1.1-c e §6.1.2].

Ressalva: a open-nfse registra que, na prática, a SEFIN às vezes devolve `erro` como *array* em rejeições de evento, embora o Swagger declare objeto [F15, CHANGELOG; não oficial]. Trate os dois formatos.

### 1.3 ADN – distribuição de documentos (contribuintes)

Fonte: manual oficial "APIs do ADN", v1.0, de 12/02/2026 [F2].

- **`GET /DFe/{NSU}`** devolve os documentos fiscais (notas e eventos) em que o CNPJ é emitente, tomador ou intermediário, a partir do NSU informado.
- **`GET /NFSe/{ChaveAcesso}/Eventos`** devolve os eventos de uma nota.
- O certificado pode ser de outro CNPJ com a **mesma raiz** [F2].

Lotes de até 50 documentos. Quando não houver nada novo (ultNSU = maxNSU), o sistema exige **esperar no mínimo 1 hora** antes de nova consulta [F3, §15.2.2; F23, assunto 6.x/19].

O campo de resposta é `LoteDistribuicaoNSUResponse { StatusProcessamento, LoteDFe[{NSU, ChaveAcesso, TipoDocumento, TipoEvento, ArquivoXml, DataHoraGeracao}], Alertas, Erros, ... }`. Repare que aqui os campos são em PascalCase [F14 (spec adn-contribuinte); não oficial como cópia].

Para a Áurea, essa API serve para **conferência**, isto é, baixar todas as notas emitidas, inclusive as que o contador fez pelo site. Não é necessária para emitir.

### 1.4 Parâmetros municipais (alíquotas e códigos de BH)

O manual oficial descreve a API de parâmetros (convênio, alíquotas, regimes especiais, retenções e benefícios) [F1]. As rotas atuais, segundo o Swagger "ADN Parâmetros Municipais" copiado na open-nfse [F14], são:

- `GET /parametrizacao/{codigoMunicipio}/convenio`. Traz `aderenteEmissorNacional`, `aderenteAmbienteNacional` e outros [F23, item 19.6].
- `GET /parametrizacao/{codigoMunicipio}/{codigoServico}/{competencia}/aliquota`. Por exemplo, `3106200/.../aliquota`.
- `GET /parametrizacao/{codigoMunicipio}/{codigoServico}/historicoaliquotas`
- `GET /parametrizacao/{codigoMunicipio}/{codigoServico}/{competencia}/regimes_especiais`
- `GET /parametrizacao/{codigoMunicipio}/{competencia}/retencoes`
- `GET /parametrizacao/{codigoMunicipio}/{numeroBeneficio}/{competencia}/beneficio`

**[NÃO CONFIRMADO]:** o formato exato de `{codigoServico}` (6 dígitos do cTribNac ou 9 dígitos com o cTribMun) e de `{competencia}`. Testar na produção restrita.

**Observação importante para o nosso caso.** Para prestador **não optante do Simples** em município **conveniado** (como BH), o campo `pAliq` **não pode ser enviado** na DPS (regra E0617). A Sefin aplica sozinha a alíquota cadastrada por BH [F9]. A consulta de alíquota serve só para exibir o valor ou conferir, não para preencher a DPS.

### 1.5 Autenticação, certificado e assinatura

- **Canal:** API REST em JSON, "TLS … com autenticação mútua" [F3, §6.1.2].
  - O Swagger da SEFIN declara TLS 1.0/1.1/1.2. O do ADN declara TLS 1.2 ou superior [F15 (transporte.md), citando `info.description` dos Swaggers; não oficial como cópia].
  - A open-nfse registra que a SEFIN **rejeita HTTP/2** em caminhos autenticados e força HTTP/1.1 [F15; não oficial].
- **Certificado:** ICP-Brasil, tipo A1 ou A3, com o CNPJ no OtherName OID 2.16.76.1.3.3. Para transmissão precisa ter EKU "Autenticação Cliente" [F3, §6.1.3]. A Perguntas e Respostas oficial acrescenta: versão 3, KeyUsage "Assinatura Digital" + "Não Recusa" + "Autenticação de Cliente", e "não há restrição contra certificados RFB e-CNPJ" [F23, item 17.1].
- **Quem assina:** a DPS tem de ser assinada pelo certificado do **próprio emitente**. Se o CNPJ do certificado for diferente do CNPJ do emitente, a nota é rejeitada (E0718). Não existe procuração eletrônica para integradores, e emissão automatizada por API exige certificado [F23, itens 17.2 e 17.x].
- **Assinatura XMLDSig:**
  - Padrão *enveloped*, sobre a tag `<infDPS>` identificada pelo atributo `Id`, com `Reference URI="#<Id>"`.
  - Inclui só o certificado do usuário final (`X509Certificate`). Não deve incluir `X509SubjectName`, `X509IssuerSerial`, `KeyValue` etc. [F3, §6.1.4].
  - O XML não pode ter prefixo de namespace, espaços ou quebras entre tags, nem comentários [F3, §6.1.1-d].
  - **Algoritmos:** o Manual Integrado (v1.00.02, set/2022) especifica RSA-SHA1, C14N 2001 e digest SHA-1 [F3]. A open-nfse usa **RSA-SHA256 + exc-c14n + digest SHA-256** e afirma que é o que a SEFIN aceita em Produção Restrita, com a ressalva de que "os algoritmos concretos não estão pinados no manual" [F15]. **[NÃO CONFIRMADO]:** qual combinação é exigida hoje. Testar as duas na produção restrita; a primeira tentativa recomendada é SHA-256, que bibliotecas em uso real adotam.
- **Namespace:** `http://www.sped.fazenda.gov.br/nfse`, raiz `<DPS versao="1.01">` [F3, F11].

### 1.6 Limites, custo e versões

- **Limite de requisições:** **nenhum documento oficial encontrado** declara limite (rate limit) para a SEFIN. A open-nfse diz o mesmo e trata HTTP 429/`Retry-After` por precaução [F15]. Os limites documentados são da distribuição ADN: 50 documentos por lote e 1 hora de espera quando não há novidade [F3, F23].
- **Custo:** o Emissor Nacional é "sistema próprio e gratuito" [F20]. Não encontrei cobrança por chamada de API.
- **Leiaute vigente:**
  - **Agora:** "Documentação Atual" traz o XSD **v1.01**, pacote de 09/02/2026, e o Anexo I **v1.01** [F4, F9, F11]. O pacote 20260727 (CNPJ alfanumérico) está em produção desde 10/08/2026, segundo o registro de implantações citado pela open-nfse [F15; **[NÃO CONFIRMADO]** na página oficial, que ainda aponta o zip de 20260209].
  - **Em produção até 30/11/2026:** o leiaute da **NT 004 v2.0**, de 10/12/2025 [F25].
  - **A partir de 01/12/2026:** entram as mudanças da **NT 009** (v1.01, de 11/09/2026, aprovada pelo Ato Técnico Conjunto RFB/CGIBS nº 7) [F25, F27, F28]. As principais são:
    - CST e cClassTrib sobem para fora do `gIBSCBS`;
    - `indDest`/`dest` passam para a raiz do `infDPS`;
    - `vDedRed` e `gReeRepRes` se fundem em `vAjusteBC`;
    - `finNFSe` ganha 1 (crédito) e 2 (débito);
    - entram `tpNFSeDebito`/`tpNFSeCredito`;
    - `indFinal` é reinserido;
    - CNPJ passa a ser alfanumérico (tipo C) [F28].
  - O release 1 da NT 009 já está em produção restrita desde 20/10/2026 [F25]. **Conclusão prática:** construir a integração já no leiaute da NT 009 e testá-la na produção restrita, porque a virada é em 01/12/2026.
- **Manuais vigentes (Documentação Atual):** Manual Contribuintes – Emissor Público API v1.2, out/2025 [F1]; Manual Contribuintes – APIs ADN v1.0, 12/02/2026 [F2]; Guia do Emissor Web v12; Anexos A, B, C, I, II, III, IV e V [F4]. O "Manual Integrado" v1.00.02 (set/2022) [F3] é mais antigo, mas é o único que detalha comunicação e assinatura.

---

## 2. A DPS campo a campo, comparada às notas do contador

### 2.1 Identificadores

- **Id da DPS** (45 caracteres): `"DPS"` + Cód.Mun.(7) + Tipo de inscrição (1; **2 = CNPJ**, 1 = CPF) + Inscrição (14) + Série (5) + Nº DPS (15) [F9 linha 101; F11 `TSIdDPS`].
  - Exemplo para a Áurea, série 1, DPS nº 1: `DPS3106200268071452000106000010000000000000001`.
  - A open-nfse registrou um bug real com o dígito do tipo de inscrição invertido, que gerava o erro E0004 [F15, CHANGELOG].
  - Dentro do XML, `serie` e `nDPS` vão **sem zeros à esquerda** no nDPS (padrão `[1-9][0-9]{0,14}`). Só no Id eles são completados com zeros [F11].
- **Chave de acesso da NFS-e** (50 dígitos). Quem gera é a Sefin; o Id interno tem o prefixo "NFS" e 53 posições. A composição é Cód.Mun.(7) + Ambiente gerador (1) + Tipo de inscrição (1) + Inscrição (14) + nNFSe (13) + Ano/Mês da emissão (4) + Código numérico aleatório (9) + DV (1) [F9 linha 4; F23, item 18.4]. A chave da nota do contador se decompõe assim:
  `3106200 | 2 | 2 | 68071452000106 | 0000000000001 | 2610 | 084178161 | 4`
  = BH | Sefin Nacional | CNPJ | Áurea | NFS-e nº 1 | emitida em out/2026 | código aleatório | DV.
- **nNFSe** (1, 2, 3 nas notas do contador) é sequencial **por emitente**, gerado pela Sefin, único e compartilhado entre todos os canais (Web, App e API). A Sefin não reutiliza números perdidos [F9 linha 7; F23, itens 18.3 e 18.5]. As notas que formos emitir por API continuarão a numeração (4, 5, …). Para a contabilidade, o que vale é o nNFSe, não a série nem o nº da DPS [F23, item 18.3].
- **"Ambiente Gerador: 2"** = `ambGer` 2, isto é, nota gerada pela Sefin Nacional (1 = sistema próprio do município) [F9 linha 14].
- **"Tipo de Ambiente: 1"** = `tpAmb` 1, Produção (2 = Homologação/Produção Restrita) [F9 linha 102].

### 2.2 Séries: por que 70000, e qual usar na API

Faixas oficiais da série da DPS [F9 linha 105 e regra E0010; F23, item 18.1]:

| Faixa | Canal |
|---|---|
| 00001–49999 | **Aplicativo próprio / API** |
| 50000–69999 | Emissor Móvel |
| 70000–79999 | **Emissor Web** (é daí que veio a série 70000 das notas do contador) |
| 80000–89999 | Transcrição manual (Web) |

Série fora da faixa do canal dá rejeição **E0010**. O erro mais comum descrito pelo fisco é justamente "enviar via API uma série da faixa 70000+" [F23, item 18.2].

**Sugestão (decisão nossa, não regra):** usar uma série fixa, por exemplo `1`, para todas as notas emitidas pela plataforma.

**Numeração (nDPS):**

- A única trava oficial é de **unicidade**: a combinação série + número + município + CNPJ não pode repetir uma DPS que **já gerou** NFS-e (**E0014**) [F9].
- **Não encontrei regra oficial que exija sequência sem buracos no nDPS** **[NÃO CONFIRMADO]**. Pela E0014, um número cuja DPS foi **rejeitada** (sem NFS-e gerada) pode ser reaproveitado.
- **Prática recomendada:** antes de reaproveitar um número depois de timeout, consultar `HEAD /dps/{id}` [F1]. Se a nota tiver sido gerada, recuperar a chave com `GET /dps/{id}`.
- Os nº DPS 7, 20 e 24 das notas do contador são da série 70000 (numeração automática do Emissor Web) e **não colidem** com uma série de API.

### 2.3 Campos da DPS (leiaute v1.01 em produção) e o que aparece no DANFSe

Ordem dos elementos conforme o XSD v1.01 [F11]: `infDPS(Id)` → `tpAmb, dhEmi, verAplic, serie, nDPS, dCompet, tpEmit, [cMotivoEmisTI], [chNFSeRej], cLocEmi, [subst], prest, [toma], [interm], serv, valores, [IBSCBS]`, seguidos de `Signature`.

| Campo (caminho) | Valor para a Áurea | Corresponde no DANFSe a | Fonte |
|---|---|---|---|
| `tpAmb` | 1 (produção) / 2 (restrita) | "Tipo de Ambiente: 1" | F9 |
| `dhEmi` | data e hora de emissão em UTC com fuso, ex.: `2026-10-22T10:15:00-03:00`. Não pode ser posterior ao processamento (E0008); vale atrasar uns segundos por causa de relógio | "Emissão" | F9 |
| `verAplic` | versão do nosso app (até 20 caracteres) | — | F9 |
| `serie` / `nDPS` | ex.: 1 / sequencial nosso | "Série/Nº DPS" | F9 |
| `dCompet` | data do fato gerador (AAAA-MM-DD). Não pode ser futura (E0015) nem anterior à ativação do convênio de BH ou à data do CNPJ (E0016/E0018) | "Competência 07/10/2026" | F9; F23, 23.1 |
| `tpEmit` | 1 (prestador). Tomador e intermediário não podem emitir nesta versão (E9996) | — | F9 |
| `cLocEmi` | 3106200 | "Município Belo Horizonte – MG" | F9 |
| `prest/CNPJ`, `prest/regTrib/opSimpNac` | 68071452000106; **1 = não optante** | Prestador | F9 |
| `prest/regTrib/regEspTrib` | 0 (Nenhum) | — | F9; F20 |
| `prest/IM` | inscrição municipal **só se** a Áurea estiver no CNC de BH. BH diz que contribuintes migrados a partir de 01/12/2025 ou iniciados depois emitem **sem IM** | — | F20 |
| `toma` (CPF, xNome, end/endNac{cMun, CEP}, xLgr, nro, xBairro) | cliente pessoa física | Tomador | F9 |
| `serv/locPrest/cLocPrestacao` | 3106200 | Local da prestação | F9 |
| `serv/cServ/cTribNac` | **110401** (custódia) / **100501** (intermediação) | "11.04.01" / "10.05.01" | F8, F9 |
| `serv/cServ/cTribMun` | **001** / **003** (desdobramento municipal de BH, 3 dígitos) | "/ 001", "/ 003" | F20 |
| `serv/cServ/xDescServ` | descrição livre (até 1000 caracteres) | Descrição do serviço | F9 |
| `serv/cServ/cNBS` | **106029000** / **102010000** (o XSD pede 9 dígitos sem pontos) **[NÃO CONFIRMADO o formato sem pontos; conferir no XSD `TSCodNBS`]** | "NBS 1.0602.90.00" / "1.0201.00.00" | F8, F9 |
| `valores/vServPrest/vServ` | ex.: 2.00 | Valor do serviço | F9 |
| `valores/trib/tribMun/tribISSQN` | 1 (operação tributável) | — | F9 |
| `valores/trib/tribMun/tpRetISSQN` | 1 (não retido) | — | F9 |
| `valores/trib/tribMun/pAliq` | **não enviar** (E0617: não optante + município conveniado; a Sefin aplica 5% ou 3%) | "ISSQN 5,00%" / "3,00%" | F9 |
| `valores/trib/tribFed/piscofins` | CST 01; vBCPisCofins; pAliqPis 0.65; pAliqCofins 3.00; vPis; vCofins; tpRetPisCofins 0. Os percentuais são do Lucro Presumido cumulativo e precisam de confirmação do contador | "PIS R$0,01 / COFINS R$0,06", "0 – PIS/COFINS/CSLL Não Retidos" | F9 |
| `valores/trib/totTrib` | escolher **um**: `vTotTrib` (R$) ou `pTotTrib` (%). Para não optante, `indTotTrib` e `pTotTribSN` são proibidos (E0713) | "Totais aproximados … Federais 11,33%; Estaduais 0,00%; Municipais 5,00%" (= `pTotTrib`) | F9 |
| `IBSCBS/finNFSe` | 0 (NFS-e regular) | — | F9 |
| `IBSCBS/indFinal` | 0 ou 1. Uso ou consumo pessoal, art. 57 da LC 214, que lista joias, metais preciosos e obras de arte, entre outros. **Perguntar ao contador** | — | F9, F17 |
| `IBSCBS/cIndOp` | **050101** (custódia) / **100301** (intermediação) | "Indicador de Operação 050101 / IBGE 3106200" | F7, F9 |
| `IBSCBS/tpOper` | **obrigatório quando cTribNac = 10.05** (E0903), mesmo que a observação do leiaute fale em imóveis. Provável valor 5 ("fornecimento e recebimento do pagamento concomitantes") **[NÃO CONFIRMADO; perguntar]** | — | F9 |
| `IBSCBS/indDest` | 0 (destinatário = tomador) | "Destinatário não identificado" | F9 |
| `IBSCBS/valores/trib/gIBSCBS/CST` + `cClassTrib` | **000** / **000001** | "CST 000 / cClassTrib 000001" | F9, F29 |
| `Signature` | XMLDSig enveloped sobre `infDPS` | — | F3, F9 |

**Na DPS não se informam alíquotas nem valores de IBS/CBS.** Quem calcula e grava na NFS-e é a Sefin, usando a "Calculadora" oficial com margem de R$ 0,01 [F9, regras E15xx e E16xx]. Os campos `pIBSUF`, `pCBS`, `vCBS` e `vBC` são campos **da NFS-e**, não da DPS [F9 linhas 46–97].

**Conta das notas do contador (custódia de R$ 2,00):**

- Base IBS/CBS = vServ − ISS − PIS − COFINS = 2,00 − 0,10 − 0,01 − 0,06 = **1,83**. As "Exclusões e Reduções" de R$ 0,17 são exatamente esses três tributos.
- CBS = 1,83 × 0,9% = 0,0165, arredondado para **R$ 0,02**.
- IBS UF = 1,83 × 0,1% = 0,0018, arredondado para R$ 0,00.

A fórmula oficial é `vBC = vServ − descIncond − vCalcReeRepRes − vISSQN − vPIS − vCOFINS (até 2026)` [F9 linha 51], e vem da LC 214, art. 12, §2º, V, que exclui ISS, PIS e COFINS da base de 2026 a 2032 [F17].

Em 2026, o total da nota **não** soma IBS/CBS: `vTotNF = vLiq` [F9 linha 66].

### 2.4 Esqueleto ilustrativo da DPS (leiaute v1.01; **não testado**; montado a partir do XSD [F11])

```xml
<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01"><infDPS Id="DPS3106200268071452000106000010000000000000001"><tpAmb>2</tpAmb><dhEmi>2026-10-22T10:15:00-03:00</dhEmi><verAplic>RealOlimpico-1.0</verAplic><serie>1</serie><nDPS>1</nDPS><dCompet>2026-10-07</dCompet><tpEmit>1</tpEmit><cLocEmi>3106200</cLocEmi><prest><CNPJ>68071452000106</CNPJ><regTrib><opSimpNac>1</opSimpNac><regEspTrib>0</regEspTrib></regTrib></prest><toma><CPF>...</CPF><xNome>...</xNome><end><endNac><cMun>...</cMun><CEP>...</CEP></endNac><xLgr>...</xLgr><nro>...</nro><xBairro>...</xBairro></end></toma><serv><locPrest><cLocPrestacao>3106200</cLocPrestacao></locPrest><cServ><cTribNac>110401</cTribNac><cTribMun>001</cTribMun><xDescServ>Guarda de moeda comemorativa - custodia mensal</xDescServ><cNBS>106029000</cNBS></cServ></serv><valores><vServPrest><vServ>2.00</vServ></vServPrest><trib><tribMun><tribISSQN>1</tribISSQN><tpRetISSQN>1</tpRetISSQN></tribMun><tribFed><piscofins><CST>01</CST><vBCPisCofins>2.00</vBCPisCofins><pAliqPis>0.65</pAliqPis><pAliqCofins>3.00</pAliqCofins><vPis>0.01</vPis><vCofins>0.06</vCofins><tpRetPisCofins>0</tpRetPisCofins></piscofins></tribFed><totTrib><pTotTrib><pTotTribFed>11.33</pTotTribFed><pTotTribEst>0.00</pTotTribEst><pTotTribMun>5.00</pTotTribMun></pTotTrib></totTrib></trib></valores><IBSCBS><finNFSe>0</finNFSe><cIndOp>050101</cIndOp><indDest>0</indDest><valores><trib><gIBSCBS><CST>000</CST><cClassTrib>000001</cClassTrib></gIBSCBS></trib></valores></IBSCBS></infDPS><Signature xmlns="http://www.w3.org/2000/09/xmldsig#">...</Signature></DPS>
```

**Atenção ao arredondamento do PIS e da COFINS.** As regras E0694/E0696 exigem `vPis = vBCPisCofins × pAliqPis`. A conta exata dá 0,013 e 0,06, e o sistema tem margem de arredondamento **[NÃO CONFIRMADO o critério; testar]**. A partir de 01/12/2026 (NT 009), CST e cClassTrib mudam de lugar e `indDest` sobe para o `infDPS` [F28].

---

## 3. O que significa cada código das notas

| Código | Significado | Fonte |
|---|---|---|
| **11.04** (LC 116) | "Armazenamento, depósito, carga, descarga, arrumação e guarda de bens de qualquer espécie". O ISS é devido **no local da guarda** (art. 3º, XVII). Para a Áurea, BH | F16 |
| **11.04.01** (cTribNac 110401) | desdobramento nacional "Armazenamento, depósito, guarda de bens de qualquer espécie" (o 11.04.02 é carga e descarga). Incidência: **Local da Prestação** | F8; F9 (aba MUN.INCID) |
| **10.05** (LC 116) | "Agenciamento, corretagem ou intermediação de bens móveis ou imóveis, não abrangidos em outros itens ou subitens…" | F16 |
| **10.05.01** (cTribNac 100501) | desdobramento "…de bens móveis ou imóveis, não abrangidos em outros itens…, por quaisquer meios" (o 10.05.02 é Bolsa de Mercadorias e Futuros). Incidência: **estabelecimento do prestador** (BH) | F8; F9 |
| **cTribMun 001 / 003** | desdobramento **municipal** de BH, de 3 dígitos, "análogo aos CTISS". É obrigatório quando o ISS é devido a BH. A correlação CTISS × código nacional fica no Portal de Serviços da PBH. Os textos "Armazenamento, depósito e guarda…" e "Intermediação de bens móveis não abrangidos…" do DANFSe são as descrições municipais **[a tabela de BH não abriu, porque é carregada por JavaScript; descrições NÃO CONFIRMADAS fora do DANFSe]** | F20, F22 |
| **NBS 1.0602.90.00** | "Serviços de armazenagem não classificados em subposições anteriores". O Anexo VIII oficial correlaciona 11.04 + 1.0602.90.00 com cIndOp 050101/050102 e cClassTrib 000001 | F8, F30 |
| **NBS 1.0201.00.00** | "Serviços de intermediação na distribuição de mercadorias". O Anexo VIII correlaciona 10.05 + 1.0201.00.00 com cIndOp **100301** e cClassTrib 000001 | F8, F30 |
| **cIndOp 050101** | LC 214, art. 11, V: "serviço prestado fisicamente sobre bem móvel material". O local da operação é o **estabelecimento do fornecedor** (BH). O 050102 seria o endereço do adquirente | F7, F17 |
| **cIndOp 100301** | LC 214, art. 11, X: "demais serviços, em operações onerosas". O local da operação é o **domicílio principal do adquirente**. Por isso o IBS municipal e estadual da intermediação é do município e do estado do **cliente**, e por isso o endereço do tomador é obrigatório (E0187/E0234) | F7, F9, F17 |
| **CST 000 / cClassTrib 000001** | CST 000 = "Tributação integral". cClassTrib 000001 = "Situações tributadas integralmente pelo IBS e CBS" | F29 (tabela oficial reproduzida), F30 |
| **IBS UF 0,10% / Mun 0,00% / CBS 0,90%** | alíquotas de teste de 2026: IBS **estadual** 0,1% (art. 343) e CBS 0,9% (art. 346) | F17 |

**2026: é cobrado de verdade ou só informativo?** É recolhido apenas por quem **não cumprir as obrigações acessórias**:

- Fica **dispensado o recolhimento** para quem cumprir as obrigações acessórias (art. 348, §1º).
- O que for recolhido é compensado com o PIS/COFINS devido (art. 348, I e II).
- O PIS e a COFINS continuam integralmente devidos (art. 348, §2º).
- Em caso de auto de infração por obrigação acessória, há 60 dias para regularizar (art. 348, §3º) [F17].

Na prática, destacar corretamente o IBS/CBS na NFS-e é a obrigação acessória que garante a dispensa.

**Lei 12.741/2012.** Exige informar o "valor aproximado" dos tributos nos documentos "emitidos por ocasião da venda ao consumidor" (art. 1º). O cálculo pode vir de "instituição de âmbito nacional reconhecidamente idônea" (art. 2º) [F18]. Na prática é a tabela **IBPT "De Olho no Imposto"**, por NBS [F32, não oficial]. **[NÃO CONFIRMADO]:** que os 11,33% federais venham da tabela IBPT para essas NBS. Perguntar ao contador qual fonte e versão ele usa.

**Alíquotas de ISS em BH** (Lei 8.725/2003, art. 14, na redação da Lei 10.692/2013) [F21]:

- 3% para os subitens 10.02 e 10.04 a 10.08, o que **inclui o 10.05** (inciso III, "b");
- 5% residual (inciso IV), que é o caso do **11.04**.

Isso bate com as notas (3% e 5%).

**Belo Horizonte e o padrão nacional:**

- **Calendário:** a Portaria SMFA 75/2025 tornou obrigatória a emissão "exclusivamente por meio do Emissor Nacional" (Web, App ou API), por cronograma: 01/10/2025, 01/11/2025, 01/12/2025 e, para todos, **01/02/2026** (Portaria 88/2025) [F19, F20].
- **Notas emitidas fora da regra** depois dessas datas são documento inidôneo (art. 6º) [F19].
- **Base nacional:** a LC 214, art. 62, §1º, obriga os **municípios**, desde 01/01/2026, a autorizar a NFS-e de padrão nacional ou a compartilhar suas notas com o ambiente nacional [F17]. A obrigação do **contribuinte** de BH vem da Portaria municipal.

---

## 4. Receitas futuras e enquadramento (tudo exige confirmação do contador)

**Ponto de partida.** A lista da LC 116 é **taxativa, mas admite interpretação extensiva** para atividades inerentes aos serviços listados. É o que diz o STF no Tema 296 (julgado em 29/06/2020) [F33, fonte secundária].

### 4.1 Tarifa de saque (R$ 5,00)

- O candidato literal é **15.15** ("…serviços relacionados a depósito…, a saque de contas quaisquer…") [F16]. Desdobramento nacional: 151502 [F8].
- **Mas:** o item 15 é "Serviços relacionados ao setor bancário ou financeiro, inclusive aqueles prestados por instituições financeiras…" [F16]. O Anexo VIII associa os subitens 15.xx ao cClassTrib **820007** ("Documento com informações de fornecimento de serviços financeiros"), que remete ao regime específico de serviços financeiros do IBS/CBS [F30].
- Enquadrar a Áurea no item 15 pode ter efeitos de IBS/CBS e regulatórios. O CLAUDE.md registra a decisão de ficar fora do enquadramento financeiro e VASP.
- **Alternativas a discutir com o contador:**
  - considerar a tarifa como parte do serviço de intermediação (10.05) ou de custódia (11.04), por interpretação extensiva;
  - ou usar um subitem de apoio administrativo (17.02, "expediente… apoio e infraestrutura administrativa"; existe na LC 116 [F16]).
- **Nenhuma dessas opções está confirmada.**

### 4.2 Frete cobrado pelo preço do contrato dos Correios, sem margem

- **IBS/CBS.** Não integram a base os "reembolsos ou ressarcimentos recebidos por valores pagos relativos a operações por conta e ordem ou em nome de terceiros, **desde que a documentação fiscal relativa a essas operações seja emitida em nome do terceiro**" (LC 214, art. 12, §2º, IV) [F17].
  - Como o contrato Platinum é da **Áurea** e a fatura dos Correios sai em nome da Áurea, a condição "em nome do terceiro" **provavelmente não se cumpre**. O frete tenderia a ser receita da Áurea, e não reembolso.
  - O leiaute tem o grupo `gReeRepRes` (até 30/11/2026) e o `vAjusteBC` (NT 009) para declarar reembolsos com o documento de referência [F9, F28].
- **ISS.** Se for serviço, o subitem natural é **26.01** ("coleta, remessa ou entrega… inclusive pelos correios") [F16], com cIndOp 070101 [F30]. Mas a Áurea não presta o transporte; ela revende o serviço dos Correios.
- **Conflito com o ledger.** O CLAUDE.md classifica o frete "fora da receita bruta na DRE", o que pode não bater com o tratamento fiscal. **Perguntar ao contador** se o frete entra na NFS-e (e em qual subitem) ou se fica fora, e com qual documento.

### 4.3 Taxa de devolução ou retirada da moeda (manuseio)

- O subitem **11.04** já inclui "carga, descarga, arrumação" (11.04.02 = "Carga, descarga, arrumação de bens de qualquer espécie") [F8, F16]. É candidato forte, com o mesmo cTribMun e a mesma alíquota de 5%.
- Existe também o **15.06.08, "Devolução de bens em custódia"** [F8, F16]. Ele está no item 15 (financeiro), com o mesmo problema da tarifa de saque.
- **Perguntar ao contador.**

### 4.4 Custódia do 1º mês cobrada na compra (`origem: 'compra'`)

É a mesma natureza da custódia mensal: 11.04.01, NFS-e para o **comprador**, como tomador.

---

## 5. Regras operacionais

1. **Competência e emissão posterior.**
   - `dCompet` é "a data do fato gerador… a data da prestação do serviço", e é **uma só por nota** [F9 linha 107].
   - Emitir depois é permitido: a competência pode ser passada, nunca futura (E0015), respeitando a ativação do convênio e a data do CNPJ [F9; F23, item 23.1]. Foi o que o contador fez: emitiu em 22/10 com competência 07/10.
   - **[NÃO CONFIRMADO]:** prazo municipal de BH para emitir após o fato gerador. A Portaria 75/2025 não trata disso [F19]. O ISS segue a apuração mensal pela DES/BHISS [F20].
   - **Para a custódia**, que é serviço de execução continuada, o fato gerador do IBS/CBS é o primeiro destes momentos: quando a parcela se torna exigível, ou o pagamento (LC 214, art. 10, §3º, na redação da LC 227/2026) [F17]. Isso combina com emitir a nota na data de vencimento ou de pagamento de cada ciclo.
2. **Cancelamento em BH** (Portaria 75/2025, art. 5º, alterada pela 88/2025):
   - automático pela API ou pelo Portal se a nota tiver **até 730 dias** e a prefeitura não tiver bloqueado [F19, F20];
   - fora disso, pedido de análise fiscal (evento "Solicitação de Análise Fiscal para Cancelamento") [F10, F20].
   - Evento de cancelamento: `e101101`, com `cMotivo` 1 = erro na emissão, 2 = serviço não prestado, 9 = outros; `xMotivo` com 15 a 255 caracteres.
   - Id do pedido: `"PRE"` + chave (50) + código do evento (6), num total de 59 caracteres. O pedido também é assinado [F10].
3. **Substituição.**
   - É uma nova DPS com `subst/chSubstda` + `cMotivo` (01 a 05, 99) [F9].
   - Também tem prazo de 730 dias em BH [F19].
   - Para não optante, **não se pode alterar** competência, subitem, cTribMun nem local da prestação (E0060) [F9; F23, item 10.4].
   - Não se pode trocar o tomador, nem passar de "sem tomador" para "com tomador" (E0058) [F23, item 10.3].
   - A substituição gera automaticamente o "Cancelamento por Substituição" da nota original [F1].
4. **DPS rejeitada.** Não gera NFS-e nem consome nNFSe. O número da DPS pode ser reaproveitado (a E0014 só barra repetição de DPS que gerou nota) [F9]. Em caso de timeout, a Sefin pode ter "queimado" um nNFSe, mas a regra é simplesmente reenviar [F23, item 18.5]. Antes de reenviar com o mesmo nDPS, consultar `HEAD /dps/{id}` para não duplicar [F1].
5. **Tomador sem endereço.**
   - O grupo `toma` é opcional no XSD [F11].
   - **Mas** é obrigatório (identificação e endereço) quando o cIndOp é 100301, entre outros (E0187/E0234). Isso inclui a **intermediação** [F9].
   - Para a custódia (050101), o endereço não é exigido pelas regras **[a obrigatoriedade de identificar o tomador PF na custódia NÃO CONFIRMADA; recomendável identificar sempre]**.
   - A Perguntas e Respostas oficial explica que o endereço e o CEP da pessoa física são "requisito de apuração do imposto" para definir o local do IBS/CBS [F23, item 4.7].
   - Notas emitidas sem tomador podem não ser substituíveis depois (E0056) [F23, item 10.2].
6. **Validação de CPF.** O sistema confere o dígito verificador (E0206) **e a existência do CPF na base da Receita** na data de competência (E0207) [F9]. O CEP precisa pertencer ao município informado [F23, itens 4.1 e 4.2].
7. **Uma nota por operação ou uma nota mensal consolidada.**
   - O leiaute admite **uma** `dCompet` e **um** serviço (`cServ`) por DPS [F9, F11].
   - Uma nota mensal juntando vários fatos geradores em dias diferentes conflita com a regra "competência única = data do fato gerador" [F9].
   - Uma nota não pode misturar custódia e intermediação, porque são subitens diferentes.
   - **[NÃO CONFIRMADO]:** se BH aceita nota consolidada por período para serviços contínuos.
   - **Recomendação técnica:** uma nota por ciclo de custódia ou lote (que já é a unidade de cobrança da plataforma) e uma nota por comissão (uma para o comprador, outra para o vendedor, já que cada um é tomador de uma comissão diferente). **Decisão do contador.**
8. **Guarda dos documentos.**
   - O documento oficial é o **XML** autorizado, guardado no ADN. O DANFSe é só representação gráfica [F23, item 17.8].
   - Pelo CTN, art. 195, parágrafo único, os comprovantes devem ser conservados até a prescrição dos créditos, que é de 5 anos (arts. 173 e 174) [F34, fonte secundária].
   - Recomendação: guardar o XML da NFS-e e os XML de eventos por **pelo menos 5 anos** (o contador confirma o prazo exato).

---

## 6. Notas práticas de integração em Node.js / Next.js na Vercel

1. **Montagem do XML.** Gerar a string sem espaços entre tags, sem prefixo de namespace e em UTF-8 [F3]. Validar contra o XSD v1.01 (e depois contra o da NT 009) antes de enviar. Rejeições de esquema voltam como E1235 [F15].
2. **Assinatura.**
   - Usar **`xml-crypto`** (`SignedXml`): referência `#<Id do infDPS>`, transforms enveloped + c14n, `KeyInfo` só com `X509Certificate`, `<Signature>` como último filho de `<DPS>` [F3, F15].
   - Para tirar a chave privada e o certificado do .pfx, usar `node-forge` (`pkcs12`) **[biblioteca sugerida; não testada aqui]**.
   - Algoritmo: ver §1.5 (SHA-256, com SHA-1 como alternativa).
3. **mTLS.**
   - `new https.Agent({ pfx: Buffer.from(b64, 'base64'), passphrase, keepAlive: true })`, ou `undici.Agent({ connect: { pfx, passphrase } })`, forçando HTTP/1.1 [F15].
   - Compactar com `zlib.gzipSync(xml).toString('base64')` e descompactar a resposta com `gunzipSync` [F15].
4. **Certificado na Vercel.**
   - Guardar o .pfx em Base64 numa variável marcada como *Sensitive* e a senha em outra.
   - Limite da Vercel: 64 KB de variáveis por deployment, que é também o máximo de uma variável. Funções em **Edge** só aceitam 5 KB por variável [F35]. Um A1 costuma ter poucos KB **[tamanho típico NÃO CONFIRMADO; medir o arquivo real]**.
   - A emissão tem de rodar em **runtime Node.js** (não Edge) e **só no servidor** (`src/server/…`). Pela regra do projeto, nada de `@/server/*` em Client Component.
   - Alternativa mais segura: guardar o .pfx cifrado no Postgres e a chave de cifra na Vercel **[sugestão própria]**.
5. **Idempotência e fila.**
   - Gravar a DPS (série, nDPS, Id, XML assinado) **antes** de enviar.
   - Em caso de timeout ou 5xx, consultar `HEAD`/`GET /dps/{id}` antes de reenviar [F1].
   - Guardar `chaveAcesso` + `nfseXmlGZipB64` da resposta.
   - O contador de nDPS precisa de trava no banco (`SELECT … FOR UPDATE`, como o projeto já faz) para não repetir número.
6. **DANFSe.** Gerar o PDF localmente no leiaute nacional "DANFSe v2.0" da NT 008, com QR Code e paridade total com o XML. A API oficial foi suspensa em 03/08/2026 [F23, item 17.8; F26].
7. **Conferência.** Job diário em `GET /DFe/{NSU}` do ADN para conciliar todas as notas da Áurea, inclusive as manuais do contador, respeitando 1 h de espera quando não houver novidade [F2, F3].
8. **Implementações abertas para estudar o formato exato:**
   - **open-nfse** (TypeScript/Node, MIT, v0.11.0, último push em 24/08/2026). Traz os Swaggers oficiais copiados (`specs/*.openapi.json`), os XSD 1.01, montagem e assinatura da DPS, eventos e retry [F14, F15]. Não é oficial, mas é a referência mais próxima da nossa stack. Avaliar se vale usá-la como dependência ou só como referência; isso é decisão de arquitetura.
   - **nfse-nacional/nfse-php** e outras bibliotecas PHP no Packagist (gildonei/nfse-nacional, marcelabeh/emissor-nfse-nacional) [F36]. **[não li o código]**
   - **ACBr / fórum Projeto ACBr** (Delphi), útil para casos de rejeição relatados por desenvolvedores [F31].

---

## Não confirmado / perguntar ao contador

**Para o contador (decisões fiscais):**

1. Subitem, cTribMun, NBS e cIndOp da **tarifa de saque** (15.15? embutida em 10.05 ou 11.04? 17.02?) e o risco de enquadramento no item 15 (financeiro), com cClassTrib 820007.
2. **Frete** dos Correios cobrado a preço de custo: entra na NFS-e? Em qual subitem (26.01?) ou como reembolso (gReeRepRes / vAjusteBC)? Considerar que a fatura dos Correios sai em nome da Áurea (LC 214, art. 12, §2º, IV). E como isso se concilia com o ledger, que hoje classifica o frete fora da receita bruta.
3. **Taxa de devolução ou retirada** da moeda: 11.04.02 (carga, descarga, arrumação) ou 15.06.08 (devolução de bens em custódia)?
4. **Granularidade:** uma NFS-e por ciclo de custódia e por comissão, ou consolidação por período em BH?
5. **Data de competência** que ele quer: pagamento, vencimento do ciclo ou aceite da moeda (LC 214, art. 10, §3º, com redação da LC 227/2026).
6. **`tpOper`** na intermediação 10.05 (o sistema exige: E0903). Qual valor ele usou? Provavelmente 5.
7. **`indFinal`** (uso ou consumo pessoal, art. 57 da LC 214): a moeda comemorativa entra em "metais preciosos"? Qual valor informar?
8. **PIS/COFINS:** confirmar CST 01 e alíquotas 0,65% / 3,00% (Lucro Presumido cumulativo), e a regra de arredondamento por nota.
9. **Lei 12.741:** fonte e versão dos percentuais (11,33% federais).
10. A Áurea entra como **"plataforma digital"** no cronograma de destaque de IBS/CBS (01/12/2026 em vez de 01/10/2026)? Na prática, as notas dele já trazem IBS/CBS.
11. Inscrição municipal: a Áurea está no CNC de BH (informar `prest/IM`) ou emite sem IM?
12. Prazo de guarda dos XML que ele exige (mínimo de 5 anos pelo CTN).
13. **Retenção de ISS:** algum tomador PJ de BH é responsável tributário? Hoje os tomadores são PF, então tpRetISSQN = 1.

**Técnico, a validar na produção restrita:**

14. URL base exata de **produção** da SEFIN para o POST (`https://sefin.nfse.gov.br/SefinNacional/nfse`).
15. Algoritmo de assinatura aceito: RSA-SHA256/exc-c14n (open-nfse) ou RSA-SHA1/C14N (manual de 2022).
16. Formato de `cNBS` no XML (9 dígitos sem pontos?) e de `{codigoServico}`/`{competencia}` na API de parâmetros.
17. Existência de limite de requisições (nenhum documentado).
18. Exigência ou não de sequência sem buracos no nDPS (nenhuma regra encontrada além da E0014).
19. Descrições oficiais dos códigos municipais 001 e 003 de BH: a tabela de correlação CTISS × cTribNac da PBH não carregou, porque a página usa JavaScript.
20. O pacote XSD em produção (20260209 ou 20260727, com CNPJ alfanumérico) e o cronograma exato da NT 009 em produção (oficial: 01/12/2026 [F25]).

---

## Fontes

- **[F1]** Manual dos Contribuintes – Guia das APIs do Emissor Público Nacional, v1.2 (out/2025). https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/manual-contribuintes-emissor-publico-api-sistema-nacional-nfs-e-v1-2-out2025.pdf/@@download/file
- **[F2]** Manual dos Contribuintes – APIs do ADN, v1.0 (12/02/2026). https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/manual-contribuintes-apis-adn-sistema-nacional-nfse.pdf
- **[F3]** Manual Integrado do Sistema Nacional NFS-e, v1.00.02 (set/2022): §6.1 (formato, comunicação, certificado, assinatura) e §15 (ADN, DANFSe). https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/manualintegradosnnfse_v1-00-02-producao.pdf
- **[F4]** Documentação Técnica – Documentação Atual (lista de manuais, anexos e XSD). https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual
- **[F5]** APIs – Produção Restrita e Produção (URLs oficiais). https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/apis-prod-restrita-e-producao
- **[F7]** Anexo C – Indicador de Operação IBS/CBS v1.01. https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/anexo-c-indop-ibscbs-snnfse-v1-01.xlsx
- **[F8]** Anexo B – NBS 2.0 e Lista de Serviço Nacional v1.01 (22/01/2026). https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/anexo_b-nbs2-lista_servico_nacional-snnfse-v1-01-20260122.xlsx
- **[F9]** Anexo I – Leiaute e Regras de Negócio DPS/NFS-e v1.01 (09/02/2026), abas "LEIAUTE DPS_NFS-e", "RN DPS_NFS-e", "RN_RECEPCAO_DPS" e "MUN.INCID_INFO.SERV". https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/anexo_i-sefin_adn-dps_nfse-snnfse-v1-01-20260209.xlsx
- **[F10]** Anexo II – Leiaute de Eventos e Pedido de Registro de Evento v1.01 (22/01/2026). https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/anexo_ii-sefin_adn-pedregevt_evt-snnfse-v1-01-20260122.xlsx
- **[F11]** Esquemas XSD v1.01 (09/02/2026). https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/nfse-esquemas_xsd-v1-01-20260209.zip
- **[F14]** Swaggers oficiais (SEFIN Nacional, ADN Contribuinte, Parametrização, DANFSe) copiados no repositório open-nfse, `specs/*.openapi.json`. Cópia mantida por terceiro. https://github.com/fm-s/open-nfse/tree/main/specs
- **[F15]** open-nfse (TypeScript/Node, MIT), em especial `src/ambiente.ts`, `src/xml/sign.ts`, `specs/ruleset/transporte.md`, `specs/standards-watch.md` e `CHANGELOG.md`. Não oficial. https://github.com/fm-s/open-nfse
- **[F16]** Lei Complementar 116/2003 (lista de serviços; art. 3º). https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm
- **[F17]** Lei Complementar 214/2025, compilada com a LC 227/2026: arts. 10, 11, 12, 57, 62, 343, 346 e 348. https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm
- **[F18]** Lei 12.741/2012. https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12741.htm
- **[F19]** Portaria SMFA nº 075/2025 (PBH), com alterações da Portaria SMFA 88/2025, arts. 1º, 4º, 5º e 6º. https://fazenda.pbh.gov.br/internet/legislacao/formkey.asp?key=1354
- **[F20]** PBH – "NFS-e Nacional: orientações gerais e perguntas frequentes", v7.1 (09/04/2026). http://fazenda.pbh.gov.br/nfse/FAQ/
- **[F21]** Lei Municipal 8.725/2003 (BH), art. 14 – alíquotas do ISSQN (texto consolidado). https://fazenda.pbh.gov.br/internet/legislacao/formchave.asp?key=542
- **[F22]** PBH – Correlação CTISS × Código de Tributação Nacional (não foi possível ler o conteúdo, que é carregado por JavaScript). https://servicos.pbh.gov.br/servicos+issqn-correlacao-ctiss-codigo-de-tributacao-do-issqn-codigo-de-tributacao-nacional+68fa794eb5ad6a681fc1ec16
- **[F19b]** PBH – notícia "Belo Horizonte adere ao Emissor Nacional" (18/09/2025). https://prefeitura.pbh.gov.br/noticias/belo-horizonte-adere-ao-emissor-nacional-de-nota-fiscal-de-servico-eletronica
- **[F23]** CGNFS-e – Perguntas e Respostas NFS-e v1.1 (22/09/2026), itens 4.7, 10.2–10.5, 17.1, 17.2, 17.8, 18.1–18.6, 19.5, 19.6 e 23.1. https://www.gov.br/nfse/pt-br/perguntas-frequentes/perguntas-e-respostas-nfs-e-v-1-1-20260922.pdf
- **[F24]** CGNFS-e – "Orienta sobre os prazos para destaque de IBS/CBS nas notas fiscais de serviço" (07/08/2026; Ato Conjunto RFB/CGIBS nº 4/2026). https://www.gov.br/nfse/pt-br/noticias/cgnfs-e-orienta-sobre-os-prazos-para%20destaque-de-ibs-cbs-nas-notas-fiscais-de-servico
- **[F25]** CGNFS-e – Release 1 da NT 009 em produção restrita; produção em 01/12/2026 (20/10/2026). https://www.gov.br/nfse/pt-br/noticias/cgnfs-e-informa-disponibilizadas-no-ambiente-de-testes-o-release-1-das-evolucoes-da-nota-tecnica-009
- **[F26]** NT SE/CGNFS-e 008 (DANFSe) v1.02, 14/07/2026, e notícia de prorrogação para 03/08/2026. https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/rtc/nt-008-se-cgnfse-danfse-20260714-v1-02.pdf e https://www.gov.br/nfse/pt-br/noticias/danfse-novos-ajustes-de-leiaute-e-prorrogacao-do-prazo-para-adequacao
- **[F27]** Ato Técnico Conjunto RFB/CGIBS nº 7 – aprova a NT 009 v1.01 (notícia de 09/10/2026). https://www.gov.br/nfse/pt-br/noticias/publicado-o-ato-tecnico-conjunto-rfb-cgibs-no-7-aprovando-a-versao-1-01-da-nota-tecnica-009-nfs-e-e-a-nota-tecnica-010-da-nfs-e-via
- **[F28]** Nota Técnica SE/CGNFS-e nº 009 v1.01 (11/09/2026) e Anexo VI v1.04.01. https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/rtc/nota-tecnica-009-se-cgnfs-e-v-1-01.pdf e https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/rtc/anexovi-leiautesrn_rtc_ibscbs-v1-04-01-nt009.xlsx
- **[F29]** Tabela CST/cClassTrib (000/000001 = tributação integral). Fonte primária: Portal NF-e, Informe Técnico 2025.002 (link citado na NT 009): https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=jxTMMQeEVM8= ; reprodução secundária: https://buscadorncm.com.br/cclasstrib/000001
- **[F30]** Anexo VIII – Correlação Item LC 116 × NBS × IndOp × cClassTrib v1.01.00. https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/rtc/anexoviii-correlacaoitemnbsindopcclasstrib_ibscbs_v1-01-00.xlsx
- **[F31]** Fórum Projeto ACBr – NFS-e Nacional, Sefin produção restrita (relatos de desenvolvedores; não oficial). https://www.projetoacbr.com.br/forum/topic/92867-nfs-e-nacional-sefin-produ%C3%A7%C3%A3o-restrita-%E2%80%94-e999-mesmo-com-xmldsig-ok-e-dps-equivalente-ao-emissor-web/
- **[F32]** Tabela IBPT "De Olho no Imposto" (explicação secundária). https://inventti.com.br/tabela-ibpt/
- **[F33]** STF Tema 296, lista do ISS taxativa com interpretação extensiva (resumo secundário). https://juris.damasio.com.br/temas/stf/296
- **[F34]** Prazo de guarda e decadência, CTN arts. 173, 174 e 195 (secundária). https://jus.com.br/artigos/10687/decadencia-e-conservacao-de-documentos-fiscais
- **[F35]** Vercel – limites de variáveis de ambiente. https://vercel.com/docs/environment-variables e https://vercel.com/docs/limits
- **[F36]** Bibliotecas PHP NFS-e Nacional (não lidas). https://github.com/nfse-nacional/nfse-php e https://packagist.org/packages/gildonei/nfse-nacional
- **[F37]** Notícias do Portal NFS-e (lista de jun–out/2026). https://www.gov.br/nfse/pt-br/noticias
