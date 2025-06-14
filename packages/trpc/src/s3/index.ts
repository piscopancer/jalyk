import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { faker } from '@faker-js/faker'
import slugify from 'slugify'

const bucket = 'jalyk'

export const client = new S3Client({
  endpoint: 'https://storage.yandexcloud.net',
  region: 'ru-central1',
  credentials: {
    accessKeyId: process.env.YANDEX_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.YANDEX_S3_SECRET_ACCESS_KEY,
  },
})

export function buildKey(projectId: string, fileName: string) {
  const slug = (() => {
    let slug = slugify(fileName, {
      lower: true,
      trim: true,
    })
    const prefix = faker.string.ulid().slice(8)
    slug = `${prefix}-${slug}`
    return slug
  })()
  return `${projectId}/${slug}`
}

export async function uploadProjectAsset(projectId: string, fileName: string, data: string) {
  const res = await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: buildKey(projectId, fileName),
      Body: data,
    })
  )
  return res
}

export async function deleteProjectAsset(projectId: string, fileName: string) {
  const res = await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: buildKey(projectId, fileName),
    })
  )
  return res
}
