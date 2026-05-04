import { Storage } from "@google-cloud/storage";
import { RESUMES_BUCKET_ENV, gsPath } from "./constants";

let _storage: Storage | null = null;

export function storage(): Storage {
  if (!_storage) _storage = new Storage();
  return _storage;
}

export function resumesBucket(): string {
  const v = process.env[RESUMES_BUCKET_ENV];
  if (!v) throw new Error(`${RESUMES_BUCKET_ENV} is not set`);
  return v;
}

export function parseGsPath(path: string): { bucket: string; object: string } {
  if (!path.startsWith("gs://")) throw new Error("Invalid gcsPath");
  const without = path.slice(5);
  const i = without.indexOf("/");
  if (i === -1) throw new Error("Invalid gcsPath");
  const bucket = without.slice(0, i);
  const object = without.slice(i + 1);
  if (!bucket || !object) throw new Error("Invalid gcsPath");
  return { bucket, object };
}

export async function writeBuffer(object: string, body: Buffer, contentType: string): Promise<string> {
  const bucket = resumesBucket();
  await storage().bucket(bucket).file(object).save(body, {
    contentType,
    resumable: false,
    metadata: { cacheControl: "private, max-age=0, no-store" },
  });
  return gsPath(bucket, object);
}

export async function readBuffer(object: string): Promise<Buffer> {
  const bucket = resumesBucket();
  const [buf] = await storage().bucket(bucket).file(object).download();
  return buf;
}

export async function copyObject(srcGsPath: string, dstObject: string): Promise<string> {
  const dstBucket = resumesBucket();
  const { bucket: srcBucket, object: srcObject } = parseGsPath(srcGsPath);
  await storage()
    .bucket(srcBucket)
    .file(srcObject)
    .copy(storage().bucket(dstBucket).file(dstObject));
  return gsPath(dstBucket, dstObject);
}

export async function deletePrefix(prefix: string): Promise<void> {
  const bucket = resumesBucket();
  await storage().bucket(bucket).deleteFiles({ prefix, force: true });
}

export async function deleteObject(object: string): Promise<void> {
  const bucket = resumesBucket();
  await storage().bucket(bucket).file(object).delete({ ignoreNotFound: true });
}

export async function signedReadUrl(gcsPath: string, ttlSeconds = 5 * 60): Promise<string> {
  const { bucket, object } = parseGsPath(gcsPath);
  const [url] = await storage()
    .bucket(bucket)
    .file(object)
    .getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + ttlSeconds * 1000,
    });
  return url;
}
