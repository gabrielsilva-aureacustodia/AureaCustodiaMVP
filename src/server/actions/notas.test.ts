/**
 * Notas fiscais do cliente: a conta A NÃO lê a nota da conta B (frente G, 18/11/2026).
 *
 * Contra um Postgres de verdade (PGlite, com as migrations reais): dois clientes com notas no mesmo
 * banco, a sessão trocando de dono, e as duas camadas — a consulta (`src/server/nfse/consulta.ts`) e a
 * Server Action (`notas.ts`). O que se prova aqui é o que a LGPD pede: o XML da nota traz CPF, nome e
 * endereço do tomador, então nem a lista, nem o XML, nem os campos do PDF de uma conta chegam à outra.
 *
 * UMA instância de PGlite no arquivo, como manda o README de src/server/db/ (cada uma ocupa memória).
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Executor } from '@/server/db/sql'
import { nomeDoSchema } from '@/server/db/sql'
import { bancoDeTeste, type BancoDeTeste } from '@/server/admin/testing/pglite'

vi.mock('server-only', () => ({}))

const ponte = vi.hoisted(() => ({
  sessao: null as string | null,
  executor: null as Executor | null,
}))
vi.mock('@/server/session', () => ({ getSessionEmail: async () => ponte.sessao }))
vi.mock('@/server/db/client', () => ({
  bancoConfigurado: () => true,
  executarNoBanco: <T>(fn: Parameters<Executor>[0], opcoes?: Parameters<Executor>[1]): Promise<T> =>
    (ponte.executor as Executor)(fn, opcoes) as Promise<T>,
}))

import { listarNotasDoDono, notaDoDonoComXml } from '@/server/nfse/consulta'

import { baixarMinhaNota, listarMinhasNotas } from './notas'

const A = 'conta.a@teste.com'
const B = 'conta.b@teste.com'

const CHAVE_DA_A = '31062002268071452000106000000000005426110748266219'
const CHAVE_DA_B = '31062002268071452000106000000000005526110748266225'

function xmlDe(chave: string, numero: string, nomeDoTomador: string): string {
  return (
    `<?xml version="1.0" encoding="utf-8"?><NFSe versao="1.01" xmlns="http://www.sped.fazenda.gov.br/nfse">` +
    `<infNFSe Id="NFS${chave}"><nNFSe>${numero}</nNFSe><dhProc>2026-11-16T15:15:56-03:00</dhProc>` +
    `<emit><CNPJ>68071452000106</CNPJ><xNome>AUREA CUSTODIA LTDA</xNome></emit>` +
    `<valores><vBC>2.00</vBC><pAliqAplic>5.00</pAliqAplic><vISSQN>0.10</vISSQN><vLiq>2.00</vLiq></valores>` +
    `<DPS><infDPS><serie>1</serie><nDPS>9</nDPS><dCompet>2026-11-16</dCompet>` +
    `<toma><CPF>11122233396</CPF><xNome>${nomeDoTomador}</xNome></toma>` +
    `<serv><cServ><cTribNac>110401</cTribNac><xDescServ>CUSTODIA MENSAL</xDescServ></cServ></serv>` +
    `<valores><vServPrest><vServ>2.00</vServ></vServPrest></valores></infDPS></DPS></NFSe>`
  )
}

interface Semente {
  chave: string
  servico?: string
  ref: string
  email: string
  status: string
  ambiente?: 'producao' | 'restrita' | null
  numero?: string | null
  chaveAcesso?: string | null
  xml?: string | null
  ocorridoEm?: number
  canceladaEm?: number | null
  motivo?: string | null
  erros?: string | null
}

let banco: BancoDeTeste
let idDaNotaDaA: number
let idDaNotaDaB: number
let idDaPendenteDaA: number

async function semear(s: Semente): Promise<number> {
  const S = nomeDoSchema()
  const r = await banco.executar((tx) =>
    tx.query<{ id: unknown }>(
      `INSERT INTO ${S}.nfse_emissoes
         (chave, servico, ref_fato, tomador_email, valor, ocorrido_em, competencia, descricao, quantidade_moedas,
          status, ambiente, chave_acesso, numero_nfse, xml_nfse, autorizada_em, cancelada_em, motivo_cancelamento,
          erros, criado_em, atualizado_em)
       VALUES ($1, $2, $3, $4, 200, $5, '2026-11-16', 'CUSTODIA MENSAL - TESTE', 1,
               $6, $7, $8, $9, $10, $5, $11, $12, $13::jsonb, $5, $5)
       RETURNING id`,
      [
        s.chave,
        s.servico ?? 'custodia',
        s.ref,
        s.email,
        s.ocorridoEm ?? Date.UTC(2026, 10, 16, 18),
        s.status,
        s.ambiente ?? null,
        s.chaveAcesso ?? null,
        s.numero ?? null,
        s.xml ?? null,
        s.canceladaEm ?? null,
        s.motivo ?? null,
        s.erros ?? null,
      ],
    ),
  )
  return Number(r.rows[0]?.id)
}

describe('notas fiscais do cliente — só o dono lê', () => {
  beforeAll(async () => {
    banco = await bancoDeTeste()
    ponte.executor = banco.executar

    idDaNotaDaA = await semear({
      chave: 'custodia:FAT-A-1', ref: 'FAT-A-1', email: A, status: 'autorizada', ambiente: 'producao',
      numero: '54', chaveAcesso: CHAVE_DA_A, xml: xmlDe(CHAVE_DA_A, '54', 'CLIENTE A'), ocorridoEm: Date.UTC(2026, 10, 16, 18),
    })
    idDaPendenteDaA = await semear({
      chave: 'custodia:FAT-A-2', ref: 'FAT-A-2', email: A, status: 'rejeitada',
      erros: JSON.stringify([{ codigo: 'CADASTRO', descricao: 'Cliente sem cadastro completo (CPF e nome)' }]),
      ocorridoEm: Date.UTC(2026, 10, 17, 18),
    })
    idDaNotaDaB = await semear({
      chave: 'custodia:FAT-B-1', ref: 'FAT-B-1', email: B, status: 'autorizada', ambiente: 'producao',
      numero: '55', chaveAcesso: CHAVE_DA_B, xml: xmlDe(CHAVE_DA_B, '55', 'CLIENTE B SECRETO'), ocorridoEm: Date.UTC(2026, 10, 16, 19),
    })
  }, 120_000)

  afterAll(async () => {
    await banco.fechar()
  })

  beforeEach(() => {
    ponte.sessao = A
  })

  describe('a consulta (src/server/nfse/consulta.ts)', () => {
    it('lista só as notas do dono, da mais recente para a mais antiga', async () => {
      const daA = await banco.executar((tx) => listarNotasDoDono(tx, A))
      expect(daA.map((n) => n.id)).toEqual([idDaPendenteDaA, idDaNotaDaA])
      const daB = await banco.executar((tx) => listarNotasDoDono(tx, B))
      expect(daB.map((n) => n.id)).toEqual([idDaNotaDaB])
    })

    it('o e-mail com outra caixa ainda acha as notas do dono — e nunca as de outro', async () => {
      const notas = await banco.executar((tx) => listarNotasDoDono(tx, 'Conta.A@Teste.com'))
      expect(notas.map((n) => n.id).sort()).toEqual([idDaNotaDaA, idDaPendenteDaA].sort())
    })

    it('a nota da B não sai para a A pelo id, nem com o id certo na mão', async () => {
      expect(await banco.executar((tx) => notaDoDonoComXml(tx, A, idDaNotaDaB))).toBeNull()
      const daB = await banco.executar((tx) => notaDoDonoComXml(tx, B, idDaNotaDaB))
      expect(daB?.xml).toContain('CLIENTE B SECRETO')
    })

    it('id que não existe, negativo ou quebrado também dá null', async () => {
      for (const id of [999_999, 0, -1, 1.5, Number.NaN]) {
        expect(await banco.executar((tx) => notaDoDonoComXml(tx, A, id))).toBeNull()
      }
    })

    it('quem não tem nenhuma nota recebe lista vazia', async () => {
      expect(await banco.executar((tx) => listarNotasDoDono(tx, 'ninguem@teste.com'))).toEqual([])
    })
  })

  describe('as Server Actions (src/server/actions/notas.ts)', () => {
    it('sem sessão, nada sai', async () => {
      ponte.sessao = null
      expect((await listarMinhasNotas()).ok).toBe(false)
      expect((await baixarMinhaNota(idDaNotaDaA, 'xml')).ok).toBe(false)
    })

    it('a lista da A tem as notas da A e nenhum rastro da B', async () => {
      const r = await listarMinhasNotas()
      expect(r.ok).toBe(true)
      expect(r.data?.map((n) => n.id)).toEqual([idDaPendenteDaA, idDaNotaDaA])
      const texto = JSON.stringify(r)
      expect(texto).not.toContain(CHAVE_DA_B)
      expect(texto).not.toContain('CLIENTE B')
      expect(texto).not.toContain(B)
    })

    it('a A baixa o XML e os campos do PDF da própria nota', async () => {
      const xml = await baixarMinhaNota(idDaNotaDaA, 'xml')
      expect(xml.ok).toBe(true)
      expect(xml.data).toMatchObject({ formato: 'xml', nome: `NFSe-${CHAVE_DA_A}.xml` })
      expect(xml.data?.formato === 'xml' && xml.data.xml).toContain('CLIENTE A')

      const pdf = await baixarMinhaNota(idDaNotaDaA, 'pdf')
      expect(pdf.ok).toBe(true)
      expect(pdf.data?.formato === 'pdf' && pdf.data.dados.tomador.nome).toBe('CLIENTE A')
      expect(pdf.data?.formato === 'pdf' && pdf.data.dados.numero).toBe('54')
    })

    it('a A NÃO baixa o XML nem o PDF da nota da B — mesma resposta de um id que não existe', async () => {
      const inexistente = await baixarMinhaNota(999_999, 'xml')
      for (const formato of ['xml', 'pdf'] as const) {
        const r = await baixarMinhaNota(idDaNotaDaB, formato)
        expect(r.ok).toBe(false)
        expect(r.data).toBeUndefined()
        expect(r.error).toBe(inexistente.error)
        expect(JSON.stringify(r)).not.toContain('CLIENTE B')
        expect(JSON.stringify(r)).not.toContain(CHAVE_DA_B)
      }
    })

    it('trocar a sessão para a B muda quem lê — e só ela lê a dela', async () => {
      ponte.sessao = B
      const r = await baixarMinhaNota(idDaNotaDaB, 'xml')
      expect(r.ok).toBe(true)
      expect(r.data?.formato === 'xml' && r.data.xml).toContain('CLIENTE B SECRETO')
      expect((await baixarMinhaNota(idDaNotaDaA, 'xml')).ok).toBe(false)
    })

    it('nota ainda sem arquivo (em preparação) não tem o que baixar', async () => {
      const r = await baixarMinhaNota(idDaPendenteDaA, 'xml')
      expect(r.ok).toBe(false)
      expect(r.error).toContain('ainda não tem arquivo')
    })

    it('formato fora de xml e pdf é recusado', async () => {
      const r = await baixarMinhaNota(idDaNotaDaA, 'zip' as never)
      expect(r.ok).toBe(false)
      expect(r.error).toBe('Formato inválido.')
    })

    it('nota de teste (produção restrita) nunca é entregue ao cliente, mesmo com XML', async () => {
      const id = await semear({
        chave: 'custodia:FAT-A-9', ref: 'FAT-A-9', email: A, status: 'autorizada', ambiente: 'restrita',
        numero: '3', chaveAcesso: CHAVE_DA_A, xml: xmlDe(CHAVE_DA_A, '3', 'CLIENTE A'),
      })
      const r = await baixarMinhaNota(id, 'xml')
      expect(r.ok).toBe(false)
      const lista = await listarMinhasNotas()
      expect(lista.data?.find((n) => n.id === id)?.estado).toBe('em_preparacao')
      expect(lista.data?.find((n) => n.id === id)?.numero).toBeNull()
    })

    it('nota cancelada continua na lista, com a data, e o arquivo continua disponível', async () => {
      const id = await semear({
        chave: 'custodia:FAT-A-8', ref: 'FAT-A-8', email: A, status: 'cancelada', ambiente: 'producao',
        numero: '41', chaveAcesso: CHAVE_DA_A, xml: xmlDe(CHAVE_DA_A, '41', 'CLIENTE A'),
        canceladaEm: Date.UTC(2026, 10, 14, 22, 41), motivo: '2|Custodia FAT-A-8 cobrada por engano, servico nao prestado',
      })
      const lista = await listarMinhasNotas()
      const nota = lista.data?.find((n) => n.id === id)
      expect(nota).toMatchObject({ estado: 'cancelada', numero: '41', canceladaEm: Date.UTC(2026, 10, 14, 22, 41), motivoDoCancelamento: 'Serviço não prestado', podeBaixar: true })
      expect((await baixarMinhaNota(id, 'xml')).ok).toBe(true)
    })
  })
})
