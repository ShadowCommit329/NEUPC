/**
 * @file Video streaming API route for bootcamp lessons.
 * @module api/video/[lessonId]
 *
 * Securely streams videos from Google Drive through our server.
 * Supports HTTP Range requests for seeking and partial content.
 *
 * Security:
 * - Validates user enrollment before streaming
 * - Never exposes direct Google Drive URLs
 * - Free preview lessons are accessible without enrollment
 *
 * TODO: Consider adding rate limiting for production
 * (e.g., using Upstash rate limit or similar)
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { streamVideo } from '@/app/_lib/bootcamp-video';
import { getYouTubeEmbedUrl } from '@/app/_lib/utils';

/**
 * Check if user has access to the lesson.
 */
/**
 * Check if user has access to the lesson.
 */
async function canAccessLesson(lessonId, userEmail) {
  let isAdmin = false;
  let isMember = false;
  let user = null;

  if (userEmail) {
    const { data } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();
    
    user = data;

    if (user) {
      const { data: roles } = await supabaseAdmin
        .from('user_roles')
        .select('roles(name)')
        .eq('user_id', user.id);
      isAdmin = roles?.some((r) => r.roles?.name === 'admin');
      isMember = roles?.some((r) => r.roles?.name === 'member');
    }
  }

  // Determine if lessonId is a valid UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lessonId);

  let lesson = null;
  if (isUuid) {
    const { data } = await supabaseAdmin
      .from('lessons')
      .select(
        `
        id,
        video_source,
        video_id,
        video_url,
        is_free_preview,
        is_published,
        modules (
          is_published,
          courses (
            is_published,
            bootcamps (
              id,
              status
            )
          )
        )
      `
      )
      .eq('id', lessonId)
      .single();
    
    lesson = data;
  }

  // Admins bypass all checks (enrollment, published status, even existence if previewing)
  if (isAdmin) {
    return { allowed: true, lesson: lesson || {}, isAdmin: true };
  }

  if (!lesson) {
    return { allowed: false, reason: 'Lesson not found', isAdmin: false };
  }

  // Check if lesson/module/course/bootcamp are published
  if (!lesson.is_published) {
    return { allowed: false, reason: 'Lesson not published', isAdmin: false };
  }

  const mod = lesson.modules;
  const course = mod?.courses;
  const bootcamp = course?.bootcamps;

  if (!mod?.is_published || !course?.is_published) {
    return { allowed: false, reason: 'Content not published', isAdmin: false };
  }

  if (bootcamp?.status !== 'published') {
    return { allowed: false, reason: 'Bootcamp not published', isAdmin: false };
  }

  // Free preview lessons are accessible to everyone
  if (lesson.is_free_preview) {
    return { allowed: true, lesson, isAdmin: false };
  }

  // Check user authentication
  if (!user) {
    return { allowed: false, reason: 'Authentication required', isAdmin: false };
  }

  // Check member role
  if (!isMember) {
    return { allowed: false, reason: 'Member role required', isAdmin: false };
  }

  // Check enrollment
  const { data: enrollment } = await supabaseAdmin
    .from('enrollments')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('bootcamp_id', bootcamp.id)
    .single();

  if (!enrollment || enrollment.status !== 'active') {
    return { allowed: false, reason: 'Not enrolled in this bootcamp', isAdmin: false };
  }

  return { allowed: true, lesson, isAdmin: false };
}

/**
 * GET /api/video/[lessonId]
 *
 * Stream video content for a lesson.
 * Supports Range requests for video seeking.
 */
export async function GET(request, { params }) {
  try {
    const { lessonId } = await params;
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    // Get user session
    const session = await auth();
    const userEmail = session?.user?.email || null;

    // Check access
    const access = await canAccessLesson(lessonId, userEmail);

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.reason },
        { status: access.reason === 'Authentication required' ? 401 : 403 }
      );
    }

    const lesson = access.lesson;

    // Determine target video ID
    // SECURITY: Only allow explicit fileId overrides for admins previewing content.
    // Regular users MUST only see the video specifically attached to the lesson they have access to.
    const targetVideoId = access.isAdmin ? (fileId || lesson.video_id) : lesson.video_id;

    if (!targetVideoId) {
      return NextResponse.json(
        { error: 'No video configured' },
        { status: 404 }
      );
    }

    // Handle different video sources
    // Note: If fileId is provided by an admin, we assume it's a Drive video.
    const videoSource = (access.isAdmin && fileId) ? 'drive' : (lesson.video_source || 'none');

    switch (videoSource) {
      case 'drive': {
        // Get Range header for partial content
        const rangeHeader = request.headers.get('range');

        try {
          const { stream, headers, status } = await streamVideo(
            targetVideoId,
            rangeHeader
          );

          // Create response with stream
          const response = new NextResponse(stream, { status });

          // Set headers
          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, String(value));
          });

          // Security headers to prevent video download/embedding elsewhere
          response.headers.set('X-Content-Type-Options', 'nosniff');
          response.headers.set(
            'Content-Disposition',
            'inline; filename="video.mp4"'
          );

          return response;
        } catch (err) {
          console.error('Video streaming error:', err);
          return NextResponse.json(
            { error: 'Failed to stream video' },
            { status: 500 }
          );
        }
      }

      case 'youtube': {
        // For YouTube, return the embed URL (client handles embedding)
        const embedUrl = getYouTubeEmbedUrl(
          lesson.video_id || lesson.video_url
        );
        if (!embedUrl) {
          return NextResponse.json(
            { error: 'Invalid YouTube video' },
            { status: 400 }
          );
        }
        return NextResponse.json({ type: 'youtube', embedUrl });
      }

      case 'upload': {
        // For uploaded videos, redirect to the stored URL
        if (!lesson.video_url) {
          return NextResponse.json(
            { error: 'No video configured' },
            { status: 404 }
          );
        }
        return NextResponse.redirect(lesson.video_url);
      }

      case 'none':
      default:
        return NextResponse.json(
          { error: 'This lesson has no video content' },
          { status: 404 }
        );
    }
  } catch (err) {
    console.error('Video API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * HEAD /api/video/[lessonId]
 *
 * Return video metadata without streaming content.
 * Used by video players to determine file size and support.
 */
export async function HEAD(request, { params }) {
  try {
    const { lessonId } = await params;

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    const session = await auth();
    const userEmail = session?.user?.email || null;

    const access = await canAccessLesson(lessonId, userEmail);

    if (!access.allowed) {
      return new NextResponse(null, { status: 403 });
    }

    const lesson = access.lesson;
    const targetVideoId = access.isAdmin ? (fileId || lesson.video_id) : lesson.video_id;
    const videoSource = (access.isAdmin && fileId) ? 'drive' : (lesson.video_source || 'none');

    if (videoSource === 'drive' && targetVideoId) {
      const { getFileMetadata } = await import('@/app/_lib/bootcamp-video');
      const metadata = await getFileMetadata(targetVideoId);

      return new NextResponse(null, {
        status: 200,
        headers: {
          'Content-Type': metadata.mimeType || 'video/mp4',
          'Content-Length': String(metadata.size),
          'Accept-Ranges': 'bytes',
        },
      });
    }

    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}

