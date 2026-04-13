import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { getUserRoles } from '@/app/_lib/data-service';
import { getPublishedResources } from '@/app/_lib/resources/queries';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1) || 1;
  const pageSize = Number(searchParams.get('pageSize') || 12) || 12;
  const q = searchParams.get('q') || '';
  const type = searchParams.get('type') || '';
  const categoryId = searchParams.get('categoryId') || '';
  const tag = searchParams.get('tag') || '';

  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 }
    );
  }

  const roles = await getUserRoles(email).catch(() => []);
  if (!roles.length) {
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
  }

  const includeMembers = roles.some((role) =>
    ['member', 'executive', 'admin', 'mentor', 'advisor'].includes(role)
  );

  try {
    const result = await getPublishedResources({
      page,
      pageSize,
      q,
      type,
      categoryId,
      tagSlug: tag,
      includeMembers,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch resources.' },
      { status: 500 }
    );
  }
}
