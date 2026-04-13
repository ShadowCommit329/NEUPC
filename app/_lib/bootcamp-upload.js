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

/**
 * Get or create the Google Drive client using Service Account credentials.
 * Uses write scope for uploads.
 */
function getDriveClient() {
  if (_driveClient) return _driveClient;

  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const serviceKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!serviceEmail || !serviceKey) {
    throw new Error(
      'Missing Google Service Account credentials. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_KEY in env.'
    );
  }

  const privateKey = serviceKey.replace(/\\n/g, '\n');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: serviceEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

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

  // Search for existing folder
  const response = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id;
  }

  // Create root folder if it doesn't exist
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
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
async function getOrCreateFolder(parentId, folderName) {
  const drive = getDriveClient();

  // Search for existing folder
  const response = await drive.files.list({
    q: `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
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

    return {
      fileId: response.data.id,
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
  const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  return validTypes.includes(mimeType);
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
