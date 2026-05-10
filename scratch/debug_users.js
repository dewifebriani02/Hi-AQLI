require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  // 1. Get Group 1 ID
  const { data: groups } = await supabase.from('mufradat_groups').select('id, name');
  const group1 = groups.find(g => g.name === 'Grup 1');
  if (!group1) {
    console.log('Grup 1 not found');
    return;
  }
  console.log(`Found Grup 1 with ID: ${group1.id}`);

  // 2. Get all users in Group 1
  const { data: users } = await supabase.from('users').select('*').eq('mufradat_group_id', group1.id);
  console.log(`Total users in Grup 1: ${users.length}`);

  // 3. Get verified registrations
  const { data: regs } = await supabase.from('halaqah_registrations').select('*').eq('status', 'verified');
  
  const now = new Date();
  
  const analysis = users.map(u => {
    const hasReg = regs.some(r => r.user_id === u.id);
    const hasDueDate = !!u.mufradat_due_date;
    const isExpired = hasDueDate && new Date(u.mufradat_due_date) < now;
    
    return {
      name: u.full_name || u.username,
      hasReg,
      hasDueDate,
      isExpired,
      status: u.mufradat_status
    };
  });

  console.log('\nAnalysis of missing users:');
  analysis.filter(u => !u.hasReg || !u.hasDueDate || u.isExpired).forEach(u => {
    console.log(`- ${u.name}: Reg:${u.hasReg}, DueDate:${u.hasDueDate}, Expired:${u.isExpired}, Status:${u.status}`);
  });
}

debug();
