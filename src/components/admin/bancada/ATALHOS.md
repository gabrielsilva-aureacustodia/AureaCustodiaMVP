# Atalhos assumidos em `src/components/admin/bancada/`

O registro completo está em [`RISCOS_ASSUMIDOS.md`](../../../../RISCOS_ASSUMIDOS.md); a parte do servidor,
em [`src/server/admin/ATALHOS.md`](../../../server/admin/ATALHOS.md).

---

## RA-45 🟡 — a bancada no navegador não guarda nada fora da página aberta

**Arquivos:** `GravadorDeVideo.tsx`, `BancadaWeb.tsx`

- **Sem cópia em disco.** A gravação vive na memória da aba. Se o envio ao Storage falhar, o que sobra
  é o link "Baixar a gravação", que some quando a página fecha. A estação Electron grava em disco antes
  de subir; o navegador não tem esse caminho sem pedir permissão de pasta a cada vez.
- **Sem retomada.** Recarregar a página no meio do procedimento perde as linhas digitadas e a gravação.
  A análise só existe no servidor depois de "Fechar análise".
- **A validação na tela é repetição da do servidor**, para o operador ver o erro antes do clique — quem
  decide é `fecharAnaliseNoPainel`.

**Como se paga:** rascunho das linhas em armazenamento local do navegador e envio do vídeo em partes,
se a bancada de verdade passar a usar a web em vez do `.exe`. Para bancada sem rede estável, o `.exe`.
