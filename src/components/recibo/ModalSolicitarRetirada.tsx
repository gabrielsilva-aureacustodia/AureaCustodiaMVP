'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'

import { brl } from '@/domain/money'
import { calcularTaxaRetirada, PRAZO_RETIRADA_DIAS, validarEnderecoRetirada } from '@/domain/retirada'
import type { Coin, EnderecoEntrega, ModalidadeRetirada } from '@/domain/types'
import { useApp } from '@/components/providers/AppProvider'
import { useModal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { consultarCepEnvio, solicitarRetirada } from '@/server/actions/custody'

export interface ModalSolicitarRetiradaProps {
  coin: Coin
  onSuccess?: () => void
}

export function ModalSolicitarRetirada({ coin, onSuccess }: ModalSolicitarRetiradaProps): ReactNode {
  const { me, run } = useApp()
  const { close } = useModal()
  const toast = useToast()

  const [modalidade, setModalidade] = useState<ModalidadeRetirada>('comum')
  const [nome, setNome] = useState(me.name || '')
  const [cpfOuCnpj, setCpfOuCnpj] = useState('')
  const [cep, setCep] = useState('')
  const [logradouro, setLogradouro] = useState('')
  const [numero, setNumero] = useState('')
  const [complemento, setComplemento] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [uf, setUf] = useState('')
  const [telefone, setTelefone] = useState('')

  const [cienteEquiparacao, setCienteEquiparacao] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [submetendo, setSubmetendo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const taxaCents = calcularTaxaRetirada(modalidade)
  const saldoSuficiente = me.balance >= taxaCents
  const saldoApos = me.balance - taxaCents

  /**
   * Consulta o CEP automaticamente ao digitar 8 números.
   */
  async function tratarCep(valor: string): Promise<void> {
    setCep(valor)
    setErro(null)
    const limpo = valor.replace(/\D/g, '')
    if (limpo.length === 8) {
      setBuscandoCep(true)
      try {
        const res = await consultarCepEnvio(limpo)
        if (res.ok && res.data) {
          if (res.data.logradouro) setLogradouro(res.data.logradouro)
          if (res.data.bairro) setBairro(res.data.bairro)
          if (res.data.cidade) setCidade(res.data.cidade)
          if (res.data.uf) setUf(res.data.uf)
        }
      } finally {
        setBuscandoCep(false)
      }
    }
  }

  async function confirmar(): Promise<void> {
    setErro(null)

    if (!cienteEquiparacao) {
      setErro('É obrigatório confirmar a ciência sobre a devolução de moeda equiparável.')
      return
    }

    if (!saldoSuficiente) {
      setErro(`Saldo insuficiente. Você possui ${brl(me.balance)}, mas a taxa é de ${brl(taxaCents)}.`)
      return
    }

    const endereco: EnderecoEntrega = {
      nome: nome.trim(),
      cpfOuCnpj: cpfOuCnpj.trim(),
      logradouro: logradouro.trim(),
      numero: numero.trim(),
      complemento: complemento.trim() ? complemento.trim() : undefined,
      bairro: bairro.trim(),
      cidade: cidade.trim(),
      uf: uf.trim().toUpperCase(),
      cep: cep.trim(),
      telefone: telefone.trim(),
    }

    const validacao = validarEnderecoRetirada(endereco)
    if (!validacao.valido) {
      setErro(validacao.erros[0] ?? 'Endereço de entrega incompleto ou inválido.')
      return
    }

    setSubmetendo(true)
    try {
      const res = await run(() => solicitarRetirada(coin.id, modalidade, endereco))
      if (res.ok) {
        toast(`Retirada física da moeda ${coin.id} solicitada com sucesso! Recibo extinto.`)
        close()
        onSuccess?.()
      } else {
        setErro(res.error || 'Falha ao solicitar retirada física.')
      }
    } finally {
      setSubmetendo(false)
    }
  }

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto' }}>
      <h3 className="serif" style={{ fontSize: '20px', marginBottom: '4px' }}>
        Solicitar Retirada Física
      </h3>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
        Moeda: <strong>{coin.tipoMoeda}</strong> ({coin.id}) · Recibo: <strong>{coin.recibo.codigo}</strong>
      </p>

      {/* 1. Seleção de Modalidade (D-1) */}
      <div className="field-lbl">1. Modalidade de envio e custódia</div>
      <div
        className={`modalidade-card ${modalidade === 'comum' ? 'selecionada' : ''}`}
        onClick={() => setModalidade('comum')}
        role="button"
        tabIndex={0}
      >
        <div className="modalidade-header">
          <span>📦 Comum (Correios com AR)</span>
          <span className="modalidade-preco">{brl(5000)}</span>
        </div>
        <div className="modalidade-desc">
          Expedição via Correios com Aviso de Recebimento (AR) e seguro declarado da moeda. Prazo limite de D+{PRAZO_RETIRADA_DIAS}.
        </div>
      </div>

      <div
        className={`modalidade-card ${modalidade === 'segura' ? 'selecionada' : ''}`}
        onClick={() => setModalidade('segura')}
        role="button"
        tabIndex={0}
      >
        <div className="modalidade-header">
          <span>🛡️ Segura (Transporte de valores blindado)</span>
          <span className="modalidade-preco">{brl(18000)} (em até 2x)</span>
        </div>
        <div className="modalidade-desc">
          Transporte especializado de valores com escolta armada e cobertura securitária integral. Prazo limite de D+{PRAZO_RETIRADA_DIAS}.
        </div>
      </div>

      {/* 2. Endereço Completo (Trava 2) */}
      <div className="field-lbl" style={{ marginTop: '16px' }}>
        2. Endereço de entrega (Trava de segurança)
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>Nome do Destinatário</label>
          <input
            className="tinput"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome completo"
          />
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>CPF ou CNPJ</label>
          <input
            className="tinput"
            value={cpfOuCnpj}
            onChange={(e) => setCpfOuCnpj(e.target.value)}
            placeholder="000.000.000-00"
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginTop: '6px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>
            CEP {buscandoCep ? '⏳...' : ''}
          </label>
          <input
            className="tinput"
            value={cep}
            onChange={(e) => void tratarCep(e.target.value)}
            placeholder="00000-000"
            maxLength={9}
          />
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>Logradouro / Rua</label>
          <input
            className="tinput"
            value={logradouro}
            onChange={(e) => setLogradouro(e.target.value)}
            placeholder="Rua, Avenida, Praça..."
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '6px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>Número</label>
          <input
            className="tinput"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="123"
          />
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>Complemento</label>
          <input
            className="tinput"
            value={complemento}
            onChange={(e) => setComplemento(e.target.value)}
            placeholder="Apto, Bloco (opcional)"
          />
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>Bairro</label>
          <input
            className="tinput"
            value={bairro}
            onChange={(e) => setBairro(e.target.value)}
            placeholder="Bairro"
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: '10px', marginTop: '6px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>Cidade</label>
          <input
            className="tinput"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            placeholder="Cidade"
          />
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>UF</label>
          <input
            className="tinput"
            value={uf}
            onChange={(e) => setUf(e.target.value.toUpperCase())}
            placeholder="MG"
            maxLength={2}
          />
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>Telefone / WhatsApp</label>
          <input
            className="tinput"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(31) 99999-9999"
          />
        </div>
      </div>

      {/* 3. Cláusula de Equiparação de Acervo (Bloco 10) */}
      <div
        className={`confirm-box ${cienteEquiparacao ? 'on' : ''}`}
        onClick={() => setCienteEquiparacao(!cienteEquiparacao)}
        style={{ marginTop: '16px', background: 'var(--gold-wash)', padding: '12px', borderRadius: '8px' }}
      >
        <div className="cb">{cienteEquiparacao ? '✓' : ''}</div>
        <div style={{ fontSize: '12.5px', color: 'var(--text-strong)' }}>
          <strong>Cláusula de devolução de acervo equiparável:</strong> Declaro que estou ciente e
          concordo que a moeda física devolvida <em>não é necessariamente a mesma que foi depositada</em>,
          mas moeda idêntica e equiparável em mesmo padrão e estado de conservação, conforme as regras de custódia da Áurea.
        </div>
      </div>

      {/* 4. Resumo Financeiro e Débito */}
      <div className="summary-box" style={{ marginTop: '14px' }}>
        <div className="sr">
          <span className="k">Saldo disponível em conta</span>
          <span className="v">{brl(me.balance)}</span>
        </div>
        <div className="sr">
          <span className="k">Taxa da retirada ({modalidade === 'comum' ? 'Comum' : 'Segura'})</span>
          <span className="v" style={{ color: 'var(--gold)' }}>- {brl(taxaCents)}</span>
        </div>
        <div className="sr" style={{ fontWeight: 700 }}>
          <span className="k">Saldo restante após débito</span>
          <span className="v" style={{ color: saldoSuficiente ? 'inherit' : 'var(--red)' }}>
            {brl(saldoApos)}
          </span>
        </div>
      </div>

      {!saldoSuficiente ? (
        <div className="warn-box" style={{ marginTop: '8px' }}>
          <svg viewBox="0 0 24 24">
            <path d="M12 3l9 16H3z" />
            <path d="M12 10v4M12 17v.5" />
          </svg>
          <div>
            <strong>Saldo insuficiente:</strong> Você precisa de {brl(taxaCents)} para cobrir a taxa de retirada.
            Seu saldo atual é {brl(me.balance)}. Por favor, realize um depósito em sua conta antes de continuar.
          </div>
        </div>
      ) : null}

      {erro ? (
        <div className="warn-box" style={{ marginTop: '8px' }}>
          <svg viewBox="0 0 24 24">
            <path d="M12 3l9 16H3z" />
            <path d="M12 10v4M12 17v.5" />
          </svg>
          <div>{erro}</div>
        </div>
      ) : null}

      <div className="m-actions" style={{ marginTop: '18px' }}>
        <button className="btn btn-outline" type="button" onClick={close} disabled={submetendo}>
          Cancelar
        </button>
        <button
          className="btn btn-gold"
          type="button"
          disabled={!saldoSuficiente || !cienteEquiparacao || submetendo}
          onClick={() => void confirmar()}
        >
          {submetendo ? 'Processando...' : 'Confirmar e extinguir recibo'}
        </button>
      </div>
    </div>
  )
}
