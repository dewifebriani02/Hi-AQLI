import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function setupDatabase() {
  const sql = `
    -- Rename whatsapp_group_id to fonnte_group_id to match code expectation
    DO $$ 
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mufradat_groups' AND column_name='whatsapp_group_id') THEN
        ALTER TABLE mufradat_groups RENAME COLUMN whatsapp_group_id TO fonnte_group_id;
      ELSE
        ALTER TABLE mufradat_groups ADD COLUMN IF NOT EXISTS fonnte_group_id TEXT;
      END IF;
    END $$;
  `;

  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('Error executing SQL:', error);
  } else {
    console.log('Database setup successful: fonnte_group_id ensured');
  }
}

setupDatabase();
