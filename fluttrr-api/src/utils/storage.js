/**
 * Cloud storage utility for Cloudflare R2 (S3-compatible).
 *
 * Falls back to null when S3 env vars are not set (dev mode uses local disk).
 */

const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const isConfigured = !!(process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY);

const s3 = isConfigured
  ? new S3Client({
      region: 'auto',
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
      },
    })
  : null;

const BUCKET = process.env.S3_BUCKET || 'fluttrr-uploads';
const PUBLIC_URL = process.env.S3_PUBLIC_URL || '';

/**
 * Upload a file buffer to R2.
 * @param {Buffer} buffer - File contents
 * @param {string} key - Object key (e.g. "images/uuid.jpg")
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} Public URL of the uploaded file
 */
async function uploadToCloud(buffer, key, contentType) {
  if (!s3) return null;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  return `${PUBLIC_URL}/${key}`;
}

/**
 * Delete a file from R2.
 * @param {string} key - Object key
 */
async function deleteFromCloud(key) {
  if (!s3) return;

  await s3.send(new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }));
}

/**
 * Extract the object key from a public URL.
 * @param {string} url - Full public URL
 * @returns {string|null} Object key or null
 */
function keyFromUrl(url) {
  if (!PUBLIC_URL || !url.startsWith(PUBLIC_URL)) return null;
  return url.slice(PUBLIC_URL.length + 1); // +1 for the trailing /
}

module.exports = { uploadToCloud, deleteFromCloud, keyFromUrl, isConfigured };
