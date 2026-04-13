/**
 * @file Google Drive video streaming service for bootcamp lessons.
 * @module bootcamp-video
 *
 * Uses a Service Account for server-side video access (no user OAuth flow).
 * Videos are streamed through our API to prevent direct Drive URL exposure.
 *
 * Required env vars:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL  – Service account email
 *   GOOGLE_SERVICE_ACCOUNT_KEY    – Service account private key (with \n for newlines)
 *
 * Setup:
 *   1. Create a Service Account in Google Cloud Console
 *   2. Download the JSON key file
 *   3. Share your Drive folder with the service account email
 *   4. Set the env vars from the JSON key file
 */

import { google } from 'googleapis';

let _driveClient = null;

/**
 * Get or create the Google Drive client using Service Account credentials.
 * This is cached for the lifetime of the process.
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

  // Replace escaped newlines with actual newlines (env vars often escape them)
  const privateKey = serviceKey.replace(/\\n/g, '\n');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: serviceEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  _driveClient = google.drive({ version: 'v3', auth });
  return _driveClient;
}

/**
 * Get file metadata from Google Drive.
 *
 * @param {string} fileId - The Google Drive file ID
 * @returns {Promise<{name: string, mimeType: string, size: number}>}
 */
export async function getFileMetadata(fileId) {
  try {
    const drive = getDriveClient();
    const response = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, videoMediaMetadata',
    });

    return {
      id: response.data.id,
      name: response.data.name,
      mimeType: response.data.mimeType,
      size: parseInt(response.data.size, 10),
      duration: response.data.videoMediaMetadata?.durationMillis
        ? Math.round(response.data.videoMediaMetadata.durationMillis / 1000)
        : null,
    };
  } catch (err) {
    if (err.code === 404 || err.status === 404) {
      throw new Error(`File not found: ${fileId}`);
    }
    throw err;
  }
}

/**
 * Stream a video file from Google Drive with support for HTTP Range requests.
 * This enables seeking and partial content delivery for video players.
 *
 * @param {string} fileId - The Google Drive file ID
 * @param {string} rangeHeader - The HTTP Range header value (e.g., "bytes=0-1000")
 * @returns {Promise<{stream: ReadableStream, headers: Object, status: number}>}
 */
export async function streamVideo(fileId, rangeHeader = null) {
  if (!fileId || typeof fileId !== 'string') {
    throw new Error('Invalid file ID');
  }

  const drive = getDriveClient();

  // First, get file metadata for size and content type
  const metadata = await getFileMetadata(fileId);
  const fileSize = metadata.size;
  const contentType = metadata.mimeType || 'video/mp4';

  // Parse range header if present
  let start = 0;
  let end = fileSize - 1;
  let status = 200;
  const headers = {};

  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
    if (match) {
      start = match[1] ? parseInt(match[1], 10) : 0;
      end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

      // Limit chunk size to 5MB for better streaming
      const maxChunkSize = 5 * 1024 * 1024;
      if (end - start + 1 > maxChunkSize) {
        end = start + maxChunkSize - 1;
      }

      status = 206; // Partial Content
      headers['Content-Range'] = `bytes ${start}-${end}/${fileSize}`;
    }
  }

  headers['Content-Type'] = contentType;
  headers['Content-Length'] = end - start + 1;
  headers['Accept-Ranges'] = 'bytes';
  headers['Cache-Control'] = 'private, max-age=3600';

  // Get the video stream with range
  const response = await drive.files.get(
    {
      fileId,
      alt: 'media',
    },
    {
      responseType: 'stream',
      headers: rangeHeader ? { Range: `bytes=${start}-${end}` } : {},
    }
  );

  return {
    stream: response.data,
    headers,
    status,
  };
}

/**
 * Check if the service account has access to a file.
 *
 * @param {string} fileId - The Google Drive file ID
 * @returns {Promise<boolean>}
 */
export async function canAccessFile(fileId) {
  try {
    await getFileMetadata(fileId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract video ID from various Google Drive URL formats.
 *
 * Supported formats:
 * - https://drive.google.com/file/d/{fileId}/view
 * - https://drive.google.com/open?id={fileId}
 * - https://drive.google.com/uc?id={fileId}
 * - Plain file ID
 *
 * @param {string} input - Drive URL or file ID
 * @returns {string|null} - Extracted file ID or null if invalid
 */
export function extractDriveFileId(input) {
  if (!input) return null;

  // Already a plain ID (44 chars, alphanumeric with dashes/underscores)
  if (/^[\w-]{25,}$/.test(input)) {
    return input;
  }

  // Try to extract from URL
  const patterns = [/\/file\/d\/([^/]+)/, /[?&]id=([^&]+)/, /\/d\/([^/]+)/];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Get a YouTube embed URL from various YouTube URL formats.
 *
 * @param {string} input - YouTube URL or video ID
 * @returns {string|null} - YouTube embed URL or null if invalid
 */
export function getYouTubeEmbedUrl(input) {
  if (!input) return null;

  // Extract video ID from various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Plain video ID
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }

  return null;
}

/**
 * Format duration in seconds to human-readable string.
 *
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Formatted duration (e.g., "1h 23m", "45m", "3m 20s")
 */
export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0m';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return secs > 0 && minutes < 10 ? `${minutes}m ${secs}s` : `${minutes}m`;
  }
  return `${secs}s`;
}

/**
 * Format duration for display in lesson list (compact).
 *
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Compact duration (e.g., "1:23:45", "23:45", "3:20")
 */
export function formatDurationCompact(seconds) {
  if (!seconds || seconds <= 0) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}
