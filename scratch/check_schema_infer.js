const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lhqbqzrghdbbmstnhple.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxocWJxenJnaGRiYm1zdG5ocGxlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc4ODMxMCwiZXhwIjoyMDkwMzY0MzEwfQ.xgTr2rEnVGW7u7a3ZoTvMg-P0VbEPTk0Wa3S4_kENfo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('Checking columns for halaqahs...');
  // Since we can't easily query information_schema via RPC without it being defined,
  // we'll try a regular select and look at the keys of the first object.
  const { data, error } = await supabase.from('halaqahs').select('*').limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns found:', Object.keys(data[0]));
    console.log('Sample data:', data[0]);
  } else {
    console.log('No data found in halaqahs to infer schema.');
  }
}

checkSchema();
