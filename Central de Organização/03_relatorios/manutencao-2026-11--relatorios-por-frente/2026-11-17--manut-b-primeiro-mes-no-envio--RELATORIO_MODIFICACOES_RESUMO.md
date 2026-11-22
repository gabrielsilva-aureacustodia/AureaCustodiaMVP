# Relatório de Modificações (resumo) — frente B

```
Estrutural hoje:
- cobrança do envio = frete + 1º mês numa só cobrança (custody.ts, conciliacao.ts)
- módulo novo src/domain/primeiro-mes-do-envio.ts (liga o mês ao protocolo, para H)
- pasta nova src/components/envios/ (resumo do pagamento)
- sem migration, sem env, sem mudança em types.ts/fees.ts/constants.ts/custodia-da-moeda.ts
Você precisa clicar / autorizar:
- Controle: mesclar na onda 3 e rodar a bateria completa
- Gabriel/contador: decidir a NFS-e do mês na recusa
```
