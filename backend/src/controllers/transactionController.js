const db = require('../db/pool');
const { calculateGst } = require('../utils/gstCalculator');

const getAll = async (req, res, next) => {
  try {
    const { type, category_id, vendor_id, from, to, search } = req.query;
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    let query = `
      SELECT t.id, t.type, t.amount, t.currency, t.txn_date, t.notes, t.source, t.is_flagged_unusual, t.created_at,
             t.is_gst_bill, t.gst_rate, t.taxable_amount, t.cgst_amount, t.sgst_amount, t.igst_amount, t.vendor_gstin, t.itc_eligible,
             c.id as category_id, c.name as category_name,
             v.id as vendor_id, v.name as vendor_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN vendors v ON t.vendor_id = v.id
      WHERE t.user_id = $1 AND t.is_deleted = false
    `;

    const params = [req.userId];
    let paramIdx = 2;

    if (type) {
      query += ` AND t.type = $${paramIdx++}`;
      params.push(type);
    }
    if (category_id) {
      query += ` AND t.category_id = $${paramIdx++}`;
      params.push(category_id);
    }
    if (vendor_id) {
      query += ` AND t.vendor_id = $${paramIdx++}`;
      params.push(vendor_id);
    }
    if (from) {
      query += ` AND t.txn_date >= $${paramIdx++}`;
      params.push(from);
    }
    if (to) {
      query += ` AND t.txn_date <= $${paramIdx++}`;
      params.push(to);
    }
    if (search) {
      query += ` AND t.notes ILIKE $${paramIdx++}`;
      params.push(`%${search}%`);
    }

    // Count total for pagination
    const countQuery = `SELECT COUNT(*) FROM transactions WHERE user_id = $1 AND is_deleted = false`;
    const countResult = await db.query(countQuery, [req.userId]);
    const total = parseInt(countResult.rows[0].count);

    // Append pagination
    query += ` ORDER BY t.txn_date DESC, t.created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Format response to match API.md
    const transactions = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      amount: row.amount,
      currency: row.currency,
      txn_date: row.txn_date,
      notes: row.notes,
      source: row.source,
      is_flagged_unusual: row.is_flagged_unusual,
      created_at: row.created_at,
      gst_details: row.is_gst_bill ? {
        gst_rate: row.gst_rate,
        taxable_amount: row.taxable_amount,
        cgst_amount: row.cgst_amount,
        sgst_amount: row.sgst_amount,
        igst_amount: row.igst_amount,
        vendor_gstin: row.vendor_gstin,
        itc_eligible: row.itc_eligible
      } : null,
      category: row.category_id ? { id: row.category_id, name: row.category_name } : null,
      vendor: row.vendor_id ? { id: row.vendor_id, name: row.vendor_name } : null,
    }));

    res.json({
      success: true,
      data: {
        transactions,
        pagination: { page, limit, total }
      }
    });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const {
      type, amount, category_id, vendor_id, vendor_name, txn_date, notes,
      is_gst_bill, gst_rate, is_tax_inclusive, is_inter_state, vendor_gstin
    } = req.body;

    // Validations
    if (!type || !amount || !txn_date) {
      const err = new Error('Type, amount, and txn_date are required');
      err.statusCode = 400;
      throw err;
    }
    if (amount <= 0) {
      const err = new Error('Amount must be greater than 0');
      err.statusCode = 400;
      throw err;
    }
    if (type === 'expense' && !category_id) {
      const err = new Error('Category is required for expense transactions');
      err.statusCode = 400;
      throw err;
    }

    let finalVendorId = vendor_id;

    // Handle vendor_name: look up or create
    if (vendor_name && !finalVendorId) {
      const normalized = vendor_name.toLowerCase().trim();
      const existing = await db.query(
        'SELECT id FROM vendors WHERE normalized_name = $1 AND user_id = $2 AND is_deleted = false',
        [normalized, req.userId]
      );

      if (existing.rows.length > 0) {
        finalVendorId = existing.rows[0].id;
      } else {
        const newVendor = await db.query(
          'INSERT INTO vendors (name, normalized_name, user_id) VALUES ($1, $2, $3) RETURNING id',
          [vendor_name, normalized, req.userId]
        );
        finalVendorId = newVendor.rows[0].id;
      }
    }

    // GST Calculation
    let gstData = {
      is_gst_bill: false,
      gst_rate: 0,
      taxable_amount: null,
      cgst_amount: 0,
      sgst_amount: 0,
      igst_amount: 0,
      vendor_gstin: null,
      itc_eligible: true
    };

    if (is_gst_bill && gst_rate !== undefined) {
      const categoryName = await db.query('SELECT name FROM categories WHERE id = $1', [category_id])
        .then(res => res.rows[0]?.name || '');

      const calc = calculateGst({
        totalAmount: amount,
        gstRate: gst_rate,
        isTaxInclusive: is_tax_inclusive !== false,
        isInterState: is_inter_state === true,
        categoryName: categoryName
      });

      gstData = {
        is_gst_bill: true,
        gst_rate: gst_rate,
        taxable_amount: calc.taxable_amount,
        cgst_amount: calc.cgst_amount,
        sgst_amount: calc.sgst_amount,
        igst_amount: calc.igst_amount,
        vendor_gstin: vendor_gstin || null,
        itc_eligible: calc.itc_eligible
      };
    }

    const result = await db.query(
      `INSERT INTO transactions (
        type, amount, category_id, vendor_id, txn_date, notes, user_id,
        is_gst_bill, gst_rate, taxable_amount, cgst_amount, sgst_amount, igst_amount, vendor_gstin, itc_eligible
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [
        type, amount, category_id, finalVendorId, txn_date, notes, req.userId,
        gstData.is_gst_bill, gstData.gst_rate, gstData.taxable_amount,
        gstData.cgst_amount, gstData.sgst_amount, gstData.igst_amount,
        gstData.vendor_gstin, gstData.itc_eligible
      ]
    );

    // Re-fetch with joins to return full object as per API.md
    const fullTxn = await db.query(
      `SELECT t.*, c.name as category_name, v.name as vendor_name
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN vendors v ON t.vendor_id = v.id
       WHERE t.id = $1`,
      [result.rows[0].id]
    );

    const row = fullTxn.rows[0];
    res.status(201).json({
      success: true,
      data: {
        id: row.id,
        type: row.type,
        amount: row.amount,
        currency: row.currency,
        txn_date: row.txn_date,
        notes: row.notes,
        source: row.source,
        is_flagged_unusual: row.is_flagged_unusual,
        created_at: row.created_at,
        gst_details: row.is_gst_bill ? {
          gst_rate: row.gst_rate,
          taxable_amount: row.taxable_amount,
          cgst_amount: row.cgst_amount,
          sgst_amount: row.sgst_amount,
          igst_amount: row.igst_amount,
          vendor_gstin: row.vendor_gstin,
          itc_eligible: row.itc_eligible
        } : null,
        category: row.category_id ? { id: row.category_id, name: row.category_name } : null,
        vendor: row.vendor_id ? { id: row.vendor_id, name: row.vendor_name } : null,
      }
    });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      type, amount, category_id, vendor_id, vendor_name, txn_date, notes,
      is_gst_bill, gst_rate, is_tax_inclusive, is_inter_state, vendor_gstin
    } = req.body;

    // Validation for updates
    if (type === 'expense' && !category_id && !req.body.hasOwnProperty('category_id')) {
      const existing = await db.query('SELECT type FROM transactions WHERE id = $1 AND user_id = $2', [id, req.userId]);
      if (existing.rows.length === 0) {
        const err = new Error('Transaction not found');
        err.statusCode = 404;
        throw err;
      }
      if (existing.rows[0].type === 'expense') {
        // Handled by logic if we are not changing the type
      }
    }

    if (amount && amount <= 0) {
      const err = new Error('Amount must be greater than 0');
      err.statusCode = 400;
      throw err;
    }

    let finalVendorId = vendor_id;
    if (vendor_name) {
      const normalized = vendor_name.toLowerCase().trim();
      const existing = await db.query(
        'SELECT id FROM vendors WHERE normalized_name = $1 AND user_id = $2 AND is_deleted = false',
        [normalized, req.userId]
      );
      finalVendorId = existing.rows.length > 0 ? existing.rows[0].id : (await db.query('INSERT INTO vendors (name, normalized_name, user_id) VALUES ($1, $2, $3) RETURNING id', [vendor_name, normalized, req.userId])).rows[0].id;
    }

    // GST Calculation for update
    let gstParams = {};
    if (is_gst_bill !== undefined) {
      const currentTxn = await db.query('SELECT amount, category_id FROM transactions WHERE id = $1', [id]);
      const currentAmount = amount || currentTxn.rows[0]?.amount;
      const currentCatId = category_id || currentTxn.rows[0]?.category_id;

      const categoryName = await db.query('SELECT name FROM categories WHERE id = $1', [currentCatId])
        .then(res => res.rows[0]?.name || '');

      const calc = calculateGst({
        totalAmount: currentAmount,
        gstRate: gst_rate || 0,
        isTaxInclusive: is_tax_inclusive !== false,
        isInterState: is_inter_state === true,
        categoryName: categoryName
      });

      gstParams = {
        is_gst_bill,
        gst_rate: gst_rate || 0,
        taxable_amount: calc.taxable_amount,
        cgst_amount: calc.cgst_amount,
        sgst_amount: calc.sgst_amount,
        igst_amount: calc.igst_amount,
        vendor_gstin: vendor_gstin,
        itc_eligible: calc.itc_eligible
      };
    }

    const result = await db.query(
      `UPDATE transactions
       SET type = COALESCE($1, type),
           amount = COALESCE($2, amount),
           category_id = COALESCE($3, category_id),
           vendor_id = COALESCE($4, vendor_id),
           txn_date = COALESCE($5, txn_date),
           notes = COALESCE($6, notes),
           is_gst_bill = COALESCE($7, is_gst_bill),
           gst_rate = COALESCE($8, gst_rate),
           taxable_amount = COALESCE($9, taxable_amount),
           cgst_amount = COALESCE($10, cgst_amount),
           sgst_amount = COALESCE($11, sgst_amount),
           igst_amount = COALESCE($12, igst_amount),
           vendor_gstin = COALESCE($13, vendor_gstin),
           itc_eligible = COALESCE($14, itc_eligible)
       WHERE id = $15 AND user_id = $16 AND is_deleted = false RETURNING *`,
      [
        type, amount, category_id, finalVendorId, txn_date, notes,
        gstParams.is_gst_bill, gstParams.gst_rate, gstParams.taxable_amount,
        gstParams.cgst_amount, gstParams.sgst_amount, gstParams.igst_amount,
        gstParams.vendor_gstin, gstParams.itc_eligible,
        id, req.userId
      ]
    );

    if (result.rowCount === 0) {
      const err = new Error('Transaction not found');
      err.statusCode = 404;
      throw err;
    }

    const row = result.rows[0];
    const fullTxn = await db.query(
      `SELECT t.*, c.name as category_name, v.name as vendor_name
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN vendors v ON t.vendor_id = v.id
       WHERE t.id = $1`,
      [row.id]
    );
    const joined = fullTxn.rows[0];

    res.json({
      success: true,
      data: {
        id: joined.id,
        type: joined.type,
        amount: joined.amount,
        currency: joined.currency,
        txn_date: joined.txn_date,
        notes: joined.notes,
        source: joined.source,
        is_flagged_unusual: joined.is_flagged_unusual,
        created_at: joined.created_at,
        gst_details: joined.is_gst_bill ? {
          gst_rate: joined.gst_rate,
          taxable_amount: joined.taxable_amount,
          cgst_amount: joined.cgst_amount,
          sgst_amount: joined.sgst_amount,
          igst_amount: joined.igst_amount,
          vendor_gstin: joined.vendor_gstin,
          itc_eligible: joined.itc_eligible
        } : null,
        category: joined.category_id ? { id: joined.category_id, name: joined.category_name } : null,
        vendor: joined.vendor_id ? { id: joined.vendor_id, name: joined.vendor_name } : null,
      }
    });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE transactions SET is_deleted = true WHERE id = $1 AND user_id = $2', [id, req.userId]);
    res.json({ success: true, data: { id, deleted: true } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, create, update, remove };
