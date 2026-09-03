'use client'

/**
 * As três modais da área de conta — port de aurea-mvp-teste.html:
 * openPersonalModal (2733-2746), openPasswordModal (2757-2771) e
 * openNotifModal (2790-2803).
 *
 * POR QUE ELAS MORAM AQUI, E NÃO DENTRO DE UMA DAS PÁGINAS
 * -------------------------------------------------------
 * No monolito as três eram funções globais, chamadas tanto pela tela 3.0
 * (atalhos de "Configurações rápidas") quanto pela 3.2 (cartões de configuração).
 * Duas telas, um único conjunto de modais. Mantê-las num módulo próprio preserva
 * essa relação: se o texto de um rótulo mudar, muda nos dois lugares de uma vez.
 *
 * O CICLO DE VIDA MUDOU, O COMPORTAMENTO NÃO
 * ------------------------------------------
 * O original reescrevia o innerHTML de #modalBox a cada abertura e, no caso das
 * notificações, CHAMAVA openNotifModal() de novo depois de cada toggle só para
 * redesenhar o interruptor (linha 2809). Aqui a modal é um componente que lê
 * `me` do AppProvider: quando run() traz o estado novo do servidor, o
 * interruptor se redesenha sozinho. A reabertura manual some porque virou
 * consequência da estrutura.
 *
 * SOBRE O TECLADO NO CELULAR (correção nº 2 do diagnóstico)
 * ---------------------------------------------------------
 * Estas são as únicas modais do sistema com campo de texto, e é nelas que o
 * teclado do celular sobe e come metade da tela. Quem resolve isso é o CSS de
 * styles/base.css: .modal-bg rola (overflow-y:auto, align-items:flex-start) e
 * .modal tem max-height:calc(100dvh - 40px) com overflow-y:auto próprio, de modo
 * que o botão "Salvar" continua alcançável por rolagem. NENHUM estilo inline
 * daqui pode mexer em height, max-height, overflow ou position da .modal — seria
 * o suficiente para anular a correção. Os únicos inline usados são os do
 * original: `opacity` no campo desabilitado e `margin-bottom` no parágrafo.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'

import { DEPOSITO_MAX } from '@/domain/constants'
import { brl, parsePrice } from '@/domain/money'
import { getSettings } from '@/domain/selectors'
import { useApp } from '@/components/providers/AppProvider'
import { useModal } from '@/components/ui/Modal'
import { changePassword, deposit, toggleNotif, updatePersonal } from '@/server/actions/account'
import { iniciarDeposito } from '@/server/actions/payments'
import type { DepositoIniciado } from '@/server/payments/tipos'

/**
 * As três preferências de notificação, na ordem em que o original as listava
 * (linha 2792). A união repete a assinatura de toggleNotif de propósito: um
 * arquivo 'use server' não pode exportar tipos, então o contrato é conferido
 * pelo compilador na chamada.
 */
const NOTIF_KEYS = ['notifEnvios', 'notifNegociacoes', 'notifNovidades'] as const
type NotifKey = (typeof NOTIF_KEYS)[number]

/** Rótulos exatos de notifLabel (linha 2788). */
const NOTIF_LABEL: Record<NotifKey, string> = {
  notifEnvios: 'Atualizações de envios e custódia',
  notifNegociacoes: 'Negociações e ofertas',
  notifNovidades: 'Novidades da plataforma',
}

/* -------------------------------------------------------------------------
 * Dados pessoais
 * ---------------------------------------------------------------------- */

export function ModalDadosPessoais(): ReactNode {
  const { me, session, run } = useApp()
  const { close } = useModal()

  // O original lia o valor do input só na hora de salvar. Aqui o campo é
  // controlado — é o que permite desabilitar o botão durante o envio sem
  // perder o que foi digitado.
  const [nome, setNome] = useState(me.name)
  const [salvando, setSalvando] = useState(false)

  async function salvar(): Promise<void> {
    setSalvando(true)
    const res = await run(() => updatePersonal(nome))
    // Fecha só no sucesso, como o original: a recusa ('Informe um nome válido.')
    // deixava a modal aberta com o texto digitado à vista para correção.
    if (res.ok) close()
    else setSalvando(false)
  }

  return (
    <>
      <h3 className="serif">Dados pessoais</h3>

      {/* O original escapava as aspas do nome (`.replace(/"/g,'&quot;')`) porque
          montava o atributo value dentro de uma template string. Em JSX o valor
          nunca é interpretado como marcação e o escape deixa de existir. */}
      <div className="field-lbl">Nome completo</div>
      <input
        className="tinput"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        aria-label="Nome completo"
      />

      <div className="field-lbl">E-mail (fixo neste ambiente de teste)</div>
      {/* `disabled` já basta para o React aceitar um campo sem onChange — e é
          exatamente o atributo que o original usava (linha 2740). */}
      <input className="tinput" value={session} disabled style={{ opacity: 0.6 }} />

      <div className="m-actions">
        <button className="btn btn-outline" type="button" onClick={close}>
          Cancelar
        </button>
        <button
          className="btn btn-gold"
          type="button"
          disabled={salvando}
          onClick={() => void salvar()}
        >
          Salvar
        </button>
      </div>
    </>
  )
}

/* -------------------------------------------------------------------------
 * Alterar senha
 * ---------------------------------------------------------------------- */

export function ModalSenha(): ReactNode {
  const { run } = useApp()
  const { close } = useModal()

  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar(): Promise<void> {
    // O bloqueio durante o envio não existia no original e aqui não é enfeite:
    // um duplo clique mandaria a segunda troca com a senha ATUAL já obsoleta, e
    // o usuário veria 'Senha atual incorreta.' logo depois do sucesso.
    setSalvando(true)
    const res = await run(() => changePassword(atual, nova, confirmacao))
    if (res.ok) close()
    else setSalvando(false)
  }

  return (
    <>
      <h3 className="serif">Alterar senha</h3>

      <div className="field-lbl">Senha atual</div>
      <input
        type="password"
        className="tinput"
        value={atual}
        onChange={(e) => setAtual(e.target.value)}
        autoComplete="current-password"
        aria-label="Senha atual"
      />

      <div className="field-lbl">Nova senha (mín. 8 caracteres)</div>
      <input
        type="password"
        className="tinput"
        value={nova}
        onChange={(e) => setNova(e.target.value)}
        autoComplete="new-password"
        aria-label="Nova senha"
      />

      <div className="field-lbl">Confirmar nova senha</div>
      <input
        type="password"
        className="tinput"
        value={confirmacao}
        onChange={(e) => setConfirmacao(e.target.value)}
        autoComplete="new-password"
        aria-label="Confirmar nova senha"
      />

      <div className="m-actions">
        <button className="btn btn-outline" type="button" onClick={close}>
          Cancelar
        </button>
        <button
          className="btn btn-gold"
          type="button"
          disabled={salvando}
          onClick={() => void salvar()}
        >
          Salvar nova senha
        </button>
      </div>
    </>
  )
}

/* -------------------------------------------------------------------------
 * Notificações por e-mail
 * ---------------------------------------------------------------------- */

export function ModalNotificacoes(): ReactNode {
  const { me, run } = useApp()
  const { close } = useModal()

  // getSettings CRIA o objeto de preferências quando ele não existe — as contas
  // do seed nascem sem `settings`. A criação acontece sobre a cópia do estado
  // que está no cliente e serve só para desenhar os interruptores com o padrão
  // certo; quem grava de fato é a server action, que chama a mesma função do
  // lado do servidor.
  const s = getSettings(me)

  return (
    <>
      <h3 className="serif">Notificações por e-mail</h3>
      <p style={{ marginBottom: 10 }}>
        Escolha quais avisos você quer receber (simulado neste ambiente de teste — nenhum e-mail é
        enviado).
      </p>

      {NOTIF_KEYS.map((k) => (
        <div className="toggle-row" key={k}>
          <span>{NOTIF_LABEL[k]}</span>
          {/* Mesmo desenho do original: uma <div class="switch"> clicável, sem
              input por baixo. O estado vem de `s[k]` e só muda quando o servidor
              confirma — não há otimismo local que possa divergir do gravado. */}
          <div
            className={s[k] ? 'switch on' : 'switch'}
            role="switch"
            aria-checked={s[k]}
            aria-label={NOTIF_LABEL[k]}
            onClick={() => void run(() => toggleNotif(k))}
          />
        </div>
      ))}

      <div className="m-actions">
        <button className="btn btn-gold" type="button" onClick={close}>
          Concluir
        </button>
      </div>
    </>
  )
}

/* -------------------------------------------------------------------------
 * Depósito em conta (simulado)
 * ---------------------------------------------------------------------- */

/**
 * NÃO É PORT — funcionalidade nova. O monolito não tinha como aumentar saldo:
 * cada conta nascia com o valor do seed e só o perdia comprando.
 *
 * O AVISO DE "SIMULADO" É PARTE DA FUNCIONALIDADE, não um rodapé opcional.
 * Não há Pix, cartão, boleto nem conciliação bancária por trás disto; a ação
 * soma um número ao saldo. Uma tela que parecesse um caixa eletrônico de
 * verdade seria enganosa mesmo num ambiente onde só entram sócios.
 *
 * A modal NÃO fecha quando o valor é recusado, pelo mesmo motivo das outras
 * desta tela: a pessoa precisa continuar vendo o campo para corrigi-lo.
 */
export function ModalDeposito(): ReactNode {
  const { me, run } = useApp()
  const { close } = useModal()

  const [valorTexto, setValorTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  // Resultado da cobrança Pix aberta no Mercado Pago (sandbox). Fica no estado
  // porque o QR e o copia-e-cola precisam continuar na tela enquanto a pessoa
  // paga no aplicativo do banco.
  const [pix, setPix] = useState<DepositoIniciado | null>(null)
  const [erroMp, setErroMp] = useState('')

  const cents = parsePrice(valorTexto)
  const podeDepositar = cents > 0 && cents <= DEPOSITO_MAX && !enviando

  async function depositar(): Promise<void> {
    if (!podeDepositar) return
    setEnviando(true)
    const res = await run(() => deposit(cents))
    if (res.ok) close()
    else setEnviando(false)
  }

  /**
   * Abre a cobrança no gateway. NÃO mexe no saldo — quem credita é o webhook,
   * depois de o Mercado Pago confirmar o pagamento. É por isso que a modal
   * continua aberta mostrando o código: o saldo aparece sozinho quando o ciclo
   * de 10 segundos trouxer o estado novo.
   */
  async function cobrar(metodo: 'pix' | 'checkout_pro'): Promise<void> {
    if (!podeDepositar) return
    setEnviando(true)
    setErroMp('')
    try {
      const res = await iniciarDeposito(cents, metodo)
      if (!res.ok || !res.data) {
        setErroMp(res.error ?? 'Não foi possível abrir a cobrança.')
        return
      }
      if (metodo === 'pix') {
        setPix(res.data)
        return
      }
      // Checkout Pro é página do Mercado Pago, e é assim que nenhum dado de
      // cartão passa pelo servidor da Áurea. Abre em aba nova para a pessoa não
      // perder a modal.
      if (res.data.initPoint) window.open(res.data.initPoint, '_blank', 'noopener,noreferrer')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <h3 className="serif">Depositar em conta</h3>
      <p style={{ marginBottom: 10 }}>
        Depósito <b>simulado</b> neste ambiente de teste: nenhum pagamento é processado e nenhum
        dinheiro real muda de mãos. O valor entra direto no seu saldo para você poder negociar.
      </p>

      <div className="summary-row">
        <span className="k">Saldo atual</span>
        <span className="v">{brl(me.balance)}</span>
      </div>

      <div className="field-lbl">Valor a depositar</div>
      <div className="price-input">
        <span>R$</span>
        <input
          inputMode="decimal"
          placeholder="0,00"
          aria-label="Valor a depositar em reais"
          value={valorTexto}
          onChange={(e) => setValorTexto(e.target.value)}
        />
      </div>

      <div className="summary-row total">
        <span className="k">Saldo após o depósito</span>
        <span className="v" style={{ fontSize: 19 }}>
          {cents > 0 ? brl(me.balance + cents) : '—'}
        </span>
      </div>

      {/* O teto é anteparo de ambiente de teste: um zero a mais digitado sem
          querer desfiguraria o livro de ordens para as outras seis contas. O
          servidor reaplica o limite — este aviso só evita a ida inútil. */}
      {cents > DEPOSITO_MAX ? (
        <div className="note" style={{ marginTop: 10 }}>
          O depósito máximo por operação é {brl(DEPOSITO_MAX)}.
        </div>
      ) : null}

      <div className="m-actions">
        <button className="btn btn-outline" type="button" onClick={close}>
          Cancelar
        </button>
        <button
          className="btn btn-gold"
          type="button"
          disabled={!podeDepositar}
          onClick={() => void depositar()}
        >
          Confirmar depósito
        </button>
      </div>

      {/* ------------------------------------------------------------------
          Mercado Pago em SANDBOX (RA-01). Nenhum valor real é cobrado, e o
          saldo só se move quando o webhook confirmar — nunca no retorno da
          tela. Some quando o parecer jurídico liberar a produção e este bloco
          virar o caminho principal.
         ------------------------------------------------------------------ */}
      <div className="note" style={{ marginTop: 18 }}>
        <b>Pagar de verdade (ambiente de teste do Mercado Pago).</b> O saldo só entra depois
        que o pagamento for confirmado pelo gateway, o que pode levar alguns segundos. Nenhum
        valor real é cobrado.
      </div>

      <div className="m-actions" style={{ marginTop: 10 }}>
        <button
          className="btn btn-outline"
          type="button"
          disabled={!podeDepositar}
          onClick={() => void cobrar('pix')}
        >
          Pagar com Pix
        </button>
        <button
          className="btn btn-outline"
          type="button"
          disabled={!podeDepositar}
          onClick={() => void cobrar('checkout_pro')}
        >
          Cartão ou boleto
        </button>
      </div>

      {erroMp ? (
        <div className="note" style={{ marginTop: 10 }}>
          {erroMp}
        </div>
      ) : null}

      {pix ? (
        <div style={{ marginTop: 14 }}>
          <div className="field-lbl">Pix copia e cola</div>
          <textarea
            readOnly
            rows={3}
            aria-label="Código Pix copia e cola"
            value={pix.qrCode ?? ''}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
          />
          {pix.qrCodeBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`data:image/png;base64,${pix.qrCodeBase64}`}
              alt="QR Code do Pix"
              style={{ display: 'block', width: 180, height: 180, margin: '12px auto' }}
            />
          ) : null}
          <div className="note">
            Referência {pix.externalReference} · {brl(pix.valorCents)}. Assim que o pagamento
            for confirmado, o saldo aparece sozinho nesta tela.
          </div>
        </div>
      ) : null}
    </>
  )
}
