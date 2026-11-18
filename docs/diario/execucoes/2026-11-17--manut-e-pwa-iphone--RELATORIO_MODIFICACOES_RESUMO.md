Estrutural hoje:
- Nada estrutural. Mudança só em metatags do iPhone, no texto do painel de instalação e em testes novos. Sem migration, env, pasta nova nem integração.
Você precisa clicar / autorizar:
- Depois do deploy, testar no iPhone e Android reais (docs/pwa/ROTEIRO_IPHONE_REAL.md).

Teste da branch: typecheck verde; vitest 5 arquivos/86 testes verdes. **NÃO FEITO: teste em iPhone real e em Android real (Gabriel/Rogério, depois do deploy); Lighthouse e emulação WebKit (cancelados por regra do Gabriel: sem servidor local); `npm run build`, `npm test` inteiro e `npm run lint` (bateria pós-merge do Controle).**

