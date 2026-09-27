const db = require('./pool');

async function seedPayablesData() {
  try {
    console.log('Seeding Accounts Payable & Credit Terms data...');

    // Fetch 25 active transactions across users
    const txnsRes = await db.query(`
      SELECT t.id, t.amount, t.txn_date, v.name as vendor_name
      FROM transactions t
      LEFT JOIN vendors v ON t.vendor_id = v.id
      WHERE t.is_deleted = false
      ORDER BY t.txn_date DESC
      LIMIT 25
    `);

    const now = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];

    const plans = [
      // Overdue items
      { status: 'pending', terms: 15, daysFromNow: -5, paidRatio: 0 },   // Overdue by 5 days
      { status: 'pending', terms: 30, daysFromNow: -12, paidRatio: 0 },  // Overdue by 12 days
      { status: 'partially_paid', terms: 45, daysFromNow: -35, paidRatio: 0.4 }, // Overdue by 35 days (partially paid)
      { status: 'pending', terms: 60, daysFromNow: -75, paidRatio: 0 },  // Overdue by 75 days (critical)
      { status: 'pending', terms: 90, daysFromNow: -95, paidRatio: 0 },  // Overdue >90 days

      // Due soon items (within 7 days)
      { status: 'pending', terms: 30, daysFromNow: 2, paidRatio: 0 },    // Due in 2 days (urgent)
      { status: 'pending', terms: 15, daysFromNow: 4, paidRatio: 0 },    // Due in 4 days
      { status: 'partially_paid', terms: 30, daysFromNow: 6, paidRatio: 0.5 }, // Due in 6 days (half paid)

      // Upcoming due (8-30 days)
      { status: 'pending', terms: 30, daysFromNow: 11, paidRatio: 0 },
      { status: 'pending', terms: 45, daysFromNow: 18, paidRatio: 0 },
      { status: 'partially_paid', terms: 30, daysFromNow: 24, paidRatio: 0.6 },

      // Due in 31-60 days
      { status: 'pending', terms: 60, daysFromNow: 38, paidRatio: 0 },
      { status: 'pending', terms: 60, daysFromNow: 52, paidRatio: 0 },

      // Additional partially paid
      { status: 'partially_paid', terms: 30, daysFromNow: 8, paidRatio: 0.75 },
      { status: 'partially_paid', terms: 45, daysFromNow: -8, paidRatio: 0.3 }
    ];

    let count = 0;
    for (let i = 0; i < txnsRes.rows.length && i < plans.length; i++) {
      const txn = txnsRes.rows[i];
      const plan = plans[i];
      const totalAmount = parseFloat(txn.amount);

      const targetDueDate = new Date(now.getTime() + plan.daysFromNow * 86400000);
      const amountPaid = Math.round(totalAmount * plan.paidRatio * 100) / 100;

      await db.query(`
        UPDATE transactions
        SET payment_status = $1,
            credit_terms_days = $2,
            due_date = $3,
            amount_paid = $4,
            payment_date = $5
        WHERE id = $6
      `, [
        plan.status,
        plan.terms,
        formatDate(targetDueDate),
        amountPaid,
        plan.paidRatio > 0 ? formatDate(new Date(now.getTime() - 2 * 86400000)) : null,
        txn.id
      ]);
      count++;
    }

    console.log(`Successfully seeded ${count} credit-term payable transactions with due dates & aging buckets!`);
  } catch (err) {
    console.error('Error seeding payables:', err);
  } finally {
    process.exit(0);
  }
}

seedPayablesData();
