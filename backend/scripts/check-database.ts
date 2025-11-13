/**
 * Script to check if database tables exist and are accessible
 * Usage: ts-node scripts/check-database.ts
 */

import { getSupabaseClient } from '../src/config/database';

async function checkDatabase() {
  const supabase = getSupabaseClient();
  
  console.log('\n🔍 Checking database tables...\n');

  const tables = [
    'users',
    'status_likes',
    'status_auto_like_config',
    'quotas',
    'view_once_captures',
    'deleted_messages',
    'autoresponder_config',
    'autoresponder_contacts',
  ];

  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ ${table}:`, {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
      } else {
        console.log(`✅ ${table}: Accessible`);
      }
    } catch (error: any) {
      console.log(`❌ ${table}: Exception -`, error.message);
    }
  }

  console.log('\n✅ Database check complete\n');
}

checkDatabase().catch(console.error);



















