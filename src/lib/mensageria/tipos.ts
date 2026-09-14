/**
 * O contrato entre o atendimento do painel e o provedor de WhatsApp (plano do Admin,
 * seção 2.3).
 *
 * A TELA NÃO CONHECE PROVEDOR. A caixa de conversas, o webhook e o serviço do CS falam
 * com `ProvedorMensageria`; quem sabe o formato da Evolution API é evolution.ts, e quem
 * vier depois (a API oficial da Meta, a Z-API) entra como outro arquivo com a mesma
 * forma, sem tocar em tela nenhuma.
 *
 * Só tipos: importável por teste e por qualquer módulo de servidor.
 */

/** Estado de entrega que o provedor informa depois do envio. */
export type StatusDeEntrega = 'enviando' | 'enviada' | 'entregue' | 'lida' | 'falhou'

/**
 * O que o webhook traduz do formato do provedor. `telefone` já chega em E.164 canônico
 * (src/domain/admin/telefone.ts) — o serviço nunca vê o identificador cru do WhatsApp.
 */
export type EventoMensageria =
  | {
      tipo: 'mensagem'
      idNoProvedor: string
      /** 'saida' = escrita no próprio aparelho do atendimento, fora do painel. */
      direcao: 'entrada' | 'saida'
      telefone: string
      nomeDoContato: string | null
      corpo: string
      midiaUrl: string | null
      midiaTipo: string | null
      /** Relógio do provedor, em ms; `null` quando não veio — o serviço usa o do servidor. */
      em: number | null
    }
  | { tipo: 'status'; idNoProvedor: string; status: StatusDeEntrega }

export interface ResultadoEnvio {
  idNoProvedor: string
}

export interface EstadoConexao {
  conectado: boolean
  descricao: string
}

export interface ProvedorMensageria {
  /** 'evolution', 'registro-local' — vai para `cs_canais.provedor`. */
  nome: string
  /** A linha dentro do provedor (a instância da Evolution) — vai para `cs_canais.identificador`. */
  identificador: string
  /**
   * A mensagem sai de verdade? O registro local responde `false`, e o serviço grava a
   * mensagem como 'registrada' em vez de 'enviada'.
   */
  entregaDeVerdade: boolean
  /** Nomes das variáveis de ambiente que faltam para o provedor funcionar inteiro. */
  pendencias: readonly string[]
  /** `para` em E.164 canônico ('+5511999998888'). Lança `ErroDoProvedor` se recusado. */
  enviarTexto(para: string, texto: string): Promise<ResultadoEnvio>
  /** A mídia vai por endereço público: o provedor baixa o arquivo de lá. */
  enviarMidia(para: string, url: string, tipo: string, legenda?: string): Promise<ResultadoEnvio>
  /** O webhook veio mesmo do provedor? Sem segredo configurado, a resposta é não. */
  conferirAssinatura(cabecalhos: Headers, corpo: string): boolean
  /** Corpo do webhook → eventos. O que não é mensagem de uma pessoa (grupo, reação) some. */
  normalizarEvento(corpo: unknown): EventoMensageria[]
  /** Opcional: o WhatsApp está conectado agora? Para o quadro de canal da tela. */
  estadoDaConexao?(): Promise<EstadoConexao>
}

/** Recusa ou falha do provedor, com a mensagem que vai para o atendente. */
export class ErroDoProvedor extends Error {
  readonly status: number | null
  constructor(mensagem: string, status: number | null = null) {
    super(mensagem)
    this.name = 'ErroDoProvedor'
    this.status = status
  }
}
