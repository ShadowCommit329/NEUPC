/**
 * @file Thumbnail upload API endpoint for bootcamp content.
 * POST /api/admin/upload/thumbnail
 *
 * Accepts multipart/form-data with:
 *   - file: Image file (jpg, png, webp)
 *   - bootcampId: Bootcamp ID
 *
 * Returns:
 *   - fileId: Google Drive file ID
 *   - filename: Original filename
 *   - size: File size in bytes
 *   - url: Preview URL (optional)
 *
 * Security:
 *   - Admin-only endpoint (checks user role)
 *   - File size limit: 5MB
 *   - File type validation: jpg, png, webp
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/supabase';
import {
  uploadThumbnail,
  isValidThumbnailType,
  isValidFileSize,
} from '@/app/_lib/bootcamp-upload';

const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024; // 5MB

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
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file');
    const bootcampId = formData.get('bootcampId');

    if (!file || !bootcampId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, bootcampId' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!isValidThumbnailType(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: jpg, png, webp' },
        { status: 400 }
      );
    }

    // Validate file size
    if (!isValidFileSize(file.size, MAX_THUMBNAIL_SIZE)) {
      return NextResponse.json(
        {
          error: `File size exceeds maximum of ${MAX_THUMBNAIL_SIZE / (1024 * 1024)}MB`,
        },
        { status: 400 }
      );
    }

    // Verify bootcamp exists and user has access
    const { data: bootcamp, error: bootcampError } = await supabase
      .from('bootcamps')
      .select('id')
      .eq('id', bootcampId)
      .single();

    if (bootcampError || !bootcamp) {
      return NextResponse.json(
        { error: 'Bootcamp not found' },
        { status: 404 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Google Drive
    const result = await uploadThumbnail(
      buffer,
      file.name,
      file.type,
      bootcampId
    );

    return NextResponse.json({
      success: true,
      data: {
        fileId: result.fileId,
        filename: result.filename,
        size: result.size,
      },
    });
  } catch (error) {
    console.error('Thumbnail upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload thumbnail' },
      { status: 500 }
    );
  }
}
