/**
 * O RBAC do painel no banco: garantir o catálogo, resolver o membro e administrar a
 * equipe (papéis e membros), sempre com a linha de auditoria na mesma transação.
 *
 * PARAMETRIZADO PELO `Executor`, SEM `server-only`, pelo mesmo motivo de
 * src/server/db/estado.ts: é o que deixa a suíte rodar exatamente este código contra
 * o Postgres embutido. Quem liga ao Supabase de verdade, lê o ambiente e confere a
 * sessão é `acesso.ts`, que tem a barreira.
 *
 * AS ÚNICAS RECUSAS DE REGRA (fora a validação de formato):
 *  - tirar permissão do papel `dev`: ele tem o catálogo inteiro por definição;
 *  - deixar o painel sem nenhum `dev` ativo;
 *  - excluir papel de sistema, ou papel que ainda tem membro.
 * Todas protegem o mesmo requisito — ninguém, em especial o Gabriel, fica trancado
 * fora do painel por um clique errado. `rank` não recusa nada.
 */

import {
  CHAVES_PERMISSAO,
  PAPEIS_DE_SISTEMA,
  PERMISSOES,
  SLUG_DEV,
  devsAtivosDepois,
  ehChavePermissao,
  ehEmailDeBootstrap,
  ehVariantePainel,
  emailValido,
  emailsDeBootstrap,
  normalizarEmail,
  resolverMembro,
  slugDePapelValido,
  type ChavePermissao,
  type MembroAdmin,
  type PapelGravado,
  type StatusMembro,
  type VariantePainel,
} from '@/domain/admin/permissoes'
import {
  atualizarMembro as atualizarMembroDb,
  atualizarPapel as atualizarPapelDb,
  buscarMembroPorEmail,
  buscarPapelPorSlug,
  concederCatalogoAoPapel,
  concederPermissoes,
  contarMembrosDoPapel,
  excluirPapel as excluirPapelDb,
  inserirMembro,
  inserirPapel,
  inserirPapelDeSistemaSeFaltar,
  listarMembros,
  listarPapeis,
  nomeDaConta,
  situacaoDoMembro,
  substituirPermissoes,
  upsertPermissoes,
  type MembroListado,
} from '@/server/db/repositories/admin-rbac'
import { nomeDoSchema, type Consulta, type Executor } from '@/server/db/sql'

import { registrarAcaoAdmin } from './auditar'

/** O que o servidor lê do ambiente e passa para cá — este módulo não lê `process.env`. */
export interface Ambiente {
  /** `AUREA_ADMIN_EMAILS`, crua. */
  listaDoAmbiente: string | undefined
  /** `ACCOUNTS` do seed: e-mail → { name }. */
  contasDoSeed: Readonly<Record<string, { name?: string }>>
}

export type ResultadoEquipe = { ok: true; mensagem: string } | { ok: false; erro: string }

/* ---------- catálogo ---------- */

/**
 * Upserta as permissões do código, cria os papéis de sistema que faltarem (com as
 * concessões iniciais, uma única vez) e completa o `dev` com o catálogo inteiro.
 * Idempotente: rodar duas vezes não muda nada, e nunca desfaz uma concessão que a
 * tela de papéis tirou do sócio ou da operação.
 */
export async function garantirCatalogosAdmin(tx: Consulta, agora: number = Date.now()): Promise<void> {
  await upsertPermissoes(tx, PERMISSOES)
  for (const p of PAPEIS_DE_SISTEMA) {
    const criado = await inserirPapelDeSistemaSeFaltar(tx, p, agora)
    if (criado !== null) await concederPermissoes(tx, criado, p.permissoesIniciais)
  }
  await concederCatalogoAoPapel(tx, SLUG_DEV)
}

/* ---------- o membro ---------- */

/**
 * Resolve o membro a partir da tabela, caindo no bootstrap quando a tabela não o
 * conhece. Leitura, em transação somente leitura. Não garante o catálogo — quem
 * chama decide quando (ver `acesso.ts`, que o faz uma vez por instância).
 */
export async function carregarMembroNoBanco(
  executar: Executor,
  email: string,
  amb: Ambiente,
): Promise<MembroAdmin | null> {
  const e = normalizarEmail(email)
  if (!e) return null
  const bootstrap = ehEmailDeBootstrap(e, amb.listaDoAmbiente, amb.contasDoSeed)
  const { registro, nome } = await executar(
    async (tx) => {
      const registro = await buscarMembroPorEmail(tx, e)
      const nome = registro?.membro.nomeExibicao.trim() ? null : await nomeDaConta(tx, e)
      return { registro, nome }
    },
    { somenteLeitura: true },
  )
  return resolverMembro({
    email: e,
    membro: registro?.membro ?? null,
    papel: registro?.papel ?? null,
    bootstrap,
    nomeAlternativo: nome ?? amb.contasDoSeed[e]?.name ?? null,
  })
}

/**
 * A pergunta do menu do app: "mostro o item Administração?". Uma consulta de uma
 * linha, sem catálogo e sem nome — ela roda no carregamento de toda tela do cliente.
 */
export async function abrePainelNoBanco(executar: Executor, email: string, amb: Ambiente): Promise<boolean> {
  const e = normalizarEmail(email)
  if (!e) return false
  const situacao = await executar((tx) => situacaoDoMembro(tx, e), { somenteLeitura: true })
  if (situacao) return situacao.status === 'ativo'
  return ehEmailDeBootstrap(e, amb.listaDoAmbiente, amb.contasDoSeed)
}

/* ---------- a equipe, para a tela ---------- */

export interface VisaoEquipe {
  papeis: Array<PapelGravado & { membros: number }>
  membros: MembroListado[]
  /** Quem entra pelo ambiente. `naTabela` = a tabela já decide por ele. */
  bootstrap: Array<{ email: string; nome: string; naTabela: boolean }>
}

export async function carregarEquipe(executar: Executor, amb: Ambiente): Promise<VisaoEquipe> {
  return executar(async (tx) => {
    await garantirCatalogosAdmin(tx)
    const [papeis, membros] = [await listarPapeis(tx), await listarMembros(tx)]
    const naTabela = new Set(membros.map((m) => m.email))
    const contagem = new Map<number, number>()
    for (const m of membros) contagem.set(m.papelId, (contagem.get(m.papelId) ?? 0) + 1)
    return {
      papeis: papeis.map((p) => ({
        ...p,
        // A tela mostra o que VALE, na ordem do catálogo: o dev resolve o catálogo
        // inteiro mesmo que o banco esteja atrasado, e chave antiga que saiu do
        // código não aparece como se ainda concedesse alguma coisa.
        permissoes: p.slug === SLUG_DEV ? [...CHAVES_PERMISSAO] : CHAVES_PERMISSAO.filter((c) => p.permissoes.includes(c)),
        membros: contagem.get(p.id) ?? 0,
      })),
      membros,
      bootstrap: emailsDeBootstrap(amb.listaDoAmbiente, amb.contasDoSeed).map((email) => ({
        email,
        nome: amb.contasDoSeed[email]?.name ?? '',
        naTabela: naTabela.has(email),
      })),
    }
  })
}

/* ---------- validações ---------- */

const NOME_MAX = 80

function nomeLimpo(nome: string | undefined | null): string {
  return (nome ?? '').trim().slice(0, NOME_MAX)
}

function ehStatus(x: unknown): x is StatusMembro {
  return x === 'ativo' || x === 'inativo'
}

function validarPermissoes(lista: readonly unknown[]): { ok: true; chaves: ChavePermissao[] } | { ok: false; erro: string } {
  const chaves: ChavePermissao[] = []
  for (const x of lista) {
    if (!ehChavePermissao(x)) return { ok: false, erro: `Permissão desconhecida: ${String(x)}.` }
    if (!chaves.includes(x)) chaves.push(x)
  }
  // Na ordem do catálogo, para a trilha comparar "antes" e "depois" sem ruído.
  return { ok: true, chaves: CHAVES_PERMISSAO.filter((c) => chaves.includes(c)) }
}

function rankValido(rank: unknown): rank is number {
  return typeof rank === 'number' && Number.isInteger(rank) && rank >= 0 && rank <= 1000
}

const SEM_DEV =
  'Esta mudança deixaria o painel sem nenhum membro dev ativo — e é o dev quem administra papéis e membros. Promova outra pessoa a dev antes.'

/**
 * Serializa as mudanças de equipe. Duas pessoas rebaixando os dois últimos devs ao
 * mesmo tempo passariam, cada uma, pela conferência de "ainda sobra um dev"; com a
 * trava, a segunda confere depois do commit da primeira.
 */
async function travarEquipe(tx: Consulta): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(`SELECT id FROM ${S}.admin_papeis WHERE slug = $1 FOR UPDATE`, [SLUG_DEV])
}

/* ---------- membros ---------- */

export async function adicionarMembro(
  executar: Executor,
  ator: string,
  entrada: { email: string; nome?: string; papelSlug: string },
  amb: Ambiente,
): Promise<ResultadoEquipe> {
  const email = normalizarEmail(entrada.email ?? '')
  if (!emailValido(email)) return { ok: false, erro: 'Informe um e-mail válido.' }
  const nome = nomeLimpo(entrada.nome)

  return executar<ResultadoEquipe>(async (tx) => {
    await garantirCatalogosAdmin(tx)
    await travarEquipe(tx)
    const papel = await buscarPapelPorSlug(tx, entrada.papelSlug)
    if (!papel) return { ok: false, erro: 'Papel não encontrado.' }
    if (await buscarMembroPorEmail(tx, email)) {
      return { ok: false, erro: 'Este e-mail já é membro. Mude o papel ou a situação dele na lista.' }
    }

    const membros = await listarMembros(tx)
    const bootstrap = emailsDeBootstrap(amb.listaDoAmbiente, amb.contasDoSeed)
    const devs = devsAtivosDepois(
      membros.map((m) => ({ email: m.email, papelSlug: m.papelSlug, status: m.status })),
      bootstrap,
      { email, papelSlug: papel.slug, status: 'ativo' },
    )
    if (devs === 0) return { ok: false, erro: SEM_DEV }

    const agora = Date.now()
    await inserirMembro(tx, { email, nomeExibicao: nome, papelId: papel.id, status: 'ativo', criadoPor: ator }, agora)
    await registrarAcaoAdmin(tx, {
      ator,
      area: 'membros',
      verbo: 'adicionar',
      entidade: 'admin_membro',
      entidadeId: email,
      usuariosAfetados: [email],
      detalhes: { papel: papel.slug, nome },
      agora,
    })
    return { ok: true, mensagem: `${nome || email} agora é membro do painel como ${papel.nome}.` }
  })
}

export async function alterarMembro(
  executar: Executor,
  ator: string,
  entrada: { email: string; nome?: string; papelSlug?: string; status?: string },
  amb: Ambiente,
): Promise<ResultadoEquipe> {
  const email = normalizarEmail(entrada.email ?? '')
  if (!emailValido(email)) return { ok: false, erro: 'Membro inválido.' }
  if (entrada.status !== undefined && !ehStatus(entrada.status)) return { ok: false, erro: 'Situação inválida.' }

  return executar<ResultadoEquipe>(async (tx) => {
    await garantirCatalogosAdmin(tx)
    await travarEquipe(tx)
    const atual = await buscarMembroPorEmail(tx, email)
    const bootstrap = emailsDeBootstrap(amb.listaDoAmbiente, amb.contasDoSeed)
    const doAmbiente = bootstrap.includes(email)
    // Quem só existe no ambiente ganha linha na primeira alteração: é assim que um
    // e-mail do bootstrap passa a ter papel escolhido pela tela.
    if (!atual && !doAmbiente) return { ok: false, erro: 'Membro não encontrado.' }

    const papelAtualSlug = atual?.papel.slug ?? SLUG_DEV
    const papel = await buscarPapelPorSlug(tx, entrada.papelSlug ?? papelAtualSlug)
    if (!papel) return { ok: false, erro: 'Papel não encontrado.' }
    const status: StatusMembro = (entrada.status as StatusMembro | undefined) ?? atual?.membro.status ?? 'ativo'
    const nome = entrada.nome !== undefined ? nomeLimpo(entrada.nome) : atual?.membro.nomeExibicao ?? amb.contasDoSeed[email]?.name ?? ''

    const membros = await listarMembros(tx)
    const devs = devsAtivosDepois(
      membros.map((m) => ({ email: m.email, papelSlug: m.papelSlug, status: m.status })),
      bootstrap,
      { email, papelSlug: papel.slug, status },
    )
    if (devs === 0) return { ok: false, erro: SEM_DEV }

    const antes = atual
      ? { papel: atual.papel.slug, status: atual.membro.status, nome: atual.membro.nomeExibicao }
      : { papel: SLUG_DEV, status: 'ativo', nome: '', origem: 'ambiente' }
    const depois = { papel: papel.slug, status, nome }
    if (atual && antes.papel === depois.papel && antes.status === depois.status && antes.nome === depois.nome) {
      return { ok: true, mensagem: 'Nada mudou.' }
    }

    const agora = Date.now()
    if (atual) {
      await atualizarMembroDb(tx, email, { nomeExibicao: nome, papelId: papel.id, status, atualizadoPor: ator }, agora)
    } else {
      await inserirMembro(tx, { email, nomeExibicao: nome, papelId: papel.id, status, criadoPor: ator }, agora)
    }
    await registrarAcaoAdmin(tx, {
      ator,
      area: 'membros',
      verbo: 'alterar',
      entidade: 'admin_membro',
      entidadeId: email,
      usuariosAfetados: [email],
      detalhes: { antes, depois },
      agora,
    })
    const situacao = status === 'ativo' ? 'ativo' : 'inativo'
    return { ok: true, mensagem: `${nome || email}: ${papel.nome}, ${situacao}.` }
  })
}

/* ---------- papéis ---------- */

export async function criarPapel(
  executar: Executor,
  ator: string,
  entrada: { slug: string; nome: string; rank: number; variantePainel: string; permissoes: readonly unknown[] },
): Promise<ResultadoEquipe> {
  const slug = (entrada.slug ?? '').trim().toLowerCase()
  if (!slugDePapelValido(slug)) {
    return { ok: false, erro: 'Identificador do papel: de 2 a 40 letras minúsculas, números, hífen ou sublinhado, começando por letra.' }
  }
  const nome = nomeLimpo(entrada.nome)
  if (nome.length < 2) return { ok: false, erro: 'Dê um nome ao papel.' }
  if (!rankValido(entrada.rank)) return { ok: false, erro: 'A ordem (rank) é um número inteiro de 0 a 1000.' }
  if (!ehVariantePainel(entrada.variantePainel)) return { ok: false, erro: 'Escolha a organização do painel inicial.' }
  const perms = validarPermissoes(entrada.permissoes ?? [])
  if (!perms.ok) return { ok: false, erro: perms.erro }
  const variante: VariantePainel = entrada.variantePainel

  return executar<ResultadoEquipe>(async (tx) => {
    await garantirCatalogosAdmin(tx)
    if (await buscarPapelPorSlug(tx, slug)) return { ok: false, erro: 'Já existe um papel com este identificador.' }
    const agora = Date.now()
    const id = await inserirPapel(tx, { slug, nome, rank: entrada.rank, variantePainel: variante }, agora)
    await concederPermissoes(tx, id, perms.chaves)
    await registrarAcaoAdmin(tx, {
      ator,
      area: 'papeis',
      verbo: 'criar',
      entidade: 'admin_papel',
      entidadeId: slug,
      detalhes: { nome, rank: entrada.rank, variantePainel: variante, permissoes: perms.chaves },
      agora,
    })
    return { ok: true, mensagem: `Papel "${nome}" criado com ${perms.chaves.length} permissão(ões).` }
  })
}

export async function alterarPapel(
  executar: Executor,
  ator: string,
  entrada: { slug: string; nome?: string; rank?: number; variantePainel?: string; permissoes?: readonly unknown[] },
): Promise<ResultadoEquipe> {
  if (entrada.nome !== undefined && nomeLimpo(entrada.nome).length < 2) return { ok: false, erro: 'Dê um nome ao papel.' }
  if (entrada.rank !== undefined && !rankValido(entrada.rank)) return { ok: false, erro: 'A ordem (rank) é um número inteiro de 0 a 1000.' }
  if (entrada.variantePainel !== undefined && !ehVariantePainel(entrada.variantePainel)) {
    return { ok: false, erro: 'Escolha a organização do painel inicial.' }
  }
  const perms = entrada.permissoes !== undefined ? validarPermissoes(entrada.permissoes) : null
  if (perms && !perms.ok) return { ok: false, erro: perms.erro }

  return executar<ResultadoEquipe>(async (tx) => {
    await garantirCatalogosAdmin(tx)
    const papel = await buscarPapelPorSlug(tx, entrada.slug)
    if (!papel) return { ok: false, erro: 'Papel não encontrado.' }

    const permissoesAntes = CHAVES_PERMISSAO.filter((c) => papel.permissoes.includes(c))
    const permissoesDepois = perms && perms.ok ? perms.chaves : permissoesAntes
    if (papel.slug === SLUG_DEV && perms && perms.ok && permissoesDepois.length !== CHAVES_PERMISSAO.length) {
      return {
        ok: false,
        erro: 'O papel dev tem todas as permissões por definição — é por ele que a equipe é administrada. Para um acesso restrito, crie outro papel.',
      }
    }

    const antes = { nome: papel.nome, rank: papel.rank, variantePainel: papel.variantePainel, permissoes: permissoesAntes }
    const depois = {
      nome: entrada.nome !== undefined ? nomeLimpo(entrada.nome) : papel.nome,
      rank: entrada.rank ?? papel.rank,
      variantePainel: (entrada.variantePainel as VariantePainel | undefined) ?? papel.variantePainel,
      permissoes: permissoesDepois,
    }
    const mudouPermissoes = antes.permissoes.join(',') !== depois.permissoes.join(',')
    if (antes.nome === depois.nome && antes.rank === depois.rank && antes.variantePainel === depois.variantePainel && !mudouPermissoes) {
      return { ok: true, mensagem: 'Nada mudou.' }
    }

    const agora = Date.now()
    await atualizarPapelDb(tx, papel.id, { nome: depois.nome, rank: depois.rank, variantePainel: depois.variantePainel })
    if (mudouPermissoes && papel.slug !== SLUG_DEV) await substituirPermissoes(tx, papel.id, depois.permissoes)
    await registrarAcaoAdmin(tx, {
      ator,
      area: 'papeis',
      verbo: 'alterar',
      entidade: 'admin_papel',
      entidadeId: papel.slug,
      detalhes: { antes, depois },
      agora,
    })
    return { ok: true, mensagem: `Papel "${depois.nome}" atualizado.` }
  })
}

export async function excluirPapel(executar: Executor, ator: string, slug: string): Promise<ResultadoEquipe> {
  return executar<ResultadoEquipe>(async (tx) => {
    await garantirCatalogosAdmin(tx)
    const papel = await buscarPapelPorSlug(tx, slug)
    if (!papel) return { ok: false, erro: 'Papel não encontrado.' }
    if (papel.sistema) return { ok: false, erro: 'Papel de sistema não pode ser excluído — ele é recriado pela aplicação.' }
    const membros = await contarMembrosDoPapel(tx, papel.id)
    if (membros > 0) return { ok: false, erro: `Há ${membros} membro(s) com este papel. Mude o papel deles antes de excluir.` }
    const agora = Date.now()
    await excluirPapelDb(tx, papel.id)
    await registrarAcaoAdmin(tx, {
      ator,
      area: 'papeis',
      verbo: 'excluir',
      entidade: 'admin_papel',
      entidadeId: papel.slug,
      detalhes: { nome: papel.nome, permissoes: papel.permissoes },
      agora,
    })
    return { ok: true, mensagem: `Papel "${papel.nome}" excluído.` }
  })
}
