'use client'

/**
 * Modal de Cadastro Formal Progressivo — Sessão B-2 (Agente B).
 *
 * Exigido no primeiro movimento de dinheiro (depósito, compra direta ou saque).
 * Não é exigido no cadastro inicial nem no login (permanecem livres de fricção).
 *
 * RESTRIÇÃO JURÍDICA INEGOCIÁVEL (Parecer Felipe Moraes / Eduarda Martins):
 *  - NÃO implementar envio de foto de documento (RG/CNH), biometria facial ou selfies.
 *  - Coletar estritamente o necessário: CPF, Nome Completo, Nascimento, Telefone, Endereço e Dados Bancários.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'

import { formatarCep, formatarCpf, formatarTelefone } from '@/domain/cadastro'
import { validarCpf } from '@/domain/cpf'
import type { TipoChavePix, TipoContaBancaria } from '@/domain/types'
import { useApp } from '@/components/providers/AppProvider'
import { useModal } from '@/components/ui/Modal'
import { salvarCadastro } from '@/server/actions/account'
import { consultarCepEnvio } from '@/server/actions/custody'

export interface ModalCadastroProps {
  /** Callback opcional acionado quando o cadastro for salvo com sucesso. */
  onSuccess?: () => void
  /** Motivo da exigência do cadastro para personalizar a mensagem contextual. */
  motivo?: 'deposito' | 'saque' | 'configuracoes' | 'compra'
}

export function ModalCadastro({ onSuccess, motivo = 'deposito' }: ModalCadastroProps): ReactNode {
  const { me, run } = useApp()
  const { close } = useModal()

  const cadExistente = me.cadastro

  // Campos de Identificação
  const [cpf, setCpf] = useState(cadExistente?.cpf ? formatarCpf(cadExistente.cpf) : '')
  const [nomeCompleto, setNomeCompleto] = useState(cadExistente?.nomeCompleto || me.name || '')
  const [dataNascimento, setDataNascimento] = useState(cadExistente?.dataNascimento || '')
  const [telefone, setTelefone] = useState(
    cadExistente?.telefone ? formatarTelefone(cadExistente.telefone) : '',
  )

  // Endereço
  const [cep, setCep] = useState(cadExistente?.endereco.cep ? formatarCep(cadExistente.endereco.cep) : '')
  const [logradouro, setLogradouro] = useState(cadExistente?.endereco.logradouro || '')
  const [numero, setNumero] = useState(cadExistente?.endereco.numero || '')
  const [complemento, setComplemento] = useState(cadExistente?.endereco.complemento || '')
  const [bairro, setBairro] = useState(cadExistente?.endereco.bairro || '')
  const [cidade, setCidade] = useState(cadExistente?.endereco.cidade || '')
  const [uf, setUf] = useState(cadExistente?.endereco.uf || '')

  // Dados Bancários / Pix
  const temContaInicial = Boolean(cadExistente?.dadosBancarios.banco)
  const [metodoBancario, setMetodoBancario] = useState<'pix' | 'conta'>(
    temContaInicial ? 'conta' : 'pix',
  )
  const [tipoChavePix, setTipoChavePix] = useState<TipoChavePix>(
    cadExistente?.dadosBancarios.tipoChavePix || 'cpf',
  )
  const [chavePix, setChavePix] = useState(cadExistente?.dadosBancarios.chavePix || '')

  const [banco, setBanco] = useState(cadExistente?.dadosBancarios.banco || '')
  const [agencia, setAgencia] = useState(cadExistente?.dadosBancarios.agencia || '')
  const [conta, setConta] = useState(cadExistente?.dadosBancarios.conta || '')
  const [tipoConta, setTipoConta] = useState<TipoContaBancaria>(
    cadExistente?.dadosBancarios.tipoConta || 'corrente',
  )

  // Estados de controle
  const [salvando, setSalvando] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [avisoCep, setAvisoCep] = useState('')
  const [erroForm, setErroForm] = useState('')

  // Validação em tempo real de CPF
  const cpfLimpo = cpf.replace(/\D/g, '')
  const cpfValido = cpfLimpo.length === 11 ? validarCpf(cpfLimpo) : null

  async function handleBuscarCep(cepValor: string): Promise<void> {
    const digitos = cepValor.replace(/\D/g, '')
    if (digitos.length !== 8) {
      setAvisoCep('Informe um CEP com 8 dígitos.')
      return
    }

    setBuscandoCep(true)
    setAvisoCep('')
    try {
      const res = await consultarCepEnvio(digitos)
      if (res.ok && res.data && res.data.valido) {
        setLogradouro(res.data.logradouro)
        setBairro(res.data.bairro)
        setCidade(res.data.cidade)
        setUf(res.data.uf)
      } else {
        setAvisoCep(res.error || 'CEP não encontrado.')
      }
    } catch {
      setAvisoCep('Falha ao consultar CEP.')
    } finally {
      setBuscandoCep(false)
    }
  }

  async function salvar(): Promise<void> {
    setErroForm('')

    if (!validarCpf(cpfLimpo)) {
      setErroForm('CPF inválido. Verifique os dígitos informados.')
      return
    }

    if (nomeCompleto.trim().length < 3) {
      setErroForm('Informe seu nome completo.')
      return
    }

    if (!dataNascimento || !/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento.trim())) {
      setErroForm('Data de nascimento inválida (use o formato AAAA-MM-DD).')
      return
    }

    const telLimpo = telefone.replace(/\D/g, '')
    if (telLimpo.length < 10 || telLimpo.length > 11) {
      setErroForm('Informe um telefone válido com DDD (10 ou 11 dígitos).')
      return
    }

    const cepLimpo = cep.replace(/\D/g, '')
    if (
      cepLimpo.length !== 8 ||
      !logradouro.trim() ||
      !numero.trim() ||
      !bairro.trim() ||
      !cidade.trim() ||
      !uf.trim()
    ) {
      setErroForm('Preencha o endereço completo (CEP, logradouro, número, bairro, cidade e UF).')
      return
    }

    const dadosBancariosPayload =
      metodoBancario === 'pix'
        ? {
            chavePix: chavePix.trim(),
            tipoChavePix,
          }
        : {
            banco: banco.trim(),
            agencia: agencia.trim(),
            conta: conta.trim(),
            tipoConta,
          }

    if (metodoBancario === 'pix' && !chavePix.trim()) {
      setErroForm('Informe a sua chave Pix.')
      return
    }

    if (
      metodoBancario === 'conta' &&
      (!banco.trim() || !agencia.trim() || !conta.trim())
    ) {
      setErroForm('Informe o banco, a agência e a conta bancária completos.')
      return
    }

    setSalvando(true)
    try {
      const res = await run(() =>
        salvarCadastro({
          cpf: cpfLimpo,
          nomeCompleto: nomeCompleto.trim(),
          dataNascimento: dataNascimento.trim(),
          telefone: telLimpo,
          endereco: {
            cep: cepLimpo,
            logradouro: logradouro.trim(),
            numero: numero.trim(),
            complemento: complemento.trim() || undefined,
            bairro: bairro.trim(),
            cidade: cidade.trim(),
            uf: uf.trim().toUpperCase(),
          },
          dadosBancarios: dadosBancariosPayload,
        }),
      )

      if (res.ok) {
        close()
        if (onSuccess) onSuccess()
      } else {
        setErroForm(res.error || 'Não foi possível salvar o cadastro.')
      }
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <h3 className="serif">
        {cadExistente ? 'Atualizar cadastro formal' : 'Completar cadastro formal'}
      </h3>

      {motivo === 'deposito' && !cadExistente && (
        <p style={{ marginBottom: 14 }}>
          Por conformidade legal e fiscal, solicitamos a confirmação dos seus dados no primeiro
          depósito. Essa etapa é necessária uma única vez.
        </p>
      )}

      {motivo === 'compra' && !cadExistente && (
        <p style={{ marginBottom: 14 }}>
          Por conformidade legal e fiscal, solicitamos a confirmação dos seus dados antes de realizar
          a compra direta. Essa etapa é necessária uma única vez.
        </p>
      )}

      {motivo === 'saque' && (
        <p style={{ marginBottom: 14 }}>
          O saque de recursos exige cadastro completo e chave Pix ou dados bancários do titular. O
          prazo D+3 só começa a contar após essa confirmação.
        </p>
      )}

      {motivo === 'configuracoes' && (
        <p style={{ marginBottom: 14 }}>
          Mantenha seus dados atualizados para movimentações financeiras e emissão de notas fiscais.
        </p>
      )}

      {/* ---------------- 1. DADOS PESSOAIS ---------------- */}
      <div className="field-lbl">1. Identificação pessoal</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>CPF</label>
          <input
            className="tinput"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => setCpf(formatarCpf(e.target.value))}
            maxLength={14}
            aria-label="CPF"
          />
          {cpfValido === false && (
            <span style={{ fontSize: 11, color: '#f87171' }}>CPF inválido</span>
          )}
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Data de nascimento</label>
          <input
            type="date"
            className="tinput"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
            aria-label="Data de nascimento"
          />
        </div>
      </div>

      <div style={{ marginTop: 6 }}>
        <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nome completo (do titular)</label>
        <input
          className="tinput"
          placeholder="Nome idêntico ao documento"
          value={nomeCompleto}
          onChange={(e) => setNomeCompleto(e.target.value)}
          aria-label="Nome completo"
        />
      </div>

      <div style={{ marginTop: 6 }}>
        <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Telefone com DDD</label>
        <input
          className="tinput"
          placeholder="(11) 99999-9999"
          value={telefone}
          onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
          maxLength={15}
          aria-label="Telefone com DDD"
        />
      </div>

      {/* ---------------- 2. ENDEREÇO COM AUTOCOMPLETAR ---------------- */}
      <div className="field-lbl" style={{ marginTop: 18 }}>
        2. Endereço residencial
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>CEP</label>
          <input
            className="tinput"
            placeholder="00000-000"
            value={cep}
            onChange={(e) => {
              const f = formatarCep(e.target.value)
              setCep(f)
              if (f.replace(/\D/g, '').length === 8) {
                void handleBuscarCep(f)
              }
            }}
            maxLength={9}
            aria-label="CEP"
          />
        </div>
        <button
          className="btn btn-outline"
          type="button"
          style={{ height: 42, padding: '0 16px', fontSize: 13, marginBottom: 4 }}
          disabled={buscandoCep}
          onClick={() => void handleBuscarCep(cep)}
        >
          {buscandoCep ? 'Buscando...' : 'Buscar CEP'}
        </button>
      </div>

      {avisoCep && (
        <div style={{ fontSize: 12, color: '#f87171', marginBottom: 6 }}>{avisoCep}</div>
      )}

      <div style={{ marginTop: 6 }}>
        <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Logradouro / Rua</label>
        <input
          className="tinput"
          placeholder="Rua, Avenida, etc."
          value={logradouro}
          onChange={(e) => setLogradouro(e.target.value)}
          aria-label="Logradouro"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginTop: 6 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Número</label>
          <input
            className="tinput"
            placeholder="123"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            aria-label="Número do endereço"
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Complemento (opcional)</label>
          <input
            className="tinput"
            placeholder="Apto, Bloco, etc."
            value={complemento}
            onChange={(e) => setComplemento(e.target.value)}
            aria-label="Complemento"
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 0.8fr', gap: 10, marginTop: 6 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Bairro</label>
          <input
            className="tinput"
            placeholder="Bairro"
            value={bairro}
            onChange={(e) => setBairro(e.target.value)}
            aria-label="Bairro"
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cidade</label>
          <input
            className="tinput"
            placeholder="Cidade"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            aria-label="Cidade"
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>UF</label>
          <input
            className="tinput"
            placeholder="UF"
            value={uf}
            onChange={(e) => setUf(e.target.value.toUpperCase())}
            maxLength={2}
            aria-label="Estado UF"
          />
        </div>
      </div>

      {/* ---------------- 3. DADOS BANCÁRIOS / SAQUE ---------------- */}
      <div className="field-lbl" style={{ marginTop: 18 }}>
        3. Dados para recebimento de saques (D+3)
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button
          type="button"
          className={`btn ${metodoBancario === 'pix' ? 'btn-gold' : 'btn-outline'}`}
          style={{ flex: 1, padding: '7px 12px', fontSize: 13 }}
          onClick={() => setMetodoBancario('pix')}
        >
          Chave Pix (Recomendado)
        </button>
        <button
          type="button"
          className={`btn ${metodoBancario === 'conta' ? 'btn-gold' : 'btn-outline'}`}
          style={{ flex: 1, padding: '7px 12px', fontSize: 13 }}
          onClick={() => setMetodoBancario('conta')}
        >
          Conta bancária tradicional
        </button>
      </div>

      {metodoBancario === 'pix' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tipo de chave</label>
            <select
              className="tinput"
              value={tipoChavePix}
              onChange={(e) => setTipoChavePix(e.target.value as TipoChavePix)}
              aria-label="Tipo de chave Pix"
            >
              <option value="cpf">CPF</option>
              <option value="email">E-mail</option>
              <option value="telefone">Telefone</option>
              <option value="aleatoria">Chave Aleatória</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Chave Pix</label>
            <input
              className="tinput"
              placeholder={
                tipoChavePix === 'cpf'
                  ? '000.000.000-00'
                  : tipoChavePix === 'email'
                    ? 'seu@email.com'
                    : tipoChavePix === 'telefone'
                      ? '(11) 99999-9999'
                      : 'Chave EVP'
              }
              value={chavePix}
              onChange={(e) => setChavePix(e.target.value)}
              aria-label="Chave Pix"
            />
          </div>
        </div>
      ) : (
        <>
          <div style={{ marginTop: 6 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Banco</label>
            <input
              className="tinput"
              placeholder="Ex: Banco do Brasil, Itaú, Bradesco, Nubank"
              value={banco}
              onChange={(e) => setBanco(e.target.value)}
              aria-label="Nome ou código do banco"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: 10, marginTop: 6 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Agência</label>
              <input
                className="tinput"
                placeholder="0001"
                value={agencia}
                onChange={(e) => setAgencia(e.target.value)}
                aria-label="Agência bancária"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Conta com dígito</label>
              <input
                className="tinput"
                placeholder="12345-6"
                value={conta}
                onChange={(e) => setConta(e.target.value)}
                aria-label="Conta bancária"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tipo</label>
              <select
                className="tinput"
                value={tipoConta}
                onChange={(e) => setTipoConta(e.target.value as TipoContaBancaria)}
                aria-label="Tipo de conta bancária"
              >
                <option value="corrente">Corrente</option>
                <option value="poupanca">Poupança</option>
              </select>
            </div>
          </div>
        </>
      )}

      {/* Aviso LGPD / Minimização */}
      <div className="note" style={{ marginTop: 14, fontSize: 11.5 }}>
        <b>Privacidade e LGPD:</b> Seus dados são protegidos por criptografia e utilizados
        exclusivamente para conformidade fiscal e transferências bancárias. A Áurea não exige nem
        armazena fotos de documentos, biometria facial ou selfies.
      </div>

      {erroForm && (
        <div className="note" style={{ marginTop: 10, color: '#f87171' }}>
          {erroForm}
        </div>
      )}

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
          {salvando ? 'Salvando...' : 'Salvar cadastro'}
        </button>
      </div>
    </>
  )
}
