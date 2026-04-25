/**
 * @file data service
 * @module data-service
 */

import { supabase, supabaseAdmin, isSupabaseConfigured } from './supabase';

// Log activity to activity_logs.
async function _log(userId, action, entityType, entityId, details = {}) {
  try {
    await supabaseAdmin.from('activity_logs').insert([
      {
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details,
      },
    ]);
  } catch {
    // Silently ignore errors
  }
}

// Get user by email.
export async function getUserByEmail(email) {
  // Add AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle()
      .abortSignal(controller.signal);

    clearTimeout(timeoutId);
    if (error) throw new Error(error.message);
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error('getUserByEmail timed out for:', email);
      throw new Error('Database query timed out');
    }
    throw error;
  }
}

// Compatibility alias for older routes.
export async function getCachedUserByEmail(email) {
  return getUserByEmail(email);
}

// Get user by ID with role info.
export async function getUserById(id) {
  if (!isSupabaseConfigured) {
    return {
      id,
      name: 'Mock User',
      email: 'mock@example.com',
      role: 'Guest',
      status: 'active',
    };
  }

  const { data, error } = await supabase
    .from('users')
    .select(
      `
      id, email, full_name, avatar_url,
      account_status, status_reason, last_login, created_at,
      user_roles!user_roles_user_id_fkey!left(roles!left(name))
    `
    )
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);

  const roleName = data.user_roles?.[0]?.roles?.name;

  return {
    id: data.id,
    name: data.full_name,
    email: data.email,
    avatar: data.avatar_url,
    status: data.account_status || 'active',
    statusReason: data.status_reason,
    role: roleName
      ? roleName.charAt(0).toUpperCase() + roleName.slice(1)
      : 'Guest',
  };
}

// Insert a new user.
export async function createUser(userData) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert([
      {
        ...userData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Hard-delete a user.
export async function deleteUser(id) {
  const { error } = await supabaseAdmin.from('users').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Update user fields.
export async function updateUser(id, updates) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Get minimal user list for selectors.
export async function getUsersForSelector() {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, full_name, avatar_url')
    .order('full_name');
  if (error) throw new Error(error.message);
  return data ?? [];
}

// Get all users with role/status info.
export async function getAllUsers() {
  if (!isSupabaseConfigured) {
    return [
      {
        id: '1',
        name: 'Admin User',
        email: 'admin@neupc.org',
        avatar: null,
        status: 'Active',
        joined: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        isOnline: false,
        role: 'Admin',
        roles: ['admin'],
        isApproved: true,
      },
    ];
  }

  try {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(
        'id, email, full_name, avatar_url, is_online, last_seen, phone, phone_verified, email_verified, status_changed_by, account_status, status_reason, status_changed_at, last_login, created_at'
      )
      .order('created_at', { ascending: false });

    if (usersError) return [];
    if (!users || users.length === 0) return [];

    const userIds = users.map((u) => u.id);

    const { data: userRoles = [] } = await supabase
      .from('user_roles')
      .select('user_id, assigned_at, roles(name, priority)')
      .in('user_id', userIds);

    const { data: memberProfiles = [] } = await supabase
      .from('member_profiles')
      .select(
        'user_id, approved, student_id, academic_session, department, created_at'
      )
      .in('user_id', userIds);

    const rolesMap = {};
    const profilesMap = {};

    if (userRoles && userRoles.length > 0) {
      userRoles.forEach((role) => {
        if (!rolesMap[role.user_id]) {
          rolesMap[role.user_id] = [];
        }
        rolesMap[role.user_id].push(role);
      });
    }

    if (memberProfiles && memberProfiles.length > 0) {
      memberProfiles.forEach((profile) => {
        profilesMap[profile.user_id] = profile;
      });
    }

    const statusMap = {
      active: 'Active',
      inactive: 'Inactive',
      pending: 'Pending',
      suspended: 'Suspended',
      banned: 'Banned',
      blocked: 'Blocked',
      locked: 'Locked',
      rejected: 'Rejected',
    };

    return users.map((u) => {
      const userRoleRows = rolesMap[u.id] ?? [];
      const roleRows = userRoleRows
        .filter((r) => r.roles?.name)
        .sort((a, b) => (b.roles?.priority ?? 0) - (a.roles?.priority ?? 0));

      const roles = roleRows.map((r) => r.roles.name);
      const primaryRole = roles[0] ?? null;

      const profile = profilesMap[u.id];

      const initials =
        u.full_name
          ?.split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase() ?? '?';

      return {
        id: u.id,
        name: u.full_name,
        email: u.email,
        avatar:
          u.avatar_url?.startsWith('http') || u.avatar_url?.startsWith('/')
            ? u.avatar_url
            : u.avatar_url && u.avatar_url.length > 5
              ? `/api/image/${u.avatar_url}`
              : initials,
        status: statusMap[u.account_status?.toLowerCase()] ?? 'Pending',
        statusReason: u.status_reason,
        statusChangedBy: u.status_changed_by,
        statusChangedAt: u.status_changed_at,
        joined: u.created_at,
        lastActive: u.last_seen ?? u.last_login,
        isOnline: u.last_seen
          ? Date.now() - new Date(u.last_seen).getTime() < 90_000
          : false,
        role: primaryRole
          ? primaryRole.charAt(0).toUpperCase() + primaryRole.slice(1)
          : 'Unassigned',
        roles,
        studentId: profile?.student_id ?? null,
        appliedAt: profile?.created_at ?? null,
        hasProfile: !!profile,
        isApproved: profile?.approved ?? null,
        session: profile?.academic_session ?? null,
        department: profile?.department ?? null,
      };
    });
  } catch (err) {
    console.error('getAllUsers exception:', err);
    return [];
  }
}

// Get aggregate user statistics.
export async function getUserStats() {
  if (!isSupabaseConfigured) {
    return {
      total: 1,
      active: 1,
      inactive: 0,
      pending: 0,
      suspended: 0,
      banned: 0,
      blocked: 0,
      locked: 0,
      rejected: 0,
    };
  }

  try {
    const [
      total,
      active,
      inactive,
      pending,
      suspended,
      banned,
      blocked,
      locked,
      rejected,
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('account_status', 'active'),
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('account_status', 'inActive'),
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('account_status', 'pending'),
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('account_status', 'suspended'),
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('account_status', 'banned'),
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('account_status', 'blocked'),
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('account_status', 'locked'),
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('account_status', 'rejected'),
    ]);

    return {
      total: total.count || 0,
      active: active.count || 0,
      inactive: inactive.count || 0,
      pending: pending.count || 0,
      suspended: suspended.count || 0,
      banned: banned.count || 0,
      blocked: blocked.count || 0,
      locked: locked.count || 0,
      rejected: rejected.count || 0,
    };
  } catch {
    return {
      total: 0,
      active: 0,
      inactive: 0,
      pending: 0,
      suspended: 0,
      banned: 0,
      blocked: 0,
      locked: 0,
      rejected: 0,
    };
  }
}

// Update account status with reason.
export async function updateUserAccountStatus(id, status, reason, changedBy) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .update({
      account_status: status,
      status_reason: reason,
      status_changed_by: changedBy,
      status_changed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Suspend a user account.
export async function suspendUser(userId, adminId, reason, expiresAt = null) {
  const { error } = await supabaseAdmin
    .from('users')
    .update({
      account_status: 'suspended',
      status_reason: reason,
      status_changed_by: adminId,
      status_changed_at: new Date().toISOString(),
      suspension_expires_at: expiresAt,
      is_online: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) throw new Error(error.message);
  await _log(adminId, 'suspend_user', 'user', userId, { reason, expiresAt });
  return { success: true };
}

// Activate/reactivate a user account.
export async function activateUser(
  userId,
  adminId,
  reason = 'Account activated'
) {
  const { error } = await supabaseAdmin
    .from('users')
    .update({
      account_status: 'active',
      status_reason: reason,
      status_changed_by: adminId,
      status_changed_at: new Date().toISOString(),
      suspension_expires_at: null,
      is_online: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) throw new Error(error.message);
  await _log(adminId, 'activate_user', 'user', userId, { reason });
  return { success: true };
}

// Permanently ban a user.
export async function banUser(userId, adminId, reason) {
  const { error } = await supabaseAdmin
    .from('users')
    .update({
      account_status: 'banned',
      status_reason: reason,
      status_changed_by: adminId,
      status_changed_at: new Date().toISOString(),
      is_online: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) throw new Error(error.message);
  await _log(adminId, 'ban_user', 'user', userId, { reason });
  return { success: true };
}

// Approve a member application.
export async function approveMember(userId, adminId) {
  const { error: profileError } = await supabaseAdmin
    .from('member_profiles')
    .update({
      approved: true,
      approved_by: adminId,
      approved_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (profileError) throw new Error(profileError.message);

  await supabaseAdmin
    .from('users')
    .update({
      account_status: 'active',
      is_online: true,
      status_reason: 'Membership approved',
      status_changed_by: adminId,
      status_changed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  await _log(adminId, 'approve_member', 'member_profile', userId, {});
  return { success: true };
}

// Create a new admin user with role-specific profile.
export async function createAdminUser(
  fullName,
  email,
  role,
  adminId,
  profileData = {}
) {
  if (role === 'member') {
    if (
      !String(profileData.student_id || '').trim() ||
      !String(profileData.academic_session || '').trim() ||
      !String(profileData.department || '').trim()
    ) {
      throw new Error(
        'Member profile requires student_id, academic_session, and department.'
      );
    }
  }

  if (role === 'advisor') {
    if (
      !String(profileData.position || '').trim() ||
      !String(profileData.profile_link || '').trim() ||
      !String(profileData.department || '').trim()
    ) {
      throw new Error(
        'Advisor profile requires position, profile_link, and department.'
      );
    }
  }

  if (role === 'executive') {
    if (
      !String(profileData.position_id || '').trim() ||
      !String(profileData.term_start || '').trim() ||
      !String(profileData.term_end || '').trim()
    ) {
      throw new Error(
        'Executive profile requires position_id, term_start, and term_end.'
      );
    }
  }

  const { data: newUser, error: userError } = await supabaseAdmin
    .from('users')
    .insert({
      full_name: fullName,
      email,
      account_status: 'inActive',
      status_reason: 'need to verify their email',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (userError) throw new Error(`Failed to create user: ${userError.message}`);

  const { data: roleData, error: roleError } = await supabaseAdmin
    .from('roles')
    .select('id')
    .eq('name', role)
    .single();

  if (roleError || !roleData) throw new Error(`Invalid role: ${role}`);

  const { error: assignError } = await supabaseAdmin.from('user_roles').insert({
    user_id: newUser.id,
    role_id: roleData.id,
    assigned_by: adminId,
  });

  if (assignError)
    throw new Error(`Failed to assign role: ${assignError.message}`);

  // Create role-specific profile
  const userId = newUser.id;
  try {
    if (role === 'member') {
      await supabaseAdmin.from('member_profiles').insert({
        user_id: userId,
        student_id: profileData.student_id || '',
        academic_session: profileData.academic_session || '',
        department: profileData.department || '',
        approved: false,
      });
    } else if (role === 'advisor') {
      await supabaseAdmin.from('advisor_profiles').insert({
        user_id: userId,
        position: profileData.position || '',
        profile_link: profileData.profile_link || '',
        department: profileData.department || '',
      });
    } else if (role === 'admin') {
      await supabaseAdmin.from('admin_profiles').insert({
        user_id: userId,
        bio: profileData.bio || '',
      });
    } else if (role === 'mentor') {
      await supabaseAdmin.from('mentor_profiles').insert({
        user_id: userId,
        bio: profileData.bio || '',
      });
    } else if (role === 'executive') {
      await supabaseAdmin.from('committee_members').insert({
        user_id: userId,
        position_id: profileData.position_id || null,
        term_start: profileData.term_start || null,
        term_end: profileData.term_end || null,
        is_current: profileData.is_current ?? true,
        bio: profileData.bio || '',
      });
    }
  } catch (profileErr) {
    console.error(`Failed to create ${role} profile:`, profileErr);
  }

  await _log(adminId, 'create_user', 'user', userId, { email, role });
  return { success: true, userId };
}

// Update an admin user.
export async function updateAdminUser(userId, updates, adminId) {
  const { fullName, role } = updates;

  if (fullName) {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ full_name: fullName, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) throw new Error(`Failed to update name: ${error.message}`);
  }

  if (role) {
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', role)
      .single();

    if (roleError || !roleData) throw new Error(`Invalid role: ${role}`);

    await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);

    const { error: assignError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userId, role_id: roleData.id, assigned_by: adminId });

    if (assignError)
      throw new Error(`Failed to update role: ${assignError.message}`);
  }

  await _log(adminId, 'update_user', 'user', userId, updates);
  return { success: true };
}

// Get role names for a user by email.
export async function getUserRoles(email) {
  if (!isSupabaseConfigured) {
    console.warn('⚠️ Supabase not configured — returning empty roles');
    return [];
  }

  // Add AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

  try {
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()
      .abortSignal(controller.signal);

    if (userError || !userData) {
      clearTimeout(timeoutId);
      console.warn('⚠️ User not found for email:', email);
      return [];
    }

    const userId = userData.id;

    const { data: rolesData, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('id, role_id, roles(name, id, priority)')
      .eq('user_id', userId)
      .abortSignal(controller.signal);

    clearTimeout(timeoutId);

    if (rolesError) {
      console.error('❌ Error fetching roles:', rolesError.message);
      return [];
    }

    if (!rolesData || rolesData.length === 0) {
      console.warn('⚠️ No roles found for user:', userId);
      return [];
    }

    const roleNames =
      rolesData
        ?.filter((r) => r.roles?.name)
        .sort((a, b) => (b.roles?.priority ?? 0) - (a.roles?.priority ?? 0))
        .map((r) => r.roles?.name) || [];

    return roleNames.length > 0 ? roleNames : [];
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error('getUserRoles timed out for:', email);
      return [];
    }
    console.error('❌ Exception in getUserRoles:', error);
    return [];
  }
}

// Get users with basic role/status fields.
export async function getUsersBasic() {
  const { data: users, error: uErr } = await supabaseAdmin
    .from('users')
    .select('id, full_name, email, avatar_url, account_status')
    .order('full_name');
  if (uErr) throw new Error(uErr.message);
  if (!users?.length) return [];

  const userIds = users.map((u) => u.id);

  const { data: userRoles = [] } = await supabaseAdmin
    .from('user_roles')
    .select('user_id, roles(id, name, priority)')
    .in('user_id', userIds);

  const rolesMap = {};
  for (const ur of userRoles) {
    if (!rolesMap[ur.user_id]) rolesMap[ur.user_id] = [];
    if (ur.roles) rolesMap[ur.user_id].push(ur.roles);
  }

  return users.map((u) => {
    const uroles = (rolesMap[u.id] ?? []).sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
    );
    const primary = uroles[0];
    const initials =
      u.full_name
        ?.split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() ?? '?';
    return {
      id: u.id,
      name: u.full_name,
      email: u.email,
      avatar: u.avatar_url?.startsWith('http') ? u.avatar_url : initials,
      status: u.account_status ?? 'pending',

      currentRoleId: primary?.id ?? null,
      currentRoleName: primary?.name ?? null,

      roleIds: uroles.map((r) => r.id),
      roleNames: uroles.map((r) => r.name),
    };
  });
}

// Get all roles.
export async function getAllRoles() {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('priority', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get a role by name.
export async function getRoleByName(name) {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('name', name)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Get all permissions.
export async function getAllPermissions() {
  const { data, error } = await supabase
    .from('permissions')
    .select('*')
    .order('category');
  if (error) throw new Error(error.message);
  return data;
}

// Get guest & member roles (id + name) for eligibility selectors.
export async function getEligibilityRoles() {
  const { data, error } = await supabase
    .from('roles')
    .select('id, name')
    .in('name', ['guest', 'member'])
    .order('priority', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

// Get roles with user counts.
export async function getRolesWithStats() {
  const [rolesRes, permissionsRes, userRolesRes, rolePermissionsRes] =
    await Promise.all([
      supabase
        .from('roles')
        .select('*')
        .order('priority', { ascending: false }),
      supabase.from('permissions').select('*').order('category'),
      supabase.from('user_roles').select('role_id'),
      supabase
        .from('role_permissions')
        .select(
          'role_id, permission_id, permissions(id, name, category, description)'
        ),
    ]);

  if (rolesRes.error) throw new Error(rolesRes.error.message);

  const roles = rolesRes.data || [];
  const allPermissions = permissionsRes.data || [];
  const userRoles = userRolesRes.data || [];
  const rolePermissions = rolePermissionsRes.data || [];

  const userCountByRole = userRoles.reduce((acc, ur) => {
    acc[ur.role_id] = (acc[ur.role_id] || 0) + 1;
    return acc;
  }, {});

  const permsByRole = rolePermissions.reduce((acc, rp) => {
    if (!acc[rp.role_id]) acc[rp.role_id] = [];
    if (rp.permissions) acc[rp.role_id].push(rp.permissions);
    return acc;
  }, {});

  return {
    roles: roles.map((r) => ({
      ...r,
      userCount: userCountByRole[r.id] || 0,
      permissions: permsByRole[r.id] || [],
    })),
    allPermissions,
  };
}

// Get permissions filtered by category.
export async function getPermissionsByCategory(category) {
  const { data, error } = await supabase
    .from('permissions')
    .select('*')
    .eq('category', category);
  if (error) throw new Error(error.message);
  return data;
}

// Get permissions assigned to a role.
export async function getRolePermissions(roleId) {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('*, permissions(*)')
    .eq('role_id', roleId);
  if (error) throw new Error(error.message);
  return data;
}

// Assign a permission to a role.
export async function assignPermissionToRole(roleId, permissionId) {
  const { data, error } = await supabase
    .from('role_permissions')
    .insert([{ role_id: roleId, permission_id: permissionId }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Remove a permission from a role.
export async function removePermissionFromRole(roleId, permissionId) {
  const { error } = await supabase
    .from('role_permissions')
    .delete()
    .eq('role_id', roleId)
    .eq('permission_id', permissionId);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Assign a role to a user.
export async function assignRoleToUser(userId, roleId, assignedBy) {
  const { data, error } = await supabase
    .from('user_roles')
    .insert([{ user_id: userId, role_id: roleId, assigned_by: assignedBy }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Remove a role from a user.
export async function removeRoleFromUser(userId, roleId) {
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role_id', roleId);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Replace a user's current role.
export async function updateUserRole(
  userId,
  roleId,
  assignedBy,
  expiresAt = null
) {
  const { data, error } = await supabase
    .from('user_roles')
    .update({ role_id: roleId, assigned_by: assignedBy, expires_at: expiresAt })
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Get all member profiles.
export async function getAllMemberProfiles() {
  const { data, error } = await supabase
    .from('member_profiles')
    .select('*, users(id, full_name, email, avatar_url)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get member profile by user ID.
export async function getMemberProfileByUserId(userId) {
  const { data, error } = await supabase
    .from('member_profiles')
    .select('*, users(id, full_name, email, avatar_url)')
    .eq('user_id', userId)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Get member profile by student ID.
export async function getMemberProfileByStudentId(studentId) {
  const { data, error } = await supabase
    .from('member_profiles')
    .select('*, users(id, full_name, email, avatar_url)')
    .eq('student_id', studentId)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Get all approved member profiles.
export async function getApprovedMembers() {
  const { data, error } = await supabase
    .from('member_profiles')
    .select('*, users(id, full_name, email, avatar_url)')
    .eq('approved', true)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get pending member profile applications.
export async function getPendingMemberProfiles() {
  const { data, error } = await supabase
    .from('member_profiles')
    .select('*, users(id, full_name, email, avatar_url)')
    .eq('approved', false)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get members filtered by session.
export async function getMembersBySession(session) {
  const { data, error } = await supabase
    .from('member_profiles')
    .select('*, users(id, full_name, email, avatar_url)')
    .eq('session', session)
    .eq('approved', true);
  if (error) throw new Error(error.message);
  return data;
}

// Backward-compatible alias for older callers.
export async function getMembersByBatch(batch) {
  return getMembersBySession(batch);
}

// Create a new member profile.
export async function createMemberProfile(profileData) {
  const { data, error } = await supabase
    .from('member_profiles')
    .insert([profileData])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Update a member profile.
export async function updateMemberProfile(userId, updates) {
  const { data, error } = await supabase
    .from('member_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Approve a member profile.
export async function approveMemberProfile(userId, approvedBy) {
  const { data, error } = await supabase
    .from('member_profiles')
    .update({
      approved: true,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Get platform statistics for a member.
export async function getMemberStatistics(memberId) {
  const { data, error } = await supabase
    .from('member_statistics')
    .select('*')
    .eq('member_id', memberId)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Get platform statistics for all members.
export async function getAllMemberStatistics() {
  const { data, error } = await supabase
    .from('member_statistics')
    .select(
      '*, member_profiles(user_id, student_id, academic_session, users(full_name, avatar_url))'
    )
    .order('codeforces_rating', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Insert or update member platform statistics.
export async function upsertMemberStatistics(memberId, stats) {
  const { data, error } = await supabase
    .from('member_statistics')
    .upsert(
      { member_id: memberId, ...stats, updated_at: new Date().toISOString() },
      { onConflict: 'member_id' }
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Get top members by problems solved.
export async function getLeaderboard(limit = 20) {
  const { data, error } = await supabase
    .from('member_statistics')
    .select(
      '*, member_profiles(user_id, student_id, users(full_name, avatar_url))'
    )
    .order('codeforces_rating', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data;
}

// Get progress records for a user.
export async function getMemberProgress(userId) {
  const { data, error } = await supabase
    .from('member_progress')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Create a member progress record.
export async function createMemberProgress(progressData) {
  const { data, error } = await supabase
    .from('member_progress')
    .insert([progressData])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Update a member progress record.
export async function updateMemberProgress(id, updates) {
  const { data, error } = await supabase
    .from('member_progress')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Delete a member progress record.
export async function deleteMemberProgress(id) {
  const { error } = await supabase
    .from('member_progress')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Get all events.
export async function getAllEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*, users!events_created_by_fkey(full_name)')
    .order('start_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get published events.
export async function getPublishedEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .in('status', ['upcoming', 'ongoing', 'completed'])
    .order('start_date', { ascending: false });
  if (error) throw new Error(error.message);

  // Resolve eligibility role_ids → display names
  const events = data || [];
  const roleIds = [
    ...new Set(
      events.map((e) => e.eligibility).filter((v) => v && v !== 'all')
    ),
  ];

  if (roleIds.length > 0) {
    const { data: roles } = await supabase
      .from('roles')
      .select('id, name')
      .in('id', roleIds);
    const roleMap = {};
    (roles || []).forEach((r) => {
      roleMap[r.id] =
        r.name.charAt(0).toUpperCase() + r.name.slice(1) + 's Only';
    });
    events.forEach((e) => {
      if (e.eligibility === 'all') {
        e.eligibility = 'Everyone';
      } else if (roleMap[e.eligibility]) {
        e.eligibility = roleMap[e.eligibility];
      }
    });
  } else {
    events.forEach((e) => {
      if (e.eligibility === 'all') e.eligibility = 'Everyone';
    });
  }

  return events;
}

// Get upcoming published events.
export async function getUpcomingEvents(limit = 10) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'upcoming')
    .gte('start_date', new Date().toISOString())
    .order('start_date', { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data;
}

// Get recent published events that are NOT featured (for homepage).
export async function getRecentNonFeaturedEvents(limit = 3) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .in('status', ['upcoming', 'ongoing', 'completed'])
    .eq('is_featured', false)
    .order('start_date', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data;
}

// Get featured published events.
export async function getFeaturedEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('is_featured', true)
    .in('status', ['upcoming', 'ongoing', 'completed'])
    .order('start_date', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

// Get a published event by slug.
export async function getEventBySlug(slug) {
  const { data, error } = await supabase
    .from('events')
    .select('*, users!events_created_by_fkey(full_name, avatar_url)')
    .eq('slug', slug)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Get an event by ID.
export async function getEventById(id) {
  // Try by UUID first, then fall back to slug
  const isUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const query = supabase
    .from('events')
    .select('*, users!events_created_by_fkey(full_name, avatar_url)');

  const { data, error } = await (
    isUUID ? query.eq('id', id) : query.eq('slug', id)
  ).single();

  if (error) throw new Error(error.message);

  // Resolve eligibility role_id → display name (keep raw value for registration logic)
  data.eligibility_raw = data.eligibility;
  if (data.eligibility && data.eligibility !== 'all') {
    const { data: role } = await supabase
      .from('roles')
      .select('name')
      .eq('id', data.eligibility)
      .single();
    if (role) {
      data.eligibility =
        role.name.charAt(0).toUpperCase() + role.name.slice(1) + 's Only';
    }
  } else if (data.eligibility === 'all') {
    data.eligibility = 'Everyone';
  }

  return data;
}

// Get published events by category.
export async function getEventsByCategory(category) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('category', category)
    .neq('status', 'draft')
    .order('start_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Create a new event.
export async function createEvent(eventData) {
  const { data, error } = await supabase
    .from('events')
    .insert([eventData])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Update an event.
export async function updateEvent(id, updates) {
  const { data, error } = await supabase
    .from('events')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Hard-delete an event.
export async function deleteEvent(id) {
  const { error } = await supabaseAdmin.from('events').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Get events with registration/attendance stats.
export async function getEventsWithStats() {
  const [eventsRes, regsRes] = await Promise.all([
    supabaseAdmin
      .from('events')
      .select('*, users!events_created_by_fkey(full_name, avatar_url)')
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('event_registrations').select('event_id, status'),
  ]);

  if (eventsRes.error) throw new Error(eventsRes.error.message);

  const events = eventsRes.data || [];
  const regs = regsRes.data || [];

  const regCountByEvent = regs.reduce((acc, r) => {
    if (!acc[r.event_id])
      acc[r.event_id] = { total: 0, active: 0, attended: 0, confirmed: 0 };
    acc[r.event_id].total++;
    if (r.status !== 'cancelled') acc[r.event_id].active++;
    if (r.status === 'attended') acc[r.event_id].attended++;
    if (r.status === 'confirmed') acc[r.event_id].confirmed++;
    return acc;
  }, {});

  const enriched = events.map((e) => ({
    ...e,
    creatorName: e.users?.full_name ?? 'Unknown',
    creatorAvatar: e.users?.avatar_url ?? null,
    registrationCount: regCountByEvent[e.id]?.active ?? 0,
    attendedCount: regCountByEvent[e.id]?.attended ?? 0,
    confirmedCount: regCountByEvent[e.id]?.confirmed ?? 0,
  }));

  const activeRegs = regs.filter((r) => r.status !== 'cancelled');

  const stats = {
    total: events.length,
    draft: events.filter((e) => e.status === 'draft').length,
    upcoming: events.filter((e) => e.status === 'upcoming').length,
    ongoing: events.filter((e) => e.status === 'ongoing').length,
    completed: events.filter((e) => e.status === 'completed').length,
    cancelled: events.filter((e) => e.status === 'cancelled').length,
    featured: events.filter((e) => e.is_featured).length,
    totalRegistrations: activeRegs.length,
  };

  return { events: enriched, stats };
}

// Get registrations for an event.
export async function getEventRegistrations(eventId) {
  const { data, error } = await supabaseAdmin
    .from('event_registrations')
    .select('*, users(id, full_name, email, avatar_url)')
    .eq('event_id', eventId)
    .order('registered_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get all event registrations for a user (as leader AND as team member).
export async function getUserEventRegistrations(userId) {
  // 1) Registrations where the user is the leader / individual registrant
  const { data: leaderRegs, error: leaderErr } = await supabaseAdmin
    .from('event_registrations')
    .select(
      '*, events(id, title, slug, start_date, cover_image, category, status)'
    )
    .eq('user_id', userId)
    .order('registered_at', { ascending: false });
  if (leaderErr) throw new Error(leaderErr.message);

  // 2) Registrations where the user is a non-leader team member
  const { data: memberRegs, error: memberErr } = await supabaseAdmin
    .from('event_registrations')
    .select(
      '*, events(id, title, slug, start_date, cover_image, category, status)'
    )
    .contains('team_members', [userId])
    .neq('user_id', userId) // exclude rows already in leaderRegs
    .order('registered_at', { ascending: false });
  if (memberErr) throw new Error(memberErr.message);

  // Tag each registration with the user's role in it
  const tagged = [
    ...(leaderRegs ?? []).map((r) => ({ ...r, isTeamLeader: true })),
    ...(memberRegs ?? []).map((r) => ({ ...r, isTeamLeader: false })),
  ];

  // Sort combined results by registered_at descending
  tagged.sort((a, b) => new Date(b.registered_at) - new Date(a.registered_at));

  return tagged;
}

// Get a single event registration.
export async function getEventRegistration(eventId, userId) {
  const { data, error } = await supabase
    .from('event_registrations')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// Register a user for an event.
export async function createEventRegistration(registrationData) {
  const { data, error } = await supabase
    .from('event_registrations')
    .insert([registrationData])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Update an event registration.
export async function updateEventRegistration(id, updates) {
  const { data, error } = await supabase
    .from('event_registrations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Mark attendance for an event registration.
export async function markAttendance(eventId, userId, attended = true) {
  const { data, error } = await supabase
    .from('event_registrations')
    .update({ attended, status: attended ? 'attended' : 'confirmed' })
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Cancel an event registration.
export async function cancelEventRegistration(eventId, userId) {
  const { data, error } = await supabase
    .from('event_registrations')
    .update({ status: 'cancelled' })
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Get organizers for an event.
export async function getEventOrganizers(eventId) {
  const { data, error } = await supabase
    .from('event_organizers')
    .select('*, users(id, full_name, email, avatar_url)')
    .eq('event_id', eventId);
  if (error) throw new Error(error.message);
  return data;
}

// Add an organizer to an event.
export async function addEventOrganizer(eventId, userId, role = null) {
  const { data, error } = await supabase
    .from('event_organizers')
    .insert([{ event_id: eventId, user_id: userId, role }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Remove an organizer from an event.
export async function removeEventOrganizer(eventId, userId) {
  const { error } = await supabase
    .from('event_organizers')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Get gallery items for an event.
export async function getEventGallery(eventId) {
  const { data, error } = await supabaseAdmin
    .from('event_gallery')
    .select('*')
    .eq('event_id', eventId)
    .order('display_order');
  if (error) throw new Error(error.message);
  return data;
}

// Get all event_gallery items (admin) — includes event title join.
export async function getAllEventGalleryAdmin() {
  const { data, error } = await supabaseAdmin
    .from('event_gallery')
    .select('*, events(id, title)')
    .order('event_id')
    .order('display_order');
  if (error) throw new Error(error.message);
  return data ?? [];
}

// Get all event_gallery items (public) — includes event title/category join.
export async function getAllEventGalleryPublic() {
  const { data, error } = await supabaseAdmin
    .from('event_gallery')
    .select('*, events(id, title, category, start_date, status)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// Add a gallery item to an event.
export async function addEventGalleryItem(galleryData) {
  const { data, error } = await supabase
    .from('event_gallery')
    .insert([galleryData])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Delete a gallery item.
export async function deleteEventGalleryItem(id) {
  const { error } = await supabaseAdmin
    .from('event_gallery')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Get all contests.
export async function getAllContests() {
  const { data, error } = await supabase
    .from('contests')
    .select('*')
    .order('start_time', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get a contest by slug.
export async function getContestBySlug(slug) {
  const { data, error } = await supabase
    .from('contests')
    .select('*')
    .eq('slug', slug)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Get a contest by ID.
export async function getContestById(id) {
  const { data, error } = await supabase
    .from('contests')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Get upcoming contests.
export async function getUpcomingContests(limit = 10) {
  const { data, error } = await supabase
    .from('contests')
    .select('*')
    .eq('status', 'upcoming')
    .order('start_time', { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data;
}

// Get official/curated contests.
export async function getOfficialContests() {
  const { data, error } = await supabase
    .from('contests')
    .select('*')
    .eq('is_official', true)
    .order('start_time', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get contests filtered by platform.
export async function getContestsByPlatform(platform) {
  const { data, error } = await supabase
    .from('contests')
    .select('*')
    .eq('platform', platform)
    .order('start_time', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Create a new contest.
export async function createContest(contestData) {
  const { data, error } = await supabase
    .from('contests')
    .insert([contestData])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Update a contest.
export async function updateContest(id, updates) {
  const { data, error } = await supabase
    .from('contests')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Hard-delete a contest.
export async function deleteContest(id) {
  const { error } = await supabaseAdmin.from('contests').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Get participants for a contest.
export async function getContestParticipants(contestId) {
  const { data, error } = await supabase
    .from('contest_participants')
    .select('*, users(id, full_name, avatar_url)')
    .eq('contest_id', contestId)
    .order('rank', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

// Get contest participations for a user.
export async function getUserContestParticipations(userId) {
  const { data, error } = await supabase
    .from('contest_participants')
    .select('*, contests(id, title, slug, platform, start_time, status)')
    .eq('user_id', userId)
    .order('registered_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Add a participant to a contest.
export async function addContestParticipant(participantData) {
  const { data, error } = await supabase
    .from('contest_participants')
    .insert([participantData])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Update a contest participant record.
export async function updateContestParticipant(contestId, userId, updates) {
  const { data, error } = await supabase
    .from('contest_participants')
    .update(updates)
    .eq('contest_id', contestId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Get blog posts with admin stats.
export async function getBlogsWithStats() {
  const [postsRes, commentsRes] = await Promise.all([
    supabaseAdmin
      .from('blog_posts')
      .select('*, users!blog_posts_author_id_fkey(id, full_name, avatar_url)')
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('blog_comments').select('blog_id, is_approved'),
  ]);

  if (postsRes.error) throw new Error(postsRes.error.message);
  const posts = postsRes.data ?? [];
  const comments = commentsRes.data ?? [];

  const commentCount = {};
  const pendingCount = {};
  for (const c of comments) {
    commentCount[c.blog_id] = (commentCount[c.blog_id] ?? 0) + 1;
    if (!c.is_approved)
      pendingCount[c.blog_id] = (pendingCount[c.blog_id] ?? 0) + 1;
  }

  const enriched = posts.map((p) => ({
    ...p,
    commentCount: commentCount[p.id] ?? 0,
    pendingComments: pendingCount[p.id] ?? 0,
  }));

  const stats = {
    total: posts.length,
    published: posts.filter((p) => p.status === 'published').length,
    draft: posts.filter((p) => p.status === 'draft').length,
    archived: posts.filter((p) => p.status === 'archived').length,
    featured: posts.filter((p) => p.is_featured).length,
    totalViews: posts.reduce((s, p) => s + (p.views ?? 0), 0),
    totalLikes: posts.reduce((s, p) => s + (p.likes ?? 0), 0),
    totalComments: comments.length,
    pendingComments: comments.filter((c) => !c.is_approved).length,
  };

  return { posts: enriched, stats };
}

// Get all blog posts.
export async function getAllBlogPosts() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*, users!blog_posts_author_id_fkey(id, full_name, avatar_url)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get published blog posts.
export async function getPublishedBlogPosts(limit = 20) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select(
      `
      id, slug, title, excerpt, thumbnail, category, tags,
      read_time, views, likes, published_at, is_featured,
      users!blog_posts_author_id_fkey(id, full_name, avatar_url)
    `
    )
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data;
}

// Get featured published blog posts.
export async function getFeaturedBlogPosts() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select(
      `
      id, slug, title, excerpt, thumbnail, category,
      read_time, views, likes, published_at,
      users!blog_posts_author_id_fkey(id, full_name, avatar_url)
    `
    )
    .eq('status', 'published')
    .eq('is_featured', true)
    .order('published_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get recent non-featured published blog posts (for homepage grid).
export async function getRecentNonFeaturedBlogPosts(limit = 6) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select(
      `
      id, slug, title, excerpt, thumbnail, category, tags,
      read_time, views, likes, published_at,
      users!blog_posts_author_id_fkey(id, full_name, avatar_url)
    `
    )
    .eq('status', 'published')
    .eq('is_featured', false)
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data;
}

// Get a published blog post by slug.
export async function getBlogPostBySlug(slug) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*, users!blog_posts_author_id_fkey(id, full_name, avatar_url)')
    .eq('slug', slug)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Get published blog posts by category.
export async function getBlogPostsByCategory(category) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select(
      `
      id, slug, title, excerpt, thumbnail, category, tags,
      read_time, views, likes, published_at,
      users!blog_posts_author_id_fkey(id, full_name, avatar_url)
    `
    )
    .eq('status', 'published')
    .eq('category', category)
    .order('published_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get published blog posts by author.
export async function getBlogPostsByAuthor(authorId) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select(
      'id, slug, title, excerpt, thumbnail, category, status, views, likes, published_at'
    )
    .eq('author_id', authorId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Create a new blog post.
export async function createBlogPost(postData) {
  const { data, error } = await supabase
    .from('blog_posts')
    .insert([postData])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Update a blog post.
export async function updateBlogPost(id, updates) {
  const { data, error } = await supabase
    .from('blog_posts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Publish a blog post.
export async function publishBlogPost(id) {
  const { data, error } = await supabase
    .from('blog_posts')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Increment view count for a blog post.
export async function incrementBlogPostViews(id) {
  const { error } = await supabaseAdmin.rpc('increment_views', { post_id: id });
  if (error) {
    const { data: post } = await supabaseAdmin
      .from('blog_posts')
      .select('views')
      .eq('id', id)
      .single();
    if (post) {
      await supabaseAdmin
        .from('blog_posts')
        .update({ views: (post.views || 0) + 1 })
        .eq('id', id);
    }
  }
  return { success: true };
}

// Hard-delete a blog post.
export async function deleteBlogPost(id) {
  const { error } = await supabaseAdmin
    .from('blog_posts')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Get approved comments for a blog post.
export async function getBlogComments(blogId) {
  const { data, error } = await supabaseAdmin
    .from('blog_comments')
    .select('*, users(id, full_name, avatar_url)')
    .eq('blog_id', blogId)
    .eq('is_approved', true)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

// Get all comments for a blog post (admin).
export async function getAllBlogComments(blogId) {
  const { data, error } = await supabase
    .from('blog_comments')
    .select('*, users(id, full_name, avatar_url)')
    .eq('blog_id', blogId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

// Create a blog comment.
export async function createBlogComment(commentData) {
  const { data, error } = await supabase
    .from('blog_comments')
    .insert([commentData])
    .select('*, users(id, full_name, avatar_url)')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Update a blog comment.
export async function updateBlogComment(id, userId, content) {
  const { data, error } = await supabase
    .from('blog_comments')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Approve a blog comment.
export async function approveBlogComment(id) {
  const { data, error } = await supabase
    .from('blog_comments')
    .update({ is_approved: true })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Delete a blog comment.
export async function deleteBlogComment(id) {
  const { error } = await supabaseAdmin
    .from('blog_comments')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Get all achievements with admin details.
export async function getAchievementsAdmin() {
  const { data, error } = await supabaseAdmin
    .from('achievements')
    .select(
      `*,
       users!achievements_created_by_fkey(id, full_name, avatar_url),
       member_achievements(id, user_id, position, users(id, full_name, avatar_url))`
    )
    .order('year', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  const achievements = data ?? [];

  const currentYear = new Date().getFullYear();
  const stats = {
    total: achievements.length,
    thisYear: achievements.filter((a) => a.year === currentYear).length,
    teamAchievements: achievements.filter((a) => a.is_team).length,
    individualAchievements: achievements.filter((a) => !a.is_team).length,
    categories: [
      ...new Set(achievements.map((a) => a.category).filter(Boolean)),
    ].length,
    years: [...new Set(achievements.map((a) => a.year).filter(Boolean))].sort(
      (a, b) => b - a
    ),
  };

  return { achievements, stats };
}

// Get all participation records with admin details.
export async function getParticipationRecordsAdmin() {
  const { data, error } = await supabaseAdmin
    .from('participation_records')
    .select(
      `id, contest_name, contest_url, category, year, participation_date,
       result, is_team, team_name, team_members, photos, featured_photo, notes, created_at,
       user_id, users!participation_records_user_id_fkey(id, full_name, avatar_url),
       achievement_id, achievements(id, title, result)`
    )
    .order('year', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// Get public participation records (no sensitive fields like notes, created_by).
export async function getPublicParticipationRecords() {
  const { data, error } = await supabaseAdmin
    .from('participation_records')
    .select(
      `id, contest_name, contest_url, category, year, participation_date,
       result, is_team, team_name, team_members, photos, featured_photo,
       user_id, users!participation_records_user_id_fkey(id, full_name, avatar_url),
       achievement_id, achievements(id, title, result)`
    )
    .order('year', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// Get all achievements.
export async function getAllAchievements() {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .order('year', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get an achievement by ID.
export async function getAchievementById(id) {
  const { data, error } = await supabase
    .from('achievements')
    .select('*, member_achievements(*, users(id, full_name, avatar_url))')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Get achievements filtered by year.
export async function getAchievementsByYear(year) {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('year', year)
    .order('achievement_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get achievements by category.
export async function getAchievementsByCategory(category) {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('category', category)
    .order('year', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Create a new achievement.
export async function createAchievement(achievementData) {
  const { data, error } = await supabase
    .from('achievements')
    .insert([achievementData])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Update an achievement.
export async function updateAchievement(id, updates) {
  const { data, error } = await supabase
    .from('achievements')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Delete an achievement.
export async function deleteAchievement(id) {
  const { error } = await supabaseAdmin
    .from('achievements')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Get achievements for a member.
export async function getMemberAchievements(userId) {
  const { data, error } = await supabase
    .from('member_achievements')
    .select('*, achievements(*)')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return data;
}

// Get members of an achievement.
export async function getAchievementMembers(achievementId) {
  const { data, error } = await supabase
    .from('member_achievements')
    .select('*, users(id, full_name, avatar_url)')
    .eq('achievement_id', achievementId);
  if (error) throw new Error(error.message);
  return data;
}

// Link a member to an achievement.
export async function addMemberAchievement(
  achievementId,
  userId,
  position = null
) {
  const { data, error } = await supabase
    .from('member_achievements')
    .insert([{ achievement_id: achievementId, user_id: userId, position }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Unlink a member from an achievement.
export async function removeMemberAchievement(achievementId, userId) {
  const { error } = await supabase
    .from('member_achievements')
    .delete()
    .eq('achievement_id', achievementId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Get all notices for admin view.
export async function getNoticesAdmin() {
  const { data, error } = await supabaseAdmin
    .from('notices')
    .select('*, users!notices_created_by_fkey(id, full_name, avatar_url)')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  const notices = data ?? [];

  const now = new Date();
  const stats = {
    total: notices.length,
    pinned: notices.filter((n) => n.is_pinned).length,
    active: notices.filter((n) => !n.expires_at || new Date(n.expires_at) > now)
      .length,
    expired: notices.filter(
      (n) => n.expires_at && new Date(n.expires_at) <= now
    ).length,
    critical: notices.filter((n) => n.priority === 'critical').length,
    urgent: notices.filter((n) => n.notice_type === 'urgent').length,
  };

  return { notices, stats };
}

// Get all active/pinned notices.
export async function getAllNotices() {
  const { data, error } = await supabase
    .from('notices')
    .select('*, users!notices_created_by_fkey(id, full_name)')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get currently active notices.
export async function getActiveNotices() {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('notices')
    .select('*, users!notices_created_by_fkey(id, full_name)')
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get a notice by ID.
export async function getNoticeById(id) {
  const { data, error } = await supabase
    .from('notices')
    .select('*, users!notices_created_by_fkey(id, full_name)')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Get notices filtered by type.
export async function getNoticesByType(type) {
  const { data, error } = await supabase
    .from('notices')
    .select('*')
    .eq('notice_type', type)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get pinned notices.
export async function getPinnedNotices() {
  const { data, error } = await supabase
    .from('notices')
    .select('*')
    .eq('is_pinned', true)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Create a new notice.
export async function createNotice(noticeData) {
  const { data, error } = await supabase
    .from('notices')
    .insert([noticeData])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Update a notice.
export async function updateNotice(id, updates) {
  const { data, error } = await supabase
    .from('notices')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Increment view count for a notice.
export async function incrementNoticeViews(id) {
  const { data: notice } = await supabase
    .from('notices')
    .select('views')
    .eq('id', id)
    .single();
  if (notice) {
    await supabase
      .from('notices')
      .update({ views: (notice.views || 0) + 1 })
      .eq('id', id);
  }
  return { success: true };
}

// Delete a notice.
export async function deleteNotice(id) {
  const { error } = await supabaseAdmin.from('notices').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Get notifications for a user.
export async function getUserNotifications(userId, limit = 20) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data;
}

// Get unread notifications for a user.
export async function getUnreadNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('is_read', false)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get count of unread notifications.
export async function getUnreadNotificationsCount(userId) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) throw new Error(error.message);
  return count || 0;
}

// Create a notification.
export async function createNotification(notificationData) {
  const { data, error } = await supabase
    .from('notifications')
    .insert([notificationData])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Mark a notification as read.
export async function markNotificationAsRead(id, userId) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Mark all notifications as read for a user.
export async function markAllNotificationsAsRead(userId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Delete a notification.
export async function deleteNotification(id, userId) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Get all discussion categories.
export async function getDiscussionCategories() {
  const { data, error } = await supabase
    .from('discussion_categories')
    .select('*')
    .order('display_order');
  if (error) throw new Error(error.message);
  return data;
}

// Create a discussion category.
export async function createDiscussionCategory(categoryData) {
  const { data, error } = await supabase
    .from('discussion_categories')
    .insert([categoryData])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Update a discussion category.
export async function updateDiscussionCategory(id, updates) {
  const { data, error } = await supabase
    .from('discussion_categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Delete a discussion category.
export async function deleteDiscussionCategory(id) {
  const { error } = await supabase
    .from('discussion_categories')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Get all discussion threads (paginated).
export async function getAllDiscussionThreads(limit = 20, offset = 0) {
  const { data, error } = await supabase
    .from('discussion_threads')
    .select(
      `
      *,
      users!discussion_threads_author_id_fkey(id, full_name, avatar_url),
      discussion_categories(name, icon)
    `
    )
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);
  return data;
}

// Get discussion threads by category.
export async function getDiscussionThreadsByCategory(categoryId, limit = 20) {
  const { data, error } = await supabase
    .from('discussion_threads')
    .select(
      '*, users!discussion_threads_author_id_fkey(id, full_name, avatar_url)'
    )
    .eq('category_id', categoryId)
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data;
}

// Get a discussion thread by ID.
export async function getDiscussionThreadById(id) {
  const { data, error } = await supabase
    .from('discussion_threads')
    .select(
      `
      *,
      users!discussion_threads_author_id_fkey(id, full_name, avatar_url),
      discussion_categories(name, icon)
    `
    )
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Create a discussion thread.
export async function createDiscussionThread(threadData) {
  const { data, error } = await supabase
    .from('discussion_threads')
    .insert([threadData])
    .select(
      '*, users!discussion_threads_author_id_fkey(id, full_name, avatar_url)'
    )
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Update a discussion thread.
export async function updateDiscussionThread(id, authorId, updates) {
  const { data, error } = await supabase
    .from('discussion_threads')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('author_id', authorId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Pin or unpin a thread.
export async function pinDiscussionThread(id, pinned = true) {
  const { data, error } = await supabase
    .from('discussion_threads')
    .update({ is_pinned: pinned, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Lock or unlock a thread.
export async function lockDiscussionThread(id, locked = true) {
  const { data, error } = await supabase
    .from('discussion_threads')
    .update({ is_locked: locked, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Mark a thread as solved.
export async function markThreadSolved(id, solved = true) {
  const { data, error } = await supabase
    .from('discussion_threads')
    .update({ is_solved: solved, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Increment view count for a thread.
export async function incrementThreadViews(id) {
  const { data: thread } = await supabase
    .from('discussion_threads')
    .select('views')
    .eq('id', id)
    .single();
  if (thread) {
    await supabase
      .from('discussion_threads')
      .update({ views: (thread.views || 0) + 1 })
      .eq('id', id);
  }
  return { success: true };
}

// Delete a discussion thread.
export async function deleteDiscussionThread(id) {
  const { error } = await supabase
    .from('discussion_threads')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Get replies for a thread.
export async function getThreadReplies(threadId) {
  const { data, error } = await supabase
    .from('discussion_replies')
    .select(
      '*, users!discussion_replies_author_id_fkey(id, full_name, avatar_url)'
    )
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

// Create a reply to a thread.
export async function createDiscussionReply(replyData) {
  const { data, error } = await supabase
    .from('discussion_replies')
    .insert([replyData])
    .select(
      '*, users!discussion_replies_author_id_fkey(id, full_name, avatar_url)'
    )
    .single();
  if (error) throw new Error(error.message);

  await supabase
    .from('discussion_threads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', replyData.thread_id);

  return data;
}

// Update a discussion reply.
export async function updateDiscussionReply(id, authorId, content) {
  const { data, error } = await supabase
    .from('discussion_replies')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('author_id', authorId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Mark or unmark a reply as solution.
export async function markReplyAsSolution(id, isSolution = true) {
  const { data, error } = await supabase
    .from('discussion_replies')
    .update({ is_solution: isSolution })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Delete a discussion reply.
export async function deleteDiscussionReply(id) {
  const { error } = await supabase
    .from('discussion_replies')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Vote on a discussion thread.
export async function voteOnThread(userId, threadId, voteType) {
  const { data, error } = await supabase
    .from('discussion_votes')
    .upsert(
      {
        user_id: userId,
        thread_id: threadId,
        vote_type: voteType,
        reply_id: null,
      },
      { onConflict: 'user_id,thread_id' }
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Vote on a discussion reply.
export async function voteOnReply(userId, replyId, voteType) {
  const { data, error } = await supabase
    .from('discussion_votes')
    .upsert(
      {
        user_id: userId,
        reply_id: replyId,
        vote_type: voteType,
        thread_id: null,
      },
      { onConflict: 'user_id,reply_id' }
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Remove a vote from a thread or reply.
export async function removeVote(userId, threadId = null, replyId = null) {
  let query = supabase.from('discussion_votes').delete().eq('user_id', userId);
  if (threadId) query = query.eq('thread_id', threadId);
  if (replyId) query = query.eq('reply_id', replyId);
  const { error } = await query;
  if (error) throw new Error(error.message);
  return { success: true };
}

// Get all votes cast by a user.
export async function getUserVotes(userId) {
  const { data, error } = await supabase
    .from('discussion_votes')
    .select('*')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return data;
}

// =============================================================================
// HELP DESK / DISCUSSION SYSTEM (Enhanced)
// =============================================================================

/**
 * Get discussions with advanced filtering, sorting, and pagination.
 * This is the main query function for the Help Desk system.
 */
export async function getDiscussions({
  userId = null,
  type = null,
  status = null,
  priority = null,
  bootcampId = null,
  courseId = null,
  assignedTo = null,
  search = null,
  sortBy = 'created_at',
  sortOrder = 'desc',
  limit = 20,
  offset = 0,
  includeResolved = true,
  myPostsOnly = false,
  unassignedOnly = false,
  needsResponse = false,
} = {}) {
  // Map sort keys to actual column names
  const SORT_COLUMN_MAP = {
    newest: 'created_at',
    oldest: 'created_at',
    most_replies: 'reply_count',
    most_viewed: 'views',
    recently_updated: 'updated_at',
    priority_high: 'priority',
    created_at: 'created_at',
    updated_at: 'updated_at',
    reply_count: 'reply_count',
    views: 'views',
    priority: 'priority',
  };

  // Map sort keys to sort direction
  const SORT_ORDER_MAP = {
    newest: 'desc',
    oldest: 'asc',
    most_replies: 'desc',
    most_viewed: 'desc',
    recently_updated: 'desc',
    priority_high: 'desc',
  };

  // Resolve the actual column name and sort order
  const actualSortColumn = SORT_COLUMN_MAP[sortBy] || 'created_at';
  const actualSortOrder = SORT_ORDER_MAP[sortBy] || sortOrder;

  const applyFiltersAndPaging = (query) => {
    let next = query;

    if (myPostsOnly && userId) {
      next = next.eq('author_id', userId);
    }

    if (type) {
      next = next.eq('type', type);
    }

    if (status) {
      if (Array.isArray(status)) {
        next = next.in('status', status);
      } else {
        next = next.eq('status', status);
      }
    }

    if (!includeResolved) {
      next = next.not('status', 'in', '("resolved","closed")');
    }

    if (priority) {
      next = next.eq('priority', priority);
    }

    if (bootcampId) {
      next = next.eq('bootcamp_id', bootcampId);
    }

    if (courseId) {
      next = next.eq('course_id', courseId);
    }

    if (assignedTo) {
      next = next.eq('assigned_to', assignedTo);
    }

    if (unassignedOnly) {
      next = next.is('assigned_to', null);
    }

    if (needsResponse) {
      next = next.eq('status', 'open').eq('reply_count', 0);
    }

    if (search) {
      next = next.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const ascending = actualSortOrder === 'asc';
    return next
      .order('is_pinned', { ascending: false })
      .order(actualSortColumn, { ascending })
      .range(offset, offset + limit - 1);
  };

  const normalizeError = (error) => {
    if (!error) return {};
    if (error instanceof Error) {
      return {
        message: error.message,
        name: error.name,
        stack: error.stack,
      };
    }
    return {
      message: error.message || null,
      details: error.details || null,
      hint: error.hint || null,
      code: error.code || null,
      raw: error,
    };
  };

  const primaryQuery = applyFiltersAndPaging(
    supabase.from('discussion_threads').select(
      `
      *,
      author:users!discussion_threads_author_id_fkey(id, full_name, avatar_url, email),
      category:discussion_categories(id, name, icon),
      assigned:users!discussion_threads_assigned_to_fkey(id, full_name, avatar_url),
      bootcamp:bootcamps(id, title, slug),
      course:courses(id, title)
    `,
      { count: 'exact' }
    )
  );

  const primaryResult = await primaryQuery;

  if (!primaryResult.error) {
    return {
      data: primaryResult.data || [],
      count: primaryResult.count || 0,
      hasMore: primaryResult.count > offset + limit,
    };
  }

  console.error(
    'Database error in getDiscussions (relational query):',
    JSON.stringify(primaryResult.error, null, 2)
  );

  // Fallback to base query so Help Desk remains usable when joins are misconfigured.
  const fallbackQuery = applyFiltersAndPaging(
    supabase.from('discussion_threads').select('*', { count: 'exact' })
  );
  const fallbackResult = await fallbackQuery;

  if (fallbackResult.error) {
    console.error(
      'Database error in getDiscussions (fallback query):',
      JSON.stringify(fallbackResult.error, null, 2)
    );

    const fallbackError =
      fallbackResult.error.message ||
      fallbackResult.error.details ||
      'Unknown database error. Check discussion_threads schema and related foreign keys.';

    throw new Error(`Failed to fetch discussions: ${fallbackError}`);
  }

  return {
    data: fallbackResult.data || [],
    count: fallbackResult.count || 0,
    hasMore: fallbackResult.count > offset + limit,
  };
}

/**
 * Get a single discussion thread with full details including replies.
 */
export async function getDiscussionWithReplies(threadId) {
  // Get thread with author, assigned user, and LMS context
  const { data: thread, error: threadError } = await supabase
    .from('discussion_threads')
    .select(
      `
      *,
      author:users!discussion_threads_author_id_fkey(id, full_name, avatar_url, email),
      category:discussion_categories(id, name, icon),
      assigned:users!discussion_threads_assigned_to_fkey(id, full_name, avatar_url),
      bootcamp:bootcamps(id, title, slug),
      course:courses(id, title),
      module:modules(id, title),
      lesson:lessons(id, title)
    `
    )
    .eq('id', threadId)
    .single();

  if (threadError) throw new Error(threadError.message);

  // Get replies with author info and role
  const { data: replies, error: repliesError } = await supabase
    .from('discussion_replies')
    .select(
      `
      *,
      author:users!discussion_replies_author_id_fkey(id, full_name, avatar_url)
    `
    )
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (repliesError) throw new Error(repliesError.message);

  // Get activity log for this thread
  const { data: activity, error: activityError } = await supabase
    .from('discussion_activity')
    .select(
      `
      *,
      user:users(id, full_name, avatar_url)
    `
    )
    .eq('discussion_id', threadId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (activityError) {
    console.error('Error fetching activity:', activityError.message);
  }

  return {
    ...thread,
    replies: replies || [],
    activity: activity || [],
  };
}

/**
 * Get discussion statistics for a user (member dashboard).
 */
export async function getUserDiscussionStats(userId) {
  const { data, error } = await supabase
    .from('discussion_threads')
    .select('status, type', { count: 'exact' })
    .eq('author_id', userId);

  if (error) throw new Error(error.message);

  const stats = {
    total: data?.length || 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    byType: {},
  };

  data?.forEach((thread) => {
    // Count by status (matches DB constraint values)
    if (thread.status === 'new' || thread.status === 'open') stats.open++;
    else if (
      thread.status === 'in_progress' ||
      thread.status === 'investigating' ||
      thread.status === 'acknowledged'
    )
      stats.in_progress++;
    else if (thread.status === 'resolved' || thread.status === 'closed')
      stats.resolved++;

    // Count by type
    stats.byType[thread.type] = (stats.byType[thread.type] || 0) + 1;
  });

  return stats;
}

/**
 * Get discussion statistics for staff (admin dashboard).
 */
export async function getStaffDiscussionStats() {
  const { data, error } = await supabase
    .from('discussion_threads')
    .select('status, type, priority, assigned_to');

  if (error) throw new Error(error.message);

  const stats = {
    total: data?.length || 0,
    new: 0,
    open: 0,
    in_progress: 0,
    investigating: 0,
    acknowledged: 0,
    resolved: 0,
    unassigned: 0,
    urgent: 0,
    byType: {},
    byPriority: {},
  };

  data?.forEach((thread) => {
    // Count by status (matches DB constraint values)
    if (thread.status === 'new') stats.new++;
    else if (thread.status === 'open') stats.open++;
    else if (thread.status === 'in_progress') stats.in_progress++;
    else if (thread.status === 'investigating') stats.investigating++;
    else if (thread.status === 'acknowledged') stats.acknowledged++;
    else if (thread.status === 'resolved' || thread.status === 'closed')
      stats.resolved++;

    // Count unassigned
    if (
      !thread.assigned_to &&
      thread.status !== 'resolved' &&
      thread.status !== 'closed'
    ) {
      stats.unassigned++;
    }

    // Count urgent
    if (
      thread.priority === 'urgent' &&
      thread.status !== 'resolved' &&
      thread.status !== 'closed'
    ) {
      stats.urgent++;
    }

    // Count by type
    stats.byType[thread.type] = (stats.byType[thread.type] || 0) + 1;

    // Count by priority
    stats.byPriority[thread.priority] =
      (stats.byPriority[thread.priority] || 0) + 1;
  });

  return stats;
}

/**
 * Get discussions grouped by status for Kanban view.
 */
export async function getDiscussionsForKanban({
  type = null,
  bootcampId = null,
  assignedTo = null,
} = {}) {
  let query = supabase
    .from('discussion_threads')
    .select(
      `
      id, title, type, status, priority, created_at, updated_at, reply_count,
      author:users!discussion_threads_author_id_fkey(id, full_name, avatar_url),
      assigned:users!discussion_threads_assigned_to_fkey(id, full_name, avatar_url)
    `
    )
    .not('status', 'eq', 'closed');

  if (type) {
    query = query.eq('type', type);
  }

  if (bootcampId) {
    query = query.eq('bootcamp_id', bootcampId);
  }

  if (assignedTo) {
    query = query.eq('assigned_to', assignedTo);
  }

  query = query
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true });

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  // Group by status (matches DB constraint values)
  const grouped = {
    new: [],
    open: [],
    investigating: [],
    in_progress: [],
    acknowledged: [],
    resolved: [],
  };

  data?.forEach((thread) => {
    if (grouped[thread.status]) {
      grouped[thread.status].push(thread);
    }
  });

  return grouped;
}

/**
 * Get feature requests (for Feature Requests tab).
 */
export async function getFeatureRequests({
  status = null,
  sortBy = 'views',
  limit = 50,
  offset = 0,
} = {}) {
  let query = supabase
    .from('discussion_threads')
    .select(
      `
      *,
      author:users!discussion_threads_author_id_fkey(id, full_name, avatar_url),
      assigned:users!discussion_threads_assigned_to_fkey(id, full_name, avatar_url)
    `,
      { count: 'exact' }
    )
    .eq('type', 'feature_request');

  if (status) {
    if (Array.isArray(status)) {
      query = query.in('status', status);
    } else {
      query = query.eq('status', status);
    }
  }

  query = query
    .order(sortBy, { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { data, count };
}

/**
 * Update discussion status (staff action).
 */
export async function updateDiscussionStatus(threadId, status, userId) {
  const updates = {
    status,
    updated_at: new Date().toISOString(),
  };

  // Set resolved_at if status is resolved
  if (status === 'resolved') {
    updates.resolved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('discussion_threads')
    .update(updates)
    .eq('id', threadId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Log activity
  await logDiscussionActivity(threadId, userId, 'status_changed', {
    new_status: status,
  });

  return data;
}

/**
 * Assign discussion to staff member.
 */
export async function assignDiscussion(threadId, assigneeId, assignerId) {
  const { data, error } = await supabase
    .from('discussion_threads')
    .update({
      assigned_to: assigneeId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', threadId)
    .select(
      `
      *,
      assigned:users!discussion_threads_assigned_to_fkey(id, full_name)
    `
    )
    .single();

  if (error) throw new Error(error.message);

  // Log activity
  await logDiscussionActivity(threadId, assignerId, 'assigned', {
    assignee_id: assigneeId,
    assignee_name: data.assigned?.full_name,
  });

  return data;
}

/**
 * Update discussion priority (staff action).
 */
export async function updateDiscussionPriority(threadId, priority, userId) {
  const { data, error } = await supabase
    .from('discussion_threads')
    .update({
      priority,
      updated_at: new Date().toISOString(),
    })
    .eq('id', threadId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Log activity
  await logDiscussionActivity(threadId, userId, 'priority_changed', {
    new_priority: priority,
  });

  return data;
}

/**
 * Create a staff reply to a discussion.
 */
export async function createStaffReply(replyData, userRole) {
  const { data, error } = await supabase
    .from('discussion_replies')
    .insert([
      {
        ...replyData,
        is_staff_reply: true,
        responder_role: userRole,
      },
    ])
    .select(
      `
      *,
      author:users!discussion_replies_author_id_fkey(id, full_name, avatar_url)
    `
    )
    .single();

  if (error) throw new Error(error.message);

  // Update thread's updated_at and reply_count
  await supabase
    .from('discussion_threads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', replyData.thread_id);

  // Log activity
  await logDiscussionActivity(
    replyData.thread_id,
    replyData.author_id,
    'replied',
    {
      reply_id: data.id,
      is_staff: true,
    }
  );

  return data;
}

/**
 * Mark a reply as accepted answer.
 */
export async function markReplyAsAccepted(replyId, threadId, userId) {
  // First, unmark any existing accepted reply
  await supabase
    .from('discussion_replies')
    .update({ is_accepted: false })
    .eq('thread_id', threadId)
    .eq('is_accepted', true);

  // Mark the new reply as accepted
  const { data, error } = await supabase
    .from('discussion_replies')
    .update({ is_accepted: true })
    .eq('id', replyId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Log activity
  await logDiscussionActivity(threadId, userId, 'accepted_answer', {
    reply_id: replyId,
  });

  return data;
}

/**
 * Log discussion activity.
 */
export async function logDiscussionActivity(
  threadId,
  userId,
  activityType,
  details = {}
) {
  const { error } = await supabase.from('discussion_activity').insert([
    {
      discussion_id: threadId,
      user_id: userId,
      action: activityType,
      metadata: details,
    },
  ]);

  if (error) {
    console.error('Error logging discussion activity:', error.message);
  }
}

/**
 * Get FAQ categories with items.
 */
export async function getFAQs() {
  const { data, error } = await supabase
    .from('faq_categories')
    .select(
      `
      *,
      items:faq_items(*)
    `
    )
    .order('display_order')
    .order('display_order', { foreignTable: 'faq_items' });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Search FAQs by keyword.
 */
export async function searchFAQs(query) {
  const { data, error } = await supabase
    .from('faq_items')
    .select(
      `
      *,
      category:faq_categories(id, title, icon)
    `
    )
    .or(
      `question.ilike.%${query}%,answer.ilike.%${query}%,keywords.cs.{${query}}`
    )
    .limit(20);

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Get staff members who can be assigned to discussions.
 */
export async function getAssignableStaff() {
  const { data, error } = await supabase
    .from('user_roles')
    .select(
      `
      user_id,
      role:roles(name),
      user:users(id, full_name, avatar_url)
    `
    )
    .in('role_id', [2, 3, 4, 5]); // admin, mentor, advisor, executive role IDs

  if (error) throw new Error(error.message);

  // Flatten and dedupe by user_id
  const staffMap = new Map();
  data?.forEach((item) => {
    if (item.user && !staffMap.has(item.user_id)) {
      staffMap.set(item.user_id, {
        id: item.user.id,
        full_name: item.user.full_name,
        avatar_url: item.user.avatar_url,
        role: item.role?.name,
      });
    }
  });

  return Array.from(staffMap.values());
}

/**
 * Create a new discussion thread with LMS context.
 */
export async function createHelpDeskThread(threadData) {
  const { data, error } = await supabase
    .from('discussion_threads')
    .insert([
      {
        ...threadData,
        status: 'open',
        priority: threadData.priority || 'normal',
      },
    ])
    .select(
      `
      *,
      author:users!discussion_threads_author_id_fkey(id, full_name, avatar_url),
      bootcamp:bootcamps(id, title),
      course:courses(id, title)
    `
    )
    .single();

  if (error) throw new Error(error.message);

  // Log creation activity
  await logDiscussionActivity(data.id, threadData.author_id, 'created', {
    type: threadData.type,
  });

  return data;
}

/**
 * Get user's bootcamp enrollments for LMS context dropdown.
 */
export async function getUserBootcampEnrollments(userId) {
  const { data, error } = await supabase
    .from('enrollments')
    .select(
      `
      bootcamp_id,
      bootcamp:bootcamps(
        id, title, slug,
        courses(id, title,
          modules(id, title,
            lessons(id, title)
          )
        )
      )
    `
    )
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) throw new Error(error.message);
  return data?.map((e) => e.bootcamp).filter(Boolean) || [];
}

/**
 * Get recent resolved discussions (for release log).
 */
export async function getResolvedDiscussions({ limit = 50, offset = 0 } = {}) {
  const { data, error, count } = await supabase
    .from('discussion_threads')
    .select(
      `
      id, title, type, status, resolved_at, created_at,
      author:users!discussion_threads_author_id_fkey(id, full_name, avatar_url),
      assigned:users!discussion_threads_assigned_to_fkey(id, full_name, avatar_url)
    `,
      { count: 'exact' }
    )
    .in('status', ['resolved', 'closed'])
    .not('resolved_at', 'is', null)
    .order('resolved_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);
  return { data, count };
}

// Get certificates for a user.
export async function getUserCertificates(userId) {
  const { data, error } = await supabase
    .from('certificates')
    .select('*, events(id, title, slug), contests(id, title, slug)')
    .eq('recipient_id', userId)
    .order('issue_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get a certificate by certificate number.
export async function getCertificateByNumber(certificateNumber) {
  const { data, error } = await supabase
    .from('certificates')
    .select(
      `
      *,
      users!certificates_recipient_id_fkey(id, full_name, email),
      events(id, title),
      contests(id, title)
    `
    )
    .eq('certificate_number', certificateNumber)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Get certificates issued for an event.
export async function getEventCertificates(eventId) {
  const { data, error } = await supabase
    .from('certificates')
    .select('*, users!certificates_recipient_id_fkey(id, full_name, email)')
    .eq('event_id', eventId)
    .order('issue_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Issue a certificate.
export async function issueCertificate(certificateData) {
  const { data, error } = await supabase
    .from('certificates')
    .insert([certificateData])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Verify a certificate by number.
export async function verifyCertificate(certificateNumber) {
  const { data, error } = await supabase
    .from('certificates')
    .select('*, users!certificates_recipient_id_fkey(full_name)')
    .eq('certificate_number', certificateNumber)
    .eq('verified', true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// Delete a certificate.
export async function deleteCertificate(id) {
  const { error } = await supabaseAdmin
    .from('certificates')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Get all committee positions.
export async function getCommitteePositions() {
  const { data, error } = await supabaseAdmin
    .from('committee_positions')
    .select('*')
    .order('display_order');
  if (error) throw new Error(error.message);
  return data;
}

// Get committee positions by category.
export async function getPositionsByCategory(category) {
  const { data, error } = await supabaseAdmin
    .from('committee_positions')
    .select('*')
    .eq('category', category)
    .order('display_order');
  if (error) throw new Error(error.message);
  return data;
}

// Get current active committee members with full profiles.
export async function getCurrentCommittee() {
  const selectWithProfiles =
    '*, users!committee_members_user_id_fkey(id, full_name, email, phone, avatar_url, member_profiles!member_profiles_user_id_fkey(academic_session, department, bio, github, linkedin, updated_at), advisor_profiles!teacher_profiles_user_id_fkey(position, department)), committee_positions(id, title, category, rank, display_order, responsibilities)';
  const selectWithoutProfiles =
    '*, users!committee_members_user_id_fkey(id, full_name, email, phone, avatar_url), committee_positions(id, title, category, rank, display_order, responsibilities)';

  const runCurrentQuery = async (selectClause) =>
    supabaseAdmin
      .from('committee_members')
      .select(selectClause)
      .eq('is_current', true);

  const runAllQuery = async (selectClause) =>
    supabaseAdmin.from('committee_members').select(selectClause);

  let selectClause = selectWithProfiles;
  let { data, error } = await runCurrentQuery(selectClause);

  // Some environments fail on nested member_profiles join; retry without it.
  if (error) {
    console.error(
      '[getCurrentCommittee] profile join failed, retrying without profiles:',
      error.message
    );
    selectClause = selectWithoutProfiles;
    ({ data, error } = await runCurrentQuery(selectClause));
  }

  if (error) {
    console.error(
      '[getCurrentCommittee] failed fetching current members:',
      error.message
    );
    return [];
  }

  if (Array.isArray(data) && data.length > 0) {
    return data;
  }

  // Fallback 1: if is_current flags are not maintained, infer by date range.
  let { data: allMembers, error: allError } = await runAllQuery(selectClause);

  if (allError && selectClause === selectWithProfiles) {
    console.error(
      '[getCurrentCommittee] fallback profile join failed, retrying without profiles:',
      allError.message
    );
    ({ data: allMembers, error: allError } = await runAllQuery(
      selectWithoutProfiles
    ));
  }

  if (allError) {
    console.error(
      '[getCurrentCommittee] failed fetching fallback committee data:',
      allError.message
    );
    return [];
  }

  const today = new Date().toISOString().slice(0, 10);
  const currentByDate = (allMembers || []).filter(
    (member) =>
      member.term_start <= today &&
      (!member.term_end || member.term_end >= today)
  );

  if (currentByDate.length > 0) {
    return currentByDate;
  }

  // Fallback 2: use latest term_start cohort when no active date window is found.
  let latestTermStart = null;
  (allMembers || []).forEach((member) => {
    if (!member.term_start) return;
    if (!latestTermStart || member.term_start > latestTermStart) {
      latestTermStart = member.term_start;
    }
  });

  if (!latestTermStart) return allMembers || [];

  return (allMembers || []).filter(
    (member) => member.term_start === latestTermStart
  );
}

// Get all committee members with position info and full profiles.
export async function getAllCommitteeMembers() {
  const { data, error } = await supabaseAdmin
    .from('committee_members')
    .select(
      '*, users!committee_members_user_id_fkey(id, full_name, email, phone, avatar_url, member_profiles!member_profiles_user_id_fkey(academic_session, department, bio, github, linkedin)), committee_positions(id, title, category, rank, display_order, responsibilities)'
    )
    .order('term_start', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Add a committee member.
export async function addCommitteeMember(memberData) {
  const { data, error } = await supabaseAdmin
    .from('committee_members')
    .insert([memberData])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Update a committee member record.
export async function updateCommitteeMember(id, updates) {
  const { data, error } = await supabaseAdmin
    .from('committee_members')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Remove a committee member.
export async function removeCommitteeMember(id) {
  const { error } = await supabaseAdmin
    .from('committee_members')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Get all mentorship records.
export async function getAllMentorships() {
  const { data, error } = await supabase
    .from('mentorships')
    .select(
      `
      *,
      users!mentorships_mentor_id_fkey(id, full_name, avatar_url),
      users!mentorships_mentee_id_fkey(id, full_name, avatar_url)
    `
    )
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get active mentorships.
export async function getActiveMentorships() {
  const { data, error } = await supabase
    .from('mentorships')
    .select(
      `
      *,
      users!mentorships_mentor_id_fkey(id, full_name, avatar_url),
      users!mentorships_mentee_id_fkey(id, full_name, avatar_url)
    `
    )
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get mentorships by mentor ID.
export async function getMentorshipsByMentor(mentorId) {
  const { data, error } = await supabase
    .from('mentorships')
    .select(
      `
      *,
      users!mentorships_mentee_id_fkey(id, full_name, avatar_url, member_profiles(student_id, academic_session))
    `
    )
    .eq('mentor_id', mentorId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get mentorships by mentee ID.
export async function getMentorshipsByMentee(menteeId) {
  const { data, error } = await supabase
    .from('mentorships')
    .select('*, users!mentorships_mentor_id_fkey(id, full_name, avatar_url)')
    .eq('mentee_id', menteeId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Create a mentorship.
export async function createMentorship(mentorshipData) {
  const { data, error } = await supabase
    .from('mentorships')
    .insert([mentorshipData])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Update a mentorship record.
export async function updateMentorship(id, updates) {
  const { data, error } = await supabase
    .from('mentorships')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Get sessions for a mentorship.
export async function getMentorshipSessions(mentorshipId) {
  const { data, error } = await supabase
    .from('mentorship_sessions')
    .select('*')
    .eq('mentorship_id', mentorshipId)
    .order('session_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Create a mentorship session.
export async function createMentorshipSession(sessionData) {
  const { data, error } = await supabase
    .from('mentorship_sessions')
    .insert([sessionData])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Update a mentorship session.
export async function updateMentorshipSession(id, updates) {
  const { data, error } = await supabase
    .from('mentorship_sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Delete a mentorship session.
export async function deleteMentorshipSession(id) {
  const { error } = await supabase
    .from('mentorship_sessions')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Get all weekly tasks.
export async function getAllWeeklyTasks() {
  const { data, error } = await supabase
    .from('weekly_tasks')
    .select('*, users!weekly_tasks_assigned_by_fkey(id, full_name)')
    .order('deadline', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get tasks with upcoming deadlines.
export async function getActiveWeeklyTasks() {
  const { data, error } = await supabase
    .from('weekly_tasks')
    .select('*, users!weekly_tasks_assigned_by_fkey(id, full_name)')
    .gte('deadline', new Date().toISOString())
    .order('deadline', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

// Get a weekly task by ID.
export async function getWeeklyTaskById(id) {
  const { data, error } = await supabase
    .from('weekly_tasks')
    .select('*, users!weekly_tasks_assigned_by_fkey(id, full_name)')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Create a weekly task.
export async function createWeeklyTask(taskData) {
  const { data, error } = await supabase
    .from('weekly_tasks')
    .insert([taskData])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Update a weekly task.
export async function updateWeeklyTask(id, updates) {
  const { data, error } = await supabase
    .from('weekly_tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Delete a weekly task.
export async function deleteWeeklyTask(id) {
  const { error } = await supabaseAdmin
    .from('weekly_tasks')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Get all submissions for a task.
export async function getTaskSubmissions(taskId) {
  const { data, error } = await supabase
    .from('task_submissions')
    .select(
      `
      *,
      users!task_submissions_user_id_fkey(
        id, full_name, avatar_url,
        member_profiles(student_id, academic_session)
      )
    `
    )
    .eq('task_id', taskId)
    .order('submitted_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get all task submissions by a user.
export async function getUserTaskSubmissions(userId) {
  const { data, error } = await supabase
    .from('task_submissions')
    .select('*, weekly_tasks(id, title, deadline, difficulty)')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get a user's submission for a specific task.
export async function getUserTaskSubmission(taskId, userId) {
  const { data, error } = await supabase
    .from('task_submissions')
    .select('*')
    .eq('task_id', taskId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// Create a task submission.
export async function createTaskSubmission(submissionData) {
  const { data, error } = await supabase
    .from('task_submissions')
    .insert([submissionData])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Update a task submission.
export async function updateTaskSubmission(id, userId, updates) {
  const { data, error } = await supabase
    .from('task_submissions')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Review a task submission with feedback.
export async function reviewTaskSubmission(id, reviewedBy, status, feedback) {
  const { data, error } = await supabase
    .from('task_submissions')
    .update({ reviewed_by: reviewedBy, status, feedback })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Get all resources for admin view.
export async function getResourcesAdmin() {
  const { data, error } = await supabaseAdmin
    .from('resources')
    .select('*, users!resources_created_by_fkey(id, full_name, avatar_url)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  const resources = data ?? [];

  const stats = {
    total: resources.length,
    featured: resources.filter((r) => r.is_featured).length,
    free: resources.filter((r) => r.is_free).length,
    paid: resources.filter((r) => !r.is_free).length,
    totalUpvotes: resources.reduce((s, r) => s + (r.upvotes ?? 0), 0),
    byType: resources.reduce((acc, r) => {
      acc[r.resource_type] = (acc[r.resource_type] ?? 0) + 1;
      return acc;
    }, {}),
  };

  return { resources, stats };
}

// Get all resources.
export async function getAllResources() {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get resources by category.
export async function getResourcesByCategory(category) {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('category', category)
    .order('upvotes', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get resources by difficulty level.
export async function getResourcesByDifficulty(difficulty) {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('difficulty', difficulty)
    .order('upvotes', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get featured resources.
export async function getFeaturedResources() {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('is_featured', true)
    .order('upvotes', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get free resources.
export async function getFreeResources() {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('is_free', true)
    .order('upvotes', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Create a resource.
export async function createResource(resourceData) {
  const { data, error } = await supabase
    .from('resources')
    .insert([resourceData])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Update a resource.
export async function updateResource(id, updates) {
  const { data, error } = await supabase
    .from('resources')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Increment upvote count for a resource.
export async function upvoteResource(id) {
  const { data: resource } = await supabase
    .from('resources')
    .select('upvotes')
    .eq('id', id)
    .single();
  if (resource) {
    await supabase
      .from('resources')
      .update({ upvotes: (resource.upvotes || 0) + 1 })
      .eq('id', id);
  }
  return { success: true };
}

// Delete a resource.
export async function deleteResource(id) {
  const { error } = await supabaseAdmin.from('resources').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Get all roadmaps.
export async function getAllRoadmaps() {
  const { data, error } = await supabase
    .from('roadmaps')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get published roadmaps, sorted by view count (includes content for stage data).
export async function getPublishedRoadmaps() {
  const { data, error } = await supabase
    .from('roadmaps')
    .select(
      'id, slug, title, description, category, difficulty, thumbnail, estimated_duration, prerequisites, content, views, is_featured, created_at'
    )
    .eq('status', 'published')
    .order('views', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get a published roadmap by slug.
export async function getRoadmapBySlug(slug) {
  const { data, error } = await supabase
    .from('roadmaps')
    .select('*, users!roadmaps_created_by_fkey(id, full_name, avatar_url)')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Get published roadmaps by category, sorted by view count (includes content).
export async function getRoadmapsByCategory(category) {
  const { data, error } = await supabase
    .from('roadmaps')
    .select(
      'id, slug, title, description, category, difficulty, thumbnail, estimated_duration, prerequisites, content, views, is_featured, created_at'
    )
    .eq('category', category)
    .eq('status', 'published')
    .order('views', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Create a roadmap.
export async function createRoadmap(roadmapData) {
  const { data, error } = await supabase
    .from('roadmaps')
    .insert([roadmapData])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Update a roadmap.
export async function updateRoadmap(id, updates) {
  const { data, error } = await supabase
    .from('roadmaps')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Delete a roadmap.
export async function deleteRoadmap(id) {
  const { error } = await supabaseAdmin.from('roadmaps').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Get all gallery items for admin view.
export async function getGalleryAdmin() {
  const { data, error } = await supabaseAdmin
    .from('gallery_items')
    .select(
      `*, 
       users!gallery_items_uploaded_by_fkey(id, full_name, avatar_url),
       events!gallery_items_event_id_fkey(id, title, slug)`
    )
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  const items = data ?? [];

  const stats = {
    total: items.length,
    images: items.filter((i) => i.type === 'image').length,
    videos: items.filter((i) => i.type === 'video').length,
    featured: items.filter((i) => i.is_featured).length,
    categories: [...new Set(items.map((i) => i.category).filter(Boolean))]
      .length,
    linkedEvents: [...new Set(items.map((i) => i.event_id).filter(Boolean))]
      .length,
  };

  return { items, stats };
}

// Get all gallery items.
export async function getAllGalleryItems() {
  const { data, error } = await supabaseAdmin
    .from('gallery_items')
    .select('*')
    .order('display_order');
  if (error) throw new Error(error.message);
  return data;
}

// Get featured gallery items.
export async function getFeaturedGalleryItems() {
  const { data, error } = await supabase
    .from('gallery_items')
    .select('*')
    .eq('is_featured', true)
    .order('display_order');
  if (error) throw new Error(error.message);
  return data;
}

// Get gallery items for an event.
export async function getGalleryItemsByEvent(eventId) {
  const { data, error } = await supabase
    .from('gallery_items')
    .select('*')
    .eq('event_id', eventId)
    .not('event_id', 'is', null)
    .order('display_order');
  if (error) throw new Error(error.message);
  return data ?? [];
}

// Get gallery items by category.
export async function getGalleryItemsByCategory(category) {
  const { data, error } = await supabase
    .from('gallery_items')
    .select('*')
    .eq('category', category)
    .order('display_order');
  if (error) throw new Error(error.message);
  return data;
}

// Add a gallery item.
export async function addGalleryItem(itemData) {
  const { data, error } = await supabase
    .from('gallery_items')
    .insert([itemData])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Update a gallery item.
export async function updateGalleryItem(id, updates) {
  const { data, error } = await supabase
    .from('gallery_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Delete a gallery item.
export async function deleteGalleryItem(id) {
  const { error } = await supabaseAdmin
    .from('gallery_items')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Get all join requests.
export async function getAllJoinRequests() {
  const { data, error } = await supabaseAdmin
    .from('join_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get pending join requests.
export async function getPendingJoinRequests() {
  const { data, error } = await supabaseAdmin
    .from('join_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get a join request by ID.
export async function getJoinRequestById(id) {
  const { data, error } = await supabase
    .from('join_requests')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Get a join request by email.
export async function getJoinRequestByEmail(email) {
  const { data, error } = await supabase
    .from('join_requests')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Create a join request.
export async function createJoinRequest(requestData) {
  const { data, error } = await supabase
    .from('join_requests')
    .insert([requestData])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Approve a join request.
export async function approveJoinRequest(id, reviewedBy) {
  const { data, error } = await supabase
    .from('join_requests')
    .update({
      status: 'approved',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Reject a join request.
export async function rejectJoinRequest(id, reviewedBy, rejectionReason) {
  const { data, error } = await supabase
    .from('join_requests')
    .update({
      status: 'rejected',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      rejection_reason: rejectionReason,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Get pending guest account applications (new sign-ups awaiting admin review).
// Returns users with account_status = 'pending' (no member profile = pure guest applicants).
// Also includes 'rejected' users who wrote their own appeal message.
export async function getPendingGuestApplications() {
  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select(
      'id, email, full_name, avatar_url, account_status, status_reason, status_changed_by, status_changed_at, last_login, created_at'
    )
    .in('account_status', ['pending', 'rejected'])
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  if (!users || users.length === 0) return [];

  const userIds = users.map((u) => u.id);

  // Exclude users who already have a member_profiles (they belong to Membership section)
  const { data: profiles = [] } = await supabaseAdmin
    .from('member_profiles')
    .select('user_id')
    .in('user_id', userIds);

  const profiledIds = new Set((profiles ?? []).map((p) => p.user_id));

  return users
    .filter((u) => {
      if (profiledIds.has(u.id)) return false;
      // Include all pending users
      if (u.account_status === 'pending') return true;
      // Include rejected users only if they wrote their own appeal
      if (u.account_status === 'rejected' && u.status_changed_by === u.id)
        return true;
      return false;
    })
    .map((u) => {
      const initials =
        u.full_name
          ?.split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase() ?? '?';

      return {
        id: u.id,
        name: u.full_name,
        email: u.email,
        avatar:
          u.avatar_url?.startsWith('http') || u.avatar_url?.startsWith('/')
            ? u.avatar_url
            : u.avatar_url && u.avatar_url.length > 5
              ? `/api/image/${u.avatar_url}`
              : initials,
        joinedAt: u.created_at,
        lastLogin: u.last_login,
        statusReason: u.status_reason,
        statusChangedBy: u.status_changed_by,
        accountStatus: u.account_status,
      };
    });
}

// Get all contact form submissions.
export async function getAllContactSubmissions() {
  const { data, error } = await supabaseAdmin
    .from('contact_submissions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get new/unread contact submissions.
export async function getNewContactSubmissions() {
  const { data, error } = await supabase
    .from('contact_submissions')
    .select('*')
    .eq('status', 'new')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get a contact submission by ID.
export async function getContactSubmissionById(id) {
  const { data, error } = await supabase
    .from('contact_submissions')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Create a contact form submission.
export async function createContactSubmission(submissionData) {
  const { data, error } = await supabase
    .from('contact_submissions')
    .insert([submissionData])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Update status of a contact submission.
export async function updateContactSubmissionStatus(
  id,
  status,
  repliedBy = null
) {
  const updates = {
    status,
    ...(repliedBy && {
      replied_by: repliedBy,
      replied_at: new Date().toISOString(),
    }),
  };
  const { data, error } = await supabase
    .from('contact_submissions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Get all budget entries.
export async function getAllBudgetEntries() {
  const { data, error } = await supabase
    .from('budget_entries')
    .select(
      '*, events(id, title), users!budget_entries_created_by_fkey(id, full_name)'
    )
    .order('transaction_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get budget entries for an event.
export async function getBudgetEntriesByEvent(eventId) {
  const { data, error } = await supabase
    .from('budget_entries')
    .select('*, users!budget_entries_created_by_fkey(id, full_name)')
    .eq('event_id', eventId)
    .order('transaction_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get budget entries by type.
export async function getBudgetEntriesByType(type) {
  const { data, error } = await supabase
    .from('budget_entries')
    .select('*, events(id, title)')
    .eq('entry_type', type)
    .order('transaction_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Get aggregate budget summary.
export async function getBudgetSummary() {
  const [{ data: income }, { data: expenses }] = await Promise.all([
    supabase.from('budget_entries').select('amount').eq('entry_type', 'income'),
    supabase
      .from('budget_entries')
      .select('amount')
      .eq('entry_type', 'expense'),
  ]);
  const totalIncome =
    income?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
  const totalExpenses =
    expenses?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
  return { totalIncome, totalExpenses, balance: totalIncome - totalExpenses };
}

// Create a budget entry.
export async function createBudgetEntry(entryData) {
  const { data, error } = await supabase
    .from('budget_entries')
    .insert([entryData])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Approve a budget entry.
export async function approveBudgetEntry(id, approvedBy) {
  const { data, error } = await supabase
    .from('budget_entries')
    .update({ approved_by: approvedBy, approved_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Delete a budget entry.
export async function deleteBudgetEntry(id) {
  const { error } = await supabaseAdmin
    .from('budget_entries')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Get all settings.
export async function getAllSettings() {
  const { data, error } = await supabaseAdmin
    .from('website_settings')
    .select('*')
    .order('category');
  if (error) throw new Error(error.message);
  return data;
}

// Get settings by category.
export async function getSettingsByCategory(category) {
  const { data, error } = await supabaseAdmin
    .from('website_settings')
    .select('key, value')
    .eq('category', category);
  if (error) throw new Error(error.message);
  return data;
}

// Get a single setting by key.
export async function getSetting(key) {
  const { data, error } = await supabaseAdmin
    .from('website_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.value ?? null;
}

// Insert or update a setting.
export async function upsertSetting(
  key,
  value,
  updatedBy,
  category = null,
  description = null
) {
  const { data, error } = await supabaseAdmin
    .from('website_settings')
    .upsert(
      {
        key,
        value,
        category,
        description,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Delete a setting.
export async function deleteSetting(key) {
  const { error } = await supabaseAdmin
    .from('website_settings')
    .delete()
    .eq('key', key);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Create a committee position.
export async function createCommitteePosition(positionData) {
  const { data, error } = await supabaseAdmin
    .from('committee_positions')
    .insert([positionData])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Update a committee position.
export async function updateCommitteePosition(id, updates) {
  const { data, error } = await supabaseAdmin
    .from('committee_positions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Delete a committee position.
export async function deleteCommitteePosition(id) {
  const { error } = await supabaseAdmin
    .from('committee_positions')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Delete a mentorship.
export async function deleteMentorship(id) {
  const { error } = await supabaseAdmin
    .from('mentorships')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Delete a task submission.
export async function deleteTaskSubmission(id) {
  const { error } = await supabase
    .from('task_submissions')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Increment view count for a roadmap.
export async function incrementRoadmapViews(id) {
  let newViews = 1;
  const { error } = await supabaseAdmin.rpc('increment_roadmap_views', {
    roadmap_id: id,
  });

  if (error) {
    const { data: roadmap } = await supabaseAdmin
      .from('roadmaps')
      .select('views')
      .eq('id', id)
      .single();
    if (roadmap) {
      newViews = (roadmap.views || 0) + 1;
      await supabaseAdmin
        .from('roadmaps')
        .update({ views: newViews })
        .eq('id', id);
    }
  } else {
    // Fetch live views directly after successful RPC
    const { data: current } = await supabaseAdmin
      .from('roadmaps')
      .select('views')
      .eq('id', id)
      .single();
    if (current) newViews = current.views;
  }

  return { success: true, views: newViews };
}

// Get featured roadmaps by category.
export async function getFeaturedRoadmapsByCategory(category) {
  const { data, error } = await supabase
    .from('roadmaps')
    .select(
      'id, slug, title, description, difficulty, thumbnail, estimated_duration, views'
    )
    .eq('category', category)
    .eq('status', 'published')
    .eq('is_featured', true)
    .order('views', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Toggle like on a blog post.
export async function toggleBlogPostLike(id) {
  const { data: post } = await supabase
    .from('blog_posts')
    .select('likes')
    .eq('id', id)
    .single();
  if (post) {
    const newLikes = (post.likes || 0) + 1;
    await supabaseAdmin
      .from('blog_posts')
      .update({ likes: newLikes })
      .eq('id', id);
    return { likes: newLikes };
  }
  return { likes: 0 };
}

// Get trending blog posts by views.
export async function getTrendingBlogPosts(limit = 10) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select(
      `
      id, slug, title, excerpt, thumbnail, category,
      read_time, views, likes, published_at,
      users!blog_posts_author_id_fkey(id, full_name, avatar_url)
    `
    )
    .eq('status', 'published')
    .order('views', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data;
}

// Get past published events.
export async function getPastEvents(limit = 10) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'completed')
    .lte('start_date', new Date().toISOString())
    .order('start_date', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data;
}

// Get registration count for an event.
export async function getEventRegistrationCount(eventId) {
  const { count, error } = await supabase
    .from('event_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId);
  if (error) throw new Error(error.message);
  return count || 0;
}

// Get past contests.
export async function getPastContests(limit = 10) {
  const { data, error } = await supabase
    .from('contests')
    .select('*')
    .eq('status', 'finished')
    .lte('start_time', new Date().toISOString())
    .order('start_time', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data;
}

export async function getContestParticipantCount(contestId) {
  const { count, error } = await supabase
    .from('contest_participants')
    .select('*', { count: 'exact', head: true })
    .eq('contest_id', contestId);
  if (error) throw new Error(error.message);
  return count || 0;
}

export async function getAchievementMemberCount(achievementId) {
  const { count, error } = await supabase
    .from('member_achievements')
    .select('*', { count: 'exact', head: true })
    .eq('achievement_id', achievementId);
  if (error) throw new Error(error.message);
  return count || 0;
}

export async function getMostEarnedAchievements(limit = 10) {
  const { data, error } = await supabase
    .from('achievements')
    .select('*, member_achievements(user_id)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (
    data?.map((achievement) => ({
      ...achievement,
      memberCount: achievement.member_achievements?.length || 0,
    })) || []
  );
}

export async function getPlatformStatistics() {
  try {
    const [userCount, memberCount, eventCount, contestCount] =
      await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase
          .from('member_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('approved', true),
        supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .in('status', ['upcoming', 'ongoing', 'completed']),
        supabase.from('contests').select('*', { count: 'exact', head: true }),
      ]);

    return {
      totalUsers: userCount.count || 0,
      approvedMembers: memberCount.count || 0,
      totalEvents: eventCount.count || 0,
      totalContests: contestCount.count || 0,
    };
  } catch (error) {
    console.error('Error fetching platform statistics:', error);
    return {
      totalUsers: 0,
      approvedMembers: 0,
      totalEvents: 0,
      totalContests: 0,
    };
  }
}

export async function getDashboardMetrics() {
  try {
    const [
      newMemberCount,
      pendingJoinRequests,
      upcomingEventCount,
      unreadContacts,
    ] = await Promise.all([
      supabase
        .from('member_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('approved', false),
      supabase
        .from('join_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'upcoming')
        .gte('start_date', new Date().toISOString()),
      supabase
        .from('contact_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'new'),
    ]);

    return {
      pendingMemberApprovals: newMemberCount.count || 0,
      pendingJoinRequests: pendingJoinRequests.count || 0,
      upcomingEvents: upcomingEventCount.count || 0,
      unreadContacts: unreadContacts.count || 0,
    };
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return {
      pendingMemberApprovals: 0,
      pendingJoinRequests: 0,
      upcomingEvents: 0,
      unreadContacts: 0,
    };
  }
}

export async function searchUsers(query) {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, avatar_url, account_status, created_at')
    .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(20);
  if (error) throw new Error(error.message);
  return data;
}

export async function searchBlogPosts(query) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select(
      `
      id, slug, title, excerpt, category, published_at,
      users!blog_posts_author_id_fkey(id, full_name)
    `
    )
    .eq('status', 'published')
    .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%`)
    .limit(20);
  if (error) throw new Error(error.message);
  return data;
}

export async function searchResources(query) {
  const { data, error } = await supabase
    .from('resources')
    .select('id, title, description, category, difficulty, resource_type')
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .limit(20);
  if (error) throw new Error(error.message);
  return data;
}

export async function bulkUpdateSubmissionStatus(taskId, ids, newStatus) {
  const { error } = await supabase
    .from('task_submissions')
    .update({ status: newStatus })
    .eq('task_id', taskId)
    .in('id', ids);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function bulkIssueCertificates(eventId, certificateData) {
  const { data, error } = await supabase
    .from('certificates')
    .insert(certificateData)
    .select();
  if (error) throw new Error(error.message);
  return data;
}

export async function getActivityLogs(limit = 50) {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*, users(id, full_name, email)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data;
}

export async function getUserActivityLogs(userId, limit = 50) {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data;
}

export async function getActivityLogsByAction(action, limit = 50) {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*, users(id, full_name)')
    .eq('action', action)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data;
}

export async function createActivityLog(
  userId,
  action,
  entityType,
  entityId,
  details = {}
) {
  const { data, error } = await supabase
    .from('activity_logs')
    .insert([
      {
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details,
      },
    ])
    .select()
    .single();
  if (error) {
    console.error('Error creating activity log:', error.message);
    return null;
  }
  return data;
}

// =============================================================================
// JOURNEY ITEMS
// =============================================================================

export async function getJourneyItemsAdmin() {
  const { data, error } = await supabaseAdmin
    .from('journey_items')
    .select('*')
    .order('display_order', { ascending: true })
    .order('year', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPublicJourneyItems() {
  const { data, error } = await supabaseAdmin
    .from('journey_items')
    .select('id, year, event, icon, description, display_order')
    .order('display_order', { ascending: true })
    .order('year', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}
