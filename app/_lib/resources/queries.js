import 'server-only';

import { supabase, supabaseAdmin } from '@/app/_lib/supabase';

function mapResourceRow(row) {
  const tags = (row.resource_tag_map || [])
    .map((m) => m.resource_tags)
    .filter(Boolean);

  return {
    ...row,
    category: row.resource_categories || null,
    tags,
  };
}

function baseSelect() {
  return `
    id,
    title,
    description,
    resource_type,
    content,
    embed_url,
    file_url,
    thumbnail,
    category_id,
    visibility,
    status,
    is_pinned,
    published_at,
    scheduled_for,
    created_by,
    created_at,
    updated_at,
    resource_categories(id,name,slug,description),
    resource_tag_map(tag_id,resource_tags(id,name,slug))
  `;
}

export async function getResourceCategories() {
  const { data, error } = await supabaseAdmin
    .from('resource_categories')
    .select('id,name,slug,description')
    .order('name', { ascending: true });

  if (error) return [];
  return data || [];
}

export async function getResourceTags() {
  const { data, error } = await supabaseAdmin
    .from('resource_tags')
    .select('id,name,slug')
    .order('name', { ascending: true });

  if (error) return [];
  return data || [];
}

export async function getAdminResources({
  page = 1,
  // The admin UI loads all records client-side for filtering/stat counts.
  // A high default avoids silently truncating the dataset until server-side
  // pagination controls are added to the admin page.
  pageSize = 200,
  q = '',
  type = '',
  categoryId = '',
} = {}) {
  const offset = (Math.max(page, 1) - 1) * pageSize;

  let query = supabaseAdmin
    .from('resources')
    .select(
      `${baseSelect()}, users!resources_created_by_fkey(id,full_name,avatar_url)`,
      { count: 'exact' }
    )
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (q) {
    const safe = q.replace(/,/g, ' ').trim();
    query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
  }
  if (type) query = query.eq('resource_type', type);
  if (categoryId) query = query.eq('category_id', categoryId);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    resources: (data || []).map(mapResourceRow),
    total: count || 0,
    page,
    pageSize,
  };
}

export async function getPublishedResources({
  page = 1,
  pageSize = 12,
  q = '',
  type = '',
  categoryId = '',
  tagSlug = '',
  includeMembers = false,
  visibility = '',
} = {}) {
  const offset = (Math.max(page, 1) - 1) * pageSize;
  const nowIso = new Date().toISOString();

  // Use admin client so dashboard/API access does not depend on anon RLS.
  // Visibility is still enforced below via `includeMembers`/`visibility`.
  let query = supabaseAdmin
    .from('resources')
    .select(baseSelect(), { count: 'exact' })
    .eq('status', 'published')
    .or(`published_at.is.null,published_at.lte.${nowIso}`)
    .order('is_pinned', { ascending: false })
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (!includeMembers) {
    query = query.eq('visibility', 'public');
  }

  if (visibility === 'public' || visibility === 'members') {
    query = query.eq('visibility', visibility);
  }

  if (q) {
    const safe = q.replace(/,/g, ' ').trim();
    query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
  }
  if (type) query = query.eq('resource_type', type);
  if (categoryId) query = query.eq('category_id', categoryId);

  if (tagSlug) {
    const { data: tagRows } = await supabaseAdmin
      .from('resource_tag_map')
      .select('resource_id, resource_tags!inner(slug)')
      .eq('resource_tags.slug', tagSlug);

    const ids = [...new Set((tagRows || []).map((r) => r.resource_id))];
    if (!ids.length) {
      return { resources: [], total: 0, page, pageSize };
    }
    query = query.in('id', ids);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    resources: (data || []).map(mapResourceRow),
    total: count || 0,
    page,
    pageSize,
  };
}

export async function getResourceById(id, { includeMembers = false } = {}) {
  const nowIso = new Date().toISOString();

  // Use admin client so dashboard/API access does not depend on anon RLS.
  // Visibility is still enforced below via `includeMembers`.
  let query = supabaseAdmin
    .from('resources')
    .select(baseSelect())
    .eq('id', id)
    .eq('status', 'published')
    .or(`published_at.is.null,published_at.lte.${nowIso}`)
    .single();

  if (!includeMembers) {
    query = query.eq('visibility', 'public');
  }

  const { data, error } = await query;
  if (error) return null;
  return mapResourceRow(data);
}

export async function getAdminResourceById(id) {
  const { data, error } = await supabaseAdmin
    .from('resources')
    .select(
      `${baseSelect()}, users!resources_created_by_fkey(id,full_name,avatar_url)`
    )
    .eq('id', id)
    .single();

  if (error) return null;
  return mapResourceRow(data);
}

export async function getBookmarkedResourceIds(userId, resourceIds) {
  if (!userId || !resourceIds?.length) return [];

  const { data, error } = await supabaseAdmin
    .from('resource_bookmarks')
    .select('resource_id')
    .eq('user_id', userId)
    .in('resource_id', resourceIds);

  if (error) return [];
  return (data || []).map((r) => r.resource_id);
}
