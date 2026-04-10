const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditTables() {
  const tablesToCheck = [
    'users',
    'mutabaah_logs',
    'halaqahs',
    'halaqah_registrations',
    'roles_admin',
    'roles_superadmin',
    'vouchers',
    'voucher_redemptions',
    'mufradat_groups',
    'mufradat_reports',
    'campaigns',
    'donations'
  ];

  console.log('--- Database Table Audit ---');
  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        if (error.code === '42P01') {
          console.error(`[MISSING] Table "${table}" DOES NOT EXIST.`);
        } else {
          console.error(`[ERROR] Table "${table}": ${error.message} (Code: ${error.code})`);
        }
      } else {
        console.log(`[OK] Table "${table}" exists.`);
      }
    } catch (e) {
      console.error(`[EXCEPTION] Table "${table}": ${e.message}`);
    }
  }
}

auditTables();
