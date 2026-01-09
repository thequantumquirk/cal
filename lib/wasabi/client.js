import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Wasabi S3-compatible client configuration
const wasabiClient = new S3Client({
  region: process.env.WASABI_REGION || "us-east-1",
  endpoint: process.env.WASABI_ENDPOINT || "https://s3.us-east-1.wasabisys.com",
  credentials: {
    accessKeyId: process.env.WASABI_ACCESS_KEY_ID,
    secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY,
  },
  forcePathStyle: false,
});

// Bucket names from environment variables
export const WASABI_BUCKETS = {
  DOCUMENTS: process.env.WASABI_BUCKET_DOCUMENTS || "efficiency-issuer-documents",
  RESTRICTED_DOCS: process.env.WASABI_BUCKET_RESTRICTED_DOCS || "efficiency-broker-documents",
};

/**
 * Upload a file to Wasabi storage
 * @param {string} bucket - The bucket name
 * @param {string} key - The file path/key in the bucket
 * @param {Buffer|Blob|ReadableStream} body - The file content
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<string>} The public URL of the uploaded file
 */
export async function uploadToWasabi(bucket, key, body, contentType) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    ACL: "public-read",
  });

  await wasabiClient.send(command);

  // Return public URL
  const region = process.env.WASABI_REGION || "us-east-1";
  return `https://s3.${region}.wasabisys.com/${bucket}/${key}`;
}

/**
 * Delete a file from Wasabi storage
 * @param {string} bucket - The bucket name
 * @param {string} key - The file path/key to delete
 */
export async function deleteFromWasabi(bucket, key) {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return wasabiClient.send(command);
}

/**
 * Parse a Wasabi URL to extract bucket and key
 * @param {string} url - The Wasabi public URL
 * @returns {{ bucket: string, key: string } | null}
 */
export function parseWasabiUrl(url) {
  try {
    // URL format: https://s3.{region}.wasabisys.com/{bucket}/{key}
    const match = url.match(/https:\/\/s3\.[^.]+\.wasabisys\.com\/([^/]+)\/(.+)/);
    if (match) {
      return {
        bucket: match[1],
        key: match[2],
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if a URL is a Wasabi URL
 * @param {string} url - The URL to check
 * @returns {boolean}
 */
export function isWasabiUrl(url) {
  return url?.includes("wasabisys.com");
}

/**
 * Check if a URL is a Supabase storage URL
 * @param {string} url - The URL to check
 * @returns {boolean}
 */
export function isSupabaseStorageUrl(url) {
  return url?.includes("/storage/v1/object/public/");
}

export { wasabiClient };
