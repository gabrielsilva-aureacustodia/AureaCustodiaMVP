# Memórias de sessão

Uma linha por memória: o que mudou e por quê, para a próxima sessão não redescobrir.

- [2026-11-17 · Frente I — número da moeda no recibo](2026-11-17--claude-code--manut-numero-da-moeda.md) — recibo (tela, cartão, PDF) mostra "Moeda nº RO-000042" (Coin.id), hash intacto; conferência visual em produção pendente.
- [2026-11-17 · Frente D — cadastro com Google primeiro](2026-11-17--claude-code--manut-cadastro-google.md) — /cadastrar e /entrar com o Google grande no topo e e-mail/senha recolhidos; demonstração em vídeo e ligação da constante só depois do deploy.
- [2026-11-17 · Frente C — e-mails de movimentação](2026-11-17--claude-code--manut-emails-de-movimentacao.md) — fila no banco com chave única (migration 053), Resend grátis, saque fora da central, sem servidor local; falta RESEND_API_KEY na Vercel.
- [2026-11-17 · Frente B — 1º mês de custódia no envio](2026-11-17--claude-code--manut-primeiro-mes-no-envio.md) — frete + 1º mês numa cobrança só; compra já cobrava em todas as vias; recusa devolve o mês da moeda, mas a NFS-e do mês não é cancelada (decisão fiscal).
- [2026-11-17 · Frente E — PWA no iPhone](2026-11-17--claude-code--manut-pwa-iphone.md) — iOS 26+ sem requisito de instalabilidade; cookies copiados uma vez ao adicionar (iOS ≥17.2); chave "Abrir como app web"; produção == código; Google no app só aparelho real decide.
- [2026-11-17 · Frente A — senha nas ações sensíveis](2026-11-17--claude-code--manut-seguranca-senha.md) — confirmação por senha (ou código por e-mail, conta só Google) em saque, compra, venda, troca de senha/e-mail/Pix/dados e retirada; evento `seguranca.*` em `audit_log`; RA-50 fechado em `definirNovaSenha` com interruptor de uma linha; testar o link real de recuperação depois do deploy.
- [2026-11-17 · Frente H — cancelar envio e nota](2026-11-17--claude-code--manut-cancelar-envio-e-nota.md) — cliente, equipe e bancada cancelam envio não postado; frete + 1º mês + NFS-e + etiqueta voltam juntos; migration 056; corte D-H5 para a devolução automática; envio já postado não devolve frete.
- [2026-11-09 — organização e estado do projeto](2026-11-09--claude-code--organizacao-e-estado-do-projeto.md) — índice para o Vega, ritual de continuidade, estado geral e pendências.
- [2026-10-30 — balcão dos Correios](2026-10-30--claude-code--balcao-correios.md) — entrega dos Correios passa a levar o envio à bancada.
- [2026-10-30 — balcão dos Correios (bot da frota)](2026-10-30--aurea-custodia-balcao-correios--balcao-correios.md) — causa, correção e pendência da regularização do Sidnei.
- [2026-10-30 — check-up 2](2026-10-30--claude-code--checkup-2.md) — "ver como o cliente vê" corrigido; vídeo da bancada e limites de acesso à produção.
- [2026-10-30 — polimento, tutorial do admin e check-up](2026-10-30--claude-code--polimento-tutorial-admin-checkup.md) — 4 frentes, PRs #13 a #17, tutorial v3 em produção e pendências.
- [2026-11-17 · Frente K — frete mais R$ 4,00](2026-11-17--claude-code--manut-frete-mais-4-reais.md) — frete cobrado = preço do contrato + R$ 4,00 (parâmetro `acrescimoDoFreteCents`, editável, com histórico); contrato guardado à parte; só o envio muda; sem migration; pergunta nº 21 ao contador.
- [2026-11-18 · Extrato igual ao saldo (frente F)](2026-11-18--claude-code--manut-extrato-igual-ao-saldo.md) — extrato derivado dos mesmos fatos do ledger; invariante saldo = soma das linhas, coluna "Saldo depois", reserva no topo; limite conhecido: pré-pago.
- [2026-11-17 · Frente L — armazenamento dos vídeos](2026-11-17--claude-code--manut-armazenamento-videos.md) — vídeos de autenticidade: 32 arquivos, 328,77 MB; Free (1 GB) esgota em jan/2027, Pro dura 20 meses; recomendação, script de medição e perguntas de retenção.
