# Roteiro de teste no iPhone real (e no Android) — Real Olímpico como app

```
Para:      Gabriel e Rogério (quem tiver o aparelho em mãos), depois do deploy
Por quê:   o diagnóstico (docs/pwa/DIAGNOSTICO_PWA.md) provou tudo o que dá para provar sem um iPhone. O que sobra só
           aparelho real responde: o que o iOS faz com o login, com o Google e com a chave "Abrir como app web".
           As 10 perguntas de aparelho da pesquisa (docs/diario/execucoes/pesquisa/e-ios-requisitos.md, §11) estão
           todas cobertas abaixo.
Tempo:     uns 20 minutos. Use uma conta SUA de teste. Nada aqui compra, vende ou mexe em dinheiro.
Como       tire uma captura de tela (print) em cada passo marcado com [print] e mande junto com as respostas.
responder:
```

## iPhone — 10 passos (comece pelo Safari)

1. **Versão.** Ajustes → Geral → Sobre: anote a **Versão do iOS**. Abra o site pelo **Safari**.
2. **Entre antes.** No Safari, entre na sua conta com e-mail e senha e espere abrir o painel do cliente (`/inicio`).
3. **Adicione.** Compartilhar → **Adicionar à Tela de Início**. [print] Anote o texto **exato** da chave "Abrir como app web" (ou diga se ela nem aparece) e deixe-a **ligada**. Toque em **Adicionar**.
4. **Abra pelo ícone.** O ícone é o emblema sobre azul-marinho, com o nome "Real Olímpico"? O app abre em tela cheia, sem a barra do Safari, **já logado**? Anote por quanto tempo a abertura fica branca e se a barra do relógio está preta.
5. **Login dentro do app.** No app, saia da conta e toque em **Entrar com Google**. [print] O que aparece: uma folha do Safari? Volta ao app já logado? Ou um erro (procure `exchangeCode` ou `callback`)? Depois repita com e-mail e senha. **(T6, 22/11)** Confira também: sob o botão do Google aparece o aviso "Se o Google não abrir ou voltar sem entrar, use e-mail e senha…"? (só deve aparecer no app, nunca no Safari). Se a folha do Safari voltar com erro mas o app já estiver logado, o retorno tolerante funcionou: anote.
6. **Chave desligada.** Apague o ícone (segure → Remover App) e adicione de novo com a chave **desligada**. O ícone abre dentro do Safari, como um atalho? (É o que o painel avisa.)
7. **Sem estar logado, pela página inicial.** Apague o ícone, saia da conta no Safari, vá à página inicial (`/`), toque em **Baixar o app** e adicione. **Qual tela o ícone abre:** página de vendas, entrar ou painel? Na tela de entrar, o teclado e os botões funcionam?
8. **Link de fora, com o app instalado.** Peça a você mesmo um link do site pelo WhatsApp e outro por e-mail e toque neles. Abrem no **Safari** (esperado: é limite da Apple, o iPhone não manda links para o app) ou no app? Depois do e-mail de confirmação, o app continua deslogado?
9. **De dentro do Instagram.** Abra o link do site pelo Instagram e toque em **Baixar o app**. O painel manda abrir no Safari? [print]
10. **(Opcional) Chrome do iPhone.** Repita o passo 3 pelo Chrome: aparece "Adicionar à Tela de Início"? O ícone abre como app ou dentro do Chrome?

**Mande de volta:** a versão do iOS, o texto da chave do passo 3 e uma linha de resposta por passo. Desde 22/11 o retorno do Google com código repetido segue para o painel quando já há login, em vez de mostrar erro; no passo 5, diga se viu erro, e se o app abriu logado assim mesmo. Os passos **4, 5 e 7** decidem se falta consertar algo: o login (frente D) ou o endereço inicial do app.

**Lembrete para uma semana depois** (não é passo do dia): abra o app sem ter usado por 7 dias ou mais. O login expirou como previsto (a nossa sessão dura 7 dias) ou o iOS apagou antes?

## Android (Chrome) — 4 passos, para reconfirmar que continua funcionando

1. Abra o site no **Chrome**. Na página inicial, toque em **Baixar o app** → diálogo do sistema → **Instalar**. O ícone aparece na tela inicial e o app abre em tela cheia?
2. Abra o site de novo no Chrome: o botão **Baixar o app não aparece mais**. Desinstale o app e abra o site: o botão **volta**?
3. No app, entre com e-mail e senha e, depois, com Google.
4. Depois do próximo deploy: abra o app, vá para a tela inicial do celular e volte. Está na versão nova, sem você recarregar?
