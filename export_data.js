const { Client } = require('pg');
const fs = require('fs');

const OLD_DB_CONFIG = {
  host: 'db.roabklzksznmjvzmenjb.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'JKm4wYi31O0a6sup', // Menggunakan password yang diberikan user
  ssl: { rejectUnauthorized: false }
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
  // Tambahkan tabel lain jika ada
];

async function exportData() {
  const client = new Client(OLD_DB_CONFIG);
  try {
    await client.connect();
    console.log('Connected to OLD database');

    let sqlDump = '';
    
    // Matikan check constraint untuk sementara agar tidak error saat import
    sqlDump += 'SET session_replication_role = \'replica\';\n\n';

    for (const table of tablesToExport) {
      console.log(`Processing table: ${table}...`);
      const res = await client.query(`SELECT * FROM "${table}"`);
      
      if (res.rows.length === 0) {
        console.log(`Table ${table} is empty.`);
        continue;
      }

      sqlDump += `DELETE FROM "${table}";\n`; // Kosongkan dulu jika ada data lama
      
      const columns = Object.keys(res.rows[0]);
      const columnNames = columns.map(c => `"${c}"`).join(', ');

      for (const row of res.rows) {
        const values = columns.map(c => {
          const val = row[c];
          if (val === null) return 'NULL';
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
          if (val instanceof Date) return `'${val.toISOString()}'`;
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
          return val;
        }).join(', ');
        
        sqlDump += `INSERT INTO "${table}" (${columnNames}) VALUES (${values});\n`;
      }
      sqlDump += '\n';
    }

    // Nyalakan kembali check constraint
    sqlDump += 'SET session_replication_role = \'origin\';\n';

    fs.writeFileSync('data.sql', sqlDump);
    console.log('Success! Data exported to data.sql');
  } catch (err) {
    console.error('Error during export:', err);
  } finally {
    await client.end();
  }
}

exportData();
