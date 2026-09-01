/**
 * Configuração do ESLint (flat config) — item CD-06.
 *
 * Antes deste arquivo, `npm run lint` não verificava nada: abria o assistente
 * interativo do `next lint` pedindo para escolher uma configuração — o que em
 * terminal parece só chato e em CI trava esperando entrada que nunca vem.
 *
 * O FlatCompat existe porque o preset `eslint-config-next` ainda é distribuído
 * no formato antigo (.eslintrc); ele o traduz para o flat config que o ESLint 9
 * usa. Quando o preset migrar, o compat sai.
 *
 * `vendor/` está nos ignores: é o tarball versionado da SheetJS (CD-05), não é
 * código nosso para revisar.
 */

import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
})

const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    // next-env.d.ts é gerado pelo Next e está no .gitignore — não é código
    // nosso para revisar, e a referência triple-slash dele é como o Next o
    // escreve.
    ignores: ['.next/**', 'node_modules/**', 'vendor/**', 'out/**', 'build/**', 'next-env.d.ts'],
  },
]

export default config
