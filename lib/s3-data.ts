import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto'
import { APP_DATA_PREFIX, getS3Bucket, getS3Client } from '@/lib/s3'

type Collection =
  | 'nav-cards'
  | 'content-cards'
  | 'regions'
  | 'site-settings'
  | 'page-passwords'
  | 'click-events'
  | 'download-records'

export interface NavCardRecord {
  id: number
  title: string
  description: string | null
  imageUrl: string | null
  category: string
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface ContentCardRecord {
  id: number
  navCardId: number
  title: string
  description: string | null
  imageUrl: string | null
  videoUrl: string | null
  detail: string | null
  address: string | null
  region: string | null
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface RegionRecord {
  id: number
  navCardId: number | null
  cityName: string
  districtName: string | null
  enabled: number
  displayOrder: number
  createdAt: string
}

export interface SiteSettingRecord {
  id: string
  key: string
  value: string
  updatedAt: string
}

export interface PagePasswordRecord {
  id: number
  navCardId: number
  passwordHash: string
  enabled: number
  updatedAt: string
}

export interface ClickEventRecord {
  id: number
  navCardId: number | null
  contentCardId: number | null
  clickedAt: string
  date: string
}

export interface DownloadRecord {
  id: number
  contentCardId: number
  fileUrl: string
  fileName: string
  fileType: 'image' | 'video'
  downloadedAt: string
}

interface AdminPasswordRecord {
  passwordHash: string
  updatedAt: string
}

interface EncryptedRecord {
  version: 1
  algorithm: 'aes-256-gcm'
  iv: string
  tag: string
  data: string
}

const DEFAULT_NAV_CARDS: NavCardRecord[] = [
  {
    id: 1,
    title: '古镇怀旧酒馆',
    description: '传统木质酒吧，浓厚历史气息，精选老酒收藏',
    imageUrl: '/images/bar1.png',
    category: '特色推荐',
    displayOrder: 1,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 2,
    title: '都市夜景酒吧',
    description: '现代风格，LED 装饰，畅饮精酿鸡尾酒',
    imageUrl: '/images/bar2.png',
    category: '地区分类',
    displayOrder: 2,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 3,
    title: '威士忌慢酒吧',
    description: '高端威士忌品鉴，私密舒适空间，专业调酒师',
    imageUrl: '/images/bar3.png',
    category: '新店介绍',
    displayOrder: 3,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 4,
    title: '城市屋顶酒馆',
    description: '城市天际线美景，日落时分最佳打卡地',
    imageUrl: '/images/bar4.png',
    category: '热门排行',
    displayOrder: 4,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
]

const S3_REQUEST_TIMEOUT_MS = 12_000
const RECORD_CACHE_TTL_MS = 60_000
const RECORD_CACHE_STALE_MS = 15 * 60_000
const RECORD_READ_CONCURRENCY = 12
const CACHEABLE_COLLECTIONS = new Set<Collection>([
  'nav-cards',
  'content-cards',
  'regions',
  'site-settings',
  'page-passwords',
])

type RecordCacheEntry = {
  generation: number
  records: readonly unknown[]
  freshUntil: number
  staleUntil: number
}

type RecordLoad = {
  generation: number
  promise: Promise<unknown[]>
}

const recordCache = new Map<Collection, RecordCacheEntry>()
const recordLoads = new Map<Collection, RecordLoad>()
const recordCacheGenerations = new Map<Collection, number>()

function objectKey(collection: Collection, id: string | number) {
  return `${APP_DATA_PREFIX}${collection}/${encodeURIComponent(String(id))}.json`
}

function adminPasswordKey() {
  return `${APP_DATA_PREFIX}private/admin-password.json`
}

function initializationKey() {
  return `${APP_DATA_PREFIX}meta/initialized.json`
}

function cacheGeneration(collection: Collection) {
  return recordCacheGenerations.get(collection) || 0
}

function collectionFromKey(key: string): Collection | null {
  if (!key.startsWith(APP_DATA_PREFIX)) return null
  const collection = key.slice(APP_DATA_PREFIX.length).split('/', 1)[0] as Collection
  return CACHEABLE_COLLECTIONS.has(collection) ? collection : null
}

function invalidateRecordCache(key: string) {
  const collection = collectionFromKey(key)
  if (!collection) return
  recordCacheGenerations.set(collection, cacheGeneration(collection) + 1)
  recordCache.delete(collection)
}

function numericId() {
  const bytes = randomBytes(6)
  const value = bytes.readUIntBE(0, 6)
  return value === 0 ? 1 : value
}

function statusCode(error: unknown) {
  if (typeof error !== 'object' || !error || !('$metadata' in error)) return undefined
  return (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
}

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const result = await getS3Client().send(
      new GetObjectCommand({ Bucket: getS3Bucket(), Key: key }),
      { abortSignal: AbortSignal.timeout(S3_REQUEST_TIMEOUT_MS) }
    )
    if (!result.Body) return null
    return JSON.parse(await result.Body.transformToString()) as T
  } catch (error) {
    if (statusCode(error) === 404 || (error as { name?: string })?.name === 'NoSuchKey') {
      return null
    }
    throw error
  }
}

async function writeJson(key: string, value: unknown, createOnly = false) {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: getS3Bucket(),
      Key: key,
      Body: JSON.stringify(value),
      ContentType: 'application/json; charset=utf-8',
      CacheControl: 'no-store',
      ...(createOnly ? { IfNoneMatch: '*' } : {}),
    }),
    { abortSignal: AbortSignal.timeout(S3_REQUEST_TIMEOUT_MS) }
  )
  invalidateRecordCache(key)
}

function privateEncryptionKeys() {
  const secrets = [process.env.S3_DATA_ENCRYPTION_KEY, process.env.S3_SECRET_KEY].filter(
    (secret, index, values): secret is string => Boolean(secret) && values.indexOf(secret) === index
  )
  if (secrets.length === 0) {
    throw new Error('S3_DATA_ENCRYPTION_KEY or S3_SECRET_KEY is not configured')
  }
  return secrets.map((secret) =>
    createHash('sha256').update(`jiuba-private-data-v1\0${secret}`).digest()
  )
}

function encryptRecord(value: unknown): EncryptedRecord {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', privateEncryptionKeys()[0], iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return {
    version: 1,
    algorithm: 'aes-256-gcm',
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: encrypted.toString('base64'),
  }
}

function decryptRecord<T>(record: EncryptedRecord) {
  for (const [keyIndex, key] of privateEncryptionKeys().entries()) {
    try {
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(record.iv, 'base64'))
      decipher.setAuthTag(Buffer.from(record.tag, 'base64'))
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(record.data, 'base64')),
        decipher.final(),
      ])
      return { value: JSON.parse(decrypted.toString('utf8')) as T, keyIndex }
    } catch {
      // Try the previous S3-secret-derived key during encryption-key migration.
    }
  }
  throw new Error('Unable to decrypt private S3 data with the configured keys')
}

async function readPrivateJson<T>(key: string): Promise<T | null> {
  const value = await readJson<EncryptedRecord | T>(key)
  if (!value) return null
  if (
    typeof value === 'object' &&
    value !== null &&
    'algorithm' in value &&
    value.algorithm === 'aes-256-gcm'
  ) {
    const decrypted = decryptRecord<T>(value as EncryptedRecord)
    if (decrypted.keyIndex > 0 && process.env.S3_DATA_ENCRYPTION_KEY) {
      await writePrivateJson(key, decrypted.value)
    }
    return decrypted.value
  }
  return value as T
}

async function writePrivateJson(key: string, value: unknown) {
  await writeJson(key, encryptRecord(value))
}

async function deleteKey(key: string) {
  await getS3Client().send(
    new DeleteObjectCommand({ Bucket: getS3Bucket(), Key: key }),
    { abortSignal: AbortSignal.timeout(S3_REQUEST_TIMEOUT_MS) }
  )
  invalidateRecordCache(key)
}

async function deleteKeys(keys: Array<string | null | undefined>, concurrency = 10) {
  const uniqueKeys = [...new Set(keys.filter((key): key is string => Boolean(key)))]
  let cursor = 0
  const workers = Array.from(
    { length: Math.min(concurrency, uniqueKeys.length) },
    async () => {
      while (cursor < uniqueKeys.length) {
        const key = uniqueKeys[cursor++]
        await deleteKey(key)
      }
    }
  )
  await Promise.all(workers)
}

function storedMediaKey(url: string | null | undefined) {
  if (!url) return null

  try {
    const parsed = new URL(url, 'http://local')
    if (parsed.pathname === '/api/file') {
      const key = parsed.searchParams.get('pathname')
      return key && !key.startsWith(APP_DATA_PREFIX) ? key : null
    }

    const publicBase = process.env.S3_PUBLIC_BASE_URL || process.env.CDN_BASE_URL
    if (!publicBase) return null
    const base = new URL(publicBase)
    const basePath = base.pathname.replace(/\/+$/, '')
    if (
      parsed.origin !== base.origin ||
      !parsed.pathname.startsWith(`${basePath}/`)
    ) {
      return null
    }

    const key = decodeURIComponent(parsed.pathname.slice(basePath.length + 1))
    return key && !key.startsWith(APP_DATA_PREFIX) ? key : null
  } catch {
    return null
  }
}

export async function deleteUploadedMedia(pathname: string) {
  if (!pathname.startsWith('media/')) {
    throw new Error('Only media objects can be deleted through the upload API')
  }
  await deleteKey(pathname)
}

async function listKeys(prefix: string) {
  const keys: string[] = []
  let continuationToken: string | undefined

  do {
    const result = await getS3Client().send(
      new ListObjectsV2Command({
        Bucket: getS3Bucket(),
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
      { abortSignal: AbortSignal.timeout(S3_REQUEST_TIMEOUT_MS) }
    )
    keys.push(...(result.Contents || []).flatMap((item) => (item.Key ? [item.Key] : [])))
    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined
  } while (continuationToken)

  return keys
}

async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  transform: (value: T) => Promise<R>
) {
  const results = new Array<R>(values.length)
  let cursor = 0
  const workers = Array.from(
    { length: Math.min(concurrency, values.length) },
    async () => {
      while (cursor < values.length) {
        const index = cursor++
        results[index] = await transform(values[index])
      }
    }
  )
  await Promise.all(workers)
  return results
}

async function loadRecords<T>(collection: Collection): Promise<T[]> {
  const prefix = `${APP_DATA_PREFIX}${collection}/`
  const keys = (await listKeys(prefix)).filter((key) => key.endsWith('.json'))
  const records = await mapWithConcurrency(
    keys,
    RECORD_READ_CONCURRENCY,
    (key) => readJson<T>(key)
  )
  return records.filter((record) => record !== null) as T[]
}

function refreshRecordCache<T>(collection: Collection): Promise<T[]> {
  const generation = cacheGeneration(collection)
  const existing = recordLoads.get(collection)
  if (existing?.generation === generation) {
    return existing.promise as Promise<T[]>
  }

  const promise = loadRecords<T>(collection)
    .then((records) => {
      if (cacheGeneration(collection) === generation) {
        const now = Date.now()
        recordCache.set(collection, {
          generation,
          records,
          freshUntil: now + RECORD_CACHE_TTL_MS,
          staleUntil: now + RECORD_CACHE_STALE_MS,
        })
      }
      return records
    })
    .finally(() => {
      if (recordLoads.get(collection)?.promise === promise) {
        recordLoads.delete(collection)
      }
    })
  recordLoads.set(collection, { generation, promise })
  return promise
}

async function listRecords<T>(collection: Collection): Promise<T[]> {
  if (!CACHEABLE_COLLECTIONS.has(collection)) {
    return loadRecords<T>(collection)
  }

  const now = Date.now()
  const generation = cacheGeneration(collection)
  const cached = recordCache.get(collection)
  if (cached?.generation === generation && cached.freshUntil > now) {
    return [...cached.records] as T[]
  }
  if (cached?.generation === generation && cached.staleUntil > now) {
    void refreshRecordCache<T>(collection).catch((error) => {
      console.error(`Failed to refresh cached ${collection} records:`, error)
    })
    return [...cached.records] as T[]
  }
  return [...(await refreshRecordCache<T>(collection))]
}

async function listPrivateRecords<T>(collection: Collection): Promise<T[]> {
  const prefix = `${APP_DATA_PREFIX}${collection}/`
  const keys = (await listKeys(prefix)).filter((key) => key.endsWith('.json'))
  const records = await Promise.all(keys.map((key) => readPrivateJson<T>(key)))
  return records.filter((record) => record !== null) as T[]
}

async function createRecord<T extends { id: number }>(collection: Collection, record: Omit<T, 'id'>) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const value = { ...record, id: numericId() } as T
    try {
      await writeJson(objectKey(collection, value.id), value, true)
      return value
    } catch (error) {
      if (statusCode(error) !== 409 && statusCode(error) !== 412) throw error
    }
  }
  throw new Error(`Unable to allocate an id for ${collection}`)
}

async function updateRecord<T extends { id: number }>(
  collection: Collection,
  id: number,
  patch: Partial<Omit<T, 'id'>>
) {
  const key = objectKey(collection, id)
  const current = await readJson<T>(key)
  if (!current) return null
  const updated = { ...current, ...patch, id }
  await writeJson(key, updated)
  return updated
}

async function seedNavCardsIfEmpty() {
  const existing = await listRecords<NavCardRecord>('nav-cards')
  const initialized = await readJson<{ initializedAt: string }>(initializationKey())
  if (initialized) return existing

  if (existing.length > 0) {
    await writeJson(initializationKey(), { initializedAt: new Date().toISOString() })
    return existing
  }

  await Promise.all(
    DEFAULT_NAV_CARDS.map(async (card) => {
      try {
        await writeJson(objectKey('nav-cards', card.id), card, true)
      } catch (error) {
        if (statusCode(error) !== 409 && statusCode(error) !== 412) throw error
      }
    })
  )
  await writeJson(initializationKey(), { initializedAt: new Date().toISOString() })
  return listRecords<NavCardRecord>('nav-cards')
}

export async function getNavCardRecords() {
  const [records] = await Promise.all([seedNavCardsIfEmpty(), ensureAdminPasswordRecord()])
  return records.sort((a, b) => a.displayOrder - b.displayOrder)
}

export async function createNavCardRecord(data: {
  title: string
  description?: string
  imageUrl?: string
  category: string
}) {
  const now = new Date().toISOString()
  return createRecord<NavCardRecord>('nav-cards', {
    title: data.title,
    description: data.description || null,
    imageUrl: data.imageUrl || null,
    category: data.category,
    displayOrder: 0,
    createdAt: now,
    updatedAt: now,
  })
}

export async function updateNavCardRecord(
  id: number,
  data: Partial<Pick<NavCardRecord, 'title' | 'description' | 'imageUrl' | 'category' | 'displayOrder'>>
) {
  const current = await readJson<NavCardRecord>(objectKey('nav-cards', id))
  const updated = await updateRecord<NavCardRecord>('nav-cards', id, {
    ...data,
    updatedAt: new Date().toISOString(),
  })
  if (updated && data.imageUrl !== undefined && data.imageUrl !== current?.imageUrl) {
    await deleteKeys([storedMediaKey(current?.imageUrl)])
  }
  return updated
}

export async function deleteNavCardRecord(id: number) {
  const [navCard, contentCards, regions, downloads] = await Promise.all([
    readJson<NavCardRecord>(objectKey('nav-cards', id)),
    getContentCardRecords(id),
    listRecords<RegionRecord>('regions'),
    listRecords<DownloadRecord>('download-records'),
  ])
  const contentIds = new Set(contentCards.map((card) => card.id))
  const relatedDownloads = downloads.filter((record) => contentIds.has(record.contentCardId))

  await deleteKeys([
    storedMediaKey(navCard?.imageUrl),
    ...contentCards.flatMap((card) => [
      storedMediaKey(card.imageUrl),
      storedMediaKey(card.videoUrl),
      objectKey('content-cards', card.id),
    ]),
    ...relatedDownloads.map((record) => objectKey('download-records', record.id)),
    ...regions
      .filter((record) => record.navCardId === id)
      .map((record) => objectKey('regions', record.id)),
    objectKey('nav-cards', id),
    objectKey('page-passwords', id),
  ])

  // Historical click events are retained for daily totals. Reading thousands of
  // event objects during an interactive delete caused the previous timeouts.
}

export async function getContentCardRecords(navCardId?: number) {
  const records = await listRecords<ContentCardRecord>('content-cards')
  return records
    .filter((record) => navCardId === undefined || record.navCardId === navCardId)
    .sort((a, b) => a.displayOrder - b.displayOrder)
}

export async function createContentCardRecord(data: {
  navCardId: number
  title: string
  description?: string
  imageUrl?: string
  videoUrl?: string
  detail?: string
  address?: string
  region?: string
}) {
  const now = new Date().toISOString()
  return createRecord<ContentCardRecord>('content-cards', {
    navCardId: data.navCardId,
    title: data.title,
    description: data.description || null,
    imageUrl: data.imageUrl || null,
    videoUrl: data.videoUrl || null,
    detail: data.detail || null,
    address: data.address || null,
    region: data.region || null,
    displayOrder: 0,
    createdAt: now,
    updatedAt: now,
  })
}

export async function updateContentCardRecord(
  id: number,
  data: Partial<
    Pick<
      ContentCardRecord,
      'title' | 'description' | 'imageUrl' | 'videoUrl' | 'detail' | 'address' | 'region' | 'displayOrder'
    >
  >
) {
  const current = await readJson<ContentCardRecord>(objectKey('content-cards', id))
  const updated = await updateRecord<ContentCardRecord>('content-cards', id, {
    ...data,
    updatedAt: new Date().toISOString(),
  })
  if (updated) {
    await deleteKeys([
      data.imageUrl !== undefined && data.imageUrl !== current?.imageUrl
        ? storedMediaKey(current?.imageUrl)
        : null,
      data.videoUrl !== undefined && data.videoUrl !== current?.videoUrl
        ? storedMediaKey(current?.videoUrl)
        : null,
    ])
  }
  return updated
}

export async function deleteContentCardRecord(id: number) {
  const [card, downloads] = await Promise.all([
    readJson<ContentCardRecord>(objectKey('content-cards', id)),
    listRecords<DownloadRecord>('download-records'),
  ])
  if (!card) return

  await deleteKeys([
    storedMediaKey(card.imageUrl),
    storedMediaKey(card.videoUrl),
    objectKey('content-cards', id),
    ...downloads
      .filter((record) => record.contentCardId === id)
      .map((record) => objectKey('download-records', record.id)),
  ])

  // Click events are intentionally retained for historical daily totals.
}

export async function getRegionRecords(options: { navCardId?: number; includeDisabled?: boolean } = {}) {
  const records = await listRecords<RegionRecord>('regions')
  return records
    .filter((record) => options.includeDisabled || record.enabled === 1)
    .filter((record) => options.navCardId === undefined || record.navCardId === options.navCardId)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.cityName.localeCompare(b.cityName, 'zh-CN'))
}

export async function createRegionRecord(data: {
  navCardId?: number | null
  cityName: string
  districtName?: string | null
  displayOrder?: number
}) {
  return createRecord<RegionRecord>('regions', {
    navCardId: data.navCardId ?? null,
    cityName: data.cityName,
    districtName: data.districtName || null,
    enabled: 1,
    displayOrder: data.displayOrder ?? 0,
    createdAt: new Date().toISOString(),
  })
}

export async function updateRegionRecord(
  id: number,
  data: Partial<Pick<RegionRecord, 'cityName' | 'districtName' | 'enabled' | 'displayOrder'>>
) {
  return updateRecord<RegionRecord>('regions', id, data)
}

export async function deleteRegionRecord(id: number) {
  await deleteKey(objectKey('regions', id))
}

export async function getSiteSettingsRecord() {
  const records = await listRecords<SiteSettingRecord>('site-settings')
  const settings = Object.fromEntries(records.map((record) => [record.key, record.value]))
  const defaults: Record<string, string> = {
    siteName: '酒馆推介',
    siteLogo: '',
    homeTitle: '发现优质酒馆',
    homeSubtitle: '探索各地特色酒吧，品味独特体验',
  }
  const missing = Object.entries(defaults).filter(([key]) => settings[key] === undefined)
  await Promise.all(missing.map(([key, value]) => setSiteSettingRecord(key, value)))
  return { ...defaults, ...settings }
}

export async function setSiteSettingRecord(key: string, value: string) {
  const objectPath = objectKey('site-settings', key)
  const previous = await readJson<SiteSettingRecord>(objectPath)
  const record: SiteSettingRecord = {
    id: key,
    key,
    value,
    updatedAt: new Date().toISOString(),
  }
  await writeJson(objectPath, record)
  if (key === 'siteLogo' && previous?.value !== value) {
    await deleteKeys([storedMediaKey(previous?.value)])
  }
  return record
}

export async function getPagePasswordRecords() {
  return listPrivateRecords<PagePasswordRecord>('page-passwords')
}

export async function setPagePasswordRecord(navCardId: number, password: string | undefined, enabled: boolean) {
  const key = objectKey('page-passwords', navCardId)
  const existing = await readPrivateJson<PagePasswordRecord>(key)
  if (!existing && !password) throw new Error('A password is required')

  const record: PagePasswordRecord = {
    id: existing?.id ?? numericId(),
    navCardId,
    passwordHash: password ? hashPassword(password) : existing!.passwordHash,
    enabled: enabled ? 1 : 0,
    updatedAt: new Date().toISOString(),
  }
  await writePrivateJson(key, record)
  return record
}

export async function deletePagePasswordRecord(navCardId: number) {
  await deleteKey(objectKey('page-passwords', navCardId))
}

export async function verifyPagePasswordRecord(navCardId: number, password: string) {
  const record = await readPrivateJson<PagePasswordRecord>(objectKey('page-passwords', navCardId))
  if (!record || record.enabled !== 1) return { valid: true, protected: false }
  return { valid: verifyPassword(password, record.passwordHash), protected: true }
}

export async function isPageProtected(navCardId: number) {
  const record = await readPrivateJson<PagePasswordRecord>(objectKey('page-passwords', navCardId))
  return Boolean(record && record.enabled === 1)
}

export async function recordClickEvent(data: { navCardId?: number; contentCardId?: number }) {
  const now = new Date()
  return createRecord<ClickEventRecord>('click-events', {
    navCardId: data.navCardId ?? null,
    contentCardId: data.contentCardId ?? null,
    clickedAt: now.toISOString(),
    date: now.toISOString().slice(0, 10),
  })
}

export async function getClickEventRecords() {
  return listRecords<ClickEventRecord>('click-events')
}

export async function createDownloadRecord(data: {
  contentCardId: number
  fileUrl: string
  fileName: string
  fileType: 'image' | 'video'
}) {
  return createRecord<DownloadRecord>('download-records', {
    ...data,
    downloadedAt: new Date().toISOString(),
  })
}

export async function getDownloadRecords() {
  const records = await listRecords<DownloadRecord>('download-records')
  return records.sort((a, b) => a.downloadedAt.localeCompare(b.downloadedAt))
}

function hashPassword(password: string) {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64)
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`
}

function verifyPassword(password: string, encoded: string) {
  const [algorithm, saltValue, hashValue] = encoded.split('$')
  if (algorithm !== 'scrypt' || !saltValue || !hashValue) return false
  const expected = Buffer.from(hashValue, 'base64')
  const actual = scryptSync(password, Buffer.from(saltValue, 'base64'), expected.length)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export async function setAdminPasswordRecord(password: string) {
  const record: AdminPasswordRecord = {
    passwordHash: hashPassword(password),
    updatedAt: new Date().toISOString(),
  }
  await writePrivateJson(adminPasswordKey(), record)
}

async function ensureAdminPasswordRecord() {
  let record = await readPrivateJson<AdminPasswordRecord>(adminPasswordKey())
  if (!record) {
    record = {
      passwordHash: hashPassword('admin123'),
      updatedAt: new Date().toISOString(),
    }
    await writePrivateJson(adminPasswordKey(), record)
  }
  return record
}

export async function verifyAdminPasswordRecord(password: string) {
  const record = await ensureAdminPasswordRecord()
  return verifyPassword(password, record.passwordHash)
}

export async function checkS3DataStore() {
  await getS3Client().send(
    new ListObjectsV2Command({ Bucket: getS3Bucket(), Prefix: APP_DATA_PREFIX, MaxKeys: 1 }),
    { abortSignal: AbortSignal.timeout(S3_REQUEST_TIMEOUT_MS) }
  )
}

export function newStorageObjectName() {
  return `${Date.now()}-${randomUUID()}`
}
