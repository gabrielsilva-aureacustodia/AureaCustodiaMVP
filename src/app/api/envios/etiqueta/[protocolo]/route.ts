import { NextRequest, NextResponse } from 'next/server'
import { temPermissao } from '@/domain/admin/permissoes'
import { prePostagemAtiva } from '@/domain/envios'
import { carregarMembro } from '@/server/admin/acesso'
import { getState } from '@/server/state'
import { getSessionEmail } from '@/server/session'
import { DESCRICAO_CONTEUDO_PADRAO, ENDERECO_CENTRAL_AUREA } from '@/lib/shipping'
import type { ModalidadeEnvio } from '@/lib/shipping'
import { baixarRotuloPdf, correiosConfigurado, ErroCorreios } from '@/lib/shipping/cws'

/**
 * Etiqueta do envio para a custódia.
 *
 * ROTA: GET /api/envios/etiqueta/[protocolo]
 *
 * DUAS ETIQUETAS, CONFORME O ENVIO (22/10/2026)
 * ---------------------------------------------
 *  - Envio com frete pago no site tem PRÉ-POSTAGEM de logística reversa nos Correios: a rota devolve
 *    o rótulo OFICIAL deles, em PDF, com o código de rastreio do contrato e o código de barras. É
 *    esse papel que deixa o cliente postar de graça em qualquer agência.
 *  - Envio sem pré-postagem (anterior ao contrato, ou ambiente sem contrato configurado) continua com
 *    a etiqueta HTML abaixo, para impressão, e o cliente posta no balcão e digita o código.
 *
 * A rota NÃO cria pré-postagem. Até 22/10/2026 ela chamava `gerarPrePostagemCorreios`, que inventava
 * um número `PP-<timestamp>` a cada visita; a pré-postagem de verdade nasce uma vez só, quando o frete
 * é pago (src/server/shipping/frete-envio.ts). Abrir a etiqueta dez vezes não pode criar dez objetos
 * no contrato.
 *
 * REGRAS DE NEGÓCIO E CONFORMIDADE:
 *  1. Valida se o usuário está autenticado e se é o proprietário do protocolo (ou da equipe, com
 *     `logistica.etiquetas`).
 *  2. Modalidade estritamente PAC ou SEDEX. Carta comum é proibida.
 *  3. Declaração de conteúdo obrigatória: "Moeda comemorativa / colecionável".
 *  4. Destinatário fixo: a caixa postal da Central de Custódia. A etiqueta imprime
 *     SÓ a caixa postal e o CEP — agência, logradouro, bairro e cidade não vão para
 *     o papel (pedido do Gabriel, 18/09/2026). Os Correios entregam numa caixa postal
 *     com esses dois dados, e o endereço detalhado da central não precisa circular
 *     colado do lado de fora de uma encomenda de moeda.
 *  5. A etiqueta HTML sai pronta para impressão (`window.print()`), ou em JSON com `?format=json`.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ protocolo: string }> },
): Promise<NextResponse> {
  const { protocolo } = await params
  const session = await getSessionEmail()

  if (!session) {
    return NextResponse.json({ ok: false, error: 'Sessão expirada ou não autenticado.' }, { status: 401 })
  }

  const state = await getState()
  // O dono imprime a própria etiqueta; quem é do painel com `logistica.etiquetas` reimprime a de
  // qualquer conta (plano do Admin, 3.6). Para o resto, o protocolo alheio continua "não encontrado".
  const doProtocolo = state.envios.find((e) => e.protocolo === protocolo)
  const podeReimprimir = doProtocolo !== undefined && doProtocolo.userEmail !== session && temPermissao(await carregarMembro(session), 'logistica.etiquetas')
  const envio = doProtocolo && (doProtocolo.userEmail === session || podeReimprimir) ? doProtocolo : undefined

  if (!envio) {
    return NextResponse.json({ ok: false, error: 'Protocolo de envio não encontrado.' }, { status: 404 })
  }

  const { searchParams } = new URL(req.url)

  // Etiqueta oficial dos Correios, quando o frete foi pago e a pré-postagem existe.
  const prePostagem = prePostagemAtiva(envio)
  if (prePostagem && searchParams.get('format') !== 'json') {
    if (!correiosConfigurado()) {
      return NextResponse.json(
        { ok: false, error: 'O contrato dos Correios não está configurado neste ambiente: a etiqueta oficial não pode ser baixada.' },
        { status: 503 },
      )
    }
    try {
      const pdf = await baixarRotuloPdf([prePostagem.codigoObjeto])
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          'Content-Type': 'application/pdf',
          // inline: abre no visualizador do navegador, de onde o cliente imprime direto.
          'Content-Disposition': `inline; filename="etiqueta-${envio.protocolo}-${prePostagem.codigoObjeto}.pdf"`,
          'Cache-Control': 'private, no-store',
        },
      })
    } catch (err) {
      const status = err instanceof ErroCorreios && err.status >= 500 ? err.status : 502
      return NextResponse.json(
        {
          ok: false,
          error: err instanceof Error ? err.message : 'Os Correios não devolveram a etiqueta. Tente de novo em instantes.',
        },
        { status },
      )
    }
  }
  if (envio.prePostagem?.canceladaEm) {
    // Pré-postagem cancelada (envio desconsiderado sem postar): imprimir a etiqueta antiga levaria um
    // código que os Correios já não aceitam.
    return NextResponse.json(
      { ok: false, error: 'A etiqueta deste envio foi cancelada: o protocolo foi desconsiderado sem postagem.' },
      { status: 410 },
    )
  }

  const modalidade: ModalidadeEnvio = envio.modalidadeEnvio ?? 'SEDEX'
  // Remetente é o dono do envio — que, na reimpressão pelo painel, não é quem está logado.
  const dono = envio.userEmail
  const user = state.users[dono]

  if (searchParams.get('format') === 'json') {
    return NextResponse.json({
      ok: true,
      data: {
        protocolo: envio.protocolo,
        modalidade,
        codigoRastreio: envio.codigoRastreio,
        prePostagem: prePostagem ?? null,
        destinatario: ENDERECO_CENTRAL_AUREA,
        declaracaoConteudo: { conteudo: DESCRICAO_CONTEUDO_PADRAO, quantidade: envio.quantidade },
      },
    })
  }

  // O nome cadastrado nos Correios ja traz a caixa postal colada ("AUREA CUSTODIA LTDA
  // - Caixa Postal 7990"), e na etiqueta a caixa tem linha propria. Sem isto, o papel
  // repete o numero duas vezes. Sem o separador, o split devolve o nome inteiro.
  const razaoSocial = ENDERECO_CENTRAL_AUREA.nome.split('—')[0].trim()

  // Renderiza página HTML formatada para impressão de etiqueta e declaração de conteúdo
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Etiqueta dos Correios — ${envio.protocolo}</title>
  <style>
    @media print {
      body { margin: 0; background: #fff; }
      .no-print { display: none !important; }
      .container { border: 2px dashed #333 !important; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      background: #f4f4f4;
      padding: 20px;
      color: #111;
      line-height: 1.4;
    }
    .container {
      max-width: 650px;
      margin: 0 auto;
      background: #fff;
      border: 2px solid #222;
      padding: 24px;
      border-radius: 4px;
    }
    .header {
      border-bottom: 2px solid #222;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 {
      font-size: 18px;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge {
      background: #111;
      color: #ffd700;
      font-weight: bold;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 14px;
      text-transform: uppercase;
    }
    .box {
      border: 1px solid #ccc;
      padding: 12px;
      margin-bottom: 14px;
      border-radius: 4px;
    }
    .box h2 {
      font-size: 13px;
      text-transform: uppercase;
      color: #555;
      margin: 0 0 6px 0;
      border-bottom: 1px solid #eee;
      padding-bottom: 4px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 13px;
    }
    .row .k { color: #555; }
    .row .v { font-weight: 600; text-align: right; }
    .barcode-box {
      text-align: center;
      padding: 16px 0;
      background: #fafafa;
      border: 1px dashed #999;
      margin: 16px 0;
      border-radius: 4px;
    }
    .barcode {
      font-family: monospace;
      font-size: 26px;
      letter-spacing: 5px;
      font-weight: bold;
      margin-top: 4px;
    }
    .instructions {
      font-size: 11px;
      color: #666;
      border-top: 1px solid #eee;
      padding-top: 10px;
      margin-top: 14px;
    }
    .btn-print {
      display: block;
      width: 100%;
      background: #222;
      color: #fff;
      border: none;
      padding: 12px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      border-radius: 4px;
      margin-top: 14px;
    }
    .btn-print:hover { background: #444; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>Real Olímpico — Envio Postal</h1>
        <div style="font-size: 12px; color: #666;">Protocolo: <b>${envio.protocolo}</b></div>
      </div>
      <div class="badge">${modalidade} COM SEGURO</div>
    </div>

    <div class="box">
      <h2>1. Destinatário (Central de Custódia)</h2>
      <div class="row"><span class="k">Nome:</span><span class="v">${razaoSocial}</span></div>
      <div class="row"><span class="k">CNPJ:</span><span class="v">${ENDERECO_CENTRAL_AUREA.cpfOuCnpj}</span></div>
      <div class="row"><span class="k">Caixa Postal:</span><span class="v">${ENDERECO_CENTRAL_AUREA.logradouro}</span></div>
      <div class="row"><span class="k">CEP:</span><span class="v" style="font-size: 15px; color: #000;">${ENDERECO_CENTRAL_AUREA.cep}</span></div>
    </div>

    <div class="box">
      <h2>2. Remetente</h2>
      <div class="row"><span class="k">Cliente:</span><span class="v">${user?.name || dono}</span></div>
      <div class="row"><span class="k">E-mail:</span><span class="v">${dono}</span></div>
      <div class="row"><span class="k">Referência:</span><span class="v">${envio.protocolo}</span></div>
    </div>

    <div class="box">
      <h2>3. Declaração de Conteúdo Postal (Obrigatória)</h2>
      <div class="row"><span class="k">Conteúdo Declarado:</span><span class="v" style="color: #b8860b;">${DESCRICAO_CONTEUDO_PADRAO}</span></div>
      <div class="row"><span class="k">Tipo / Coleção:</span><span class="v">${envio.tipoMoeda} (${envio.ano})</span></div>
      <div class="row"><span class="k">Quantidade:</span><span class="v">${envio.quantidade} unidade(s)</span></div>
      <div class="row"><span class="k">Aviso de Recebimento (AR):</span><span class="v">SIM (Obrigatório)</span></div>
      <div class="row"><span class="k">Mão Própria (MP):</span><span class="v">SIM (Segurança)</span></div>
    </div>

    <div class="barcode-box">
      <div style="font-size: 11px; text-transform: uppercase; color: #666;">${envio.codigoRastreio ? 'Código de Rastreamento dos Correios' : 'Protocolo do Envio'}</div>
      <!-- Sem código dos Correios, imprime o PROTOCOLO. Até 21/09/2026 saía aqui
           um código inventado com cara de rastreio, que o cliente levava para
           casa achando que rastreava o pacote. O rastreio real aparece depois
           da postagem, quando o cliente digita o que veio no comprovante. -->
      <div class="barcode">${envio.codigoRastreio || envio.protocolo}</div>
      <div style="font-size: 11px; color: #888; margin-top: 4px;">*${envio.protocolo}*</div>
    </div>

    <div class="instructions">
      <b>Instruções para o Remetente:</b>
      <ol style="margin: 4px 0 0 16px; padding: 0;">
        <li>Embale as moedas em estojo acolchoado ou plástico bolha com segurança.</li>
        <li>Imprima esta folha e cole na parte externa da caixa ou envelope acolchoado.</li>
        <li>Apresente na agência dos Correios para despacho via <b>${modalidade}</b> com seguro e declaração de valor.</li>
        <li>O acompanhamento e laudo físico da moeda serão atualizados automaticamente na plataforma.</li>
      </ol>
    </div>

    <button class="btn-print no-print" onclick="window.print()">🖨️ Imprimir Etiqueta e Declaração</button>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
