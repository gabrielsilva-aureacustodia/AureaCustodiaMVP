/**
 * Papéis e permissões do painel administrativo — a fonte da verdade (frente C, C1).
 *
 * NÃO É PORT. O monolito não tinha painel, e até 13/09/2026 a pergunta "quem
 * administra?" tinha resposta de sim ou não: `ehAdmin()` lia `AUREA_ADMIN_EMAILS` ou as
 * contas do seed. Aqui a resposta passa a ser granular — "o contador vê só a DRE",
 * "o operador de bancada vê só a análise" — e é o próprio painel que cria esses papéis.
 *
 * O CATÁLOGO VIVE NO CÓDIGO, NÃO NA MIGRATION. Mesmo motivo do plano de contas em
 * `dre.ts`: a lista de permissões é lida pela aplicação e upsertada no banco na
 * primeira leitura (`src/server/admin/rbac.ts`). Duplicar em SQL criaria duas
 * verdades que divergem na primeira permissão nova.
 *
 * PERMISSÃO É QUEM DECIDE, PAPEL SÓ AGRUPA. O menu, a página e a Server Action
 * perguntam "este membro tem `resultados.ver`?", nunca "ele é sócio?". Um papel novo
 * criado pelo painel com `resultados.ver` enxerga a tela financeira sem uma linha de
 * código mudar.
 *
 * `rank` ORDENA, NÃO BLOQUEIA. Existe para a tela de papéis mostrar hierarquia. Não há
 * regra de "só atribui papel de rank menor" — decisão do Gabriel: papéis e permissões
 * são a funcionalidade pedida, não trava.
 *
 * AS DUAS PROTEÇÕES QUE EXISTEM, E POR QUÊ. (1) O papel `dev` tem todas as permissões
 * por definição, inclusive as que forem criadas depois; (2) nenhuma mudança de membro
 * pode deixar o painel sem um `dev` ativo. As duas servem ao mesmo requisito — nada
 * tranca o Gabriel para fora do painel — e são as únicas recusas deste arquivo.
 *
 * Regra pura: sem I/O, sem `process.env`. O servidor passa a lista do ambiente por
 * parâmetro.
 */

/* ---------- o catálogo ---------- */

export const PERMISSOES = [
  { chave: 'resultados.ver', modulo: 'resultados', rotulo: 'Ver a Central de Resultados', descricao: 'Financeiro, contábil, KPIs e uso da plataforma.' },
  { chave: 'resultados.exportar', modulo: 'resultados', rotulo: 'Exportar relatórios', descricao: 'Baixar CSV e XLSX e enviar ao Google Sheets.' },
  { chave: 'contabil.lancar', modulo: 'contabil', rotulo: 'Lançar e estornar', descricao: 'Criar lançamentos manuais e estornar os existentes.' },
  { chave: 'contabil.parametros', modulo: 'contabil', rotulo: 'Editar alíquotas', descricao: 'Preencher os parâmetros contábeis que a DRE aplica.' },
  { chave: 'usuarios.ver', modulo: 'usuarios', rotulo: 'Ver usuários', descricao: 'Lista e ficha dos clientes.' },
  { chave: 'usuarios.criar', modulo: 'usuarios', rotulo: 'Criar usuários', descricao: 'Criar conta de cliente pelo painel.' },
  { chave: 'usuarios.editar', modulo: 'usuarios', rotulo: 'Editar usuários', descricao: 'Editar cadastro, ajustar saldo, marcar inadimplência, ativar e desativar.' },
  { chave: 'usuarios.dados_bancarios', modulo: 'usuarios', rotulo: 'Ver dados bancários', descricao: 'Ver e editar chave Pix e conta bancária do cliente.' },
  { chave: 'cs.ver', modulo: 'cs', rotulo: 'Ver atendimento', descricao: 'Caixa de conversas e ficha do cliente.' },
  { chave: 'cs.responder', modulo: 'cs', rotulo: 'Responder conversas', descricao: 'Enviar mensagens, notas internas e etiquetas.' },
  { chave: 'cs.canais', modulo: 'cs', rotulo: 'Configurar canais', descricao: 'Conectar e desconectar o WhatsApp do atendimento.' },
  { chave: 'bancada.ver', modulo: 'bancada', rotulo: 'Ver a bancada', descricao: 'Fila de envios recebidos e em análise.' },
  { chave: 'bancada.analisar', modulo: 'bancada', rotulo: 'Analisar moedas', descricao: 'Gravar o veredito da análise física.' },
  { chave: 'bancada.auditoria', modulo: 'bancada', rotulo: 'Auditar moedas', descricao: 'Auditoria do acervo e verificação da corrente de hashes.' },
  { chave: 'acervo.cadastro_direto', modulo: 'acervo', rotulo: 'Cadastrar moeda sem envio', descricao: 'Registrar no acervo de um cliente moeda que já está no armazém, sem passar por envio postal nem pela fila da bancada. Restrito a sócios e desenvolvimento.' },
  { chave: 'logistica.ver', modulo: 'logistica', rotulo: 'Ver logística', descricao: 'Envios, retiradas e rastreio de todas as contas.' },
  { chave: 'logistica.etiquetas', modulo: 'logistica', rotulo: 'Emitir etiquetas', descricao: 'Reimprimir etiquetas de envio e de retirada.' },
  { chave: 'config.ver', modulo: 'config', rotulo: 'Ver configuração', descricao: 'Taxas, catálogo, parâmetros operacionais e integrações.' },
  // C3: a mesma permissão cobre os parâmetros operacionais, os prazos dos Termos e os canais de
  // atendimento — tudo é "número que o contrato ou a operação usa". Uma permissão nova não chegaria
  // ao papel Sócio já criado no banco (as concessões iniciais valem uma vez só).
  { chave: 'config.taxas', modulo: 'config', rotulo: 'Editar taxas e parâmetros', descricao: 'Comissão, custódia, saque, retirada, limite de depósito, prazos dos Termos e canais de atendimento.' },
  { chave: 'config.catalogo', modulo: 'config', rotulo: 'Editar catálogo', descricao: 'Criar e editar tipos de moeda.' },
  { chave: 'admin.papeis', modulo: 'admin', rotulo: 'Administrar papéis', descricao: 'Criar papéis e escolher as permissões de cada um.' },
  { chave: 'admin.membros', modulo: 'admin', rotulo: 'Administrar membros', descricao: 'Dar e tirar acesso ao painel, trocar o papel de um membro.' },
  { chave: 'admin.auditoria', modulo: 'admin', rotulo: 'Ver a trilha de auditoria', descricao: 'Quem fez o quê, quando, em toda a plataforma.' },
] as const

export type ChavePermissao = (typeof PERMISSOES)[number]['chave']
export type ModuloPermissao = (typeof PERMISSOES)[number]['modulo']

export const CHAVES_PERMISSAO: readonly ChavePermissao[] = PERMISSOES.map((p) => p.chave)

/** Rótulo de cada módulo, na ordem em que a tela de papéis os agrupa. */
export const MODULOS: ReadonlyArray<{ modulo: ModuloPermissao; rotulo: string }> = [
  { modulo: 'resultados', rotulo: 'Central de Resultados' },
  { modulo: 'contabil', rotulo: 'Contábil' },
  { modulo: 'usuarios', rotulo: 'Usuários' },
  { modulo: 'cs', rotulo: 'Atendimento (CS)' },
  { modulo: 'bancada', rotulo: 'Bancada e moedas' },
  { modulo: 'acervo', rotulo: 'Acervo' },
  { modulo: 'logistica', rotulo: 'Logística' },
  { modulo: 'config', rotulo: 'Configuração do site' },
  { modulo: 'admin', rotulo: 'Equipe e auditoria' },
]

/** O cliente pode mandar qualquer string: toda entrada passa por aqui antes de valer. */
export function ehChavePermissao(x: unknown): x is ChavePermissao {
  return typeof x === 'string' && (CHAVES_PERMISSAO as readonly string[]).includes(x)
}

/* ---------- papéis de sistema ---------- */

/**
 * Como o painel inicial se organiza para o papel. Organiza informação, não concede
 * acesso: cada atalho do painel continua filtrado por permissão.
 */
export type VariantePainel = 'desenvolvimento' | 'gestao' | 'operacional'

export const VARIANTES: readonly VariantePainel[] = ['desenvolvimento', 'gestao', 'operacional']

export const SLUG_DEV = 'dev'

export interface PapelDeSistema {
  slug: string
  nome: string
  rank: number
  variantePainel: VariantePainel
  /** Permissões com que o papel nasce. Depois disso, quem decide é a tela de papéis. */
  permissoesIniciais: readonly ChavePermissao[]
}

export const PAPEIS_DE_SISTEMA: readonly PapelDeSistema[] = [
  {
    slug: SLUG_DEV,
    nome: 'Desenvolvimento',
    rank: 100,
    variantePainel: 'desenvolvimento',
    permissoesIniciais: CHAVES_PERMISSAO,
  },
  {
    slug: 'socio',
    nome: 'Sócio',
    rank: 50,
    variantePainel: 'gestao',
    permissoesIniciais: CHAVES_PERMISSAO.filter((c) => c !== 'admin.papeis' && c !== 'admin.membros'),
  },
  {
    slug: 'operacao',
    nome: 'Operação',
    rank: 10,
    variantePainel: 'operacional',
    permissoesIniciais: CHAVES_PERMISSAO.filter((c) => c.startsWith('bancada.') || c.startsWith('logistica.')),
  },
]

export function papelDeSistema(slug: string): PapelDeSistema | undefined {
  return PAPEIS_DE_SISTEMA.find((p) => p.slug === slug)
}

/* ---------- o membro resolvido ---------- */

export type StatusMembro = 'ativo' | 'inativo'

/** Como o banco guarda um papel, com as permissões concedidas. */
export interface PapelGravado {
  id: number
  slug: string
  nome: string
  rank: number
  variantePainel: VariantePainel
  sistema: boolean
  permissoes: readonly string[]
}

/** Como o banco guarda um membro. */
export interface MembroGravado {
  email: string
  nomeExibicao: string
  papelId: number
  status: StatusMembro
}

/**
 * O membro como o resto do sistema o enxerga: papel resolvido e a lista final de
 * permissões. Serializável — o layout do painel o entrega ao cliente tal como está.
 */
export interface MembroAdmin {
  email: string
  nome: string
  papel: { slug: string; nome: string; rank: number; variantePainel: VariantePainel }
  permissoes: ChavePermissao[]
  /**
   * 'tabela' = cadastrado em `aurea.admin_membros`;
   * 'ambiente' = entrou pelo bootstrap (`AUREA_ADMIN_EMAILS` ou contas do seed).
   */
  origem: 'tabela' | 'ambiente'
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Quem entra no painel como `dev` em qualquer ambiente, com ou sem `AUREA_ADMIN_EMAILS`.
 *
 * POR QUE NO CÓDIGO. Em 14/09/2026 o Gabriel abriu o painel publicado com o próprio e-mail
 * e caiu no site do cliente: a variável não o listava, e sem ela o bootstrap só conhecia as
 * contas do seed. "Nada tranca o Gabriel para fora" não pode depender de alguém lembrar de
 * uma variável na Vercel. A tabela de membros continua valendo sobre esta lista (inclusive
 * para rebaixar). RA-48.
 *
 * Em 15/09/2026 o Gabriel pediu o mesmo acesso para o Rogério e a Rozane: as duas contas do
 * Rogério (a de demonstração em @aureacustodia.com.br e a do seed) e a da Rozane. Outros
 * sócios entram por Equipe e papéis.
 */
export const EMAILS_FIXOS_DA_EQUIPE: readonly string[] = [
  // Só o e-mail institucional. Em 20/09/2026 saíram daqui
  // 'rogerio@aureacustodia.com.br', 'rogeriopena@testeaurea.com.br' e
  // 'rozane@testeaurea.com.br': eram contas de demonstração, excluídas do banco
  // no mesmo dia, e um e-mail de conta que não existe mais continuar dando
  // acesso de `dev` ao painel é porta aberta sem dono.
  //
  // Quem mais precisar de painel entra por `aurea.admin_membros`, cadastrado
  // pela equipe com papel e permissões — que é o caminho certo — ou por
  // AUREA_ADMIN_EMAILS. Este e-mail fica para a equipe nunca ficar trancada
  // fora por variável mal preenchida (RA-40).
  'gabriel.silva@aureacustodia.com.br',
]

/**
 * O bootstrap: quem entra como `dev` quando a tabela de membros não conhece o e-mail.
 *
 * A MESMA REGRA de `ehAdmin()` desde 03/09/2026, agora num lugar puro: com
 * `AUREA_ADMIN_EMAILS` definida, vale só a lista; sem ela, valem as contas do seed. Os
 * `EMAILS_FIXOS_DA_EQUIPE` valem nos dois casos. Mudar a precedência aqui mudaria também
 * quem lê a DRE por `/api/relatorios`.
 */
export function ehEmailDeBootstrap(
  email: string | null | undefined,
  listaDoAmbiente: string | undefined,
  contasDoSeed: Readonly<Record<string, unknown>>,
): boolean {
  if (!email) return false
  const e = normalizarEmail(email)
  if (!e) return false
  if (EMAILS_FIXOS_DA_EQUIPE.includes(e)) return true
  const lista = emailsDaLista(listaDoAmbiente)
  if (lista) return lista.includes(e)
  return Object.prototype.hasOwnProperty.call(contasDoSeed, e)
}

/** A lista do ambiente já normalizada, ou `null` quando a variável não está definida. */
export function emailsDaLista(listaDoAmbiente: string | undefined): string[] | null {
  if (!listaDoAmbiente || listaDoAmbiente.trim().length === 0) return null
  return listaDoAmbiente
    .split(',')
    .map((x) => normalizarEmail(x))
    .filter(Boolean)
}

/** Os e-mails que entram pelo bootstrap — a lista do ambiente ou as contas do seed, e os fixos. */
export function emailsDeBootstrap(
  listaDoAmbiente: string | undefined,
  contasDoSeed: Readonly<Record<string, unknown>>,
): string[] {
  const base = emailsDaLista(listaDoAmbiente) ?? Object.keys(contasDoSeed).map(normalizarEmail)
  return [...base, ...EMAILS_FIXOS_DA_EQUIPE.filter((e) => !base.includes(e))]
}

function papelVisivel(p: { slug: string; nome: string; rank: number; variantePainel: VariantePainel }): MembroAdmin['papel'] {
  return { slug: p.slug, nome: p.nome, rank: p.rank, variantePainel: p.variantePainel }
}

/** Filtra o que o banco devolveu contra o catálogo, na ordem do catálogo. */
function permissoesValidas(concedidas: readonly string[]): ChavePermissao[] {
  const set = new Set(concedidas)
  return CHAVES_PERMISSAO.filter((c) => set.has(c))
}

export interface EntradaResolucao {
  email: string
  /** A linha do membro, ou `null` quando a tabela não conhece o e-mail. */
  membro: MembroGravado | null
  /** O papel da linha do membro (ignorado quando `membro` é nulo). */
  papel: PapelGravado | null
  /** true quando o e-mail está no bootstrap do ambiente. */
  bootstrap: boolean
  /** Nome para exibir quando a linha não traz um (conta do seed, cadastro). */
  nomeAlternativo?: string | null
}

/**
 * Decide quem é o membro, e com quais permissões.
 *
 *  - Tabela conhece o e-mail: vale a linha. Inativo não entra. Papel `dev` recebe o
 *    catálogo inteiro — inclusive permissão criada depois da concessão.
 *  - Tabela não conhece e o e-mail está no bootstrap: entra como `dev`.
 *  - Nenhum dos dois: não é membro.
 *
 * Uma linha que aponta para papel inexistente (não deveria acontecer: há chave
 * estrangeira) é tratada como "não é membro" em vez de conceder qualquer coisa.
 */
export function resolverMembro(entrada: EntradaResolucao): MembroAdmin | null {
  const email = normalizarEmail(entrada.email)
  if (!email) return null
  const nomeReserva = entrada.nomeAlternativo?.trim() || email

  if (entrada.membro) {
    if (entrada.membro.status !== 'ativo') return null
    const papel = entrada.papel
    if (!papel || papel.id !== entrada.membro.papelId) return null
    return {
      email,
      nome: entrada.membro.nomeExibicao.trim() || nomeReserva,
      papel: papelVisivel(papel),
      permissoes: papel.slug === SLUG_DEV ? [...CHAVES_PERMISSAO] : permissoesValidas(papel.permissoes),
      origem: 'tabela',
    }
  }

  if (entrada.bootstrap) {
    const dev = papelDeSistema(SLUG_DEV) as PapelDeSistema
    return {
      email,
      nome: nomeReserva,
      papel: papelVisivel(dev),
      permissoes: [...CHAVES_PERMISSAO],
      origem: 'ambiente',
    }
  }

  return null
}

export function temPermissao(membro: Pick<MembroAdmin, 'permissoes'> | null | undefined, chave: ChavePermissao): boolean {
  return Boolean(membro && membro.permissoes.includes(chave))
}

/** Pelo menos uma das chaves — para itens que servem a mais de uma permissão (a tela de equipe). */
export function temAlguma(membro: Pick<MembroAdmin, 'permissoes'> | null | undefined, chaves: readonly ChavePermissao[]): boolean {
  return chaves.some((c) => temPermissao(membro, c))
}

/* ---------- a proteção contra ficar sem dev ---------- */

export interface SituacaoMembro {
  email: string
  papelSlug: string
  status: StatusMembro
}

/**
 * Quantos `dev` ativos o painel teria depois de aplicar `mudanca` aos membros da
 * tabela. Conta os da tabela com papel `dev` e ativos, mais os e-mails do bootstrap
 * que a tabela não conhece (eles entram como `dev` pelo ambiente).
 *
 * Uma mudança que zera esta conta deixaria o painel sem ninguém capaz de administrar
 * papéis e membros — e é a única mudança de membro que o servidor recusa.
 */
export function devsAtivosDepois(
  membros: readonly SituacaoMembro[],
  bootstrap: readonly string[],
  mudanca: SituacaoMembro,
): number {
  const porEmail = new Map<string, SituacaoMembro>()
  for (const m of membros) porEmail.set(normalizarEmail(m.email), { ...m, email: normalizarEmail(m.email) })
  const alvo = normalizarEmail(mudanca.email)
  porEmail.set(alvo, { ...mudanca, email: alvo })

  let devs = 0
  for (const m of porEmail.values()) if (m.status === 'ativo' && m.papelSlug === SLUG_DEV) devs += 1
  for (const e of new Set(bootstrap.map(normalizarEmail))) if (!porEmail.has(e)) devs += 1
  return devs
}

/* ---------- validação de entrada ---------- */

/** Slug de papel: minúsculas, dígitos, hífen e sublinhado, começando por letra. */
export function slugDePapelValido(slug: string): boolean {
  return /^[a-z][a-z0-9_-]{1,39}$/.test(slug)
}

/** Formato mínimo de e-mail. Quem valida a caixa de verdade é o login. */
export function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizarEmail(email)) && email.length <= 254
}

export function ehVariantePainel(x: unknown): x is VariantePainel {
  return typeof x === 'string' && (VARIANTES as readonly string[]).includes(x)
}
