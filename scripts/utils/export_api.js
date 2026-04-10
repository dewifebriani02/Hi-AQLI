const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables for the OLD project
const OLD_PROJECT = {
  url: 'https://roabklzksznmjvzmenjb.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvYWJrbHprc3pubWp2em1lbmpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgxMDgzMywiZXhwIjoyMDg5Mzg2ODMzfQ.uR4LhVW75LTrciL1n6HMfZloVmVN-j7E7yevdvjh7-I'
};

const tablesToExport = [
  'users',
  'halaqahs',
  'registrations',
  'logs',
  'vouchers',
  'payouts',
  'referrals',
  'mutabaah_mufradat_logs',
  'mabar_groups',
  'mabar_participants',
  'user_badges'
];

const supabase = createClient(OLD_PROJECT.url, OLD_PROJECT.key);

async function exportData() {
  console.log('Starting export via API...');
  let sqlDump = '-- Generated via API Export\n';
  sqlDump += "SET session_replication_role = 'replica';\n\n";

  for (const table of tablesToExport) {
    console.log(`Fetching data from table: ${table}...`);
    const { data, error } = await supabase.from(table).select('*');

    if (error) {
      console.error(`Error fetching table ${table}:`, error.message);
      continue;
    }

    if (!data || data.length === 0) {
      console.log(`Table ${table} is empty.`);
      continue;
    }

    sqlDump += `DELETE FROM "${table}";\n`;
    
    const columns = Object.keys(data[0]);
    const columnNames = columns.map(c => `"${c}"`).join(', ');

    for (const row of data) {
      const values = columns.map(c => {
        const val = row[c];
        if (val === null) return 'NULL';
        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
        if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
        return val;
      }).join(', ');
      
      sqlDump += `INSERT INTO "${table}" (${columnNames}) VALUES (${values});\n`;
    }
    sqlDump += '\n';
  }

  sqlDump += "SET session_replication_role = 'origin';\n";

  fs.writeFileSync('data.sql', sqlDump);
  console.log('Success! Data exported to data.sql via API');
}

exportData();
