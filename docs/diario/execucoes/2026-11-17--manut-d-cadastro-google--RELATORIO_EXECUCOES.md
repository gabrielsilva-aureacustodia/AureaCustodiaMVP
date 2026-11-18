# Relatório de Execuções (detalhado) — frente D · Cadastro: Google primeiro e demonstração

```
Projeto:    Real Olímpico (AUREA CUSTODIA LTDA)
Branch:     claude/manut-cadastro-google-8d269f
ref_commit: 9e21fe1 (base) · 0 commits (B1)
Packet:     ficha C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\frentes\D-cadastro-google.md (itens 4 e 8 do Rogério, prazo 30/11/2026)
Data:       17/11/2026 · Autor: Auditoria (a partir do MD de execução e do LOG)
```

## 1. Tópicos na ordem real
1. **T1** (chat de branch): fluxo atual lido e desenho da tela no MD. Landing conferida: todos os botões de cadastro já apontam para `/cadastrar`.
2. **T2** (Execução): "Continuar com o Google" / "Entrar com o Google" como ação principal; e-mail e senha recolhidos em "Prefiro usar e-mail e senha"; declaração legal logo abaixo do botão do Google no cadastro; avisos em duas regiões `aria-live`.
3. **T3**: OAuth na mesma janela confirmado por leitura e por clique (sem `window.open`/popup). Contrato D↔E recebido da frente E.
4. **T4**: bloco "Veja como se cadastrar" (4 passos em texto, vídeo plugável por constante `null`). Gravação do vídeo ficou pós-deploy.
5. **T5**: testes novos e READMEs de `/cadastrar` e `/entrar` atualizados.

## 2. Arquivos tocados
| Arquivo | Porquê |
|---|---|
| `src/components/login/GoogleButton.tsx` (novo) | botão principal, só apresentação; o clique é dos formulários |
| `src/components/login/EmailAlternativo.tsx` (novo) | bloco recolhido de e-mail e senha (`<details>`, aberto só com erro do servidor) |
| `src/components/login/DemonstracaoDoCadastro.tsx` (novo) | passos em texto e vídeo mudo, sem autoplay, plugável |
| `src/components/login/RegisterForm.tsx`, `LoginForm.tsx` | Google primeiro; campos, validações, arbitragem, Pixel e mensagens preservados |
| `src/styles/login.css` | regras novas com prefixo `.pub-auth`, sem editar `landing.css` |
| `src/components/login/FormulariosDeAcesso.test.ts`, `src/app/cadastrar/pagina.test.ts`, `src/app/entrar/pagina.test.ts` (novos) | ordem Google→declaração→e-mail, `<details>`, redirect, ausência de `window.open` |
| `src/app/cadastrar/README.md`, `src/app/entrar/README.md` | R3: pasta explica seus arquivos |

Fora do Touch: nada. Sem migration, `src/domain`, `.env`, landing, `layout.tsx` ou `auth.ts`.

## 3. Testes rodados
- Execução, **antes** da ordem de memória do Controle (22:35): `eslint` dos arquivos da frente (0 achados), `tsc --noEmit` (0 erros), vitest de 5 arquivos (42 testes verdes), cada um uma vez.
- Conferência visual a 320/375/430 px e desktop, claro e escuro, feita em servidor local também antes da ordem.
- **Não rodados**, por ordem do Controle e regra do Gabriel (sem servidor local nem container): suíte completa e `npm run build`. Ficam para o merge/deploy.

## 4. Desvios da Auditoria (todos resolvidos)
- Ciclos 2 e 5: servidor local ativo na worktree (um `next dev` encerrado pelo Controle às 22:35, outro avisado às 22:40). A Execução explica no MD que as mensagens chegaram na fila depois de ela ter subido o servidor. Depois disso nenhum processo ligado à worktree.
- MD de execução ficou atrás do código em dois ciclos; foi atualizado.
- Nenhum commit, nenhuma trava criada, nenhuma palavra proibida em texto novo.

## 5. Bloqueios para o humano
- Gravar a demonstração **em produção** (sem conta, parando antes do consentimento do Google) e ligar `VIDEO_DA_DEMONSTRACAO`.
- Decisão pendente do Gabriel depois do teste no iPhone (frente E): se aparecer `exchangeCode`, esconder o Google em modo app ou guardar o verificador no servidor.
- `/entrar` não tem "esqueci minha senha"; quem entrou só pelo Google não tem senha (já era assim; fora do escopo).

## 6. O que o MD de execução já cobre
Desenho, contrato D↔E, AÇÕES PÓS-DEPLOY e log por tópico: `2026-11-17--manut-d-cadastro-google--MD_EXECUCAO.md`.

## 7. Próximo ato
O Controle faz o merge e o deploy e executa as AÇÕES PÓS-DEPLOY do MD de execução (conferência em produção, vídeo, build e suíte completa).
