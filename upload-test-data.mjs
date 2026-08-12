import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import fs from 'node:fs'
import path from 'node:path'

for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (!match) continue
  process.env[match[1]] ??= match[2].trim().replace(/^['"]|['"]$/g, '')
}

const required = ['S3_ENDPOINT', 'S3_ACCESS_KEY', 'S3_SECRET_KEY', 'S3_BUCKET_NAME']
for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} is not configured`)
}

const client = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: true,
})

for (let index = 1; index <= 4; index++) {
  const localPath = path.join('public', 'images', `bar${index}.png`)
  const key = `media/seed/bar${index}.png`
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: fs.readFileSync(localPath),
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000, immutable',
    })
  )
  console.log(`Uploaded ${key}`)
}
