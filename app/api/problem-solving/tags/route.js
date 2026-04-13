/**
 * Problem Tags Management API
 * GET /api/problem-solving/tags - Get all available tags or tags for a problem
 * POST /api/problem-solving/tags - Add a tag to a problem
 * DELETE /api/problem-solving/tags - Remove a tag from a problem
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { getCachedUserByEmail } from '@/app/_lib/data-service';
import {
  V2_TABLES,
  getPlatformId,
} from '@/app/_lib/problem-solving-v2-helpers';

function normalizeTagLabel(value) {
  return (value || '').toString().trim().toLowerCase();
}

function toTagCode(value) {
  return normalizeTagLabel(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const problemId = searchParams.get('problemId');
    const platform = searchParams.get('platform');

    // If no problemId, return all available tags
    if (!problemId) {
      const { data: tags, error } = await supabaseAdmin
        .from(V2_TABLES.TAGS)
        .select('id, code, name, category')
        .order('category')
        .order('display_order');

      if (error) {
        throw error;
      }

      // Group tags by category
      const tagsByCategory = {};
      (tags || []).forEach((tag) => {
        const category = tag.category || 'other';
        if (!tagsByCategory[category]) {
          tagsByCategory[category] = [];
        }
        tagsByCategory[category].push(tag);
      });

      return NextResponse.json({
        success: true,
        tags: tags || [],
        tagsByCategory,
      });
    }

    // Get tags for a specific problem
    if (!platform) {
      return NextResponse.json(
        { error: 'Platform required when querying problem tags' },
        { status: 400 }
      );
    }

    const platformId = await getPlatformId(platform);
    if (!platformId) {
      return NextResponse.json(
        { error: `Unknown platform: ${platform}` },
        { status: 400 }
      );
    }

    // Get the problem
    const { data: problem, error: problemError } = await supabaseAdmin
      .from(V2_TABLES.PROBLEMS)
      .select('id')
      .eq('platform_id', platformId)
      .eq('external_id', problemId)
      .single();

    if (problemError || !problem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    // Get tags for this problem
    const { data: problemTags, error: tagsError } = await supabaseAdmin
      .from(V2_TABLES.PROBLEM_TAGS)
      .select(
        `
        source,
        confidence,
        tags!inner(id, code, name, category)
      `
      )
      .eq('problem_id', problem.id);

    if (tagsError) {
      throw tagsError;
    }

    // Separate by source
    const originalTags = [];
    const aiTags = [];
    const manualTags = [];

    (problemTags || []).forEach((pt) => {
      const tagInfo = {
        id: pt.tags.id,
        code: pt.tags.code,
        name: pt.tags.name,
        category: pt.tags.category,
        confidence: pt.confidence,
      };

      switch (pt.source) {
        case 'platform':
          originalTags.push(tagInfo);
          break;
        case 'ai':
          aiTags.push(tagInfo);
          break;
        case 'manual':
          manualTags.push(tagInfo);
          break;
      }
    });

    return NextResponse.json({
      success: true,
      tags: {
        all: [...originalTags, ...aiTags, ...manualTags],
        original: originalTags,
        aiGenerated: aiTags,
        manual: manualTags,
      },
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await getCachedUserByEmail(session.user.email);
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const problemId = body.problemId || body.problem_id;
    const platform = body.platform || 'codeforces';
    const rawTagValue = body.tagCode || body.tag;
    const tagCode = toTagCode(rawTagValue);
    const tagName = normalizeTagLabel(rawTagValue);

    if (!problemId || !tagCode) {
      return NextResponse.json(
        { error: 'problemId and tag/tagCode are required' },
        { status: 400 }
      );
    }

    const platformId = await getPlatformId(platform);
    if (!platformId) {
      return NextResponse.json(
        { error: `Unknown platform: ${platform}` },
        { status: 400 }
      );
    }

    // Get the problem
    const { data: problem, error: problemError } = await supabaseAdmin
      .from(V2_TABLES.PROBLEMS)
      .select('id')
      .eq('platform_id', platformId)
      .eq('external_id', problemId)
      .single();

    if (problemError || !problem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    // Get or create the tag
    let tag = null;

    const { data: existingTag, error: existingTagError } = await supabaseAdmin
      .from(V2_TABLES.TAGS)
      .select('id, code, name')
      .eq('code', tagCode)
      .maybeSingle();

    if (existingTagError) {
      throw existingTagError;
    }

    if (existingTag) {
      tag = existingTag;
    } else {
      const { data: createdTag, error: createTagError } = await supabaseAdmin
        .from(V2_TABLES.TAGS)
        .insert({
          code: tagCode,
          name: tagName || tagCode,
          category: 'manual',
        })
        .select('id, code, name')
        .single();

      if (createTagError) {
        // Handle race where another request created the same tag code
        if (createTagError.code === '23505') {
          const { data: racedTag, error: racedTagError } = await supabaseAdmin
            .from(V2_TABLES.TAGS)
            .select('id, code, name')
            .eq('code', tagCode)
            .maybeSingle();

          if (racedTagError || !racedTag) {
            throw racedTagError || createTagError;
          }

          tag = racedTag;
        } else {
          throw createTagError;
        }
      } else {
        tag = createdTag;
      }
    }

    // Check if tag already exists for this problem
    const { data: existing, error: existingError } = await supabaseAdmin
      .from(V2_TABLES.PROBLEM_TAGS)
      .select('problem_id')
      .eq('problem_id', problem.id)
      .eq('tag_id', tag.id)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Tag already exists on this problem',
      });
    }

    // Add the tag
    const { error: insertError } = await supabaseAdmin
      .from(V2_TABLES.PROBLEM_TAGS)
      .insert({
        problem_id: problem.id,
        tag_id: tag.id,
        source: 'manual',
      });

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      message: 'Tag added successfully',
      tag: { code: tag.code, name: tag.name },
    });
  } catch (error) {
    console.error('Error adding tag:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add tag' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const problemId =
      searchParams.get('problemId') || searchParams.get('problem_id');
    const platform = searchParams.get('platform') || 'codeforces';
    const tagCode = toTagCode(
      searchParams.get('tagCode') || searchParams.get('tag')
    );

    if (!problemId || !tagCode) {
      return NextResponse.json(
        { error: 'problemId and tag/tagCode are required' },
        { status: 400 }
      );
    }

    const platformId = await getPlatformId(platform);
    if (!platformId) {
      return NextResponse.json(
        { error: `Unknown platform: ${platform}` },
        { status: 400 }
      );
    }

    // Get the problem
    const { data: problem } = await supabaseAdmin
      .from(V2_TABLES.PROBLEMS)
      .select('id')
      .eq('platform_id', platformId)
      .eq('external_id', problemId)
      .single();

    if (!problem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    // Get the tag
    const { data: tag } = await supabaseAdmin
      .from(V2_TABLES.TAGS)
      .select('id')
      .eq('code', tagCode)
      .maybeSingle();

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Only allow removing manual tags
    const { error: deleteError } = await supabaseAdmin
      .from(V2_TABLES.PROBLEM_TAGS)
      .delete()
      .eq('problem_id', problem.id)
      .eq('tag_id', tag.id)
      .eq('source', 'manual');

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: 'Tag removed successfully',
    });
  } catch (error) {
    console.error('Error removing tag:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove tag' },
      { status: 500 }
    );
  }
}
