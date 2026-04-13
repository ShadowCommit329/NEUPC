import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { getUserRoles } from '@/app/_lib/data-service';
import { getResourceById } from '@/app/_lib/resources/queries';

export async function GET(_request, { params }) {
  const id = params?.id;
  if (!id) {
    return NextResponse.json(
      { error: 'Resource id is required.' },
      { status: 400 }
    );
  }

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

  const resource = await getResourceById(id, { includeMembers });
  if (!resource) {
    return NextResponse.json({ error: 'Resource not found.' }, { status: 404 });
  }

  return NextResponse.json(resource);
}
