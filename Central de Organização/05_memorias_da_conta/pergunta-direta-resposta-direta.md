---
name: pergunta-direta-resposta-direta
description: "Regras de eficiência de sessão do Gabriel — pedido direto sem extras, MD em vez de reler o repositório, build e merge antes de qualquer teste extra, revisão só depois do merge."
metadata:
  node_type: memory
  pinned: false
  originSessionId: 58fcf548-909c-41a1-95ec-c3e17a7f2d13
  modified: 2026-09-18T04:54:04.328Z
---

# Regras de eficiência de sessão

Em 15/09/2026 as branches E1–E7 da Áurea Custódia esgotaram o limite de tokens de dois agentes ao
mesmo tempo. Quando pedi uma frase por branch, eu ainda disparei um script de diffs e commits, e
Gabriel interrompeu: **"NÃO CRIA UMA EXECUÇÃO GIGANTESCA PARA A MINHA PERGUNTA"**. Em seguida ele
definiu regras que valem para toda sessão, em qualquer chat. O texto completo está em
`docs/Regras_eficiencia_de_sessao_v1.md` e o `CLAUDE.md` aponta para ele.

As regras, em resumo:

1. **Pedido exato, pergunta simples ou informação com o lugar já dito:** fazer só isso. Nada de
   analisar diff, commits, worktrees ou o repositório para confirmar.
2. **Se um MD, relatório ou informação dele já responde, não reler o repositório.** Os relatórios
   existem justamente para evitar isso.
3. **Typecheck, lint, suíte e build no fim da branch** (ou de um tópico grande), nunca a cada escrita.
   Teste de pedaço solto não prova o bloco inteiro.
4. **MD de execução criado no início da branch** e atualizado a cada tópico fechado; serve para passar
   a outro agente, mudar o rumo e testar retroativamente no fim.
5. **Branch de revisar/testar/melhorar só depois do merge e commit** das outras, nunca em paralelo.
6. **Commits em blocos funcionais**, não a cada edição.
7. **Todo plano executivo de branch** lista exatamente o que ler, dá contexto suficiente, define a
   ordem de prioridade e foca em feature commitada; perfeccionismo vem sempre depois.

O porquê: excesso de leitura, lint e commit não só gasta tokens, como tira o foco — o agente termina
sem entregar o que foi pedido.

## A ordem é build, merge, e só então o resto dos testes

Em 18/09/2026, no meio da mudança dos planos de custódia, eu rodei a suíte de testes três vezes,
rodei o build duas, subi o servidor local e ainda fui clicar na tela para conferir o resultado.
Gabriel cortou: **"Se você estiver de novo quebrando nossa regra de não ficar realizando infinitos
testes em cada etapa, pare. Evite testes excessivos, realize o build e merge. E DEPOIS disso,
realize demais testes necessários."**

A regra 3 acima diz *quando* testar; esta diz **em que ordem**, e é o que eu vinha errando mesmo
depois de saber a regra 3. A entrega é o build passando e o commit feito. Verificação de navegador,
conferência visual, releitura da suíte e qualquer prova adicional vêm **depois** do merge, e só se
ainda forem necessárias — não como pré-requisito do commit.

Na prática, ao fechar um bloco: rodar typecheck, lint e suíte **uma vez**, rodar o build **uma vez**,
commitar. Se um teste falhar de forma intermitente, dizer isso no relatório em vez de repetir a
suíte até ela ficar verde. Subir servidor local e navegar pela tela é passo de depuração, não de
entrega: só se algo falhou, ou se ele pedir a conferência visual.
