/**
 * @file Video upload API endpoint for bootcamp lessons.
 * POST /api/admin/upload/video
 *
 * Supports two upload modes:
 * 1. Direct upload (files < 100MB): Send entire file in one request
 * 2. Chunked upload (files >= 100MB): Multiple requests with chunks
 *
 * Direct Upload (multipart/form-data):
 *   - file: Video file (mp4, webm, mov)
 *   - bootcampId: Bootcamp ID
 *   - lessonId: Lesson ID
 *
 * Chunked Upload (application/octet-stream):
 *   - First request: Initialize with query params
 *     ?action=init&bootcampId=xxx&lessonId=xxx&filename=xxx&mimeType=xxx&fileSize=xxx
 *   - Subsequent requests: Upload chunks
 *     ?action=chunk&uploadId=xxx&chunkIndex=xxx&totalChunks=xxx
 *   - Final request: Complete upload
 *     ?action=complete&uploadId=xxx
 *
 * Returns:
 *   - fileId: Google Drive file ID
 *   - filename: Original filename
 *   - size: File size in bytes
 *   - duration: Video duration in seconds (if available)
 *
 * Security:
 *   - Admin-only endpoint
 *   - File size limit: 2GB
 *   - File type validation: mp4, webm, mov
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/supabase';
import {
  uploadVideo,
  isValidVideoType,
  isValidFileSize,
} from '@/app/_lib/bootcamp-upload';

const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks

// In-memory store for chunked uploads (consider Redis for production)
const uploadSessions = new Map();

/**
 * Verify admin access
 */
async function verifyAdmin(supabase, user) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile && profile.role === 'admin';
}

/**
 * Handle direct upload (small files)
 */
async function handleDirectUpload(request, supabase) {
  const formData = await request.formData();
  const file = formData.get('file');
  const bootcampId = formData.get('bootcampId');
  const lessonId = formData.get('lessonId');

  if (!file || !bootcampId || !lessonId) {
    return NextResponse.json(
      { error: 'Missing required fields: file, bootcampId, lessonId' },
      { status: 400 }
    );
  }

  // Validate file type
  if (!isValidVideoType(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type. Allowed: mp4, webm, mov' },
      { status: 400 }
    );
  }

  // Validate file size
  if (!isValidFileSize(file.size, MAX_VIDEO_SIZE)) {
    return NextResponse.json(
      {
        error: `File size exceeds maximum of ${MAX_VIDEO_SIZE / (1024 * 1024 * 1024)}GB`,
      },
      { status: 400 }
    );
  }

  // Verify lesson exists
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('id, course_id')
    .eq('id', lessonId)
    .single();

  if (lessonError || !lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }

  // Verify course belongs to bootcamp
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, bootcamp_id')
    .eq('id', lesson.course_id)
    .eq('bootcamp_id', bootcampId)
    .single();

  if (courseError || !course) {
    return NextResponse.json(
      { error: 'Invalid bootcamp/course/lesson relationship' },
      { status: 400 }
    );
  }

  // Convert file to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to Google Drive
  const result = await uploadVideo(
    buffer,
    file.name,
    file.type,
    bootcampId,
    lessonId
  );

  // Update lesson with file metadata
  await supabase
    .from('lessons')
    .update({
      drive_file_id: result.fileId,
      filename: result.filename,
      file_size: result.size,
      duration: result.duration,
      upload_status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', lessonId);

  return NextResponse.json({
    success: true,
    data: {
      fileId: result.fileId,
      filename: result.filename,
      size: result.size,
      duration: result.duration,
    },
  });
}

/**
 * Initialize chunked upload session
 */
async function handleChunkInit(request, supabase) {
  const { searchParams } = new URL(request.url);
  const bootcampId = searchParams.get('bootcampId');
  const lessonId = searchParams.get('lessonId');
  const filename = searchParams.get('filename');
  const mimeType = searchParams.get('mimeType');
  const fileSize = parseInt(searchParams.get('fileSize'), 10);

  if (!bootcampId || !lessonId || !filename || !mimeType || !fileSize) {
    return NextResponse.json(
      { error: 'Missing required parameters for init' },
      { status: 400 }
    );
  }

  // Validate file type
  if (!isValidVideoType(mimeType)) {
    return NextResponse.json(
      { error: 'Invalid file type. Allowed: mp4, webm, mov' },
      { status: 400 }
    );
  }

  // Validate file size
  if (!isValidFileSize(fileSize, MAX_VIDEO_SIZE)) {
    return NextResponse.json(
      {
        error: `File size exceeds maximum of ${MAX_VIDEO_SIZE / (1024 * 1024 * 1024)}GB`,
      },
      { status: 400 }
    );
  }

  // Verify lesson exists
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('id, course_id')
    .eq('id', lessonId)
    .single();

  if (lessonError || !lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }

  // Verify course belongs to bootcamp
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, bootcamp_id')
    .eq('id', lesson.course_id)
    .eq('bootcamp_id', bootcampId)
    .single();

  if (courseError || !course) {
    return NextResponse.json(
      { error: 'Invalid bootcamp/course/lesson relationship' },
      { status: 400 }
    );
  }

  // Create upload session
  const uploadId = `${lessonId}_${Date.now()}`;
  const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

  uploadSessions.set(uploadId, {
    bootcampId,
    lessonId,
    filename,
    mimeType,
    fileSize,
    totalChunks,
    chunks: new Array(totalChunks),
    uploadedChunks: 0,
    createdAt: Date.now(),
  });

  // Update lesson status to uploading
  await supabase
    .from('lessons')
    .update({
      upload_status: 'uploading',
      updated_at: new Date().toISOString(),
    })
    .eq('id', lessonId);

  return NextResponse.json({
    success: true,
    data: {
      uploadId,
      chunkSize: CHUNK_SIZE,
      totalChunks,
    },
  });
}

/**
 * Handle chunk upload
 */
async function handleChunkUpload(request) {
  const { searchParams } = new URL(request.url);
  const uploadId = searchParams.get('uploadId');
  const chunkIndex = parseInt(searchParams.get('chunkIndex'), 10);
  const totalChunks = parseInt(searchParams.get('totalChunks'), 10);

  if (!uploadId || chunkIndex === undefined || !totalChunks) {
    return NextResponse.json(
      { error: 'Missing required parameters for chunk upload' },
      { status: 400 }
    );
  }

  const session = uploadSessions.get(uploadId);
  if (!session) {
    return NextResponse.json(
      { error: 'Upload session not found' },
      { status: 404 }
    );
  }

  // Read chunk data
  const arrayBuffer = await request.arrayBuffer();
  const chunk = Buffer.from(arrayBuffer);

  // Store chunk
  session.chunks[chunkIndex] = chunk;
  session.uploadedChunks++;

  return NextResponse.json({
    success: true,
    data: {
      uploadedChunks: session.uploadedChunks,
      totalChunks: session.totalChunks,
      progress: Math.round(
        (session.uploadedChunks / session.totalChunks) * 100
      ),
    },
  });
}

/**
 * Complete chunked upload
 */
async function handleChunkComplete(request, supabase) {
  const { searchParams } = new URL(request.url);
  const uploadId = searchParams.get('uploadId');

  if (!uploadId) {
    return NextResponse.json({ error: 'Missing uploadId' }, { status: 400 });
  }

  const session = uploadSessions.get(uploadId);
  if (!session) {
    return NextResponse.json(
      { error: 'Upload session not found' },
      { status: 404 }
    );
  }

  // Verify all chunks are uploaded
  if (session.uploadedChunks !== session.totalChunks) {
    return NextResponse.json(
      {
        error: `Missing chunks: ${session.uploadedChunks}/${session.totalChunks} uploaded`,
      },
      { status: 400 }
    );
  }

  // Combine chunks into single buffer
  const fileBuffer = Buffer.concat(session.chunks);

  // Upload to Google Drive
  const result = await uploadVideo(
    fileBuffer,
    session.filename,
    session.mimeType,
    session.bootcampId,
    session.lessonId
  );

  // Update lesson with file metadata
  await supabase
    .from('lessons')
    .update({
      drive_file_id: result.fileId,
      filename: result.filename,
      file_size: result.size,
      duration: result.duration,
      upload_status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.lessonId);

  // Clean up session
  uploadSessions.delete(uploadId);

  return NextResponse.json({
    success: true,
    data: {
      fileId: result.fileId,
      filename: result.filename,
      size: result.size,
      duration: result.duration,
    },
  });
}

export async function POST(request) {
  try {
    // Check authentication
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = await verifyAdmin(supabase, user);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Determine action type
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'init') {
      return await handleChunkInit(request, supabase);
    } else if (action === 'chunk') {
      return await handleChunkUpload(request);
    } else if (action === 'complete') {
      return await handleChunkComplete(request, supabase);
    } else {
      // Default: direct upload
      return await handleDirectUpload(request, supabase);
    }
  } catch (error) {
    console.error('Video upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload video' },
      { status: 500 }
    );
  }
}

// Clean up old upload sessions (runs periodically)
setInterval(
  () => {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [uploadId, session] of uploadSessions.entries()) {
      if (now - session.createdAt > maxAge) {
        uploadSessions.delete(uploadId);
      }
    }
  },
  60 * 60 * 1000
); // Run every hour
