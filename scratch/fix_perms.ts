import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixPermissions() {
  const sql = `
    -- Ensure service_role has full access
    GRANT ALL ON TABLE mufradat_motivations TO service_role;
    GRANT ALL ON TABLE mufradat_motivations TO postgres;
    
    -- Also allow authenticated users to read/write for the UI
    DROP POLICY IF EXISTS "Allow all for authenticated" ON mufradat_motivations;
    CREATE POLICY "Allow all for authenticated" ON mufradat_motivations FOR ALL TO authenticated USING (true) WITH CHECK (true);
    
    -- Make sure it's not bypassable
    ALTER TABLE mufradat_motivations FORCE ROW LEVEL SECURITY;
  `;

  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('Error fixing permissions:', error);
  } else {
    console.log('Permissions fixed');
  }
}

fixPermissions();
