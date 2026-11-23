/**
 * EXECUTOR DE USO ÚNICO — publica em `aurea.documentos_legais` as versões novas dos documentos legais do QA do
 * Davi (22/11/2026): Termos 2.2, Cláusula de Arbitragem 2.2, Política 2.1 e Tabela de Taxas 2.5.
 *
 * POR QUE ISTO EXISTE. O texto novo vai no código, mas a VERSÃO VIGENTE de cada documento é a mais recente da
 * tabela (`carregarDocumentoVigente`). Hoje nada publica sozinho no deploy: `garantirDocumentosVigentes` só roda
 * quando alguém aceita documentos ou publica pelo painel. Sem a linha nova, o site serve o texto novo com o
 * hash/versão antigos e o REACEITE não dispara (`aceitesPendentes` vazio).
 *
 * O QUE FAZ. Para cada documento, monta o texto exatamente como o site o serve (`documentoDaConfiguracao`, com a
 * configuração vigente do banco), confere que a versão do código é a esperada, e grava por
 * `publicarVersaoDocumento` (o mesmo caminho do painel) com a versão exata. Idempotente:
 *   - já existe (chave, versão) com o MESMO hash → não faz nada;
 *   - já existe (chave, versão) com hash DIFERENTE → NÃO sobrescreve, avisa e falha (decisão humana);
 *   - não existe → insere.
 * Não cria conta e não toca em `aceites_documentos`. No fim confere `confere = true` para os quatro.
 *
 * POR QUE MORA EM `scripts/`. Grava em produção; dentro de `src/` a suíte o executaria (ver faturar-custodia.test.ts).
 *
 * USO (PowerShell, na raiz do repositório; precisa de POSTGRES_URL no .env.local):
 *   Só confere (não grava):
 *     npx vitest run --config scripts/vitest.scripts.mts scripts/publicar-documentos-legais.test.ts
 *   Grava de verdade:
 *     $env:PUBLICAR_DOCUMENTOS = "SIM"; npx vitest run --config scripts/vitest.scripts.mts scripts/publicar-documentos-legais.test.ts
 */

import { readFileSync } from 'node:fs'

import { describe, expect, it, vi } from 'vitest'

// Neutraliza a barreira `server-only`: o alvo é justamente um módulo de servidor.
vi.mock('server-only', () => ({}))

for (const linha of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = linha.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}

const GRAVAR = process.env.PUBLICAR_DOCUMENTOS === 'SIM'

/** Versões exatas pedidas pelo Controle (22/11/2026). Mudou o texto de novo? Mude aqui e no arquivo do documento. */
const ALVOS = [
  { chave: 'termos_de_uso', versao: '2.3' },
  { chave: 'clausula_arbitragem', versao: '2.2' },
  { chave: 'politica_privacidade', versao: '2.1' },
  { chave: 'tabela_de_taxas', versao: '2.5' },
] as const

describe('publicação das versões novas dos documentos legais', () => {
  it(GRAVAR ? 'grava as quatro versões' : 'simula (nada é gravado)', async () => {
    const { bancoConfigurado, executarNoBanco } = await import('@/server/db/client')
    expect(bancoConfigurado(), 'POSTGRES_URL ausente no .env.local').toBe(true)

    const { carregarConfiguracaoDoSite } = await import('@/server/config/carregar')
    const { documentoDaConfiguracao, carregarDocumentoVigente } = await import('@/server/config/documentos')
    const { DOCUMENTOS_VIGENTES, hashDoDocumento, textoCanonico } = await import('@/domain/documentos-legais')
    const { buscarDocumentoPorChaveEVersao } = await import('@/server/db/repositories/documentos')
    const { publicarVersaoDocumento } = await import('@/server/documentos/publicar')

    const config = await carregarConfiguracaoDoSite()
    const problemas: string[] = []

    for (const { chave, versao } of ALVOS) {
      const codigo = DOCUMENTOS_VIGENTES[chave]
      if (codigo.versao !== versao) {
        problemas.push(`${chave}: o código está na versão ${codigo.versao}, esperada ${versao}.`)
        continue
      }

      const servido = documentoDaConfiguracao(chave, config)
      const conteudo = textoCanonico(servido)
      const hash = hashDoDocumento(servido)
      if (hash !== codigo.hash) {
        console.log(`AVISO ${chave}: o texto servido (configuração do painel) difere do texto do código; vale o servido.`)
      }

      const existente = await executarNoBanco((tx) => buscarDocumentoPorChaveEVersao(tx, chave, versao), { somenteLeitura: true })
      if (existente && existente.hashConteudo === hash) {
        console.log(`OK    ${chave} ${versao}: já publicada com o mesmo hash.`)
        continue
      }
      if (existente) {
        problemas.push(`${chave} ${versao}: já existe com hash DIFERENTE (${existente.hashConteudo.slice(0, 12)}… × ${hash.slice(0, 12)}…). Não sobrescrevi.`)
        continue
      }

      if (!GRAVAR) {
        console.log(`FARIA ${chave} ${versao}: inserir (hash ${hash.slice(0, 12)}…).`)
        continue
      }
      const r = await publicarVersaoDocumento(chave, conteudo, 'sistema:qa-davi-2026-11-22', versao)
      console.log(`GRAVOU ${chave} ${r.versao}: hash ${r.hash.slice(0, 12)}…`)
    }

    if (GRAVAR) {
      for (const { chave, versao } of ALVOS) {
        const v = await carregarDocumentoVigente(chave, config)
        console.log(`CONFERE ${chave}: vigente ${v.versao}, doBanco=${v.doBanco}, confere=${v.confere}`)
        if (v.versao !== versao || !v.doBanco || !v.confere) problemas.push(`${chave}: após gravar, vigente=${v.versao} doBanco=${v.doBanco} confere=${v.confere}.`)
      }
    }

    expect(problemas, problemas.join('\n')).toEqual([])
  }, 120_000)
})
