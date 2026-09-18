# 02 · Conferência das telas logadas, em produção

```
Pendências:  P-C1-02, P-C3-02, P-M-01 (docs/PENDENCIAS_ABERTAS.md, seção 1)
Executor:    Claude Cowork, no navegador
Tempo:       40 a 60 minutos
Por que abriu: nenhum agente de repositório conseguiu abrir as telas logadas — senha em tela de
             login um agente de código não digita, e o navegador dele não tinha a sessão.
             O que sustenta as entregas hoje são 838 testes automatizados e o build.
```

> **O que esta tarefa é.** Uma varredura visual: abrir cada tela, ver se carrega, se os números
> fazem sentido e se nada quebrou. **Não é** consertar código — se algo estiver errado, você
> anota com print e texto do erro, e quem conserta é um agente de repositório depois.

---

## 0. Entrar

**0.1** Abra `https://aurea-custodia-mvp.vercel.app/painel`.

**0.2** Entre com `gabriel.silva@aureacustodia.com.br`, por senha ou por **Entrar com Google**.

> 🔴 **PONTO DE PAUSA HUMANA — senha e segundo fator.** Se a tela pedir senha e você não tiver,
> **pare e peça ao Gabriel**. Se for **Entrar com Google** e o Google pedir confirmação no
> celular, **pare e peça a ele que aprove**.

**0.3 Esperado:** abre `https://aurea-custodia-mvp.vercel.app/admin` com o menu lateral do painel.

**Se aparecer** *"Você está conectado como …, e esta conta não faz parte da equipe do painel"*: o
e-mail não é o corporativo. Clique em **Sair e entrar com outra conta** e entre de novo.

**Se `/admin` mandar para `/entrar` ou `/inicio`** em vez de `/painel`: isso é um defeito
(RA-48 voltou). Anote e siga.

---

## 1. As telas do site (P-M-01)

Abra uma de cada vez. Para cada uma, anote: **carregou? tem número/conteúdo? deu erro?**

| # | URL | O que precisa aparecer |
|---|---|---|
| 1.1 | `/inicio` | Saldo em reais, moedas sob guarda, atalhos |
| 1.2 | `/mercado` | Livro de ofertas com pelo menos um tipo de moeda; seletor de tipo funcionando |
| 1.3 | `/conta` | Saldo, extrato, botões Depositar e Sacar |
| 1.4 | `/taxas` | Tabela de Taxas vigente: 0,5% + R$ 1,00 de cada lado, custódia R$ 2,00 por moeda/mês |
| 1.5 | `/suporte` | Canais de atendimento |
| 1.6 | `/termos` e `/privacidade` | Os documentos, com número de versão |

### 1.7 O preço da custódia na tela (entrega da E4)

Em `/conta` e na tela de envio, o valor da custódia deve aparecer como **R$ 2,00 por moeda por
mês**. Se em algum lugar ainda aparecer a tabela antiga de faixas anuais (R$ 5, R$ 15, R$ 25,
R$ 30, R$ 60), **é defeito**: anote onde, com print.

---

## 2. A Central de Resultados (P-C1-02)

| # | URL | O que precisa aparecer |
|---|---|---|
| 2.1 | `/admin/resultados/financeiro` | DRE, receita por linha, cartões e fluxo mês a mês |
| 2.2 | `/admin/resultados/contabil` | Lançamentos, alíquotas, plano de contas, exportações |
| 2.3 | `/admin/resultados/kpis` | Indicadores do negócio |
| 2.4 | `/admin/resultados/uso` | Uso da plataforma e trilha de auditoria |

**2.5** Em `/admin/resultados/uso`: o cartão **Páginas abertas** deve **crescer** conforme você
navega. Recarregue depois de abrir três telas e confira se o número subiu.

**2.6** A trilha filtrada por **Ações do painel** fica vazia até alguém fazer uma ação. Isso é o
esperado, não é defeito.

**2.7** Nas linhas de imposto da DRE, é normal aparecer **"parâmetro não configurado"** — as
alíquotas dependem do contador e não estão em código de propósito. Não é defeito.

**2.8** Abra `https://aurea-custodia-mvp.vercel.app/relatorios`. **Esperado:** redireciona para a
Central de Resultados.

---

## 3. Bancada, moedas, logística e configuração (P-C3-02)

| # | URL | O que precisa aparecer |
|---|---|---|
| 3.1 | `/admin/bancada` | Fila de análise, área de câmera, caixas dos quinze campos |
| 3.2 | `/admin/moedas` | Acervo e verificação da corrente de hashes |
| 3.3 | `/admin/logistica` | Envios e retiradas, prazos, etiquetas |
| 3.4 | `/admin/cs` | Atendimento (sem WhatsApp ligado, as conversas ficam só no painel — é o esperado) |
| 3.5 | `/admin/usuarios` | Lista de contas |
| 3.6 | `/admin/equipe` | Membros do painel e papéis |

### 3.7 O teste de ida e volta da Tabela de Taxas

Este é o único momento em que você **muda** alguma coisa — e desfaz em seguida.

1. Abra `/admin/configuracao`, aba **Taxas e comissões**.
2. Confira os valores de hoje: **0,5% + R$ 1,00** de cada lado, **R$ 2,00** de custódia por mês.
3. Mude a **comissão fixa do comprador** para `1,50`. **Esperado:** a simulação de negociação na
   própria tela muda **antes** de salvar.
4. Clique em **Salvar**. **Esperado:** um aviso *"Salvo: … Tabela de Taxas publicada na versão
   1.X."*
5. Abra `/taxas` numa aba nova. **Esperado:** mostra o valor novo.
6. No app, a faixa do topo diz *"Há versão nova de: Tabela de Taxas"* até o aceite. **É o
   comportamento esperado** (RA-46), não é defeito.
7. **Volte o valor para `1,00` e salve de novo.** Não deixe a plataforma com a taxa errada.
8. Abra a aba **Histórico**. **Esperado:** as duas mudanças aparecem, com quem, quando, antes e
   depois.

### 3.8 O catálogo de tipos de moeda

1. Aba **Catálogo de moedas**. Os tipos já semeados aparecem.
2. **Editar** um tipo, desligar **Negociável no mercado**, salvar.
3. Abra `/vender`. **Esperado:** aquele tipo sumiu do seletor.
4. **Ligue de novo e salve.** Confirme que voltou ao seletor.

### 3.9 Aba Operacional

Confira que aparecem: limite de depósito, ciclo de sincronização, prazos da logística, prazos dos
Termos e canais de atendimento. Não mude nada aqui.

### 3.10 Aba Integrações

Anote **literalmente** o estado de cada linha: banco, login, chave de serviço do Supabase,
pagamento, Correios, WhatsApp, estação, relatórios e tarefas agendadas. Essa lista é a foto do
que está ligado hoje, e entra no relatório final.

---

## 4. As entregas novas que valem conferir (E1 e E4)

### 4.1 Conta fora da equipe não vê o painel

Se houver uma conta comum à mão, entre com ela e confirme: o menu **não** mostra Administração, e
`/admin` manda para `/painel`. Se não houver, pule e anote que pulou.

### 4.2 O link de redefinição de senha tem tela de nova senha

Em `/entrar`, clique em **Esqueci minha senha**, peça o link para o e-mail do Gabriel.

> 🔴 **PONTO DE PAUSA HUMANA.** Ler o e-mail dele é dele. Peça: *Chegou um e-mail de redefinição
> de senha. Abre o link e me diz se a tela pede uma senha nova, ou se dá erro.*

### 4.3 Recibo bloqueado por fatura de custódia vencida

Em `/admin/usuarios`, procure uma conta com fatura de custódia em aberto e vencida. Se existir,
confirme que os recibos dela aparecem bloqueados para venda e retirada. **As contas da equipe do
painel são isentas** desse bloqueio — se uma conta da equipe estiver bloqueada, é defeito.

---

## 5. O relatório final

Uma tabela com **uma linha por tela**, e em cada linha:

| Tela | Carregou? | O que apareceu | Problema |
|---|---|---|---|

Depois disso, três blocos:

1. **O que está quebrado** — com URL, print e o texto exato do erro.
2. **O que ficou estranho mas não quebrou** — número que não bate, texto confuso, botão sem efeito.
3. **O que você não conseguiu conferir** e por quê.

E confirme explicitamente: **a comissão fixa do comprador voltou para R$ 1,00 e o tipo de moeda
voltou a ser negociável?** Se não voltou, diga em letra maiúscula logo no começo.
