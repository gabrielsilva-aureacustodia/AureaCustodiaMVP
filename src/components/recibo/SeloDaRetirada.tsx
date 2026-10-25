/**
 * Selo da situação da retirada física (redesenho da Frente 4, 25/10/2026; Brandbook §9.4).
 *
 * Substitui o `.badge-retirada badge-<status>` de /retirada e do recibo, que mostrava o
 * valor cru do banco em caixa alta ("SEPARACAO", sem cedilha nem til). O texto agora é o
 * nome da etapa em português e o tom segue a regra dos selos: aviso enquanto depende do
 * cliente pagar, informação enquanto anda na custódia, sucesso entregue, perigo cancelada.
 */

import type { ReactNode } from 'react'

import type { StatusRetirada } from '@/domain/types'
import { Selo, type TomDoSelo } from '@/components/ui/Selo'

const ROTULO: Record<StatusRetirada, string> = {
  solicitada: 'Solicitada',
  paga: 'Taxa paga',
  separacao: 'Em separação',
  postada: 'Postada',
  entregue: 'Entregue',
  cancelada: 'Cancelada',
}

const TOM: Record<StatusRetirada, TomDoSelo> = {
  solicitada: 'aviso',
  paga: 'info',
  separacao: 'info',
  postada: 'info',
  entregue: 'sucesso',
  cancelada: 'perigo',
}

export function SeloDaRetirada({ status }: { status: StatusRetirada }): ReactNode {
  return <Selo tom={TOM[status]}>{ROTULO[status]}</Selo>
}
