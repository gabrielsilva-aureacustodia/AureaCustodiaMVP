/**
 * O texto do painel "Baixe o app" — abas iPhone e Android — renderizado de verdade e conferido em palavras.
 *
 * Por que testar texto: o painel é o único lugar onde o cliente do iPhone aprende o que só o iOS exige (entrar antes de
 * adicionar, deixar ligada a chave "Abrir como app web"). Uma frase apagada num ajuste de estilo faria o "não funciona no
 * iPhone" voltar sem nenhum teste vermelho. As frases vêm da revisão de 17/11/2026 contra o iOS 27.x
 * (docs/pwa/DIAGNOSTICO_PWA.md, ponto 8) e foram aprovadas pelo chat de branch da frente E.
 *
 * `renderToStaticMarkup` basta: as duas abas são componentes sem estado, e a suíte roda em ambiente `node`.
 */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { Ambiente } from '@/lib/pwa/instalacao'

import { PassosAndroid, PassosIphone } from './GuiaDeInstalacao'

const SAFARI_NO_IPHONE: Ambiente = { plataforma: 'ios', navegador: 'safari', embutido: false }
const CHROME_NO_IPHONE: Ambiente = { plataforma: 'ios', navegador: 'chrome', embutido: false }
const INSTAGRAM_NO_IPHONE: Ambiente = { plataforma: 'ios', navegador: 'outro', embutido: true }
const CHROME_NO_ANDROID: Ambiente = { plataforma: 'android', navegador: 'chrome', embutido: false }

function iphone(ambiente: Ambiente): string {
  return renderToStaticMarkup(createElement(PassosIphone, { ambiente }))
}

function android(): string {
  return renderToStaticMarkup(
    createElement(PassosAndroid, { ambiente: CHROME_NO_ANDROID, podeInstalarDireto: false, instalando: false, aoInstalar: () => {} }),
  )
}

/**
 * Só o que a pessoa lê: sem marcação, sem entidades, espaços colapsados. O fim de um bloco (parágrafo, item, caixa) vira
 * espaço, para que o título de um passo não cole na dica; as marcas de dentro da frase (`<strong>`, ícones) somem sem
 * deixar espaço, para a pontuação ficar onde a pessoa a vê ("Safari." e não "Safari .").
 */
function texto(html: string): string {
  return html
    .replace(/<\/(p|li|div|span|h2|ol|header|footer|button)>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;|&#x27;|&amp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const passos = (html: string): number => (html.match(/class="pwa-passo"/g) ?? []).length

describe('aba iPhone do painel de instalação', () => {
  it('pede para entrar ANTES de adicionar — sem prometer o que só um aparelho real confirma', () => {
    const t = texto(iphone(SAFARI_NO_IPHONE))
    expect(t).toContain('Antes de adicionar, entre na sua conta.')
    expect(t).toContain('Assim o app costuma abrir já com o seu acesso.')
    expect(t).toContain('Se ele pedir o seu login na primeira vez, é só entrar de novo.')
    // A promessa seca ("já abre com o seu acesso") não pode voltar: é inferência da documentação do iOS 17.2.
    expect(t).not.toContain('Assim o app já abre')
  })

  it('pede para deixar ligada a chave "Abrir como app web" e descreve o efeito (o rótulo exato só o aparelho confirma)', () => {
    const t = texto(iphone(SAFARI_NO_IPHONE))
    expect(t).toContain('Deixe ligada a chave Abrir como app web e toque em Adicionar')
    expect(t).toContain('Ligada, o ícone abre o Real Olímpico em tela cheia.')
    expect(t).toContain('Desligada, ele abre só um atalho dentro do Safari.')
    expect(t).toContain('Se a chave não aparecer no seu iPhone, é só tocar em Adicionar.')
  })

  it('segue o caminho Compartilhar → Adicionar à Tela de Início → abrir pelo ícone', () => {
    const t = texto(iphone(SAFARI_NO_IPHONE))
    expect(t).toContain('Toque em Compartilhar')
    expect(t).toContain('Toque em Adicionar à Tela de Início')
    expect(t).toContain('Abra pelo ícone do Real Olímpico')
  })

  it('não diz ONDE fica o Compartilhar nem desenha a barra do Safari (a posição varia com o desenho do Safari)', () => {
    const html = iphone(SAFARI_NO_IPHONE)
    expect(html).not.toContain('pwa-ilu')
    const t = texto(html)
    expect(t).not.toContain('na barra do Safari')
    expect(t).not.toContain('canto superior direito')
    expect(t).toContain('O ícone é um quadrado com uma seta para cima.')
  })

  it('no Chrome (ou outro navegador) do iPhone: o Safari é o caminho mais seguro, o Compartilhar do outro também pode servir', () => {
    const t = texto(iphone(CHROME_NO_IPHONE))
    expect(t).toContain('Você está no Chrome.')
    expect(t).toContain('O caminho mais seguro no iPhone é o Safari.')
    expect(t).toContain('Pelo Chrome também pode dar certo, no botão Compartilhar')
    expect(t).toContain('abra este endereço no Safari')
  })

  it('no Safari não aparece aviso de "você está no outro navegador"', () => {
    expect(texto(iphone(SAFARI_NO_IPHONE))).not.toContain('Você está no')
  })

  it('dentro do Instagram/Facebook/TikTok a nota de "entre antes" não aparece (lá o painel manda abrir no navegador)', () => {
    const t = texto(iphone(INSTAGRAM_NO_IPHONE))
    expect(t).not.toContain('Antes de adicionar')
    expect(t).not.toContain('Você está no')
  })

  it('tem o mesmo número de passos da aba Android (a pessoa pode trocar de aba para conferir)', () => {
    expect(passos(iphone(SAFARI_NO_IPHONE))).toBe(4)
    expect(passos(android())).toBe(4)
  })
})

describe('aba Android continua como estava', () => {
  it('mantém a ilustração da barra do Chrome e o caminho pelo menu', () => {
    const html = android()
    expect(html).toContain('pwa-ilu')
    const t = texto(html)
    expect(t).toContain('Toque em Instalar app')
    expect(t).toContain('Confirme em Instalar')
  })
})

describe('texto do painel, nas duas abas', () => {
  const todos = [iphone(SAFARI_NO_IPHONE), iphone(CHROME_NO_IPHONE), android()].map(texto).join(' ')

  it('sem as palavras que o jurídico proibiu', () => {
    expect(todos).not.toMatch(/\btoken\b|\bNFT\b|cripto|ativo digital|investimento|rentabilidade/i)
  })

  it('a marca é Real Olímpico, no masculino', () => {
    expect(todos).toContain('Real Olímpico')
    expect(todos).not.toMatch(/\b(a|da|na) Real Olímpico\b/)
    expect(todos).not.toMatch(/Áurea Custódia/)
  })
})
