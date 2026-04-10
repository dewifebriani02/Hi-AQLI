
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  const tables = [
    'halaqahs',
    'mutabaah_logs',
    'mufradat_logs',
    'mufradat_payouts',
    'roles_admin',
    'roles_superadmin',
    'user_badges'
  ];

  console.log('Checking more tables...');
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
