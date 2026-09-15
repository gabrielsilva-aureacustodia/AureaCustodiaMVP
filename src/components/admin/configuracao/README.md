# `src/components/admin/configuracao/` — a tela de configuração do site

As peças de `/admin/configuracao` (plano do Admin, seção 3.3; frente C, C3). Client Components; a
página (Server Component) monta as abas, a de Integrações e a de Histórico.

| Arquivo | O que desenha |
|---|---|
| `FormGrupoConfig.tsx` | O formulário de um grupo (taxas, operacional, termos, canais): valor vigente, quem mudou e quando, descrição, erro de digitação na hora e, nas taxas, a simulação de uma negociação com a tabela digitada |
| `DocumentoPublicado.tsx` | A versão publicada da Tabela de Taxas ou dos Termos, com o hash, e "Publicar a versão vigente" quando o texto da configuração difere do publicado |
| `CatalogoDeMoedas.tsx` | A lista de `tipos_moeda` na ordem da vitrine, com moedas em custódia por tipo, e os formulários de editar e criar tipo |

## Regras desta pasta

- **Percentual se digita como percentual** ("0,5") e dinheiro como reais ("1,00"). A conversão é a
  do servidor (`lerValorDigitado` em `src/domain/admin/configuracao.ts`).
- **O nome do tipo de moeda não muda depois de criado**: está gravado em moeda, envio e negociação.
- **Quem grava é a Server Action**, que confere `config.taxas` ou `config.catalogo` de novo.
