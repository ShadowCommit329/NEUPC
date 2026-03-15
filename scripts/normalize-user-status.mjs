/**
 * @file Normalize account_status values in the users table
 * Converts 'inActive' (capital I) to 'inactive' (lowercase) for consistency
 * with query filters and application logic.
 *
 * Usage: node scripts/normalize-user-status.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function normalizeStatusValues() {
  console.log('🔄 Normalizing user status values...\n');

  try {
    // Get all users with non-lowercase status values
    const { data: usersToFix, error: fetchError } = await supabase
      .from('users')
      .select('id, email, full_name, account_status')
      .in('account_status', [
        'inActive',
        'Inactive',
        'INACTIVE',
        'Pending',
        'Suspended',
        'Banned',
        'Locked',
        'Rejected',
      ]);

    if (fetchError) {
      console.error('❌ Error fetching users:', fetchError.message);
      process.exit(1);
    }

    if (!usersToFix || usersToFix.length === 0) {
      console.log('✅ All status values are already lowercase!');
      process.exit(0);
    }

    console.log(
      `Found ${usersToFix.length} users with non-standard status values:\n`
    );

    // Count by status
    const statusCounts = {};
    usersToFix.forEach((user) => {
      statusCounts[user.account_status] =
        (statusCounts[user.account_status] || 0) + 1;
    });

    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  • ${status}: ${count} users`);
    });

    // Create update operations
    const updates = usersToFix.map((user) => ({
      id: user.id,
      account_status: user.account_status.toLowerCase(),
    }));

    console.log(`\n📝 Updating ${updates.length} records to lowercase...\n`);

    // Batch update in chunks of 100
    const chunkSize = 100;
    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);

      const { error: updateError } = await supabase
        .from('users')
        .upsert(chunk, { onConflict: 'id' });

      if (updateError) {
        console.error(
          `❌ Error updating batch ${i / chunkSize + 1}:`,
          updateError.message
        );
        process.exit(1);
      }

      console.log(
        `✓ Updated ${Math.min(i + chunkSize, updates.length)}/${updates.length} records`
      );
    }

    console.log('\n✅ Status normalization complete!');
    console.log('\nSummary:');
    console.log(`  • Total records updated: ${updates.length}`);
    console.log(`  • All status values are now lowercase`);
    console.log(`  • Admin page will now display all statuses correctly`);
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    process.exit(1);
  }
}

normalizeStatusValues();
