# Primeiras Ações do Dia — 10/09/2026

**Áurea Custódia · a estação de análise está construída · 5 ações, todas suas**

> O código da frente E está pronto e verificado: typecheck ✅, 192 testes ✅, build ✅, e o
> fluxo inteiro exercitado contra o banco de teste. O que sobrou depende de painel, compra
> ou decisão — não de programação.
>
> Detalhes: [`../PLANO_EXECUTIVO_ESTACAO.md`](../PLANO_EXECUTIVO_ESTACAO.md) ·
> contrato técnico: [`../../estacao/CONTRATO.md`](../../estacao/CONTRATO.md)

---

## ☐ 1. Gerar a chave da estação e cadastrar na Vercel — 5 minutos

**Por quê:** sem ela, as rotas `/api/estacao/*` respondem 503 e a bancada fica desligada. É
a chave que identifica a máquina — a estação não é um usuário e não tem sessão.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copie o resultado **inteiro** — são exatamente 64 caracteres hexadecimais. Na Vercel, em
Settings → Environment Variables, crie:

```
AUREA_ESTACAO_TOKEN
```

com esse valor, marcando **Production**, **Preview** e **Development**.

**Guarde o mesmo valor**: ele vai também na tela de configuração do programa da bancada.

---

## ☐ 2. Aplicar a migration antes de publicar — 2 minutos

**Por quê:** a tabela `aurea.analises` nasceu na migration 004. Sem ela aplicada, a rota da
fila responde 500. A migration é **aditiva** — não apaga nem altera nada —, então rodar
antes do deploy é seguro: o código antigo simplesmente não enxerga a tabela nova.

```bash
npm run db:migrate
```

Conferir com:

```bash
npm run db:check
```

Precisa aparecer `004_analise_estacao` na lista de migrations aplicadas.

> Já foi aplicada no banco de teste durante a construção. Este passo é para quando houver
> outro banco.

---

## ☐ 3. Gerar o executável e levar para o notebook da bancada — 15 minutos

**Por quê:** é o programa em si. Portátil: copia e dá dois cliques, sem instalar nada.

```bash
cd estacao && npm install && npm run build
```

O arquivo sai em `estacao/dist/AureaEstacao.exe`. Copie para o notebook da bancada.

**Na primeira abertura o Windows vai avisar** que "protegeu o computador" — o executável não
é assinado digitalmente (RA-20). Clique em **Mais informações** → **Executar assim mesmo**.
O aviso não volta naquele notebook.

Na tela que abrir, preencha os três campos: o endereço do site, a chave da ação 1 e o seu
e-mail como operador.

---

## ☐ 4. Criar o balde de vídeos no Supabase — 10 minutos

**Por quê:** é o que falta para o vídeo da análise sair do notebook. Sem isso, a gravação
fica no disco e a análise fecha do mesmo jeito — falta de balde não impede a moeda de ser
analisada. Mas o cliente não consegue reassistir.

São três coisas, e vale conferir o caminho no painel na hora — ele mudou de lugar duas vezes
desde agosto:

1. Criar um balde chamado `analises`. **Precisa ser privado**: vídeo de custódia pode
   capturar a etiqueta com o endereço do cliente.
2. Copiar a chave de serviço do projeto e cadastrá-la na Vercel como
   `SUPABASE_SERVICE_ROLE_KEY`. Ela dá acesso total ao projeto e nunca sai do servidor — a
   bancada recebe só a URL já assinada.
3. Cadastrar também, na Vercel:

```
SUPABASE_STORAGE_BUCKET
```

com o valor:

```
analises
```

---

## ☐ 5. Comprar o hardware da bancada — decisão sua

**Por quê:** nenhuma moeda foi analisada com equipamento real ainda. A primeira análise de
verdade vai revelar coisas de ergonomia que nenhuma leitura de código revela.

| Item | O requisito que não pode ser negociado |
|---|---|
| Câmera principal | **Anel de foco manual**, UVC plug-and-play, MJPEG, rosca 1/4" |
| Microscópio USB | Segunda câmera, para o detalhe do relevo |
| Iluminação | **Dois LEDs difusos a 45°. Nunca ring light** — o anel reflete no relevo e apaga justamente o que precisa ser visto |
| Balança | Display dentro do quadro da câmera; o operador digita a leitura |

---

## Antes de ligar a câmera, sempre

> ⚠️ **A etiqueta dos Correios tem o endereço do cliente.**

Tirar a etiqueta do enquadramento, ou mascará-la, **antes** de apertar Gravar. Não é
problema de programação: vídeo gravado errado não se desgrava, e o vídeo é justamente o que
o cliente vai reassistir por anos.

---

## Não faça hoje

- **Não mexa na fórmula do hash.** Ela está congelada em `src/domain/analise.ts` e travada
  por um teste com vetor escrito à mão. Mudar a lista de campos depois de haver recibo
  emitido exige recalcular a corrente inteira.
- **Não suba a `STORE_KEY` para v7.** Não é necessário: a migration é aditiva e nenhum
  registro antigo fica inválido. Subir apagaria o acervo de demonstração dos sete sócios sem
  ganho nenhum.
- **Não torne o vídeo obrigatório.** Câmera com cabo solto passaria a impedir a análise de
  uma moeda que já está fora da cápsula, na mesa (RA-23).
