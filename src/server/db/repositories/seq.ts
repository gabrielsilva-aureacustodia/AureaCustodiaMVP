/**
 * Repositório de `aurea.seq` — os contadores de código E a fila de escrita.
 *
 * Substitui `state.seq`. A tabela tem uma linha só (id = 1), e essa linha
 * cumpre dois papéis:
 *
 *  1. guardar `coin` e `envio`, os contadores de RO-000001 e RO-ENV-0001;
 *  2. ser A TRAVA de toda mutação. `carregarSeq(tx, { travar: true })` faz
 *     `SELECT … FOR UPDATE` nela antes de qualquer outra leitura, e o Postgres
 *     põe a segunda transação em espera até a primeira commitar. É o mesmo
 *     `FOR UPDATE` que o blob fazia na sua única linha — a garantia de
 *     concorrência não mudou de natureza, só de tabela.
 *
 * Por que UMA fila e não uma por tipo de moeda: `mutateState(fn)` não sabe o
 * que `fn` vai tocar — pode ser o livro da Bandeira, o saldo de um usuário ou
 * um protocolo de envio. Travar por tipo exigiria que cada chamador declarasse
 * o que vai tocar, e isso é mudança de assinatura, que o contrato das frentes
 * paralelas proíbe. Com sete sócios, uma fila serializa tudo sem que ninguém
 * perceba; o refinamento por livro é o passo seguinte, anotado em ATALHOS.md.
 */

import type { Seq } from '@/domain/types'

import { nomeDoSchema, num, type Consulta } from '../sql'

type LinhaSeq = { coin: unknown; envio: unknown }

export async function carregarSeq(tx: Consulta, opcoes: { travar: boolean }): Promise<Seq> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaSeq>(
    `SELECT coin, envio FROM ${S}.seq WHERE id = 1${opcoes.travar ? ' FOR UPDATE' : ''}`,
  )
  const linha = rows[0]
  if (!linha) {
    // A migration insere a linha; se ela não existe, o schema não foi aplicado.
    // Falhar aqui, com mensagem, é melhor do que semear um estado sem contador
    // e descobrir depois que dois envios ganharam o mesmo protocolo.
    throw new Error(
      `${S}.seq está vazia — a migration inicial não foi aplicada. Rode: npm run db:migrate`,
    )
  }
  return { coin: num(linha.coin), envio: num(linha.envio) }
}

export async function atualizarSeq(tx: Consulta, seq: Seq): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(`UPDATE ${S}.seq SET coin = $1, envio = $2 WHERE id = 1`, [seq.coin, seq.envio])
}
