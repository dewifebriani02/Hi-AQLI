
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role to bypass RLS for checking tables
);

async function checkTables() {
  const tables = [
    'users',
    'roles_admin',
    'roles_superadmin',
    'halaqah_registrations',
    'vouchers',
    'voucher_redemptions',
    'mufradat_groups',
    'mufradat_payouts',
    'quiz_attempts'
  ];

  console.log('Checking tables...');
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      if (error.code === '42P01') {
        console.log(`[MISSING] Table "${table}" does not exist.`);
      } else {
        console.log(`[ERROR] Table "${table}": ${error.message} (${error.code})`);
      }
    } else {
      console.log(`[OK] Table "${table}" exists.`);
    }
  }
}

checkTables();
