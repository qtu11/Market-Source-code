import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { randomUUID } from "crypto"
import { logger } from "@/lib/logger"

const bucket = process.env.S3_BUCKET_NAME
const region = process.env.S3_REGION
const accessKeyId = process.env.S3_ACCESS_KEY_ID
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY
const endpoint = process.env.S3_ENDPOINT
const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL

if (!bucket || !region || !accessKeyId || !secretAccessKey) {
  logger.warn("S3 avatar upload disabled: missing credentials")
}

function getClient() {
  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    throw new Error("S3 credentials are not configured")
  }
  return new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: !!endpoint,
  })
}

export async function uploadAvatarFile(file: Buffer, mimeType: string) {
  if (!bucket) {
    throw new Error("S3_BUCKET_NAME is not configured")
  }
  const client = getClient()
  const key = `avatars/${randomUUID()}.png`
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file,
      ContentType: mimeType || "image/png",
      ACL: "public-read",
    })
  )

  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/$/, "")}/${key}`
  }

  return endpoint
    ? `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`
    : `https://${bucket}.s3.${region}.amazonaws.com/${key}`
}

