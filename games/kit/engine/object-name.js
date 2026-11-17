// Full names preserve already-qualified identities.
export const fullName = (namespace, name) => typeof name === 'string' && !name.includes('/') && !name.includes(':') ? `${namespace}/${name}` : name
