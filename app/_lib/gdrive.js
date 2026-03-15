/**
 * @file Google Drive API client and upload helper.
 * @module gdrive
 *
 * Required env vars:
 *   GDRIVE_CLIENT_ID      – OAuth2 client ID (same as AUTH_GOOGLE_ID)
 *   GDRIVE_CLIENT_SECRET  – OAuth2 client secret (same as AUTH_GOOGLE_SECRET)
 *   GDRIVE_REFRESH_TOKEN  – OAuth2 refresh token (run scripts/get-drive-token.mjs once)
 *   GDRIVE_FOLDER_ID      – target folder ID from a personal Drive folder URL
 *
 * Setup:
 *   1. Enable the Google Drive API at console.cloud.google.com
 *   2. Add http://localhost:3001/callback as an Authorised Redirect URI for the OAuth2 client
 *   3. Run: node scripts/get-drive-token.mjs
 *   4. Set GDRIVE_REFRESH_TOKEN in .env.local with the printed token
 *   5. Create a folder in your personal Google Drive and copy the folder ID from the URL
 */

import { google } from 'googleapis';
import { Readable } from 'stream';

let _driveClient = null;

function getDriveClient() {
  if (_driveClient) return _driveClient;

  const clientId = process.env.GDRIVE_CLIENT_ID;
  const clientSecret = process.env.GDRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GDRIVE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing Google Drive credentials. Set GDRIVE_CLIENT_ID, GDRIVE_CLIENT_SECRET, and GDRIVE_REFRESH_TOKEN in env.'
    );
  }

  const auth = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'http://localhost:3001/callback'
  );
  auth.setCredentials({ refresh_token: refreshToken });

  _driveClient = google.drive({ version: 'v3', auth });
  return _driveClient;
}

// Cache for subfolder IDs so we don't re-create them every upload
const _subfolderCache = new Map();

/**
 * Find or create a subfolder inside the root GDRIVE_FOLDER_ID.
 * Results are cached in memory for the lifetime of the process.
 */
async function getOrCreateSubfolder(drive, parentId, folderName) {
  const cacheKey = `${parentId}/${folderName}`;
  if (_subfolderCache.has(cacheKey)) return _subfolderCache.get(cacheKey);

  // Check if subfolder already exists
  const { data: existing } = await drive.files.list({
    q: `'${parentId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id)',
    pageSize: 1,
  });

  if (existing.files?.length > 0) {
    const id = existing.files[0].id;
    _subfolderCache.set(cacheKey, id);
    return id;
  }

  // Create the subfolder
  const { data: folder } = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });

  _subfolderCache.set(cacheKey, folder.id);
  return folder.id;
}

/**
 * Upload a buffer to Google Drive and return the public image URL.
 *
 * The file is placed in GDRIVE_FOLDER_ID (or a subfolder if specified),
 * made publicly readable, and the URL uses Google's CDN:
 * https://lh3.googleusercontent.com/d/{fileId}
 *
 * @param {Buffer}  buffer      - File contents
 * @param {string}  filename    - Desired filename (e.g. "event_123.jpg")
 * @param {string}  contentType - MIME type (e.g. "image/jpeg")
 * @param {string}  [subfolder] - Optional subfolder name (e.g. "event-images")
 * @returns {Promise<{url: string, fileId: string}>}
 */
export async function uploadToDrive(buffer, filename, contentType, subfolder) {
  const rootFolderId = process.env.GDRIVE_FOLDER_ID;
  if (!rootFolderId) throw new Error('GDRIVE_FOLDER_ID env var is not set.');

  try {
    const drive = getDriveClient();

    // Resolve target folder (create subfolder if specified)
    const targetFolderId = subfolder
      ? await getOrCreateSubfolder(drive, rootFolderId, subfolder)
      : rootFolderId;

    // Convert Buffer to a readable stream for the multipart upload
    const stream = Readable.from(buffer);

    // 1. Upload the file
    const { data: file } = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [targetFolderId],
      },
      media: {
        mimeType: contentType,
        body: stream,
      },
      fields: 'id, name',
    });

    const fileId = file.id;

    // 2. Make the file publicly readable (anyone with the link can view)
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // 3. Return our image proxy URL (avoids CSP/CORS issues with external domains)
    const url = `/api/image/${fileId}`;
    return { url, fileId };
  } catch (err) {
    // Handle "invalid_grant" error - refresh token has expired
    if (err.message?.includes('invalid_grant')) {
      const helpText =
        'Google Drive refresh token expired. Run this command to regenerate it:\n' +
        '  GDRIVE_CLIENT_ID=$GDRIVE_CLIENT_ID GDRIVE_CLIENT_SECRET=$GDRIVE_CLIENT_SECRET node scripts/get-drive-token.mjs\n' +
        'Then update GDRIVE_REFRESH_TOKEN in your .env.local';
      const error = new Error(helpText);
      error.originalError = err;
      throw error;
    }
    throw err;
  }
}

/**
 * Delete a file from Google Drive by its file ID or public URL.
 *
 * @param {string} fileIdOrUrl - Drive file ID, lh3 URL, /api/image/{id} URL, or drive.google.com URL
 */
export async function deleteFromDrive(fileIdOrUrl) {
  if (!fileIdOrUrl) return;

  let fileId = fileIdOrUrl;

  // Extract file ID from /api/image/{fileId} proxy URL
  const proxyMatch = fileIdOrUrl.match(/\/api\/image\/([^/?&]+)/);
  if (proxyMatch) {
    fileId = proxyMatch[1];
  }

  // Extract file ID from a lh3.googleusercontent.com/d/{fileId} URL
  const lh3Match = fileIdOrUrl.match(
    /lh3\.googleusercontent\.com\/d\/([^/?&]+)/
  );
  if (lh3Match) {
    fileId = lh3Match[1];
  }

  // Extract file ID from a drive.google.com URL (uc?id= or /file/d/)
  const driveMatch =
    fileIdOrUrl.match(/[?&]id=([^&]+)/) ||
    fileIdOrUrl.match(/\/file\/d\/([^/]+)/);
  if (driveMatch) {
    fileId = driveMatch[1];
  }

  try {
    const drive = getDriveClient();
    await drive.files.delete({ fileId });
  } catch (err) {
    // Ignore "not found" errors
    if (err?.code !== 404 && err?.status !== 404) {
      console.error('Google Drive delete error:', err?.message ?? err);
    }
  }
}
