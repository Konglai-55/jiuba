const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const crypto = require('node:crypto')
const ts = require('typescript')

const root = path.resolve(process.argv[2] || path.join(__dirname, '..'))
const prefix = '__jiuba_data__/v1/'

function load(relative, mocks, globals = {}, cache = new Map()) {
  const filename = path.join(root, relative)
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }
  cache.set(filename, module)
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const localRequire = (id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id]
    if (id.startsWith('@/lib/')) return load(id.slice(2) + '.ts', mocks, globals, cache)
    return require(id)
  }
  vm.runInNewContext(code, { module, exports: module.exports, require: localRequire,
    console, process, Buffer, AbortSignal, setTimeout, clearTimeout, ...globals }, { filename })
  return module.exports
}

function storage(initial = []) {
  const objects = new Map(initial.map((card) => [`${prefix}content-cards/${card.id}.json`, JSON.stringify(card)]))
  const commands = Object.fromEntries(['GetObjectCommand', 'PutObjectCommand', 'ListObjectsV2Command', 'DeleteObjectCommand'].map(
    (name) => [name, class { constructor(input) { this.input = input; this.kind = name } }]))
  let idIndex = 0
  const ids = [601, 101, 501, 201, 401, 301, 701, 801, 901]
  const mocks = {
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
  return { mocks, data: load('lib/s3-data.ts', mocks) }
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

test('same region stays together after a later upload and across navigation cards', async () => {
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

;(async () => {
  let failed = 0
  for (const { name, run } of tests) {
    try { await run(); console.log(`PASS ${name}`) }
    catch (error) { failed++; console.log(`FAIL ${name}: ${error.message}`) }
  }
  console.log(`RESULT=${tests.length - failed}/${tests.length} passed`)
  process.exitCode = failed ? 1 : 0
})()
