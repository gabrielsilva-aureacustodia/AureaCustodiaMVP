/**
 * Guarda de regressão contra SQL injection.
 *
 * O QUE ESTE TESTE NÃO É. Não é um detector de vulnerabilidade. A auditoria de
 * 19/09/2026 varreu os 35 arquivos que executam SQL e não achou nenhum vetor: o
 * repositório interpola o nome do schema e parametriza todo valor em `$1, $2`.
 * O problema é que aquilo foi um retrato de um dia, e nada obriga a próxima
 * consulta a seguir o mesmo padrão.
 *
 * O QUE ELE É. Uma linha de base. O teste varre o código, extrai toda
 * interpolação que aparece dentro de uma string SQL e compara com a lista do
 * que já foi auditado. Interpolação NOVA reprova a suíte até alguém olhar e
 * decidir — ou trocar por `$N`, ou registrar na base com o motivo.
 *
 * POR QUE LINHA DE BASE E NÃO HEURÍSTICA. Uma regra esperta ("reprove se o
 * conteúdo não parecer seguro") erra nos dois sentidos: deixa passar o que é
 * perigoso e reclama do que não é. Falso positivo vira desabilitação, e guarda
 * desabilitada não guarda nada. Com base registrada, o ruído hoje é zero e todo
 * SQL novo passa por revisão obrigatória — que é o comportamento desejado.
 *
 * COMO ATUALIZAR depois de revisar uma interpolação nova e concluir que é
 * segura:
 *
 *     ATUALIZAR_BASELINE=1 npx vitest run src/server/db/sql-injecao.test.ts
 *
 * O diff do arquivo de base entra no commit e fica visível na revisão. Rodar
 * isso sem olhar o que mudou desmonta a guarda inteira.
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const BASE = 'src/server/db/sql-injecao.baseline.json'

/**
 * Palavras que denunciam uma string como comando SQL.
 *
 * O `(?<!\/)` não é detalhe: sem ele, a URL da API do Google Sheets
 * (`${base}/values/${intervalo}`) entra na varredura porque "values" casa com
 * `VALUES`. Um falso positivo aqui não cria risco — ele só engorda a base —,
 * mas faz o teste reprovar por motivo que não é dele, e teste que reclama do
 * que não interessa é teste que ninguém lê.
 */
const PALAVRAS_SQL =
  /(?<!\/)\b(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|FROM|WHERE|JOIN|ORDER\s+BY|GROUP\s+BY|LIMIT|VALUES|CREATE\s+(TABLE|INDEX|SCHEMA)|ALTER\s+TABLE|DROP\s+(TABLE|INDEX))\b/i

/**
 * Extrai as interpolações de nível superior de cada template literal com cara
 * de SQL.
 *
 * É um varredor de caracteres, e não uma expressão regular, por um motivo
 * concreto: o código tem template aninhado de verdade — `${param(`%${x}%`)}` —
 * e regex não conta chaves. Contar é o trabalho inteiro desta função.
 */
export function interpolacoesEmSql(fonte: string): string[] {
  const achados: string[] = []
  let i = 0

  while (i < fonte.length) {
    if (fonte[i] !== '`') {
      i++
      continue
    }

    // Início de um template literal: varre até a crase de fechamento,
    // guardando o texto estático e as expressões separadamente.
    i++
    let estatico = ''
    const expressoes: string[] = []

    while (i < fonte.length && fonte[i] !== '`') {
      if (fonte[i] === '\\') {
        i += 2
        continue
      }
      if (fonte[i] === '$' && fonte[i + 1] === '{') {
        i += 2
        let profundidade = 1
        let expressao = ''
        while (i < fonte.length && profundidade > 0) {
          if (fonte[i] === '{') profundidade++
          else if (fonte[i] === '}') {
            profundidade--
            if (profundidade === 0) break
          } else if (fonte[i] === '`') {
            // Template aninhado: consome inteiro para as crases dele não
            // encerrarem o de fora.
            expressao += fonte[i]
            i++
            while (i < fonte.length && fonte[i] !== '`') {
              if (fonte[i] === '\\') {
                expressao += fonte[i] + (fonte[i + 1] ?? '')
                i += 2
                continue
              }
              expressao += fonte[i]
              i++
            }
          }
          expressao += fonte[i]
          i++
        }
        i++
        expressoes.push(expressao.trim().replace(/\s+/g, ' '))
        continue
      }
      estatico += fonte[i]
      i++
    }
    i++

    if (PALAVRAS_SQL.test(estatico)) achados.push(...expressoes)
  }

  return achados
}

function arquivosTs(dir: string, achados: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) arquivosTs(caminho, achados)
    else if (/\.ts$/.test(nome) && !/\.test\.ts$/.test(nome)) achados.push(caminho.replace(/\\/g, '/'))
  }
  return achados
}

/** Mapa arquivo -> expressões distintas, ordenadas. Sem número de linha: linha muda com reformatação, expressão não. */
function inventario(): Record<string, string[]> {
  const mapa: Record<string, string[]> = {}
  for (const arquivo of arquivosTs('src')) {
    const achados = interpolacoesEmSql(readFileSync(arquivo, 'utf8'))
    if (achados.length) mapa[arquivo] = [...new Set(achados)].sort()
  }
  return mapa
}

describe('o varredor entende o que precisa entender', () => {
  it('acha interpolação em SQL', () => {
    expect(interpolacoesEmSql('const q = `SELECT * FROM ${S}.users`')).toEqual(['S'])
  })

  it('ignora template que não é SQL', () => {
    expect(interpolacoesEmSql('const msg = `Olá ${nome}, tudo bem?`')).toEqual([])
  })

  it('conta chaves em template aninhado, que é onde regex falharia', () => {
    const fonte = 'tx.query(`SELECT 1 FROM t WHERE a ILIKE ${param(`%${semCuringa(x)}%`)}`)'
    expect(interpolacoesEmSql(fonte)).toEqual(['param(`%${semCuringa(x)}%`)'])
  })

  it('separa várias interpolações do mesmo comando', () => {
    expect(interpolacoesEmSql('`SELECT ${COLUNAS} FROM ${S}.t${where} LIMIT ${n}`')).toEqual([
      'COLUNAS',
      'S',
      'where',
      'n',
    ])
  })
})

describe('linha de base do SQL auditado', () => {
  it('nenhuma interpolação nova em SQL sem revisão', () => {
    const atual = inventario()

    if (process.env.ATUALIZAR_BASELINE === '1') {
      writeFileSync(BASE, JSON.stringify(atual, null, 2) + '\n', 'utf8')
      return
    }

    expect(existsSync(BASE), `linha de base ausente — gere com ATUALIZAR_BASELINE=1`).toBe(true)
    const base: Record<string, string[]> = JSON.parse(readFileSync(BASE, 'utf8'))

    const novas: string[] = []
    for (const [arquivo, expressoes] of Object.entries(atual)) {
      const conhecidas = new Set(base[arquivo] ?? [])
      for (const e of expressoes) if (!conhecidas.has(e)) novas.push(`${arquivo}  ->  \${${e}}`)
    }

    expect(
      novas,
      'Interpolação nova dentro de SQL. O valor vai em $1/$2 (use o param() do próprio ' +
        'repositório); só identificador controlado — nome de schema, lista fixa de colunas — ' +
        'pode ser interpolado. Depois de revisar e concluir que é seguro, registre com ' +
        'ATUALIZAR_BASELINE=1 e deixe o diff da base visível no commit.',
    ).toEqual([])
  })

  it('a base não guarda arquivo que deixou de existir', () => {
    if (!existsSync(BASE)) return
    const base: Record<string, string[]> = JSON.parse(readFileSync(BASE, 'utf8'))
    const sumidos = Object.keys(base).filter((f) => !existsSync(f))
    expect(sumidos, 'rode ATUALIZAR_BASELINE=1 para limpar').toEqual([])
  })
})
