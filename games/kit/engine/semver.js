// Environment-neutral semantic versions and dependency declarations.
export function parseVersion(version) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) throw new Error(`invalid version ${version}`)
  return version.split('.').map(Number)
}
export const compareVersions = (a, b) => {
  const av = parseVersion(a), bv = parseVersion(b)
  return av[0] - bv[0] || av[1] - bv[1] || av[2] - bv[2]
}
export function satisfies(version, range) {
  const match = /^(\^|~)?((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/.exec(range)
  if (!match) throw new Error(`invalid range ${range}; use ^x.y.z, ~x.y.z or x.y.z`)
  const [, operator, base] = match
  const [major, minor, patch] = parseVersion(base)
  const upper = operator === '~' ? `${major}.${minor + 1}.0` : major ? `${major + 1}.0.0` : minor ? `0.${minor + 1}.0` : `0.0.${patch + 1}`
  return operator ? compareVersions(version, base) >= 0 && compareVersions(version, upper) < 0 : version === base
}
export const dependencyIds = config => Object.keys(config.uses ?? config.packages ?? {})
export function validateConfig(config, game = false) {
  if (!game) parseVersion(config.version)
  satisfies('1.0.0', config.kernel)
  const dependencies = game ? config.packages : config.uses
  if (!dependencies || Array.isArray(dependencies) || typeof dependencies !== 'object' || game && !Object.keys(dependencies).length) throw new Error(`${game ? 'packages' : 'uses'} must be a range map`)
  for (const range of Object.values(dependencies)) satisfies('1.0.0', range)
}

export function dependencyProblem(layer, target, reason, path = 'lock.json') {
  return { rule: 'dependency', layer, kind: 'package', target, reason, object: { kind: 'package', name: layer }, path, at: `${layer}/${path}`, says: `${reason}: ${target}` }
}
