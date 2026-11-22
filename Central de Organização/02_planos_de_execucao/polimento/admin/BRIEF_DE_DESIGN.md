# Brief de design — Painel administrativo do Real Olímpico

> Modelo: `aprendizado_frontend/toolkits/direcao-de-design/brief-de-design.md`. Superfície: `/admin/*` e `/painel`.
> Criado em 25/10/2026 (rodada 2 da Frente 5). Acrescente, não apague.

## 1. Propósito
Dar à equipe do Real Olímpico um lugar para **resolver o trabalho do dia** (saques, bancada, envios, atendimento,
contas) e **entender o negócio** (resultado, contabilidade, notas, uso), sem abrir banco nem planilha.

## 2. Usuário principal
Sócios (gestão, às vezes no celular, sem formação técnica — o Rogério é a régua), operação da bancada e da logística
(desktop, na mesa, com a moeda na mão) e desenvolvimento. Cada um vê só o que o papel alcança.

## 3. Princípios (o de cima vence)
1. **Nada some.** Toda função, regra, permissão e trilha de antes continua alcançável; mudar de lugar, sim.
2. **O próximo passo antes do número.** Toda tela de operação abre pelo que pede ação, com o botão que resolve.
3. **Dinheiro e acesso de cliente pedem confirmação com o objeto no nome.** Nunca um clique solto.
4. **Uma ação primária por bloco.** O dourado cheio é escasso; o resto é contorno ou link.
5. **Denso, mas legível.** Painel de trabalho, não vitrine: menos sombra e movimento que o app do cliente, tabelas
   compactas com a 1ª coluna fixa, números alinhados à direita com algarismos tabulares.
6. **O sistema vence a exceção.** Uma peça por papel (seção, indicador, selo, abas, vazio); nada de estilo solto.

## 4. Métrica de sucesso
Da Central de trabalho até "pagar o saque mais antigo" em **2 cliques + confirmação**; nenhuma tela com rolagem lateral
a 375 px; 0 `window.confirm`; 44/44 tabelas com 1ª coluna fixa e legenda.

## 5. Fora de escopo
Regra de negócio, Server Action, permissão, banco, NFS-e e integrações (vão para `PROPOSTAS_BACKEND.md`); tokens de
cor e tipografia da marca (Frente 1); app do cliente e landing.

## 6. Direção visual
- **Tom:** suíço objetivo sobre a paleta navy/ouro da marca. O ouro marca o que pede ação; o resto é neutro.
- **Assinatura:** o filete dourado à esquerda (item ativo do menu, fila "Pede ação agora", confirmação) — a mesma forma
  diz "isto é a sua vez" em todo o painel.
- **Tipografia:** títulos de página e de seção na família de exibição da marca (`--ff-display`); todo o resto na de
  texto; números `tabular-nums`.
- **Grade:** casco com menu de 240 px + conteúdo até 1480 px; páginas de trabalho em **duas zonas** a partir de 1280 px
  (principal + lateral de contexto/ações); abaixo disso, uma coluna na ordem de leitura.
- **Movimento:** só estado (hover, foco, abrir/fechar), 150–200 ms; nada de cartão "pulando" no hover dentro do painel.

## 7. Registro de mudanças
| Data | Mudança | Motivo |
|---|---|---|
| 25/10/2026 | criado | rodada 2 da Frente 5: remodelagem com liberdade de disposição |
