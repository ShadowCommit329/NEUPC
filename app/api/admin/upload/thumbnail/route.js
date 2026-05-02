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
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { requireApiAuth, isAuthError } from '@/app/_lib/api-guard';
import {
  uploadThumbnail,
  isValidThumbnailType,
  isValidFileSize,
} from '@/app/_lib/bootcamp-upload';

const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request) {
  try {
    const authResult = await requireApiAuth('admin');
    if (isAuthError(authResult)) return authResult;

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

    // Verify bootcamp exists
    const { data: bootcamp, error: bootcampError } = await supabaseAdmin
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

    const thumbnailUrl = `/api/image/${result.fileId}`;

    // Save thumbnail URL to bootcamp record
    await supabaseAdmin
      .from('bootcamps')
      .update({ thumbnail: thumbnailUrl })
      .eq('id', bootcampId);

    revalidatePath('/account/admin/bootcamps');
    revalidatePath(`/account/admin/bootcamps/${bootcampId}`);
    revalidatePath('/account/member/bootcamps');
    revalidatePath(`/account/member/bootcamps/${bootcampId}`);

    return NextResponse.json({
      success: true,
      data: {
        fileId: result.fileId,
        filename: result.filename,
        size: result.size,
        url: thumbnailUrl,
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
