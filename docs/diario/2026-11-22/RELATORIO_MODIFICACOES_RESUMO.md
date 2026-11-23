# Relatório de Modificações (resumo) | 22/11/2026

```
Estrutural hoje:
- Pasta nova na raiz: Central de Organização/ (374 arquivos, cópias e índices; o original manda)
- Banco: migration 058 (email_historico, sem a FK do livro) e 059 (trades.coin_ids), ambas aplicadas em produção
- Segurança: o navegador só recebe o estado da própria conta (pseudônimo para terceiros); CSP bloqueante; cookie sb-* Secure
- Cookies: uso presumido com selo; Pixel e API de Conversões só após "Aceitar"
- Superfície protegida: Trade.coinIds (types, market, ações de compra/venda), autorizado
- Variáveis novas na Vercel: NEXT_PUBLIC_AUREA_CONTA_PROPRIA_EMAIL, NEXT_PUBLIC_AUREA_CONTA_CEO_EMAIL
- Cadastro por e-mail entra direto (B02 revertido)
- Documentos legais publicados no banco: Termos 2.3, Arbitragem 2.2, Política 2.1, Taxas 2.5
- Dados: livro-razão (132 hashes) e cadeia de análises refeitos, sem mudar valor algum
Você precisa clicar / autorizar:
- RESEND_API_KEY na Vercel e DNS de avisos.realolimpico.com.br (23/11)
- Aprovar o texto do frete de R$ 4,00 (depende da pergunta 21 ao contador)
- Entrar logado para o Tester conferir 3 textos e o Financeiro do admin
```
