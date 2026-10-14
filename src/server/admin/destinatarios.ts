/**
 * Quem da equipe recebe um aviso que exige uma permissão (14/10/2026).
 *
 * Nasceu com o aviso de saque: o pedido do cliente precisa chegar a quem pode pagá-lo, e "a equipe"
 * não é uma lista — é o papel de cada membro. A regra é a mesma do painel: o `dev` tem todas as
 * permissões, quem entra pelo bootstrap do ambiente é `dev`, e os demais valem pelo papel que a tela de
 * Equipe concedeu. Conta de demonstração (`@testeaurea.com.br`) não é caixa de e-mail e fica de fora.
 */

import { emailsDeBootstrap, normalizarEmail, SLUG_DEV, type ChavePermissao } from '@/domain/admin/permissoes'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'

import { ambienteAtual } from './acesso'
import { carregarEquipe } from './rbac'

const DOMINIO_DE_TESTE = '@testeaurea.com.br'

export async function emailsDaEquipeCom(chave: ChavePermissao): Promise<string[]> {
  const amb = ambienteAtual()
  const bootstrap = emailsDeBootstrap(amb.listaDoAmbiente, amb.contasDoSeed)
  const achados = new Set<string>()

  if (!bancoConfigurado()) {
    for (const e of bootstrap) achados.add(normalizarEmail(e))
  } else {
    try {
      const equipe = await carregarEquipe(executarNoBanco, amb)
      const papelPorSlug = new Map(equipe.papeis.map((p) => [p.slug, p]))
      for (const m of equipe.membros) {
        if (m.status !== 'ativo') continue
        const papel = papelPorSlug.get(m.papelSlug)
        if (m.papelSlug === SLUG_DEV || papel?.permissoes.includes(chave)) achados.add(normalizarEmail(m.email))
      }
      // Bootstrap que a tabela ainda não conhece entra como dev.
      for (const b of equipe.bootstrap) if (!b.naTabela) achados.add(normalizarEmail(b.email))
    } catch (err) {
      console.error('[admin] destinatários indisponíveis no banco; usando o bootstrap do ambiente:', err)
      for (const e of bootstrap) achados.add(normalizarEmail(e))
    }
  }

  return [...achados].filter((e) => e.includes('@') && !e.endsWith(DOMINIO_DE_TESTE))
}
