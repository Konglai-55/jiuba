import { S3Client } from '@aws-sdk/client-s3'

export const APP_DATA_PREFIX = '__jiuba_data__/v1/'

let cachedClient: S3Client | null = null

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not configured`)
  }
  return value
}

export function getS3Client() {
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      endpoint: requireEnv('S3_ENDPOINT'),
      credentials: {
        accessKeyId: requireEnv('S3_ACCESS_KEY'),
        secretAccessKey: requireEnv('S3_SECRET_KEY'),
      },
      forcePathStyle: true,
    })
  }

  return cachedClient
}

export function getS3Bucket() {
  return requireEnv('S3_BUCKET_NAME')
}

export function isAppDataKey(key: string) {
  return key.startsWith(APP_DATA_PREFIX)
}
