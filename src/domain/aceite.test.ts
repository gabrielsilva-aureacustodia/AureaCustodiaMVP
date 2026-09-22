import { describe, expect, it } from 'vitest'

import { GENESIS } from '@/domain/hash'
import {
  CAMPOS_DO_ACEITE,
  encadearAceites,
  hashDeAceite,
  verificarCadeiaAceites,
  type AceitePendente,
} from './aceite'

describe('Módulo de Domínio · Aceite como Prova Legal (aceite.ts)', () => {
  it('CAMPOS_DO_ACEITE está congelado na ordem correta', () => {
    expect(CAMPOS_DO_ACEITE).toEqual([
      'createdAt',
      'userEmail',
      'documentoChave',
      'documentoVersao',
      'hashConteudo',
      'canal',
      'metodo',
      'textoExibido',
      'nomeDigitado',
      'ip',
      'userAgent',
    ])
  })

  it('calcula o hash encadeado a partir do GENESIS para o primeiro aceite', () => {
    const pendente: AceitePendente = {
      createdAt: 1773489600000,
      userEmail: 'rogeriopena@testeaurea.com.br',
      documentoChave: 'termos_de_uso',
      documentoVersao: '1.0',
      hashConteudo: 'eeffba3c0218116aedc8b559d82003c0584a1060e12d344ce5d74d72be855421',
      canal: 'cadastro_email',
      metodo: 'clique_no_botao',
      textoExibido: 'Ao criar a conta, você aceita os Termos de Uso.',
      nomeDigitado: null,
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0 Test',
    }

    const [aceite] = encadearAceites([pendente], GENESIS)
    expect(aceite.hashAnterior).toBe(GENESIS)
    expect(aceite.hash).toMatch(/^[0-9a-f]{64}$/)
    expect(hashDeAceite(aceite)).toBe(aceite.hash)
  })

  it('encadeia múltiplos aceites sucessivos e valida a integridade da cadeia', () => {
    const p1: AceitePendente = {
      createdAt: 1000,
      userEmail: 'rogerio@testeaurea.com.br',
      documentoChave: 'termos_de_uso',
      documentoVersao: '1.0',
      hashConteudo: 'hash1',
      canal: 'cadastro_email',
      metodo: 'clique_no_botao',
      textoExibido: 'Texto 1',
      nomeDigitado: null,
      ip: '1.1.1.1',
      userAgent: 'UA1',
    }

    const p2: AceitePendente = {
      createdAt: 2000,
      userEmail: 'rogerio@testeaurea.com.br',
      documentoChave: 'tabela_de_taxas',
      documentoVersao: '1.0',
      hashConteudo: 'hash2',
      canal: 'cadastro_email',
      metodo: 'clique_no_botao',
      textoExibido: 'Texto 2',
      nomeDigitado: null,
      ip: '1.1.1.1',
      userAgent: 'UA1',
    }

    const p3: AceitePendente = {
      createdAt: 3000,
      userEmail: 'rogerio@testeaurea.com.br',
      documentoChave: 'clausula_arbitragem',
      documentoVersao: '1.0',
      hashConteudo: 'hash3',
      canal: 'cadastro_email',
      metodo: 'caixa_e_nome_digitado',
      textoExibido: 'Texto 3',
      nomeDigitado: 'Rogério Siqueira',
      ip: '1.1.1.1',
      userAgent: 'UA1',
    }

    const encadeados = encadearAceites([p1, p2, p3])
    expect(encadeados).toHaveLength(3)
    expect(encadeados[0].hashAnterior).toBe(GENESIS)
    expect(encadeados[1].hashAnterior).toBe(encadeados[0].hash)
    expect(encadeados[2].hashAnterior).toBe(encadeados[1].hash)

    // Cadeia íntegra retorna true
    expect(verificarCadeiaAceites(encadeados)).toBe(true)

    // Adulteração do nome digitado em um aceite quebra a cadeia
    const adulterado = [...encadeados]
    adulterado[0] = { ...adulterado[0], nomeDigitado: 'Outro Nome' }
    expect(verificarCadeiaAceites(adulterado)).toBe(false)

    // Adulteração do IP quebra a cadeia
    const adulteradoIp = [...encadeados]
    adulteradoIp[1] = { ...adulteradoIp[1], ip: '200.200.200.200' }
    expect(verificarCadeiaAceites(adulteradoIp)).toBe(false)

    // Quebra de continuidade de hashAnterior
    const adulteradoElo = [...encadeados]
    adulteradoElo[2] = { ...adulteradoElo[2], hashAnterior: '0000' }
    expect(verificarCadeiaAceites(adulteradoElo)).toBe(false)
  })
})

