import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSchema() {
  const { data, error } = await supabase
    .from('mufradat_groups')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching mufradat_groups:', error);
    return;
  }

  console.log('Columns in mufradat_groups:', Object.keys(data[0] || {}));
}

checkSchema();
