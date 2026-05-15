import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function finalFixPermissions() {
  const sql = `
    -- Grant SELECT/INSERT/UPDATE/DELETE to authenticated users
    GRANT ALL ON TABLE mufradat_motivations TO authenticated;
    GRANT ALL ON TABLE mufradat_motivations TO anon; -- For safety if some calls are anon
    GRANT ALL ON TABLE mufradat_motivations TO service_role;
    GRANT ALL ON TABLE mufradat_motivations TO postgres;

    -- Ensure RLS policy exists and is correct
    DROP POLICY IF EXISTS "Allow all for authenticated" ON mufradat_motivations;
    CREATE POLICY "Allow all for authenticated" ON mufradat_motivations FOR ALL TO public USING (true) WITH CHECK (true);

    -- Grant usage on schema just in case
    GRANT USAGE ON SCHEMA public TO authenticated;
    GRANT USAGE ON SCHEMA public TO anon;
  `;

  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('Error fixing permissions:', error);
  } else {
    console.log('Permissions fixed for public/authenticated users');
  }
}

finalFixPermissions();
