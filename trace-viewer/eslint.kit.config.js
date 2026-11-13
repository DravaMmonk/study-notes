// Lint for the games kit (../games/kit), run from the repository root: npm run lint:kit. Two things only: plain
// mistakes (undefined names, unused ones) and the layering (games/DIRECTION.md, decision 17) — a domain imports no
// other domain, and the kernel imports no domain (it loads one by name: engine/content-node.js).
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import { defineConfig, globalIgnores } from 'eslint/config'

const KIT = 'games/kit'
const domains = readdirSync(fileURLToPath(new URL(`../${KIT}/domains`, import.meta.url)), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
const no = (patterns, message) => ({ 'no-restricted-imports': ['error', { patterns: [{ group: patterns, message }] }] })

export default defineConfig([
  globalIgnores(['**/node_modules', '**/versions']),
  {
    files: [`${KIT}/**/*.{js,jsx,mjs}`],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
    },
    // The hooks plugin is registered so the kit's existing directives for it resolve; its rules stay with the app's
    // own lint (eslint.config.js).
    plugins: { 'react-hooks': reactHooks },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', args: 'none', caughtErrors: 'none' }],
      'no-redeclare': ['error', { builtinGlobals: false }],
      'no-irregular-whitespace': 'off',
      'no-control-regex': 'off',
      'no-regex-spaces': 'off',
      'require-yield': 'off',
    },
  },
  {
    files: ['engine', 'circuit', 'shell', 'views', 'strip', 'studio', 'pipeline'].map((dir) => `${KIT}/${dir}/**/*.{js,jsx,mjs}`).concat(`${KIT}/*.js`),
    ignores: ['**/*.test.js'],
    rules: no(['**/domains/**'], 'The kernel knows no domain: it loads one by name (engine/content-node.js).'),
  },
  ...domains.map((name) => ({
    files: [`${KIT}/domains/${name}/**/*.{js,jsx}`],
    rules: no(domains.filter((other) => other !== name).flatMap((other) => [`**/domains/${other}/**`, `**/../${other}/**`]), 'A domain imports no other domain: what two share belongs in the kernel.'),
  })),
])
