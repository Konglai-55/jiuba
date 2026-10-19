const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const crypto = require('node:crypto')
const { AsyncLocalStorage } = require('node:async_hooks')
const ts = require('typescript')

const root = path.resolve(process.argv[2] || path.join(__dirname, '..'))
const prefix = '__jiuba_data__/v1/'

function load(relative, mocks, globals = {}, cache = new Map()) {
  const filename = path.join(root, relative)
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }
  cache.set(filename, module)
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const localRequire = (id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id]
    if (id.startsWith('@/lib/')) return load(id.slice(2) + '.ts', mocks, globals, cache)
    return require(id)
  }
  vm.runInNewContext(code, { module, exports: module.exports, require: localRequire,
    console, process, Buffer, URL, AbortSignal, setTimeout, clearTimeout, ...globals }, { filename })
  return module.exports
}

function storage(initial = []) {
  const objects = new Map(initial.map((card) => [`${prefix}content-cards/${card.id}.json`, JSON.stringify(card)]))
  const commands = Object.fromEntries(['GetObjectCommand', 'PutObjectCommand', 'ListObjectsV2Command', 'DeleteObjectCommand'].map(
    (name) => [name, class { constructor(input) { this.input = input; this.kind = name } }]))
  let idIndex = 0
  const ids = [601, 101, 501, 201, 401, 301, 701, 801, 901]
  const files = new Map()
  let host = '98xb.net'
  const context = new AsyncLocalStorage()
  const mocks = {
    'next/headers': { headers: async () => ({ get: (key) => key === 'host' ? (context.getStore() || host) : null }) },
    'node:fs/promises': {
      readFile: async (name) => { if (!files.has(name)) throw { code: 'ENOENT' }; return files.get(name) },
      writeFile: async (name, value) => { files.set(name, value) },
      rename: async (from, to) => { files.set(to, files.get(from)); files.delete(from) },
      unlink: async (name) => { if (!files.delete(name)) throw { code: 'ENOENT' } },
      mkdir: async () => {},
      open: async (name) => {
        if (files.has(name)) throw { code: 'EEXIST' }
        files.set(name, '')
        return { writeFile: async (value) => { files.set(name, value) }, close: async () => {} }
      },
    },
    '@aws-sdk/client-s3': commands,
    'node:crypto': { ...crypto, randomBytes: (size) => {
      if (size !== 6) return crypto.randomBytes(size)
      const bytes = Buffer.alloc(6)
      bytes.writeUIntBE(ids[idIndex++] || 1000 + idIndex, 0, 6)
      return bytes
    } },
    '@/lib/s3': { APP_DATA_PREFIX: prefix, getS3Bucket: () => 'fixture', getS3Client: () => ({
      async send(command) {
        const { Key, Prefix, Body, IfNoneMatch } = command.input
        if (command.kind === 'ListObjectsV2Command') return { Contents: [...objects.keys()].filter((k) => k.startsWith(Prefix)).sort().map((Key) => ({ Key })) }
        if (command.kind === 'GetObjectCommand') {
          if (!objects.has(Key)) throw { name: 'NoSuchKey' }
          return { Body: { transformToString: async () => objects.get(Key) } }
        }
        if (command.kind === 'PutObjectCommand') {
          if (IfNoneMatch && objects.has(Key)) throw { $metadata: { httpStatusCode: 412 } }
          objects.set(Key, Body)
          return {}
        }
        objects.delete(Key)
        return {}
      },
    }) },
  }
  return { mocks, objects, atSite: (site, run) => context.run(site, run), setSite: (value) => { host = value }, data: load('lib/s3-data.ts', mocks) }
}

const labels = ['天河1', '天河2', '天河3', '海珠1', '海珠2', '海珠3']
function card(id, title, index, navCardId = 1, displayOrder = 0) {
  return { id, title, navCardId, region: title.startsWith('天河') ? '广州市 天河区' : '广州市 海珠区',
    displayOrder, createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString() }
}
const names = (cards) => Array.from(cards, (c) => c.title).join(',')
const tests = []
function test(name, run) { tests.push({ name, run }) }

test('legacy records: Tianhe three then Haizhu three, regardless of S3 key order', async () => {
  const { data } = storage(labels.map((title, i) => card([601, 101, 501, 201, 401, 301][i], title, i)))
  const result = await data.getContentCardRecords(1)
  console.log(`LEGACY=${names(result)}`)
  assert.equal(names(result), labels.join(','))
})

test('upload sequence is retained without regrouping addresses, across navigation cards', async () => {
  const fixture = [card(1, '天河1', 0), card(2, '海珠1', 1), card(3, '天河2', 2), card(4, '海珠2', 3), card(5, '天河-other', 0, 2)]
  const { data } = storage(fixture)
  // Legacy zero-order records retain their timestamp order; new uploads use
  // explicit displayOrder and are covered by the next regression.
  assert.equal(names(await data.getContentCardRecords(1)), '天河1,海珠1,天河2,海珠2')
  assert.equal(names(await data.getContentCardRecords(2)), '天河-other')
  const all = await data.getContentCardRecords()
  assert.equal(all.length, 5)
  assert.ok(all.some((record) => record.navCardId === 2))
})

test('displayOrder is stored on create and wins over completion timestamp', async () => {
  const { data } = storage()
  for (const index of [2, 0, 1, 5, 3, 4]) await data.createContentCardRecord({
    navCardId: 1, title: labels[index], region: index < 3 ? '广州市 天河区' : '广州市 海珠区', displayOrder: index + 1,
  })
  const result = await data.getContentCardRecords(1)
  console.log(`NEW=${names(result)}`)
  assert.equal(names(result), labels.join(','))
  assert.deepEqual(Array.from(result, (c) => c.displayOrder), [1, 2, 3, 4, 5, 6])
})

test('legacy missing dates and equal timestamps have a deterministic id tie-break', async () => {
  const a = card(3, '天河3', 0); const b = card(1, '天河1', 0); const c = card(2, '天河2', 0)
  delete a.createdAt; delete b.createdAt; delete c.createdAt
  const { data } = storage([a, b, c])
  assert.equal(names(await data.getContentCardRecords(1)), '天河1,天河2,天河3')
})

test('new batches append after legacy uploads and keep selected order despite completion order', async () => {
  const { data } = storage([card(9000, '旧图1', 0), card(8000, '旧图2', 1)])
  for (const index of [2, 0, 1]) await data.createContentCardRecord({
    navCardId: 1, title: `新图${index + 1}`, displayOrder: index + 1,
  })
  for (const index of [1, 0]) await data.createContentCardRecord({
    navCardId: 1, title: `第二批${index + 1}`, displayOrder: index + 4,
  })
  assert.equal(names(await data.getContentCardRecords(1)), '旧图1,旧图2,新图1,新图2,新图3,第二批1,第二批2')
})


test('both hosts and www aliases resolve correctly', async () => {
  const { siteFromHost } = load('lib/site-host.ts', {})
  assert.equal(siteFromHost('108xb.com'), '108xb.com')
  assert.equal(siteFromHost('www.108xb.com:3000'), '108xb.com')
  assert.equal(siteFromHost('98XB.NET'), '98xb.net')
})

test('unchecked stays on origin, checked appears on both, in either direction', async () => {
  const { data, setSite } = storage()
  const local98 = await data.createContentCardRecord({ navCardId: 1, title: '98 only', displayOrder: 1 })
  const shared98 = await data.createContentCardRecord({ navCardId: 1, title: '98 shared', syncToOtherSite: true, displayOrder: 2 })
  assert.equal(names(await data.getContentCardRecords(1)), '98 only,98 shared')
  setSite('108xb.com')
  assert.equal(names(await data.getContentCardRecords(1)), '98 shared')
  await data.createContentCardRecord({ navCardId: 1, title: '108 only', displayOrder: 3 })
  await data.createContentCardRecord({ navCardId: 1, title: '108 shared', syncToOtherSite: true, displayOrder: 4 })
  assert.equal(names(await data.getContentCardRecords(1)), '98 shared,108 only,108 shared')
  assert.equal(await data.updateContentCardRecord(local98.id, { title: 'bad update' }), null)
  await data.deleteContentCardRecord(local98.id)
  setSite('98xb.net')
  assert.equal(names(await data.getContentCardRecords(1)), '98 only,98 shared,108 shared')
  assert.equal(shared98.sites.length, 2)
})

test('deleting shared post removes this site only and retains the other media reference', async () => {
  const { data, setSite, objects } = storage()
  const mediaKey = 'media/1700000000000-11111111-1111-1111-1111-111111111111.jpg'
  objects.set(mediaKey, 'image fixture')
  const shared = await data.createContentCardRecord({ navCardId: 1, title: 'shared', imageUrl: '/api/file?pathname=' + mediaKey, syncToOtherSite: true })
  await data.deleteContentCardRecord(shared.id)
  assert.equal((await data.getContentCardRecords()).length, 0)
  setSite('108xb.com')
  assert.equal(names(await data.getContentCardRecords()), 'shared')
  assert.ok(objects.has(mediaKey))
  await data.deleteUploadedMedia(mediaKey)
  assert.ok(objects.has(mediaKey), 'upload cleanup must not remove a published file')
  await data.deleteContentCardRecord(shared.id)
  assert.equal((await data.getContentCardRecords()).length, 0)
  assert.ok(!objects.has(prefix + 'content-cards/' + shared.id + '.json'))
})

test('legacy posts stay visible on both; removing one site preserves legacy peer', async () => {
  const { data, setSite } = storage([card(4000, 'existing', 0)])
  assert.equal(names(await data.getContentCardRecords()), 'existing')
  setSite('108xb.com')
  assert.equal(names(await data.getContentCardRecords()), 'existing')
  await data.deleteContentCardRecord(4000)
  assert.equal(names(await data.getContentCardRecords()), '')
  setSite('98xb.net')
  assert.equal(names(await data.getContentCardRecords()), 'existing')
})

test('content write actions require admin and reject non-boolean sync flags', async () => {
  let authorized = false
  let calls = 0
  const actions = load('app/actions/content-cards.ts', {
    '@/lib/admin-session': { hasAdminSession: async () => authorized },
    '@/lib/s3-data': { createContentCardRecord: async (value) => { calls++; return value }, deleteContentCardRecord: async () => { calls++ } },
  })
  await assert.rejects(actions.createContentCard({ navCardId: 1, title: 'blocked' }), /登录已过期/)
  await assert.rejects(actions.deleteContentCard(1), /登录已过期/)
  assert.equal(calls, 0)
  authorized = true
  await assert.rejects(actions.createContentCard({ navCardId: 1, title: 'invalid', syncToOtherSite: 'false' }), /同步选项无效/)
  const result = await actions.createContentCard({ navCardId: 1, title: 'allowed', syncToOtherSite: true })
  assert.equal(result.syncToOtherSite, true)
  assert.equal(calls, 1)
})

test('API route bundle immediately sees another bundle publishing or removing a post', async () => {
  const { data: writer, mocks, setSite } = storage()
  const reader = load('lib/s3-data.ts', mocks)
  assert.equal((await reader.getContentCardRecords()).length, 0)
  const post = await writer.createContentCardRecord({ navCardId: 1, title: 'published', syncToOtherSite: true })
  assert.equal(names(await reader.getContentCardRecords()), 'published')
  setSite('108xb.com')
  assert.equal(names(await reader.getContentCardRecords()), 'published')
  await writer.deleteContentCardRecord(post.id)
  assert.equal(names(await reader.getContentCardRecords()), '')
  setSite('98xb.net')
  assert.equal(names(await reader.getContentCardRecords()), 'published')
})

test('two process bundles can publish concurrently without dropping a snapshot row', async () => {
  const { data, mocks, atSite } = storage()
  const peer = load('lib/s3-data.ts', mocks)
  await Promise.all([
    atSite('98xb.net', () => data.createContentCardRecord({ navCardId: 1, title: 'left', syncToOtherSite: true })),
    atSite('108xb.com', () => peer.createContentCardRecord({ navCardId: 1, title: 'right', syncToOtherSite: true })),
  ])
  assert.equal((await data.getContentCardRecords()).length, 2)
  assert.equal((await peer.getContentCardRecords()).length, 2)
})

test('simultaneous deletes on both sites do not resurrect a shared post', async () => {
  const { data, mocks, atSite, objects } = storage()
  const peer = load('lib/s3-data.ts', mocks)
  const post = await data.createContentCardRecord({ navCardId: 1, title: 'shared', syncToOtherSite: true })
  await Promise.all([
    atSite('98xb.net', () => data.deleteContentCardRecord(post.id)),
    atSite('108xb.com', () => peer.deleteContentCardRecord(post.id)),
  ])
  assert.equal((await data.getContentCardRecords()).length, 0)
  assert.equal((await peer.getContentCardRecords()).length, 0)
  assert.ok(!objects.has(prefix + 'content-cards/' + post.id + '.json'))
})

;(async () => {
  let failed = 0
  for (const { name, run } of tests) {
    try { await run(); console.log(`PASS ${name}`) }
    catch (error) { failed++; console.log(`FAIL ${name}: ${error.message}`) }
  }
  console.log(`RESULT=${tests.length - failed}/${tests.length} passed`)
  process.exitCode = failed ? 1 : 0
})()
