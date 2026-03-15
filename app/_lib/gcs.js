/**
 * @file Google Cloud Storage client and upload helper.
 * @module gcs
 *
 * Required env vars:
 *   GCS_PROJECT_ID       – GCP project ID
 *   GCS_CLIENT_EMAIL     – service account email
 *   GCS_PRIVATE_KEY      – service account private key (with \n newlines)
 *   GCS_BUCKET_NAME      – bucket name (must be public or have signed-URL access)
 */

import { Storage } from '@google-cloud/storage';

let _storage = null;

function getStorage() {
  if (_storage) return _storage;

  const projectId = process.env.GCS_PROJECT_ID;
  const clientEmail = process.env.GCS_CLIENT_EMAIL;
  const privateKey = process.env.GCS_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing GCS credentials. Set GCS_PROJECT_ID, GCS_CLIENT_EMAIL, GCS_PRIVATE_KEY in env.'
    );
  }

  _storage = new Storage({
    projectId,
    credentials: { client_email: clientEmail, private_key: privateKey },
  });

  return _storage;
}

/**
 * Upload a buffer to GCS and return the public URL.
 *
 * @param {Buffer}  buffer      - File contents
 * @param {string}  destination - Object path inside the bucket (e.g. "events/123.jpg")
 * @param {string}  contentType - MIME type
 * @returns {Promise<string>}   - Public URL
 */
export async function uploadToGCS(buffer, destination, contentType) {
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) throw new Error('GCS_BUCKET_NAME env var is not set.');

  const storage = getStorage();
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(destination);

  await file.save(buffer, {
    metadata: { contentType },
    resumable: false,
  });

  // Make the file publicly readable
  await file.makePublic();

  return `https://storage.googleapis.com/${bucketName}/${destination}`;
}

/**
 * Delete a file from GCS by its public URL or storage path.
 *
 * @param {string} urlOrPath - Full public URL or bucket-relative path
 */
export async function deleteFromGCS(urlOrPath) {
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) return;

  // Extract the object path from a full URL if needed
  let dest = urlOrPath;
  const prefix = `https://storage.googleapis.com/${bucketName}/`;
  if (urlOrPath.startsWith(prefix)) {
    dest = urlOrPath.slice(prefix.length);
  }

  try {
    const storage = getStorage();
    await storage
      .bucket(bucketName)
      .file(dest)
      .delete({ ignoreNotFound: true });
  } catch {
    // Non-fatal — log but don't throw
    console.warn('GCS delete warning:', dest);
  }
}
