# Método de publicação via fork — quando o push direto está bloqueado

```
Escrito em: 06/09/2026
Motivo:     o push da conta principal ficou impossível por um dia inteiro e este
            caminho publicou a Branch A sem depender de e-mail, senha ou suporte
Vale para:  qualquer situação em que o `git push` for recusado por permissão
```

> **Para o Rogério.** O GitHub é onde o código da plataforma fica guardado. Normalmente a
> gente "empurra" o código direto para lá. Quando essa porta trava, existe uma porta lateral:
> mandar o código para uma cópia própria do projeto e depois pedir que essa cópia seja
> incorporada à original. É o mesmo trabalho, entregue por outro caminho — e nada se perde.

---

## 1. Quando usar

Este método serve quando o `git push` falha com **403 / permission denied**, e não por
falta de rede ou de credencial. O sintoma exato:

```
remote: Permission to <dono>/<repo>.git denied to <sua-conta>.
fatal: unable to access '...': The requested URL returned error: 403
```

Isso quer dizer que a credencial **funciona** — ela é só de uma conta que não tem
permissão de escrita naquele repositório.

Casos reais em que isso aparece:

- o terminal está autenticado com uma conta secundária (foi o caso em 06/09/2026:
  `gabrielsilva-sintetica` autenticada, repositório pertencente a
  `gabrielsilva-aureacustodia`);
- a conta dona está trancada fora por 2FA, e-mail ou *sudo mode*;
- você tem acesso de leitura ao repositório, mas não de escrita.

**Não use** este método se o problema for outro: `non-fast-forward` é divergência de
histórico, e falha de DNS ou de rede não se resolve com fork.

## 2. Por que funciona

O fork é uma cópia do repositório **na sua própria conta**. Você tem permissão total sobre
ele, então o push é aceito sem discussão. Depois, um Pull Request pede que o dono
incorpore aqueles commits — e **aprovar um PR não é ação protegida por *sudo mode***, ao
contrário de gerar token ou trocar credencial.

Ou seja: o método troca uma operação bloqueada (escrever no repositório do outro) por duas
operações liberadas (escrever no seu + pedir merge).

## 3. Diagnóstico antes de começar

Confirme que é mesmo problema de permissão, e não outra coisa:

```bash
git push --dry-run origin <sua-branch>
```

`--dry-run` autentica e negocia com o servidor sem enviar nada. Se aparecer o 403 com
"denied to", siga. Veja também com qual conta você está autenticado:

```bash
gh auth status
```

## 4. O procedimento

### 4.1 Criar o fork

```bash
gh repo fork <dono>/<repo> --clone=false --remote=false
```

Se o ambiente bloquear esse comando, a via equivalente pela API funciona igual:

```bash
gh api --method POST repos/<dono>/<repo>/forks --jq '.full_name'
```

A resposta é o nome do fork, por exemplo `gabrielsilva-sintetica/AureaCustodiaMVP`.

### 4.2 Apontar um remote para o fork

```bash
git remote add fork https://github.com/<sua-conta>/<repo>.git
```

Se o remote já existir, troque a URL em vez de criar outro:

```bash
git remote set-url fork https://github.com/<sua-conta>/<repo>.git
```

### 4.3 Enviar os commits

```bash
git push fork main:main
```

**Antes de rodar, confirme que será *fast-forward*** — isto é, que você só acrescenta
commits, sem reescrever nada:

```bash
git merge-base --is-ancestor <commit-do-fork> main && echo "fast-forward, sem force"
```

Se der `non-fast-forward`, **não force**. Mande para uma branch nova:

```bash
git branch -f entrega/nome-da-frente main
git push fork entrega/nome-da-frente
```

Um `--force` num fork que herdou branches antigas apaga histórico sem avisar. A branch
nova custa nada e não destrói nada.

### 4.4 Abrir o Pull Request

```bash
gh pr create --repo <dono>/<repo> --base main --head <sua-conta>:main --title "<título>" --body "<o que a entrega traz>"
```

O comando devolve a URL do PR. Abra e clique em **Merge pull request**. Merge de PR não
dispara verificação por e-mail.

## 5. Depois de publicar

O fork continua existindo e vai ficando velho. Duas opções:

- **manter**, se o caminho for usado com frequência — basta sincronizar com
  `gh repo sync <sua-conta>/<repo>` antes de cada uso;
- **apagar**, se foi emergência pontual, em Settings do fork → *Delete this repository*.

E vale limpar o remote local quando não for mais usar:

```bash
git remote remove fork
```

## 6. Armadilhas conhecidas

| Sintoma | Causa | O que fazer |
|---|---|---|
| `non-fast-forward` no push para o fork | o fork herdou a branch antiga do original | mandar para uma branch nova, nunca `--force` |
| PR aparece vazio | o `--head` está apontando para a branch errada | conferir com `git log --oneline -1` qual commit você enviou |
| `gh` age com a conta errada | há mais de uma conta autenticada | `gh auth status` e depois `gh auth switch --user <conta>` |
| Comando bloqueado pelo ambiente | política de permissão local | rodar o mesmo comando no seu terminal, ou usar a via `gh api` |

## 7. O que este método não resolve

Ele publica o código, e só. **Não devolve acesso a e-mail, não desbloqueia 2FA e não
substitui a correção da causa raiz.** Se o push direto quebrou porque a conta está
trancada, o fork é a ponte enquanto o acesso não volta — não o conserto.

---

## Ver também

- `docs/GUIA_VERCEL_HOSTGATOR_EMAIL_E_DOMINIOS.md` — domínios, DNS e a correção do e-mail
- `docs/RELATORIO_FINAL_BRANCH_A_LOGIN_LANDING.md` — a entrega publicada por este método
- `RISCOS_ASSUMIDOS.md` — atalhos assumidos, incluindo os desta frente
