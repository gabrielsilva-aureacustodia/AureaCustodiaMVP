# src/server/session-core.test.ts

**Arquivo:** `src/server/session-core.test.ts`
**Camada:** teste
**Responsável:** Guilherme

---

## 19/09/2026 — Criado: a prova de que ninguém é deslogado no deploy

**O que foi alterado**

Arquivo novo, 13 verificações. A central monta o cookie **do jeito antigo**, com
`createHmac` do `node:crypto`, e exige que o núcleo novo o aceite. A recíproca também: o
valor que o núcleo emite tem de ser idêntico, caractere por caractere, ao que a
implementação anterior emitiria.

Cobre ainda a recusa do que precisa ser recusado — cookie ausente, sem separador,
assinatura adulterada, payload trocado mantendo a assinatura, assinatura de outro segredo
— e a barreira de import do núcleo.

**Por que foi alterado**

A troca de `node:crypto` por Web Crypto é invisível para build, typecheck e lint. Se a
saída diferisse em um único byte, todos os cookies em circulação virariam inválidos e o
deploy deslogaria a plataforma inteira sem nada acusar. Este teste existe para esse risco
específico, e foi escrito antes de a troca ser considerada pronta.

**O que observar**

O caso "payload trocado mantendo a assinatura" é exatamente o ataque que o HMAC existe
para barrar. Parece redundante ao lado do teste de assinatura adulterada, e não é: um
verifica que a assinatura precisa bater, o outro que ela está amarrada **àquele** payload.

A verificação de tempo constante checa o **resultado**, não o tempo. Medir tempo em teste
é instável e daria falso negativo intermitente — o argumento de que não há saída
antecipada está na leitura do laço em `session-core.ts`.

A barreira de import isenta arquivos `.test.ts`: o risco que ela contém — o núcleo cair no
bundle do navegador junto com o segredo — não alcança o que nunca é publicado. A primeira
versão não tinha essa isenção e reprovou a própria suíte, o que serviu de prova de que a
regra funciona.
