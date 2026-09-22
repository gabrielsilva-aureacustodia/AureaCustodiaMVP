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

import { descreverDadosBancarios, temCadastroCompleto, temDadosBancarios } from '@/domain/cadastro'
import { brl, parsePrice } from '@/domain/money'
import { calcularDataLimiteSaque } from '@/domain/dates'
import { getSettings } from '@/domain/selectors'
import { useApp } from '@/components/providers/AppProvider'
import { useModal } from '@/components/ui/Modal'
import { changePassword, solicitarSaque, toggleNotif, updatePersonal, verificarTrocaEmail } from '@/server/actions/account'
import { iniciarDeposito } from '@/server/actions/payments'
import { ModalCadastro } from './ModalCadastro'
import { PainelPagamento } from '@/components/pagamento'

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
  const { close, open } = useModal()

  const [nome, setNome] = useState(me.name)
  const [email, setEmail] = useState(session)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const completo = temCadastroCompleto(me)

  async function salvar(): Promise<void> {
    setSalvando(true)
    setErro('')
    const novoEmailLimpo = email.trim().toLowerCase()
    const emailMudou = novoEmailLimpo !== session.trim().toLowerCase()

    if (!emailMudou) {
      const res = await run(() => updatePersonal(nome))
      if (res.ok) {
        close()
      } else {
        setSalvando(false)
        if (res.error) setErro(res.error)
      }
      return
    }

    // Se o e-mail mudou, valida antes e verifica se requer definição de senha (conta Google)
    const check = await verificarTrocaEmail(novoEmailLimpo)
    if (!check.ok) {
      setSalvando(false)
      setErro(check.error ?? 'Não foi possível validar a troca de e-mail.')
      return
    }

    if (check.data?.requerSenha) {
      setSalvando(false)
      open(
        <ModalDefinirSenhaTrocaEmail
          nome={nome}
          novoEmail={novoEmailLimpo}
          onVoltar={() => open(<ModalDadosPessoais />)}
        />,
      )
      return
    }

    // Usuário já tinha senha (login por e-mail e senha)
    const res = await run(() => updatePersonal(nome, novoEmailLimpo))
    if (res.ok) {
      close()
      window.location.reload()
    } else {
      setSalvando(false)
      if (res.error) setErro(res.error)
    }
  }

  return (
    <>
      <h3 className="serif">Dados pessoais</h3>

      <div className="field-lbl">Nome completo</div>
      <input
        className="tinput"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        aria-label="Nome completo"
      />

      <div className="field-lbl">E-mail</div>
      <input
        className="tinput"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="E-mail"
      />

      {erro ? (
        <div className="note" style={{ marginTop: 10, color: 'var(--red)' }}>
          {erro}
        </div>
      ) : null}

      {/* Identificação formal progressiva (Agente B) */}
      <div className="field-lbl" style={{ marginTop: 18 }}>
        Cadastro formal e bancário
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 14px',
          background: 'var(--input-bg)',
          borderRadius: 8,
          border: '1px solid var(--line-soft)',
          marginBottom: 10,
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)' }}>
            {completo ? 'Cadastro completo' : 'Cadastro pendente'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {completo
              ? `${me.cadastro?.cpf ? `CPF ${me.cadastro.cpf} · ` : ''}${descreverDadosBancarios(me.cadastro?.dadosBancarios)}`
              : 'Necessário para depósitos e saques'}
          </div>
        </div>
        <button
          type="button"
          className="btn btn-outline"
          style={{ padding: '6px 14px', fontSize: 12, width: 'auto', flexShrink: 0 }}
          onClick={() => open(<ModalCadastro motivo="configuracoes" />)}
        >
          {completo ? 'Editar dados' : 'Completar'}
        </button>
      </div>

      <div className="m-actions">
        <button className="btn btn-outline" type="button" onClick={close} disabled={salvando}>
          Cancelar
        </button>
        <button
          className="btn btn-gold"
          type="button"
          disabled={salvando || !nome.trim() || !email.trim()}
          onClick={() => void salvar()}
        >
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </>
  )
}

/* -------------------------------------------------------------------------
 * Definir senha ao trocar e-mail (para contas que usavam login com Google)
 * ---------------------------------------------------------------------- */

export function ModalDefinirSenhaTrocaEmail({
  nome,
  novoEmail,
  onVoltar,
}: {
  nome: string
  novoEmail: string
  onVoltar?: () => void
}): ReactNode {
  const { run } = useApp()
  const { close } = useModal()

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function confirmar(): Promise<void> {
    if (novaSenha.length < 8) {
      setErro('A nova senha precisa de pelo menos 8 caracteres.')
      return
    }
    if (novaSenha !== confirmacao) {
      setErro('A confirmação da nova senha não confere.')
      return
    }

    setSalvando(true)
    setErro('')
    const res = await run(() => updatePersonal(nome, novoEmail, novaSenha))
    if (res.ok) {
      close()
      window.location.reload()
    } else {
      setSalvando(false)
      if (res.error) setErro(res.error)
    }
  }

  return (
    <>
      <h3 className="serif">Definir senha de acesso</h3>
      <p style={{ marginBottom: 12 }}>
        Sua conta utilizava login com o Google. Ao alterar o e-mail para <b>{novoEmail}</b>,
        o vínculo com o Google será removido e você precisará de uma senha para acessar sua conta.
      </p>

      <div className="field-lbl">Nova senha (mín. 8 caracteres)</div>
      <input
        type="password"
        className="tinput"
        value={novaSenha}
        onChange={(e) => setNovaSenha(e.target.value)}
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

      {erro ? (
        <div className="note" style={{ marginTop: 10, color: 'var(--red)' }}>
          {erro}
        </div>
      ) : null}

      <div className="m-actions">
        <button
          className="btn btn-outline"
          type="button"
          disabled={salvando}
          onClick={onVoltar ?? close}
        >
          {onVoltar ? 'Voltar' : 'Cancelar'}
        </button>
        <button
          className="btn btn-gold"
          type="button"
          disabled={salvando || !novaSenha || !confirmacao}
          onClick={() => void confirmar()}
        >
          {salvando ? 'Salvando...' : 'Confirmar e salvar'}
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
        Escolha quais avisos você quer receber. O envio por e-mail ainda não está ativo — por
        enquanto a preferência fica registrada na sua conta.
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
  // Teto da configuração do painel (C3); sem banco, o DEPOSITO_MAX do código.
  const { me, depositoMax: DEPOSITO_MAX } = useApp()
  const { close, open } = useModal()

  const [valorTexto, setValorTexto] = useState('')

  // Defesa em profundidade (Agente B): se a modal de depósito for invocada diretamente
  // sem cadastro completo, orienta a pessoa a preencher antes de continuar.
  if (!temCadastroCompleto(me)) {
    return (
      <>
        <h3 className="serif">Cadastro necessário</h3>
        <p style={{ marginBottom: 14 }}>
          Por conformidade legal e fiscal, é necessário completar seu cadastro antes de realizar o
          primeiro depósito em conta.
        </p>

        <div className="note" style={{ marginBottom: 16 }}>
          O Real Olímpico protege o que tem valor para gerações. Seus dados são protegidos sob a LGPD
          e utilizados exclusivamente para identificação fiscal e transferências bancárias. Não
          solicitamos fotos de documentos nem biometria facial.
        </div>

        <div className="m-actions">
          <button className="btn btn-outline" type="button" onClick={close}>
            Cancelar
          </button>
          <button
            className="btn btn-gold"
            type="button"
            onClick={() =>
              open(
                <ModalCadastro
                  motivo="deposito"
                  onSuccess={() => open(<ModalDeposito />)}
                />,
              )
            }
          >
            Completar cadastro
          </button>
        </div>
      </>
    )
  }

  const cents = parsePrice(valorTexto)
  const podeDepositar = cents > 0 && cents <= DEPOSITO_MAX

  return (
    <>
      <h3 className="serif">Depositar em conta</h3>
      <p style={{ marginBottom: 10 }}>
        O saldo entra na sua conta <b>depois</b> que o pagamento for confirmado pelo banco ou pela
        operadora do cartão, o que pode levar alguns segundos.
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

      {cents > DEPOSITO_MAX ? (
        <div className="note" style={{ marginTop: 10 }}>
          O depósito máximo por operação é {brl(DEPOSITO_MAX)}.
        </div>
      ) : null}

      {podeDepositar ? (
        <div style={{ marginTop: 16 }}>
          <PainelPagamento
            valorCents={cents}
            iniciarPix={async () => {
              const res = await iniciarDeposito(cents, 'pix')
              if (!res.ok || !res.data) {
                throw new Error(res.error ?? 'Não foi possível abrir a cobrança Pix.')
              }
              return res.data
            }}
            iniciarCartao={async () => {
              const res = await iniciarDeposito(cents, 'checkout_pro')
              if (!res.ok || !res.data) {
                throw new Error(res.error ?? 'Não foi possível abrir o checkout do cartão.')
              }
              return res.data
            }}
            aoConcluir={close}
          />
        </div>
      ) : (
        <div className="note" style={{ marginTop: 14 }}>
          {cents > DEPOSITO_MAX
            ? `O depósito máximo por operação é ${brl(DEPOSITO_MAX)}.`
            : 'Informe o valor desejado acima para escolher o pagamento por Pix ou Cartão.'}
        </div>
      )}

      <div className="m-actions" style={{ marginTop: 14 }}>
        <button className="btn btn-outline" type="button" onClick={close}>
          Cancelar
        </button>
      </div>
    </>
  )
}

/* -------------------------------------------------------------------------
 * Saque de recursos (Agente B - Sessão B-4)
 * ---------------------------------------------------------------------- */

export function ModalSaque(): ReactNode {
  const { me, run, taxas } = useApp()
  // Tarifa da Tabela de Taxas vigente (C3); sem banco, a do código.
  const TAXA_SAQUE_FIXA_CENTS = taxas.taxaSaqueFixa
  const { close, open } = useModal()

  const [valorTexto, setValorTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  // Defesa em profundidade: sem dados bancários cadastrados, o prazo D+3 não
  // começa a correr e o saque não pode ser concluído.
  if (!temDadosBancarios(me)) {
    return (
      <>
        <h3 className="serif">Dados bancários necessários</h3>
        <p style={{ marginBottom: 14 }}>
          Para solicitar saque do seu saldo, é necessário cadastrar sua chave Pix ou dados
          bancários de mesma titularidade (CPF correspondente).
        </p>

        <div className="note" style={{ marginBottom: 16 }}>
          O prazo regulamentar de liquidação de <b>D+3 úteis</b> só tem início após a confirmação
          dos dados de destino da transferência.
        </div>

        <div className="m-actions">
          <button className="btn btn-outline" type="button" onClick={close}>
            Cancelar
          </button>
          <button
            className="btn btn-gold"
            type="button"
            onClick={() =>
              open(
                <ModalCadastro
                  motivo="saque"
                  onSuccess={() => open(<ModalSaque />)}
                />,
              )
            }
          >
            Cadastrar dados bancários
          </button>
        </div>
      </>
    )
  }

  const cents = parsePrice(valorTexto)
  const { formatada: dataPrevistaBR } = calcularDataLimiteSaque()
  const podeSacar = cents > TAXA_SAQUE_FIXA_CENTS && cents <= me.balance && !enviando

  async function executarSaque(): Promise<void> {
    if (!podeSacar) return
    setEnviando(true)
    setErro('')
    try {
      const res = await run(() => solicitarSaque(cents))
      if (res.ok) {
        close()
      } else {
        setErro(res.error ?? 'Não foi possível solicitar o saque.')
        setEnviando(false)
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao processar solicitação.')
      setEnviando(false)
    }
  }

  return (
    <>
      <h3 className="serif">Solicitar saque</h3>
      <p style={{ marginBottom: 10 }}>
        Transferência do saldo em conta para sua chave Pix ou conta bancária cadastrada.
      </p>

      <div className="summary-row">
        <span className="k">Saldo disponível</span>
        <span className="v">{brl(me.balance)}</span>
      </div>

      <div className="summary-row">
        <span className="k">Conta de destino</span>
        <span className="v" style={{ textAlign: 'right' }}>
          {descreverDadosBancarios(me.cadastro?.dadosBancarios)}
          <span
            className="back-link"
            style={{ display: 'block', fontSize: 11, marginTop: 2, cursor: 'pointer' }}
            onClick={() =>
              open(
                <ModalCadastro
                  motivo="saque"
                  onSuccess={() => open(<ModalSaque />)}
                />,
              )
            }
          >
            Alterar dados
          </span>
        </span>
      </div>

      <div className="field-lbl">Valor a sacar</div>
      <div className="price-input">
        <span>R$</span>
        <input
          inputMode="decimal"
          placeholder="0,00"
          aria-label="Valor a sacar em reais"
          value={valorTexto}
          onChange={(e) => setValorTexto(e.target.value)}
        />
      </div>

      <div className="summary-row">
        <span className="k">Tarifa de saque (fixa)</span>
        <span className="v">{brl(TAXA_SAQUE_FIXA_CENTS)}</span>
      </div>

      <div className="summary-row total">
        <span className="k">Valor líquido a receber</span>
        <span className="v" style={{ fontSize: 19 }}>
          {cents > TAXA_SAQUE_FIXA_CENTS ? brl(cents - TAXA_SAQUE_FIXA_CENTS) : '—'}
        </span>
      </div>

      <div className="summary-row">
        <span className="k">Prazo de liquidação</span>
        <span className="v">D+3 úteis (previsão: {dataPrevistaBR})</span>
      </div>

      {cents > 0 && cents <= TAXA_SAQUE_FIXA_CENTS ? (
        <div className="note" style={{ marginTop: 10 }}>
          O valor do saque deve ser superior à tarifa fixa de {brl(TAXA_SAQUE_FIXA_CENTS)}.
        </div>
      ) : null}

      {cents > me.balance ? (
        <div className="note" style={{ marginTop: 10 }}>
          Saldo insuficiente para este saque. Seu saldo disponível é {brl(me.balance)}.
        </div>
      ) : null}

      {erro ? (
        <div className="note" style={{ marginTop: 10, color: 'var(--red)' }}>
          {erro}
        </div>
      ) : null}

      <div className="m-actions">
        <button className="btn btn-outline" type="button" onClick={close} disabled={enviando}>
          Cancelar
        </button>
        <button
          className="btn btn-gold"
          type="button"
          disabled={!podeSacar}
          onClick={() => void executarSaque()}
        >
          {enviando ? 'Solicitando...' : 'Confirmar saque'}
        </button>
      </div>

      <div className="note" style={{ marginTop: 14 }}>
        A liquidação é realizada via Pix para a conta informada. O débito no saldo é imediato e a
        transferência ocorre em até 3 dias úteis.
      </div>
    </>
  )
}

/** Mantido para retrocompatibilidade. */
export function ModalSaqueInfo(): ReactNode {
  return <ModalSaque />
}

export { ModalCadastro }

