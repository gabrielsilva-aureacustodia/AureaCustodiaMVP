# `/admin/moedas/[codigo]` — o recibo de qualquer conta

Frente C, sub-branch C3 (plano do Admin, seções 3.5 e 3.6). Pede `bancada.auditoria`.

O código vem da rota em maiúsculas (`/admin/moedas/RO-000042`). A página mostra:

- **o recibo** — código, situação, emissão, caixa e posição, valor estimado e o hash inteiro, com a
  frase que diz se ele é o hash da análise que aprovou a moeda;
- **a análise de origem** — os quinze campos de `CAMPOS_DA_ANALISE`, na ordem congelada, mais o
  `hashAnterior` e o `hash`, e "Assistir ao vídeo" (URL de leitura de dez minutos, pedida pela Server
  Action `urlDoVideoNoPainel`);
- **o envio de origem e as retiradas**, com o link da etiqueta para quem tem `logistica.etiquetas`.

Moeda do acervo de demonstração não tem análise: a página diz isso em vez de mostrar campos vazios.
