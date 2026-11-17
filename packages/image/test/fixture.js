import { existsSync, mkdtempSync, mkdirSync, cpSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { installImageFixture, lockFixture } from '../../../games/kit/engine/ops/fixture.js'
import { readPackage } from '../../../games/kit/engine/resolver.js'
import { packageLevel } from '../../../games/kit/engine/package-play.js'

export function imageFixture(owner = 'sample') {
  const root = mkdtempSync(join(tmpdir(), 'image-contract-'))
  const put = (file, value) => {
    const path = join(root, file)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify(value))
  }
  installImageFixture(root)
  if (owner !== 'sample') {
    for (const folder of ['core', 'view', 'kinds']) {
      const source = new URL(`../../${owner}/${folder}`, import.meta.url)
      if (existsSync(source)) cpSync(source, join(root, 'packages', owner, folder), { recursive: true })
    }
    cpSync(new URL(`../../${owner}/package.json`, import.meta.url), join(root, 'packages', owner, 'package.json'))
    put(`packages/${owner}/${owner}-power/default.json`, { title: 'Ready', lines: ['Image contract.'] })
    put(`packages/${owner}/${owner}-box/default.json`, { sample: 'copy', inLevel: {} })
  } else put('packages/sample/package.json', { version: '0.0.0', kernel: '^0.0.0', uses: { circuit: '^0.0.0', image: '^0.0.0' } })
  put(`packages/${owner}/levels/copy.json`, {
    title: 'Copy', intro: [], after: 'Every pixel is preserved.',
    tasks: [{ id: 'copy', play: 'image:graph', brief: 'Connect the image to the output.', scene: 'image:scene-filter', setup: { target: 'image:target-same' },
      tests: [{ label: 'Square', in: 'image:picture-square' }], hidden: [{ label: 'Disk', in: 'image:picture-disk' }],
      solution: ['out <- in'], naive: ['a = image:shift[dir=right](in)', 'out <- a'],
    }],
  })
  lockFixture(root)
  const content = readPackage(owner, root)
  return { root, content, shell: packageLevel(content, `${owner}/copy`), cleanup: () => rmSync(root, { recursive: true, force: true }) }
}
