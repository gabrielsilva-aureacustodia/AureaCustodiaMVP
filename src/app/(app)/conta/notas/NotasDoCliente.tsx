'use client'

/**
 * Minha conta › Notas fiscais (frente G, 18/11/2026 — item 9 do Rogério).
 *
 * A lista das notas fiscais de serviço (NFS-e) que o Real Olímpico emitiu em nome do cliente: custódia,
 * comissão de compra e de venda, tarifa de saque, taxa de retirada. Só as DELE — quem filtra é o servidor
 * (`listarMinhasNotas`, por sessão); esta tela não conhece e-mail de ninguém.
 *
 * Cada nota tem um dos cinco estados de `estadoDaNota` (src/domain/nfse/notas-do-cliente.ts):
 *  - emitida: número, data, XML e PDF para baixar;
 *  - cancelada: CONTINUA na lista, com a data e o motivo — sumir esconderia o que aconteceu;
 *  - cancelando: o pedido de cancelamento já foi feito, a Sefin ainda vai registrar;
 *  - em preparação: ainda não saiu. A tela NÃO promete prazo;
 *  - falta cadastro: a única recusa que o cliente resolve sozinho, então é a única que a tela explica.
 *
 * O XML é o documento fiscal oficial; o PDF é a folha para quem não lê XML (src/lib/pdf/nota-pdf.ts), montada
 * no navegador, com import dinâmico: o jsPDF só carrega no clique.
 *
 * Client Component porque os botões baixam arquivo; a marcação do resto poderia ser de servidor, mas a lista
 * precisa do estado de "baixando" por nota.
 */

import Link from 'next/link'
import { useCallback, useEffect, useState, type ReactNode } from 'react'

import { fdate } from '@/domain/dates'
import { brl } from '@/domain/money'
import { competenciaParaTela, type EstadoDaNota, type FormatoDeNota, type NotaDoCliente } from '@/domain/nfse/notas-do-cliente'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import { Esqueleto } from '@/components/ui/Esqueleto'
import { Selo, type TomDoSelo } from '@/components/ui/Selo'
import { useToast } from '@/components/ui/Toast'
import { baixarMinhaNota, listarMinhasNotas } from '@/server/actions/notas'

const FALHA_DOWNLOAD = 'Não foi possível baixar a nota agora. Tente novamente.'

const SELO_DO_ESTADO: Record<EstadoDaNota, { tom: TomDoSelo; texto: string }> = {
  emitida: { tom: 'sucesso', texto: 'Emitida' },
  cancelada: { tom: 'neutro', texto: 'Cancelada' },
  cancelando: { tom: 'aviso', texto: 'Cancelamento em andamento' },
  em_preparacao: { tom: 'aviso', texto: 'Nota em preparação' },
  falta_cadastro: { tom: 'aviso', texto: 'Falta completar o cadastro' },
}

/** Entrega um texto ao navegador como arquivo. */
function baixarTexto(nome: string, texto: string, tipo: string): void {
  const url = URL.createObjectURL(new Blob([texto], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revogar na volta do ciclo: alguns navegadores ainda estão lendo a URL no clique.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function CartaoDaNota({
  nota,
  baixando,
  aoBaixar,
}: {
  nota: NotaDoCliente
  baixando: string | null
  aoBaixar: (n: NotaDoCliente, formato: FormatoDeNota) => void
}): ReactNode {
  const selo = SELO_DO_ESTADO[nota.estado]
  const ocupado = baixando !== null && baixando.startsWith(`${nota.id}-`)
  const temNumero = nota.numero !== null

  return (
    <li className={nota.estado === 'cancelada' ? 'nota-card nota-card--cancelada' : 'nota-card'} id={`nota-${nota.id}`}>
      <div className="nota-cab">
        <h3>{nota.rotuloDoServico}</h3>
        <Selo tom={selo.tom}>{selo.texto}</Selo>
      </div>

      <dl className="nota-meta">
        <div>
          <dt>Nota fiscal</dt>
          <dd>{temNumero ? `NFS-e nº ${nota.numero}` : '—'}</dd>
        </div>
        <div>
          <dt>Competência</dt>
          <dd>{competenciaParaTela(nota.competencia)}</dd>
        </div>
        <div>
          <dt>Valor</dt>
          <dd className="nota-valor">{brl(nota.valorCents)}</dd>
        </div>
        <div>
          <dt>{nota.estado === 'cancelada' ? 'Cancelada em' : 'Emitida em'}</dt>
          <dd>
            {nota.estado === 'cancelada' && nota.canceladaEm
              ? fdate(nota.canceladaEm)
              : nota.emitidaEm
                ? fdate(nota.emitidaEm)
                : '—'}
          </dd>
        </div>
      </dl>

      <p className="nota-desc">{nota.descricao}</p>

      {nota.estado === 'cancelada' && (
        <p className="nota-aviso">
          Cancelada{nota.canceladaEm ? ` em ${fdate(nota.canceladaEm)}` : ''}
          {nota.motivoDoCancelamento ? ` — ${nota.motivoDoCancelamento}` : ''}. Ela continua aqui para você consultar.
        </p>
      )}
      {nota.estado === 'cancelando' && (
        <p className="nota-aviso">Pedimos o cancelamento desta nota. Ele ainda será registrado no governo.</p>
      )}
      {nota.estado === 'em_preparacao' && (
        <p className="nota-aviso">A nota ainda está em preparação. Quando for emitida, ela aparece aqui para você baixar.</p>
      )}
      {nota.estado === 'falta_cadastro' && (
        <p className="nota-aviso">
          Para emitir esta nota precisamos do seu nome completo e CPF.{' '}
          <Link href="/conta" className="nota-link">
            Completar meu cadastro
          </Link>
        </p>
      )}

      {nota.chaveAcesso && (
        <details className="nota-chave">
          <summary>Chave de acesso da nota</summary>
          <code>{nota.chaveAcesso}</code>
        </details>
      )}

      {nota.podeBaixar && (
        <div className="nota-acoes">
          <button type="button" className="btn btn-gold auto" disabled={ocupado} onClick={() => aoBaixar(nota, 'pdf')}>
            {baixando === `${nota.id}-pdf` ? 'Gerando PDF…' : 'Baixar PDF'}
            <span className="sr-only"> da nota {nota.numero}</span>
          </button>
          <button type="button" className="btn btn-outline auto" disabled={ocupado} onClick={() => aoBaixar(nota, 'xml')}>
            {baixando === `${nota.id}-xml` ? 'Baixando…' : 'Baixar XML'}
            <span className="sr-only"> da nota {nota.numero}</span>
          </button>
        </div>
      )}
    </li>
  )
}

export function NotasDoCliente(): ReactNode {
  const toast = useToast()
  const [notas, setNotas] = useState<NotaDoCliente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [baixando, setBaixando] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const r = await listarMinhasNotas()
      if (r.ok && r.data) {
        setNotas(r.data)
        setErro(null)
      } else {
        setErro(r.error ?? 'Não foi possível carregar as notas agora.')
      }
    } catch {
      setErro('Não foi possível carregar as notas agora.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function baixar(nota: NotaDoCliente, formato: FormatoDeNota): Promise<void> {
    setBaixando(`${nota.id}-${formato}`)
    try {
      const r = await baixarMinhaNota(nota.id, formato)
      if (!r.ok || !r.data) {
        toast(r.error ?? FALHA_DOWNLOAD)
        return
      }
      if (r.data.formato === 'xml') {
        baixarTexto(r.data.nome, r.data.xml, 'application/xml;charset=utf-8')
        toast('XML da nota baixado.')
      } else {
        const { baixarNotaPdf } = await import('@/lib/pdf/nota-pdf')
        await baixarNotaPdf({ nota: r.data.nota, dados: r.data.dados, nome: r.data.nome })
        toast('PDF da nota gerado.')
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : FALHA_DOWNLOAD)
    } finally {
      setBaixando(null)
    }
  }

  return (
    <>
      <p className="notas-intro">
        Estas são as notas fiscais de serviço (NFS-e) emitidas em seu nome. O documento fiscal oficial é o arquivo XML;
        o PDF é uma folha para conferência.
      </p>

      {carregando ? (
        <div className="panel">
          <div className="carregando" role="status" aria-busy="true" aria-label="Carregando suas notas fiscais...">
            <Esqueleto altura="14px" largura="100%" />
            <Esqueleto altura="14px" largura="82%" />
            <Esqueleto altura="14px" largura="64%" />
          </div>
        </div>
      ) : erro ? (
        <div className="panel">
          <p className="msg-erro" role="alert">
            {erro}
          </p>
          <button type="button" className="btn btn-outline auto" onClick={() => void carregar()}>
            Tentar de novo
          </button>
        </div>
      ) : notas.length === 0 ? (
        <div className="panel">
          <EstadoVazio titulo="Você ainda não tem notas fiscais.">
            A nota sai quando você paga a custódia das suas moedas, uma comissão de negociação ou uma tarifa. Quando
            sair, ela aparece aqui.
          </EstadoVazio>
        </div>
      ) : (
        <ul className="nota-lista" aria-label="Suas notas fiscais">
          {notas.map((n) => (
            <CartaoDaNota key={n.id} nota={n} baixando={baixando} aoBaixar={(nota, formato) => void baixar(nota, formato)} />
          ))}
        </ul>
      )}
    </>
  )
}
