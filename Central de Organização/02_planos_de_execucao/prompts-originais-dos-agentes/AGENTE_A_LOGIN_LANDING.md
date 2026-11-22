# Prompt — Agente A · Login, cadastro e landing page

> Copie o bloco abaixo inteiro como primeira mensagem do chat dedicado a esta frente.

---

Você vai trabalhar no repositório da **Áurea Custódia / Real Olímpico**
(`C:\dev\AureaCustodiaMVP`), numa frente específica: **login, cadastro e landing page**.

Outros dois agentes estão trabalhando em paralelo neste mesmo repositório, em outras frentes.
Existe um contrato escrito de quem pode editar o quê, e ele não é negociável.

## Antes de escrever qualquer linha, leia nesta ordem

1. **`CLAUDE.md`** (raiz) — as regras do projeto. É carregado automaticamente
2. **`docs/FRENTES_PARALELAS.md`** — ⚠️ **o mais importante para você.** Define exatamente
   quais arquivos são seus e quais são dos outros dois agentes
3. **`docs/EXECUCAO_POR_MODULO.md`**, módulos **M2** (Supabase Auth) e **M3** (landing) — o
   passo a passo da sua frente, com critério de aceite
4. **`docs/DECISOES_D1_D9_E_PLANO.md`** — as decisões D2 e D4 (Supabase como banco e como
   autenticação) já estão tomadas; não as rediscuta
5. **`RISCOS_ASSUMIDOS.md`** (raiz) — em especial o **RA-03**, que trava parte da sua frente
6. **`src/app/README.md`** e **`src/components/README.md`** — o que as pastas sustentam

## Seu escopo

**Branch:** `feat/auth-landing`

Só edite arquivos listados como seus em `docs/FRENTES_PARALELAS.md`. Precisando de mudança
em arquivo alheio — em especial `src/domain/types.ts` — **pare e peça ao Gabriel**.

### O que construir

**1. Landing page** (`/`) — pode começar já, não depende de nada

Página única, deliberadamente simples, com o foco no cadastro:
- Logo, nome e uma frase do que é a Áurea Custódia
- Três ou quatro blocos: custódia física → recibo digital → marketplace
- **Dois botões: "Criar conta" e "Entrar"**
- Rodapé com CNPJ e links legais

A copy é rascunho para o Gabriel editar depois. O que importa é a estrutura e os caminhos.

**Sobre o seguro:** confirmado que **haverá seguro** sobre o acervo custodiado. Você pode
afirmar isso. **Não cite seguradora, cobertura ou percentual** — a apólice ainda não existe,
e número errado em página pública vira promessa a honrar.

**2. Mudança de rotas** — ⚠️ o ponto que derruba o site se feito errado

```
/            login  →  landing (nova, pública)
/entrar      —      →  o login de hoje
/cadastrar   —      →  cadastro (novo)
```

`(app)/layout.tsx` redireciona quem não tem sessão para `/`, e `page.tsx` redireciona quem
tem sessão para `/inicio`. **Os dois precisam apontar para `/entrar` no mesmo commit** que
move o login. Em commits separados, o usuário deslogado cai na landing em laço.

**3. Cadastro e login com Supabase Auth** — espera a frente B criar a tabela de usuário

- **Continuar com Google** (integração nativa do Supabase Auth)
- **Cadastro por e-mail com verificação** — a conta nasce sem poder operar; o link libera
- E-mail transacional via Resend

Isso **paga o RA-02** (senhas em texto puro): o Supabase guarda hash e a plataforma deixa de
conhecer senha.

## 🔴 A trava que não é técnica

**RA-03: não existem termos de uso nem política de privacidade.** Cadastrar usuário é
coletar dado pessoal, e a LGPD exige finalidade declarada e base legal.

**A landing pode ir ao ar. O cadastro fica FECHADO ao público** até os dois documentos
existirem, com registro de qual versão foi aceita e quando, por usuário.

Construa o fluxo completo; não o abra sem os documentos.

## Decisão que precisa do Gabriel

⚪ **As 7 contas de teste migram para o Supabase Auth ou são recriadas?** Elas têm e-mail
fictício (`@testeaurea.com.br`) que não recebe mensagem, o que impede verificação.
Recomendação registrada: recriar com os e-mails reais dos sócios.

**Pergunte antes de decidir.**

## Regras que valem sempre

- Antes de commitar: `npm run typecheck`, `npm test`, `npm run build` — os três verdes
- **Todo atalho de teste ou segurança** vai para `RISCOS_ASSUMIDOS.md` **e** para o
  `ATALHOS.md` da pasta afetada, no mesmo commit
- **Toda pasta nova nasce com `README.md`**
- **O repositório está público de propósito.** Nenhuma senha, token ou credencial em commit
- **Nada de `@/server/*` em Client Component** — o `server-only` quebra o build
- Alvo de toque mínimo no celular: **44px**
- `responsive.css` precisa continuar sendo o **último** import de `globals.css`
- Comentários em português, explicando o **porquê**

## Como começar

Comece pela **landing**, que não depende de ninguém. Antes de editar, descreva o plano —
quais arquivos, em que ordem, o que pode quebrar — e espere aprovação. É a regra 1 do
`CLAUDE.md`.
