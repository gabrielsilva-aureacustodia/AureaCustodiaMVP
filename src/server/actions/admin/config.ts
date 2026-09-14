'use server'

/**
 * Server Actions da configuração do site (plano do Admin, seção 3.3).
 *
 * A REGRA DESTA PASTA: toda ação confere a permissão POR CONTA PRÓPRIA, antes de qualquer outra
 * coisa.
 *  - taxas, parâmetros operacionais, parâmetros dos Termos, canais de atendimento e "publicar a
 *    versão vigente": `config.taxas`;
 *  - criar e editar tipo de moeda: `config.catalogo`.
 *
 * A gravação, o histórico, a trilha e a publicação do documento contratual moram em
 * src/server/admin/configuracao.ts.
 */

import type { EntradaTipoMoeda } from '@/domain/admin/catalogo'
import { GRUPOS_EDITAVEIS, type GrupoConfig } from '@/domain/admin/configuracao'
import type { ChavePermissao, MembroAdmin } from '@/domain/admin/permissoes'
import type { ActionResult } from '@/domain/types'
import { permissaoParaAcao } from '@/server/admin/acesso'
import { publicarDocumentoVigente, salvarGrupoDeConfiguracao, salvarTipoDeMoeda, SEM_TABELA_CONFIG, type ResumoGravacao } from '@/server/admin/configuracao'
import type { ResultadoAdmin } from '@/server/admin/contabil'
import { ehTabelaAusente, executorOuNulo, portaDePublicacaoDoServidor } from '@/server/admin/portas'

const FALHA = 'Falha ao salvar dados. Tente novamente.'

function paraAction<T>(r: ResultadoAdmin<T>): ActionResult<T> {
  return r.ok ? { ok: true, message: r.mensagem, data: r.dados } : { ok: false, error: r.erro }
}

async function comPermissao<T>(chave: ChavePermissao, acao: (membro: MembroAdmin) => Promise<ResultadoAdmin<T>>): Promise<ActionResult<T>> {
  const acesso = await permissaoParaAcao(chave)
  if (!acesso.ok) return { ok: false, error: acesso.erro }
  try {
    return paraAction(await acao(acesso.membro))
  } catch (err) {
    if (ehTabelaAusente(err)) return { ok: false, error: SEM_TABELA_CONFIG }
    console.error(`[admin] falha na ação de configuração que pede ${chave}:`, err)
    return { ok: false, error: FALHA }
  }
}

export async function salvarConfiguracaoNoPainel(grupo: string, entrada: Record<string, string>): Promise<ActionResult<ResumoGravacao>> {
  return comPermissao('config.taxas', async (membro) => {
    if (!(GRUPOS_EDITAVEIS as readonly string[]).includes(grupo)) return { ok: false, erro: 'Grupo de configuração desconhecido.' }
    const limpa: Record<string, string> = {}
    for (const [k, v] of Object.entries(entrada ?? {})) if (typeof v === 'string') limpa[k] = v
    return salvarGrupoDeConfiguracao(executorOuNulo(), portaDePublicacaoDoServidor(), membro.email, grupo as GrupoConfig, limpa)
  })
}

export async function publicarDocumentoNoPainel(chave: string): Promise<ActionResult<{ versao: string }>> {
  return comPermissao('config.taxas', (membro) => publicarDocumentoVigente(executorOuNulo(), portaDePublicacaoDoServidor(), membro.email, typeof chave === 'string' ? chave : ''))
}

export async function salvarTipoDeMoedaNoPainel(entrada: EntradaTipoMoeda, criando: boolean): Promise<ActionResult> {
  return comPermissao('config.catalogo', (membro) =>
    salvarTipoDeMoeda(
      executorOuNulo(),
      membro.email,
      entrada ?? { chave: '', anoPadrao: '', tiragem: '', categoria: '', negociavel: false, detail: '', ord: '', ativo: true },
      criando === true,
    ),
  )
}
