# Notas fiscais acessíveis ao cliente — memória do agente

- **Data:** 2026-11-18 · **Agente:** claude-code (chat de branch G, sem filhos) · **Projeto/branch:** manut-notas-do-cliente (`claude/manut-notas-do-cliente-802669`, base 0f55132)

## 1. Estado em uma tela
Existe `/conta/notas` ("Notas fiscais" no menu, grupo Conta): lista só as notas do cliente logado, com estado (emitida, cancelada, cancelamento em andamento, em preparação, falta completar o cadastro), número, competência, valor, data, chave de acesso, e botões **Baixar XML** e **Baixar PDF**. Em `/conta/faturas`, a coluna "Ação" das faturas não abertas ganhou "Ver nota" (leva à nota na lista). O PDF é um **"Documento Auxiliar da NFS-e"** montado do XML guardado, **sem QR Code** e fora do layout oficial DANFSe v2.0 da NT 008. Nada foi conferido em navegador (regra de máquina): a conferência visual é em produção, depois do deploy.

## 2. Decisões e o porquê
- **O PDF é gerado pela plataforma, a partir do XML** — a API oficial do DANFSe foi suspensa em 03/08/2026 (NT 008 v1.02): quem emite desenha o PDF. Pelo menos o cliente não precisa ler XML.
- **Sem QR Code e sem dependência nova** — o projeto não tem biblioteca de QR; a folha imprime a chave e o endereço de consulta pública (`https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=<chave>`, NT 008 p. 14–15) e diz que o oficial é o XML. DANFSe completo é tarefa à parte, com o contador.
- **A lista mostra só o que tem pedido de nota** — as 13 faturas pagas até 22/10/2026 (antes da emissão automática de 23/10, R$ 326,00) não têm pedido nenhum; dizer "em preparação" seria prometer o que nada emitirá sozinho (emissão retroativa é decisão do Gabriel).
- **Nota de teste (produção restrita) nunca aparece como emitida** — fica "em preparação": o envio em produção a reemite.
- **Cancelada continua listada** com a data e o motivo em palavras (1 erro na emissão, 2 serviço não prestado, 9 outro); a justificativa livre do banco nunca sai.
- **Só o dono lê**: o e-mail vem da sessão, o filtro está dentro do `WHERE` (`lower(tomador_email) = lower($1)`), e nota de outra conta responde igual a id que não existe. Prova: `src/server/actions/notas.test.ts` (PGlite, dois clientes).
- **Menu com um item aceso só** — `Sidebar.tsx` passou a acender o item de href mais específico; sem isso `/conta/notas` acendia também "Minha conta".

## 3. O que aprendi
- Produção em 18/11/2026: 64 pedidos de 26 clientes; 49 notas autorizadas + 2 canceladas (nº 4 a 54, 23/10 a 16/11), todas no ambiente `producao`, com número, chave e XML (~11 KB). 13 pedidos de custódia rejeitados por cadastro incompleto (CPF e nome), 5 tentativas cada — o limite automático; só voltam com "Reprocessar" no painel.
- As notas nº 1 a 3 da pasta `Documentos\Real Olímpico\NFs e GOV` são do contador (Emissor Web, 22/10, série 70000) e **não estão** em `nfse_emissoes`.
- Leitura de produção: script no scratchpad que recusa tudo que não é SELECT/WITH, `BEGIN READ ONLY … ROLLBACK`, nenhum `SET`, e-mails mascarados; `POSTGRES_URL` do `.env.local` (nunca impressa).
- `pymupdf` (`import pymupdf`) está instalado no Python da máquina: lê PDF (`get_text`) e rende página em PNG (`get_pixmap`), útil porque o Read não renderiza PDF sem poppler.
- Arquivos do repositório estão em CRLF no disco: para editar com segurança use um script Python que preserve `\r\n`.
- `tsc` com um `tsconfig` temporário que lista só os arquivos da frente roda em ~3 s e dispensa o typecheck completo (apagar o arquivo depois).

## 4. Como continuar (próximos passos exatos)
1. Controle: eslint/typecheck/suíte/build no merge; deploy; conferir `/conta/notas` em produção a 320/375/430 px, claro e escuro, com uma conta que tenha nota emitida, uma cancelada (as duas notas canceladas, nº 20 e nº 41, são de um mesmo cliente) e uma "em preparação".
2. Baixar o PDF e o XML de uma nota em produção e abrir; comparar o PDF com o DANFSe do contador.
3. Conferir que `/conta/faturas` mostra "Ver nota" nas faturas pagas e que o link leva ao cartão da nota.

## 5. Pendências e riscos
- **Troca de e-mail não reaponta `nfse_emissoes.tomador_email`** (`renomearEmailUsuarioNoBanco`, `src/server/db/repositories/users.ts`, ~l.235): depois de trocar o e-mail, o cliente perde de vista as notas antigas. Correção de uma linha, fora do Touch desta frente: decisão do Controle.
- 13 pedidos rejeitados por cadastro: depois que o cliente completar o cadastro, alguém precisa dar "Reprocessar" em `/admin/resultados/fiscal`.
- DANFSe oficial (NT 008 v1.02, com QR) é tarefa à parte; vale sugerir RA no `RISCOS_ASSUMIDOS.md` ("PDF auxiliar fora do layout oficial").
- O "em preparação" não tem prazo por decisão; se o Gabriel quiser aviso por e-mail quando a nota sair, é a frente C.

## 6. Ligações
MD de execução `docs/diario/execucoes/2026-11-17--manut-g-notas-do-cliente--MD_EXECUCAO.md`; ficha `docs/manutencao-2026-11/frentes/G-notas-do-cliente.md`; `docs/fiscal-contabil/NFSE_INTEGRACAO_NO_SITE.md`; `[[regra-de-negocio-so-com-pergunta]]`, `[[leitura-de-producao-sem-set-de-sessao]]`, `[[terminologia-juridica-aurea]]`.
