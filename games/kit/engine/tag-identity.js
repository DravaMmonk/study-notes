// A tag identity includes its member type. References retain their authored full name.
export const tagKey = (member, name) => `${member}:${name}`
export const tagName = key => key.slice(key.indexOf(':') + 1)
export const kernelTags = new Map([[tagKey('kind', 'kernel/studio-left'), { member: 'kind', name: 'kernel/studio-left', reader: 'kernel' }]])
