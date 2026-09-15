# `/admin/bancada` — a análise física no navegador

Plano do Admin, seções 3.4 e 3.7; frente C, sub-branch C3.

`page.tsx` é Server Component: confere `bancada.ver`, lê a fila (`filaDeAnalise()` do serviço da
estação), o quadro de caixas e o que falta no ambiente para o vídeo subir, e entrega a primeira
pintura para `src/components/admin/bancada/BancadaWeb.tsx`.

| Permissão | O que libera |
|---|---|
| `bancada.ver` | A fila e o quadro de caixas |
| `bancada.analisar` | Abrir e fechar o procedimento, gravar o vídeo, cadastrar e editar caixa |

## O que não muda

- **A análise é a da estação.** O fechamento chama `fecharAnalise()` de
  `src/server/estacao/analise.ts` — a moeda nasce lá, com o hash encadeado pelos quinze campos
  congelados de `estacao/CONTRATO.md`, e o plano de custódia é alimentado como na B2.
- **O operador é o membro da sessão.** Não há campo para digitar outro.
- **A estação Electron continua funcionando**, sem alteração, e escreve na mesma corrente. A web é
  para bancada com rede estável (RA-45).
