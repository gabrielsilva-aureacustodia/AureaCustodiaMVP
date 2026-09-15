'use server'

/**
 * Server Actions da bancada web e da auditoria de moedas (plano do Admin, 3.4, 3.5 e 3.7).
 *
 * A REGRA DESTA PASTA: toda ação confere a permissão POR CONTA PRÓPRIA, antes de qualquer outra
 * coisa.
 *  - atualizar a fila e o quadro de caixas: `bancada.ver`;
 *  - abrir e fechar a análise, assinar o vídeo, cadastrar caixa: `bancada.analisar`;
 *  - verificar a corrente e assistir ao vídeo de uma análise: `bancada.auditoria`.
 *
 * O `operador` da análise é o e-mail do membro que a sessão identifica — na web não existe campo
 * para digitar outro. A análise em si é o serviço da estação (src/server/estacao/analise.ts),
 * chamado por src/server/admin/bancada.ts.
 */

import type { ChavePermissao, MembroAdmin } from '@/domain/admin/permissoes'
import type { EntradaCaixa, OcupacaoDaCaixa } from '@/domain/admin/caixas'
import { ocupacaoDasCaixas, ocupantesDoCofre } from '@/domain/admin/caixas'
import type { ItemDaFilaBancada, MoedaDigitada } from '@/domain/admin/bancada'
import type { VerificacaoDoAcervo } from '@/domain/admin/moedas'
import type { ActionResult } from '@/domain/types'
import { permissaoParaAcao } from '@/server/admin/acesso'
import { registrarAcaoAdmin } from '@/server/admin/auditar'
import { assinarVideoPelaBancadaWeb, abrirPelaBancadaWeb, fecharPelaBancadaWeb, salvarCaixa } from '@/server/admin/bancada'
import type { ResultadoAdmin } from '@/server/admin/contabil'
import { verificarCorrenteDoAcervo } from '@/server/admin/moedas'
import { caixasCadastradas, ehTabelaAusente, executorOuNulo, portaDaBancadaDoServidor, portaDeVideoDoServidor } from '@/server/admin/portas'
import { urlDeLeituraDoVideo, VideoNaoConfigurado } from '@/server/admin/video'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import type { SaidaFechamento } from '@/server/estacao/analise'
import { filaDeAnalise } from '@/server/estacao/analise'
import { repositorioRetiradas } from '@/server/shipping/retiradas'
import { getState } from '@/server/state'

const FALHA = 'Falha ao salvar dados. Tente novamente.'
const SEM_TABELA_CAIXAS = 'O banco ainda não tem a tabela de caixas (migration 025). Rode npm run db:migrate.'

function paraAction<T>(r: ResultadoAdmin<T>): ActionResult<T> {
  return r.ok ? { ok: true, message: r.mensagem, data: r.dados } : { ok: false, error: r.erro }
}

async function comPermissao<T>(chave: ChavePermissao, acao: (membro: MembroAdmin) => Promise<ResultadoAdmin<T>>, falha = FALHA): Promise<ActionResult<T>> {
  const acesso = await permissaoParaAcao(chave)
  if (!acesso.ok) return { ok: false, error: acesso.erro }
  try {
    return paraAction(await acao(acesso.membro))
  } catch (err) {
    if (ehTabelaAusente(err)) return { ok: false, error: SEM_TABELA_CAIXAS }
    console.error(`[admin] falha na ação da bancada que pede ${chave}:`, err)
    return { ok: false, error: falha }
  }
}

function texto(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

/* ---------- a bancada ---------- */

export interface SituacaoDaBancada {
  fila: ItemDaFilaBancada[]
  caixas: OcupacaoDaCaixa[]
  caixasCadastradas: boolean
}

export async function atualizarBancadaNoPainel(): Promise<ActionResult<SituacaoDaBancada>> {
  return comPermissao('bancada.ver', async () => {
    const [fila, state, retiradas, caixas] = await Promise.all([
      filaDeAnalise(),
      getState(),
      repositorioRetiradas()
        .listarTodas()
        .catch(() => []),
      caixasCadastradas().catch(() => null),
    ])
    return {
      ok: true,
      mensagem: '',
      dados: { fila, caixas: ocupacaoDasCaixas(caixas ?? [], ocupantesDoCofre({ ...state, retiradas })), caixasCadastradas: caixas !== null },
    }
  })
}

export async function abrirAnaliseNoPainel(protocolo: string): Promise<ActionResult> {
  return comPermissao('bancada.analisar', (membro) => abrirPelaBancadaWeb(portaDaBancadaDoServidor(), membro.email, texto(protocolo)))
}

export async function assinarVideoNoPainel(protocolo: string, extensao: string): Promise<ActionResult<{ url: string; caminho: string }>> {
  return comPermissao(
    'bancada.analisar',
    async (membro) => {
      try {
        return await assinarVideoPelaBancadaWeb(portaDaBancadaDoServidor(), portaDeVideoDoServidor(), membro.email, texto(protocolo), texto(extensao))
      } catch (err) {
        // Balde ainda não criado, chave errada, Storage fora: o vídeo não sobe e a análise segue.
        console.error('[admin] falha ao assinar o vídeo da bancada web:', err)
        return { ok: false, erro: 'O armazenamento não autorizou o envio do vídeo agora. A análise pode ser fechada sem ele.' }
      }
    },
  )
}

export async function fecharAnaliseNoPainel(protocolo: string, moedas: MoedaDigitada[], caminhoVideo: string | null): Promise<ActionResult<SaidaFechamento>> {
  return comPermissao('bancada.analisar', (membro) =>
    fecharPelaBancadaWeb(portaDaBancadaDoServidor(), membro.email, {
      protocolo: texto(protocolo),
      moedas: Array.isArray(moedas) ? moedas : [],
      caminhoVideo: typeof caminhoVideo === 'string' ? caminhoVideo : null,
    }),
  )
}

export async function salvarCaixaNoPainel(entrada: EntradaCaixa, criando: boolean): Promise<ActionResult> {
  return comPermissao('bancada.analisar', (membro) =>
    salvarCaixa(
      executorOuNulo(),
      membro.email,
      entrada ?? { codigo: '', rotulo: '', local: '', capacidade: null, ativa: true },
      criando === true,
    ),
  )
}

/* ---------- a auditoria de moedas ---------- */

export async function verificarCorrenteNoPainel(): Promise<ActionResult<VerificacaoDoAcervo>> {
  return comPermissao('bancada.auditoria', async (membro) => {
    const v = await verificarCorrenteDoAcervo()
    const integro = v.analises.integra && (v.ledger?.integra ?? true) && v.recibos.divergentes.length === 0
    if (bancoConfigurado()) {
      await executarNoBanco((tx) =>
        registrarAcaoAdmin(tx, {
          ator: membro.email,
          area: 'moedas',
          verbo: 'verificar',
          entidade: 'corrente',
          detalhes: {
            integro,
            analises: v.analises,
            ledger: v.ledger,
            recibosDivergentes: v.recibos.divergentes.length,
          },
        }),
      )
    }
    return { ok: true, mensagem: integro ? 'As correntes conferem.' : 'A conferência encontrou divergência — veja o resultado.', dados: v }
  })
}

export async function urlDoVideoNoPainel(caminho: string): Promise<ActionResult<{ url: string }>> {
  return comPermissao('bancada.auditoria', async (membro) => {
    const c = texto(caminho).trim()
    // O caminho vem da própria análise gravada; mesmo assim, nada de subir diretório.
    if (!c || c.includes('..') || c.length > 300) return { ok: false, erro: 'Caminho de vídeo inválido.' }
    try {
      const url = await urlDeLeituraDoVideo(c)
      if (bancoConfigurado()) {
        await executarNoBanco((tx) => registrarAcaoAdmin(tx, { ator: membro.email, area: 'moedas', verbo: 'ver_video', entidade: 'video', entidadeId: c }))
      }
      return { ok: true, mensagem: '', dados: { url } }
    } catch (err) {
      if (err instanceof VideoNaoConfigurado) return { ok: false, erro: `Para assistir, falta ${err.faltando.join(' e ')} no ambiente.` }
      console.error('[admin] falha ao assinar a leitura do vídeo:', err)
      return { ok: false, erro: 'O armazenamento não devolveu o vídeo. Ele pode não ter subido — a estação guarda uma cópia no notebook.' }
    }
  })
}
