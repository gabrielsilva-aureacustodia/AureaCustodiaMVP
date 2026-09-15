/**
 * O estado de cada serviço externo, para a aba Integrações da configuração (plano do Admin, 3.3).
 *
 * SÓ O NOME DA VARIÁVEL, NUNCA O VALOR. O servidor entrega a esta função um mapa "a variável existe?",
 * e a tela diz o que está ligado, o que falta e o que acontece sem ele. Nenhum valor de ambiente
 * atravessa para o navegador — nem mascarado.
 *
 * A LISTA DE NOMES É A QUE O CÓDIGO LÊ, conferida em 14/09/2026 por busca de `process.env` em `src/`.
 * Variável que o código não lê não aparece aqui, para a tela não pedir o que ninguém usa.
 *
 * Regra pura: sem I/O. `SESSION_SECRET` fica de fora de propósito — é segredo de sessão, não
 * integração, e a decisão sobre ele durante o MVP já está registrada.
 */

export interface VariavelDaIntegracao {
  /** Um nome, ou alternativas separadas por " ou " — basta uma delas. */
  nome: string
  presente: boolean
  obrigatoria: boolean
}

export interface EstadoIntegracao {
  chave: string
  nome: string
  oQueFaz: string
  estado: 'ligado' | 'parcial' | 'desligado'
  variaveis: VariavelDaIntegracao[]
  /** O que acontece enquanto não está ligado. */
  semEla: string
  /** Informação que não é segredo e ajuda a ler o estado (modo de teste, balde padrão). */
  observacao?: string
}

type Presenca = Readonly<Record<string, boolean>>
type Leitura = Readonly<Record<string, string | undefined>>

interface Definicao {
  chave: string
  nome: string
  oQueFaz: string
  semEla: string
  /** Cada item: alternativas (basta uma) e se é obrigatório. */
  variaveis: ReadonlyArray<{ alternativas: readonly string[]; obrigatoria: boolean }>
  observacao?: (valoresNaoSecretos: Leitura) => string | undefined
}

const DEFINICOES: readonly Definicao[] = [
  {
    chave: 'banco',
    nome: 'Banco de dados (Postgres do Supabase)',
    oQueFaz: 'Guarda o estado da plataforma, o livro-razão, a trilha e todas as tabelas do painel.',
    semEla: 'O estado vive em memória e se perde a cada reinício; não há ledger, trilha, papéis nem histórico.',
    variaveis: [{ alternativas: ['POSTGRES_URL', 'DATABASE_URL'], obrigatoria: true }],
  },
  {
    chave: 'login',
    nome: 'Login (Supabase Auth)',
    oQueFaz: 'Cadastro, entrada com senha e com Google, confirmação de e-mail.',
    semEla: 'Só as contas de demonstração do catálogo entram (RA-17).',
    variaveis: [
      { alternativas: ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'], obrigatoria: true },
      { alternativas: ['SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'], obrigatoria: true },
    ],
  },
  {
    chave: 'servico_supabase',
    nome: 'Chave de serviço do Supabase',
    oQueFaz: 'Criar login e redefinir senha pelo painel, bloquear conta, assinar o envio e a leitura dos vídeos da análise.',
    semEla: 'O painel registra as ações de conta sem tocar no login; a bancada fecha análise sem vídeo.',
    variaveis: [
      { alternativas: ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'], obrigatoria: true },
      { alternativas: ['SUPABASE_SERVICE_ROLE_KEY'], obrigatoria: true },
      { alternativas: ['SUPABASE_STORAGE_BUCKET'], obrigatoria: false },
    ],
    observacao: (v) => `Balde dos vídeos: ${v.SUPABASE_STORAGE_BUCKET?.trim() || 'analises (padrão)'}.`,
  },
  {
    chave: 'pagamento',
    nome: 'Pagamento (Mercado Pago)',
    oQueFaz: 'Pix e cartão para depósito, compra direta, planos e faturas de custódia e retirada.',
    semEla: 'As cobranças caem no simulador.',
    variaveis: [
      { alternativas: ['MP_ACCESS_TOKEN', 'MP_ACCESS_TOKEN_TEST'], obrigatoria: true },
      { alternativas: ['MP_WEBHOOK_SECRET'], obrigatoria: true },
      { alternativas: ['MP_SANDBOX'], obrigatoria: false },
    ],
    observacao: (v) => (v.MP_SANDBOX?.trim().toLowerCase() === 'false' ? 'Modo: produção (MP_SANDBOX=false).' : 'Modo: teste (MP_SANDBOX ausente ou diferente de false).'),
  },
  {
    chave: 'correios',
    nome: 'Correios',
    oQueFaz: 'Pré-postagem, etiqueta e rastreio dos envios e das retiradas.',
    semEla: 'Etiqueta e rastreio usam o adaptador simulado.',
    variaveis: [
      { alternativas: ['CORREIOS_TOKEN'], obrigatoria: true },
      { alternativas: ['CORREIOS_CARTAO_POSTAGEM'], obrigatoria: true },
    ],
  },
  {
    chave: 'mensageria',
    nome: 'WhatsApp do atendimento (Evolution API)',
    oQueFaz: 'Receber e responder as conversas em /admin/cs.',
    semEla: 'As respostas ficam registradas só no painel e o webhook responde 503.',
    variaveis: [
      { alternativas: ['EVOLUTION_API_URL'], obrigatoria: true },
      { alternativas: ['EVOLUTION_API_KEY'], obrigatoria: true },
      { alternativas: ['EVOLUTION_INSTANCE'], obrigatoria: true },
      { alternativas: ['WHATSAPP_WEBHOOK_SECRET'], obrigatoria: true },
    ],
  },
  {
    chave: 'estacao',
    nome: 'Estação da bancada (programa do notebook)',
    oQueFaz: 'Autentica o programa Electron nas rotas /api/estacao/*.',
    semEla: 'As rotas da estação respondem 503; a bancada web do painel continua funcionando.',
    variaveis: [{ alternativas: ['AUREA_ESTACAO_TOKEN'], obrigatoria: true }],
  },
  {
    chave: 'relatorios',
    nome: 'Relatórios por API e Google Sheets',
    oQueFaz: 'Leitura dos relatórios por chave (Excel, planilhas) e envio direto ao Google Sheets.',
    semEla: 'Os relatórios só abrem pela sessão de quem está no painel.',
    variaveis: [
      { alternativas: ['AUREA_RELATORIOS_TOKEN'], obrigatoria: true },
      { alternativas: ['GOOGLE_SERVICE_ACCOUNT_EMAIL'], obrigatoria: false },
      { alternativas: ['GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY'], obrigatoria: false },
      { alternativas: ['GOOGLE_SHEETS_SPREADSHEET_ID'], obrigatoria: false },
    ],
  },
  {
    chave: 'cron',
    nome: 'Tarefas agendadas',
    oQueFaz: 'Autentica o faturamento mensal de custódia e a atualização do rastreio.',
    semEla: 'As rotas de /api/cron recusam a chamada fora do ambiente de desenvolvimento.',
    variaveis: [{ alternativas: ['CRON_SECRET'], obrigatoria: true }],
  },
]

/** Os nomes que o servidor precisa consultar — e só eles. */
export const NOMES_DE_VARIAVEIS: readonly string[] = [...new Set(DEFINICOES.flatMap((d) => d.variaveis.flatMap((v) => v.alternativas)))]

/** As variáveis cujo valor não é segredo e pode ajudar a ler o estado. */
export const VARIAVEIS_NAO_SECRETAS: readonly string[] = ['MP_SANDBOX', 'SUPABASE_STORAGE_BUCKET']

export function estadoDasIntegracoes(presenca: Presenca, naoSecretas: Leitura): EstadoIntegracao[] {
  return DEFINICOES.map((d) => {
    const variaveis = d.variaveis.map((v) => ({ nome: v.alternativas.join(' ou '), presente: v.alternativas.some((n) => presenca[n] === true), obrigatoria: v.obrigatoria }))
    const obrigatorias = variaveis.filter((v) => v.obrigatoria)
    const presentes = obrigatorias.filter((v) => v.presente).length
    const estado: EstadoIntegracao['estado'] = presentes === obrigatorias.length ? 'ligado' : presentes === 0 ? 'desligado' : 'parcial'
    return { chave: d.chave, nome: d.nome, oQueFaz: d.oQueFaz, estado, variaveis, semEla: d.semEla, observacao: d.observacao?.(naoSecretas) }
  })
}
