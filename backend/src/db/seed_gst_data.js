const db = require('./pool');
const { calculateGst } = require('../utils/gstCalculator');

async function seedGstData() {
  try {
    console.log('Resetting and seeding GST test data...');

    // 0. Reset any previous GST fields
    await db.query(`
      UPDATE transactions
      SET is_gst_bill = false,
          gst_rate = 0,
          taxable_amount = NULL,
          cgst_amount = 0,
          sgst_amount = 0,
          igst_amount = 0,
          vendor_gstin = NULL,
          itc_eligible = true
    `);

    // 1. Assign GSTINs to major vendors
    const vendorGstins = [
      { name: 'Airtel Business', gstin: '27AAACR7148Q1ZV' },
      { name: 'Reliance Jio Enterprise', gstin: '27AAACL1234B1Z2' },
      { name: 'Indore Electronics Wholesale Hub', gstin: '23AACCI1234A1Z8' },
      { name: 'Global Semi-Conductors Ltd', gstin: '27AAACG9876C1Z4' },
      { name: 'Rajesh Electricals', gstin: '23AABPR4321D1Z1' },
      { name: 'City Power Solutions', gstin: '23AACCC5555E1Z9' }
    ];

    for (const v of vendorGstins) {
      await db.query(
        `UPDATE vendors SET gstin = $1 WHERE name ILIKE $2`,
        [v.gstin, `%${v.name}%`]
      );
    }

    // 2. Fetch up to 40 active transactions to convert into GST invoices across all categories
    const txnsRes = await db.query(`
      SELECT t.id, t.amount, c.name as category_name, v.name as vendor_name, v.gstin as vendor_gstin
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN vendors v ON t.vendor_id = v.id
      WHERE t.is_deleted = false
      ORDER BY t.txn_date DESC
      LIMIT 40
    `);

    let count = 0;
    for (const txn of txnsRes.rows) {
      let rate = 18;
      const cat = (txn.category_name || '').toLowerCase();
      if (cat.includes('food') || cat.includes('beverage') || cat.includes('grocery')) {
        rate = 5;
      } else if (cat.includes('hardware') || cat.includes('machinery')) {
        rate = 12;
      } else if (cat.includes('luxury') || cat.includes('vehicle')) {
        rate = 28;
      }

      const isInterState = count % 3 === 0;
      const taxCalc = calculateGst({
        totalAmount: Number(txn.amount),
        gstRate: rate,
        isTaxInclusive: true,
        isInterState: isInterState,
        categoryName: txn.category_name || ''
      });
      const gstin = txn.vendor_gstin || '23AAAAA0000A1Z5';

      await db.query(`
        UPDATE transactions
        SET is_gst_bill = true,
            gst_rate = $1,
            taxable_amount = $2,
            cgst_amount = $3,
            sgst_amount = $4,
            igst_amount = $5,
            vendor_gstin = $6,
            itc_eligible = $7
        WHERE id = $8
      `, [
        rate,
        taxCalc.taxable_amount,
        taxCalc.cgst_amount,
        taxCalc.sgst_amount,
        taxCalc.igst_amount,
        gstin,
        taxCalc.itc_eligible,
        txn.id
      ]);
      count++;
    }

    console.log(`Successfully converted ${count} transactions into realistic GST invoices!`);
  } catch (err) {
    console.error('Error seeding GST data:', err);
  } finally {
    process.exit(0);
  }
}

seedGstData();
