const { Client } = require('pg');

const config = {
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.roabklzksznmjvzmenjb',
  password: 'JKm4wYi31O0a6sup',
  ssl: { rejectUnauthorized: false }
};

const client = new Client(config);

client.connect()
  .then(() => {
    console.log('Connected to OLD via Pooler!');
    return client.end();
  })
  .catch(err => {
    console.error('Old Pooler connection failed:', err.message);
    process.exit(1);
  });
