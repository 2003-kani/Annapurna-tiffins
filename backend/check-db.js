import 'dotenv/config';
import pool from './src/db.js';

async function checkDb() {
  try {
    console.log('Checking database connection...\n');
    
    const [tables] = await pool.query('SHOW TABLES');
    console.log('✅ TABLES FOUND:');
    tables.forEach(t => console.log(`  - ${Object.values(t)[0]}`));
    
    console.log('\n✅ MENU ITEMS (Sample Data):');
    const [items] = await pool.query('SELECT id, name, price FROM menu_items LIMIT 5');
    console.table(items);

    console.log('\n✅ RESTAURANTS (Sample Data):');
    const [restaurants] = await pool.query('SELECT code, name FROM restaurants');
    console.table(restaurants);

    process.exit(0);
  } catch (error) {
    console.error('Database error:', error);
    process.exit(1);
  }
}

checkDb();
