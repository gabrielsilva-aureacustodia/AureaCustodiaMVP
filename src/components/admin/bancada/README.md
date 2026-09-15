# `src/components/admin/bancada/` — a bancada de análise no navegador

A tela de `/admin/bancada` (plano do Admin, seções 3.4 e 3.7; frente C, sub-branch C3). Client
Components; os dados chegam da página e de `atualizarBancadaNoPainel`.

| Arquivo | O que desenha |
|---|---|
| `BancadaWeb.tsx` | A fila, o procedimento (uma ficha por moeda: aprovar ou recusar, peso em gramas, caixa e posição, motivo da recusa) e o fechamento. Valida com as regras do servidor antes do clique, só para o operador saber na hora |
| `GravadorDeVideo.tsx` | Câmera por `getUserMedia` com escolha e memória do dispositivo, gravação por `MediaRecorder` tentando os formatos até um funcionar, sem microfone, envio direto ao Storage por URL assinada e o link "Baixar a gravação" |
| `QuadroDeCaixas.tsx` | As caixas do cofre com a ocupação real (cadastradas e as que só existem no texto de alguma análise), e o cadastro e a edição de caixa |
| `ATALHOS.md` | RA-45: sem cópia em disco e sem retomada depois de recarregar |

## Regras desta pasta

- **O peso é texto, não `input type=number`.** O Chromium descarta "27,05" num campo numérico — o
  mesmo achado de 10/09/2026 que está em `estacao/renderer/app.js`.
- **Não se troca de envio nem se fecha a análise com a gravação ligada.**
- **Falha de vídeo nunca impede o fechamento** (RA-23): a tela diz que a análise registra a ausência.
- **Quem grava é o servidor.** `fecharAnaliseNoPainel` valida de novo e chama `fecharAnalise()` da
  estação; o operador é o membro da sessão.

## Conexões

| Pasta | Relação |
|---|---|
| `src/server/actions/admin/bancada.ts` | Fila, abrir, assinar vídeo, fechar, salvar caixa |
| `src/domain/admin/bancada.ts`, `caixas.ts` | Validação da entrada e ocupação do cofre |
| `src/server/estacao/analise.ts` | O tipo `SaidaFechamento` (só `import type`) |
| `src/styles/admin.css` | O bloco C3 (`.adm-bancada*`) |
