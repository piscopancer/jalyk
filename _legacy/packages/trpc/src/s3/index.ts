import { _Object, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { faker } from '@faker-js/faker'
import path from 'node:path'
import slugify from 'slugify'

const bucket = 'jalyk'

export const s3client = new S3Client({
  endpoint: 'https://storage.yandexcloud.net',
  region: 'ru-central1',
  credentials: {
    accessKeyId: process.env.S3_ID!,
    secretAccessKey: process.env.S3_SECRET!,
  },
})

export function buildAssetKey(projectId: string, name: string) {
  const slug = (() => {
    let slug = slugify(name, {
      lower: true,
      trim: true,
    })
    const prefix = faker.string.ulid().slice(8)
    slug = `${prefix}-${slug}`
    return slug
  })()
  return path.join(projectId, slug)
}

export async function uploadProjectAsset(projectId: string, name: string, data: string) {
  const res = await s3client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: buildAssetKey(projectId, name),
      Body: data,
    })
  )
  return res
}

export async function deleteAsset(projectId: string, name: string) {
  return s3client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: buildAssetKey(projectId, name),
    })
  )
}

export async function listAssets(projectId: string) {
  const res = await s3client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: projectId,
    })
  )
  return res.Contents?.map((c) => {
    const asset = path.parse(c.Key!)
    return {
      name: asset.name,
      extension: asset.ext.replace('.', ''),
      size: c.Size!,
      lastModified: c.LastModified!,
    }
  })
}

export type S3Object = _Object

export async function getObject() {
  const res = await s3client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: 'la/jopa.md',
    })
  )
}
