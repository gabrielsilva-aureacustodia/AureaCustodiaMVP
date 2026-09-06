# Roteiro de Merge e Publicação — Branch A (`feat/auth-landing`)

```text
Projeto:      Áurea Custódia / Real Olímpico
Branch:       feat/auth-landing  ->  main
Responsável:  Gabriel Silva
Data:         06/09/2026
Estado:       ✅ Código 100% validado (161 testes verdes, typecheck, lint e build aprovados)
```

---

## 1. Diagnóstico Local — Falta alguma coisa de código?

**Não.** Não falta nada no código nem nos testes da Branch A:
- ✅ **Landing Page pública** em `/`
- ✅ **Login seguro com Supabase Auth** em `/entrar` (com contingência local ativa para as contas do seed)
- ✅ **Cadastro de usuários** em `/cadastrar` (com confirmação por e-mail, Google OAuth e aceite versionado dos termos)
- ✅ **Documentos Legais** em `/termos` e `/privacidade`
- ✅ **Callback e Provisionamento Idempotente** em `/entrar/callback` (R$ 5.000,00 e 6 moedas fictícias)
- ✅ **Rotas provisórias inseguras removidas** (`/criar-conta` e `/entrar-demo` apagadas)
- ✅ **Riscos governados** (RA-15 pago e RA-17 registrado)
- ✅ **161 testes automatizados passando**, TypeScript strict sem erros e build da Vercel gerando 23 páginas com sucesso.

---

## 2. Passo a Passo Executivo para Merge e Publicação

Execute os comandos abaixo diretamente no seu PowerShell no diretório do projeto (`C:\dev\AureaCustodiaMVP`):

### Passo 2.1 — Liberar a branch `main` do worktree secundário

O Git possui um worktree paralelo chamado `AureaCustodiaMVP-docs` que está segurando o checkout da `main`. Para permitir o checkout no diretório principal:

```powershell
git worktree remove C:/dev/AureaCustodiaMVP-docs
```

*(Se o comando disser que há arquivos não rastreados ou modificados e recusar, use `git worktree remove --force C:/dev/AureaCustodiaMVP-docs`)*

---

### Passo 2.2 — Fazer o Checkout e o Merge oficial na `main`

Como a branch `feat/auth-landing` já está rebaseada sobre a `main` mais recente, o merge é limpo e sem nenhum conflito:

```powershell
git checkout main
git merge --no-ff feat/auth-landing -m "Merge feat/auth-landing: landing pública, cadastro e autenticação segura (M2/M4)"
```

---

### Passo 2.3 — Verificação Rápida de Segurança

Rode a checagem rápida para garantir que a árvore mesclada continua 100% íntegra:

```powershell
npm run typecheck
npm test
npm run build
```

*(Todos devem passar com sucesso).*

---

### Passo 2.4 — Publicar Oficialmente na Vercel

Após ajustar a credencial do GitHub no Git Credential Manager:

```powershell
git push origin main
```

*(Opcional: atualizar a branch remota para arquivamento histórico)*:
```powershell
git push origin feat/auth-landing --force-with-lease
```

---

## 3. O que acontece imediatamente após o Push na `main`

1. **Deploy Automático na Vercel:**  
   O webhook do GitHub aciona a Vercel, que executa o `npm run build` e publica a versão em produção em `https://aurea-custodia-mvp.vercel.app`.

2. **Comportamento em Produção:**  
   - `/` exibe a nova Landing Page institucional.
   - `/entrar` exibe o novo portal de login.
   - Usuários não autenticados que tentam acessar rotas internas (como `/inicio` ou `/mercado`) são redirecionados automaticamente para `/entrar`.
   - Usuários com login ativo são direcionados para `/inicio`.
   - Se as variáveis do Supabase Auth estiverem cadastradas na Vercel, o login/cadastro externo já opera com confirmação por e-mail e Google. Se ainda não estiverem ativas, a **contingência do RA-17** mantém as 7 contas de sócios operando sem que ninguém fique trancado para fora.
