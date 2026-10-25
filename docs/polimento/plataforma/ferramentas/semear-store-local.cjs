// Semeia o store EM MEMÓRIA de um `next dev` local com as 7 contas do seed, para testar telas logadas sem banco.
// Uso (Git Bash, na raiz da worktree):
//   1) gere a semente:  SEMENTE_SAIDA=/caminho/semente.json npx vitest run docs/polimento/plataforma/ferramentas/gerar-semente.test.ts --dir .
//   2) suba o servidor: SEMENTE=/caminho/semente.json NODE_ENV=test NODE_OPTIONS="--require ./docs/polimento/plataforma/ferramentas/semear-store-local.cjs" npx next dev -p 3104 -H 0.0.0.0
// NODE_ENV=test faz o Next ler só `.env.test.local` (nunca o `.env.local` de produção). Ver o README desta pasta.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- o --require do Node só carrega CommonJS
const fs = require('node:fs')
const caminho = process.env.SEMENTE
if (caminho && fs.existsSync(caminho)) {
  const j = JSON.parse(fs.readFileSync(caminho, 'utf8'))
  globalThis.__aureaMemoryStore__ ??= new Map()
  if (!globalThis.__aureaMemoryStore__.has(j.key)) globalThis.__aureaMemoryStore__.set(j.key, JSON.stringify(j.state))
}
