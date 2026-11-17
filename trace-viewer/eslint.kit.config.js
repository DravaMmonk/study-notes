import { importProblem } from '../games/kit/engine/plugin-boundaries.js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
// Lint for the games kit (../games/kit), run from the repository root: npm run lint:kit. Two things only: plain
// mistakes (undefined names, unused ones) and the layering (games/DIRECTION.md, decision 17) — a domain imports no
// other domain, and the kernel imports no domain (it loads one by name: engine/resolver.js).
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import { defineConfig, globalIgnores } from 'eslint/config'

const KIT = 'games/kit'
const domains = readdirSync(fileURLToPath(new URL(`../${KIT}/modules`, import.meta.url)), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
const no = (patterns, message) => ({ 'no-restricted-imports': ['error', { patterns: [{ group: patterns, message }] }] })

export default defineConfig([
  globalIgnores(['**/node_modules', '**/versions']),
  {
    files: [`${KIT}/**/*.{js,jsx,mjs}`, 'packages/*/{core,view}/**/*.{js,jsx,mjs}'],
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
    ignores: ['**/*.test.js', '**/engine/kernel.js', '**/engine/circuit-bridge.js'],
    rules: no(['**/modules/**'], 'The kernel knows no domain: it loads one by name (engine/resolver.js).'),
  },
  {
    files: ['packages/*/{core,view}/**/*.{js,jsx,mjs}'],
    plugins: { packages: { rules: { boundary: { create(context) {
      const file = context.filename, root = file.slice(0, file.lastIndexOf('/packages/'))
      const id = file.slice(root.length + 10).split('/')[0]
      const uses = Object.keys(JSON.parse(readFileSync(resolve(root, 'packages', id, 'package.json'))).uses ?? {})
      const check = node => {
        const source = node.source ?? node.arguments?.[0]
        const message = importProblem(source?.type === 'Literal' ? source.value : null, file, root, uses)
        if (message) context.report({ node, message })
      }
      return { ImportDeclaration: check, ExportAllDeclaration: check, ExportNamedDeclaration: node => { if (node.source) check(node) }, ImportExpression: check,
        CallExpression: node => { if (node.callee?.name === 'require') check(node) },
        JSXElement: node => { if (file.includes('/core/')) context.report({ node, message: 'core cannot contain JSX' }) },
      }
    } } } } },
    rules: { 'packages/boundary': 'error' },
  },
  ...domains.map((name) => ({
    files: [`${KIT}/modules/${name}/**/*.{js,jsx}`],
    rules: no(domains.filter((other) => other !== name).flatMap((other) => [`**/modules/${other}/**`]), 'A domain imports no other domain: what two share belongs in the kernel.'),
  })),
])
