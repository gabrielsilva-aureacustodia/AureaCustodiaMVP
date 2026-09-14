# `/admin/configuracao` — taxas, catálogo, operacional, integrações e histórico

Plano do Admin, seções 3.1 a 3.3, com a tabela 6 do plano de finalizações; frente C, sub-branch C3.

As abas moram na URL (`?aba=taxas|catalogo|operacional|integracoes|historico`).

| Aba | O que tem | Permissão para salvar |
|---|---|---|
| Taxas e comissões | Cada campo de `TabelaDeTaxas`, com o valor vigente, quem mudou e quando, e a simulação de uma negociação ao lado. Salvar publica versão nova da Tabela de Taxas | `config.taxas` |
| Catálogo de moedas | `aurea.tipos_moeda`: nome, ano, tiragem, pasta, ficha, ordem, **negociável** (o que `isNegociavel` consulta) e se aceita envio novo. A tabela é semeada com `COIN_TYPES` ao abrir a aba | `config.catalogo` |
| Operacional | Limite de depósito, ciclo de sincronização e prazos de alerta da logística; os prazos e a vigência dos Termos (salvar publica versão nova dos Termos); os canais de atendimento de `/suporte` | `config.taxas` |
| Integrações | Cada serviço externo: ligado, incompleto ou desligado, pelos **nomes** das variáveis — nunca pelos valores | — |
| Histórico | `aurea.config_historico` inteiro, append-only: quem, quando, de quanto para quanto | — |

Ver a página pede `config.ver`. A gravação mora em `src/server/admin/configuracao.ts`; a leitura
que o resto do site usa, em `src/server/config/`. Atalhos: RA-46 e RA-47.
