# Pendências do sistema (fim da noite de 22/11/2026)

Montada lendo a última resposta de cada chat de 22/11 (T1–T6, R1–R4, Auditoria, Polimento, Merge/Deploy, Relatórios, Higienização, Processo Padrão, Tester) e conferindo Git, banco (somente leitura) e Vercel. Não é a leitura das transcrições inteiras.

## Decisões do Gabriel já tomadas (não reabrir)
- Conta nasce confirmada, sem confirmação de e-mail. Nunca criar limitação ao cadastro.
- Cookies presumidos; aviso pequeno que some; texto nos Termos 2.3 (cláusula 3.3).
- Sem depósito mínimo. Contas Áurea e CEO sem taxas conforme combinado. Sem comunicação à ANPD no B01.

## 23/11 — tudo de e-mail (documento único)
`02_planos_de_execucao/TAREFA_GRANDE_PENDENTE__TUDO_DE_EMAIL_23-11.md`. Acrescentar aos itens dele:
- A tela de entrar **não tem "Esqueci minha senha"** e o cliente não consegue pedir o link; hoje só a equipe envia (achado do T6). Decidir se o botão nasce junto com o e-mail.

## Aguardando o Gabriel
- Validação de CPF por API (Datavalid/consulta de CPF): **uso não aprovado**; hoje só dígitos verificadores.
- Aprovar o texto da tela do frete de R$ 4,00 (por objeto postado, só no envio).
- Corte D-H5 da devolução automática do 1º mês; se a equipe terá tela para cancelar nota; destino dos 13 pedidos de NFS-e presos e das 13 faturas sem nota (R$ 326,00). Obs.: no banco as 13 notas rejeitadas têm o motivo "cliente sem cadastro completo (CPF e nome)", última de 10/11.
- Horizonte do LTV (12 meses, provisório) e a leitura do gasto de marketing pela API da Meta.
- Teste no iPhone e no Android (T6, passos 4, 5, 7 do roteiro).
- Frente L: plano do Supabase (Free ou Pro) e limite de bitrate dos vídeos.
- Item 8 do docx: não há registro de que o vídeo "Veja como se cadastrar" foi gravado ou ligado.
- KPIs: D2 e J1–J5 (decisões sobre a lista).

## Aguardando o contador
- Pergunta nº 21 (como classificar o acréscimo de R$ 4,00 no frete) em `docs/fiscal-contabil/LACUNAS_E_PERGUNTAS.md`.
- Perguntas da frente B (1º mês no envio) estão só em `docs/manutencao-2026-11/registro/B.md`; falta levá-las ao `LACUNAS_E_PERGUNTAS.md`. Decisão fiscal sobre cancelar a nota na recusa continua aberta.

## Operacional
- Fornecedores: roteiro em `docs/manutencao-2026-11/OPERACIONAL_FORNECEDORES.md`.
- T3: 3 pesos ambíguos (RO-ENV-0014 789 mg; RO-ENV-0003 900 mg; RO-ENV-0048 9 mg) e 2 vídeos sem dono (`RO-ENV-0006/…-9.webm`, `RO-ENV-0154/…-2.webm`) só listados; `corrigir-videos-e-posicoes.cjs` só com `--so-videos`.

## Técnicas
- Cookie PKCE do Supabase sem `secure` e `httpOnly` (padrão da biblioteca): anotado, não endurecido.
- Erro React 418: não confirmado em navegador.
- Conferências visuais logadas que NÃO fiz: Financeiro do admin (aviso da cadeia, ficha do Rogério), isenção Áurea/CEO, botão de vídeo na ficha.
- Teste do cadastro por e-mail com senha digitada pelo Gabriel (`91cccf2`).
- Documentos desatualizados no repositório: `PENDENCIAS_ABERTAS.md` (18/09) e o RETOMADA do `ESTADO-GERAL` (diz que falta bateria e push, que foram feitos em 18/11).
- Frente M (auditoria de marketing / Meta API): adiada por ordem do Gabriel.
