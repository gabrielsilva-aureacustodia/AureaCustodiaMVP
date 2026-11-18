/**
 * Bloco "Veja como se cadastrar" de /cadastrar (frente D, item 8 do Rogério: "demonstração de como cadastrar").
 *
 * Dois jeitos de entender o mesmo caminho: o vídeo curto e a legenda numerada em texto. A legenda não é enfeite de
 * acessibilidade — é o que vale para quem não pode ou não quer abrir o vídeo (dado móvel, leitor de tela), e por
 * isso o bloco inteiro funciona só com ela.
 *
 * O vídeo é PLUGÁVEL: enquanto `VIDEO_DA_DEMONSTRACAO` for `null` o bloco mostra só os passos, sem player quebrado
 * apontando para um arquivo que ainda não existe. Para ligar, é uma linha: gravar o arquivo em
 * `public/demonstracao/` (WebM, mudo, até ~1,5 MB) e trocar a constante abaixo. A gravação foi feita no navegador
 * local, com nome e e-mail fictícios no formulário recolhido, sem enviar e sem chegar à tela de consentimento do
 * Google — nenhum dado de ninguém aparece nela.
 *
 * Regras do player: sem `autoPlay` (um vídeo que toca sozinho no celular gasta dado e assusta quem está lendo),
 * `muted` (a demonstração não tem áudio), `playsInline` (no iPhone o vídeo tocaria em tela cheia e tiraria a pessoa
 * da página) e `preload="metadata"` (só baixa o suficiente para mostrar o tamanho; o arquivo inteiro vem no play).
 */

import type { ReactNode } from 'react'

interface VideoDaDemonstracao {
  /** Caminho público do arquivo, a partir de `public/`. */
  src: string
  /** Imagem de capa opcional; sem ela o navegador mostra o primeiro quadro. */
  poster?: string
  /** Tipo MIME do arquivo, para o navegador não baixar o que não sabe tocar. */
  tipo: string
}

/**
 * `null` = sem vídeo: o bloco mostra só os passos. Foi entregue assim de propósito (decisão do Controle, 17/11/2026):
 * a demonstração é gravada em PRODUÇÃO, na página pública /cadastrar já publicada, sem conta e parando antes do
 * consentimento do Google; o arquivo e esta linha entram numa segunda mudança pequena, depois do deploy.
 *
 * Para ligar, publique o arquivo em `public/demonstracao/cadastro.webm` (mudo, até ~1,5 MB) e troque `null` por:
 *   { src: '/demonstracao/cadastro.webm', tipo: 'video/webm' }
 * (a imagem de capa é opcional: `poster: '/demonstracao/cadastro-capa.webp'`). O teste de
 * FormulariosDeAcesso.test.ts falha se a constante apontar para um arquivo que não existe ou que passe de ~1,6 MB.
 */
export const VIDEO_DA_DEMONSTRACAO: VideoDaDemonstracao | null = null

/** Os passos do cadastro, na ordem em que a pessoa os vê. Mesmo texto que a gravação mostra. */
const PASSOS = [
  'Toque em “Continuar com o Google” e escolha a conta que você usa.',
  'Confira a declaração logo abaixo do botão: ao continuar, você concorda com os Termos de Uso, a Política de Privacidade e a Tabela de Taxas.',
  'Confirme na tela do Google. Você volta para o Real Olímpico com a conta pronta.',
  'Prefere e-mail? Abra “Prefiro usar e-mail e senha”, preencha nome, e-mail e senha e toque em “Criar conta por e-mail”. Depois confirme o cadastro no e-mail que você receber.',
] as const

interface DemonstracaoDoCadastroProps {
  /** Para os testes e para quem quiser ligar outro arquivo sem mexer na constante. */
  video?: VideoDaDemonstracao | null
}

export function DemonstracaoDoCadastro({
  video = VIDEO_DA_DEMONSTRACAO,
}: DemonstracaoDoCadastroProps): ReactNode {
  return (
    <section className="auth-demo" aria-labelledby="auth-demo-titulo">
      <h2 className="auth-demo-titulo" id="auth-demo-titulo">
        Veja como se cadastrar
      </h2>

      {video ? (
        <video
          className="auth-demo-video"
          muted
          playsInline
          controls
          preload="metadata"
          poster={video.poster}
          aria-label="Demonstração, sem áudio, do cadastro no Real Olímpico. Os mesmos passos estão escritos abaixo."
        >
          <source src={video.src} type={video.tipo} />
          Seu navegador não toca este vídeo. Siga os passos escritos abaixo.
        </video>
      ) : null}

      <ol className="auth-demo-passos">
        {PASSOS.map((passo) => (
          <li key={passo}>{passo}</li>
        ))}
      </ol>
    </section>
  )
}
