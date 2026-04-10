const { Client } = require('pg');

const config = {
  host: '2406:da18:243:740d:5e1d:c55:c20c:5289',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'JKm4wYi31O0a6sup',
  ssl: { rejectUnauthorized: false }
};

const client = new Client(config);

client.connect()
  .then(() => {
    console.log('Connected via IPv6!');
    return client.end();
  })
  .catch(err => {
    console.error('IPv6 connection failed:', err.message);
    process.exit(1);
  });
