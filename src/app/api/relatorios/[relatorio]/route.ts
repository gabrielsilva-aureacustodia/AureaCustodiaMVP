/**
 * GET /api/relatorios/<nome>[.json|.csv|.xlsx]?ano=&mes=&trimestre=&recortar=1&token=
 *
 * A API de leitura dos relatórios financeiros — a porta por onde o Google
 * Sheets, o Excel e qualquer script puxam os dados. Um relatório por URL, três
 * formatos, o mesmo conteúdo.
 *
 * QUEM PODE
 * ---------
 * Sessão de administrador (a tela `/relatorios`) OU o token de integração
 * `AUREA_RELATORIOS_TOKEN`, no cabeçalho `Authorization: Bearer …` ou em
 * `?token=` — o `IMPORTDATA` do Sheets não manda cabeçalho. Sem a variável
 * definida, o caminho por token está desligado. Ver src/server/relatorios/acesso.ts.
 *
 * O NOME ESPECIAL `tudo.xlsx` devolve a pasta de trabalho com todos os
 * relatórios, uma aba cada — é o "exportar tudo" da tela e o arquivo que se
 * manda ao contador.
 *
 * TODA SAÍDA EM CSV/XLSX FICA REGISTRADA em `aurea.exportacoes` (quem, o quê,
 * quando). JSON não é registrado: é o que a própria tela consome a cada
 * troca de aba, e registrá-lo só encheria a trilha.
 *
 * Os três "não cacheie" de /api/state valem aqui também: relatório financeiro
 * servido do CDN de dez minutos atrás é relatório errado.
 */

import { NextRequest, NextResponse } from 'next/server'

import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { registrarExportacao } from '@/server/db/repositories/contabil'
import { autorizarRelatorio } from '@/server/relatorios/acesso'
import {
  ehNomeDeRelatorio,
  gerarRelatorio,
  gerarTodosRelatorios,
  type OpcoesRelatorio,
  type Relatorio,
} from '@/server/relatorios/dados'
import { relatorioParaCsv, relatoriosParaXlsx } from '@/server/relatorios/exportar'
import { getSessionEmail } from '@/server/session'

export const dynamic = 'force-dynamic'

const SEM_CACHE = { 'Cache-Control': 'no-store, max-age=0' } as const

type Formato = 'json' | 'csv' | 'xlsx'

/** 'dre.csv' -> { nome: 'dre', formato: 'csv' }; sem extensão vale `?formato=`, e o padrão é json. */
function separarNomeEFormato(bruto: string, query: string | null): { nome: string; formato: Formato } | null {
  const m = /^([a-z-]+)(?:\.(json|csv|xlsx))?$/.exec(bruto)
  if (!m) return null
  const daQuery = query === 'csv' || query === 'xlsx' || query === 'json' ? query : null
  return { nome: m[1], formato: (m[2] as Formato | undefined) ?? daQuery ?? 'json' }
}

function tokenDe(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (auth && auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim()
  return req.nextUrl.searchParams.get('token')
}

async function registrar(relatorio: string, formato: Formato, ator: string, via: 'sessao' | 'token', linhas: number, ok: boolean, detalhe: string | null): Promise<void> {
  if (!bancoConfigurado()) return
  try {
    await executarNoBanco((tx) =>
      registrarExportacao(tx, {
        createdAt: Date.now(),
        relatorio,
        formato,
        destino: via === 'token' ? 'api' : 'download',
        ator,
        linhas,
        ok,
        detalhe,
      }),
    )
  } catch (err) {
    // O registro não pode derrubar a exportação — mas também não pode sumir em silêncio.
    console.error('[relatorios] falha ao registrar exportação:', err)
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ relatorio: string }> }): Promise<NextResponse> {
  const { relatorio: bruto } = await params
  const sessao = await getSessionEmail().catch(() => null)
  const auth = autorizarRelatorio(sessao, tokenDe(req))
  if (!auth.ok) return NextResponse.json({ error: auth.erro }, { status: auth.status, headers: SEM_CACHE })

  const q = req.nextUrl.searchParams
  const alvo = separarNomeEFormato(bruto, q.get('formato'))
  if (!alvo) return NextResponse.json({ error: 'Relatório desconhecido.' }, { status: 404, headers: SEM_CACHE })

  const opcoes: OpcoesRelatorio = {
    ano: q.get('ano'),
    mes: q.get('mes'),
    trimestre: q.get('trimestre'),
    recortar: q.get('recortar') === '1' || q.get('recortar') === 'true',
  }

  try {
    if (alvo.nome === 'tudo') {
      if (alvo.formato !== 'xlsx') {
        return NextResponse.json({ error: '"tudo" só existe em .xlsx.' }, { status: 400, headers: SEM_CACHE })
      }
      const todos = await gerarTodosRelatorios(opcoes)
      const bytes = relatoriosParaXlsx(todos)
      const total = todos.reduce((s, r) => s + r.linhas.length, 0)
      await registrar('tudo', 'xlsx', auth.ator, auth.via, total, true, null)
      return arquivo(bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', nomeArquivo('relatorios-real-olimpico', 'xlsx'))
    }

    if (!ehNomeDeRelatorio(alvo.nome)) {
      return NextResponse.json({ error: 'Relatório desconhecido.' }, { status: 404, headers: SEM_CACHE })
    }

    const r: Relatorio = await gerarRelatorio(alvo.nome, opcoes)

    if (alvo.formato === 'json') return NextResponse.json(r, { headers: SEM_CACHE })

    if (alvo.formato === 'csv') {
      await registrar(r.nome, 'csv', auth.ator, auth.via, r.linhas.length, true, null)
      return arquivo(new TextEncoder().encode(relatorioParaCsv(r)), 'text/csv; charset=utf-8', nomeArquivo(r.nome, 'csv'))
    }

    await registrar(r.nome, 'xlsx', auth.ator, auth.via, r.linhas.length, true, null)
    return arquivo(relatoriosParaXlsx([r]), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', nomeArquivo(r.nome, 'xlsx'))
  } catch (err) {
    console.error('[relatorios] falha ao gerar', bruto, err)
    await registrar(alvo.nome, alvo.formato, auth.ator, auth.via, 0, false, err instanceof Error ? err.message : 'erro')
    return NextResponse.json({ error: 'Falha ao gerar o relatório.' }, { status: 500, headers: SEM_CACHE })
  }
}

function nomeArquivo(base: string, ext: string): string {
  const d = new Date()
  const carimbo = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `${base}-${carimbo}.${ext}`
}

function arquivo(bytes: Uint8Array, tipo: string, nome: string): NextResponse {
  return new NextResponse(bytes, {
    headers: {
      ...SEM_CACHE,
      'Content-Type': tipo,
      'Content-Disposition': `attachment; filename="${nome}"`,
    },
  })
}
