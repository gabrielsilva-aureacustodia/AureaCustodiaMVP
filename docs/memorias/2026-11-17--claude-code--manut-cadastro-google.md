# Cadastro: Google primeiro e demonstração — memória do agente

- **Data:** 2026-11-17 · **Agente:** claude-code (Auditoria) · **Projeto/branch:** manut-cadastro-google (`claude/manut-cadastro-google-8d269f`, base 9e21fe1)

## 1. Estado em uma tela
`/cadastrar` e `/entrar` mostram "Continuar/Entrar com o Google" como ação principal; e-mail e senha ficam recolhidos em "Prefiro usar e-mail e senha". Existe o bloco "Veja como se cadastrar" com 4 passos em texto; o vídeo não existe ainda (constante `VIDEO_DA_DEMONSTRACAO` em `null`). Código pronto, 0 commits, sem migration.

## 2. Decisões e o porquê
- OAuth na mesma janela (`window.location.assign`), sem popup — o app instalado no iPhone não segura popup (contrato D↔E).
- Não editar `landing.css`: regras novas em `src/styles/login.css` com prefixo `.pub-auth`.
- Vídeo gravado em produção depois do deploy, sem conta real e parando antes do consentimento do Google — Gabriel proibiu servidor local e container (17/11/2026).
- Uma ação dourada por tela: "Criar conta por e-mail"/"Entrar" viraram botão de contorno.

## 3. O que aprendi
- Com pouca memória (0,2 GB livres, 15 sessões), mensagens de ordem chegam na fila depois de o agente já ter subido `next dev`; a Auditoria vê isso por `Get-CimInstance Win32_Process` filtrando `node.exe`.
- Vitest da frente roda com `environment: 'node'`: testes de tela são `.test.ts` com `renderToStaticMarkup`.
- O erro 1455 do Windows é falta de memória; esperar, não reabrir em laço.

## 4. Como continuar
1. Controle faz merge e deploy; `npm run build` e `npm test` completos no merge.
2. Conferir `/cadastrar` e `/entrar` em produção a 320/375/430 px, claro e escuro, sem enviar formulário.
3. Gravar `cadastro.webm` (até ~1,5 MB, mudo) em produção, publicar em `public/demonstracao/` e ligar a constante em `src/components/login/DemonstracaoDoCadastro.tsx`. MP4 para WhatsApp em `docs\manutencao-2026-11\entregas\`.
4. Frente E testa o ciclo do Google no iPhone instalado.

## 5. Pendências e riscos
- Se aparecer `exchangeCode` no callback do iPhone: esconder o Google em modo app (`lerStandalone()`) ou guardar o verificador no servidor — decisão do Gabriel.
- `/entrar` sem "esqueci minha senha"; conta criada só pelo Google não tem senha.
- Clique do Google sem teste automático (a suíte roda sem DOM).

## 6. Ligações
MD de execução `docs/diario/execucoes/2026-11-17--manut-d-cadastro-google--MD_EXECUCAO.md`; relatórios na mesma pasta; ficha `docs/manutencao-2026-11/frentes/D-cadastro-google.md`; `[[meta-pixel-capi-estado-e-teste]]`.
