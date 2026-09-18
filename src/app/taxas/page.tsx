import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { LegalDocument } from '@/components/legal/LegalDocument'
import {
  comissaoPorMoeda,
  custoDeCompraPorMoeda,
  liquidoDeVendaPorMoeda,
} from '@/domain/fees'
import { brl } from '@/domain/money'
import { carregarDocumentoVigente } from '@/server/config/documentos'
import { carregarTabelaDeTaxas } from '@/server/taxas/carregar'

export const metadata: Metadata = {
  title: 'Tabela de Taxas | Áurea Custódia',
  description:
    'Tabela oficial de taxas da Áurea Custódia: corretagem de negociação em dois lados, tarifas de custódia física, saques e retiradas.',
}

// A tabela e a versão vigentes vêm do banco desde a C3: dinâmica para não congelar no build.
export const dynamic = 'force-dynamic'

export default async function FeesPage(): Promise<ReactNode> {
  const taxas = await carregarTabelaDeTaxas()
  const info = await carregarDocumentoVigente('tabela_de_taxas')
  const doc = info.documento

  // Exemplo dinâmico de R$ 200,00 (20.000 centavos)
  const precoExemplo = 20_000
  const comissao = comissaoPorMoeda(precoExemplo, taxas)
  const custoTotalCompra = custoDeCompraPorMoeda(precoExemplo, taxas)
  const liquidoVenda = liquidoDeVendaPorMoeda(precoExemplo, taxas)

  return (
    <LegalDocument
      title={doc.titulo}
      version={doc.versao}
      updatedAt={doc.vigenteDesde}
      hash={info.hash}
      eyebrow="Tabela Oficial de Custos e Encargos Operacionais"
    >
      {doc.preambulo && doc.preambulo.length > 0 && (
        <div className="legal-quote">
          {doc.preambulo.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
        </div>
      )}

      <section>
        <h2>1. Negociação no Mercado (Corretagem dos Dois Lados)</h2>
        <p>
          Nas operações de compra e venda de recibos de custódia realizadas no marketplace da
          plataforma, a comissão de corretagem é cobrada de ambas as partes (Decisão F-1 e Cláusula
          7.3.3 dos Termos de Uso), composta por parcela percentual sobre o valor da negociação e
          parcela fixa por moeda transacionada:
        </p>

        <table className="legal-fee-table">
          <thead>
            <tr>
              <th>Contraparte</th>
              <th>Parcela Variável</th>
              <th>Parcela Fixa</th>
              <th>Cobrança</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Comprador</strong>
              </td>
              <td>{(taxas.comissaoCompradorBp / 100).toFixed(1).replace('.', ',')}%</td>
              <td>{brl(taxas.comissaoCompradorFixa)}</td>
              <td>Acrescida ao valor da compra</td>
            </tr>
            <tr>
              <td>
                <strong>Vendedor</strong>
              </td>
              <td>{(taxas.comissaoVendedorBp / 100).toFixed(1).replace('.', ',')}%</td>
              <td>{brl(taxas.comissaoVendedorFixa)}</td>
              <td>Deduzida do valor a receber</td>
            </tr>
          </tbody>
        </table>

        <div className="legal-example-card">
          <h4>Exemplo Prático Demonstrativo — Moeda negociada a {brl(precoExemplo)}:</h4>
          <p>
            • <strong>Comprador:</strong> Preço base ({brl(precoExemplo)}) + Comissão (
            {brl(comissao.comprador)}) = <strong>{brl(custoTotalCompra)}</strong> total pago.
          </p>
          <p>
            • <strong>Vendedor:</strong> Preço base ({brl(precoExemplo)}) − Comissão (
            {brl(comissao.vendedor)}) = <strong>{brl(liquidoVenda)}</strong> valor líquido recebido.
          </p>
          <p>
            • <strong>Áurea Custódia:</strong> Recebe{' '}
            <strong>{brl(comissao.comprador + comissao.vendedor)}</strong> no total ({brl(comissao.comprador)} do comprador + {brl(comissao.vendedor)} do vendedor).
          </p>
        </div>
      </section>

      <section>
        <h2>2. Custódia Física de Moedas (Guarda em Cofre Especializado)</h2>
        <p>
          A taxa de custódia remunera os serviços de guarda em cofre de alta segurança, monitoramento
          24 horas, auditoria permanente do acervo e apólice securitária:
        </p>

        <table className="legal-fee-table">
          <thead>
            <tr>
              <th>Modalidade</th>
              <th>Valor por Moeda</th>
              <th>Condições de Cobrança</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Plano Anual</strong>
              </td>
              <td>{brl(taxas.custodiaAnualPorMoeda)} pelos 12 meses</td>
              <td>
                Equivale a {brl(Math.round(taxas.custodiaAnualPorMoeda / 12))} por mês. Parcelamento em até{' '}
                {taxas.custodiaAnualParcelasMax}x no cartão de crédito
              </td>
            </tr>
            <tr>
              <td>
                <strong>Plano de 24 Meses</strong>
              </td>
              <td>{brl(taxas.custodiaBienalPorMoeda)} pelos 24 meses</td>
              <td>
                Equivale a {brl(Math.round(taxas.custodiaBienalPorMoeda / 24))} por mês. Parcelamento em até{' '}
                {taxas.custodiaBienalParcelasMax}x no cartão de crédito
              </td>
            </tr>
            <tr>
              <td>
                <strong>Ciclo mensal (sem plano)</strong>
              </td>
              <td>{brl(taxas.custodiaMensalPorMoeda)} / mês</td>
              <td>Cobrança pós-paga das moedas sob custódia que não estejam cobertas por um plano vigente</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>3. Saque de Recursos (Transferência Bancária)</h2>
        <p>
          Tarifa referente ao processamento bancário de liquidação para conta corrente ou poupança de
          mesma titularidade do titular da conta:
        </p>
        <table className="legal-fee-table">
          <thead>
            <tr>
              <th>Operação</th>
              <th>Tarifa Fixa</th>
              <th>Prazo de Liquidação</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Saque para conta bancária (PIX/TED)</strong>
              </td>
              <td>{brl(taxas.taxaSaqueFixa)}</td>
              <td>Até 3 (três) dias úteis (D+3)</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>4. Retirada Física de Moedas da Custódia</h2>
        <p>
          Custos operacionais de desentranhamento do cofre, embalagem de alta segurança e logística de
          envio segurado até o endereço cadastrado:
        </p>
        <table className="legal-fee-table">
          <thead>
            <tr>
              <th>Modalidade de Retirada</th>
              <th>Tarifa por Item/Lote</th>
              <th>Parcelamento Máximo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Retirada Comum</strong>
              </td>
              <td>{brl(taxas.taxaRetiradaComum)}</td>
              <td>À vista</td>
            </tr>
            <tr>
              <td>
                <strong>Retirada Segura</strong>
              </td>
              <td>{brl(taxas.taxaRetiradaSegura)}</td>
              <td>Em até {taxas.retiradaSeguraParcelasMax}x no cartão</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>5. Envio Postal para Depósito (Entrada em Custódia)</h2>
        <aside className="legal-draft-warning" role="note" style={{ borderColor: 'var(--gold)' }}>
          <strong>Aviso Obrigatório sobre Despesas de Frete e Postagem:</strong>
          <p>
            Conforme disposto no item 7.5.5 dos <Link href="/termos">Termos de Uso</Link>, todas as
            despesas com envio, frete e contratação do seguro postal de valor declarado junto aos
            Correios ou transportadora para a remessa física de moedas destinadas a depósito em
            custódia correm exclusivamente por conta e ônus do cliente remetente. A Áurea Custódia
            não cobra tarifa de entrada para validação, mas não reembolsa despesas postais.
          </p>
        </aside>
      </section>
    </LegalDocument>
  )
}
