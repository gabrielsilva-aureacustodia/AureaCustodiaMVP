import { redirect } from 'next/navigation'

/**
 * A comparação com BTC/ETH/USDT saiu do Mercado (A10, QA do Davi, 22/11/2026): o site diz que não é investimento nem
 * plataforma de ativos digitais, e comparar com criptomoedas passa a ideia contrária. A rota fica só para quem
 * tinha o endereço salvo — devolve ao Mercado.
 */
export default function ComparacoesAposentada(): never {
  redirect('/mercado')
}
