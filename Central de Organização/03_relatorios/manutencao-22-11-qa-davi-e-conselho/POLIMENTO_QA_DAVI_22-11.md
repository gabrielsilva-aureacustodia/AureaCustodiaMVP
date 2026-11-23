# Polimento (Distilla) | QA Davi 22-11

Dono: chat Polimento. Não edita `src`. Rotina: a cada 15 min lê os MDs `docs/diario/execucoes/2026-11-22--qa-r*-*--MD_EXECUCAO.md` e o que mudou.

## Lista de conferência (vale para toda correção)
1. Marca **Real Olímpico**, masculino ("o Real Olímpico"). Razão social AUREA CUSTODIA LTDA só onde há CNPJ/contrato.
2. Proibido: token, NFT, cripto, ativo digital, investimento, rentabilidade.
3. Alvo de toque mínimo 44px (celular 375px).
4. Claro e escuro: sem cor fixa fora dos tokens; contraste do texto de erro legível nos dois.
5. Erro diz **o que houve + o que fazer**, sem jargão ("falhou", "inválido" sozinhos não bastam).
6. Número e data em formato brasileiro (R$ 1.234,56 · 20/11/2026).

## Estado em 22/11 (1ª leitura)
- Ainda não existem MDs `qa-r*` de execução. Sinais de início: `src/domain/dias-uteis.ts` (R3, B06) criado. `src/app/not-found.tsx` ainda não existe (R4, B10).
- Nada a revisar ainda. Abaixo, redação sugerida **antes** de a Execução escrever, para ela adotar se quiser.

## Propostas de redação (linguagem do Rogério)

### 404 (B10)
- Título: **Página não encontrada**
- Texto: "O endereço que você abriu não existe ou foi trocado de lugar. Confira se digitou certo ou volte para uma das páginas abaixo."
- Links logado: Início · Mercado · Minhas moedas · Suporte. Deslogado: Página inicial · Entrar · Criar conta · Suporte.
- Evitar "Oops", "Erro 404 fatal" e humor; manter o tom sóbrio da marca. Botões com 44px.

### Aviso de e-mail não confirmado (B02)
- Faixa: "Confirme seu e-mail para depositar, comprar e sacar. Enviamos um link para **{email}**."
- Botão: "Reenviar link". Depois de reenviar: "Pronto, enviamos de novo. Veja também a caixa de spam."
- Selo: "E-mail confirmado" só depois do clique (nunca "Verificado" antes).
- Bloqueio (depósito/compra/saque): "Esta ação fica liberada depois que você confirmar seu e-mail." (a política de bloqueio ainda é decisão do Gabriel).

### Saque em dias úteis (B06 / A06)
- "Previsão de pagamento: **{data}** (até 3 dias úteis; fins de semana e feriados não contam)."
- Enquanto o envio de e-mail estiver desligado, **não** escrever "você receberá um e-mail". Usar: "Acompanhe o andamento em Extrato."
- Nota (Controle, 22/11): o saque em dias úteis ("D+3 úteis") já é a regra do site; o erro do B06 era só a data prevista contar dias corridos. O texto acima vale. A01 é outra coisa: o prazo da retirada física, decisão do Gabriel.

### Depósito (B07)
- Um aviso só, com cara de erro: "Informe um valor em reais, só com números. Exemplo: 150,00."
- Se houver mínimo (decisão pendente): "O depósito mínimo é de R$ {valor}."
- Sem valor válido, mostrar "—" no saldo previsto, nunca "R$ NaN".

### Oferta sem saldo (S04)
- Botão desabilitado + motivo logo abaixo: "Saldo insuficiente. Faltam R$ {valor}. Deposite para continuar."
- Quantidade/preço: "Informe um número maior que zero."

### CEP (S03)
- "Não encontramos este CEP. Confira os números ou preencha o endereço à mão."
- Botão Continuar desabilitado mostra: "Falta preencher: {campos}."

### Banner de cookies (A09) — texto proposto, NÃO ligar (decisão do Gabriel)
- "Usamos cookies essenciais para o site funcionar e, com a sua permissão, cookies de medição para entender como o Real Olímpico é usado. Você pode mudar a escolha quando quiser. Saiba mais na Política de Privacidade."
- Botões de peso igual (44px): **Aceitar todos** · **Só os essenciais**; link "Personalizar". Não pré-marcar medição. Citar a Meta pelo nome na Política, não no banner.

### Validação de cadastro (B03/A16)
- Data: "Informe uma data de nascimento válida. É preciso ter 18 anos ou mais."
- Telefone: "Informe o telefone com DDD. Exemplo: (11) 91234-5678."
- Pix: e-mail "Informe um e-mail completo, com @ e domínio."; CPF "Este CPF não parece correto. Confira os números."; aleatória "A chave aleatória tem 36 caracteres. Copie e cole."
- Nome: "Use seu nome completo, como no documento."

### Termos (B08)
Só formatação e erros materiais. Cláusulas citadas por número errado: lista ao jurídico, sem inventar texto.

## Revisões de texto (leitura do código, 22/11 ~20:35)
Ainda não há aviso de "corrigido" do Tester/Controle; isto é leitura antecipada do working tree. Nenhuma palavra proibida encontrada; marca ok.

**R3 (validacao-dinheiro, validacao-cadastro, AccountModals, /compras, /envios, /vender)** — aprovado, com 4 ajustes de redação:
1. Chave Pix aleatória (`validacao-cadastro.ts`): "tem o formato 123e4567-… (32 letras e números)" confunde, pois o exemplo tem hífens e 36 caracteres. Sugestão: "A chave aleatória tem 36 caracteres, com hífens. Exemplo: 123e4567-e89b-12d3-a456-426614174000. Copie e cole."
2. CPF Pix: "precisa ser um CPF válido (11 dígitos)" → "Este CPF não parece correto. Confira os 11 números."
3. "Informe nome e sobrenome, como estão no seu documento" está bom. Padronizar "nome de exibição" nas outras mensagens: ok como está.
4. Aviso de e-mail no Sacar: "o aviso por e-mail ainda não está ativo" é honesto, mas ficou negativo para o cliente. Sugestão: "Acompanhe o andamento do saque no Extrato." e deixar a frase do e-mail só nas Notificações. (R3 já anotou para reverter quando o envio ligar.)
5. Faltou conferir no ar: toque 44px do link "termos de publicação" (é texto em linha; ok se a linha tiver altura de 44px no celular) e contraste do erro (`role=alert`) no escuro.

**R2 (conta-acesso.ts, email-pendente.ts)** — textos bons ("Se este e-mail tem conta, enviamos um link…" não revela quem tem conta: correto). Ajuste: "Aguarde um minuto antes de pedir outro link." → "Aguarde 1 minuto para pedir outro link." (mais direto). Falta ver a faixa de "e-mail não confirmado" na tela; revisar quando existir.

**R4** — sem `not-found.tsx`, sem banner de cookies ainda. Aguardando.

## Rodada 20:50 — R4 e R2
- R2 aplicou meus 3 ajustes (Pix aleatória, CPF, "Aguarde 1 minuto"). Fechado.
- **404 (`not-found.tsx`)**: aprovado na estrutura: PT, status 404, links por estado, botões e links com 44px (`legal.css`), usa tokens (claro/escuro herdado). Um ajuste: o título "Ops… esta página não existe." destoa do tom sóbrio da marca. Sugestão: **"Página não encontrada"** (o eyebrow "Erro 404" já fica acima). Texto: "O endereço pode ter mudado ou foi digitado errado. Confira ou escolha uma das opções abaixo." A frase "Sua coleção continua guardada no cofre." é boa e coerente com a landing; manter.
- Aguardando: banner de cookies (não existe, correto: decisão do Gabriel), faixa de e-mail não confirmado (R2).
- R4 segurou os Termos em 2.1 (bom). Patch em `TERMOS_v2.2_PATCH_AGUARDANDO_APROVACAO.diff` não lido por mim: é texto jurídico.

## Rodada 21:05 — banner de cookies (A09) e 404
- **404**: título "Página não encontrada" já aplicado (commit 184b3ea). Fechado.
- **Banner (`BannerDeCookies.tsx` + `cookies.css`)**: texto bom, em linguagem simples: "Usamos cookies essenciais… cookies de publicidade da Meta (Facebook e Instagram)… Você pode recusar sem perder nada do serviço." Recusar e Aceitar com o mesmo peso (`btn-ghost`), 44px, tokens `--ro-*` (claro/escuro herdado), em coluna cheia no celular, respeita a área segura do iPhone, fica acima do aviso do PWA e do Atendimento. Marca no masculino, sem palavra proibida. Nada a corrigir no visual.
- **Registro (Controle, 22/11):** o A09 ligado é ordem do Gabriel (resolver tudo do relatório). O efeito na medição da Meta (quem recusa ou ignora não conta) é consequência conhecida e aceita. O banner fica. O alerta abaixo fica só como histórico.
- **Alerta ao Controle (histórico):** o banner está **ligado no `layout.tsx`** e o Pixel passa a esperar o "Aceitar". A09 era "preparar, não ligar". Isso muda a medição da campanha da Meta (quem recusar ou ignorar não conta). Só vale subir com o aval do Gabriel; sem aval, tirar a linha do `layout.tsx` ou deixar sem `META_PIXEL_ID`... (este último não serve: o Pixel está no ar). Recomendo perguntar antes do deploy.
- Pequeno: "Cookies no Real Olímpico." ok. Sugestão opcional: o link "Saiba mais" levar a um trecho de cookies da Política (hoje vai para /privacidade inteira); só vale se a Política citar a Meta (A09).

## Rodada 21:20 — R4 (Termos 2.2, Política 2.1, Taxas 2.4) e R1
- Lido no commit a267335: "Prazos operacionais: até D+3 (3 dias úteis) para saques e até 30 dias úteis… para a retirada física" — claro e consistente com a Academy ("Hoje não há apólice de seguro contratada"). Marca e vocabulário ok.
- **Ponto de redação (para o jurídico, não bloqueia):** o nome "Retirada **Segura**" sem seguro contratado pode ser lido pelo cliente como "segurada". Sugestão: manter o nome só se a tela e a Tabela explicarem na mesma linha o que a torna segura ("embalagem lacrada e rastreio, sem seguro de valor"), ou chamar de "Retirada Rastreada". Decisão do Gabriel/jurídico.
- Divergência já anotada pelo Tester: cabeçalho de `/termos` mostrava "2.1" (esperado 2.2) e `/taxas` "2.3" (esperado 2.4). Provável cache/deploy anterior ao commit; confirmar na próxima rodada do Tester.
- **Crítico do Tester (#310, telas logadas presas em "Carregando a tela…")**: não é de texto; está com R1. Só revisar o visual (44px do banner, botões flutuantes, 375/768/escuro) depois que as telas montarem.

## Rodada 21:40 — revisão visual do banner no ar (realolimpico.com.br, painel visível, só leitura, sem clicar Aceitar/Recusar)
- 375px: faixa 351×204px (**25% da altura da tela**), botões Recusar/Aceitar 154×44px lado a lado, mesmo peso. Fundo é o gradiente do token (`--ro-cartao`; o `backgroundColor` "transparente" é só porque é imagem), borda dourada, sombra: legível.
- 1024px (desktop): faixa 760×109px centralizada, botões 44px.
- Ponto único de melhoria (mobile): 204px é muito alto. Sugestão: no celular reduzir o texto a 2 linhas ("Usamos cookies essenciais e, com sua permissão, cookies de publicidade da Meta. Você pode recusar sem perder nada. Saiba mais") ou diminuir o padding; meta ≤ 150px. Não bloqueia.
- Nesta conta (equipe) o passeio do tutorial abre por cima da faixa: o cliente novo verá o tutorial antes de poder escolher. Aceitável; só confirmar que o tutorial não impede o clique nos botões depois de fechado.
- Não conferido: modo claro (a conta/tela estava no escuro; as cores vêm de tokens, sem cor fixa no CSS) e 768px.

## Revisões de correção
(nenhuma recebida ainda)

## Log da rotina
- 22/11 ~20:20: criada; primeira leitura sem MDs de execução.
