const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const NEW_DB_CONFIG = {
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.lhqbqzrghdbbmstnhple',
  password: 'JKm4wYi31O0a6sup',
  ssl: { rejectUnauthorized: false }
};

const migrationsDir = path.join(__dirname, 'supabase', 'migrations');

async function importSchema() {
  const client = new Client(NEW_DB_CONFIG);
  try {
    await client.connect();
    console.log('Connected to NEW database');

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Penting: Urutan harus sesuai (alfabetis/numerik)

    console.log(`Found ${files.length} migration files.`);

    for (const file of files) {
      console.log(`Applying migration: ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      try {
        await client.query(sql);
        console.log(`Successfully applied ${file}`);
      } catch (err) {
        console.error(`Error applying ${file}:`, err.message);
        // Kadang schema_consolidation_v1 sudah mengandung tabel yang dibuat di file lain.
        // Kita lanjut saja jika error "already exists".
        if (!err.message.includes('already exists')) {
            throw err;
        }
      }
    }

    console.log('All migrations applied successfully!');
  } catch (err) {
    console.error('Error during schema import:', err);
  } finally {
    await client.end();
  }
}

importSchema();
