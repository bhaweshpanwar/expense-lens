const path = require('path');
const fs = require('fs');
require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const { pool } = require('../backend/src/db/pool');
const bcrypt = require('../backend/node_modules/bcryptjs');

async function seed() {
  const client = await pool.connect();

  try {
    console.log('--- Starting Database Seeding ---');

    // Read dummy_data.json
    const dataPath = path.join(__dirname, 'dummy_data.json');
    if (!fs.existsSync(dataPath)) {
      throw new Error(`Data file not found at ${dataPath}. Please run generate_dummy_json.js first.`);
    }
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    await client.query('BEGIN');

    // 1. Resolve or Create User
    const targetEmail = process.argv[2] || data.user.email || 'test@gmail.com';
    let userResult = await client.query('SELECT id, email, name FROM users WHERE email = $1', [targetEmail]);

    let userId;
    if (userResult.rows.length > 0) {
      userId = userResult.rows[0].id;
      console.log(`Using existing user: ${userResult.rows[0].name} (${targetEmail}) [UUID: ${userId}]`);
    } else {
      // Check if any user exists
      const anyUser = await client.query('SELECT id, email, name FROM users LIMIT 1');
      if (anyUser.rows.length > 0 && !process.argv[2]) {
        userId = anyUser.rows[0].id;
        console.log(`Using existing primary user: ${anyUser.rows[0].name} (${anyUser.rows[0].email}) [UUID: ${userId}]`);
      } else {
        const hashedPassword = await bcrypt.hash(data.user.password || 'password123', 10);
        const newUser = await client.query(
          `INSERT INTO users (name, email, password_hash, business_name, currency, language_pref)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, email, name`,
          [
            data.user.name || 'Test User',
            targetEmail,
            hashedPassword,
            data.user.business_name || 'Indore Electronics Hub',
            data.user.currency || 'INR',
            data.user.language_pref || 'en'
          ]
        );
        userId = newUser.rows[0].id;
        console.log(`Created new demo user: ${newUser.rows[0].name} (${targetEmail}) [UUID: ${userId}]`);
      }
    }

    // 2. Clean existing data for this user to ensure clean state
    console.log('Cleaning existing records for this user...');
    await client.query('DELETE FROM transactions WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM budgets WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM savings_goals WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM vendors WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM categories WHERE user_id = $1', [userId]);

    // 3. Insert Categories
    console.log(`Inserting ${data.categories.length} categories...`);
    const categoryMap = {}; // name -> uuid
    for (const cat of data.categories) {
      const res = await client.query(
        `INSERT INTO categories (user_id, name, type, icon, is_default)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id, name`,
        [userId, cat.name, cat.type, cat.icon || null]
      );
      categoryMap[res.rows[0].name] = res.rows[0].id;
    }

    // 4. Insert Vendors
    console.log(`Inserting ${data.vendors.length} vendors...`);
    const vendorMap = {}; // name -> uuid
    for (const v of data.vendors) {
      const defaultCatId = v.default_category ? categoryMap[v.default_category] : null;
      const normalized = v.name.toLowerCase().trim();
      const res = await client.query(
        `INSERT INTO vendors (user_id, name, normalized_name, default_category_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name`,
        [userId, v.name, normalized, defaultCatId]
      );
      vendorMap[res.rows[0].name] = res.rows[0].id;
    }

    // 5. Insert Transactions
    console.log(`Inserting ${data.transactions.length} transactions...`);
    let insertedTxnCount = 0;
    for (const txn of data.transactions) {
      const catId = txn.category ? categoryMap[txn.category] : null;
      const vendorId = txn.vendor ? (vendorMap[txn.vendor] || null) : null;

      if (txn.type === 'expense' && !catId) {
        throw new Error(`Expense transaction missing valid category: "${txn.category}" (txn_date: ${txn.txn_date})`);
      }

      await client.query(
        `INSERT INTO transactions (user_id, type, amount, currency, category_id, vendor_id, txn_date, notes, source)
         VALUES ($1, $2, $3, 'INR', $4, $5, $6, $7, $8)`,
        [
          userId,
          txn.type,
          txn.amount,
          catId,
          vendorId,
          txn.txn_date,
          txn.notes || null,
          txn.source || 'manual'
        ]
      );
      insertedTxnCount++;
    }

    // 6. Insert Budgets
    console.log(`Inserting ${data.budgets.length} budgets...`);
    for (const b of data.budgets) {
      const catId = b.category ? categoryMap[b.category] : null;
      await client.query(
        `INSERT INTO budgets (user_id, category_id, limit_amount, period, start_date, is_active)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [userId, catId, b.limit_amount, b.period || 'monthly', b.start_date || '2026-01-01']
      );
    }

    // 7. Insert Savings Goals
    console.log(`Inserting ${data.savings_goals.length} savings goals...`);
    for (const sg of data.savings_goals) {
      await client.query(
        `INSERT INTO savings_goals (user_id, target_amount, monthly_save_amount, target_date, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, sg.target_amount, sg.monthly_save_amount, sg.target_date || null, sg.status || 'active']
      );
    }

    await client.query('COMMIT');

    console.log('\n=========================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY');
    console.log('=========================================');
    console.table([
      { Entity: 'Target User', Count: 1, Details: targetEmail },
      { Entity: 'Categories', Count: Object.keys(categoryMap).length },
      { Entity: 'Vendors', Count: Object.keys(vendorMap).length },
      { Entity: 'Transactions', Count: insertedTxnCount },
      { Entity: 'Budgets', Count: data.budgets.length },
      { Entity: 'Savings Goals', Count: data.savings_goals.length }
    ]);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed, transaction rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
