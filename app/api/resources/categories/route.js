import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { getUserRoles } from '@/app/_lib/data-service';
import { getResourceCategories } from '@/app/_lib/resources/queries';

export async function GET() {
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

  try {
    const categories = await getResourceCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to load categories.' },
      { status: 500 }
    );
  }
}
