/**
 * @file Google Drive upload service for bootcamp content.
 * @module bootcamp-upload
 *
 * Handles uploading thumbnails and videos to Google Drive with proper folder structure.
 * Uses the same Service Account as the streaming service for consistency.
 *
 * Folder Structure:
 *   /NEUPC_Bootcamps/
 *     ├── {bootcamp_id}/
 *     │   ├── thumbnails/
 *     │   │   └── {filename}.jpg
 *     │   └── videos/
 *     │       ├── {lesson_id}/
 *     │       │   └── {filename}.mp4
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

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });

  _driveClient = google.drive({ version: 'v3', auth });
  return _driveClient;
}

/**
 * Get the root folder ID for bootcamp content.
 * Creates the folder if it doesn't exist.
 *
 * @returns {Promise<string>} - Folder ID
 */
async function getRootFolderId() {
  const drive = getDriveClient();
  const folderName = 'NEUPC_Bootcamps';
  const parentId = process.env.GDRIVE_FOLDER_ID;

  const safeName = escapeDriveQuery(folderName);
  const safeParent = parentId ? escapeDriveQuery(parentId) : null;
  const q = safeParent
    ? `name='${safeName}' and '${safeParent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
    : `name='${safeName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const response = await drive.files.list({
    q,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id;
  }

  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId ? { parents: [parentId] } : {}),
    },
    fields: 'id',
  });

  return folder.data.id;
}

/**
 * Get or create a folder by path under a parent folder.
 *
 * @param {string} parentId - Parent folder ID
 * @param {string} folderName - Folder name to create/find
 * @returns {Promise<string>} - Folder ID
 */
function escapeDriveQuery(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function getOrCreateFolder(parentId, folderName) {
  const drive = getDriveClient();
  const safeName = escapeDriveQuery(folderName);
  const safeParent = escapeDriveQuery(parentId);

  // Search for existing folder
  const response = await drive.files.list({
    q: `name='${safeName}' and '${safeParent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id;
  }

  // Create folder
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });

  return folder.data.id;
}

/**
 * Upload a thumbnail to Google Drive.
 *
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} filename - Original filename
 * @param {string} mimeType - File MIME type
 * @param {string} bootcampId - Bootcamp ID
 * @returns {Promise<{fileId: string, filename: string, size: number}>}
 */
export async function uploadThumbnail(
  fileBuffer,
  filename,
  mimeType,
  bootcampId
) {
  try {
    const drive = getDriveClient();

    // Get/create folder structure: NEUPC_Bootcamps/{bootcamp_id}/thumbnails
    const rootId = await getRootFolderId();
    const bootcampFolderId = await getOrCreateFolder(rootId, bootcampId);
    const thumbnailsFolderId = await getOrCreateFolder(
      bootcampFolderId,
      'thumbnails'
    );

    // Create a readable stream from buffer
    const stream = Readable.from(fileBuffer);

    // Upload file
    const response = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [thumbnailsFolderId],
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: 'id, name, size',
    });

    const fileId = response.data.id;

    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    return {
      fileId,
      filename: response.data.name,
      size: parseInt(response.data.size, 10),
    };
  } catch (error) {
    console.error('Error uploading thumbnail to Drive:', error);
    throw new Error(`Failed to upload thumbnail: ${error.message}`);
  }
}

/**
 * Upload a video to Google Drive.
 *
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} filename - Original filename
 * @param {string} mimeType - File MIME type
 * @param {string} bootcampId - Bootcamp ID
 * @param {string} lessonId - Lesson ID
 * @returns {Promise<{fileId: string, filename: string, size: number, duration: number|null}>}
 */
export async function uploadVideo(
  fileBuffer,
  filename,
  mimeType,
  bootcampId,
  lessonId
) {
  try {
    const drive = getDriveClient();

    // Get/create folder structure: NEUPC_Bootcamps/{bootcamp_id}/videos/{lesson_id}
    const rootId = await getRootFolderId();
    const bootcampFolderId = await getOrCreateFolder(rootId, bootcampId);
    const videosFolderId = await getOrCreateFolder(bootcampFolderId, 'videos');
    const lessonFolderId = await getOrCreateFolder(videosFolderId, lessonId);

    // Create a readable stream from buffer
    const stream = Readable.from(fileBuffer);

    // Upload file
    const response = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [lessonFolderId],
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: 'id, name, size, videoMediaMetadata',
    });

    // Extract duration if available
    const duration = response.data.videoMediaMetadata?.durationMillis
      ? Math.round(response.data.videoMediaMetadata.durationMillis / 1000)
      : null;

    return {
      fileId: response.data.id,
      filename: response.data.name,
      size: parseInt(response.data.size, 10),
      duration,
    };
  } catch (error) {
    console.error('Error uploading video to Drive:', error);
    throw new Error(`Failed to upload video: ${error.message}`);
  }
}

/**
 * Delete a file from Google Drive.
 *
 * @param {string} fileId - File ID to delete
 * @returns {Promise<void>}
 */
export async function deleteFile(fileId) {
  try {
    const drive = getDriveClient();
    await drive.files.delete({ fileId });
  } catch (error) {
    console.error('Error deleting file from Drive:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Create a resumable upload session for large files.
 * Returns the upload URL for chunked uploads.
 *
 * @param {string} filename - Original filename
 * @param {string} mimeType - File MIME type
 * @param {number} fileSize - Total file size in bytes
 * @param {string} bootcampId - Bootcamp ID
 * @param {string} lessonId - Lesson ID
 * @returns {Promise<{uploadUrl: string, folderId: string}>}
 */
export async function createResumableUpload(
  filename,
  mimeType,
  fileSize,
  bootcampId,
  lessonId
) {
  try {
    const drive = getDriveClient();

    // Get/create folder structure
    const rootId = await getRootFolderId();
    const bootcampFolderId = await getOrCreateFolder(rootId, bootcampId);
    const videosFolderId = await getOrCreateFolder(bootcampFolderId, 'videos');
    const lessonFolderId = await getOrCreateFolder(videosFolderId, lessonId);

    // Initiate resumable upload
    const response = await drive.files.create(
      {
        requestBody: {
          name: filename,
          parents: [lessonFolderId],
        },
        media: {
          mimeType,
          body: Readable.from([]), // Empty stream to get upload URL
        },
        fields: 'id, name, size, videoMediaMetadata',
      },
      {
        // Request resumable upload
        uploadType: 'resumable',
        headers: {
          'X-Upload-Content-Type': mimeType,
          'X-Upload-Content-Length': fileSize,
        },
      }
    );

    // The upload URL is in the response headers
    const uploadUrl = response.headers?.location;

    if (!uploadUrl) {
      throw new Error('Failed to get resumable upload URL');
    }

    return {
      uploadUrl,
      folderId: lessonFolderId,
    };
  } catch (error) {
    console.error('Error creating resumable upload:', error);
    throw new Error(`Failed to create resumable upload: ${error.message}`);
  }
}

/**
 * Validate file type for thumbnails.
 *
 * @param {string} mimeType - File MIME type
 * @returns {boolean}
 */
export function isValidThumbnailType(mimeType) {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  return validTypes.includes(mimeType);
}

/**
 * Validate file type for videos.
 *
 * @param {string} mimeType - File MIME type
 * @returns {boolean}
 */
export function isValidVideoType(mimeType) {
  if (!mimeType) return false;
  const base = mimeType.split(';')[0].trim().toLowerCase();
  // Accept any video/* MIME type; incompatible formats are transcoded on playback
  return base.startsWith('video/') || base === 'application/x-matroska';
}

/**
 * Validate file size.
 *
 * @param {number} size - File size in bytes
 * @param {number} maxSize - Maximum size in bytes
 * @returns {boolean}
 */
export function isValidFileSize(size, maxSize) {
  return size > 0 && size <= maxSize;
}
