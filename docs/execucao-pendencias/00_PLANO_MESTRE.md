# Plano mestre — execução das pendências em branches paralelas

```
Criado em:   15/09/2026
Base:        origin/main que contém esta pasta (depois do painel com entrada própria em /painel, 40bb8c8)
Ordens:      E1, E2, E3, E4 e E7 ao mesmo tempo · integração · E5 e E6 (revisão) e E8 depois dela
Eficiência:  docs/Regras_eficiencia_de_sessao_v1.md (prevalece sobre este plano e sobre cada documento)
Prompts:     PROMPTS.md (um bloco para colar em cada agente)
Integração:  INTEGRACAO.md
Manual:      TUTORIAL_MANUAL_GABRIEL.md (o que só uma pessoa faz)
```

> **Para o Rogério.** O que faltava resolver foi dividido em oito pacotes de trabalho, cada um com
> um documento que diz o que fazer, em quais arquivos, e como provar que ficou pronto. Sete pacotes
> andam ao mesmo tempo, com agentes diferentes, porque cada um mexe numa parte separada do sistema.
> Quando os sete terminarem, uma etapa de integração junta tudo na versão oficial do site. O oitavo
> pacote depende de dois dos sete e começa depois.

---

## As branches

| # | Branch | Documento | O que resolve | Pendências de origem |
|---|---|---|---|---|
| E1 | `exec/e1-portas-de-entrada-da-conta` | [E1](E1_PORTAS_DE_ENTRADA_DA_CONTA.md) | Conta desativada barrada no login, no callback e na sessão aberta; tela de nova senha no link de recuperação; aceite legal que some na gravação | P-C2-04, P-C2-05, P-C2-09 · RA-43, RA-44 |
| E2 | `exec/e2-cobranca-com-configuracao-vigente` | [E2](E2_COBRANCA_COM_CONFIGURACAO_VIGENTE.md) | Compra direta pelo gateway e valor de entrada da análise lendo a taxa e o catálogo do painel | P-C3-03 · RA-24 (vendedor), RA-47 |
| E3 | `exec/e3-limpeza-relatorios-antigos` | [E3](E3_LIMPEZA_RELATORIOS_ANTIGOS.md) | Remove o painel antigo de relatórios que ficou sem uso | P-C1-03 |
| E4 | `exec/e4-custodia-preco-e-inadimplencia` | [E4](E4_CUSTODIA_PRECO_E_INADIMPLENCIA.md) | Preço da custódia correto na tela e no extrato; recibo bloqueado por pendência (com a equipe isenta); anonimato na venda | A-4, B-2 · CD-11 |
| E5 | `exec/e5-qa-painel-resultados-equipe-cs-usuarios` | [E5](E5_QA_PAINEL_RESULTADOS_EQUIPE_CS_USUARIOS.md) | Análise, testes e melhorias do painel: entrada, resultados, equipe, atendimento e usuários | P-C1-02, P-C2 (conferência) |
| E6 | `exec/e6-qa-painel-bancada-moedas-logistica-configuracao` | [E6](E6_QA_PAINEL_BANCADA_MOEDAS_LOGISTICA_CONFIGURACAO.md) | Análise, testes e melhorias do painel: bancada, moedas, logística, configuração e o efeito dela no site | P-C3-02 |
| E7 | `exec/e7-documentacao-das-pendencias` | [E7](E7_DOCUMENTACAO_DAS_PENDENCIAS.md) | Marca como feito o que já está feito, conserta o arquivo de pendências corrompido, cria o índice único | B-1, B-3…B-7, C-1, C-2, pendências da B |
| E8 | `exec/e8-segunda-onda-conciliacao-e-rastreio` | [E8](E8_SEGUNDA_ONDA_CONCILIACAO_E_RASTREIO.md) | Comissão do comprador na compra direta, pendência reconferida na conciliação, rastreio da retirada, origem da marca de inadimplência | RA-24 (comprador), RA-53 · **só depois da integração** |

## E5 e E6 saíram da rodada paralela (15/09/2026)

E5 e E6 são revisão, teste e melhoria. Pela regra 5 de `docs/Regras_eficiencia_de_sessao_v1.md`, revisão
só roda **depois** que as outras branches estão mescladas e commitadas na `main` — revisar antes é revisar
código que ainda vai mudar. A ordem passa a ser: E1, E2, E3, E4 e E7 em paralelo → integração → E5 e E6
(e E8) sobre a `main` integrada. As linhas de E5 e E6 na tabela de convivência abaixo ficam só como
referência para a integração.

## Por que dá para rodar E1–E4 e E7 juntas

Cada documento tem uma seção **Território** com o que pode e o que não pode editar, cruzada por um
crítico em 15/09/2026. Os arquivos que mais de uma branch toca têm regra de convivência escrita:

| Arquivo | Quem toca | Regra |
|---|---|---|
| `RISCOS_ASSUMIDOS.md` | E1, E2, E3, E4, E5, E6 | Cada uma só nas linhas dos seus RA; RA novo em ordem numérica depois do RA-48. Conflito é esperado e a integração resolve pela união |
| `src/server/actions/ATALHOS.md` | E1, E3, E4 | E3 só na RA-16.c; E1 e E4 acrescentam no fim (a integração une) |
| `src/server/admin/ATALHOS.md` | E1, E5, E6 | E1 só RA-43/RA-44; E5 põe RA-54 logo depois do RA-48, antes de `## RA-41`; E6 só RA-45/RA-46 |
| `src/server/config/ATALHOS.md` | E2, E6 | E2 só RA-47; E6 só RA-46 e o que vier depois de "O que NÃO é atalho" |
| `src/styles/admin.css` | E5, E6 | E5 só na faixa da Ficha; E6 só do marcador `/* === C3 ·` em diante |
| `src/components/README.md`, `src/components/admin/README.md` | E3, E5, E6 | E3 apaga/reescreve só o que é do painel antigo; E5 e E6 acrescentam longe dessas linhas |
| `src/app/(app)/vender/page.tsx` | E4, E6 | Trechos diferentes; os imports podem encostar — cada import em linha própria, a integração une |
| `src/components/providers/AppProvider.tsx` | E1, E6 | E1 é dona só do tratamento do 401 de `/api/state`; E6 não toca esse bloco |

## Reservas

| Branch | RA reservados | Migration reservada | Porta do servidor local |
|---|---|---|---|
| E1 | RA-49, RA-50 | 026 (não usada) | 3101 |
| E2 | RA-51 | — | 3102 |
| E3 | — | — | 3103 |
| E4 | RA-52, RA-53 | 027 | 3104 |
| E5 | RA-54 | 028 | 3105 |
| E6 | RA-55 | 029 | 3106 |
| E7 | — | — | — |
| E8 | RA-56 | 030 | 3108 |

Número reservado e não usado fica livre; `npm run db:migrate` ordena por nome e não exige sequência.

## O que já está na base, e nenhuma branch refaz

- **Entrada própria do painel em `/painel`**, com o e-mail do Gabriel como `dev` pelo código (RA-48).
- **JSX nos testes**: `oxc: { jsx: { runtime: 'automatic' } }` em `vitest.config.mts`. Teste que renderiza
  tela usa `renderToStaticMarkup` e continua com nome `*.test.ts`. **Ninguém edita `vitest.config.mts`.**
- **O RA-01 sem trava escrita**: `src/server/actions/ATALHOS.md`, `src/lib/payments/ATALHOS.md`,
  `src/lib/payments/README.md`, `src/lib/payments/mercadopago.ts`, `src/server/actions/payments.ts` (só o
  comentário do topo) e `.env.example` não dizem mais que o Mercado Pago de produção espera parecer jurídico.
- **Quem fez a base:** o integrador desta rodada (Claude, sessão da frente C), antes de os prompts serem
  enviados. A base é a `origin/main` que contém este arquivo.
- **Contagem da suíte na base**: 86 arquivos de teste, 741 testes passando, 1 pulado.

## Regras que valem para todas

1. **O documento da branch é a aprovação do Gabriel** para tudo o que está escrito nele. Não parar para
   pedir aprovação de passo que está lá — nem por "superfície protegida" do `CLAUDE.md`. Perguntar só o
   que o documento não cobre, e seguir com o resto enquanto espera.
2. **Nenhuma trava que o Gabriel não pediu**: nada de feature flag, gate de ambiente ou confirmação
   obrigatória. Checagem que falha responde "liberado". **Conta da equipe do painel nunca é barrada.**
3. **Palavras proibidas** em texto do produto, código, commit e documento: token, NFT, cripto, ativo
   digital, ativo, investimento, investidor, corretora, rentabilidade, retorno. O termo é **recibo**.
4. **Dinheiro em centavos inteiros.** A fórmula do hash da análise e a do livro-razão não mudam.
5. **Nada de `@/server/*` em Client Component**, fora as Server Actions.
6. **Atalho tomado** entra em `RISCOS_ASSUMIDOS.md` e no `ATALHOS.md` da pasta, no mesmo commit. **Pasta
   nova ganha `README.md`.** Comentários em português, explicando o porquê.
7. **Não mexer em DNS, e-mail nem domínio.** Não criar conta em serviço externo nem gerar credencial.
8. **Não digitar senha em tela de login.** Conferência de tela logada é por teste (renderização com sessão
   simulada) ou fica no roteiro do Gabriel. Nunca criar rota, script ou cookie que pule autenticação.
9. **Servidor local só na porta da branch** (tabela acima). A 3000 é da pasta principal do Gabriel.
10. **Suíte com o servidor local parado**, e a contagem de arquivos comparada com a base mais os arquivos
    novos da branch — arquivo que some da contagem é worker de teste que morreu.
11. **Ciclo no fim da branch** (ou no fim de um bloco grande de tarefas), nunca a cada escrita:
    `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. Commits em blocos funcionais.
14. **Regras de eficiência** (`docs/Regras_eficiencia_de_sessao_v1.md`) prevalecem sobre tudo acima: ler
    só o que o documento da branch lista, manter o `relatorios/E<N>_EXECUCAO.md` atualizado a cada tarefa
    fechada, feature commitada antes de qualquer melhoria.
12. **Não fazer merge na `main`.** A branch termina com push e com o relatório em
    `docs/execucao-pendencias/relatorios/E<N>.md`, que acaba na linha `E<N> pronta para integração — <hash>`.
13. **Nenhuma mudança de taxa em produção** por roteiro de branch: a conferência de comissão pela tela é um
    passo único do roteiro consolidado da integração.

## Depois

A integração segue [INTEGRACAO.md](INTEGRACAO.md): merges na ordem E3 → E2 → E1 → E4 → E7, suíte e build
**uma vez no fim** dos merges (ou depois de um merge com conflito de código), as pendências marcadas como
feitas, deploy conferido e um roteiro manual consolidado. Só então começam E5 e E6 (revisão sobre a `main`
integrada) e a E8; cada uma é integrada ao terminar.
