/**
 * A bancada de análise no navegador, do lado do servidor (frente C, C3 — plano do Admin, 3.4).
 *
 * O PAINEL NÃO REIMPLEMENTA A ANÁLISE. Abrir o procedimento e fechá-lo são `abrirAnalise()` e
 * `fecharAnalise()` de src/server/estacao/analise.ts — as mesmas funções que a estação Electron
 * chama pela rota. É ali que a moeda nasce, o hash é encadeado com a fórmula congelada dos quinze
 * campos (estacao/CONTRATO.md) e, desde a B2, o plano de custódia é alimentado. Este arquivo:
 *
 *  1. valida o que o operador digitou com as regras da rota (src/domain/admin/bancada.ts);
 *  2. troca o código de caixa digitado pelo cadastrado e recusa posição já ocupada (025);
 *  3. passa o e-mail do membro como `operador` — na web não há campo livre para isso;
 *  4. grava `admin.bancada.<verbo>` na trilha.
 *
 * A LINHA DA TRILHA VEM DEPOIS DA ANÁLISE, EM OUTRA TRANSAÇÃO. O serviço da análise abre a própria
 * transação (`mutateState`) e não recebe executor de fora — ele é da frente B e o painel só o
 * chama. Se o processo cair entre os dois passos, a análise fica gravada sem a linha do painel;
 * ela continua identificada, porque o `operador` entra no hash e a própria mutação já grava a
 * trilha derivada do estado com o e-mail da sessão.
 *
 * Tudo por portas: os testes trocam a análise, o estado e o banco por dublês.
 */

import {
  codigoDeCaixaParaGravar,
  ocupantesDoCofre,
  posicoesJaOcupadas,
  validarCaixa,
  type CaixaCadastrada,
  type EntradaCaixa,
} from '@/domain/admin/caixas'
import { ETAPAS_DA_BANCADA, nomeDoArquivoDeVideo, validarMoedasDaBancada, type MoedaDigitada } from '@/domain/admin/bancada'
import type { AppState, Retirada } from '@/domain/types'
import { atualizarCaixa, buscarCaixa, inserirCaixa, listarCaixas } from '@/server/db/repositories/caixas'
import type { Executor } from '@/server/db/sql'
import type { EntradaFechamento, ResultadoEstacao, SaidaFechamento } from '@/server/estacao/analise'

import { registrarAcaoAdmin, type AcaoAdmin } from './auditar'
import type { ResultadoAdmin } from './contabil'

export interface PortaDaBancada {
  abrir(protocolo: string): Promise<ResultadoEstacao>
  fechar(entrada: EntradaFechamento): Promise<ResultadoEstacao<SaidaFechamento>>
  estado(): Promise<AppState>
  retiradas(): Promise<Retirada[]>
  /** `null` quando não há banco ou a tabela de caixas ainda não existe. */
  caixas(): Promise<CaixaCadastrada[] | null>
  /** Grava a linha do painel. Sem banco, não faz nada — não há trilha para gravar. */
  auditar(linha: AcaoAdmin): Promise<void>
}

export interface PortaDeVideo {
  configurado(): boolean
  /** O que falta no ambiente para assinar, em nomes de variável. */
  faltando(): string[]
  assinar(protocolo: string, arquivo: string): Promise<{ url: string; caminho: string }>
}

export const SEM_BANCO_CAIXAS = 'Sem banco configurado (POSTGRES_URL): o cadastro de caixas grava na tabela aurea.caixas.'

function envioNaBancada(state: AppState, protocolo: string): { ok: true; envio: AppState['envios'][number] } | { ok: false; erro: string } {
  const envio = state.envios.find((e) => e.protocolo === protocolo)
  if (!envio) return { ok: false, erro: `Envio ${protocolo} não encontrado. Atualize a fila.` }
  if (envio.etapaAtual === 'Recibo emitido') return { ok: false, erro: `O envio ${protocolo} já teve o recibo emitido.` }
  if (!(ETAPAS_DA_BANCADA as readonly string[]).includes(envio.etapaAtual)) {
    return { ok: false, erro: `O envio ${protocolo} está em "${envio.etapaAtual}" e não pode ser analisado agora.` }
  }
  return { ok: true, envio }
}

async function auditarSemDerrubar(porta: PortaDaBancada, linha: AcaoAdmin): Promise<void> {
  try {
    await porta.auditar(linha)
  } catch (err) {
    // A análise já foi gravada pelo serviço da estação. Falhar aqui não pode virar "não salvou"
    // na tela do operador, com a moeda já recapsulada na mesa.
    console.error(`[admin] a análise foi gravada, mas a linha ${linha.area}.${linha.verbo} da trilha falhou:`, err)
  }
}

/** Move o envio para "Em análise física". Idempotente, como na estação. */
export async function abrirPelaBancadaWeb(porta: PortaDaBancada, ator: string, protocolo: string): Promise<ResultadoAdmin> {
  const p = String(protocolo ?? '').trim()
  if (!p) return { ok: false, erro: 'Escolha um envio da fila.' }
  const r = await porta.abrir(p)
  if (!r.ok) return { ok: false, erro: r.erro }
  await auditarSemDerrubar(porta, { ator, area: 'bancada', verbo: 'abrir', entidade: 'envio', entidadeId: p })
  return { ok: true, mensagem: `Envio ${p} em análise física.` }
}

export interface EntradaFechamentoWeb {
  protocolo: string
  moedas: MoedaDigitada[]
  caminhoVideo: string | null
}

/**
 * Fecha o procedimento pela web: valida, confere posição, chama `fecharAnalise()` com o membro
 * como operador e grava a trilha.
 */
export async function fecharPelaBancadaWeb(porta: PortaDaBancada, ator: string, entrada: EntradaFechamentoWeb): Promise<ResultadoAdmin<SaidaFechamento>> {
  const protocolo = String(entrada?.protocolo ?? '').trim()
  if (!protocolo) return { ok: false, erro: 'Escolha um envio da fila.' }

  const [state, retiradas, caixas] = await Promise.all([porta.estado(), porta.retiradas(), porta.caixas()])
  const alvo = envioNaBancada(state, protocolo)
  if (!alvo.ok) return alvo

  const validacao = validarMoedasDaBancada(entrada.moedas, alvo.envio.quantidade, entrada.caminhoVideo)
  if (!validacao.ok) return { ok: false, erro: validacao.erros.join(' ') }

  const vereditos = validacao.vereditos.map((v) => ({ ...v, caixa: codigoDeCaixaParaGravar(v.caixa, caixas ?? []) }))
  const ocupadas = posicoesJaOcupadas(vereditos, ocupantesDoCofre({ ...state, retiradas }))
  if (ocupadas.length > 0) return { ok: false, erro: ocupadas.join(' ') }

  const r = await porta.fechar({ protocolo, operador: ator, moedas: vereditos })
  if (!r.ok) return { ok: false, erro: r.erro }

  const saida = r.dados
  await auditarSemDerrubar(porta, {
    ator,
    area: 'bancada',
    verbo: 'analisar',
    entidade: 'envio',
    entidadeId: protocolo,
    usuariosAfetados: [alvo.envio.userEmail],
    detalhes: {
      origem: 'bancada_web',
      aprovadas: saida.aprovadas,
      recusadas: saida.recusadas,
      analises: saida.analises,
      caminhoVideo: vereditos[0]?.caminhoVideo ?? null,
    },
  })
  return {
    ok: true,
    mensagem: `Pronto. ${saida.aprovadas} aprovada(s), ${saida.recusadas} recusada(s). Recibos emitidos.`,
    dados: saida,
  }
}

/**
 * A URL assinada para o vídeo subir direto ao Supabase Storage — a mesma de
 * `/api/estacao/video/url`, sem a chave da estação, que não pode ir ao navegador. O vídeo nunca
 * passa pela aplicação: a Vercel recusa corpo acima de 4,5 MB.
 */
export async function assinarVideoPelaBancadaWeb(
  porta: PortaDaBancada,
  video: PortaDeVideo,
  ator: string,
  protocolo: string,
  extensao: string,
): Promise<ResultadoAdmin<{ url: string; caminho: string }>> {
  const p = String(protocolo ?? '').trim()
  if (!p) return { ok: false, erro: 'Escolha um envio da fila.' }
  if (!video.configurado()) {
    return { ok: false, erro: `O vídeo não sobe sem ${video.faltando().join(' e ')} no ambiente. A análise pode ser fechada sem vídeo.` }
  }
  const state = await porta.estado()
  const alvo = envioNaBancada(state, p)
  if (!alvo.ok) return alvo
  const assinada = await video.assinar(p, nomeDoArquivoDeVideo(p, alvo.envio.quantidade, extensao))
  await auditarSemDerrubar(porta, { ator, area: 'bancada', verbo: 'assinar_video', entidade: 'envio', entidadeId: p, detalhes: { caminho: assinada.caminho } })
  return { ok: true, mensagem: 'Envio do vídeo autorizado.', dados: assinada }
}

/** Cria ou edita uma caixa do cofre. A linha da trilha vai na mesma transação. */
export async function salvarCaixa(executar: Executor | null, ator: string, entrada: EntradaCaixa, criando: boolean, agora: number = Date.now()): Promise<ResultadoAdmin> {
  if (!executar) return { ok: false, erro: SEM_BANCO_CAIXAS }
  const v = validarCaixa(entrada)
  if (!v.ok) return { ok: false, erro: v.erro }

  return executar(async (tx) => {
    const todas = await listarCaixas(tx)
    const mesmoCodigo = codigoDeCaixaParaGravar(v.caixa.codigo, todas)
    const existente = mesmoCodigo ? await buscarCaixa(tx, mesmoCodigo) : null

    if (criando) {
      if (existente) return { ok: false, erro: `A caixa ${existente.codigo} já está cadastrada.` }
      await inserirCaixa(tx, v.caixa, agora)
      await registrarAcaoAdmin(tx, { ator, area: 'bancada', verbo: 'caixa', entidade: 'caixa', entidadeId: v.caixa.codigo, detalhes: { criada: v.caixa }, agora })
      return { ok: true, mensagem: `Caixa ${v.caixa.codigo} cadastrada.` }
    }

    if (!existente) return { ok: false, erro: `A caixa ${v.caixa.codigo} não está cadastrada.` }
    // O código não muda na edição: há análise gravada com ele.
    const depois = { ...v.caixa, codigo: existente.codigo }
    await atualizarCaixa(tx, depois)
    const antes = { codigo: existente.codigo, rotulo: existente.rotulo, local: existente.local, capacidade: existente.capacidade, ativa: existente.ativa }
    await registrarAcaoAdmin(tx, { ator, area: 'bancada', verbo: 'caixa', entidade: 'caixa', entidadeId: existente.codigo, detalhes: { antes, depois }, agora })
    return { ok: true, mensagem: `Caixa ${existente.codigo} atualizada.` }
  })
}
