/**
 * Códigos fiscais de cada nota que a plataforma emite — o espelho das três NFS-e que o contador
 * emitiu em 22/10/2026 (nº 1 custódia, nº 2 comissão de compra, nº 3 comissão de venda).
 *
 * NÃO É CÁLCULO DE IMPOSTO. A regra da casa (src/domain/dre.ts) é que alíquota não nasce no código.
 * Aqui não se decide nada: copia-se, campo a campo, o que o contador já preencheu nas notas que
 * assinou, porque o pedido de nota (DPS) precisa desses valores literais. O ISS nem vai na DPS —
 * a Sefin aplica a alíquota de BH sozinha (regra E0617) —, e o IBS/CBS quem calcula é ela.
 * Mudou o entendimento do contador? Muda esta tabela, e só ela.
 *
 * A fonte de cada linha está em docs/fiscal-contabil/REGRAS_FISCAIS_E_CONTABEIS.md (R3).
 */

/** O que cada nota descreve. Um lado da negociação é um tomador diferente, por isso dois tipos. */
export type ServicoNfse = 'custodia' | 'intermediacao_compra' | 'intermediacao_venda'

export interface CodigosDoServico {
  /** Código de tributação nacional (LC 116 desdobrada), 6 dígitos sem pontos. */
  cTribNac: string
  /** Desdobramento municipal de BH, 3 dígitos. */
  cTribMun: string
  /** NBS, 9 dígitos sem pontos (o XSD pede `[0-9]{9}`). */
  cNBS: string
  /** Indicador de operação do IBS/CBS (local da operação, LC 214 art. 11). */
  cIndOp: string
  /** CST e classificação do IBS/CBS: tributação integral. */
  cst: string
  cClassTrib: string
  /**
   * Tipo de operação. Obrigatório no 10.05 (E0903) e proibido fora dele (E0904). `5` =
   * fornecimento e pagamento concomitantes: a comissão é debitada no instante do casamento.
   * Escolha por pesquisa (23/10/2026), a confirmar com o contador.
   */
  tpOper: string | null
  /** Alíquota de ISS de BH em pontos-base — só para os "tributos aproximados" da Lei 12.741. */
  issBp: number
  /** O texto-base da descrição, no padrão das notas do contador (maiúsculas, sem acento). */
  descricaoBase: string
}

export const CODIGOS_POR_SERVICO: Readonly<Record<ServicoNfse, CodigosDoServico>> = {
  custodia: {
    cTribNac: '110401',
    cTribMun: '001',
    cNBS: '106029000',
    cIndOp: '050101',
    cst: '000',
    cClassTrib: '000001',
    tpOper: null,
    issBp: 500,
    descricaoBase: 'CUSTODIA MENSAL',
  },
  intermediacao_compra: {
    cTribNac: '100501',
    cTribMun: '003',
    cNBS: '102010000',
    cIndOp: '100301',
    cst: '000',
    cClassTrib: '000001',
    tpOper: '5',
    issBp: 300,
    descricaoBase: 'INTERMEDIACAO NA COMPRA DE MOEDA',
  },
  intermediacao_venda: {
    cTribNac: '100501',
    cTribMun: '003',
    cNBS: '102010000',
    cIndOp: '100301',
    cst: '000',
    cClassTrib: '000001',
    tpOper: '5',
    issBp: 300,
    descricaoBase: 'INTERMEDIACAO NA VENDA DE MOEDA',
  },
}

/** Como o painel chama cada serviço. */
export const ROTULO_DO_SERVICO: Readonly<Record<ServicoNfse, string>> = {
  custodia: 'Custódia',
  intermediacao_compra: 'Comissão de compra',
  intermediacao_venda: 'Comissão de venda',
}

/** Os serviços em que a Sefin exige o endereço do tomador (cIndOp 100301: E0187/E0234). */
export function exigeEnderecoDoTomador(servico: ServicoNfse): boolean {
  return CODIGOS_POR_SERVICO[servico].cIndOp === '100301'
}

/** O emitente. A razão social, e não a marca, é o que vai no documento fiscal (CLAUDE.md). */
export const EMISSOR = {
  cnpj: '68071452000106',
  razaoSocial: 'AUREA CUSTODIA LTDA',
  /** Belo Horizonte — município emissor, da prestação e da incidência do ISS. */
  codigoMunicipio: '3106200',
  /** 1 = não optante do Simples Nacional. */
  opSimpNac: '1',
  /** 0 = nenhum regime especial. */
  regEspTrib: '0',
} as const

/**
 * Campos federais iguais em toda nota, como nas do contador: PIS/COFINS cumulativos do Lucro
 * Presumido em apuração própria (CST 01, não retidos) e os tributos aproximados da Lei 12.741.
 */
export const TRIBUTOS_FEDERAIS = {
  cstPisCofins: '01',
  pisBp: 65,
  cofinsBp: 300,
  /** 0 = PIS/COFINS/CSLL não retidos. */
  tpRetPisCofins: '0',
  /** Percentual federal aproximado (Lei 12.741), em pontos-base: 11,33%. */
  totTribFederalBp: 1133,
  totTribEstadualBp: 0,
} as const

/**
 * Uso ou consumo pessoal (LC 214 art. 57) — `0`, não. O tomador é pessoa física, que não toma
 * crédito, e o serviço não é cedido de graça. Escolha por pesquisa (23/10/2026); se o contador
 * enquadrar a custódia na alínea "g" (incluída pela LC 227/2026), vira `1` aqui.
 */
export const INDICADOR_USO_PESSOAL = '0'
