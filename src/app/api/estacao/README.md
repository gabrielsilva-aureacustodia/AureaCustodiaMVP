# `/api/estacao/*` — as rotas da bancada

O programa que roda no notebook da bancada (`estacao/`, na raiz) fala com o site por estas
quatro rotas. Nenhuma delas é chamada pelo navegador de um cliente.

**O contrato completo — corpos, respostas, códigos de erro e a fórmula do hash — está em
[`estacao/CONTRATO.md`](../../../../estacao/CONTRATO.md).** Este arquivo é só o mapa.

| Rota | Método | O que faz |
|---|---|---|
| `/api/estacao` | GET | O "alô". Vira "Conectado" ou "Sem conexão" na tela da bancada |
| `/api/estacao/fila` | GET | Envios em `Recebido pela custódia` e `Em análise física` |
| `/api/estacao/analise/abrir` | POST | Move o envio para `Em análise física`. Idempotente |
| `/api/estacao/analise/fechar` | POST | O veredito. **É aqui que a moeda nasce** |
| `/api/estacao/video/url` | POST | Assina a URL de upload do vídeo |

---

## Autorização

`Authorization: Bearer <AUREA_ESTACAO_TOKEN>`, comparado em tempo constante. A estação não
tem sessão e não é um usuário.

**503 e 401 significam coisas diferentes, e isso é deliberado:**

| Código | Significa | Quem resolve |
|---|---|---|
| **503** | Falta `AUREA_ESTACAO_TOKEN` na Vercel | Gabriel, no painel |
| **401** | A chave do `estacao.json` está errada | O operador, na tela de configuração |

Um 401 genérico faria as duas falhas parecerem a mesma, e só a segunda o operador resolve
sozinho.

---

## Duas coisas que estas rotas fazem ao contrário do resto da API

**Nenhuma é cacheada, e todas repetem `Cache-Control: no-store`** — inclusive nas respostas
de erro, como `/api/state` faz. Um 401 cacheado prenderia a bancada fora do sistema até o
CDN esquecer.

**`/api/estacao/analise/fechar` valida o corpo campo a campo antes de encostar no estado.**
Isso não é burocracia: é a rota que cria ativo do nada — a mesma que, no monolito, dava para
chamar pelo console do navegador e fabricar acervo. Peso que chega como texto, veredito
escrito errado ou lista com tamanho diferente do envio viram 400 com `detalhes` apontando o
campo.

O que **não** se valida: nada de trava de ambiente, aceite ou confirmação em dobro. Chave
válida e corpo coerente, grava.

---

## O vídeo não passa por aqui

A Vercel recusa requisição com corpo acima de 4,5 MB, e a falha não se parece com a causa —
a rota devolve erro genérico e o operador conclui que "o sistema não salvou". Por isso
`/api/estacao/video/url` devolve algumas centenas de **bytes** em vez de receber algumas
centenas de **megabytes**: ela assina, e a bancada sobe direto para o Supabase Storage.
