import { NextRequest, NextResponse } from 'next/server'
import { getState } from '@/server/state'
import { getSessionEmail } from '@/server/session'
import {
  DESCRICAO_CONTEUDO_PADRAO,
  ENDERECO_CENTRAL_AUREA,
  gerarPrePostagemCorreios,
} from '@/lib/shipping'
import type { ModalidadeEnvio } from '@/lib/shipping'

/**
 * Endpoint para Geração de Etiqueta e Declaração de Conteúdo dos Correios.
 *
 * ROTA: GET /api/envios/etiqueta/[protocolo]
 *
 * REGRAS DE NEGÓCIO E CONFORMIDADE:
 *  1. Valida se o usuário está autenticado e se é o proprietário do protocolo.
 *  2. Modalidade estritamente PAC ou SEDEX. Carta comum é proibida.
 *  3. Declaração de conteúdo obrigatória: "Moeda comemorativa / colecionável".
 *  4. Endereço fixo da Central de Custódia da Áurea Custódia LTDA (Av. Paulista, 1500).
 *  5. Suporta saída em HTML estilizado pronto para impressão (`window.print()`)
 *     ou saída em JSON se especificado `?format=json`.
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
  const envio = state.envios.find((e) => e.protocolo === protocolo && e.userEmail === session)

  if (!envio) {
    return NextResponse.json({ ok: false, error: 'Protocolo de envio não encontrado.' }, { status: 404 })
  }

  const modalidade: ModalidadeEnvio = 'SEDEX'
  const user = state.users[session]

  // Gera os dados da pré-postagem e etiqueta com o adaptador
  const prePostagem = await gerarPrePostagemCorreios({
    protocolo: envio.protocolo,
    remetente: {
      nome: user?.name || session,
      email: session,
      logradouro: 'Endereço do Remetente (Informado no envio)',
      numero: 'S/N',
      bairro: 'Centro',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '01000-000',
    },
    destinatario: ENDERECO_CENTRAL_AUREA,
    modalidade,
    quantidadeMoedas: envio.quantidade,
    tipoMoeda: envio.tipoMoeda,
    valorDeclaradoCents: envio.quantidade * 15000, // R$ 150,00 por moeda como base declarada padrão
  })

  const { searchParams } = new URL(req.url)
  if (searchParams.get('format') === 'json') {
    return NextResponse.json({
      ok: true,
      data: prePostagem,
    })
  }

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
        <h1>Áurea Custódia — Envio Postal</h1>
        <div style="font-size: 12px; color: #666;">Protocolo: <b>${envio.protocolo}</b></div>
      </div>
      <div class="badge">${modalidade} COM SEGURO</div>
    </div>

    <div class="box">
      <h2>1. Destinatário (Central de Custódia)</h2>
      <div class="row"><span class="k">Nome:</span><span class="v">${ENDERECO_CENTRAL_AUREA.nome}</span></div>
      <div class="row"><span class="k">CNPJ:</span><span class="v">${ENDERECO_CENTRAL_AUREA.cpfOuCnpj}</span></div>
      <div class="row"><span class="k">Endereço:</span><span class="v">${ENDERECO_CENTRAL_AUREA.logradouro}, ${ENDERECO_CENTRAL_AUREA.numero} — ${ENDERECO_CENTRAL_AUREA.complemento}</span></div>
      <div class="row"><span class="k">Bairro:</span><span class="v">${ENDERECO_CENTRAL_AUREA.bairro}</span></div>
      <div class="row"><span class="k">Cidade / UF:</span><span class="v">${ENDERECO_CENTRAL_AUREA.cidade} / ${ENDERECO_CENTRAL_AUREA.uf}</span></div>
      <div class="row"><span class="k">CEP:</span><span class="v" style="font-size: 15px; color: #000;">${ENDERECO_CENTRAL_AUREA.cep}</span></div>
    </div>

    <div class="box">
      <h2>2. Remetente</h2>
      <div class="row"><span class="k">Cliente:</span><span class="v">${user?.name || session}</span></div>
      <div class="row"><span class="k">E-mail:</span><span class="v">${session}</span></div>
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
      <div style="font-size: 11px; text-transform: uppercase; color: #666;">Código de Rastreamento / Pré-Postagem</div>
      <div class="barcode">${envio.codigoRastreio || prePostagem.codigoRastreio}</div>
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
