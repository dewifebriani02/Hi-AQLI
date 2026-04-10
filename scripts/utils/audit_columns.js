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

async function auditColumns() {
  console.log('--- Column Audit: halaqah_registrations ---');
  try {
    const { data, error } = await supabase.from('halaqah_registrations').select('*').limit(1);
    if (error) {
      console.error(`[ERROR] ${error.message}`);
    } else if (data && data.length > 0) {
      console.log('Columns found:', Object.keys(data[0]).join(', '));
    } else {
      console.log('No data found, cannot infer columns from select *');
      // Alternative: check via RPC if available, or just assume OK if select * didn't error
    }
  } catch (e) {
    console.error(`[EXCEPTION] ${e.message}`);
  }
}

auditColumns();
