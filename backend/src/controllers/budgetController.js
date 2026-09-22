const db = require('../db/pool');

/**
 * GET /api/budgets
 * Returns all active budgets for the user.
 */
const getAll = async (req, res, next) => {
  try {
    const query = `
      SELECT b.id, b.category_id, c.name as category_name, b.limit_amount, b.period, b.start_date, b.is_active, b.created_at
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = $1 AND b.is_active = true
      ORDER BY b.category_id IS NULL DESC, c.name ASC
    `;
    const result = await db.query(query, [req.userId]);
    const data = result.rows.map((row) => ({
      id: row.id,
      category_id: row.category_id,
      category_name: row.category_name || 'Overall Budget',
      limit_amount: parseFloat(row.limit_amount),
      period: row.period,
      start_date: row.start_date,
      is_active: row.is_active,
      created_at: row.created_at,
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/budgets
 * Creates or updates an overall or category-specific budget limit.
 */
const createOrUpdate = async (req, res, next) => {
  try {
    const { category_id, limit_amount, period = 'monthly' } = req.body;

    if (!limit_amount || Number(limit_amount) <= 0) {
      const err = new Error('limit_amount must be a positive number');
      err.statusCode = 400;
      throw err;
    }

    const catId = category_id || null;

    // Check if an active budget already exists for this user and category (or overall)
    const checkQuery = `
      SELECT id FROM budgets
      WHERE user_id = $1 AND ((category_id = $2) OR (category_id IS NULL AND $2 IS NULL)) AND is_active = true
    `;
    const existing = await db.query(checkQuery, [req.userId, catId]);

    let row;
    if (existing.rows.length > 0) {
      const updateQuery = `
        UPDATE budgets
        SET limit_amount = $1, period = $2
        WHERE id = $3
        RETURNING *
      `;
      const updateRes = await db.query(updateQuery, [limit_amount, period, existing.rows[0].id]);
      row = updateRes.rows[0];
    } else {
      const insertQuery = `
        INSERT INTO budgets (user_id, category_id, limit_amount, period)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const insertRes = await db.query(insertQuery, [req.userId, catId, limit_amount, period]);
      row = insertRes.rows[0];
    }

    res.status(201).json({
      success: true,
      data: {
        id: row.id,
        category_id: row.category_id,
        limit_amount: parseFloat(row.limit_amount),
        period: row.period,
        is_active: row.is_active,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/budgets/status
 * Compares current period spend against each active budget.
 */
const getStatus = async (req, res, next) => {
  try {
    const query = `
      WITH cat_spend AS (
        SELECT category_id, SUM(amount) as spent
        FROM active_transactions
        WHERE user_id = $1 AND type = 'expense'
          AND txn_date >= date_trunc('month', CURRENT_DATE)
          AND txn_date <= (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')
        GROUP BY category_id
      ),
      overall_spend AS (
        SELECT COALESCE(SUM(amount), 0) as total_spent
        FROM active_transactions
        WHERE user_id = $1 AND type = 'expense'
          AND txn_date >= date_trunc('month', CURRENT_DATE)
          AND txn_date <= (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')
      )
      SELECT
        b.id,
        b.category_id,
        COALESCE(c.name, 'Overall') as category_name,
        b.limit_amount,
        CASE WHEN b.category_id IS NULL THEN os.total_spent ELSE COALESCE(cs.spent, 0) END as spent,
        COALESCE(ROUND((CASE WHEN b.category_id IS NULL THEN os.total_spent ELSE COALESCE(cs.spent, 0) END / NULLIF(b.limit_amount, 0) * 100)::numeric, 1), 0) as pct_used,
        (CASE WHEN b.category_id IS NULL THEN os.total_spent ELSE COALESCE(cs.spent, 0) END > b.limit_amount) as exceeded
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      LEFT JOIN cat_spend cs ON b.category_id = cs.category_id
      CROSS JOIN overall_spend os
      WHERE b.user_id = $1 AND b.is_active = true
      ORDER BY b.category_id IS NULL DESC, b.limit_amount DESC;
    `;

    const result = await db.query(query, [req.userId]);
    const data = result.rows.map((row) => ({
      id: row.id,
      category_id: row.category_id,
      category_name: row.category_name,
      limit_amount: parseFloat(row.limit_amount),
      spent: parseFloat(row.spent),
      pct_used: parseFloat(row.pct_used),
      exceeded: Boolean(row.exceeded),
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  createOrUpdate,
  getStatus,
};
