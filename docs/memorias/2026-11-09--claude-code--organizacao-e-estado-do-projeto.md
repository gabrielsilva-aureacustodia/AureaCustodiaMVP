---
name: organizacao-e-estado-do-projeto
description: Pacote de continuidade de 09/11/2026 (índice para o Vega, ritual, estado geral) e o estado do Real Olímpico naquele dia
metadata:
  type: project
---

# Organização de continuidade e estado do projeto — memória do agente

- **Data:** 2026-11-09 · **Agente:** claude-code · **Projeto:** aurea-custodia (Real Olímpico)

## 1. Estado em uma tela
- `main` em `2b48b04` (PWA, 05/11), igual ao `origin/main`; sem branch por mesclar. Atendimento (31/10), custódia numa regra só (03/11) e PWA (05/11) estão na main; faltam teste do PWA em aparelho e `RESEND_API_KEY` para o e-mail do atendimento.
- Criado o pacote de continuidade: `docs/INDICE_VEGA.md` (mapa ultra detalhado), `docs/diario/LEIA_PRIMEIRO_AGENTE.md` (ritual), `docs/diario/execucoes/ESTADO-GERAL-2026-11-09--MD_EXECUCAO.md` (RETOMADA) e `execucoes/README.md`. Ficha da Áurea no Sintetica atualizada.
- Nada commitado; nenhum código tocado.

## 2. Decisões e o porquê
- Padrão copiado do Sintetica (RETOMADA no topo, memória R11, Git primeiro, índice por pasta) — pedido do Gabriel em 09/11 para organizar todos os projetos pelo painel e pelo Vega.
- O ritual **não cria regra nova**: reúne regras já dadas ao Gabriel/projeto (R13 do Sintetica: não inventar regra).
- Estado de produção e contagem de testes ficaram rotulados como "herdados" com a data do MD de origem: não foram reverificados.
- O "sistema de parcerias e criação de LPs" citado primeiro pelo Gabriel pertence ao K2CON (commits de 23 e 29/10) e foi retirado do pedido por ele; não há nada disso nesta repo.

## 3. O que aprendi
- Os documentos de benchmark/inventário do polimento do admin (`docs/polimento/admin/*`) nunca foram commitados; o código cita arquivos que só existem no disco.
- `docs/PENDENCIAS_ABERTAS.md` é de 18/09 e está defasado (já há cobrança real).
- O Sintetica guarda a ficha em `contexto/projetos/aurea-custodia.md` e as memórias em `docs/memorias/`; a conta `gh` ativa nesta máquina pode ser a da Sintetica.

## 4. Como continuar
1. Ler `docs/diario/LEIA_PRIMEIRO_AGENTE.md` e o bloco RETOMADA do ESTADO-GERAL.
2. Gabriel decide o commit do pacote de MDs (commit só de MD vai direto) e o destino dos arquivos de polimento não versionados.
3. Testar PWA em aparelho; reconferir `PENDENCIAS_ABERTAS.md`; rodar a suíte e registrar a contagem.

## 5. Pendências e riscos
- Lista completa em `docs/INDICE_VEGA.md` §8 e no ESTADO-GERAL.
- Risco: o índice envelhece. Regra de fechamento: tocou estrutura, regra, migration ou frente → atualizar as seções 3, 4, 5, 6 e 8 do índice.

## 6. Ligações
`[[polimento-tutorial-admin-checkup]]`, `[[balcao-correios]]`, `docs/atendimento/EXECUCAO.md`, `docs/pwa/MD_EXECUCAO.md`, `C:\dev\Sintetica\processo\04_RITUAL_DE_SESSAO.md`.
