import { NextRequest, NextResponse } from 'next/server'
import { getSessionEmail } from '@/server/session'
import { repositorioRetiradas } from '@/server/shipping/retiradas'
import { ENDERECO_CENTRAL_AUREA } from '@/lib/shipping/correios'
import { ehAdmin } from '@/server/relatorios/acesso'
import { DESCRICAO_CONTEUDO_PADRAO } from '@/lib/shipping/types'

/**
 * Endpoint para Geração de Etiqueta e Declaração de Conteúdo de Saída (Retirada Física).
 *
 * ROTA: GET /api/retiradas/etiqueta/[id]
 *
 * REGRAS DE NEGÓCIO E CONFORMIDADE:
 *  1. Valida se o usuário está autenticado e se é o solicitante da retirada ou operador/administrador.
 *  2. Remetente oficial: Central de Custódia Áurea (Caixa Postal 7990, Belo Horizonte - MG, CEP 30315-970).
 *  3. Destinatário: endereço congelado na solicitação com Trava 2 de segurança.
 *  4. Declaração de conteúdo obrigatória com Aviso de Recebimento (AR) e seguro declarado.
 *  5. Suporta saída em JSON (`?format=json`) ou HTML estilizado para impressão (`window.print()`).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params
  const session = await getSessionEmail()

  if (!session) {
    return NextResponse.json({ ok: false, error: 'Sessão expirada ou não autenticado.' }, { status: 401 })
  }

  const retirada = await repositorioRetiradas().buscarPorId(id)
  if (!retirada) {
    return NextResponse.json({ ok: false, error: 'Solicitação de retirada não encontrada.' }, { status: 404 })
  }

  const admin = ehAdmin(session)
  if (!admin && retirada.userEmail !== session) {
    return NextResponse.json({ ok: false, error: 'Acesso não autorizado a esta retirada.' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  if (searchParams.get('format') === 'json') {
    return NextResponse.json({
      ok: true,
      data: {
        retiradaId: retirada.id,
        modalidade: retirada.modalidade,
        remetente: ENDERECO_CENTRAL_AUREA,
        destinatario: retirada.endereco,
        codigoRastreio: retirada.codigoRastreio,
        status: retirada.status,
        dataLimiteD30: retirada.dataLimiteD30,
        declaracaoConteudo: {
          item: `${DESCRICAO_CONTEUDO_PADRAO} (${retirada.coinId})`,
          quantidade: 1,
          valorTotalCents: 30000,
        },
      },
    })
  }

  // Renderiza página HTML formatada para impressão de etiqueta e declaração de conteúdo
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Etiqueta de Expedição — Retirada ${retirada.id}</title>
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
      <h1>Áurea Custódia — Expedição de Moeda</h1>
      <span class="badge">${retirada.modalidade === 'segura' ? 'Transporte Blindado' : 'Correios SEDEX'}</span>
    </div>

    <div class="barcode-box">
      <div style="font-size: 12px; text-transform: uppercase; color: #666;">Código de Rastreamento / Expedição</div>
      <div class="barcode">${retirada.codigoRastreio || retirada.id}</div>
      <div style="font-size: 11px; color: #888; margin-top: 4px;">Recibo Extinto: ${retirada.reciboCodigo} · Moeda: ${retirada.coinId}</div>
    </div>

    <div class="box">
      <h2>Destinatário (Cliente)</h2>
      <div class="row"><span class="k">Nome:</span><span class="v">${retirada.endereco.nome}</span></div>
      <div class="row"><span class="k">CPF/CNPJ:</span><span class="v">${retirada.endereco.cpfOuCnpj}</span></div>
      <div class="row"><span class="k">Endereço:</span><span class="v">${retirada.endereco.logradouro}, ${retirada.endereco.numero}${retirada.endereco.complemento ? ' - ' + retirada.endereco.complemento : ''}</span></div>
      <div class="row"><span class="k">Bairro:</span><span class="v">${retirada.endereco.bairro}</span></div>
      <div class="row"><span class="k">Cidade / UF:</span><span class="v">${retirada.endereco.cidade} / ${retirada.endereco.uf}</span></div>
      <div class="row"><span class="k">CEP:</span><span class="v" style="font-size: 14px; font-weight: 700;">${retirada.endereco.cep}</span></div>
      <div class="row"><span class="k">Telefone:</span><span class="v">${retirada.endereco.telefone}</span></div>
    </div>

    <div class="box">
      <h2>Remetente (Central de Custódia)</h2>
      <div class="row"><span class="k">Razão Social:</span><span class="v">${ENDERECO_CENTRAL_AUREA.nome}</span></div>
      <div class="row"><span class="k">CNPJ:</span><span class="v">${ENDERECO_CENTRAL_AUREA.cpfOuCnpj}</span></div>
      <div class="row"><span class="k">Endereço:</span><span class="v">${ENDERECO_CENTRAL_AUREA.logradouro}, ${ENDERECO_CENTRAL_AUREA.numero} (${ENDERECO_CENTRAL_AUREA.complemento})</span></div>
      <div class="row"><span class="k">Bairro:</span><span class="v">${ENDERECO_CENTRAL_AUREA.bairro}</span></div>
      <div class="row"><span class="k">Cidade / UF:</span><span class="v">${ENDERECO_CENTRAL_AUREA.cidade} / ${ENDERECO_CENTRAL_AUREA.uf}</span></div>
      <div class="row"><span class="k">CEP Oficial:</span><span class="v" style="font-size: 14px; font-weight: 700;">${ENDERECO_CENTRAL_AUREA.cep}</span></div>
    </div>

    <div class="box">
      <h2>Declaração de Conteúdo e Serviços Adicionais</h2>
      <div class="row"><span class="k">Item declarado:</span><span class="v">Moeda comemorativa / colecionável (${retirada.coinId})</span></div>
      <div class="row"><span class="k">Quantidade:</span><span class="v">1 unidade</span></div>
      <div class="row"><span class="k">Valor declarado:</span><span class="v">R$ 300,00 (Seguro de Acervo)</span></div>
      <div class="row"><span class="k">Serviços adicionais:</span><span class="v">Aviso de Recebimento (AR) + Seguro Integral</span></div>
    </div>

    <div class="instructions">
      <strong>INSTRUÇÕES OPERACIONAIS:</strong>
      <ul>
        <li>Etiqueta impressa vinculada à saída e desvinculação física da moeda sob custódia.</li>
        <li>O recibo digital correspondente encontra-se extinto de forma irrevogável.</li>
        <li>Embalagem devidamente lacrada com fita de segurança e seguro contratado.</li>
      </ul>
    </div>

    <button class="btn-print no-print" onclick="window.print()">Imprimir Etiqueta</button>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
