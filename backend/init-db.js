import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function init() {
  try {
    console.log('Connecting to MySQL...');
    // Connect without database selected
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'annapurna_tiffins',
      ssl: {
        rejectUnauthorized: false
      },
      multipleStatements: true // Required to run the entire SQL file
    });

    console.log('Connected successfully!');

    // Read schema.sql from the database folder
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Creating database and tables from schema.sql...');
    await connection.query(schemaSql);
    
    console.log('Database initialized successfully! You can now start the server.');
    await connection.end();
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

init();
