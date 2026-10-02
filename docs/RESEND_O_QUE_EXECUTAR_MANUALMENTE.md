# Resend — o que você precisa fazer à mão

Sem isto, os botões de reenvio funcionam, mas o e-mail **não sai**: o sistema só escreve a mensagem no log
do servidor e a tela avisa "Sem RESEND_API_KEY … não saiu". Nada quebra, nada é enviado.

## O que depende do Resend e o que não depende

| E-mail | Quem envia | Precisa do Resend? |
|---|---|---|
| Link de redefinição de senha (botão da ficha do usuário) | Supabase Auth, modelo padrão dele | **Não** |
| Aviso de reserva pós-paga (automático e "Reenviar aviso") | `src/lib/email` → Resend | **Sim** |
| "Você foi adicionado à equipe" (ao adicionar e "Reenviar") | `src/lib/email` → Resend | **Sim** |

Ou seja: só o aviso de reserva e o aviso de equipe esperam por este roteiro.

## Passo 1 — Conta e domínio de envio

1. Entre em <https://resend.com/domains> com a conta da empresa.
2. Adicione um domínio. A documentação do Resend recomenda enviar de **subdomínio**, não da raiz.
   Sugestão: `avisos.realolimpico.com.br`. Assim os registros de e-mail que já existem no domínio principal
   não são tocados (lição de 22/09: mexer em DNS de e-mail que funciona derrubou o corporativo).
3. O Resend mostra uma lista de registros DNS para esse domínio. **Copie cada um exatamente como aparece
   na tela dele** — tipo, nome e valor — e cadastre no provedor de DNS do `realolimpico.com.br`.
   Eu não listo os valores aqui porque o Resend gera os seus (a chave DKIM é só sua).
4. Volte ao Resend e use o botão de verificar. Pode levar de minutos a algumas horas. Siga até o domínio
   aparecer como verificado.

## Passo 2 — Chave de API

1. Entre em <https://resend.com/api-keys> e crie uma chave.
2. Dê um nome (ex.: `real-olimpico-producao`). Se a tela oferecer permissão, a de **envio** basta; se
   oferecer restringir ao domínio, restrinja ao do passo 1.
3. **Copie a chave na hora**: o Resend não mostra o valor de novo depois de criada.

## Passo 3 — Variáveis na Vercel

Projeto do Real Olímpico → Settings → Environment Variables, ambiente **Production**:

| Nome | Valor |
|---|---|
| `RESEND_API_KEY` | a chave copiada no passo 2 (começa com `re_`) |
| `EMAIL_REMETENTE` | `Real Olímpico <nao-responda@avisos.realolimpico.com.br>` |

`EMAIL_REMETENTE` precisa ser um endereço do domínio **verificado**. Se você usar outro subdomínio no passo 1,
troque aqui também. Se verificar o domínio raiz, pode omitir a variável: o padrão do código é
`Real Olímpico <nao-responda@realolimpico.com.br>`.

Depois de salvar, faça **Redeploy** do último deploy — variável nova só vale em deploy novo.

## Passo 4 — Conferir

1. No painel, abra `/admin/equipe` e use **Reenviar** num membro cujo e-mail seja seu.
2. A mensagem da tela deve dizer "Convite reenviado." (e **não** "Sem RESEND_API_KEY…").
3. Confira a caixa de entrada e o spam. No Resend, a página de emails mostra entrega, rejeição e spam.
4. Na ficha de um usuário com compra pós-paga em prazo, o bloco "Aviso de reserva" faz o mesmo teste.

## Se algo falhar

- A tela mostra "O e-mail não saiu: HTTP 403 …" → o domínio do remetente não está verificado ou a chave é de
  outra conta. Confira o passo 1 e o `EMAIL_REMETENTE`.
- "HTTP 401" → chave errada ou colada incompleta; crie outra e atualize a variável.
- A tela diz "Convite reenviado" mas nada chegou → olhe o spam e os eventos no Resend.

## Opcional (não é necessário para estes botões)

Usar o Resend também como SMTP do Supabase Auth, para o e-mail de senha e de confirmação sair do seu
domínio, está em `docs/CONFIGURACAO_BRANCH_A_SUPABASE_GOOGLE_RESEND.md`, seção 5. É independente deste roteiro.

> Observação: confirmei na documentação do Resend a recomendação de subdomínio, que a chave só aparece uma
> vez e as páginas `resend.com/domains` e `resend.com/api-keys`. Os rótulos exatos dos botões e a lista de
> registros DNS não consegui conferir na documentação; siga o que a tela do Resend mostrar.
