import { definePlays } from '../../engine/plays.js'

export const plays = definePlays({
  truth: { editor: 'values', judge: 'table', checks: 'shown', resources: 'truth', stage: 'vt-stage', layout: 'lg-truth-level' },
  translate: { editor: 'tree', judge: 'check', checks: 'hidden', resources: 'translation', stage: 'fo-stage', layout: 'fo-level' },
  define: { editor: 'tree', judge: 'once', checks: 'hidden', resources: 'definition', stage: 'lg-define', layout: 'lg-define-level', gives: 'reference' },
  iso: { editor: 'tree', judge: 'once', checks: 'hidden', resources: 'declaration', stage: 'fo-stage', layout: 'fo-level lg-level' },
  audit: { editor: 'checks', judge: 'boards', checks: 'shown', resources: 'audit', stage: 'fo-stage', layout: 'fo-level lg-level' },
})
