import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function setupDatabase() {
  const sql = `
    -- Table for motivation messages
    CREATE TABLE IF NOT EXISTS mufradat_motivations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      content TEXT NOT NULL,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_sent_at TIMESTAMPTZ
    );

    -- Add group ID to mufradat_groups
    ALTER TABLE mufradat_groups ADD COLUMN IF NOT EXISTS whatsapp_group_id TEXT;
    
    -- Enable RLS and simple policies
    ALTER TABLE mufradat_motivations ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow all for authenticated" ON mufradat_motivations FOR ALL TO authenticated USING (true) WITH CHECK (true);
  `;

  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('Error executing SQL:', error);
  } else {
    console.log('Database setup successful');
  }
}

setupDatabase();
