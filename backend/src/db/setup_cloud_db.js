const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool } = require('./pool');

async function setupCloudDatabase() {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting Cloud Database Initialization for ExpenseLens...\n');

    // 1. Run Base Schema (if fresh database)
    const schemaPath = path.resolve(__dirname, '../../../schema.sql');
    if (fs.existsSync(schemaPath)) {
      const tableCheck = await client.query("SELECT to_regclass('public.users') as exists;");
      if (!tableCheck.rows[0]?.exists) {
        console.log('📦 Fresh database detected. Applying base schema (schema.sql)...');
        const baseSchemaSql = fs.readFileSync(schemaPath, 'utf8');
        await client.query(baseSchemaSql);
        console.log('✅ Base tables and views created successfully.');
      } else {
        console.log('ℹ️ Base tables already exist. Skipping base schema creation.');
      }
    } else {
      console.warn('⚠️ schema.sql not found at', schemaPath);
    }

    // 2. Run Migration 002 (GST Intelligence)
    const mig002Path = path.resolve(__dirname, 'migrations/002_gst_intelligence.sql');
    if (fs.existsSync(mig002Path)) {
      console.log('📦 Applying Migration 002 (GST Intelligence)...');
      const mig002Sql = fs.readFileSync(mig002Path, 'utf8');
      await client.query(mig002Sql);
      console.log('✅ Migration 002 applied successfully.');
    }

    // 3. Run Migration 003 (Accounts Payable & Udhaari)
    const mig003Path = path.resolve(__dirname, 'migrations/003_accounts_payable.sql');
    if (fs.existsSync(mig003Path)) {
      console.log('📦 Applying Migration 003 (Accounts Payable & Udhaari)...');
      const mig003Sql = fs.readFileSync(mig003Path, 'utf8');
      await client.query(mig003Sql);
      console.log('✅ Migration 003 applied successfully.');
    }

    // 4. Ensure Default Demo User exists (sharma@hardware.com / password123)
    console.log('\n👤 Checking default demo user account...');
    const userCheck = await client.query('SELECT id, email FROM users WHERE email = $1', ['sharma@hardware.com']);

    let userId;
    if (userCheck.rows.length === 0) {
      const passwordHash = await bcrypt.hash('password123', 10);
      const userRes = await client.query(
        `INSERT INTO users (name, email, password_hash, business_name, currency, language_pref)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        ['Ramesh Sharma', 'sharma@hardware.com', passwordHash, "Sharma's Hardware & Electricals", 'INR', 'en']
      );
      userId = userRes.rows[0].id;
      console.log('✅ Created demo user: sharma@hardware.com / password123');
    } else {
      userId = userCheck.rows[0].id;
      console.log('ℹ️ Demo user sharma@hardware.com already exists.');
    }

    // 5. Ensure Default Standard MSME Categories exist for this user
    const defaultCategories = [
      { name: 'Raw Materials', type: 'expense', icon: 'Package' },
      { name: 'Machinery & Tools', type: 'expense', icon: 'Wrench' },
      { name: 'Office Supplies', type: 'expense', icon: 'Folder' },
      { name: 'Telecom & Utilities', type: 'expense', icon: 'Zap' },
      { name: 'Logistics & Freight', type: 'expense', icon: 'Truck' },
      { name: 'Rent & Real Estate', type: 'expense', icon: 'Building' },
      { name: 'Packaging Materials', type: 'expense', icon: 'Box' },
      { name: 'Food & Beverages', type: 'expense', icon: 'Coffee' },
      { name: 'Sales Revenue', type: 'income', icon: 'TrendingUp' }
    ];

    for (const cat of defaultCategories) {
      await client.query(
        `INSERT INTO categories (user_id, name, type, icon, is_default)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (user_id, name, type) DO NOTHING`,
        [userId, cat.name, cat.type, cat.icon]
      );
    }
    console.log('✅ Standard MSME business categories verified.');

    console.log('\n🎉 Cloud Database Setup Complete! Your database is 100% ready for production.');
  } catch (err) {
    console.error('\n❌ Database setup error:', err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

setupCloudDatabase();
