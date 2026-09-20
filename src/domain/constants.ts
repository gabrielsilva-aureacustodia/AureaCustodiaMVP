/**
 * Constantes e catálogos da Áurea Custódia.
 *
 * Port fiel do bloco de configuração do MVP monolítico (aurea-mvp-teste.html,
 * linhas 751-792). Nada aqui é derivado nem calculado: são os números e textos
 * combinados com o negócio, e mudar qualquer um deles muda o produto.
 */

import { TAXAS_PADRAO } from '@/domain/fees'
import type { CoinType, Cents } from '@/domain/types'

/**
 * Chave única de persistência do estado compartilhado.
 *
 * O MVP usava 'aurea-market-v4'; a versão Next.js subiu para v5 justamente para
 * NÃO herdar o banco antigo — o formato do estado mudou e a migração seria mais
 * cara que recomeçar limpo. A variável de ambiente existe para que preview e
 * produção na Vercel possam viver em bancos separados sem recompilar.
 *
 * v6 (mercado multi-ativo): ofertas, ordens e negociações passaram a carregar
 * `tipoMoeda`, e o estado ganhou `deposits`. Um registro gravado em v5 não tem
 * esses campos — um bid antigo sem tipo jamais casaria com nada e ficaria preso
 * no livro para sempre. Recomeçar do seed é mais honesto que migrar dado de
 * demonstração.
 *
 * v7 (terminologia do jurídico, D-4 de 10/09/2026): o campo `Coin.nft` virou
 * `Coin.recibo` e o código do recibo trocou o prefixo 'NFT-' por 'REC-'. Uma
 * moeda gravada em v6 chegaria sem `recibo` e derrubaria toda tela que lê o
 * certificado.
 *
 * v8 (a custódia antiga sai, D-3 concluída em 11/09/2026): `custodyCharges`
 * deixou de existir em `AppState`. Quem cobra passou a ser só a fatura mensal
 * (`faturasCustodia`). Um estado gravado em v7 traz um campo que o código não
 * lê mais e não traz as faturas — e o extrato, o livro-razão e a auditoria
 * liam dali. Migration 013 derruba a tabela `aurea.custody_charges`.
 *
 * ATENÇÃO — esta chave só zera o estado no store EM MEMÓRIA e no blob antigo.
 * Com Postgres o estado vive em tabelas e `STORE_KEY` não as apaga; ali quem
 * faz a troca são as migrations 005 (renomeia `aurea.nfts` para
 * `aurea.recibos`) e 006 (reescreve o prefixo dos códigos já gravados). Subir a
 * versão aqui e esquecer a migration deixa o banco com o formato velho e a
 * aplicação lendo o novo — foi exatamente o que aconteceu em 10/09/2026, e o
 * sintoma foi `relation "aurea.recibos" does not exist` no login.
 */
export const STORE_KEY: string = process.env.AUREA_STORE_KEY ?? 'aurea-market-v8'

/**
 * Chave do banco de cotações BTC/ETH/USDT que alimenta a tela de comparações.
 *
 * É uma SEGUNDA chave, separada do estado de negócio, exatamente como no MVP
 * (CRYPTO_KEY, linha 2233). A separação importa: a série de cotações é
 * reconstruída de fonte externa e pode ser descartada a qualquer momento sem
 * risco, enquanto o estado é o registro de custódia e negociação. Misturar os
 * dois faria uma falha da CoinGecko tocar o documento que guarda os saldos.
 */
export const CRYPTO_KEY: string = 'aurea-crypto-v1'

/**
 * Comissão percentual da corretagem: derivada de TAXAS_PADRAO (src/domain/fees.ts).
 */
export const FEE_PCT: number = TAXAS_PADRAO.comissaoVendedorBp / 10000

/**
 * Parcela fixa da comissão, somada ao percentual: derivada de TAXAS_PADRAO (src/domain/fees.ts).
 */
export const FEE_FIXED: Cents = TAXAS_PADRAO.comissaoVendedorFixa

/**
 * Ciclo de sincronização entre contas, em ms. As sessões são independentes e
 * compartilham um único estado; 10s é o intervalo em que cada uma relê o banco
 * para enxergar o que as outras fizeram.
 */
export const SYNC_MS: number = 10000

/**
 * Logos oficiais da marca (arquivos enviados pelo Gabriel). No MVP vinham
 * embutidas em base64 dentro do HTML; aqui são estáticos servidos de /public.
 * NUNCA gerar logo alternativa — estas são as versões aprovadas.
 */
export const LOGO_AUREA: string = '/brand/logo-aurea.webp'
export const LOGO_REAL: string = '/brand/logo-real-olimpico.webp'

/**
 * As duas versões que a interface usa desde a virada de marca de 20/09/2026.
 *
 * `LOGO_REAL` acima é a PRANCHA DE IDENTIDADE inteira — o painel principal mais as
 * seis variações em miniatura, lado a lado. Ela serve como referência da marca, mas
 * dentro de um box de 72px vira um borrão: era esse arquivo que a tela de
 * configurações da conta exibia. As duas constantes abaixo são recortes do painel
 * principal DESSA MESMA prancha, sem redesenho nenhum — só enquadramento.
 *
 * Qual usar: `LOGO_REAL_MARCA` quando o logo aparece sozinho e precisa dizer o nome
 * (telas de entrada, cadastro, nova senha, entrada do painel). `LOGO_REAL_EMBLEMA`
 * quando o nome já está escrito ao lado em texto — barra lateral, cabeçalho da
 * landing, rodapé —, porque ali repetir o letreiro só rouba altura.
 *
 * ATENÇÃO à proporção: a marca completa é 234x216 (levemente mais larga que alta),
 * então `<Image width={130} height={120}>`. Forçar 120x120 achata o letreiro.
 * O emblema é quadrado e aceita width = height.
 */
export const LOGO_REAL_MARCA: string = '/brand/logo-real-olimpico-marca.webp'
export const LOGO_REAL_EMBLEMA: string = '/brand/logo-real-olimpico-emblema.webp'

/**
 * A moeda-referência do marketplace: a primeira a ser negociada e a que define
 * a "cara" da plataforma. Boa parte da interface fala dela no singular, com
 * nome curto, nome completo e ficha técnica.
 *
 * ATENÇÃO — ela NÃO é mais a única negociável (ver COIN_TYPES). Onde o código
 * precisar saber "este tipo pode ir ao mercado?", a pergunta é
 * `isNegociavel(tipo)`, nunca `tipo === COIN.name`. Comparar com COIN.name era
 * o atalho válido enquanto existia um ativo só, e é justamente o que passou a
 * excluir a Moeda dos Direitos Humanos.
 */
export const COIN: { name: string; full: string; detail: string } = {
  name: 'Entrega da Bandeira Olímpica',
  full: 'R$ 1 — Entrega da Bandeira Olímpica (2012)',
  detail: 'Londres 2012 – Rio 2016 · Tiragem 2.016.000 · Bimetálica 27mm · 7g',
}

/**
 * As pastas do catálogo, na ordem em que aparecem nas telas de compra e venda.
 *
 * A ordem é de produto, não alfabética: a pasta olímpica vem primeiro porque é
 * a origem da plataforma e concentra o acervo. Categoria que não estiver nesta
 * lista ainda aparece — cai no fim, ver `categoriasDoCatalogo()`.
 */
export const CATEGORIA_OLIMPICAS = 'Moedas Olímpicas'
export const CATEGORIA_DIREITOS_HUMANOS = 'Moeda dos Direitos Humanos'

export const CATEGORIAS: readonly string[] = [
  CATEGORIA_OLIMPICAS,
  CATEGORIA_DIREITOS_HUMANOS,
]

/**
 * Catálogo de moedas comemorativas brasileiras aceitas em custódia.
 *
 * NEGOCIABILIDADE (decisão dos sócios, agosto/2026): são negociáveis a
 * "Entrega da Bandeira Olímpica" — a primeira, e é por isso que a ordem importa
 * — e a "Direitos Humanos". As demais entram em custódia normalmente, mas ainda
 * não aparecem em Comprar/Vender.
 *
 * A ficha de `detail` é o texto que o cartão do lote exibe. Antes existia uma só
 * (COIN.detail) porque só havia um ativo à venda; agora cada tipo carrega a sua,
 * senão a vitrine descreveria toda moeda como se fosse a Bandeira de 2012.
 */
export const COIN_TYPES: CoinType[] = [
  {
    key: 'Entrega da Bandeira Olímpica',
    anoPadrao: 2012,
    tiragem: '2.016.000',
    categoria: CATEGORIA_OLIMPICAS,
    negociavel: true,
    detail: 'Londres 2012 – Rio 2016 · Tiragem 2.016.000 · Bimetálica 27mm · 7g',
    pesoPadraoMg: 7000,
  },
  {
    // Tiragem de 600.000 — a menor do Plano Real, e o motivo de ela valer
    // muito mais que as olímpicas de 2016. Emitida em 10/12/1998 pelo BCB para
    // o cinquentenário da Declaração Universal dos Direitos Humanos.
    key: 'Direitos Humanos',
    anoPadrao: 1998,
    tiragem: '600.000',
    categoria: CATEGORIA_DIREITOS_HUMANOS,
    negociavel: true,
    detail: 'Cinquentenário da Declaração — 1998 · Tiragem 600.000 · Bimetálica 27mm · 7,84g',
    pesoPadraoMg: 7840,
  },
  {
    key: 'Bandeira Olímpica',
    anoPadrao: 2016,
    tiragem: '20.000',
    categoria: CATEGORIA_OLIMPICAS,
    negociavel: false,
    detail: 'Rio 2016 · Tiragem 20.000 · Bimetálica 27mm',
  },
  {
    key: 'Atletismo',
    anoPadrao: 2016,
    tiragem: '18.500',
    categoria: CATEGORIA_OLIMPICAS,
    negociavel: false,
    detail: 'Rio 2016 · Tiragem 18.500 · Bimetálica 27mm',
  },
  {
    key: 'Vôlei',
    anoPadrao: 2016,
    tiragem: '17.200',
    categoria: CATEGORIA_OLIMPICAS,
    negociavel: false,
    detail: 'Rio 2016 · Tiragem 17.200 · Bimetálica 27mm',
  },
  {
    key: 'Natação',
    anoPadrao: 2016,
    tiragem: '16.800',
    categoria: CATEGORIA_OLIMPICAS,
    negociavel: false,
    detail: 'Rio 2016 · Tiragem 16.800 · Bimetálica 27mm',
  },
  {
    key: 'Futebol',
    anoPadrao: 2016,
    tiragem: '19.400',
    categoria: CATEGORIA_OLIMPICAS,
    negociavel: false,
    detail: 'Rio 2016 · Tiragem 19.400 · Bimetálica 27mm',
  },
  {
    key: 'Vela',
    anoPadrao: 2016,
    tiragem: '12.100',
    categoria: CATEGORIA_OLIMPICAS,
    negociavel: false,
    detail: 'Rio 2016 · Tiragem 12.100 · Bimetálica 27mm',
  },
  {
    key: 'Rio 2016 – Estádio',
    anoPadrao: 2016,
    tiragem: '21.700',
    categoria: CATEGORIA_OLIMPICAS,
    negociavel: false,
    detail: 'Rio 2016 · Tiragem 21.700 · Bimetálica 27mm',
  },
  {
    key: 'Mascote Vinicius',
    anoPadrao: 2016,
    tiragem: '25.300',
    categoria: CATEGORIA_OLIMPICAS,
    negociavel: false,
    detail: 'Rio 2016 · Tiragem 25.300 · Bimetálica 27mm',
  },
]

/**
 * Catálogo local de contas — VAZIO desde a publicação, em 20/09/2026.
 *
 * Aqui moravam oito contas de demonstração com a senha `12345678` escrita no
 * código, e em `DEMO_DATA` o saldo e o acervo que cada uma ganhava ao ser criada
 * sob demanda — de R$ 35.500 a R$ 97.000, com até 21 moedas. Isso existia para a
 * apresentação do site funcionar mesmo com o Supabase fora do ar (RA-19).
 *
 * Publicado o site no domínio oficial, com o gateway fora do sandbox, esses dois
 * objetos passaram a ser um caminho para dinheiro que ninguém depositou: quem
 * soubesse um dos e-mails entrava sem passar pelo Supabase e encontrava saldo
 * pronto para anunciar moeda inexistente ou pedir saque contra a conta real da
 * empresa. Toda autenticação passa pelo Supabase Auth agora.
 *
 * OS OBJETOS CONTINUAM EXISTINDO, VAZIOS, DE PROPÓSITO. Meia dúzia de módulos
 * perguntam `email in ACCOUNTS` para saber se a conta é do catálogo — a ficha do
 * usuário no painel, o RBAC, o acesso aos relatórios. Com o objeto vazio a
 * resposta é `false` em todos, que é a resposta certa, e nenhum deles precisou
 * mudar. Apagar os símbolos obrigaria a mexer em arquivo que não tem nada a ver
 * com isso.
 *
 * NÃO REPOVOAR. Conta de demonstração, se for preciso de novo, se cria pelo
 * painel em `/admin/usuarios`, uma a uma, com registro de quem criou.
 */
export const ACCOUNTS: Record<string, { pass: string; name: string }> = {}

/** Saldo e acervo das contas do catálogo. Vazio — ver o bloco acima. */
export const DEMO_DATA: Record<string, { balance: number; coins: number; entrada: string }> = {}

/*
 * O CATÁLOGO VIGENTE CHEGA POR PARÂMETRO (C3, 14/09/2026). Desde a C3 o catálogo é editado
 * no painel e mora em `aurea.tipos_moeda`; `COIN_TYPES` passou a ser o padrão com que a tabela
 * nasce. As três funções abaixo recebem o catálogo carregado — no servidor por
 * `carregarCatalogo()` (src/server/config/carregar.ts), no cliente pelo `useApp().catalogo` — e
 * caem em `COIN_TYPES` quando ninguém passa nada. É o mesmo desenho da `TabelaDeTaxas` da A1: o
 * domínio continua puro e síncrono, e os testes que já existiam continuam valendo.
 */

/**
 * Busca a ficha de um tipo de moeda pela chave.
 *
 * Cai no primeiro item do catálogo quando a chave não existe: a interface
 * precisa de algo para renderizar, e a moeda-referência é o palpite seguro.
 */
export function coinTypeInfo(key: string, catalogo: readonly CoinType[] = COIN_TYPES): CoinType {
  return catalogo.find((t) => t.key === key) || COIN_TYPES.find((t) => t.key === key) || catalogo[0] || COIN_TYPES[0]
}

/**
 * O tipo pode ser anunciado e comprado no marketplace?
 *
 * Chave desconhecida devolve `false` — e não o `negociavel` da moeda-referência,
 * que é o que `coinTypeInfo` entregaria pelo fallback. Um tipo que não está no
 * catálogo não tem mercado nenhum, então deixá-lo cair na Bandeira abriria a
 * porta para negociar um ativo que a plataforma não reconhece.
 */
export function isNegociavel(key: string, catalogo: readonly CoinType[] = COIN_TYPES): boolean {
  const t = catalogo.find((x) => x.key === key)
  return t ? t.negociavel : false
}

/** Tipos negociáveis, na ordem do catálogo. Alimenta os seletores de tipo. */
export function tiposNegociaveis(catalogo: readonly CoinType[] = COIN_TYPES): CoinType[] {
  return catalogo.filter((t) => t.negociavel)
}

/** Tipos que aceitam envio novo para a custódia — `ativo` ausente vale ativo. */
export function tiposAtivos(catalogo: readonly CoinType[] = COIN_TYPES): CoinType[] {
  return catalogo.filter((t) => t.ativo !== false)
}

/**
 * Categorias presentes numa lista de tipos, na ordem de CATEGORIAS. Categoria
 * fora da lista fixa vai para o fim, em ordem de aparição — assim um tipo novo
 * cadastrado sem atualizar CATEGORIAS ainda aparece na tela, em vez de sumir.
 */
export function categoriasDoCatalogo(tipos: readonly CoinType[]): string[] {
  const presentes = [...new Set(tipos.map((t) => t.categoria))]
  const conhecidas = CATEGORIAS.filter((c) => presentes.includes(c))
  const resto = presentes.filter((c) => !CATEGORIAS.includes(c))
  return [...conhecidas, ...resto]
}

/**
 * Faixa de valor estimado por tipo, em centavos.
 *
 * São os números que o seed e a emissão de recibo usam quando NÃO há mercado
 * para consultar. Os da Bandeira são os do MVP original (R$ 235–300); os da
 * Direitos Humanos vêm de cotação real de lojas numismáticas em agosto/2026
 * (~R$ 350 em MBC, ~R$ 590 em Soberba, ~R$ 600 em FC), estreitada para a faixa
 * central R$ 380–520 porque a plataforma não classifica estado de conservação.
 */
export const FAIXA_VALOR_PADRAO: { min: Cents; max: Cents } = { min: 14000, max: 36000 }

export const FAIXA_VALOR: Record<string, { min: Cents; max: Cents }> = {
  'Entrega da Bandeira Olímpica': { min: 23500, max: 30000 },
  'Direitos Humanos': { min: 38000, max: 52000 },
}

/** Faixa do tipo, ou a genérica para as moedas sem cotação de referência. */
export function faixaValor(tipo: string): { min: Cents; max: Cents } {
  return FAIXA_VALOR[tipo] ?? FAIXA_VALOR_PADRAO
}

/**
 * Teto de um depósito simulado: R$ 100.000,00.
 *
 * Não é regra financeira — é anteparo de ambiente de teste. Sem teto, um zero a
 * mais digitado sem querer põe bilhões no livro de ordens e desfigura todos os
 * gráficos da demonstração para as outras seis contas.
 */
export const DEPOSITO_MAX: Cents = 10000000
