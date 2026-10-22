import 'server-only'

/**
 * Rastreio de objetos pela API SRO-Rastro v1 da CWS, em lotes de até 50 códigos.
 *
 * O adaptador de 02/09/2026 chamava `/sro/v1/objetos` (o caminho é `/srorastro/v1/objetos`) e lia
 * `dtCriacao` (o campo é `dtHrCriado`). Nunca rodou com credencial, então nunca falhou à vista.
 *
 * O STATUS SAI DO CÓDIGO DO EVENTO, NÃO DA FRASE. A descrição ("Objeto entregue ao destinatário")
 * muda de redação, e "entregue" aparece também em "não entregue". O par código/tipo do SRO é
 * estável: PO é postagem, OEC é saída para entrega, BDE/BDI/BDR tipo 01 é entrega, FC 82 é a
 * etiqueta da pré-postagem esperando o remetente. A frase só decide quando o código é desconhecido.
 *
 * Objeto fora do contrato vem com `mensagem` ("SRO-009: Objeto não pertence ao contrato") e sem
 * eventos — vira `nao_encontrado` com a mensagem dos Correios, para a equipe saber o porquê.
 */

import type { EventoRastreio, RastreioObjetoResult, StatusRastreioCorreios } from '../types'
import { chamarCws } from './cliente'

const LOTE_MAXIMO = 50

interface UnidadeSro {
  tipo?: string
  nome?: string
  endereco?: { cidade?: string; uf?: string }
}

interface EventoSro {
  codigo?: string
  tipo?: string
  dtHrCriado?: string
  descricao?: string
  detalhe?: string
  unidade?: UnidadeSro
  unidadeDestino?: UnidadeSro
}

interface ObjetoSro {
  codObjeto: string
  mensagem?: string
  eventos?: EventoSro[]
}

/** Status pela descrição — só para código de evento que o mapa abaixo não conhece. */
export function statusPelaDescricao(descricao: string): StatusRastreioCorreios {
  const d = descricao.toLowerCase()
  if (d.includes('não entregue') || d.includes('nao entregue')) return 'em_transito'
  if (d.includes('devolvido') || d.includes('devolução')) return 'devolvido'
  if (d.includes('entregue')) return 'entregue'
  if (d.includes('saiu para entrega')) return 'saiu_para_entrega'
  if (d.includes('aguardando retirada') || d.includes('disponível para retirada')) return 'aguardando_retirada'
  if (d.includes('extraviado') || d.includes('roubo') || d.includes('sinistro')) return 'extraviado'
  if (d.includes('aguardando postagem') || d.includes('etiqueta emitida')) return 'aguardando_postagem'
  if (d.includes('postado')) return 'postado'
  return 'em_transito'
}

/** O status de um evento do SRO, pelo par código/tipo. */
export function statusDoEvento(evento: Pick<EventoSro, 'codigo' | 'tipo' | 'descricao'>): StatusRastreioCorreios {
  const codigo = (evento.codigo ?? '').toUpperCase()
  const tipo = (evento.tipo ?? '').padStart(2, '0')
  const descricao = evento.descricao ?? ''

  if (codigo === 'FC') {
    if (tipo === '84') return 'cancelado'
    if (tipo === '82') return 'aguardando_postagem'
  }
  if (codigo === 'PO') return 'postado'
  if (codigo === 'OEC') return 'saiu_para_entrega'
  if (codigo === 'LDI' || codigo === 'LDE') return 'aguardando_retirada'
  if (codigo === 'BDE' || codigo === 'BDI' || codigo === 'BDR') {
    if (tipo === '01') return 'entregue'
    if (tipo === '23') return 'devolvido'
    return statusPelaDescricao(descricao)
  }
  if (codigo === 'RO' || codigo === 'DO' || codigo === 'TRI' || codigo === 'PAR') return 'em_transito'
  return statusPelaDescricao(descricao)
}

/** "2026-10-22T12:37:08" chega sem fuso e é hora de Brasília. */
function instante(dtHrCriado: string | undefined): number {
  if (!dtHrCriado) return Date.now()
  const iso = /[zZ]|[+-]\d{2}:?\d{2}$/.test(dtHrCriado) ? dtHrCriado : `${dtHrCriado}-03:00`
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : Date.now()
}

function nomeDaUnidade(u: UnidadeSro | undefined): string {
  return [u?.tipo, u?.nome].filter(Boolean).join(' ').trim() || 'Correios'
}

/** Converte um objeto do SRO no formato da plataforma. Exportado para os testes. */
export function converterObjeto(obj: ObjetoSro, agora: number = Date.now()): RastreioObjetoResult {
  const codigo = obj.codObjeto.toUpperCase()
  const brutos = obj.eventos ?? []
  if (brutos.length === 0) {
    return {
      codigoRastreio: codigo,
      statusAtual: 'nao_encontrado',
      etapaDescricao: obj.mensagem ?? 'Objeto ainda sem eventos nos Correios',
      dataUltimaAtualizacao: agora,
      eventos: [],
      entregue: false,
      ...(obj.mensagem ? { erro: obj.mensagem } : {}),
    }
  }

  const eventos: EventoRastreio[] = brutos
    .map((e) => ({
      dataHora: instante(e.dtHrCriado),
      status: statusDoEvento(e),
      descricao: [e.descricao, e.detalhe].filter(Boolean).join(' — '),
      unidadeLocal: nomeDaUnidade(e.unidade),
      cidade: e.unidade?.endereco?.cidade ?? '',
      uf: e.unidade?.endereco?.uf ?? '',
      ...(e.unidadeDestino
        ? {
            destino: {
              unidade: nomeDaUnidade(e.unidadeDestino),
              cidade: e.unidadeDestino.endereco?.cidade ?? '',
              uf: e.unidadeDestino.endereco?.uf ?? '',
            },
          }
        : {}),
    }))
    // O SRO devolve o mais recente primeiro; ordenar garante isso mesmo se a ordem mudar.
    .sort((a, b) => b.dataHora - a.dataHora)

  const ultimo = eventos[0]
  return {
    codigoRastreio: codigo,
    statusAtual: ultimo.status,
    etapaDescricao: ultimo.descricao,
    dataUltimaAtualizacao: ultimo.dataHora,
    eventos,
    entregue: eventos.some((e) => e.status === 'entregue'),
  }
}

/**
 * Rastreia uma lista de códigos, em lotes de 50. Lança `ErroCorreios` se um lote falhar inteiro —
 * quem chama (o job) decide se grava o resto; um código fora do contrato NÃO derruba o lote.
 */
export async function rastrearObjetos(codigos: readonly string[]): Promise<Record<string, RastreioObjetoResult>> {
  const unicos = [...new Set(codigos.map((c) => c.trim().toUpperCase()).filter(Boolean))]
  const saida: Record<string, RastreioObjetoResult> = {}
  for (let i = 0; i < unicos.length; i += LOTE_MAXIMO) {
    const lote = unicos.slice(i, i + LOTE_MAXIMO)
    const r = await chamarCws<{ objetos?: ObjetoSro[] }>('/srorastro/v1/objetos', {
      query: { codigosObjetos: lote, resultado: 'T' },
    })
    for (const obj of r?.objetos ?? []) saida[obj.codObjeto.toUpperCase()] = converterObjeto(obj)
  }
  return saida
}
