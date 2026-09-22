const db = require('../db/pool');

const getAll = async (req, res, next) => {
  try {
    const { type, category_id, vendor_id, from, to, search } = req.query;
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    let query = `
      SELECT t.id, t.type, t.amount, t.currency, t.txn_date, t.notes, t.source, t.is_flagged_unusual, t.created_at,
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
    const { type, amount, category_id, vendor_id, vendor_name, txn_date, notes } = req.body;

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

    const result = await db.query(
      `INSERT INTO transactions (type, amount, category_id, vendor_id, txn_date, notes, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [type, amount, category_id, finalVendorId, txn_date, notes, req.userId]
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
    const { type, amount, category_id, vendor_id, vendor_name, txn_date, notes } = req.body;

    // Validation for updates
    if (type === 'expense' && !category_id && !req.body.hasOwnProperty('category_id')) {
      // We need to check if the existing txn is an expense
      const existing = await db.query('SELECT type FROM transactions WHERE id = $1 AND user_id = $2', [id, req.userId]);
      if (existing.rows.length === 0) {
        const err = new Error('Transaction not found');
        err.statusCode = 404;
        throw err;
      }
      if (existing.rows[0].type === 'expense') {
        // If it's an expense, and we are potentially changing type or it's already expense,
        // we must ensure category_id isn't being cleared or is present if type is set to expense.
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

    const result = await db.query(
      `UPDATE transactions
       SET type = COALESCE($1, type),
           amount = COALESCE($2, amount),
           category_id = COALESCE($3, category_id),
           vendor_id = COALESCE($4, vendor_id),
           txn_date = COALESCE($5, txn_date),
           notes = COALESCE($6, notes)
       WHERE id = $7 AND user_id = $8 AND is_deleted = false RETURNING *`,
      [type, amount, category_id, finalVendorId, txn_date, notes, id, req.userId]
    );

    if (result.rowCount === 0) {
      const err = new Error('Transaction not found');
      err.statusCode = 404;
      throw err;
    }

    const row = result.rows[0];
    // Fetch joins for the final response
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
