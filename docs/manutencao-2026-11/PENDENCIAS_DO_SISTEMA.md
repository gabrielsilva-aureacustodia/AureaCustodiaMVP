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
- Repetir o cadastro por e-mail com o Gabriel digitando a senha, agora com login automático (`d84f795`; o teste anterior, de `91cccf2`, mostrou que a conta nascia confirmada mas a pessoa não entrava). **Deploy do `d84f795` ainda não confirmado READY.**
- Metadado do Supabase das contas novas guarda `legal_terms_version`/`privacy_policy_version` = `RASCUNHO-0.1-2026-09-02` (vêm das variáveis `AUREA_TERMS_VERSION`/`AUREA_PRIVACY_VERSION` da Vercel, velhas). Cosmético: o aceite oficial no banco está certo.
- Documentos desatualizados no repositório: `PENDENCIAS_ABERTAS.md` (18/09) e o RETOMADA do `ESTADO-GERAL` (diz que falta bateria e push, que foram feitos em 18/11).
- Frente M (auditoria de marketing / Meta API): adiada por ordem do Gabriel.

---
## Rodada 15 do Tester (22/11/2026) — resolvido no commit 00cfcfd
- (a) Configurações > Segurança: "E-mail verificado / Verificado" virou "E-mail da conta / Ativo" (conta nasce confirmada, o selo antigo enganava).
- (b) /conta: removido "São quatro dados"; fica "Leva menos de um minuto."
- (c) Landing, recibo ilustrado: "Código simulado" virou "Código de exemplo".
- (d) Frete + R$ 4,00 não aparece em Taxas/home: **continua pendente** — depende do contador (pergunta 21) e da aprovação do texto pelo Gabriel. Nada codificado.
- (e) "Moeda equivalente" (Academy) × "a sua moeda" (landing): a landing (L426) já diz "moeda da mesma categoria, não necessariamente a mesma unidade física". É regra de negócio/jurídica — **decisão do Gabriel**; texto não alterado.
- Verificado (22/11): deploy do 00cfcfd com status do commit no GitHub = success. O Tester confirmou no ar, deslogado: landing com "Código de exemplo", /entrar com "Receber link de acesso por e-mail", /cadastrar sem confirmação de e-mail.
- **NÃO verificado:** "E-mail da conta / Ativo" (Configurações), "Leva menos de um minuto." (/conta) e "por Pix ou cartão" (/inicio). Só aparecem logado e o Tester está deslogado (conta de teste apagada). Falta o Gabriel entrar na conta no painel do navegador para o Tester reler.
- Só `tsc --noEmit` rodou (sem erro); testes e build não foram rodados (mudança só de texto de tela).
