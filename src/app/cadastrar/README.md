# `/cadastrar`

Fluxo de criação de conta por e-mail verificado ou Google. A página existe para
que o fluxo possa ser validado antes do lançamento, mas os campos permanecem
desabilitados até as versões vigentes dos Termos de Uso e da Política de
Privacidade estarem configuradas.

## O que a pessoa vê (frente D, 17/11/2026)

1. **"Continuar com o Google"** é a ação principal: botão grande, no topo, com a
   declaração de aceite (Termos de Uso, Política de Privacidade e Tabela de
   Taxas) logo abaixo dele.
2. **"Prefiro usar e-mail e senha"** guarda o formulário de e-mail recolhido num
   `<details>`; ele abre sozinho só quando o servidor devolve um erro (ex.: o
   aceite do Google expirou). Os campos, as validações, a cláusula de
   arbitragem opcional e o evento do Pixel são os de antes.
3. **"Veja como se cadastrar"** (`DemonstracaoDoCadastro`): passos numerados em
   texto e, quando o arquivo existe, um vídeo curto e mudo. O vídeo se liga em
   uma linha, na constante `VIDEO_DA_DEMONSTRACAO`, depois de gravar o arquivo
   em `public/demonstracao/`.

O OAuth fecha na **mesma janela** (`window.location.assign`), nunca em popup:
o app instalado no iPhone não segura `window.open`. O CSS novo mora em
`src/styles/login.css`, com o prefixo `.pub-auth` porque esse arquivo é
importado antes de `landing.css`.
