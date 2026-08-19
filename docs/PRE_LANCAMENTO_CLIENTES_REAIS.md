# Antes do primeiro cliente real

Áurea Custódia LTDA · Real Olímpico
Documento vivo — revisar a cada marco do projeto

---

## Para que serve este documento

O MVP hoje roda com sete sócios testando. Nada aqui é urgente **enquanto for assim**.
Tudo aqui é bloqueante **no dia em que a primeira moeda de um cliente entrar na
custódia** — porque a partir daí existe patrimônio de terceiro sob responsabilidade da
empresa, e cada item desta lista vira uma exposição concreta.

Está organizado em três blocos:

- **Bloco 1 — Bloqueantes.** Não pode existir cliente real sem isso resolvido.
- **Bloco 2 — Primeiros 90 dias.** Não impede o lançamento, mas o risco cresce rápido.
- **Bloco 3 — Escala.** Vira problema quando o volume subir.

Cada item traz **por que importa** numa linguagem que o Rogério consegue acompanhar, e
**o que fazer** para o time técnico.

---

# BLOCO 1 — Bloqueantes

## 1.1 Migração de formato de dados

**Por que importa.** Hoje, quando o programa ganha um campo novo, a solução é apagar tudo
e recomeçar com dados de teste. Com cliente real, apagar é impossível: aquele registro é
a prova de que a moeda dele está guardada. Sem um mecanismo de atualização, cada melhoria
no sistema passa a exigir escolher entre não melhorar ou destruir o histórico.

**O que fazer.**

O estado inteiro é gravado como um documento único, sem número de versão e sem validação
de formato (`src/server/state.ts`, `getState()` devolve o documento gravado exatamente
como está). Três providências:

1. **Versionar o documento.** Acrescentar `schemaVersion: number` ao `AppState`.
2. **Escrever migrações encadeadas.** Uma função por salto (`v1→v2`, `v2→v3`), aplicadas
   em sequência na leitura, dentro da mesma transação que já dá `SELECT … FOR UPDATE`.
3. **Validar na entrada.** Um schema (Zod ou equivalente) que rejeita documento
   malformado em vez de deixar a tela quebrar com `undefined`.

**Teste de aceite:** gravar um documento no formato antigo, subir o código novo, e o
sistema abrir normalmente sem intervenção manual.

**Encerrar quando:** a rotação de `AUREA_STORE_KEY` deixar de ser a resposta para mudança
de formato. Enquanto ela for, este item está aberto.

## 1.2 Senhas

**Por que importa.** As senhas estão gravadas em texto legível. Qualquer pessoa que
consiga ler o banco — um funcionário, um invasor, um backup mal guardado — entra na conta
de qualquer cliente. Como boa parte das pessoas repete senha entre serviços, o vazamento
não fica dentro da Áurea: ele contamina o e-mail e o banco do cliente. É o tipo de falha
que a LGPD trata como dano moral presumido.

**O que fazer.**

- **Argon2id** para armazenar (já é a escolha registrada no relatório de arquitetura), com
  parâmetros de custo calibrados no hardware de produção
- Migração transparente: no próximo login bem-sucedido, regravar em hash e descartar o
  texto
- Política mínima de senha e verificação contra listas de senhas vazadas
- **Congelamento de saque após recuperação de senha** — já previsto na arquitetura. É o
  que impede que o roubo da conta de e-mail vire roubo do patrimônio

**Nunca:** logar senha, mandar senha por e-mail, exibir senha em tela de suporte.

## 1.3 Sessão e autenticação

**Por que importa.** O cookie de sessão é o crachá do cliente. Se o segredo que assina
esse crachá estiver no código-fonte, qualquer pessoa com acesso ao repositório fabrica um
crachá válido e entra como qualquer cliente.

**O que fazer.**

- `SESSION_SECRET` **obrigatório**: o app deve se recusar a subir em produção sem ele, em
  vez de cair no segredo de desenvolvimento
- Expiração e renovação de sessão
- Invalidação de todas as sessões ao trocar senha
- **Segundo fator** para operações de valor: saque, retirada física, alteração de dados
  bancários
- Rotação periódica do segredo, com procedimento escrito

## 1.4 Termos de uso e política de privacidade

**Por que importa.** Sem termos aceitos e datados, não existe contrato de custódia. Se um
cliente contestar uma tarifa, uma negociação ou o prazo de devolução da moeda, não há
documento que defina o combinado. E sem política de privacidade a operação está em
desacordo com a LGPD desde o primeiro cadastro.

**O que fazer.**

- Termos e política **versionados**, com o texto de cada versão arquivado
- Aceite registrado com **versão, data, hora e IP**
- Reaceite obrigatório quando a versão mudar
- Redação revisada por advogado — não é documento gerado por IA

**Conteúdo mínimo dos termos:** o que a custódia cobre e o que não cobre; tarifas e como
mudam; prazo e condições de retirada física; o que acontece em caso de perda, dano ou
falência; regras de negociação e cancelamento de ordem; foro.

## 1.5 Seguro e prova de cobertura

**Por que importa.** É a promessa central do produto. Se algo acontecer com o estoque
físico e a apólice não cobrir o valor real custodiado, a empresa responde com patrimônio
próprio e os sócios respondem depois.

**O que fazer.**

- Apólice contratada **antes** da primeira moeda de cliente
- **Alerta automático** quando o valor custodiado se aproximar do teto da apólice
- Conciliação mensal entre valor segurado e valor efetivamente em custódia
- Certificado de cobertura acessível ao cliente na plataforma

**Já registrado como risco estratégico:** no volume projetado, o prêmio anual do seguro se
torna a maior despesa operacional isolada, crescendo mais rápido que todas as outras. As
faixas de tarifa de custódia atuais (R$ 5/15/25/30/60) não cobrem esse custo no volume
projetado. **Revisar a modelagem antes do lançamento.**

## 1.6 Trilha de auditoria real

**Por que importa.** Numa disputa — cliente afirmando que não autorizou uma venda,
divergência de estoque, questionamento de órgão regulador — a defesa da empresa é o
registro. Registro que pode ser alterado sem deixar rastro não vale como prova.

**O que fazer.**

- Trilha **append-only**: sem update, sem delete
- **Hash encadeado com SHA-256 determinístico**, cada registro incorporando o hash do
  anterior. Hoje o hash do recibo é simulado (o QR está rotulado "código simulado", o que
  é honesto para um protótipo e inaceitável em produção)
- Registro de **quem, o quê, quando, de qual IP**
- Verificação periódica da integridade da cadeia, com alerta em caso de quebra
- Publicação periódica do hash da ponta da cadeia, para o cliente poder conferir que o
  passado não foi reescrito

## 1.7 Backup com restauração testada

**Por que importa.** Backup que nunca foi restaurado é uma suposição, não uma garantia. O
momento de descobrir que o backup está corrompido não pode ser o momento em que ele é
necessário.

**O que fazer.**

- Backup automático diário, retenção mínima de 30 dias
- Cópia em provedor **diferente** do banco principal
- **Teste de restauração mensal**, com o resultado registrado
- Objetivos declarados: quanto tempo para voltar ao ar, quanto de dado se aceita perder
- Procedimento escrito e executável por mais de uma pessoa

## 1.8 Ambientes separados

**Por que importa.** Hoje existe um ambiente só. Testar significa testar no que os sócios
usam. Com cliente real, isso significa testar no que o cliente usa.

**O que fazer.**

- **Produção** e **homologação** separados, com bancos distintos
- Homologação **nunca** com dado real de cliente — dado sintético ou anonimizado
- Direito de publicar em produção restrito e registrado
- Preview Deployment da Vercel apontando para o banco de homologação, nunca o de produção

---

# BLOCO 2 — Primeiros 90 dias

## 2.1 Direitos do titular (LGPD)

O cliente pode exigir acesso, correção, portabilidade e exclusão dos dados. Os prazos são
legais e correm independentemente de a empresa estar preparada.

- Fluxo de atendimento com prazo controlado
- **Política de retenção** para vídeo e foto da estação de validação — hoje não existe
- Cuidado específico: **etiqueta de envio no quadro do vídeo expõe endereço**. Mascarar na
  captura ou restringir o acesso ao arquivo
- Encarregado de dados (DPO) designado e publicado
- Registro das operações de tratamento

**Tensão a resolver com advogado:** o direito ao esquecimento conflita com a trilha
imutável e com a obrigação de guarda contábil e fiscal. Definir por escrito o que se
apaga, o que se anonimiza e o que se mantém por obrigação legal.

## 2.2 Monitoramento e alerta

Falha que ninguém percebe vira falha longa. Descobrir por reclamação de cliente é o pior
caminho.

- Alerta de erro em produção chegando a um humano, com plantão definido
- Health check da conexão com o banco
- Alerta para o aviso `Nenhuma persistência configurada — usando store EM MEMÓRIA`
- Métricas de negócio: negociações por hora, falhas de login, saques pendentes
- Alerta de anomalia: pico de saque, muitos logins falhos na mesma conta

## 2.3 Proteção de borda e limites de uso

- **WAF e CDN** (Cloudflare, já é a preferência registrada)
- **Rate limiting** por conta e por IP em login, recuperação de senha e ordem de compra
- Proteção contra automação em cadastro e login
- Bloqueio progressivo após tentativas falhas

## 2.4 Controle de acesso de quem opera

- **Segundo fator obrigatório** nas contas de GitHub, Vercel, banco de dados e provedor de
  domínio
- **Contas individuais.** Conta compartilhada elimina a possibilidade de saber quem fez o
  quê — e é exatamente o que a due diligence do parceiro bancário vai perguntar
- Papéis definidos para a estação de validação: quem opera, quem aprova, quem pode rejeitar
- Revisão trimestral de quem tem acesso a quê
- Procedimento de desligamento: revogar tudo no mesmo dia

## 2.5 Teste de invasão

- Pentest externo **antes** do lançamento (já previsto)
- Correção das falhas críticas e altas antes de abrir ao público
- Reteste depois das correções
- Repetir a cada mudança relevante de arquitetura

## 2.6 Conciliação físico × digital

O registro digital diz que a moeda está lá. Só a conferência física prova.

- Inventário físico periódico batido contra o registro
- Divergência tratada como incidente, com apuração registrada
- Dupla conferência na entrada e na saída de moeda
- Câmera e registro do ritual completo, com retenção definida

## 2.7 Resposta a incidente

- Plano escrito: quem decide, quem comunica, quem executa
- Prazo de comunicação à ANPD e aos titulares em caso de vazamento
- Contatos de emergência: advogado, seguradora, provedores
- Simulação anual

---

# BLOCO 3 — Escala

## 3.1 Modelo de dados normalizado

O estado como documento único funciona no MVP e vira gargalo com volume: toda gravação
trava o documento inteiro. O schema normalizado de nove tabelas já está previsto na
arquitetura. Migrar quando a concorrência começar a doer.

## 3.2 Migração para Java + Spring

Decisão já tomada, por alinhamento com o padrão do setor bancário brasileiro e pela due
diligence do produto de crédito.

Ponto favorável já construído: **`src/domain/` é JavaScript puro**, sem React, sem Next,
sem entrada e saída. É a pasta que se traduz quase linha a linha. O resto se descarta.

## 3.3 Segurança física do armazém

O CAPEX de segurança física implicado pelo volume de ativo projetado **ainda não está
refletido no planejamento financeiro**. Cofre, alarme monitorado, controle de acesso,
CFTV com retenção e vigilância dimensionam-se pelo valor custodiado, não pelo faturamento.

## 3.4 Regime tributário

Existe contradição entre a planilha de planejamento (Lucro Presumido, 16,33% linear) e o
documento explicativo anterior (Simples Nacional com lógica de Fator R).

**Nenhuma lógica de imposto deve ser codificada antes de o contador definir.** Alíquota
errada em produção gera passivo fiscal retroativo.

## 3.5 Produto de crédito com garantia

- Due diligence do parceiro bancário — a arquitetura precisa suportar auditoria externa
- Regras de chamada de margem e execução de garantia definidas antes de codar
- Segregação contábil entre moeda livre e moeda dada em garantia
- Enquadramento regulatório revisado: crédito é atividade mais regulada que custódia

---

# Enquadramento regulatório — vigilância permanente

A estrutura atual **evita deliberadamente** a classificação como prestadora de serviços de
ativos virtuais (Resoluções BCB 519–521/2026). O recibo é comprovante de custódia, sem
blockchain e sem token transferível. A arquitetura centralizada foi escolhida também por
causa da IN RFB 1888/2019, que jogaria obrigação acessória sobre o cliente.

**Isso precisa continuar verdadeiro.** Qualquer proposta de tokenizar o recibo, torná-lo
transferível fora da plataforma ou publicá-lo em rede pública muda o enquadramento e exige
parecer jurídico antes de uma linha de código.

**Modelo alternativo maduro a considerar:** o **armazém geral** do Decreto 1.102/1903, com
conhecimento de depósito e warrant. É um arcabouço legal centenário, com jurisprudência
consolidada, que já resolve custódia com título representativo — inclusive a parte de dar
o bem em garantia.

---

# Como usar este documento

- Revisar a cada marco. Item resolvido sai da lista com data e link para a evidência.
- Item do Bloco 1 ainda aberto é **veto ao lançamento comercial**, não pendência a
  negociar.
- Toda decisão registrada aqui precisa ter uma explicação que o Rogério acompanhe. Se só
  funciona em jargão, a decisão ainda não está madura.
