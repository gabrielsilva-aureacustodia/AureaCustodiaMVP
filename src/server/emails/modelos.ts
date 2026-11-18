/**
 * Os textos dos e-mails — UMA função pura por tipo: entram os fatos, sai `{ assunto, texto }`.
 *
 * REGRAS DE ESCRITA (do aceite da frente C)
 *  - Português, curto, frases diretas. O cliente abre o e-mail para saber UMA coisa: o que aconteceu.
 *  - Marca "Real Olímpico" (masculino). A razão social só aparece onde há contrato ou nota; aqui não há.
 *  - Sem as palavras que o jurídico proibiu (token, NFT, cripto, ativo digital, investimento, rentabilidade) —
 *    uma varredura nos textos montados confere isso na suíte (modelos.test.ts).
 *  - Nada sensível: a chave Pix e o e-mail chegam aqui já mascarados (eventos.ts / mascara.ts), e nenhum link
 *    carrega token ou dado do cliente — só o endereço da tela.
 *  - Dinheiro por `brl()` (centavos inteiros), datas no fuso de Brasília: o servidor roda em UTC, e uma venda
 *    das 22h de terça não pode sair datada de quarta.
 *
 * Os avisos que o cliente pode desligar levam, no fim, o caminho para desligar. Os que saem sempre não: não
 * adianta oferecer o que não se pode escolher.
 */

import { brl } from '@/domain/money'

import { CATALOGO } from './catalogo'
import type { DadosPorTipo, EmailMontado, TipoDeEmail } from './tipos'

/** Endereço do site, sem a barra final. Em produção: https://realolimpico.com.br. */
function base(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
}

function dataHora(ts: number): string {
  const d = new Date(ts)
  const opcoes = { timeZone: 'America/Sao_Paulo' } as const
  const data = d.toLocaleDateString('pt-BR', opcoes)
  const hora = d.toLocaleTimeString('pt-BR', { ...opcoes, hour: '2-digit', minute: '2-digit' })
  return `${data} às ${hora}`
}

function competenciaBR(c: string): string {
  const [ano, mes] = c.split('-')
  return mes && ano ? `${mes}/${ano}` : c
}

function moedas(n: number): string {
  return n === 1 ? '1 moeda' : `${n} moedas`
}

const FORMA: Record<'saldo' | 'pix' | 'cartao', string> = {
  saldo: 'saldo da conta',
  pix: 'Pix',
  cartao: 'cartão',
}

function saudacao(nome: string | null): string {
  return nome ? `Olá, ${nome}.` : 'Olá.'
}

/** Moldura única: saudação, corpo, assinatura e (só nos avisos opcionais) o caminho para ajustar a preferência. */
function moldura(tipo: TipoDeEmail, nome: string | null, linhas: readonly string[]): string {
  const partes = [saudacao(nome), '', ...linhas, '', 'Real Olímpico']
  if (!CATALOGO[tipo].sempre) {
    partes.push('', `Para escolher quais avisos receber: ${base()}/conta/configuracoes`)
  }
  return partes.join('\n')
}

const MODELOS: { [K in TipoDeEmail]: (d: DadosPorTipo[K]) => EmailMontado } = {
  compra: (d) => ({
    assunto: `Compra concluída: ${moedas(d.quantidade)}`,
    texto: moldura('compra', d.nome, [
      'Sua compra foi concluída.',
      '',
      `Moeda: ${d.tipoMoeda} (${d.quantidade} ${d.quantidade === 1 ? 'unidade' : 'unidades'})`,
      `Valor das moedas: ${brl(d.valorMoedasCents)}`,
      `Comissão do Real Olímpico: ${brl(d.comissaoCents)}`,
      ...(d.custodiaCents > 0 ? [`Custódia do primeiro mês: ${brl(d.custodiaCents)}`] : []),
      `Total pago: ${brl(d.totalCents)}`,
      '',
      `A compra foi registrada em ${dataHora(d.data)}. Veja o extrato: ${base()}/conta/extrato`,
    ]),
  }),

  venda: (d) => ({
    assunto: `Venda concluída: ${moedas(d.quantidade)}`,
    texto: moldura('venda', d.nome, [
      'Sua venda foi concluída.',
      '',
      `Moeda: ${d.tipoMoeda} (${d.quantidade} ${d.quantidade === 1 ? 'unidade' : 'unidades'})`,
      `Valor da venda: ${brl(d.valorCents)}`,
      `Comissão do Real Olímpico: ${brl(d.comissaoCents)}`,
      `Você recebeu: ${brl(d.liquidoCents)}`,
      '',
      `O valor já está no seu saldo. Veja o extrato: ${base()}/conta/extrato`,
    ]),
  }),

  deposito: (d) => ({
    assunto: `Depósito confirmado: ${brl(d.valorCents)}`,
    texto: moldura('deposito', d.nome, [
      `Recebemos o seu depósito de ${brl(d.valorCents)}${d.metodo === 'pix' ? ' por Pix' : d.metodo === 'cartao' ? ' no cartão' : ''}, confirmado em ${dataHora(d.data)}.`,
      '',
      `O valor já está no seu saldo. Veja o extrato: ${base()}/conta/extrato`,
    ]),
  }),

  envio_postado: (d) => ({
    assunto: `Seu envio ${d.protocolo} foi postado`,
    texto: moldura('envio_postado', d.nome, [
      `Os Correios registraram a postagem do envio ${d.protocolo} (${moedas(d.quantidade)}, ${d.tipoMoeda}).`,
      ...(d.codigoRastreio ? [`Código de rastreio: ${d.codigoRastreio}`] : []),
      '',
      `Quando as moedas chegarem à custódia, avisamos de novo. Acompanhe em: ${base()}/envios`,
    ]),
  }),

  envio_recebido: (d) => ({
    assunto: `Seu envio ${d.protocolo} chegou à custódia`,
    texto: moldura('envio_recebido', d.nome, [
      `O envio ${d.protocolo} (${moedas(d.quantidade)}, ${d.tipoMoeda}) chegou à custódia do Real Olímpico.`,
      '',
      `Agora ele entra na fila de análise física. Avisamos o resultado de cada moeda. Acompanhe em: ${base()}/envios`,
    ]),
  }),

  moeda_aceita: (d) => ({
    assunto: d.quantidade === 1 ? 'Sua moeda foi aprovada' : `${d.quantidade} moedas aprovadas`,
    texto: moldura('moeda_aceita', d.nome, [
      `A análise física aprovou ${moedas(d.quantidade)} do envio ${d.protocoloEnvio} (${d.tipoMoeda}).`,
      ...(d.codigos.length > 0 ? [`Código${d.codigos.length === 1 ? '' : 's'}: ${d.codigos.join(', ')}`] : []),
      '',
      'Elas já estão guardadas na custódia, com recibo emitido.',
      ...(d.primeiroMesPago ? ['O primeiro mês de custódia já está pago.'] : []),
      '',
      `Veja os recibos: ${base()}/recibos`,
    ]),
  }),

  moeda_recusada: (d) => ({
    assunto: d.quantidade === 1 ? 'Uma moeda não foi aprovada' : `${d.quantidade} moedas não foram aprovadas`,
    texto: moldura('moeda_recusada', d.nome, [
      `A análise física não aprovou ${moedas(d.quantidade)} do envio ${d.protocoloEnvio} (${d.tipoMoeda}).`,
      ...(d.motivos.length > 0 ? [`Motivo: ${d.motivos.join('; ')}`] : []),
      '',
      `Se tiver dúvida, fale com o nosso atendimento: ${base()}/atendimento`,
    ]),
  }),

  fatura_paga: (d) => ({
    assunto: `Pagamento da custódia confirmado: ${brl(d.valorCents)}`,
    texto: moldura('fatura_paga', d.nome, [
      `Recebemos o pagamento da custódia de ${moedas(d.quantidadeMoedas)}, referente a ${competenciaBR(d.competencia)}.`,
      '',
      `Valor: ${brl(d.valorCents)}${d.forma ? ` (${FORMA[d.forma]})` : ''}`,
      `Pago em: ${dataHora(d.data)}`,
      '',
      `Veja as faturas: ${base()}/conta/faturas`,
    ]),
  }),

  retirada_postada: (d) => ({
    assunto: `Sua retirada ${d.retiradaId} foi postada`,
    texto: moldura('retirada_postada', d.nome, [
      `A moeda ${d.coinId} saiu da custódia e foi postada nos Correios, no endereço que você informou.`,
      ...(d.codigoRastreio ? [`Código de rastreio: ${d.codigoRastreio}`] : []),
      '',
      `Acompanhe em: ${base()}/retirada`,
    ]),
  }),

  seguranca_senha: (d) => ({
    assunto: 'A senha da sua conta foi alterada',
    texto: moldura('seguranca_senha', d.nome, [
      `A senha da sua conta no Real Olímpico foi alterada em ${dataHora(d.quando)}.`,
      '',
      'Se foi você, não precisa fazer nada.',
      `Se não foi, fale agora com o nosso atendimento: ${base()}/atendimento`,
    ]),
  }),

  seguranca_email: (d) => ({
    assunto: 'O e-mail da sua conta foi alterado',
    texto: moldura('seguranca_email', d.nome, [
      `O e-mail da sua conta no Real Olímpico foi alterado em ${dataHora(d.quando)}.`,
      'Você está recebendo este aviso no endereço anterior.',
      '',
      'Se foi você, não precisa fazer nada.',
      `Se não foi, fale agora com o nosso atendimento: ${base()}/atendimento`,
    ]),
  }),

  seguranca_pix: (d) => ({
    assunto: 'A chave Pix da sua conta foi alterada',
    texto: moldura('seguranca_pix', d.nome, [
      `A chave Pix cadastrada na sua conta foi alterada em ${dataHora(d.quando)}.`,
      `Nova chave: ${d.chaveMascarada}`,
      '',
      'Se foi você, não precisa fazer nada.',
      `Se não foi, fale agora com o nosso atendimento: ${base()}/atendimento`,
    ]),
  }),
}

/**
 * Monta o e-mail de um evento. `dados` chega do banco como JSON solto, e o tipo diz qual modelo vale — o
 * chamador (despachar.ts) já trata exceção, então um registro malformado vira falha registrada, não queda.
 */
export function montarEmail<K extends TipoDeEmail>(tipo: K, dados: DadosPorTipo[K]): EmailMontado {
  const modelo = MODELOS[tipo] as ((d: DadosPorTipo[K]) => EmailMontado) | undefined
  if (!modelo) throw new Error(`tipo de e-mail desconhecido: ${String(tipo)}`)
  return modelo(dados)
}
