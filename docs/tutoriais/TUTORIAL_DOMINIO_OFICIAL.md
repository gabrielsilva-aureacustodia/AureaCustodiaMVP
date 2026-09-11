# Tutorial Operacional — Apontamento do Domínio Oficial (`aureacustodia.com.br`)

**Data:** 10 de setembro de 2026  
**Responsável pelo documento:** Agente A  
**Executor do procedimento:** Gabriel Silva (fundador / dono dos acessos aos painéis)  
**Status:** Tutorial preparatório conferido — **não executar nada sem seguir o checklist de segurança**.

---

## ⛔ Alerta Crítico de Segurança — O que aconteceu em 06/09/2026 e NÃO pode se repetir

> [!CAUTION]
> **O E-MAIL CORPORATIVO `@aureacustodia.com.br` ESTÁ NO GOOGLE WORKSPACE, NÃO NA HOSTGATOR E NÃO NO TITAN.**
> 
> Em 06/09/2026, uma edição incorreta na Zona DNS alterou os registros `MX` do domínio raiz para o Titan,
> derrubando instantaneamente o e-mail corporativo do Gabriel. Com a queda do e-mail, foi perdido o
> segundo fator de autenticação (2FA) de serviços essenciais, incluindo o acesso ao GitHub.
> 
> **AS DUAS REGRAS DE OURO:**
> 1. **NUNCA ALTERAR OS NAMESERVERS DA HOSTGATOR:** A Zona DNS **permanece gerenciada na HostGator**.
>    Não migre os nameservers para a Vercel. Mexa apenas nos apontamentos específicos de site (`A` e `CNAME`).
> 2. **NUNCA TOCAR EM REGISTROS DE E-MAIL:** `MX`, `TXT` (SPF), DKIM (`google._domainkey`) e DMARC pertencem
>    ao Google Workspace. Qualquer alteração nesses registros interrompe as comunicações da empresa.

---

## 1. Passo 0 — O Botão de Desfazer: Exportar a Zona DNS Atual

Antes de clicar em qualquer botão de edição, você **deve** gerar e salvar o snapshot da Zona DNS atual.

### Como fazer o backup na HostGator:

1. Acesse o **Portal do Cliente HostGator** ([financeiro.hostgator.com.br](https://financeiro.hostgator.com.br)) com seu login e senha.
2. No menu lateral ou na página inicial, clique em **Domínios**.
3. Localize o domínio **`aureacustodia.com.br`** e clique em **Configurar domínio** (ou **Gerenciar**).
4. Selecione a opção **Zona de DNS** (ou **Fazer configuração avançada na zona de DNS**).
5. Se o painel oferecer a opção de **Exportar Zona** (formato texto / BIND), faça o download imediatamente e salve em:
   ```text
   docs/tutoriais/zona-dns-antes-2026-09-10.txt
   ```
6. Caso o painel da HostGator não disponha de botão de exportação em arquivo:
   - Tire capturas de tela (prints) completas de **todas as abas e páginas da tabela de registros DNS** (`A`, `CNAME`, `MX`, `TXT`, `SRV`, `AAAA`).
   - Crie o arquivo `docs/tutoriais/zona-dns-antes-2026-09-10.txt` no repositório e transcreva manualmente todos os registros existentes (Tipo, Nome/Host, TTL, Prioridade e Valor/Destino).
7. Salve o arquivo e mantenha a janela aberta. **Esse é o seu plano de rollback imediato.**

---

## 2. Passo 1 — Adicionar o Domínio no Projeto na Vercel

O procedimento deve ser realizado **dentro do projeto**, nunca na aba geral de domínios da conta Vercel.

1. Acesse o **Dashboard da Vercel** ([vercel.com/dashboard](https://vercel.com/dashboard)).
2. Clique no projeto da plataforma: **`aurea-custodia-mvp`**.
3. No menu superior do projeto, acerte em **Settings** e selecione a aba **Domains**.
4. No campo de texto **Domain**, digite:
   ```text
   aureacustodia.com.br
   ```
   e clique no botão **Add**.
5. A Vercel perguntará como deseja configurar os domínios:
   - Escolha a opção recomendada: **Redirect `www.aureacustodia.com.br` to `aureacustodia.com.br`** (ou `aureacustodia.com.br` com redirect do `www`).
   - Isso adicionará automaticamente tanto o domínio raiz quanto o subdomínio `www`.
6. A tela exibirá os dois domínios com status **Invalid Configuration** e informará os registros DNS necessários para apontamento.
7. Anote os valores exibidos. Eles correspondem ao padrão vigente da infraestrutura Vercel:

| Registro para | Tipo | Nome (Host) | Valor exibido pela Vercel |
|---|---|---|---|
| **Domínio Raiz (Apex)** | `A` | `@` (ou `aureacustodia.com.br`) | `76.76.21.21` |
| **Subdomínio www** | `CNAME` | `www` | `cname.vercel-dns.com.` |

> [!NOTE]
> Se a Vercel exigir um desafio de titularidade (Ownership Verification), ela exibirá adicionalmente um registro
> `TXT` com nome `_vercel` e um valor hexadecimal único. Guarde esse valor caso seja solicitado.

---

## 3. Passo 2 — Criar e Editar os Registros na HostGator

Volte à tela da **Zona de DNS Avançada** de `aureacustodia.com.br` na HostGator.

### O que você VAI alterar (Apenas estes 2 registros):

1. **Registro A do Domínio Raiz:**
   - Filtre a tabela de registros por tipo `A`.
   - Localize o registro com Host `@` (ou `aureacustodia.com.br`).
   - Clique em **Editar**.
   - Altere o campo **Destino / Aponta para / IPv4** para o IP da Vercel:
     ```text
     76.76.21.21
     ```
   - Deixe o TTL padrão (ex: 3600 ou 14400) e salve.
   - *(Atenção: Se houver mais de um registro `A` para `@`, mantenha apenas o apontando para `76.76.21.21` e exclua os IPs antigos de servidores web desativados).*

2. **Registro CNAME do www:**
   - Filtre a tabela de registros por tipo `CNAME`.
   - Localize o registro com Host `www`.
   - Clique em **Editar**.
   - Altere o campo **Destino / Aponta para** para:
     ```text
     cname.vercel-dns.com.
     ```
   - Salve a alteração.

3. **Registro TXT de Verificação (somente se a Vercel tiver pedido na tela anterior):**
   - Se a Vercel solicitou verificação `_vercel`, adicione um novo registro `TXT`:
     - **Tipo:** `TXT`
     - **Nome / Host:** `_vercel`
     - **Valor:** (copie o código hexadecimal fornecido na tela da Vercel)
     - Salve.

---

## 4. Passo 3 — A Lista do que NÃO SE TOCA (Conferência Visual Obrigatória)

Antes de sair do painel da HostGator, faça uma checagem visual linha por linha dos registros intocáveis:

| Registro | Tipo | O que DEVE continuar lá (Intocado) | Observação |
|---|---|---|---|
| **MX do Google** | `MX` | `smtp.google.com` (prioridade 1) ou `aspmx.l.google.com` | **NÃO TOCAR.** Garante o recebimento de e-mails corporativos. |
| **SPF do Google** | `TXT` | `v=spf1 include:_spf.google.com ~all` | **NÃO TOCAR.** Garante que os e-mails enviados não caiam no spam. |
| **DKIM do Google** | `TXT` | `google._domainkey` | **NÃO TOCAR.** Assinatura criptográfica dos e-mails do Workspace. |
| **DMARC** | `TXT` | `_dmarc` (se configurado) | **NÃO TOCAR.** Política de autenticação de e-mail. |
| **Google Site Verification**| `TXT` | `google-site-verification=...` | **NÃO TOCAR.** Verificação de propriedade do Google Workspace. |
| **Nameservers** | `NS` | Servidores oficiais da HostGator (ex: `ns*.hostgator.com.br`) | **NÃO ALTERAR.** A gestão do DNS deve permanecer na HostGator. |

> [!WARNING]
> Se você avistar registros antigos do **Titan** que sobraram de meses anteriores (ex: `titan1._domainkey` ou `CNAME webmail -> titan.hostgator.com.br`),
> não tente mexer neles agora para não adicionar variáveis à transição. Mexa estritamente no `A` e `CNAME` do site.

---

## 5. Passo 4 — Procedimento de Validação em 3 Etapas

Após salvar os registros na HostGator, a propagação inicial de DNS geralmente leva de 5 a 30 minutos (podendo levar mais em alguns provedores).

### Etapa 5.1 — Consulta Técnica via Terminal
Abra o terminal do seu computador (PowerShell) e execute os seguintes diagnósticos:

```powershell
# 1. Conferir o registro A do apex: deve retornar 76.76.21.21
Resolve-DnsName -Name aureacustodia.com.br -Type A

# 2. Conferir o CNAME do www: deve apontar para a Vercel
Resolve-DnsName -Name www.aureacustodia.com.br -Type CNAME

# 3. Conferir o MX: DEVE continuar respondendo Google, NUNCA Titan nem vazio!
Resolve-DnsName -Name aureacustodia.com.br -Type MX
```

### Etapa 5.2 — Validação no Dashboard da Vercel e Certificado SSL
1. Volte em **Vercel → Projeto `aurea-custodia-mvp` → Settings → Domains**.
2. Clique no botão **Refresh** ao lado de cada domínio.
3. Ambos os domínios (`aureacustodia.com.br` e `www.aureacustodia.com.br`) devem exibir o status **Valid Configuration** com ícone verde.
4. A Vercel emitirá automaticamente o certificado SSL/TLS (Let's Encrypt). Aguarde o status indicar **Issued**.
5. Abra em uma janela anônima do navegador:
   - `https://aureacustodia.com.br` — confirme o carregamento da landing page com cadeado de segurança HTTPS ativo.
   - `https://www.aureacustodia.com.br` — confirme que redireciona suavemente para `https://aureacustodia.com.br`.
   - `https://aureacustodia.com.br/academy` — confirme que a nova rota educativa abre perfeitamente.

### Etapa 5.3 — Teste Obrigatório de Envio e Recebimento de E-mail
Este teste é o critério definitivo de sucesso:
1. Usando uma conta pessoal externa (Gmail, Hotmail, etc.), envie um e-mail com assunto "Teste de DNS" para:
   ```text
   gabriel.silva@aureacustodia.com.br
   ```
2. Abra a sua caixa postal no **Google Workspace** ([mail.google.com](https://mail.google.com)).
3. Confirme o recebimento da mensagem.
4. Responda ao e-mail de teste.
5. Na conta externa, verifique se a resposta chegou com sucesso na caixa de entrada (fora da pasta de spam).

---

## 6. Passo 5 — Como Voltar Atrás (Plano de Rollback Imediato)

Se durante o processo o e-mail parar de receber mensagens ou o site apresentar instabilidade que você queira reverter de imediato:

1. **Abra o arquivo de backup:**
   `docs/tutoriais/zona-dns-antes-2026-09-10.txt`.
2. **Reverta na HostGator:**
   - Acesse novamente a **Zona de DNS Avançada** na HostGator.
   - Restaure os valores originais do registro `A` (`@`) e `CNAME` (`www`).
   - Se por acidente algum registro `MX` foi modificado, restaure exatamente o apontamento do Google Workspace salvo no arquivo de backup:
     - Tipo `MX`, Host `@`, Prioridade `1`, Destino `smtp.google.com`.
3. **No painel da Vercel:**
   - Vá em **Settings → Domains** e remova os domínios caso queira cessar tentativas de renovação de SSL enquanto investiga.
4. **Disponibilidade mantida:**
   - A plataforma permanece 100% funcional no endereço original `https://aurea-custodia-mvp.vercel.app`.

---

## 7. Passo 6 — Pós-Ativação do Domínio (Ajustes de Ambiente e Supabase)

Somente **após** o domínio estar 100% validado e com SSL ativo, os seguintes ajustes de configuração devem ser realizados nos serviços conectados:

### 7.1 Variáveis de Ambiente na Vercel
No painel da Vercel (**Settings → Environment Variables**), atualize as seguintes chaves para o ambiente de **Production**:

| Variável | Valor Atual | Novo Valor Oficial |
|---|---|---|
| `AUREA_SITE_URL` | `https://aurea-custodia-mvp.vercel.app` | `https://aureacustodia.com.br` |
| `AUREA_TERMS_URL` | `https://aurea-custodia-mvp.vercel.app/termos` | `https://aureacustodia.com.br/termos` |
| `AUREA_PRIVACY_URL` | `https://aurea-custodia-mvp.vercel.app/privacidade` | `https://aureacustodia.com.br/privacidade` |

*Após alterar as variáveis, realize um novo **Redeploy** na Vercel para propagar os valores.*

### 7.2 URLs Autorizadas no Supabase
No painel do Supabase ([supabase.com/dashboard](https://supabase.com/dashboard)) no projeto de produção:
1. Vá em **Authentication → URL Configuration**.
2. Atualize o campo **Site URL**:
   ```text
   https://aureacustodia.com.br
   ```
3. No campo **Redirect URLs**, adicione a nova URL de callback mantendo também a antiga para transição segura:
   ```text
   https://aureacustodia.com.br/entrar/callback
   https://aurea-custodia-mvp.vercel.app/entrar/callback
   http://localhost:3000/entrar/callback
   ```
4. Salve as alterações.

### 7.3 Credenciais do Google Cloud OAuth
No **Google Cloud Console → APIs & Services → Credentials → Seu OAuth 2.0 Client ID**:
1. Em **Authorized JavaScript origins**, adicione:
   ```text
   https://aureacustodia.com.br
   https://www.aureacustodia.com.br
   ```
2. Em **Authorized redirect URIs**, o callback do Supabase (`https://vjbqikfamqdttbmaqrxf.supabase.co/auth/v1/callback`) permanece o mesmo e não precisa ser alterado.
3. Salve.
