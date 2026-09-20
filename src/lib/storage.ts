import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";

function s3() {
  const e = env();
  return new S3Client({ endpoint: e.S3_ENDPOINT, region: e.S3_REGION, forcePathStyle: true, credentials: { accessKeyId: e.S3_ACCESS_KEY, secretAccessKey: e.S3_SECRET_KEY } });
}

export async function createUploadUrl(key: string, contentType: string, bytes: number) {
  if (bytes <= 0 || bytes > 250 * 1024 * 1024) throw new Error("Uploads must be between 1 byte and 250 MB.");
  return getSignedUrl(s3(), new PutObjectCommand({ Bucket: env().S3_BUCKET, Key: key, ContentType: contentType, ContentLength: bytes }), { expiresIn: 600 });
}

export async function createDownloadUrl(key: string) {
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: env().S3_BUCKET, Key: key }), { expiresIn: 900 });
}

export async function verifyObject(key: string) {
  return s3().send(new HeadObjectCommand({ Bucket: env().S3_BUCKET, Key: key }));
}

export async function putObject(key: string, body: Uint8Array, contentType: string) {
  await s3().send(new PutObjectCommand({ Bucket: env().S3_BUCKET, Key: key, Body: body, ContentType: contentType }));
}
