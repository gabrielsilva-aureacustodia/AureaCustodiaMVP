/**
 * "Ver como o cliente vê" na ficha da moeda (30/10/2026).
 *
 * O botão levava a /recibos/[coinId], que só abre para o dono e dava 404 à equipe. Estes testes
 * prendem o que o conserto promete: o link certo, a recusa a quem não tem `bancada.auditoria`
 * (sem tocar nos dados da moeda) e a folha do recibo desenhada só para leitura.
 */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { hrefComoOClienteVe } from '@/domain/admin/moedas'
import type { MembroAdmin } from '@/domain/admin/permissoes'

const m = vi.hoisted(() => ({ membroDaPagina: vi.fn(), carregarFichaDaMoeda: vi.fn(), carregarCatalogo: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/server/admin/acesso', () => ({ membroDaPagina: m.membroDaPagina }))
vi.mock('@/server/admin/moedas', () => ({ carregarFichaDaMoeda: m.carregarFichaDaMoeda }))
vi.mock('@/server/config/carregar', () => ({ carregarCatalogo: m.carregarCatalogo }))

import Pagina from './page'

function membro(permissoes: MembroAdmin['permissoes']): MembroAdmin {
  return { email: 'equipe@exemplo.com.br', nome: 'Equipe', papel: { slug: 'x', nome: 'X', rank: 1, variantePainel: 'operacional' }, permissoes, origem: 'tabela' }
}

const FICHA = {
  linha: {
    codigo: 'RO-000019',
    tipoMoeda: 'Direitos Humanos',
    ano: 1998,
    dono: 'dono@exemplo.com.br',
    nomeDono: 'Dono da Moeda',
    recibo: { codigo: 'REC-000019', hash: 'abc123', status: 'Ativo', dataEmissao: '28/10/2026' },
  },
  analise: null,
  envio: null,
  retiradas: [],
}

async function renderizar(codigo: string): Promise<string> {
  const el = await Pagina({ params: Promise.resolve({ codigo }) })
  return renderToStaticMarkup(el as never)
}

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset()
  m.carregarCatalogo.mockResolvedValue([{ key: 'Direitos Humanos', negociavel: true }])
})

describe('hrefComoOClienteVe', () => {
  it('aponta para a visão de leitura do Admin, e não para a rota do dono', () => {
    expect(hrefComoOClienteVe('RO-000019')).toBe('/admin/moedas/RO-000019/cliente')
    expect(hrefComoOClienteVe('RO 1/2')).toBe('/admin/moedas/RO%201%2F2/cliente')
    expect(hrefComoOClienteVe('RO-000019')).not.toContain('/recibos/')
  })
})

describe('/admin/moedas/[codigo]/cliente', () => {
  it('recusa papel sem bancada.auditoria e nem consulta a moeda', async () => {
    m.membroDaPagina.mockResolvedValue(membro(['bancada.analisar']))
    const html = await renderizar('RO-000019')
    expect(html).toContain('Seu papel no painel não inclui esta área')
    expect(html).not.toContain('Dono da Moeda')
    expect(m.carregarFichaDaMoeda).not.toHaveBeenCalled()
  })

  it('mostra o recibo do dono, sem nenhuma ação do cliente', async () => {
    m.membroDaPagina.mockResolvedValue(membro(['bancada.auditoria']))
    m.carregarFichaDaMoeda.mockResolvedValue(FICHA)
    const html = await renderizar('ro-000019')
    expect(m.carregarFichaDaMoeda).toHaveBeenCalledWith('RO-000019')
    expect(html).toContain('Recibo de Custódia')
    expect(html).toContain('REC-000019')
    expect(html).toContain('Dono da Moeda')
    expect(html).toContain('Visão somente leitura')
    expect(html).toContain('href="/admin/moedas/RO-000019"')
    expect(html).not.toMatch(/Colocar à venda|Solicitar retirada|Baixar recibo PDF/)
  })

  it('código desconhecido não vaza nada', async () => {
    m.membroDaPagina.mockResolvedValue(membro(['bancada.auditoria']))
    m.carregarFichaDaMoeda.mockResolvedValue(null)
    const html = await renderizar('RO-999999')
    expect(html).toContain('Moeda não encontrada')
  })
})
