/* ============================================================================
 * PARÂMETROS DA CONFIRMAÇÃO POR SENHA — o ÚNICO arquivo onde as durações moram.
 *
 * Decisão D3 do pacote de manutenção de 17/11/2026 (Rogério pediu senha para
 * sacar, comprar, vender e mudar dados; o Gabriel muda estes números quando
 * quiser, em uma linha):
 *
 *  - compra e venda: a confirmação vale por 5 minutos (digita uma vez, compra três
 *    moedas em sequência);
 *  - saque, troca de senha/e-mail/Pix/dados e retirada de moeda: sempre, uma
 *    confirmação por ação.
 *
 * Sem `server-only` de propósito: são só números e nomes, e o teste os importa.
 * ==========================================================================*/

/** Quanto tempo vale a confirmação de nível `janela` (compra e venda). Decisão D3. */
export const JANELA_COMPRA_VENDA_MS = 5 * 60 * 1000

/**
 * Tempo que a confirmação de nível `sempre` espera pela ação que a motivou.
 *
 * Ela é de UM uso (a guarda a apaga ao liberar a ação): o cliente digita a senha, o
 * modal reenvia a ação na mesma hora, e o minuto é só a folga de rede e de uma
 * conexão lenta. Passou disso sem uso, a confirmação morre.
 */
export const TOLERANCIA_ACAO_SENSIVEL_MS = 60 * 1000

/**
 * Validade do código por e-mail (contas que só entram com Google). A validade do
 * Supabase é do projeto inteiro (1 hora por padrão, vale também para os links de
 * confirmação e de recuperação), então o prazo curto é conferido AQUI, do nosso
 * lado, pela hora do envio gravada no cookie assinado.
 */
export const VALIDADE_DO_CODIGO_MS = 10 * 60 * 1000

/** O Supabase não deixa pedir outro código ao mesmo usuário antes de 60 segundos. */
export const INTERVALO_ENTRE_CODIGOS_MS = 60 * 1000

/** Tamanho do código por e-mail (padrão do Supabase). */
export const TAMANHO_DO_CODIGO = 6

/**
 * Quanto tempo depois de a pessoa abrir o link de redefinição de senha a tela "nova senha"
 * ainda aceita a troca sem pedir a senha atual (RA-50, 17/11/2026). A senha atual foi
 * esquecida — é por isso que o link existe —, então a prova de quem é a pessoa é ter aberto
 * o link do e-mail ainda agora. Passou disso, vale um link novo. O link em si dura o que o
 * Supabase deixar (1 hora por padrão); este prazo é só da SESSÃO que o link abriu.
 */
export const JANELA_DO_LINK_DE_RECUPERACAO_MS = 30 * 60 * 1000

/**
 * INTERRUPTOR do RA-50: `definirNovaSenha` só troca a senha sem a atual se a sessão veio de um link de e-mail
 * recente (`sessao-de-recuperacao.ts`). A documentação do Supabase lista `recovery`, `otp` e `magiclink` como
 * métodos possíveis na claim `amr`, mas NÃO diz qual deles o link de "esqueci minha senha" grava — e esse
 * caminho não se testa sem enviar um e-mail de verdade (sem servidor local, regra de 17/11/2026). Por isso a
 * guarda nasce ligada e este botão existe: se, depois do deploy, o "esqueci minha senha" passar a recusar o
 * cliente legítimo (o log do servidor mostra "Métodos no token: [...]"), troque para `false` e publique —
 * volta ao comportamento antigo numa linha, sem cirurgia.
 *
 * DESLIGAR REABRE O RA-50: qualquer sessão aberta, inclusive roubada, volta a poder trocar a senha pela tela
 * "nova senha" sem saber a atual. É para ser temporário, só até ajustar a lista de métodos.
 */
export const EXIGIR_LINK_RECENTE_NA_NOVA_SENHA = true

/** Cookie da prova de que a senha (ou o código) foi conferida há pouco. */
export const COOKIE_DA_PROVA = 'aurea_reauth'

/** Cookie do pedido de código em andamento (hora do envio, assinada). */
export const COOKIE_DO_CODIGO = 'aurea_reauth_cod'
