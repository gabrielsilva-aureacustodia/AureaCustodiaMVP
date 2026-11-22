# Relatório de Modificações (detalhado) — frente D

Comparado com a base `9e21fe1`.

| Item | Tipo | Path | Consequência |
|---|---|---|---|
| Botão do Google principal | crítico (porta de entrada) | `src/components/login/GoogleButton.tsx`, `RegisterForm.tsx`, `LoginForm.tsx` | Google vira o primeiro caminho; o fluxo OAuth segue na mesma janela, sem popup |
| Bloco recolhido de e-mail e senha | contrato | `src/components/login/EmailAlternativo.tsx` | campos, validações, arbitragem e Pixel do e-mail seguem iguais, atrás de um clique |
| Demonstração do cadastro | contrato | `src/components/login/DemonstracaoDoCadastro.tsx` | passos em texto; vídeo entra depois ligando uma constante e publicando `public/demonstracao/cadastro.webm` |
| CSS novo de login | contrato | `src/styles/login.css` (prefixo `.pub-auth`) | `landing.css` não foi editado |
| Testes | contrato | 3 arquivos `.test.ts` em `src/components/login` e `src/app/{cadastrar,entrar}` | travam a ordem Google→declaração→e-mail e a ausência de `window.open` |
| READMEs | MD de pasta | `src/app/cadastrar/README.md`, `src/app/entrar/README.md` | R3 cumprida |

**Não mudou:** nenhuma pasta nova na raiz, nenhuma migration, nenhuma variável de ambiente, nenhum provedor novo, nenhuma superfície protegida; `auth.ts`, landing, `layout.tsx` e `src/domain` intactos.

**Observação de contrato D↔E:** o que o iPhone instalado faz ao sair para `accounts.google.com` só um aparelho prova; a frente E testa depois do deploy.
