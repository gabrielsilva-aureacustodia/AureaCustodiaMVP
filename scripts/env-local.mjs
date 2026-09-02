/**
 * Onde está o `.env.local` — inclusive quando o comando roda num git worktree.
 *
 * O PROBLEMA QUE ISTO RESOLVE (achado em 03/09/2026)
 * --------------------------------------------------
 * As frentes paralelas trabalham em worktrees separados
 * (`git worktree add ../AureaCustodiaMVP-banco feat/banco-supabase`). Um worktree
 * compartilha os COMMITS, não os arquivos ignorados pelo Git — e `.env.local` é
 * ignorado. Resultado: `npm run db:migrate` rodado no worktree não achava
 * arquivo nenhum e morria com "defina POSTGRES_URL_DIRECT", como se a variável
 * não existisse, quando na verdade ela estava viva na pasta principal.
 *
 * O sintoma enganava: parecia configuração faltando, era só o arquivo noutro
 * diretório. Por isso a busca sobe até o worktree principal e, mais importante,
 * o comando IMPRIME qual arquivo usou — quem lê o log sabe de onde veio a
 * credencial sem precisar adivinhar.
 *
 * Nunca imprime valor nenhum, só caminho.
 */

import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

/**
 * Raiz do worktree principal, quando `raiz` é um worktree vinculado.
 *
 * Num worktree vinculado o `.git` é um ARQUIVO com uma linha
 * `gitdir: C:/dev/AureaCustodiaMVP/.git/worktrees/AureaCustodiaMVP-banco`.
 * Tirando o trecho `/worktrees/<nome>` chega-se ao `.git` principal, e o pai
 * dele é a pasta que tem o `.env.local`. Num clone comum, `.git` é um
 * diretório e não há nada a procurar.
 */
function raizDoWorktreePrincipal(raiz) {
  const dotGit = join(raiz, '.git')
  if (!existsSync(dotGit) || statSync(dotGit).isDirectory()) return null

  const conteudo = readFileSync(dotGit, 'utf8')
  const gitdir = /^gitdir:\s*(.+)$/m.exec(conteudo)?.[1]?.trim()
  if (!gitdir) return null

  const normalizado = resolve(raiz, gitdir).replace(/\\/g, '/')
  const principal = /^(.*)\/worktrees\/[^/]+$/.exec(normalizado)?.[1]
  if (!principal) return null

  // `principal` é o .git do worktree principal; a raiz é o diretório acima.
  return dirname(principal)
}

/**
 * Carrega o `.env.local` se — e só se — nenhuma das variáveis de `jaDefinidas`
 * veio do ambiente. Na Vercel elas já vêm, e ler arquivo ali seria errado.
 *
 * Devolve o caminho usado, ou null se não carregou nada.
 */
export function carregarEnvLocal(raiz, jaDefinidas = []) {
  if (jaDefinidas.some((nome) => process.env[nome])) return null

  const candidatos = [join(raiz, '.env.local')]
  const principal = raizDoWorktreePrincipal(raiz)
  if (principal) candidatos.push(join(principal, '.env.local'))

  for (const caminho of candidatos) {
    if (!existsSync(caminho)) continue
    process.loadEnvFile(caminho)
    return caminho
  }
  return null
}

/** Host e porta da connection string, para log. Nunca a senha. */
export function descreverUrl(url) {
  try {
    const u = new URL(url)
    return `${u.hostname}:${u.port || '5432'} (usuário ${u.username})`
  } catch {
    return '(connection string ilegível — ela precisa ser UMA linha começando com postgresql://)'
  }
}
