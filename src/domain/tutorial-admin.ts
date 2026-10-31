/**
 * Tutorial guiado do painel administrativo — o conteúdo e as regras puras.
 *
 * É o irmão de `tutorial.ts` (o do cliente) e segue o mesmo desenho: texto, âncoras e chaves aqui,
 * sem React nem navegador; quem desenha são `TourGuiado` e `DicasDaPagina`, que servem aos dois.
 *
 * A DIFERENÇA QUE IMPORTA: PAPEL
 * ------------------------------
 * O painel tem três papéis de sistema (dev, sócio, operação — `permissoes.ts`) e a equipe ainda
 * pode criar outros. Mostrar a quem trabalha na bancada o passo a passo da DRE, ou a um sócio a
 * tela de papéis, seria ensinar uma porta que não abre. Por isso todo passo e toda dica declara
 * `exige` (basta UMA das chaves, a mesma regra de `permiteItem` no menu) e as funções públicas
 * recebem as permissões do membro e devolvem só o que ele alcança. Não se compara papel por nome:
 * quem decide é a permissão, então um papel criado amanhã já ganha o tutorial certo.
 *
 * O MENU É A FONTE DAS TELAS. `tutorial-admin.test.ts` cruza este arquivo com `GRUPOS_NAV`: tela
 * nova no menu sem tutorial, ou tutorial exigindo mais (ou menos) que o menu, quebra o teste.
 *
 * QUANDO APARECE (decisão do Gabriel, 30/10/2026)
 * -----------------------------------------------
 * O tour abre sozinho UMA vez, na primeira entrada de cada membro. As telas só têm o botão
 * "Ver tutorial desta página": nada de tutorial automático por tela, para uma equipe que abre o
 * painel todo dia não ser interrompida. O progresso é estado de interface (localStorage, uma chave
 * por membro), como no cliente: sem tabela, sem migration.
 *
 * REGRA DE TEXTO
 * --------------
 * Quem lê é a equipe, mas o Rogério também abre o painel: sem jargão de programador. Valem as
 * palavras aprovadas pelo jurídico (recibo, moeda, mercado) — nunca "token", "NFT", "ativo" ou
 * vocabulário de investimento. Nenhum valor em reais nem alíquota é escrito aqui: a taxa vigente é a
 * de /admin/configuracao e o imposto é o que o contador preencheu. Texto que diga "R$ 2,00" ficaria
 * errado no dia em que a equipe mudasse a taxa.
 */

import type { ChavePermissao } from '@/domain/admin/permissoes'
import type { Alvo, Dica } from '@/domain/tutorial'
import type { UserEmail } from '@/domain/types'

/* ------------------------------------------------------------------------- */
/* Tipos                                                                      */
/* ------------------------------------------------------------------------- */

/** Basta UMA das chaves; lista ausente ou vazia = qualquer membro do painel. */
export type Exigencia = readonly ChavePermissao[]

export interface DicaAdmin extends Dica {
  /** A dica só existe para quem tem alguma destas permissões. */
  exige?: Exigencia
  /** A dica só existe para quem NÃO tem esta permissão (ex.: "você só acompanha, não aprova"). */
  semAcesso?: ChavePermissao
}

export interface PassoDoTourAdmin {
  id: string
  /** Número da etapa (0 = boas-vindas). Já vem renumerado em sequência para o papel. */
  etapa: number
  titulo: string
  texto: string
  alvo?: Alvo
  /** O alvo mora no menu lateral: no celular a gaveta precisa estar aberta enquanto o passo está na tela. */
  noMenu?: boolean
}

/* ------------------------------------------------------------------------- */
/* Permissão                                                                  */
/* ------------------------------------------------------------------------- */

export function atende(permissoes: readonly string[], exige: Exigencia | undefined): boolean {
  return !exige || exige.length === 0 || exige.some((c) => permissoes.includes(c))
}

/* ------------------------------------------------------------------------- */
/* Chaves de armazenamento                                                    */
/* ------------------------------------------------------------------------- */

/**
 * A versão faz parte da chave: subi-la faz TODOS os membros revêem o tour no próximo acesso, sem
 * mexer em banco. Prefixo próprio (`ro-tutorial-admin`) para não colidir com o do cliente, que usa
 * o mesmo e-mail no mesmo navegador.
 */
export const VERSAO_DO_TUTORIAL_ADMIN = 'v1'

export const chaveDoTourAdmin = (email: UserEmail): string =>
  `ro-tutorial-admin:${VERSAO_DO_TUTORIAL_ADMIN}:${email}:tour`

/* ------------------------------------------------------------------------- */
/* Páginas                                                                    */
/* ------------------------------------------------------------------------- */

/** Uma "página" é uma tela do menu, mais as duas fichas (cliente e moeda) que abrem a partir de uma lista. */
export const PAGINAS_ADMIN_COM_TUTORIAL = [
  '/admin',
  '/admin/saques',
  '/admin/bancada',
  '/admin/logistica',
  '/admin/cs',
  '/admin/usuarios',
  'ficha-do-cliente',
  '/admin/moedas',
  'ficha-da-moeda',
  '/admin/resultados/financeiro',
  '/admin/resultados/controle',
  '/admin/resultados/contabil',
  '/admin/resultados/fiscal',
  '/admin/resultados/kpis',
  '/admin/resultados/uso',
  '/admin/configuracao',
  '/admin/equipe',
] as const

export type PaginaAdmin = (typeof PAGINAS_ADMIN_COM_TUTORIAL)[number]

/**
 * A "página" de uma rota. A ficha da moeda "como o cliente vê" (`/admin/moedas/<código>/cliente`)
 * devolve `null`: é o recibo do cliente numa moldura, não uma tela do painel.
 */
export function paginaDoTutorialAdmin(pathname: string): PaginaAdmin | null {
  const limpo = pathname.replace(/\/+$/, '') || '/'
  if ((PAGINAS_ADMIN_COM_TUTORIAL as readonly string[]).includes(limpo)) return limpo as PaginaAdmin
  if (/^\/admin\/usuarios\/[^/]+$/.test(limpo)) return 'ficha-do-cliente'
  if (/^\/admin\/moedas\/[^/]+$/.test(limpo)) return 'ficha-da-moeda'
  return null
}

/**
 * Quem abre cada página — o mesmo critério do menu (`permissoes` de `navegacao.tsx`) e da
 * conferência que a própria página faz no servidor. As fichas herdam o da lista que as abre.
 */
export const PERMISSOES_DA_PAGINA: Record<PaginaAdmin, Exigencia> = {
  '/admin': [],
  '/admin/saques': ['saques.ver'],
  '/admin/bancada': ['bancada.ver'],
  '/admin/logistica': ['logistica.ver'],
  '/admin/cs': ['cs.ver'],
  '/admin/usuarios': ['usuarios.ver'],
  'ficha-do-cliente': ['usuarios.ver'],
  '/admin/moedas': ['bancada.auditoria'],
  'ficha-da-moeda': ['bancada.auditoria'],
  '/admin/resultados/financeiro': ['resultados.ver'],
  '/admin/resultados/controle': ['resultados.ver'],
  '/admin/resultados/contabil': ['resultados.ver'],
  '/admin/resultados/fiscal': ['resultados.ver'],
  '/admin/resultados/kpis': ['resultados.ver'],
  '/admin/resultados/uso': ['resultados.ver', 'admin.auditoria'],
  '/admin/configuracao': ['config.ver'],
  '/admin/equipe': ['admin.membros', 'admin.papeis'],
}

/** O membro abre esta página? Se não, ela não tem tutorial para ele (nem o botão). */
export function podeVerPagina(pagina: PaginaAdmin, permissoes: readonly string[]): boolean {
  return atende(permissoes, PERMISSOES_DA_PAGINA[pagina])
}

/* ------------------------------------------------------------------------- */
/* Âncoras                                                                    */
/* ------------------------------------------------------------------------- */

const SECAO = 'section, .panel'

/** Título de seção (`h2`/`h3`) com este texto; destaca a seção inteira. */
const secao = (contem: string): Alvo => ({ css: '.adm-main h2, .adm-main h3', contem, subir: SECAO })

/**
 * Tabela pelo texto da legenda (`<caption>` só para leitor de tela). Procura a `table` e não a
 * legenda porque a legenda é invisível e uma âncora invisível não vale.
 */
const tabela = (contem: string): Alvo => ({ css: '.adm-main table', contem })

/** Cartão de indicador pelo rótulo. */
const indicador = (contem: string): Alvo => ({ css: '.adm-main .adm-ind', contem })

/** Botão ou link da página pelo texto. */
const botao = (contem: string): Alvo => ({ css: '.adm-main button, .adm-main a.btn', contem })

/** Item do menu lateral pelo endereço — o `href` é gancho combinado com o polimento do painel. */
const itemDoMenu = (href: string): Alvo => ({ css: `.adm-sidebar nav a[href="${href}"]` })

/* ------------------------------------------------------------------------- */
/* Tour guiado                                                                */
/* ------------------------------------------------------------------------- */

interface PassoBruto {
  id: string
  /** Agrupamento original; é renumerado depois de filtrar pelo papel. */
  grupo: 'central' | 'operacao' | 'gestao' | 'config' | 'atalhos'
  titulo: string
  texto: string
  alvo?: Alvo
  noMenu?: boolean
  exige?: Exigencia
}

const PASSOS_DO_TOUR: readonly PassoBruto[] = [
  /* ---- Central de trabalho ---- */
  {
    id: 'central',
    grupo: 'central',
    titulo: 'Central de trabalho',
    texto:
      'É a tela de abertura. Mostra o que pede ação agora, os números do mês e um atalho para cada área que o seu papel alcança. ' +
      'O menu ao lado mostra só as telas que você pode abrir.',
    alvo: itemDoMenu('/admin'),
    noMenu: true,
  },

  /* ---- Operação do dia ---- */
  {
    id: 'saques',
    grupo: 'operacao',
    titulo: 'Saques',
    texto:
      'A fila dos pedidos de saque dos clientes: quanto falta pagar, para onde vai o Pix e há quanto tempo o pedido espera. ' +
      'Saque parado é dinheiro de cliente parado, então esta tela vem primeiro.',
    alvo: itemDoMenu('/admin/saques'),
    noMenu: true,
    exige: ['saques.ver'],
  },
  {
    id: 'bancada',
    grupo: 'operacao',
    titulo: 'Bancada de análise',
    texto:
      'Aqui chegam os envios recebidos: a moeda é analisada, o vídeo é gravado e o recibo sai com o hash que prova a análise. ' +
      'É o mesmo serviço da estação da bancada, só que no navegador.',
    alvo: itemDoMenu('/admin/bancada'),
    noMenu: true,
    exige: ['bancada.ver'],
  },
  {
    id: 'logistica',
    grupo: 'operacao',
    titulo: 'Logística',
    texto:
      'Os envios dos clientes para a custódia e as retiradas físicas, com rastreio e etiquetas dos Correios. ' +
      'É daqui que a equipe acompanha cada pacote até a entrega.',
    alvo: itemDoMenu('/admin/logistica'),
    noMenu: true,
    exige: ['logistica.ver'],
  },
  {
    id: 'cs',
    grupo: 'operacao',
    titulo: 'Atendimento',
    texto: 'As conversas de WhatsApp com os clientes, com a ficha de quem escreve ao lado da conversa.',
    alvo: itemDoMenu('/admin/cs'),
    noMenu: true,
    exige: ['cs.ver'],
  },
  {
    id: 'usuarios',
    grupo: 'operacao',
    titulo: 'Usuários',
    texto: 'A lista de contas de clientes e a ficha completa de cada uma: cadastro, financeiro, mercado, acervo, logística e atividade.',
    alvo: itemDoMenu('/admin/usuarios'),
    noMenu: true,
    exige: ['usuarios.ver'],
  },
  {
    id: 'moedas',
    grupo: 'operacao',
    titulo: 'Auditoria de moedas',
    texto: 'Todo o acervo de uma vez, com recibo, hash, caixa e a verificação da corrente de hashes. Cada moeda tem a sua ficha.',
    alvo: itemDoMenu('/admin/moedas'),
    noMenu: true,
    exige: ['bancada.auditoria'],
  },

  /* ---- Gestão ---- */
  {
    id: 'financeiro',
    grupo: 'gestao',
    titulo: 'Financeiro e controle',
    texto:
      'Financeiro traz o resultado do período e a receita por linha. Controle financeiro reúne custos, taxas, impostos e os lançamentos que se repetem todo mês. ' +
      'Os números saem do livro de lançamentos da plataforma.',
    alvo: itemDoMenu('/admin/resultados/financeiro'),
    noMenu: true,
    exige: ['resultados.ver'],
  },
  {
    id: 'contabil',
    grupo: 'gestao',
    titulo: 'Contábil e notas fiscais',
    texto:
      'Contábil guarda o plano de contas, os lançamentos manuais e as exportações. Notas fiscais acompanha cada NFS-e enviada à Sefin Nacional. ' +
      'As alíquotas vêm do contador; o painel não decide imposto.',
    alvo: itemDoMenu('/admin/resultados/contabil'),
    noMenu: true,
    exige: ['resultados.ver'],
  },
  {
    id: 'indicadores',
    grupo: 'gestao',
    titulo: 'Indicadores e uso',
    texto: 'Indicadores mostra mercado, acervo, envios e faturas em números. Uso e auditoria mostra as páginas mais abertas e a trilha de quem fez o quê.',
    alvo: itemDoMenu('/admin/resultados/kpis'),
    noMenu: true,
    exige: ['resultados.ver'],
  },

  /* ---- Configuração ---- */
  {
    id: 'configuracao',
    grupo: 'config',
    titulo: 'Configuração do site',
    texto:
      'Taxas, catálogo de moedas, limites e prazos que o site inteiro passa a ler. Mexer aqui muda o que o cliente vê e paga, ' +
      'e cada mudança fica no histórico.',
    alvo: itemDoMenu('/admin/configuracao'),
    noMenu: true,
    exige: ['config.ver'],
  },
  {
    id: 'equipe',
    grupo: 'config',
    titulo: 'Equipe e papéis',
    texto: 'Quem acessa o painel e o que cada papel pode fazer. É por aqui que se dá ou se tira acesso a alguém da equipe.',
    alvo: itemDoMenu('/admin/equipe'),
    noMenu: true,
    exige: ['admin.membros', 'admin.papeis'],
  },

  /* ---- Atalhos ---- */
  {
    id: 'busca',
    grupo: 'atalhos',
    titulo: 'Buscar ou ir para…',
    texto:
      'Ctrl K (ou Command K) abre a busca de qualquer tela. Digite o nome de uma área, o e-mail de um cliente, o código de uma moeda ou um código de rastreio e vá direto.',
    alvo: { css: '.adm-topbar .adm-busca-gatilho' },
  },
  {
    id: 'voltar-ao-app',
    grupo: 'atalhos',
    titulo: 'Voltar ao app',
    texto: 'Leva para a plataforma do cliente com a mesma sessão, sem novo login. O painel e o app são duas áreas da mesma conta.',
    alvo: { css: '.adm-sidebar a[href="/inicio"]' },
    noMenu: true,
  },
  {
    id: 'ver-tutorial',
    grupo: 'atalhos',
    titulo: 'Tutorial de cada tela',
    texto:
      'Em cada tela do painel há o botão “Ver tutorial desta página”, no canto de baixo. Ele explica só o que o seu papel alcança ali, ' +
      'e você abre quando quiser. Este passeio não se repete sozinho.',
  },
]

/**
 * Os passos do tour para quem tem estas permissões. A primeira linha é sempre a boas-vindas (etapa
 * 0); as demais ganham número de etapa em sequência pelos grupos que sobraram — quem só opera a
 * bancada vê "Etapa 1 de 3", e não "Etapa 1 de 5" com duas etapas faltando.
 */
export function passosDoTourAdmin(permissoes: readonly string[]): PassoDoTourAdmin[] {
  const brutos = PASSOS_DO_TOUR.filter((p) => atende(permissoes, p.exige))

  const grupos: PassoBruto['grupo'][] = []
  for (const p of brutos) if (!grupos.includes(p.grupo)) grupos.push(p.grupo)

  const passos: PassoDoTourAdmin[] = [
    {
      id: 'boas-vindas',
      etapa: 0,
      titulo: 'Bem-vindo ao painel do Real Olímpico',
      texto:
        `Vamos fazer um passeio rápido de ${grupos.length} ${grupos.length === 1 ? 'etapa' : 'etapas'} pelo que o seu papel alcança. ` +
        'É só para conhecer o painel — nada será alterado. Você pode pular quando quiser.',
    },
  ]
  for (const p of brutos) {
    passos.push({
      id: p.id,
      etapa: grupos.indexOf(p.grupo) + 1,
      titulo: p.titulo,
      texto: p.texto,
      ...(p.alvo ? { alvo: p.alvo } : {}),
      ...(p.noMenu ? { noMenu: true } : {}),
    })
  }
  return passos
}

/** Quantas etapas o tour tem além da boas-vindas (para o "Etapa X de Y" e os pontinhos). */
export function totalDeEtapasDoTourAdmin(passos: readonly PassoDoTourAdmin[]): number {
  return passos.reduce((maior, p) => Math.max(maior, p.etapa), 0)
}

/* ------------------------------------------------------------------------- */
/* Tutorial por página                                                        */
/* ------------------------------------------------------------------------- */

export interface TutorialDePaginaAdmin {
  titulo: string
  dicas: DicaAdmin[]
}

/** Aviso que se repete: ver não é agir. Evita prometer botão que o papel não tem. */
const SO_ACOMPANHA = 'Você acompanha esta tela, mas as ações dela são de quem tem a permissão correspondente.'

function conteudoDaPagina(pagina: PaginaAdmin): TutorialDePaginaAdmin {
  switch (pagina) {
    case '/admin':
      return {
        titulo: 'Guia da Central de trabalho',
        dicas: [
          {
            id: 'central-numeros',
            titulo: 'Números e atalhos',
            texto: 'Os cartões mostram o que pede ação agora. Os que são link levam direto à tela que resolve aquilo.',
            alvo: { css: '.adm-main .adm-ind-link' },
          },
          {
            id: 'central-ultimas',
            titulo: 'Últimas ações no painel',
            texto: 'Quem fez o quê, quando. Serve para conferir se um pedido já foi tratado antes de mexer nele de novo.',
            alvo: secao('Últimas ações'),
          },
        ],
      }

    case '/admin/saques':
      return {
        titulo: 'Guia de Saques',
        dicas: [
          {
            id: 'saques-numeros',
            titulo: 'Os quatro números',
            texto: 'Quantos pedidos esperam, quanto falta pagar, quantos passaram do prazo e há quanto tempo o mais antigo espera.',
            alvo: indicador('Esperando'),
          },
          {
            id: 'saques-abas',
            titulo: 'Situação dos saques',
            texto: 'As abas separam os pedidos por situação. Comece pelos que esperam: são os que o cliente está aguardando.',
            alvo: { css: '.adm-main nav[aria-label="Situação dos saques"]' },
          },
          {
            id: 'saques-fila',
            titulo: 'Fila de pedidos',
            texto: 'Cada linha é um pedido: valor, chave Pix de destino, previsão e situação. O valor do pedido já saiu do saldo do cliente.',
            alvo: secao('Pedidos de saque'),
          },
          {
            id: 'saques-aprovar',
            titulo: 'Aprovar e enviar o Pix',
            texto:
              'Aprova o saque e manda o Pix pelo Mercado Pago. Quando o envio automático não está ligado, a equipe paga por fora ' +
              'e registra o comprovante aqui.',
            exige: ['saques.pagar'],
            alvo: botao('Aprovar e enviar Pix'),
          },
          {
            id: 'saques-recusar',
            titulo: 'Recusar com estorno',
            texto: 'Recusar devolve o valor total ao saldo do cliente e deixa o estorno registrado. Confirme o motivo antes de recusar.',
            exige: ['saques.pagar'],
          },
          {
            id: 'saques-so-ver',
            titulo: 'Só acompanhar',
            texto: SO_ACOMPANHA,
            semAcesso: 'saques.pagar',
          },
        ],
      }

    case '/admin/bancada':
      return {
        titulo: 'Guia da Bancada',
        dicas: [
          {
            id: 'bancada-fila',
            titulo: 'Fila de envios',
            texto: 'Os envios recebidos e os que já estão em análise. Cada um mostra o cliente, as moedas e a etapa.',
            alvo: secao('Fila'),
          },
          {
            id: 'bancada-analise',
            titulo: 'Analisar uma moeda',
            texto:
              'Abra a análise, grave o vídeo e feche com o veredito. O recibo sai com o hash encadeado, pela mesma fórmula da estação: ' +
              'por isso o resultado não pode ser refeito à mão depois.',
            exige: ['bancada.analisar'],
          },
          {
            id: 'bancada-caixas',
            titulo: 'Caixas do cofre',
            texto:
              'Cada caixa tem tipo e capacidade. Caixa cheia manda a moeda para a próxima do mesmo tipo com vaga; ' +
              'moeda de um tipo nunca entra em caixa de outro.',
            alvo: secao('Caixas do cofre'),
          },
          {
            id: 'bancada-cadastro-direto',
            titulo: 'Cadastro direto',
            texto: 'Registra no acervo uma moeda já conferida, sem envio postal e sem análise. É restrito, porque pula as duas etapas de prova.',
            exige: ['acervo.cadastro_direto'],
          },
          {
            id: 'bancada-sem-envio',
            titulo: 'Cadastro sem envio postal',
            texto: 'Para moeda que já está no armazém: pula só o envio postal e entra na fila da bancada para ser analisada.',
            exige: ['acervo.cadastro_sem_envio'],
            alvo: secao('Entradas sem envio postal'),
          },
          { id: 'bancada-so-ver', titulo: 'Só acompanhar', texto: SO_ACOMPANHA, semAcesso: 'bancada.analisar' },
        ],
      }

    case '/admin/logistica':
      return {
        titulo: 'Guia de Logística',
        dicas: [
          {
            id: 'logistica-envios',
            titulo: 'Envios para a custódia',
            texto: 'Os pacotes que os clientes mandam para a guarda, com protocolo, etapa e prazos. “Recebido pela custódia” é marcado à mão.',
            alvo: secao('Envios para a custódia'),
          },
          {
            id: 'logistica-retiradas',
            titulo: 'Retiradas físicas',
            texto: 'Os pedidos de quem quer a moeda de volta, com situação, taxa e prazo.',
            alvo: secao('Retiradas físicas'),
          },
          {
            id: 'logistica-expedir',
            titulo: 'Avançar a retirada',
            texto:
              'Separar, postar e entregar. O rastreio dos Correios avança sozinho todo dia; use o botão de atualizar quando precisar saber agora, ' +
              'e informe o código de rastreio quando a postagem for manual.',
            exige: ['logistica.expedir'],
          },
          {
            id: 'logistica-etiquetas',
            titulo: 'Etiquetas',
            texto: 'Emite ou reimprime a etiqueta de saída da retirada. A etiqueta tem o endereço do cliente: não a guarde fora do sistema.',
            exige: ['logistica.etiquetas'],
          },
          { id: 'logistica-so-ver', titulo: 'Só acompanhar', texto: SO_ACOMPANHA, semAcesso: 'logistica.expedir' },
        ],
      }

    case '/admin/cs':
      return {
        titulo: 'Guia do Atendimento',
        dicas: [
          {
            id: 'cs-conversas',
            titulo: 'Conversas',
            texto: 'A caixa de entrada, com filtro pela situação da conversa.',
            alvo: { css: '.adm-main [aria-label="Situação da conversa"]' },
          },
          {
            id: 'cs-cliente',
            titulo: 'Ficha ao lado',
            texto: 'Ao abrir uma conversa, a ficha do cliente aparece ao lado: saldo, moedas e pendências, sem trocar de tela.',
            alvo: secao('Cliente'),
          },
          {
            id: 'cs-responder',
            titulo: 'Responder e anotar',
            texto:
              'Envie mensagem, deixe nota interna, atribua a conversa e use etiquetas. Sem o provedor do WhatsApp ligado, ' +
              'a resposta fica registrada só no painel e não chega ao cliente.',
            exige: ['cs.responder'],
          },
          {
            id: 'cs-canal',
            titulo: 'Canal do WhatsApp',
            texto: 'Conecta e desconecta o número do atendimento. Sem o canal conectado, as conversas não chegam ao painel.',
            exige: ['cs.canais'],
            alvo: secao('Canal'),
          },
          { id: 'cs-so-ver', titulo: 'Só acompanhar', texto: SO_ACOMPANHA, semAcesso: 'cs.responder' },
        ],
      }

    case '/admin/usuarios':
      return {
        titulo: 'Guia de Usuários',
        dicas: [
          {
            id: 'usuarios-lista',
            titulo: 'Lista de contas',
            texto: 'Todas as contas de clientes, com CPF, saldo, moedas e situação. Os filtros do alto reduzem a lista.',
            alvo: secao('Contas'),
          },
          {
            id: 'usuarios-ficha',
            titulo: 'Abrir a ficha',
            texto: 'Clicar numa conta abre a ficha completa, em abas: cadastro, financeiro, mercado, acervo, logística, atividade e notas.',
          },
          {
            id: 'usuarios-criar',
            titulo: 'Criar usuário',
            texto: 'Cria uma conta de cliente pelo painel. Confira o e-mail antes: é por ele que a conta entra.',
            exige: ['usuarios.criar'],
          },
        ],
      }

    case 'ficha-do-cliente':
      return {
        titulo: 'Guia da Ficha do cliente',
        dicas: [
          {
            id: 'ficha-abas',
            titulo: 'As abas da ficha',
            texto: 'Cadastro, Financeiro, Mercado, Acervo, Logística, Atividade e Notas. Tudo o que a plataforma sabe da conta está em uma delas.',
            alvo: { css: '.adm-main nav[aria-label="Abas da ficha"]' },
          },
          {
            id: 'ficha-notas',
            titulo: 'Notas internas',
            texto: 'Anotações da equipe sobre a conta. O cliente não vê.',
          },
          {
            id: 'ficha-acoes',
            titulo: 'Ações da conta',
            texto:
              'Ajustar saldo, marcar inadimplência, ativar ou desativar, trocar senha e quitar fatura. Ajuste de saldo vira um lançamento ' +
              '“ajuste” no livro de lançamentos e nunca some; login, senha e bloqueio passam pelo serviço de autenticação.',
            exige: ['usuarios.editar'],
          },
          {
            id: 'ficha-bancarios',
            titulo: 'Dados bancários',
            texto: 'Chave Pix e conta do cliente. Só quem tem esta permissão vê e edita.',
            exige: ['usuarios.dados_bancarios'],
          },
          {
            id: 'ficha-registros',
            titulo: 'Corrigir registros',
            texto: 'Editar oferta, envio ou plano de custódia da conta. Excluir é irreversível e tem permissão separada.',
            exige: ['registros.editar', 'registros.excluir'],
          },
        ],
      }

    case '/admin/moedas':
      return {
        titulo: 'Guia da Auditoria de moedas',
        dicas: [
          {
            id: 'moedas-tabela',
            titulo: 'O acervo inteiro',
            texto: 'Cada linha é uma moeda: dono, recibo com hash, caixa e resultado da análise. O filtro do alto reduz a lista.',
            alvo: tabela('Acervo'),
          },
          {
            id: 'moedas-corrente',
            titulo: 'Verificar a corrente',
            texto:
              'Reconta os hashes encadeados dos recibos e confere se a corrente está inteira. Se ela acusar problema, não tente consertar: avise o Gabriel.',
            alvo: botao('Verificar'),
          },
          { id: 'moedas-ficha', titulo: 'Ficha da moeda', texto: 'Abrir a linha leva à ficha: vídeo da análise, laudo, recibo e histórico da moeda.' },
        ],
      }

    case 'ficha-da-moeda':
      return {
        titulo: 'Guia da Ficha da moeda',
        dicas: [
          {
            id: 'moeda-video',
            titulo: 'Vídeo da análise',
            texto: 'Abre o vídeo gravado na bancada durante a análise.',
            alvo: botao('vídeo'),
          },
          {
            id: 'moeda-cliente',
            titulo: 'Ver como o cliente vê',
            texto: 'Mostra o recibo exatamente como o cliente o enxerga, para conferir o que ele recebeu.',
            alvo: { css: '.adm-main a', contem: 'cliente vê' },
          },
          {
            id: 'moeda-etiqueta',
            titulo: 'Etiqueta',
            texto: 'Reimprime a etiqueta de envio ou de retirada ligada a esta moeda.',
            exige: ['logistica.etiquetas'],
          },
        ],
      }

    case '/admin/resultados/financeiro':
      return {
        titulo: 'Guia do Financeiro',
        dicas: [
          {
            id: 'financeiro-dre',
            titulo: 'Resultado do período (DRE)',
            texto:
              'A receita sai do livro de lançamentos da plataforma. A DRE não tem alíquota escrita no código: os percentuais são os que o contador preencheu em Contábil.',
            alvo: secao('DRE'),
          },
          {
            id: 'financeiro-linhas',
            titulo: 'Receita por linha',
            texto: 'Quanto cada fonte de receita rendeu no período.',
            alvo: secao('Receita por linha'),
          },
          {
            id: 'financeiro-fluxo',
            titulo: 'Fluxo mês a mês',
            texto: 'Depósitos, saques e receita, mês por mês, para enxergar se o caixa dos clientes e o resultado andam juntos.',
            alvo: secao('Receita mês a mês'),
          },
          {
            id: 'financeiro-saques',
            titulo: 'Saques',
            texto: 'A fila de saques também aparece aqui, para quem fecha o caixa. As ações são as mesmas da tela de Saques.',
            exige: ['saques.ver'],
          },
        ],
      }

    case '/admin/resultados/controle':
      return {
        titulo: 'Guia do Controle financeiro',
        dicas: [
          {
            id: 'controle-periodo',
            titulo: 'Período',
            texto: 'Troque o período no alto: todos os blocos da tela seguem o mesmo recorte.',
            alvo: { css: '.adm-main [role="group"][aria-label="Período"]' },
          },
          {
            id: 'controle-faturamento',
            titulo: 'Do faturamento ao resultado',
            texto: 'Receita bruta, impostos, tarifas do Mercado Pago, custos e o resultado líquido, na ordem em que o dinheiro se divide.',
            alvo: secao('Do faturamento ao resultado'),
          },
          {
            id: 'controle-lancamentos',
            titulo: 'Lançamentos do período',
            texto: 'Os lançamentos manuais e os recorrentes que já caíram, com data, setor e valor.',
            alvo: tabela('Lançamentos manuais'),
          },
          {
            id: 'controle-recorrentes',
            titulo: 'Recorrentes e setores',
            texto: 'Despesas que se repetem todo mês (e receitas fixas), com a próxima data. Lançar vencidos grava de uma vez o que já deveria ter caído.',
            exige: ['contabil.lancar'],
          },
        ],
      }

    case '/admin/resultados/contabil':
      return {
        titulo: 'Guia do Contábil',
        dicas: [
          {
            id: 'contabil-lancamentos',
            titulo: 'Lançamentos do período',
            texto: 'O plano de contas e os lançamentos, os da plataforma e os manuais, lado a lado.',
            alvo: tabela('Lançamentos contábeis'),
          },
          {
            id: 'contabil-lancar',
            titulo: 'Lançar e estornar',
            texto: 'Lançamento manual não se apaga: erro se corrige estornando, e os dois ficam no histórico.',
            exige: ['contabil.lancar'],
          },
          {
            id: 'contabil-aliquotas',
            titulo: 'Alíquotas e parâmetros',
            texto:
              'Os percentuais que a DRE aplica. Quem preenche é o contador; a plataforma não escolhe imposto. Dúvida fiscal se resolve com o Gabriel, não aqui.',
            alvo: tabela('Alíquotas e parâmetros'),
          },
          {
            id: 'contabil-exportar',
            titulo: 'Exportações',
            texto: 'Baixe CSV ou XLSX, ou envie ao Google Sheets. Cada exportação fica registrada com quem fez e quando.',
            exige: ['resultados.exportar'],
            alvo: secao('Registro de exportações'),
          },
        ],
      }

    case '/admin/resultados/fiscal':
      return {
        titulo: 'Guia das Notas fiscais',
        dicas: [
          {
            id: 'fiscal-notas',
            titulo: 'Uma nota por fato',
            texto:
              'Cada comissão (de cada lado) e cada custódia paga gera uma NFS-e. Fatura em aberto não gera nota nem imposto. ' +
              'O frete dos Correios é despesa do cliente e não tem nota.',
            alvo: tabela('Notas fiscais (NFS-e)'),
          },
          {
            id: 'fiscal-sefin',
            titulo: 'Envio à Sefin Nacional',
            texto: 'A fila de notas que ainda não foram enviadas e o estado do envio. O certificado da empresa fica só no servidor.',
            alvo: secao('Envio à Sefin Nacional'),
          },
          {
            id: 'fiscal-reenviar',
            titulo: 'Reenviar',
            texto: 'Reprocessa nota rejeitada ou com erro e força o envio da fila. Emite documento fiscal de verdade: confirme antes de clicar.',
            exige: ['resultados.nfse'],
          },
        ],
      }

    case '/admin/resultados/kpis':
      return {
        titulo: 'Guia dos Indicadores',
        dicas: [
          { id: 'kpis-mercado', titulo: 'Mercado', texto: 'Negociações, volume e a receita de comissão do período, por tipo de moeda.', alvo: secao('Mercado') },
          { id: 'kpis-fila', titulo: 'Fila de ofertas agora', texto: 'Quantas ofertas de compra e de venda estão no livro neste instante, por tipo.', alvo: secao('Fila de ofertas agora') },
          { id: 'kpis-acervo', titulo: 'Acervo e contas', texto: 'Moedas por tipo e a ocupação do estoque físico, caixa a caixa.', alvo: secao('Acervo e contas') },
          { id: 'kpis-envios', titulo: 'Envios e análise', texto: 'O funil dos envios criados no período e as recusas da bancada por motivo.', alvo: secao('Envios e análise') },
          { id: 'kpis-faturas', titulo: 'Faturas de custódia', texto: 'Quanto está pago, a vencer e em atraso nas faturas de custódia e nos planos.', alvo: secao('Faturas de custódia') },
        ],
      }

    case '/admin/resultados/uso':
      return {
        titulo: 'Guia de Uso e auditoria',
        dicas: [
          { id: 'uso-paginas', titulo: 'Páginas mais abertas', texto: 'O que os clientes mais usam na plataforma, para decidir onde vale a pena melhorar.', alvo: secao('Páginas mais abertas') },
          { id: 'uso-pico', titulo: 'Horário de pico', texto: 'Quando a plataforma é mais usada, no horário de Brasília. Útil para escolher a hora de uma manutenção.', alvo: secao('Horário de pico') },
          { id: 'uso-jornada', titulo: 'Jornada até a primeira venda', texto: 'Em que passo os clientes novos mais desistem antes de vender a primeira moeda.', alvo: secao('Jornada até a primeira venda') },
          {
            id: 'uso-trilha',
            titulo: 'Trilha de auditoria',
            texto: 'Quem fez o quê, quando e em quais contas. Toda ação do painel entra aqui e não pode ser apagada.',
            exige: ['admin.auditoria'],
            alvo: secao('Trilha de auditoria'),
          },
        ],
      }

    case '/admin/configuracao':
      return {
        titulo: 'Guia da Configuração',
        dicas: [
          {
            id: 'config-secoes',
            titulo: 'Seções da configuração',
            texto: 'Cada seção reúne um grupo de valores. Troque de seção por este menu; o que você salva numa não altera as outras.',
            alvo: { css: '.adm-main .adm-ajustes-nav' },
          },
          {
            id: 'config-taxas',
            titulo: 'Taxas e parâmetros',
            texto:
              'Comissão, custódia, saque, retirada, limite de depósito, prazos dos Termos e canais de atendimento. O site inteiro passa a ler o valor novo; ' +
              'a mudança fica no histórico e publica uma nova versão da Tabela de Taxas ou dos Termos.',
            exige: ['config.taxas'],
          },
          {
            id: 'config-catalogo',
            titulo: 'Catálogo de moedas',
            texto: 'Os tipos de moeda aceitos na custódia e quais deles podem ser negociados no mercado.',
            exige: ['config.catalogo'],
          },
          {
            id: 'config-cautela',
            titulo: 'Cuidado com o que o cliente paga',
            texto:
              'Mudar taxa ou prazo altera cobrança de clientes de verdade. Valor e regra de cobrança se combinam com os sócios antes de mexer aqui.',
            exige: ['config.taxas'],
          },
          { id: 'config-so-ver', titulo: 'Só consultar', texto: 'Você vê os valores em vigor, mas editar é de quem tem a permissão de configuração.', semAcesso: 'config.taxas' },
        ],
      }

    case '/admin/equipe':
      return {
        titulo: 'Guia da Equipe e papéis',
        dicas: [
          {
            id: 'equipe-membros',
            titulo: 'Membros do painel',
            texto: 'Quem tem acesso, com papel, situação e data de cadastro. Trocar o papel muda na hora o que a pessoa vê e faz.',
            alvo: secao('Membros do painel'),
            exige: ['admin.membros'],
          },
          {
            id: 'equipe-ambiente',
            titulo: 'Contas da lista do ambiente',
            texto: 'Estas contas entram como desenvolvimento mesmo sem cadastro, para nunca trancar a equipe para fora do painel.',
            alvo: secao('Entram pela lista do ambiente'),
          },
          {
            id: 'equipe-papeis',
            titulo: 'Papéis e permissões',
            texto: 'O que cada papel pode ver e fazer. O menu esconde o que o papel não alcança, e cada ação confere a permissão de novo no servidor.',
            alvo: secao('Papéis e permissões'),
            exige: ['admin.papeis'],
          },
          {
            id: 'equipe-novo',
            titulo: 'Novo papel',
            texto: 'Crie um papel e marque as permissões dele. Dê o mínimo necessário: o que não está marcado, a pessoa não alcança.',
            alvo: secao('Novo papel'),
            exige: ['admin.papeis'],
          },
        ],
      }
  }
}

/**
 * O tutorial da página para quem tem estas permissões, ou `null` se a pessoa nem abre a página
 * (nesse caso o botão também não aparece). Dica que exige permissão que a pessoa não tem sai.
 */
export function tutorialDaPaginaAdmin(
  pagina: PaginaAdmin,
  permissoes: readonly string[],
): TutorialDePaginaAdmin | null {
  if (!podeVerPagina(pagina, permissoes)) return null
  const { titulo, dicas } = conteudoDaPagina(pagina)
  return {
    titulo,
    dicas: dicas.filter((d) => atende(permissoes, d.exige) && (d.semAcesso === undefined || !permissoes.includes(d.semAcesso))),
  }
}

/** Todas as dicas de uma página, sem filtrar por papel — só para o teste cruzar com as permissões do catálogo. */
export function dicasBrutasDaPaginaAdmin(pagina: PaginaAdmin): readonly DicaAdmin[] {
  return conteudoDaPagina(pagina).dicas
}

/** Os passos brutos do tour, sem filtrar por papel — idem. */
export function passosBrutosDoTourAdmin(): ReadonlyArray<{ id: string; exige?: Exigencia }> {
  return PASSOS_DO_TOUR
}
