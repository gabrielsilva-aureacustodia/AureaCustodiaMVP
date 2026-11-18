/**
 * Consulta de LEITURA das notas fiscais de um cliente (frente G, 18/11/2026).
 *
 * SÓ SERVIDOR, só `SELECT`. Existe separado de `src/server/db/repositories/nfse.ts` de propósito: aquele
 * arquivo é a fila de EMISSÃO (reivindica, grava número, cancela) e lê a tabela inteira para o painel; este
 * só enxerga o que é de UM dono. Quem chama passa o e-mail da SESSÃO — nunca um e-mail vindo do navegador.
 *
 * A REGRA QUE ESTE ARQUIVO GARANTE — o filtro de dono está dentro do próprio `WHERE`, em toda consulta, e
 * `id` sozinho nunca basta. O XML da nota traz CPF, nome e endereço do tomador: entregar o de outra conta
 * seria vazar dado pessoal (LGPD). Por isso não existe aqui um "buscar nota por id" sem dono, e o teste
 * (`consulta.test.ts`) prova com dois clientes no mesmo banco que a conta A não lê a nota da conta B.
 *
 * `lower()` dos dois lados: o e-mail do tomador é gravado como a conta o tinha na hora do fato, e a sessão
 * devolve o e-mail normalizado — comparar em minúsculas evita que uma diferença de caixa esconda a nota do
 * dono (nunca mostra a de outro: a igualdade continua exata).
 */

import { paraNotaDoCliente, type LinhaDaNota, type NotaDoCliente } from '@/domain/nfse/notas-do-cliente'
import type { ServicoNfse } from '@/domain/nfse/codigos'
import { nomeDoSchema, num, numOuNulo, type Consulta } from '@/server/db/sql'

const COLUNAS = `id, servico, ref_fato, valor, ocorrido_em, competencia, descricao, quantidade_moedas, status, ambiente,
  numero_nfse, chave_acesso, autorizada_em, cancelada_em, motivo_cancelamento,
  erros -> 0 ->> 'codigo' AS codigo_do_erro, (xml_nfse IS NOT NULL) AS tem_xml`

function paraLinha(r: Record<string, unknown>): LinhaDaNota {
  return {
    id: num(r.id),
    servico: r.servico as ServicoNfse,
    refFato: String(r.ref_fato),
    valorCents: num(r.valor),
    ocorridoEm: num(r.ocorrido_em),
    competencia: String(r.competencia),
    descricao: String(r.descricao),
    quantidadeMoedas: num(r.quantidade_moedas),
    status: String(r.status),
    ambiente: (r.ambiente as 'producao' | 'restrita' | null) ?? null,
    numeroNfse: (r.numero_nfse as string | null) ?? null,
    chaveAcesso: (r.chave_acesso as string | null) ?? null,
    autorizadaEm: numOuNulo(r.autorizada_em),
    canceladaEm: numOuNulo(r.cancelada_em),
    motivoCancelamento: (r.motivo_cancelamento as string | null) ?? null,
    codigoDoErro: (r.codigo_do_erro as string | null) ?? null,
    temXml: r.tem_xml === true,
  }
}

/** Todas as notas (e pedidos de nota) de UM dono, na ordem da tela. */
export async function listarNotasDoDono(tx: Consulta, emailDoDono: string): Promise<NotaDoCliente[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query(
    `SELECT ${COLUNAS} FROM ${S}.nfse_emissoes
      WHERE lower(tomador_email) = lower($1)
      ORDER BY ocorrido_em DESC, id DESC`,
    [emailDoDono],
  )
  return rows.map((r) => paraNotaDoCliente(paraLinha(r)))
}

export interface NotaComXml {
  nota: NotaDoCliente
  xml: string | null
}

/**
 * Uma nota E o XML dela — só se for do dono. `null` quando o id não existe OU é de outra conta: quem chama
 * não consegue distinguir os dois casos, e não deve (saber que o id existe já é informação).
 */
export async function notaDoDonoComXml(tx: Consulta, emailDoDono: string, id: number): Promise<NotaComXml | null> {
  if (!Number.isSafeInteger(id) || id <= 0) return null
  const S = nomeDoSchema()
  const { rows } = await tx.query(
    `SELECT ${COLUNAS}, xml_nfse FROM ${S}.nfse_emissoes
      WHERE id = $2 AND lower(tomador_email) = lower($1)`,
    [emailDoDono, id],
  )
  const r = rows[0]
  if (!r) return null
  return { nota: paraNotaDoCliente(paraLinha(r)), xml: (r.xml_nfse as string | null) ?? null }
}
