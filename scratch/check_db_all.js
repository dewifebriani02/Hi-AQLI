const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lhqbqzrghdbbmstnhple.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxocWJxenJnaGRiYm1zdG5ocGxlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc4ODMxMCwiZXhwIjoyMDkwMzY0MzEwfQ.xgTr2rEnVGW7u7a3ZoTvMg-P0VbEPTk0Wa3S4_kENfo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHalaqahs() {
  console.log('Fetching ALL halaqahs...');
  const { data, error } = await supabase
    .from('halaqahs')
    .select('*');

  if (error) {
    console.error('Error fetching halaqahs:', error);
    return;
  }

  console.log(`Found ${data.length} halaqahs.`);
  data.forEach(h => {
    console.log(`- ID: ${h.id}, Title: ${h.title}, Program Type: ${h.program_type}`);
  });
}

checkHalaqahs();
