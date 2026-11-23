--- p1
Relatório de validação de QA — Real Olímpico
Elaborado por Davi Bego (QA) · Validação de 19 a 20/11/2026 · Ambiente: produção
(realolimpico.com.br) · Conta de teste: a@a.co
Validação de ponta a ponta do site, nas páginas públicas e na área logada, em computador e celular, nos modos
claro e escuro. Os testes foram automatizados e todos os pontos deste relatório foram conferidos manualmente pelo
QA. Nada foi comprado, vendido, depositado, sacado ou enviado: os formulários foram testados até antes do botão
final.
O site está funcional e bem acabado: a proposta é clara, os custos batem em todas as telas e o cliente novo é bem
guiado. A maior parte dos pontos são ajustes de validação e de coerência entre textos. Um ponto pede ação
imediata: o B01.
30
cenários executados
(9 aprovados, 4 com
ressalva, 15
reprovados, 2 a
confirmar)
10
bugs (1 crítico, 2 de
prioridade alta)
17
pontos de atenção
8
sugestões de
usabilidade
13
perguntas sobre
regras de negócio
Documento confidencial. O item B01 descreve uma falha que expõe dados de clientes. Compartilhe só com o time
responsável até a correção. Nenhum dado pessoal de clientes foi copiado para este relatório; os prints mostram apenas
a conta de teste.
Ordem sugerida de correção
1. B01 — Dados de clientes no código das páginas logadas: corrigir antes de tudo e avaliar a comunicação do
incidente.
2. B02 + S01 — Confirmação de e-mail no cadastro e recuperação de senha.
3. B03 + A16 — Validação do cadastro formal: nome, data de nascimento (18+) e chave Pix de saque.
4. B06 — Previsão do saque em dias úteis.
5. A01 · A02 · A03 — Decidir e alinhar nos textos: prazo da retirada, seguro do acervo e guarda por moeda
equivalente.
6. Demais itens — Bugs visuais, Termos de Uso e ajustes de texto: correções rápidas que podem entrar no mesmo
ciclo.

--- p2
Pontos fortes
O que já funciona bem e vale manter.
Proposta clara logo de cara
A home explica em uma frase o que é (guarda
em cofre + marketplace de recibos) e, logo
abaixo, o que não é (corretora, banco,
investimento). A mesma mensagem se repete na
Academy, nos Termos e no rodapé.
Custos transparentes e coerentes
A calculadora da home, a Tabela de Taxas, a
confirmação de compra e a oferta de compra
deram exatamente os mesmos valores. Ex.:
moeda a R$ 180 → comprador paga R$ 183,90 e
vendedor recebe R$ 178,10; compra a R$ 160 →
taxa R$ 1,80 + custódia R$ 2,00 = R$ 163,80.
Boa ajuda ao cliente novo
Tour de boas-vindas em 6 etapas, bem escrito
("nada será comprado, vendido nem alterado"),
guia por página e estados vazios que explicam
o próximo passo (Extrato, Custódia, Faturas,
Notas fiscais, Retiradas).
Login bem resolvido
Mensagem genérica ("E-mail ou senha
incorretos") que não revela se o e-mail existe;
senha mínima de 8 caracteres e conferência de
senha no cadastro; verificação em duas etapas
disponível.
Navegação estável
Os 24 links internos responderam sem erro;
páginas públicas sem erro no console; 11 telas
testadas no celular (390 px) sem rolagem lateral
e com menu; modo claro e escuro funcionando
nas 9 telas testadas.
Transparência e controle
Documentos com versão, data de vigência e
código de integridade; extrato com exportação
CSV/XLSX; notas fiscais; auditoria de estoque
por tipo de moeda; cookie de sessão protegido
e cabeçalhos básicos de segurança (HSTS,
proteção contra iframe).
Como a validação foi feita
Escopo: home, Academy, Tabela de Taxas, Termos de Uso, Política de Privacidade, SAC, cadastro, login e todas as
telas da área logada (Início, Mercado, Compras, Vendas, Envios, Recibos, Atendimento, Notas fiscais e Minha conta
com suas subpáginas), mais o tour de boas-vindas e o tutorial de cada página.
Técnicas ISTQB: partição de equivalência, análise de valor-limite, tabela de decisão, transição de estado, caso de uso,
suposição de erro, revisão estática dos documentos e checklist de usabilidade e segurança.
Ambiente: Chrome automatizado (Playwright) em 1440×900 e 390×844, com uma trava que bloqueava qualquer
gravação, seguido de validação manual de cada ponto pelo QA.
Leitura dos itens: Bug comportamento errado · Ponto de atenção regra ou texto que se contradiz · Sugestão de
melhoria melhoria de experiência. Prints com moldura vermelha marcam o ponto exato.
Resumo dos itens 35

--- p3
ID
Item
Tipo
Prioridade
Validação
B01
Dados de todos os clientes vão junto com as
páginas logadas
Bug
Crítica
Confirmado
B02
Conta é criada e marcada como "e-mail
verificado" sem confirmação
Bug
Alta
Confirmado
B03
Cadastro formal aceita e grava dados inválidos
Bug
Alta
Confirmado
B04
Números do tutorial ficam por cima das janelas
Bug
Média
Confirmado
B05
"até30" sem espaço na Academy
Bug
Baixa
Confirmado
B06
Previsão do saque não conta dias úteis
Bug
Média
Confirmado
B07
Depósito acima do limite: aviso repetido e saldo
calculado com valor inválido
Bug
Baixa
Confirmado
B08
Termos de Uso: formatação e referências a
cláusulas que não existem
Bug
Média
Confirmado
B09
Envios: o campo Ano aceita anos que não existem
para a moeda
Bug
Baixa
Confirmado
B10
Página inexistente sem tratamento
Bug
Baixa
Confirmado
A01
Prazo da retirada física diferente entre os
documentos
Ponto de
atenção
Alta
Confirmado
A02
Seguro do acervo: contratado ou ainda não?
Ponto de
atenção
Alta
Confirmado
A03
Home fala em "seu item"; os Termos dizem que a
moeda devolvida pode ser outra
Ponto de
atenção
Alta
Confirmado
A04
Nenhum aceite de termos registrado para a conta
Ponto de
atenção
Média
Confirmado
A05
Política diz "cadastro progressivo", mas a 1ª
compra já pede endereço e Pix
Ponto de
atenção
Média
Confirmado
A06
Avisos por e-mail prometidos, mas ainda
desligados
Ponto de
atenção
Média
Confirmado
A07
"Média de mercado" com dois valores diferentes
para a mesma moeda
Ponto de
atenção
Média
Confirmado
A08
Auditoria mostra a receita da empresa para
qualquer cliente
Ponto de
atenção
Média
Confirmado

--- p4
ID
Item
Tipo
Prioridade
Validação
A09
Rastreamento de anúncios sem aviso de cookies
Ponto de
atenção
Média
Confirmado
A10
Comparativo com BTC, ETH e USDT na tela do
Mercado
Ponto de
atenção
Média
Confirmado
A11
Login: "Entre com a conta confirmada dos
sócios."
Ponto de
atenção
Média
Confirmado
A12
Academy publicada, mas "Em breve" no menu
interno
Ponto de
atenção
Baixa
Confirmado
A13
Códigos e termos internos à vista do cliente
Ponto de
atenção
Baixa
Confirmado
A14
Dois e-mails de contato diferentes
Ponto de
atenção
Baixa
Confirmado
A15
Academy anuncia "três soluções" e lista quatro
Ponto de
atenção
Baixa
Confirmado
A16
Dois campos "Nome completo" com valores
diferentes
Ponto de
atenção
Baixa
Confirmado
A17
Moeda Direitos Humanos com composição
diferente
Ponto de
atenção
Baixa
Confirmado
S01
Não existe "Esqueci minha senha"
Sugestão de
melhoria
Alta
Confirmado
S02
Venda: "termos de publicação" sem link e seletor
de moeda repetido
Sugestão de
melhoria
Média
Confirmado
S03
Envios: botão Continuar desabilitado sem dizer o
que falta
Sugestão de
melhoria
Média
Confirmado
S04
Oferta de compra: botão liberado sem saldo e
com valores inválidos
Sugestão de
melhoria
Média
Confirmado
S05
Celular: botões flutuantes cobrem o conteúdo
Sugestão de
melhoria
Média
Confirmado
S06
Janelas não fecham com Esc nem clicando fora
Sugestão de
melhoria
Baixa
Confirmado
S07
Plurais com "(s)"
Sugestão de
melhoria
Baixa
Confirmado
S08
Pontuação "custódia —, sem usar"
Sugestão de
melhoria
Baixa
Confirmado

--- p5
1. Prioridade alta 3
Segurança e dados dos clientes. Recomendação: tratar antes de qualquer outro item.
B01
Bug
Prioridade crítica
Segurança · LGPD
Dados de todos os clientes vão junto com as páginas logadas
Onde: Qualquer tela logada: Início, Mercado, Compras, Vendas, Recibos, Minha conta
Ao abrir uma tela logada, o servidor envia ao navegador o estado completo da plataforma, e não só os dados de quem
está logado. A tela não mostra esses dados, mas eles ficam no código da página e qualquer pessoa logada consegue
ler. Como a conta é criada em segundos com um e-mail inventado (B02), na prática qualquer pessoa chega a eles.
Para quem não está logado, os dados não aparecem.
O que vai no
código da página
Registros
Outros usuários
com e-mail, nome,
saldo e último
acesso
142
Com cadastro
completo: CPF,
nome completo,
data de
nascimento,
telefone, endereço
completo
25
Com chave Pix
23
Com banco,
agência e conta
2
Listas completas
da plataforma
ofertas, negociações, envios, depósitos, saques, faturas, planos e reservas
Medido em 20/11/2026 com a conta a@a.co, contando só registros e nomes de campos. Nenhum valor de terceiro
foi lido, salvo ou colocado neste relatório.
Esperado: Cada tela recebe só os dados da conta logada; totais do mercado (moedas em custódia, volume)
calculados no servidor. Depois da correção, vale verificar nos registros de acesso se houve uso indevido e avaliar
com o jurídico se o caso precisa ser comunicado à ANPD e aos titulares (LGPD, art. 48).
Validação do QA: Confirmado na validação manual: ao entrar com qualquer usuário, os dados de todos os
usuários ficam expostos no código da página.
Como conferir
1. Entrar com a conta de teste e abrir Início.

--- p6
2. Abrir o código-fonte da página (Ctrl+U) e procurar por initialState .
Resultado observado: Hoje: um objeto users com e-mails de outras pessoas e campos como
cpf , chavePix e endereco . Depois da correção: só os dados da própria conta.
B02
Bug
Prioridade alta
Segurança · Cadastro
Encontrado na validação manual
Conta é criada e marcada como "e-mail verificado" sem confirmação
Onde: Criar conta → Prefiro usar e-mail e senha · Minha conta → Segurança
A tela de cadastro orienta a "confirmar o cadastro no e-mail que você receber", mas o cadastro termina na hora com
"Conta criada e confirmada. Você já pode entrar.", inclusive com um e-mail que não existe (a@a.co). Em Segurança, o
resumo mostra "E-mail verificado: Verificado". Os Termos (cap. 6) dizem que a verificação de identidade acontece
antes de abrir a conta. Num serviço que guarda patrimônio, isso permite criar contas falsas em série e é a porta de
entrada para o B01.
Esperado: Enviar um link de confirmação e só liberar a conta (ou, no mínimo, depósito, compra e saque) depois do
clique. O selo "E-mail verificado" só aparece depois da confirmação.
Validação do QA: Confirmado na validação manual.
Sugestões do QA para o cadastro
1. Entrar direto depois de criar a conta. Hoje, depois de "Criar conta por e-mail", o usuário continua na tela de
cadastro com a mensagem "Você já pode entrar" e precisa ir ao login. Depois da confirmação do e-mail
(clique no link), levar o usuário direto para o Início já logado.
2. Botão "Mostrar senha" no cadastro. Os campos Senha e Confirmar senha não deixam ver o que foi digitado.
O login já tem esse botão (ícone de olho): repetir o mesmo padrão no cadastro, para o usuário conferir a
senha antes de criar a conta.
Como conferir
1. Abrir Criar conta e ler o passo 4 de "Veja como se cadastrar".
Resultado observado: "Depois confirme o cadastro no e-mail que você receber."
2. Entrar com a@a.co e abrir Minha conta → Segurança.
Resultado observado: Resumo de segurança: "E-mail verificado — Verificado".

--- p7
Print da validação manual · conta confirmada na
hora com a@a.co
Evidência · Texto do cadastro × resumo de
segurança
Evidência · Cadastro sem "Mostrar senha" × login
com "Mostrar senha"

--- p8
B03
Bug
Prioridade alta
Validação de campos
Encontrado na validação manual
Cadastro formal aceita e grava dados inválidos
Onde: Minha conta → Dados pessoais → Editar dados (o mesmo formulário aparece antes da 1ª compra)
O cadastro formal, usado para saque e nota fiscal, aceitou e gravou: data de nascimento 14/04/2027 (futura), nome do
titular "a a a", telefone (11) 11111-1111 e chave Pix do tipo E-mail com o valor 123123123123123. O campo de data não tem
limite e os Termos (cap. 2) exigem 18 anos. A chave Pix é o destino do dinheiro do saque: um "e-mail" sem @ leva a um
saque com destino inválido.
Esperado: Data de nascimento não pode ser futura e precisa indicar 18 anos ou mais. Chave Pix validada pelo tipo
(e-mail com @ e domínio, CPF com dígito verificador, telefone com DDD, chave aleatória no formato próprio).
Nome com nome e sobrenome. Validar na tela e no servidor. Regras sugeridas para o nome em A16.
Validação do QA: Confirmado na validação manual.
Como conferir
1. Abrir Minha conta → Dados pessoais → Editar dados.
Resultado observado: Nascimento 14/04/2027, nome "a a a", telefone (11) 11111-1111 e Pix (E-mail)
123123123123123 já gravados.
2. Clicar em Cancelar (não salvar).
Print da validação manual · data de nascimento
futura aceita
Evidência · Valores gravados no cadastro formal
2. Bugs 7
Comportamento diferente do esperado, com passo a passo para reproduzir.

--- p9
B04
Bug
Prioridade média
Visual · Tutorial
Encontrado na validação manual
Números do tutorial ficam por cima das janelas
Onde: Ver tutorial desta página + qualquer janela (Minha conta, Mercado, Início)
Com o tutorial da página aberto, ao abrir uma janela os números do guia e o painel "Guia de …" continuam por cima
dela. O problema não é só em Minha conta: no Mercado, o nº 4 cobre o preço unitário na confirmação de compra; no
Início, os nº 3 e 6 ficam sobre o campo de valor e o botão Cancelar do depósito.
Esperado: Ao abrir uma janela, esconder os números e o painel do guia (ou fechar o tutorial) e mostrar de novo
quando a janela fechar.
Validação do QA: Confirmado na validação manual.
Como conferir
1. Menu lateral → Minha conta → "Ver tutorial desta página" (canto inferior direito).
Resultado observado: Números 1 e 2 nos blocos e o painel "Guia de Minha conta".
2. Clicar em Dados pessoais.
Resultado observado: Defeito: números e guia por cima da janela.
3. Repetir em Mercado → Ver tutorial → Comprar em qualquer oferta. Fechar sem pagar.
Resultado observado: Defeito: o nº 4 em cima do preço unitário.

--- p10
Print da validação manual · nº 3 sobre a janela
Dados pessoais
Evidência · Minha conta, Mercado e Início
B05
Bug
Prioridade baixa
Texto
Encontrado na validação manual
"até30" sem espaço na Academy
Onde: Academy → 6. Perguntas frequentes → "Quais são os prazos de saque e de resgate físico?"
O texto aparece como "até30 dias corridos".
Esperado: "até 30 dias corridos".
Validação do QA: Confirmado na validação manual.
Como conferir
1. Abrir Academy e ir até a seção 6.
Resultado observado: "o Real Olímpico tem até30 dias corridos…"

--- p11
Print da validação manual
Evidência
B06
Bug
Prioridade média
Regra de negócio · Saque
Previsão do saque não conta dias úteis
Onde: Minha conta → Sacar → Prazo de liquidação
Em 20/11/2026 a janela mostra "D+3 úteis (previsão: 23/11/2026)". 20/11/2026 é sexta-feira e feriado nacional
(Consciência Negra); contando dias úteis, o 3º dia útil é quarta, 25/11/2026. A data mostrada são 3 dias corridos, ou
seja, a tela promete o dinheiro 2 dias antes do prazo real.
Esperado: Calcular a previsão em dias úteis, pulando fins de semana e feriados nacionais.
Validação do QA: Confirmado na validação manual.
Como conferir
1. Abrir Minha conta → Sacar.
Resultado observado: Prazo de liquidação "D+3 úteis (previsão: …)". Pedido numa sexta deve
prever a quarta seguinte.
2. Clicar em Cancelar.
Evidência
B07
Bug
Prioridade baixa
Validação · Depósito

--- p12
Depósito acima do limite: aviso repetido e saldo calculado com valor inválido
Onde: Minha conta → Depositar
Com 100000,01 no campo, o aviso "O depósito máximo por operação é R$ 100.000,00." aparece duas vezes, em letra
pequena e cinza, e "Saldo após o depósito" mostra R$ 100.000,01 como se o valor fosse aceito. O campo também
aceita letras e valores negativos sem aviso (só não libera Pix/Cartão) e não há valor mínimo: R$ 0,01 já libera "Gerar
código Pix".
Esperado: Um aviso só, com cara de erro; não calcular saldo com valor inválido; campo só numérico; definir um
depósito mínimo (cada Pix gerado tem custo do intermediador).
Validação do QA: Confirmado na validação manual.
Como conferir
1. Abrir Minha conta → Depositar, digitar 100000,01 e apertar Tab.
Resultado observado: Aviso repetido e saldo após R$ 100.000,01.
2. Clicar em Cancelar (não gerar Pix).
Evidência
B08
Bug
Prioridade média
Documento legal
Termos de Uso: formatação e referências a cláusulas que não existem
Onde: Termos de Uso, Política de Privacidade, Criar conta, Segurança e Tabela de Taxas
1) As listas aparecem como "a))", "b))" em todos os capítulos dos Termos e da Política. 2) Os parágrafos não têm
número, mas o site cita cláusulas por número: o cadastro e a tela Segurança citam "Capítulo 14.4" (o capítulo 14 só tem
14.5.1 a 14.5.6); a Tabela de Taxas cita "Cláusula 7.3.3", que não aparece nos Termos; o capítulo 14 manda ver as
"negociações previstas na Cláusula 13.2", mas o capítulo 13 é Proteção de Dados. 3) Erros de texto: "14.5.4.) A
observará o Direito brasileiro" (falta "A arbitragem"); "1 (uma moeda)" em vez de "1 (uma) moeda"; "reestabelecer" em
vez de "restabelecer"; "Este Termos de Uso rege" e "o Termos de Uso" em vez de "Estes Termos de Uso regem" e "os
Termos de Uso".
Esperado: Numerar as cláusulas do jeito que são citadas e revisar o texto com o jurídico, porque é o contrato com
o cliente.

--- p13
Validação do QA: Confirmado na validação manual.
Como conferir
1. Abrir Termos de Uso → Capítulo 14.
Resultado observado: Listas com "a))", "Cláusula 13.2" e "A observará".
2. Abrir Criar conta → Prefiro usar e-mail e senha.
Resultado observado: Cláusula de arbitragem citando "Capítulo 14.4".
Evidência
B09
Bug
Prioridade baixa
Validação · Envios
Envios: o campo Ano aceita anos que não existem para a moeda
Onde: Envios → Dados do envio → Ano
O Ano lista de 2016 a 1980 para as duas moedas. A Entrega da Bandeira é de 2012 e a Direitos Humanos de 1998; anos
antes de 1994 nem existem para moedas de Real. O sistema já pré-seleciona o ano certo, mas deixa trocar.
Esperado: Ano preenchido pelo tipo de moeda e travado (ou só os anos de emissão daquela moeda).
Validação do QA: Confirmado na validação manual.
Como conferir
1. Abrir Envios e abrir a lista Ano.
Resultado observado: Anos de 2016 a 1980 para qualquer moeda.

--- p14
Evidência
B10
Bug
Prioridade baixa
Navegação
Página inexistente sem tratamento
Onde: Qualquer endereço que não existe
Logado, aparece "404 | This page could not be found." (página padrão, em inglês, sem menu nem botão de voltar).
Deslogado, o endereço inexistente redireciona para a tela de login.
Esperado: Página 404 em português, com o visual do site e links para Início e Mercado.
Validação do QA: Confirmado na validação manual.
Sugestão do QA para a página 404
Referência usada na validação: o site do Banco Inter. Um endereço que não existe responde com erro 404 de
verdade, mantém o menu e o rodapé do site e mostra "Ops... página não encontrada!" seguido de "Aqui estão
alguns links que você pode estar procurando", com os links principais. O cliente nunca fica sem saída.
1. Página própria em português, com o visual do Real Olímpico, mantendo o cabeçalho e o menu.
2. Mensagem curta e tranquilizadora, por exemplo: "Ops… esta página não existe. O endereço pode ter mudado
ou foi digitado errado. Sua coleção continua guardada no cofre."
3. Dois botões principais: "Voltar para o Início" e "Ir para o Mercado".
4. Bloco "Links que você pode estar procurando": logado, Minhas moedas, Enviar moeda, Comprar, Vender,
Extrato, Atendimento; deslogado, Como funciona, Tabela de taxas, Academy, Entrar e Criar conta (em vez de
redirecionar direto para o login).
5. Responder com status HTTP 404 e registrar o endereço acessado, para o time encontrar e corrigir links
quebrados.
Como conferir
1. Logado, abrir https://realolimpico.com.br/pagina-que-nao-existe.
Resultado observado: "404 | This page could not be found."

--- p15
Evidência
Protótipo · Protótipo da sugestão (visual ilustrativo)
3. Regras e informações que se contradizem 10
Pontos em que duas telas ou documentos dizem coisas diferentes. Pedem uma decisão do negócio antes do ajuste.
A01
Ponto de atenção
Prioridade alta
Prazos
Prazo da retirada física diferente entre os documentos
Onde: Termos (cap. 7) × Academy, destaques dos Termos e tela Retiradas
Os Termos (cap. 7) dizem "até 30 (trinta) dias úteis" para o cliente receber a moeda. A Academy, o quadro de
destaques dos próprios Termos e a tela Retiradas dizem "até 30 dias corridos para preparar e POSTAR", com a entrega
dos Correios por fora. São dois prazos diferentes (úteis × corridos; receber × postar).
Sugestão: Um prazo só, igual em todos os textos.
Validação do QA: Confirmado na validação manual.
Como conferir
1. Abrir Termos → Capítulo 7, parte de retirada.
Resultado observado: "30 (trinta) dias úteis após a confirmação…"
2. Abrir Retiradas físicas.
Resultado observado: "30 dias corridos para preparar e POSTAR"

--- p16
Evidência
A02
Ponto de atenção
Prioridade alta
Seguro
Seguro do acervo: contratado ou ainda não?
Onde: Academy (seção 6) × Tabela de Taxas (seção 2)
A Academy diz que "os detalhes da apólice serão publicados aqui quando a contratação estiver concluída", ou seja,
ainda não há apólice. A Tabela de Taxas diz que a taxa de custódia remunera "monitoramento 24 horas, auditoria
permanente do acervo e apólice securitária".
Sugestão: Deixar claro o status atual do seguro em todos os textos. É uma das primeiras dúvidas de quem vai
deixar patrimônio sob guarda.
Validação do QA: Confirmado na validação manual.
Como conferir
1. Abrir Academy → "Existe seguro contratado para o acervo?"
2. Abrir Tabela de Taxas → seção 2.

--- p17
Evidência
A03
Ponto de atenção
Prioridade alta
Proposta de valor
Home fala em "seu item"; os Termos dizem que a moeda devolvida pode ser
outra
Onde: Home (Segurança) × Academy (seção 6) e Termos (cap. 7)
A home diz "Depois da perícia, ninguém toca no seu item. Nem nós." e fala em "recibo digital ligado ao laudo da
perícia". A Academy e os Termos dizem que a guarda é de moedas equivalentes e que, na retirada, o cliente pode
receber outro exemplar da mesma categoria. Quem lê só a home entende que a guarda é individual.
Sugestão: Dizer na home, em linguagem simples, que a guarda é por moeda equivalente, e ajustar a frase
"ninguém toca no seu item".
Validação do QA: Confirmado na validação manual.
Como conferir
1. Abrir a home → Segurança.
2. Abrir Academy → "A moeda que resgatarei será a mesma exata que enviei?"
Resultado observado: "Não necessariamente a mesma unidade física."

--- p18
Evidência
A04
Ponto de atenção
Prioridade média
Prova de aceite
Nenhum aceite de termos registrado para a conta
Onde: Minha conta → Segurança → Documentos Legais e Aceites Formais
A tela diz "Nenhum registro formal localizado no banco de dados. Os aceites são gerados automaticamente na criação
da conta ou na confirmação dos termos." A conta a@a.co foi criada aceitando Termos, Política e Tabela ("Ao criar sua
conta, você declara ter lido e concordado…"). Ou o aceite não foi gravado, ou a tela não está lendo.
Sugestão: Registrar o aceite no cadastro (documento, versão, data, canal) e mostrar aqui. É a prova do contrato.
Validação do QA: Confirmado na validação manual.
Como conferir
1. Abrir Minha conta → Segurança e rolar até o fim.
Resultado observado: Tabela vazia.

--- p19
Evidência
A05
Ponto de atenção
Prioridade média
LGPD · Cadastro
Política diz "cadastro progressivo", mas a 1ª compra já pede endereço e Pix
Onde: Política de Privacidade (cap. 2) × Completar cadastro formal
A Política diz que o endereço é "solicitado apenas na retirada física" e os dados bancários "exclusivamente para
liquidação de saques". O "Completar cadastro formal", que aparece antes da primeira compra direta, já traz os blocos
Endereço residencial e Dados para recebimento de saques.
Sugestão: Alinhar a Política com a tela, ou pedir na compra só o necessário (CPF, nome, nascimento).
Validação do QA: Confirmado na validação manual.
Como conferir
1. Abrir Política de Privacidade → Capítulo 2, itens d) e e).
2. Ver o print do "Completar cadastro formal" (a janela só aparece antes da primeira compra, enquanto o cadastro
está incompleto).

--- p20
Evidência
Print da validação manual · formulário pedido antes
da compra
A06
Ponto de atenção
Prioridade média
Comunicação com o cliente
Avisos por e-mail prometidos, mas ainda desligados
Onde: Minha conta → Notificações × Minha conta → Sacar
Notificações: "O envio por e-mail ainda não está ativo". Sacar: "Você recebe um e-mail quando o saque for pago."
Sugestão: Tirar a promessa do Sacar enquanto o e-mail não estiver ativo, ou ativar o envio.
Validação do QA: Confirmado na validação manual.
Como conferir
1. Abrir Minha conta → Notificações. Fechar em Concluir sem mudar nada.
2. Abrir Sacar e ler o texto abaixo do prazo. Cancelar.

--- p21
Evidência
A07
Ponto de atenção
Prioridade média
Números do mercado
"Média de mercado" com dois valores diferentes para a mesma moeda
Onde: Home e Início × Compras e Vendas
Para a Entrega da Bandeira, a home e o Início mostram "Média de mercado R$ 160,00" (coincide com o menor anúncio
de venda); Compras e Vendas mostram "Média de mercado — 7 dias R$ 210,00" (média das negociações da semana).
No Início, "Moedas no Mercado: 227" é o total em custódia (no Mercado o mesmo número se chama "Moedas em
custódia"; à venda são 112).
Sugestão: Dar a cada número um nome que diga o que ele é (ex.: "Menor preço à venda", "Moedas em custódia")
ou usar o mesmo cálculo.
Validação do QA: Confirmado na validação manual.
Como conferir
1. Abrir Início → card Moeda da Entrega da Bandeira.
Resultado observado: Média de mercado R$ 160,00.
2. Abrir Compras → painel Mercado.
Resultado observado: Média de mercado — 7 dias R$ 210,00.

--- p22
Evidência
A08
Ponto de atenção
Prioridade média
Dados da empresa
Auditoria mostra a receita da empresa para qualquer cliente
Onde: Recibos → Ver auditoria completa
A tela "Conciliação Financeira & Esteira de Custódia" mostra a qualquer cliente logado o saldo em custódia, a receita
arrecadada, as taxas de custódia e as comissões de mercado da empresa. A auditoria de estoque (quantidade de
moedas) faz sentido para transparência; os números financeiros parecem de uso interno.
Sugestão: Confirmar se é intencional. Se não for, deixar visível só a auditoria de estoque.
Validação do QA: Confirmado na validação manual.
Como conferir
1. Abrir Recibos → Ver auditoria completa.
Resultado observado: Quatro cartões com valores financeiros da empresa.

--- p23
Evidência
A09
Ponto de atenção
Prioridade média
LGPD · Cookies
Rastreamento de anúncios sem aviso de cookies
Onde: Home e área logada
O Meta Pixel (cookie _fbp) carrega já na home, sem nenhum aviso ou escolha de cookies. A Política de Privacidade
lista os operadores (infraestrutura, Mercado Pago, transportadoras, e-mail) e não cita Meta nem ferramentas de
anúncio.
Sugestão: Aviso de cookies com opção de recusar os de marketing e citação da ferramenta na Política.
Validação do QA: Confirmado na validação manual.
Como conferir
1. Abrir a home numa janela anônima.
Resultado observado: Nenhum aviso de cookies. (No navegador: F12 → Application → Cookies →
_fbp.)
A10
Ponto de atenção
Prioridade média
Posicionamento
Comparativo com BTC, ETH e USDT na tela do Mercado
Onde: Mercado → Comparação simples → abrir a comparação completa
O Mercado compara o Real Olímpico com BTC, ETH e USDT em 30 dias. O site inteiro reforça que o serviço "não é
investimento" e "não é plataforma de ativos digitais"; comparar com criptomoedas passa a ideia contrária. Os dados
não citam fonte.
Sugestão: Confirmar se o comparativo é desejado. Se ficar, citar fonte e período e reforçar o aviso.
Validação do QA: Confirmado na validação manual.
Como conferir
1. Abrir Mercado → Comparação simples.

--- p24
2. Abrir a comparação completa.
Resultado observado: "Desempenho comparativo — 30 dias".
Evidência
4. Ajustes rápidos de texto 7
Correções pequenas que deixam o site mais consistente.
A11
Ponto de atenção
Prioridade média
Texto
Login: "Entre com a conta confirmada dos sócios."
Onde: Entrar
O subtítulo do login parece de uma fase interna ("dos sócios") e confunde o cliente.
Sugestão: Ex.: "Entre com o e-mail e a senha da sua conta."
Validação do QA: Confirmado na validação manual.
Como conferir
1. Abrir Entrar.
Resultado observado: Subtítulo abaixo de "Acessar plataforma".
Evidência · Mesmo print do S01

--- p25
A12
Ponto de atenção
Prioridade baixa
Navegação
Academy publicada, mas "Em breve" no menu interno
Onde: Menu lateral (logado) × /academy
No menu da área logada, Academy aparece desabilitada com o selo "Em breve". A página /academy já está no ar e
linkada na home.
Sugestão: Ligar o item do menu à página que já existe.
Validação do QA: Confirmado na validação manual.
Como conferir
1. Logado, olhar o fim do menu lateral.
Resultado observado: Academy — Em breve, sem clique.
Evidência
A13
Ponto de atenção
Prioridade baixa
Texto
Códigos e termos internos à vista do cliente
Onde: Tabela de Taxas · SAC · Segurança
"(Decisão F-1 e Cláusula 7.3.3 dos Termos de Uso)" na Tabela de Taxas; "(RA-26)" no SAC; "Nenhum registro formal
localizado no banco de dados" em Segurança.
Sugestão: Tirar os códigos internos e trocar "banco de dados" por linguagem do cliente.
Validação do QA: Confirmado na validação manual.
Como conferir
1. Abrir Tabela de Taxas → seção 1 e SAC → seção 4.

--- p26
Evidência
A14
Ponto de atenção
Prioridade baixa
Texto
Dois e-mails de contato diferentes
Onde: Academy × SAC
A Academy manda dúvidas para contato@aureacustodia.com.br; o SAC diz que o canal é "exclusivamente"
suporte@aureacustodia.com.br.
Sugestão: Um endereço só (ou explicar a diferença).
Validação do QA: Confirmado na validação manual.
Como conferir
1. Ver o fim da Academy e a seção 1 do SAC.

--- p27
Evidência
A15
Ponto de atenção
Prioridade baixa
Texto
Academy anuncia "três soluções" e lista quatro
Onde: Academy → seção 3
"Nossa estrutura oferece três soluções integradas:" seguido de 4 itens (Custódia, Recibos, Marketplace, Resgate
físico).
Sugestão: "quatro soluções", ou juntar itens.
Validação do QA: Confirmado na validação manual.
Como conferir
1. Abrir Academy → seção 3.

--- p28
Evidência
A16
Ponto de atenção
Prioridade baixa
Texto · Cadastro
Dois campos "Nome completo" com valores diferentes
Onde: Minha conta → Dados pessoais × Cadastro formal
Em Dados pessoais, "Nome completo" = "a"; no cadastro formal, "Nome completo (do titular)" = "a a a". Mesmo rótulo,
dados diferentes.
Sugestão: Chamar o primeiro de "Nome de exibição" (ou usar um campo só).
Validação do QA: Confirmado. Hoje o nome é aceito com apenas 1 caractere (a conta de teste foi criada com o
nome "a").
Sugestão do QA: validação do campo Nome completo
Regras usadas por cadastros de bancos e fintechs, para aplicar no cadastro, em Dados pessoais e no cadastro
formal (na tela e no servidor):
1. Tirar espaços do início e do fim e espaços duplos antes de validar e salvar.
2. Exigir nome e sobrenome (pelo menos duas palavras).
3. Cada palavra com 2 letras ou mais, exceto as partículas da, de, di, do, das, dos, e.
4. Aceitar só letras (com acento), espaço, apóstrofo e hífen (ex.: D'Ávila, Ana-Clara). Sem números nem
símbolos.
5. Bloquear a mesma letra repetida 3 vezes ou mais seguidas ("aaa", "a a a").
6. Limite de tamanho (ex.: de 5 a 120 caracteres).
7. Mensagem clara no próprio campo: "Informe nome e sobrenome, como estão no seu documento."
8. No cadastro formal ("Nome idêntico ao documento"), conferir nome, CPF e data de nascimento na base da
Receita Federal por um serviço como a Consulta CPF ou o Datavalid do Serpro, que devolve se o nome
confere e o grau de semelhança. Isso também resolve a data de nascimento falsa do B03.
Para o nome de exibição (Dados pessoais), basta o mínimo: 2 caracteres ou mais, sem números, e o rótulo "Nome
de exibição".
Como conferir
1. Abrir Minha conta → Dados pessoais e depois Editar dados. Cancelar nas duas.

--- p29
Evidência
A17
Ponto de atenção
Prioridade baixa
Texto
Moeda Direitos Humanos com composição diferente
Onde: Home × Início e Mercado
Na home: "Cuproníquel". No Início: "Bimetálica 27mm"; no Mercado: "Bimetálica 27mm · 7,84g".
Sugestão: Uma descrição só, igual em todas as telas.
Validação do QA: Confirmado na validação manual.
Como conferir
1. Comparar a home → Marketplace com o Início.

--- p30
Evidência
5. Sugestões de usabilidade 8
Melhorias de experiência. Nada aqui impede o uso do site.
S01
Sugestão de melhoria
Prioridade alta
Login
Não existe "Esqueci minha senha"
Onde: Entrar → Prefiro usar e-mail e senha
Quem esquece a senha não tem como recuperar pela tela de login.
Sugestão: Link "Esqueci minha senha" com envio de link de redefinição por e-mail.
Validação do QA: Confirmado na validação manual.
Como conferir
1. Abrir Entrar → Prefiro usar e-mail e senha.
Resultado observado: Só E-mail, Senha e Entrar.

--- p31
Evidência
S02
Sugestão de melhoria
Prioridade média
Vendas
Venda: "termos de publicação" sem link e seletor de moeda repetido
Onde: Vendas
O cliente marca "Aceito os termos de publicação", mas o texto não abre nada para ler. O seletor "Tipo de moeda a
vender" aparece duas vezes na mesma tela (Detalhes do anúncio e Escolha as moedas), sincronizados.
Sugestão: Link para os termos de publicação e um seletor só.
Validação do QA: Confirmado na validação manual.
Como conferir
1. Abrir Vendas.
Evidência
S03
Sugestão de melhoria
Prioridade média
Envios
Envios: botão Continuar desabilitado sem dizer o que falta
Onde: Envios → Dados do envio
O Continuar fica cinza sem indicar o que falta (CEP, foto). Buscar CEP com 00000-000 não mostra nenhum aviso.

--- p32
Sugestão: Marcar os campos pendentes e avisar quando o CEP não for encontrado.
Validação do QA: Confirmado na validação manual.
Como conferir
1. Abrir Envios, digitar 00000000 no CEP e clicar em Buscar CEP.
Resultado observado: Nada acontece; Continuar segue desabilitado.
Evidência
S04
Sugestão de melhoria
Prioridade média
Compras
Oferta de compra: botão liberado sem saldo e com valores inválidos
Onde: Compras → Fazer oferta de compra
Com saldo R$ 0,00, a tela avisa "Seu saldo não cobre nenhuma moeda neste preço", mas "Publicar oferta de compra"
continua liberado (testado com 1.000 moedas, R$ 153.750,00). O botão também fica liberado com quantidade 0 ou
negativa e preço 0 ou com letras. Não cliquei para ver a resposta do servidor (produção).
Sugestão: Desabilitar o botão e explicar o motivo na tela.
Validação do QA: Confirmado na validação manual.
Como conferir
1. Abrir Compras, quantidade 1000, preço 150, opção Com saldo.
Resultado observado: Aviso de saldo e botão liberado. Não clicar.

--- p33
Evidência
S05
Sugestão de melhoria
Prioridade média
Celular
Celular: botões flutuantes cobrem o conteúdo
Onde: Todas as telas logadas no celular
"Ver tutorial desta página" e o botão de Atendimento ficam fixos no canto e cobrem conteúdo. Em Minha conta,
cobrem o botão "Enviar uma moeda".
Sugestão: Recolher o tutorial num ícone pequeno ou deixar espaço no fim da página.
Validação do QA: Confirmado na validação manual.
Como conferir
1. No celular, abrir Minha conta.
Resultado observado: "Enviar uma moeda" coberto.

--- p34
Evidência
S06
Sugestão de melhoria
Prioridade baixa
Janelas
Janelas não fecham com Esc nem clicando fora
Onde: Depositar, Sacar, Notificações, Dados pessoais
Só fecham pelos botões Cancelar ou Concluir.
Sugestão: Fechar também com Esc e clique fora (padrão de acessibilidade para janelas).
Validação do QA: Confirmado na validação manual.
Como conferir
1. Abrir Minha conta → Depositar e apertar Esc.
Resultado observado: A janela continua aberta.
S07
Sugestão de melhoria
Prioridade baixa
Texto
Plurais com "(s)"

--- p35
Onde: Mercado, Compras, Vendas, confirmação de compra
"4 anúncio(s) à venda", "100 disponível(is)", "1 unidade(s)", "moeda(s)".
Sugestão: Singular ou plural conforme a quantidade ("1 unidade", "4 anúncios").
Validação do QA: Confirmado na validação manual.
Como conferir
1. Abrir Mercado.
S08
Sugestão de melhoria
Prioridade baixa
Texto
Encontrado na validação manual
Pontuação "custódia —, sem usar"
Onde: Mercado → Comprar → Comprar com Pix ou cartão
"Pague R$ … direto por Pix ou cartão — as moedas, a taxa de compra e o primeiro mês de custódia —, sem usar o
saldo em conta."
Sugestão: Ex.: "Pague R$ … por Pix ou cartão (moedas, taxa de compra e 1º mês de custódia) sem usar o saldo da
conta."
Validação do QA: Confirmado na validação manual.
Como conferir
1. Abrir Mercado → Comprar em qualquer oferta. Fechar sem pagar.

--- p36
Print da validação manual
Evidência
Perguntas sobre regras de negócio 13
Pontos que o site não deixa claros. As respostas ajudam a decidir os ajustes dos itens A01 a A10.
Guarda. A guarda é individual (a moeda que o cliente enviou) ou por moeda equivalente? Se é equivalente, o
"laudo ligado ao recibo" é do exemplar enviado ou da categoria?
Seguro. O seguro do acervo já está contratado? Se não, qual a previsão, e a taxa de custódia já o inclui?
Sicoob. Os cofres e o transporte são do Sicoob, com parceria formal? O site usa "Cofre Sicoob" e "bancos como
o Sicoob"; existe autorização para usar o nome?
Retirada. Qual a diferença entre a Retirada Comum (R$ 50,00) e a Retirada Segura (R$ 180,00)? A Tabela de
Taxas não explica.
Planos. Que "planos de custódia" existem? A tela Faturas e planos e a etapa "Plano" de Envios citam planos; a
Tabela de Taxas só tem R$ 2,00 por moeda por mês.
Compra que falha. Na compra por Pix, cartão ou boleto, se o anúncio for vendido antes da confirmação o valor
vai para o saldo, e para tirar o cliente paga R$ 5,00 de saque. É intencional? No boleto, que compensa em dias,
isso fica mais provável.
Arbitragem. O cadastro diz que a cláusula de arbitragem é opcional; o capítulo 14 dos Termos diz que conflitos a
partir de R$ 100 mil "serão exclusivamente" resolvidos por arbitragem. Para quem não marcou, qual regra vale?
(Vale confirmar com o jurídico.)
Identidade. Os Termos (cap. 6) falam em verificação de identidade com documentos antes de abrir a conta; a
Política (cap. 3) diz que não pede fotos de documentos. Qual é a regra hoje?

--- p37
Avisos. Enquanto o e-mail não está ativo, como o cliente fica sabendo de uma venda, de uma oferta executada
ou de um saque pago?
Auditoria. A tela de auditoria com receita e comissões da empresa está aberta a todos os clientes de propósito?
Comparativo. Qual a fonte e o período dos dados do comparativo com BTC, ETH e USDT? Por que comparar
com cripto, se o serviço não é investimento?
Depósito. Existe depósito mínimo? Hoje R$ 0,01 já gera um Pix.
Outros itens. A home diz que a plataforma foi feita para receber outros itens de coleção com o tempo. Quais
estão nos planos, e com que critério de perícia?
Testes executados 30
ID
Cenário
Técnica ISTQB
Resultado
Item
CT-
01
Links internos (24) e páginas
públicas
Baseado em
checklist
Aprovado
CT-
02
Ortografia e coerência dos textos
públicos
Revisão estática
Reprovado
B05, B08,
A14, A15
CT-
03
Calculadora de taxas da home
(180, 1.000, 0, negativo, texto,
99.999.999)
Partição de
equivalência · valor-
limite
Aprovado
CT-
04
Mesmas taxas na home, Tabela,
confirmação de compra e oferta
de compra
Oráculo: Tabela de
Taxas
Aprovado
CT-
05
Criar conta: obrigatórios, senha
mínima, senhas diferentes (sem
enviar)
Partição · valor-
limite
Aprovado
CT-
06
Criar conta: confirmação de e-
mail
Caso de uso
Reprovado
B02
CT-
07
Login com senha errada e com
e-mail inexistente
Suposição de erro
Aprovado
CT-
08
Login: recuperação de senha
Baseado em
checklist
Reprovado
S01
CT-
09
Tour de boas-vindas (6 etapas)
Caso de uso
Aprovado
CT-
10
Tutorial da página com janela
aberta (Minha conta, Mercado,
Início)
Transição de estado
Reprovado
B04

--- p38
ID
Cenário
Técnica ISTQB
Resultado
Item
CT-
11
Modo claro e escuro (9 telas)
Baseado em
checklist
Aprovado
CT-
12
Celular 390 px (11 telas)
Baseado em
checklist
Aprovado com ressalva
S05
CT-
13
Cadastro formal: dados gravados
(nascimento, Pix, nome, telefone)
Partição de
equivalência
Reprovado
B03
CT-
14
Cadastro formal: limites e
máscaras dos campos
Análise dos campos
Reprovado
B03
CT-
15
Depositar: abc, -50, 0, 0,01, 50,
100.000,01
Valor-limite
Reprovado
B07
CT-
16
Sacar: 10 sem saldo, 0, -1 e
previsão D+3
Valor-limite
Reprovado
B06
CT-
17
Compra direta: confirmação e
cálculo (saldo × Pix/cartão)
Tabela de decisão
Aprovado com ressalva
S08
CT-
18
Oferta de compra: quantidade
0/-2/1.000, preço 0/texto, sem
saldo
Partição · valor-
limite
Reprovado
S04
CT-
19
Anúncio de venda sem moedas
em custódia
Transição de estado
Aprovado com ressalva
S02
CT-
20
Envios: tipo × ano, quantidade
0/-1/999, CEP inválido
Partição · tabela de
decisão
Reprovado
B09, S03
CT-
21
Extrato, Custódia, Faturas, Notas
fiscais e Retiradas (estado vazio)
Baseado em
checklist
Aprovado
CT-
22
Atendimento: janela de
mensagem (sem enviar)
Baseado em
checklist
Aprovado
CT-
23
Endereço inexistente (logado e
deslogado)
Suposição de erro
Reprovado
B10
CT-
24
Dados de terceiros no código
das páginas logadas
Segurança
(checagem passiva)
Reprovado
B01
CT-
25
Cabeçalhos HTTP e cookies
Segurança
(checagem passiva)
Aprovado com ressalva
Notas
técnicas
CT-
26
Auditoria de estoque e
conciliação
Baseado em
checklist
A confirmar
A08

--- p39
ID
Cenário
Técnica ISTQB
Resultado
Item
CT-
27
Coerência entre Termos, Política,
Academy, Tabela e telas
Revisão estática
Reprovado
A01–A12
CT-
28
Console do navegador nas telas
logadas
Baseado em
checklist
Reprovado (leve)
Notas
técnicas
CT-
29
Fechar janelas com Esc e clique
fora
Baseado em
checklist
Reprovado (leve)
S06
CT-
30
Comparativo de desempenho do
Mercado
Revisão
A confirmar
A10
O que não foi executado e por quê
Item
Motivo
Criar novas contas de teste
Grava registros na base de produção. Os campos do cadastro
foram testados sem envio, e a criação de conta foi comprovada
com a conta de teste a@a.co.
Concluir compra, venda, oferta,
depósito, saque e envio
Ambiente de produção. Os formulários foram preenchidos e
conferidos até antes do botão final.
Salvar cadastro formal, dados
pessoais e notificações
Ambiente de produção. Os dados inválidos citados em B03 foram
gravados uma vez, durante a validação manual, na própria conta
de teste.
Assinar a cláusula arbitral, ativar
duas etapas, trocar senha, entrar
com Google
Alteram a conta.
Retirada física e venda de moeda
própria
A conta de teste não tem moedas em custódia.
Testes de invasão, carga e injeção
Fora do escopo combinado para produção. A segurança foi
avaliada só de forma passiva.
Notas técnicas para o time de desenvolvimento
B01: o objeto initialState (users, sellOffers, buyOrders, trades, envios, deposits, saques, faturasCustodia,
planosCustodia, reservas) vai no payload das páginas logadas ( self.__next_f ). Deslogado, as rotas
redirecionam para /entrar e o objeto não aparece.
Erro do React nº 418 (diferença entre o texto gerado no servidor e no navegador) no console de Mercado,
Compras e Recibos.
Sem cabeçalho Content-Security-Policy. Presentes: Strict-Transport-Security (2 anos), X-Frame-Options DENY,
X-Content-Type-Options nosniff e Referrer-Policy.
Cookies sb-…-auth-token sem a flag Secure (o aurea_session está com HttpOnly e Secure).

--- p40
Campos de valor (Depositar, Sacar, preço) aceitam letras e negativos; a quantidade de Compras aceita negativos
(o atributo min=1 não bloqueia digitação).
Data de nascimento sem max ; Pix sem validação por tipo; nenhum campo do cadastro formal marcado como
obrigatório no HTML.
Meta Pixel carregado sem consentimento (cookie _fbp ).
Próximos passos
1. Corrigir o B01 e avaliar com o jurídico a comunicação do incidente. 2. Responder as perguntas de regra de negócio
para fechar os pontos de atenção. 3. Corrigir os demais itens na ordem sugerida. 4. Depois dos ajustes, os itens podem
ser retestados com os mesmos passos deste relatório, com nova evidência de cada correção.
Relatório de validação de QA elaborado por Davi Bego. Telas e valores conferidos em 19 e 20/11/2026 em
https://realolimpico.com.br. Referências citadas: Serpro — Consulta CPF e Datavalid (campos de validação).
