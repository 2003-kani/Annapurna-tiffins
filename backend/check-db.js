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

    console.log('\n✅ CUSTOMERS (Recent):');
    const [customers] = await pool.query('SELECT id, name, phone, address FROM customers ORDER BY id DESC LIMIT 5');
    if (customers.length === 0) console.log("  (No customers yet)");
    else console.table(customers);

    console.log('\n✅ ORDERS (Recent):');
    const [orders] = await pool.query('SELECT id, customer_id, total_amount, status, created_at FROM orders ORDER BY id DESC LIMIT 5');
    if (orders.length === 0) console.log("  (No orders placed yet)");
    else console.table(orders);

    process.exit(0);
  } catch (error) {
    console.error('Database error:', error);
    process.exit(1);
  }
}

checkDb();
