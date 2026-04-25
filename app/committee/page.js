/**
 * @file Committee page - Professional redesign
 * Senior-level architecture with proper database schema alignment
 *
 * Data Structure:
 * - committee_members (user_id, position_id, bio, term_start, term_end, display_order)
 * - users (full_name, email, avatar_url, member_profiles[])
 * - committee_positions (title, category: advisor|executive|mentor, responsibilities)
 * - member_profiles (academic_session, department, github, linkedin, bio)
 *
 * @module CommitteePage
 */

import { getPublicCommittee } from '@/app/_lib/public-actions';
import CommitteeClient from './CommitteeClient';
import { buildMetadata } from '@/app/_lib/seo';
import { BreadcrumbJsonLd } from '@/app/_components/ui/JsonLd';

export const metadata = buildMetadata({
  title: 'Committee',
  description:
    'Meet the NEUPC executive committee, faculty advisor, and mentors who lead the Netrokona University Programming Club.',
  pathname: '/committee',
  keywords: [
    'executive committee',
    'club leadership',
    'advisor',
    'mentors',
    'team',
    'management',
  ],
});

// ============================================================================
// Data Transformation Layer
// ============================================================================

/**
 * Extract member profile data from nested user object.
 * member_profiles is an array in Supabase (one-to-many relationship).
 * We take the first (and typically only) profile entry.
 */
function extractMemberProfile(userObj) {
  if (!userObj || !userObj.member_profiles) {
    return null;
  }

  // Supabase may return one-to-one relations as an object or as a single-item array.
  if (!Array.isArray(userObj.member_profiles)) {
    return userObj.member_profiles;
  }

  if (userObj.member_profiles.length === 0) return null;

  const sortedProfiles = [...userObj.member_profiles].sort((a, b) => {
    const aTime = a?.updated_at ? Date.parse(a.updated_at) : 0;
    const bTime = b?.updated_at ? Date.parse(b.updated_at) : 0;
    return bTime - aTime;
  });

  return sortedProfiles[0] || null;
}

function extractAdvisorProfile(userObj) {
  if (!userObj || !userObj.advisor_profiles) {
    return null;
  }

  if (!Array.isArray(userObj.advisor_profiles)) {
    return userObj.advisor_profiles;
  }

  return userObj.advisor_profiles[0] || null;
}

/**
 * Format session label (e.g., "2024-2025" or "2024").
 * Falls back gracefully if dates are invalid.
 */
function getSessionLabel(member) {
  if (!member?.term_start) return '';

  try {
    const startYear = new Date(member.term_start).getFullYear();
    const endYear = member.term_end
      ? new Date(member.term_end).getFullYear()
      : startYear + 1;

    if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return '';
    if (endYear <= startYear) return `${startYear}`;

    return `${startYear}-${endYear}`;
  } catch {
    return '';
  }
}

function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
}

function extractLinkedinId(linkedinUrl) {
  if (!linkedinUrl || typeof linkedinUrl !== 'string') return '';
  try {
    const normalized = normalizeUrl(linkedinUrl);
    const parsed = new URL(normalized);
    const parts = parsed.pathname.split('/').filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : '';
  } catch {
    return '';
  }
}

function extractGithubId(githubUrl) {
  if (!githubUrl || typeof githubUrl !== 'string') return '';
  try {
    const normalized = normalizeUrl(githubUrl);
    const parsed = new URL(normalized);
    const parts = parsed.pathname.split('/').filter(Boolean);
    return parts.length > 0 ? parts[0] : '';
  } catch {
    return '';
  }
}

/**
 * Transform raw committee member data into display object.
 * Properly unpacks nested user profile data.
 */
function transformMemberData(member) {
  const user = member.users;
  const profile = extractMemberProfile(user);
  const advisorProfile = extractAdvisorProfile(user);
  const position = member.committee_positions;

  return {
    // Core identity
    id: member.id,
    userId: user?.id,
    name: user?.full_name || 'Unknown Member',
    email: user?.email || '',
    phone: user?.phone || '',
    avatar: user?.avatar_url || '/images/default-avatar.jpg',

    // Position & role info
    role: position?.title || '',
    category: position?.category || '',
    responsibilities: position?.responsibilities || '',
    rank: position?.rank ?? 99,
    displayOrder: position?.display_order ?? 999,

    // Academic info
    academicSession: profile?.academic_session || profile?.session || '',
    department: profile?.department || '',

    // Advisor profile info
    advisorPosition: advisorProfile?.position || '',
    advisorDepartment: advisorProfile?.department || '',

    // Biographical info
    bio: member.bio || profile?.bio || '',

    // Social links
    github: normalizeUrl(profile?.github || ''),
    linkedin: normalizeUrl(profile?.linkedin || ''),

    // Tenure info
    termStart: member.term_start,
    termEnd: member.term_end,
    termSession: getSessionLabel(member),
    isCurrent: member.is_current === true,
  };
}

function compareMemberOrder(a, b) {
  return (
    (a.rank ?? 99) - (b.rank ?? 99) ||
    (a.displayOrder ?? 999) - (b.displayOrder ?? 999) ||
    a.name.localeCompare(b.name)
  );
}

/**
 * Classify committee members by category + rank using business rules:
 * - advisor + rank 1 => advisors
 * - executive + rank 2 => core executives
 * - executive + rank 3 => general executives
 */
function classifyMembers(transformedMembers) {
  const classified = {
    advisors: [],
    coreExecutives: [],
    generalExecutives: [],
    mentors: [],
  };

  transformedMembers.forEach((member) => {
    if (member.category === 'advisor' && member.rank === 1) {
      classified.advisors.push(member);
      return;
    }

    if (member.category === 'executive' && member.rank === 2) {
      classified.coreExecutives.push(member);
      return;
    }

    if (member.category === 'executive' && member.rank === 3) {
      classified.generalExecutives.push(member);
      return;
    }

    if (member.category === 'mentor') {
      classified.mentors.push(member);
    }
  });

  Object.keys(classified).forEach((key) => {
    classified[key].sort(compareMemberOrder);
  });

  return classified;
}

/**
 * Extract all faculty advisors from sorted advisor list.
 */
function extractFacultyAdvisors(advisorMembers) {
  return advisorMembers.map((advisor) => ({
    id: advisor.id,
    name: advisor.name,
    position: advisor.advisorPosition || advisor.role || 'Faculty Advisor',
    designation: advisor.role || 'Faculty Advisor',
    department: advisor.advisorDepartment || '',
    university: 'Netrokona University',
    image: advisor.avatar,
    message: advisor.bio,
    linkedin: advisor.linkedin,
    github: advisor.github,
  }));
}

/**
 * Build core executives section from category=executive and rank=2.
 */
function extractCoreExecutives(executiveMembers) {
  return executiveMembers.map((member) => ({
    id: member.id,
    name: member.name,
    role: member.role,
    department: member.department,
    academicSession: member.academicSession,
    termSession: member.termSession,
    image: member.avatar,
    bio: member.bio,
    quote: member.bio || 'Dedicated to serving the club with integrity.',
    linkedin: member.linkedin,
    linkedinId: extractLinkedinId(member.linkedin),
    github: member.github,
    githubId: extractGithubId(member.github),
    email: member.email,
    phone: member.phone,
    responsibility: member.responsibilities,
    achievements: [],
  }));
}

/**
 * Build general executive members from category=executive and rank=3.
 */
function extractExecutiveMembers(executiveMembers) {
  return executiveMembers.map((member) => ({
    id: member.id,
    name: member.name,
    role: member.role,
    department: member.department,
    academicSession: member.academicSession,
    termSession: member.termSession,
    image: member.avatar,
    bio: member.bio,
    quote: member.bio || 'Dedicated to serving the club with integrity.',
    linkedin: member.linkedin,
    linkedinId: extractLinkedinId(member.linkedin),
    github: member.github,
    githubId: extractGithubId(member.github),
    email: member.email,
    phone: member.phone,
    responsibility: member.responsibilities,
    achievements: [],
  }));
}

/**
 * Build hero statistics.
 */
function buildHeroStats(members, positions) {
  // Count unique departments from member_profiles
  const departmentSet = new Set();
  members.forEach((member) => {
    if (member.department) {
      departmentSet.add(member.department);
    }
  });

  const currentYear = new Date().getFullYear();
  const activeSessions = members
    .map((member) => member.termSession)
    .filter(Boolean)
    .filter((session) => session.includes(String(currentYear)));

  // Shorten "2025-2026" → "2025-26" so it fits in the stat card without wrapping
  function shortenTerm(label) {
    if (!label) return String(currentYear);
    const match = label.match(/^(\d{4})-(\d{4})$/);
    if (match) {
      return `${match[1]}-${match[2].slice(2)}`;
    }
    return label;
  }

  const termLabel = shortenTerm(activeSessions[0]) || String(currentYear);

  return [
    {
      value: String(members.length),
      label: 'Committee Members',
      accent: 'primary',
    },
    {
      value: String(departmentSet.size || positions.length),
      label: departmentSet.size > 0 ? 'Departments' : 'Roles',
      accent: 'secondary',
    },
    {
      value: termLabel,
      label: 'Current Term',
      accent: 'purple',
    },
  ];
}

// ============================================================================
// Main Page Component
// ============================================================================

export default async function Page() {
  const { members, positions } = await getPublicCommittee();

  console.log('[Committee] member count:', members.length);
  if (members.length > 0) {
    const m = members[0];
    console.log('[Committee] first raw member keys:', Object.keys(m));
    console.log('[Committee] users field:', JSON.stringify(m.users));
    console.log('[Committee] user_id field:', m.user_id);
  }

  // Transform raw data into display format
  const transformedMembers = members.map(transformMemberData);

  // Classify using category + rank business rules
  const classified = classifyMembers(transformedMembers);

  // Extract structured sections
  const facultyAdvisors = extractFacultyAdvisors(classified.advisors);
  const coreExecutives = extractCoreExecutives(classified.coreExecutives);
  const executiveMembers = extractExecutiveMembers(
    classified.generalExecutives
  );

  // Build UI stats
  const heroStats = buildHeroStats(transformedMembers, positions);

  return (
    <>
      <BreadcrumbJsonLd
        items={[{ name: 'Home', url: '/' }, { name: 'Committee' }]}
      />
      <CommitteeClient
        facultyAdvisors={facultyAdvisors}
        coreExecutives={coreExecutives}
        executiveMembers={executiveMembers}
        heroStats={heroStats}
      />
    </>
  );
}
