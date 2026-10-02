/**
 * Tutorial guiado do cliente — o conteúdo e as regras puras.
 *
 * O QUE ESTE ARQUIVO É
 * --------------------
 * Tudo o que o tutorial DIZ e tudo o que ele DECIDE sem tocar em React, no navegador ou no banco:
 * os textos de cada tela, os passos do tour, as chaves em que o progresso é lembrado e a conta do
 * exemplo de custódia. Fica em `domain/` pelo mesmo motivo de `custodia-do-cliente.ts`: quem
 * escreve o texto precisa dos números reais, e número real vem de regra pura, testável, e não de
 * um valor digitado no meio de um componente.
 *
 * REGRA DE TEXTO
 * --------------
 * Quem lê é cliente, não programador. Nada de "estado", "gateway", "API" ou "livro de ordens"; e
 * valem as palavras aprovadas pelo jurídico (recibo, moeda, mercado) — nunca "token", "NFT",
 * "ativo" ou vocabulário de investimento. Todo valor em reais sai da Tabela de Taxas vigente
 * (`TabelaDeTaxas`) e todo prazo sai de `custody.ts`: um número inventado aqui ficaria errado no
 * dia em que a equipe mudasse a taxa em /admin/configuracao.
 *
 * O PROGRESSO É ESTADO DE TELA, NÃO DADO DE NEGÓCIO
 * -------------------------------------------------
 * Quais telas a pessoa já viu mora no navegador (localStorage), uma chave por conta e por tela.
 * Não há tabela nem migration: se a chave se perder, o pior que acontece é a pessoa rever uma
 * explicação. Sincronizar entre aparelhos exigiria servidor, e isso é decisão a ser tomada com o
 * Gabriel — ver o MD de execução.
 */

import { DIAS_CARENCIA_BLOQUEIO, DIAS_TOLERANCIA_FATURA, calcularVencimentoFatura } from '@/domain/custody'
import { custodiaMensalPorMoeda } from '@/domain/fees'
import type { TabelaDeTaxas } from '@/domain/fees'
import type { ResumoDaCustodia } from '@/domain/custodia-do-cliente'
import { brl } from '@/domain/money'
import type { FaturaCustodia, UserEmail } from '@/domain/types'

/* ------------------------------------------------------------------------- */
/* Âncoras: como o tutorial acha o elemento da tela sem as telas saberem dele */
/* ------------------------------------------------------------------------- */

/**
 * Como localizar o elemento de uma dica.
 *
 * Por texto e não por `data-` em cada página, de propósito: as telas do cliente são editadas por
 * várias frentes ao mesmo tempo (a Home, por exemplo, está em outra branch), e um atributo a mais
 * em cada uma seria conflito de merge certo. Se a tela mudar o texto e a âncora não achar nada, a
 * dica simplesmente não aparece — o tutorial nunca quebra a página.
 */
export interface Alvo {
  /** Seletor CSS dos candidatos. */
  css: string
  /** Só vale o candidato cujo texto contém isto (sem diferenciar maiúsculas). */
  contem?: string
  /** Em vez do candidato, destaca o ancestral que casa com este seletor (ex.: o painel inteiro). */
  subir?: string
  /** Em vez do candidato, destaca o elemento logo depois dele (ex.: o campo que o rótulo descreve). */
  proximo?: boolean
}

export interface Dica {
  id: string
  titulo: string
  texto: string
  /** Ausente: a dica é explicada no painel, sem marcar nada na tela. */
  alvo?: Alvo
}

/* ------------------------------------------------------------------------- */
/* Chaves de armazenamento                                                    */
/* ------------------------------------------------------------------------- */

/**
 * A versão faz parte da chave: subi-la faz TODAS as contas — inclusive as que já tinham visto o
 * tutorial — voltarem a vê-lo no próximo acesso, sem mexer em banco nenhum. É o botão de "refazer
 * para todo mundo" quando o tour ganha conteúdo que vale a pena mostrar de novo.
 *
 * v2 (01/10/2026): o tour ganhou a etapa de cadastro completo; todas as contas o revêem uma vez.
 * Conta criada depois disso não tem chave nenhuma e vê o tour no primeiro acesso.
 */
export const VERSAO_DO_TUTORIAL = 'v2'

const PREFIXO = `ro-tutorial:${VERSAO_DO_TUTORIAL}`

/** Uma chave por conta e por assunto — o e-mail entra para duas pessoas no mesmo navegador não dividirem progresso. */
export const chaveDoTour = (email: UserEmail): string => `${PREFIXO}:${email}:tour`
export const chaveDaPagina = (email: UserEmail, pagina: string): string =>
  `${PREFIXO}:${email}:pagina:${pagina}`
export const chaveContextual = (email: UserEmail, id: string): string =>
  `${PREFIXO}:${email}:contexto:${id}`

/**
 * A "página" de uma rota, para saber se há tutorial dela. Só as telas do caminho principal têm;
 * subtelas (`/conta/faturas`, `/mercado/comparacoes`) devolvem `null` e ficam sem o botão.
 */
export const PAGINAS_COM_TUTORIAL = [
  '/inicio',
  '/mercado',
  '/compras',
  '/vender',
  '/envios',
  '/recibos',
  '/conta',
] as const

export type PaginaComTutorial = (typeof PAGINAS_COM_TUTORIAL)[number]

export function paginaDoTutorial(pathname: string): PaginaComTutorial | null {
  const limpo = pathname.replace(/\/+$/, '') || '/'
  return (PAGINAS_COM_TUTORIAL as readonly string[]).includes(limpo) ? (limpo as PaginaComTutorial) : null
}

/* ------------------------------------------------------------------------- */
/* Números reais que os textos citam                                          */
/* ------------------------------------------------------------------------- */

/** 50 -> "0,5%": pontos-base da Tabela de Taxas escritos do jeito que o cliente lê. */
export function pctDeBp(bp: number): string {
  return `${(bp / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
}

/** "0,5% + R$ 1,00 por moeda" — a comissão de um dos lados, da Tabela vigente. */
export function textoDaComissao(bp: number, fixa: number): string {
  return `${pctDeBp(bp)} + ${brl(fixa)} por moeda`
}

/* ------------------------------------------------------------------------- */
/* Exemplo de custódia (só enquanto o tour está na etapa de custódia)         */
/* ------------------------------------------------------------------------- */

/** O código da fatura de exemplo — as telas o reconhecem para marcá-la como demonstração. */
export const ID_FATURA_DE_EXEMPLO = 'EXEMPLO-TUTORIAL'

/**
 * A fatura que o tour mostra "como se" a pessoa já tivesse uma moeda aceita esperando pagamento.
 *
 * Ela NUNCA entra em `AppState` nem passa por Server Action: vive só no contexto do tutorial,
 * enquanto a etapa está aberta, e as telas a somam na hora de desenhar. Por isso não grava nada,
 * não aparece para mais ninguém e some quando o tour fecha. O valor é uma moeda pela Tabela
 * vigente e o prazo é o de custódia real, para o exemplo ensinar o que de fato vai acontecer.
 */
export function faturaDeExemplo(email: UserEmail, taxas: TabelaDeTaxas, agora: number = Date.now()): FaturaCustodia {
  const d = new Date(agora)
  const competencia = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  return {
    id: ID_FATURA_DE_EXEMPLO,
    userEmail: email,
    competencia,
    quantidadeMoedas: 1,
    moedaIds: [],
    valorCents: custodiaMensalPorMoeda(1, taxas),
    status: 'pendente',
    dataEmissao: agora,
    dataVencimento: calcularVencimentoFatura(agora),
    dataPagamento: null,
    formaPagamento: null,
    paymentIntentId: null,
    origem: 'entrada_no_acervo',
  }
}

/**
 * O resumo da custódia com a fatura de exemplo somada, para o cartão "Minha custódia".
 * Só mexe no que o exemplo muda; o resto (pagas, planos) fica como veio.
 */
export function resumoComExemplo(r: ResumoDaCustodia, exemplo: FaturaCustodia): ResumoDaCustodia {
  return {
    ...r,
    moedasGuardadas: r.moedasGuardadas + exemplo.quantidadeMoedas,
    mensalidadeCents: r.mensalidadeCents + exemplo.valorCents,
    emAberto: [...r.emAberto, exemplo].sort((a, b) => a.dataVencimento - b.dataVencimento),
    emAbertoCents: r.emAbertoCents + exemplo.valorCents,
    proximoVencimento:
      r.proximoVencimento === null ? exemplo.dataVencimento : Math.min(r.proximoVencimento, exemplo.dataVencimento),
  }
}

/* ------------------------------------------------------------------------- */
/* Tour guiado                                                                */
/* ------------------------------------------------------------------------- */

export interface PassoDoTour {
  id: string
  /** Número da etapa (0 = boas-vindas; 1 a 5 = as cinco seções). */
  etapa: number
  /** Em que tela o balão aparece; `null` = onde a pessoa estiver. */
  rota: PaginaComTutorial | null
  titulo: string
  texto: string
  alvo?: Alvo
  /** Liga o exemplo de custódia enquanto este passo está na tela. */
  exemploDeCustodia?: boolean
  /** Botão extra do último balão: leva a pessoa direto ao que o passo pede. */
  acaoFinal?: 'completar-cadastro'
}

/** Quantas etapas o tour tem além da boas-vindas. */
export const TOTAL_DE_ETAPAS_DO_TOUR = 6

export interface ContextoDoTour {
  taxas: TabelaDeTaxas
  /** A conta já tem moeda cadastrada? Muda só o texto de Vendas. */
  temMoedas: boolean
  /** O cadastro completo já foi feito? Muda o texto da etapa final. */
  cadastroCompleto: boolean
}

export function passosDoTour({ taxas, temMoedas, cadastroCompleto }: ContextoDoTour): PassoDoTour[] {
  const porMoeda = brl(taxas.custodiaMensalPorMoeda)
  const comissaoCompra = textoDaComissao(taxas.comissaoCompradorBp, taxas.comissaoCompradorFixa)
  const comissaoVenda = textoDaComissao(taxas.comissaoVendedorBp, taxas.comissaoVendedorFixa)

  return [
    {
      id: 'boas-vindas',
      etapa: 0,
      rota: null,
      titulo: 'Bem-vindo ao Real Olímpico',
      texto:
        'Vamos fazer um passeio rápido de 6 etapas pelo caminho principal: Mercado, Compras, Vendas, Envios, Custódia e Cadastro. ' +
        'É só para você conhecer as telas — nada será comprado, vendido nem alterado na sua conta. Você pode pular quando quiser.',
    },

    /* ---------------- 1 · Mercado ---------------- */
    {
      id: 'mercado-ofertas-de-venda',
      etapa: 1,
      rota: '/mercado',
      alvo: { css: 'h3', contem: 'Ofertas de venda', subir: '.panel' },
      titulo: 'Mercado: ofertas de venda',
      texto:
        'Este bloco lista as moedas que outras pessoas colocaram à venda, com tipo, preço e quantidade. ' +
        'Dá para filtrar por faixa de preço e ver mais ofertas no fim da lista.',
    },
    {
      id: 'mercado-ofertas-de-compra',
      etapa: 1,
      rota: '/mercado',
      alvo: { css: 'h3', contem: 'Ofertas de compra', subir: '.panel' },
      titulo: 'Mercado: ofertas de compra',
      texto:
        'Aqui estão os pedidos de quem quer comprar e o preço máximo que aceita pagar. ' +
        'É o outro lado do mercado: quem vende olha este bloco para saber quanto pagariam pela moeda.',
    },
    {
      id: 'mercado-compra-facilitada',
      etapa: 1,
      rota: '/mercado',
      alvo: { css: 'button.btn', contem: 'Comprar' },
      titulo: 'Compra facilitada',
      texto:
        'Para comprar uma moeda que já está à venda, é só clicar em Comprar na oferta. Uma janela de confirmação mostra o total ' +
        `com a comissão (${comissaoCompra}) e você escolhe como pagar: com o saldo da conta ou direto por Pix ou cartão, ` +
        'sem precisar depositar antes. Nada acontece até você confirmar.',
    },

    /* ---------------- 2 · Compras ---------------- */
    {
      id: 'compras-fazer-oferta',
      etapa: 2,
      rota: '/compras',
      alvo: { css: 'h3', contem: 'Fazer oferta de compra', subir: '.panel' },
      titulo: 'Compras: fazer uma oferta',
      texto:
        'Aqui você diz qual moeda quer, quantas e o preço máximo que aceita pagar. ' +
        'Você não é obrigado a comprar nada: pode só olhar a tela e conhecer as opções.',
    },
    {
      id: 'compras-pagamento',
      etapa: 2,
      rota: '/compras',
      alvo: { css: '.field-lbl', contem: 'Como você quer pagar', proximo: true },
      titulo: 'Opções de pagamento',
      texto:
        'Com saldo: o valor só sai da sua conta quando a compra acontece. Pré-pago: você paga agora e a compra acontece sozinha ' +
        'quando alguém vender no seu preço — se ninguém vender, o dinheiro continua seu.',
    },
    {
      id: 'compras-negociacao-automatica',
      etapa: 2,
      rota: '/compras',
      alvo: { css: '.note', contem: 'acontece automaticamente' },
      titulo: 'Negociação automática',
      texto:
        'Se já existir uma oferta de venda no seu preço ou abaixo dele, a compra acontece na hora, ao publicar. ' +
        'Se não existir, sua oferta fica no mercado esperando: quem ofereceu o melhor preço é atendido primeiro e, ' +
        `em preços iguais, quem chegou antes. A comissão é de ${comissaoCompra}.`,
    },

    /* ---------------- 3 · Vendas ---------------- */
    {
      id: 'vender-anuncio',
      etapa: 3,
      rota: '/vender',
      alvo: { css: 'h3', contem: 'Detalhes do anúncio', subir: '.panel' },
      titulo: 'Vendas: anunciar uma moeda',
      texto:
        'Aqui você anuncia uma moeda sua: escolhe o tipo, quantas quer vender e o preço por unidade. ' +
        'Assim como em Compras, nada é obrigatório — você pode só conhecer a tela.',
    },
    {
      id: 'vender-automatica',
      etapa: 3,
      rota: '/vender',
      titulo: 'Como a venda acontece',
      texto:
        'A negociação é automática: se já houver um pedido de compra no seu preço ou acima dele, a venda acontece na hora. ' +
        `Se não, seu anúncio fica visível no mercado até alguém comprar ou até você remover. A comissão é de ${comissaoVenda}, ` +
        'descontada do que você recebe.',
    },
    {
      id: 'vender-proximo-passo',
      etapa: 3,
      rota: '/vender',
      titulo: temMoedas ? 'Suas moedas já estão prontas' : 'Seu próximo passo: Envios',
      texto: temMoedas
        ? 'Você já tem moedas sob guarda, então pode anunciá-las aqui. Para colocar mais moedas no mercado, use a seção Envios.'
        : 'Como você ainda não tem moedas cadastradas, não há o que anunciar por enquanto. O próximo passo é a seção Envios: ' +
          'você manda a moeda para a nossa guarda e ela fica disponível para vender.',
    },

    /* ---------------- 4 · Envios ---------------- */
    {
      id: 'envios-dados',
      etapa: 4,
      rota: '/envios',
      alvo: { css: 'h3', contem: 'Dados do envio', subir: '.panel' },
      titulo: 'Envios: mandar sua moeda',
      texto:
        'Você informa o tipo de moeda, o ano e a quantidade, e gera um protocolo de envio. Depois posta a moeda pelos Correios, ' +
        'com código de rastreio, e acompanha tudo por esta tela.',
    },
    {
      id: 'envios-seguranca',
      etapa: 4,
      rota: '/envios',
      alvo: { css: 'h3', contem: 'Instruções de segurança', subir: '.panel' },
      titulo: 'Como embalar e enviar',
      texto:
        'Envie em envelope lacrado, com proteção contra impacto e com rastreio e seguro. ' +
        'Isso preserva a conservação da moeda até a nossa equipe conferir.',
    },
    {
      id: 'envios-avaliacao',
      etapa: 4,
      rota: '/envios',
      titulo: 'Avaliação e recibo',
      texto:
        'Quando a moeda chega, a nossa equipe a avalia. Estando tudo certo, é emitido o recibo de custódia — ' +
        'e é o recibo que libera a moeda para negociar. Sem recibo, a moeda não vai ao mercado.',
    },

    /* ---------------- 5 · Custódia ---------------- */
    {
      id: 'custodia-valores',
      etapa: 5,
      rota: '/envios',
      exemploDeCustodia: true,
      alvo: { css: '.note, .warn-box', contem: 'Custódia a pagar' },
      titulo: 'Custódia: quanto custa',
      texto:
        `Depois que a moeda é aceita, ela fica guardada com a gente por ${porMoeda} por moeda ao mês, sem prazo mínimo. ` +
        `A fatura vence em ${DIAS_TOLERANCIA_FATURA} dias — dentro desse prazo nada fica bloqueado. ` +
        'O aviso ao lado é só um exemplo, como se você já tivesse uma moeda esperando pagamento. Ele some quando o tutorial fechar.',
    },
    {
      id: 'custodia-conta',
      etapa: 5,
      rota: '/conta',
      exemploDeCustodia: true,
      alvo: { css: 'h3', contem: 'Minha custódia', subir: '.panel' },
      titulo: 'Custódia na sua conta',
      texto:
        'Em Minha conta você acompanha o valor mensal, o prazo para pagar e o botão de pagamento. ' +
        `Se a fatura passar do vencimento por mais de ${DIAS_CARENCIA_BLOQUEIO} dia, venda e retirada ficam bloqueadas até o pagamento — ` +
        'por isso vale pagar dentro do prazo. Este cartão também é só um exemplo.',
    },

    /* ---------------- 6 · Cadastro completo ---------------- */
    cadastroCompleto
      ? {
          id: 'cadastro-por-que',
          etapa: 6,
          rota: '/conta',
          titulo: 'Seu cadastro está completo',
          texto:
            'Quase tudo no Real Olímpico — depositar, comprar, vender, enviar moeda e sacar — pede o cadastro completo, e o seu já está em dia, então nada fica travado. ' +
            'Se um dado mudar, é só atualizá-lo em Configurações rápidas, na opção Dados pessoais.',
        }
      : {
          id: 'cadastro-por-que',
          etapa: 6,
          rota: '/conta',
          alvo: { css: '.note', contem: 'Complete seu cadastro' },
          titulo: 'Falta um passo: complete seu cadastro',
          texto:
            'Quase tudo no Real Olímpico — depositar, comprar, vender, enviar moeda e sacar — só libera depois do cadastro completo. ' +
            'Ele identifica o titular da conta: o recibo, os pagamentos e os saques ficam em nome de quem de fato é o dono. ' +
            'Você informa CPF, nome, data de nascimento, telefone, endereço e uma chave Pix ou conta para receber saques. É feito uma vez só e leva poucos minutos.',
        },
    {
      id: 'cadastro-onde',
      etapa: 6,
      rota: '/conta',
      alvo: { css: '.qk-name', contem: 'Dados pessoais', subir: '.qk-row' },
      titulo: 'Onde fica o cadastro',
      texto: cadastroCompleto
        ? 'Em Minha conta, na lista de Configurações rápidas, a opção Dados pessoais abre o seu cadastro para você conferir e atualizar quando precisar.'
        : 'Em Minha conta você encontra o botão Completar cadastro, no aviso do topo, e também a opção Dados pessoais, em Configurações rápidas. ' +
          'O formulário também é oferecido quando você tenta depositar, comprar ou enviar uma moeda sem ele.',
    },
    {
      id: 'fim',
      etapa: 6,
      rota: null,
      titulo: cadastroCompleto ? 'Tudo pronto' : 'Tudo pronto — falta só o cadastro',
      texto: cadastroCompleto
        ? 'Esse foi o caminho principal. Em qualquer tela, o botão Ver tutorial desta página, no canto de baixo, explica cada botão sem escurecer nada. ' +
          'E se quiser refazer este passeio, o link Refazer o tour guiado fica nesse mesmo painel.'
        : 'Esse foi o caminho principal. Para começar a usar tudo isso, complete o cadastro agora — leva poucos minutos. ' +
          'Em qualquer tela, o botão Ver tutorial desta página, no canto de baixo, explica cada botão, e o link Refazer o tour guiado fica nesse mesmo painel.',
      acaoFinal: cadastroCompleto ? undefined : 'completar-cadastro',
    },
  ]
}

/* ------------------------------------------------------------------------- */
/* Tutorial por página (sem escurecer a tela)                                 */
/* ------------------------------------------------------------------------- */

export interface TutorialDePagina {
  titulo: string
  dicas: Dica[]
}

export function tutorialDaPagina(pagina: PaginaComTutorial, taxas: TabelaDeTaxas): TutorialDePagina {
  const comissaoCompra = textoDaComissao(taxas.comissaoCompradorBp, taxas.comissaoCompradorFixa)
  const comissaoVenda = textoDaComissao(taxas.comissaoVendedorBp, taxas.comissaoVendedorFixa)
  const porMoeda = brl(taxas.custodiaMensalPorMoeda)

  switch (pagina) {
    case '/inicio':
      return {
        titulo: 'Guia do Início',
        dicas: [
          {
            id: 'inicio-indicadores',
            titulo: 'Indicadores do mercado',
            texto: 'Os cartões do topo mostram quantas moedas estão no mercado, o volume negociado e outros números que se atualizam sozinhos.',
            alvo: { css: '.stats' },
          },
          {
            id: 'inicio-comprar',
            titulo: 'Comprar moeda',
            texto: 'Abre a tela de Compras, onde você faz uma oferta dizendo quantas moedas quer e quanto aceita pagar.',
            alvo: { css: '.blocks h3', contem: 'Comprar moeda', subir: 'a, .block' },
          },
          {
            id: 'inicio-vender',
            titulo: 'Vender moeda',
            texto: 'Abre a tela de Vendas, para anunciar uma moeda sua que já esteja sob guarda.',
            alvo: { css: '.blocks h3', contem: 'Vender moeda', subir: 'a, .block' },
          },
          {
            id: 'inicio-enviar',
            titulo: 'Enviar moeda para custódia',
            texto: 'O primeiro passo para quem ainda não tem moedas aqui: você manda a moeda pelos Correios e ela passa a ficar guardada.',
            alvo: { css: '.blocks h3', contem: 'Enviar moeda para custódia', subir: 'a, .block' },
          },
          {
            id: 'inicio-recibos',
            titulo: 'Meus recibos',
            texto: 'Lista os recibos das suas moedas guardadas. É o recibo que comprova a guarda e libera a negociação.',
            alvo: { css: '.blocks h3', contem: 'Meus recibos', subir: 'a, .block' },
          },
          {
            id: 'inicio-depositar',
            titulo: 'Depositar em conta',
            texto: 'Coloca saldo na sua conta para comprar com um clique. Nesta fase de testes o depósito é simulado.',
            alvo: { css: '.blocks h3', contem: 'Depositar em conta', subir: 'a, .block, div' },
          },
          {
            id: 'inicio-mercado',
            titulo: 'Mercado',
            texto: 'Mostra tudo o que está à venda e sendo procurado agora, com gráficos de preço.',
            alvo: { css: '.blocks h3', contem: 'Mercado', subir: 'a, .block' },
          },
        ],
      }

    case '/mercado':
      return {
        titulo: 'Guia do Mercado',
        dicas: [
          {
            id: 'mercado-minhas-ofertas',
            titulo: 'Minhas ofertas no mercado',
            texto: 'No topo ficam as ofertas que você mesmo publicou, com os botões para editar ou retirar cada uma.',
            alvo: { css: 'h3', contem: 'Minhas ofertas', subir: '.panel' },
          },
          {
            id: 'mercado-venda',
            titulo: 'Ofertas de venda',
            texto: 'Moedas que outras pessoas estão vendendo. Clique no título para abrir ou fechar o bloco e use os filtros de preço para refinar a lista.',
            alvo: { css: 'h3', contem: 'Ofertas de venda', subir: '.panel' },
          },
          {
            id: 'mercado-comprar',
            titulo: 'Botão Comprar',
            texto: `Compra a quantidade escolhida de uma oferta. Antes de cobrar, uma janela mostra o total com a comissão (${comissaoCompra}) e deixa você escolher entre saldo da conta ou Pix e cartão.`,
            alvo: { css: 'button.btn', contem: 'Comprar' },
          },
          {
            id: 'mercado-compra',
            titulo: 'Ofertas de compra',
            texto: 'Pedidos de quem quer comprar e o preço máximo de cada um. Se você tem moeda guardada, é aqui que vê quanto estão dispostos a pagar.',
            alvo: { css: 'h3', contem: 'Ofertas de compra', subir: '.panel' },
          },
          {
            id: 'mercado-historico',
            titulo: 'Preço médio histórico',
            texto: 'O gráfico mostra como o preço médio das negociações mudou no período escolhido nas abas acima dele.',
            alvo: { css: 'h3', contem: 'Preço médio histórico', subir: '.panel' },
          },
          {
            id: 'mercado-comparacao',
            titulo: 'Comparação simples',
            texto: 'Coloca o preço do Real Olímpico ao lado de outras referências do mercado. Clique em uma linha para ver a comparação completa.',
            alvo: { css: 'h3', contem: 'Comparação simples', subir: '.panel' },
          },
        ],
      }

    case '/compras':
      return {
        titulo: 'Guia de Compras',
        dicas: [
          {
            id: 'compras-tipo',
            titulo: 'Moeda que deseja comprar',
            texto: 'Escolha o tipo de moeda. Cada tipo tem o seu próprio mercado, e o número ao lado mostra quantas ofertas de venda existem agora.',
            alvo: { css: '.panel', contem: 'Moeda que deseja comprar' },
          },
          {
            id: 'compras-quantidade',
            titulo: 'Quantidade e preço',
            texto: 'Diga quantas moedas quer e o preço máximo por unidade. Você nunca paga mais do que esse máximo.',
            alvo: { css: '.field-lbl', contem: 'Quantidade desejada', proximo: true },
          },
          {
            id: 'compras-pagamento',
            titulo: 'Como você quer pagar',
            texto: 'Com saldo: o valor sai da conta só quando a compra acontece. Pré-pago: você paga agora e a compra acontece sozinha quando alguém vender no seu preço.',
            alvo: { css: '.field-lbl', contem: 'Como você quer pagar', proximo: true },
          },
          {
            id: 'compras-publicar',
            titulo: 'Publicar oferta',
            texto: `Coloca a oferta no mercado. Se já houver venda no seu preço ou abaixo, a compra acontece na hora. A comissão é de ${comissaoCompra}.`,
            alvo: { css: 'button.btn-gold', contem: 'oferta' },
          },
          {
            id: 'compras-mercado',
            titulo: 'Média e últimas negociações',
            texto: 'À direita você vê a média dos últimos 7 dias e as últimas negociações do tipo escolhido — um bom guia para escolher o seu preço.',
            alvo: { css: 'h3', contem: 'Mercado', subir: '.panel' },
          },
        ],
      }

    case '/vender':
      return {
        titulo: 'Guia de Vendas',
        dicas: [
          {
            id: 'vender-tipo',
            titulo: 'Tipo de moeda a vender',
            texto: 'Escolha o tipo da moeda. O número ao lado mostra quantas você tem livres para anunciar.',
            alvo: { css: '.panel', contem: 'Tipo de moeda a vender' },
          },
          {
            id: 'vender-quantidade',
            titulo: 'Quantidade a ofertar',
            texto: 'Quantas moedas deste tipo entram no anúncio. Não passa do que você tem livre.',
            alvo: { css: 'label, .field-lbl', contem: 'Quantidade a ofertar', proximo: true },
          },
          {
            id: 'vender-preco',
            titulo: 'Preço unitário de venda',
            texto: `O valor que você quer por moeda. Do que a venda render, descontamos a comissão de ${comissaoVenda}.`,
            alvo: { css: 'label, .field-lbl', contem: 'Preço unitário de venda', proximo: true },
          },
          {
            id: 'vender-publicar',
            titulo: 'Publicar anúncio',
            texto: 'Coloca o anúncio no mercado para todas as contas verem, até ser removido ou concluído.',
            alvo: { css: 'button.btn-gold', contem: 'Publicar anúncio' },
          },
          {
            id: 'vender-escolha',
            titulo: 'Escolha as moedas',
            texto: 'Se quiser anunciar uma moeda específica, e não qualquer uma do tipo, marque aqui exatamente quais entram.',
            alvo: { css: 'h3', contem: 'Escolha as moedas', subir: '.panel' },
          },
        ],
      }

    case '/envios':
      return {
        titulo: 'Guia de Envios',
        dicas: [
          {
            id: 'envios-dados',
            titulo: 'Dados do envio',
            texto: 'Informe o tipo de moeda, o ano e a quantidade. Com isso geramos o protocolo do seu envio.',
            alvo: { css: 'h3', contem: 'Dados do envio', subir: '.panel' },
          },
          {
            id: 'envios-modalidade',
            titulo: 'Modalidade dos Correios',
            texto: 'Escolha a forma de postagem. O preço do frete é calculado e mostrado antes de você continuar.',
            alvo: { css: '.field-lbl', contem: 'Modalidade dos Correios', proximo: true },
          },
          {
            id: 'envios-continuar',
            titulo: 'Continuar',
            texto: 'Leva ao resumo para você conferir tudo antes de gerar o protocolo. Nada é cobrado nesta etapa.',
            alvo: { css: 'button.btn-gold', contem: 'Continuar' },
          },
          {
            id: 'envios-seguranca',
            titulo: 'Instruções de segurança',
            texto: 'Como embalar e enviar: envelope lacrado, proteção contra impacto e rastreio com seguro.',
            alvo: { css: 'h3', contem: 'Instruções de segurança', subir: '.panel' },
          },
          {
            id: 'envios-acompanhamento',
            titulo: 'Acompanhamento',
            texto: 'Depois da postagem, esta tela mostra em que etapa está cada envio: a caminho, em análise ou com o recibo emitido.',
          },
        ],
      }

    case '/recibos':
      return {
        titulo: 'Guia de Recibos',
        dicas: [
          {
            id: 'recibos-moedas',
            titulo: 'Moedas em custódia',
            texto: 'Cada cartão é uma moeda sua sob guarda, com o recibo que comprova isso. Clique em um cartão para ver o recibo completo.',
            alvo: { css: 'h3', contem: 'Moedas em custódia', subir: '.panel' },
          },
          {
            id: 'recibos-custodia',
            titulo: 'Minha custódia',
            texto: `Resume o que você paga pela guarda (${porMoeda} por moeda ao mês), quando vence e o botão para pagar.`,
            alvo: { css: 'h3', contem: 'Minha custódia', subir: '.panel' },
          },
          {
            id: 'recibos-auditoria',
            titulo: 'Auditoria de estoque',
            texto: 'Um resumo para conferir quantas moedas existem e onde cada uma está.',
            alvo: { css: 'h3', contem: 'Auditoria de estoque', subir: '.panel' },
          },
          {
            id: 'recibos-resumo',
            titulo: 'Resumo e retirada',
            texto: 'Do lado direito ficam os totais do acervo e o atalho para pedir a retirada física de uma moeda.',
            alvo: { css: 'h3', contem: 'Resumo', subir: '.panel' },
          },
        ],
      }

    case '/conta':
      return {
        titulo: 'Guia de Minha conta',
        dicas: [
          {
            id: 'conta-moedas',
            titulo: 'Minhas moedas',
            texto: 'As moedas que estão sob guarda na sua conta, com o valor estimado de cada uma.',
            alvo: { css: 'h3', contem: 'Minhas moedas', subir: '.panel' },
          },
          {
            id: 'conta-custodia',
            titulo: 'Minha custódia',
            texto: `O valor mensal da guarda (${porMoeda} por moeda), o prazo para pagar e o botão de pagamento. Aparece quando há moeda guardada.`,
            alvo: { css: 'h3', contem: 'Minha custódia', subir: '.panel' },
          },
          {
            id: 'conta-config',
            titulo: 'Configurações rápidas',
            texto: 'Atalhos para completar o cadastro, depositar saldo e abrir as faturas de custódia e o extrato.',
            alvo: { css: 'h3', contem: 'Configurações rápidas', subir: '.panel' },
          },
          {
            id: 'conta-documentos',
            titulo: 'Termos, taxas e privacidade',
            texto: 'Os documentos vigentes do Real Olímpico: termos de uso, tabela de taxas e política de privacidade.',
            alvo: { css: 'a', contem: 'Termos' },
          },
        ],
      }
  }
}

/* ------------------------------------------------------------------------- */
/* Tutoriais que nascem de uma ação (aparecem quando a função aparece)        */
/* ------------------------------------------------------------------------- */

export interface TutorialContextual {
  id: string
  titulo: string
  /** O elemento cuja presença dispara o tutorial. Sem ele na tela, nada acontece. */
  gatilho: Alvo
  dicas: Dica[]
}

/**
 * Funções que só existem depois de uma ação do cliente. A custódia a pagar é o caso pedido: ela
 * só aparece depois que a moeda foi enviada e aceita, então um tutorial de página (que dispara
 * na primeira visita) nunca a explicaria — o aviso nem estaria na tela.
 *
 * O gatilho é o PRÓPRIO elemento: o tutorial abre na primeira vez que ele existir na tela, em
 * qualquer rota. A fatura de exemplo do tour não dispara este tutorial (ver `ocultoNoExemplo`).
 */
export function tutoriaisContextuais(taxas: TabelaDeTaxas): TutorialContextual[] {
  const porMoeda = brl(taxas.custodiaMensalPorMoeda)
  return [
    {
      id: 'custodia-a-pagar',
      titulo: 'Sua moeda foi aceita',
      gatilho: { css: '.note, .warn-box', contem: 'Custódia a pagar' },
      dicas: [
        {
          id: 'ctx-custodia-aviso',
          titulo: 'Custódia a pagar',
          texto:
            `Sua moeda passou na avaliação e já está sob guarda. A custódia custa ${porMoeda} por moeda ao mês e a fatura vence em ${DIAS_TOLERANCIA_FATURA} dias. ` +
            'Dentro do prazo, nada fica bloqueado. Pagar mantém os recibos livres para vender e retirar.',
          alvo: { css: '.note, .warn-box', contem: 'Custódia a pagar' },
        },
        {
          id: 'ctx-custodia-pagar',
          titulo: 'Pagar agora',
          texto: 'O link Pagar agora abre as faturas de custódia, onde você paga com saldo, Pix ou cartão.',
          alvo: { css: 'a', contem: 'Pagar agora' },
        },
      ],
    },
    {
      id: 'custodia-vencida',
      titulo: 'Custódia vencida',
      gatilho: { css: '.note, .warn-box', contem: 'Custódia vencida' },
      dicas: [
        {
          id: 'ctx-vencida-aviso',
          titulo: 'Custódia vencida',
          texto:
            'O prazo da fatura passou. Enquanto ela estiver aberta, os recibos ficam bloqueados para venda e para retirada física. ' +
            'Pagando, tudo é liberado na hora.',
          alvo: { css: '.note, .warn-box', contem: 'Custódia vencida' },
        },
      ],
    },
  ]
}
