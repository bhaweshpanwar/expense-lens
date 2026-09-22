const db = require('../db/pool');

/**
 * Helper to validate and resolve from/to date range.
 * Defaults to current month (YYYY-MM-01 to today's date) if omitted.
 */
const getDateRange = (from, to) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (from && !dateRegex.test(from)) {
    const err = new Error('Invalid "from" date format. Expected YYYY-MM-DD');
    err.statusCode = 400;
    throw err;
  }
  if (to && !dateRegex.test(to)) {
    const err = new Error('Invalid "to" date format. Expected YYYY-MM-DD');
    err.statusCode = 400;
    throw err;
  }

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');

  const defaultFrom = `${yyyy}-${mm}-01`;
  const defaultTo = `${yyyy}-${mm}-${dd}`;

  let resolvedFrom = from;
  let resolvedTo = to;

  if (!resolvedFrom && !resolvedTo) {
    resolvedFrom = defaultFrom;
    resolvedTo = defaultTo;
  } else if (!resolvedFrom) {
    // If 'to' is before current month start, default 'from' to 1st of 'to's month
    resolvedFrom = resolvedTo < defaultFrom ? `${resolvedTo.slice(0, 7)}-01` : defaultFrom;
  } else if (!resolvedTo) {
    // If 'from' is after today, default 'to' to 'from'
    resolvedTo = resolvedFrom > defaultTo ? resolvedFrom : defaultTo;
  }

  if (resolvedFrom > resolvedTo) {
    const err = new Error('"from" date cannot be after "to" date');
    err.statusCode = 400;
    throw err;
  }

  return { from: resolvedFrom, to: resolvedTo };
};

/**
 * GET /api/dashboard/summary
 * Total income, total expense, net balance for date range
 */
const getSummary = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const range = getDateRange(from, to);

    const query = `
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS total_income,
        COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS total_expense,
        COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) - COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS net_balance
      FROM active_transactions
      WHERE user_id = $1 AND txn_date >= $2 AND txn_date <= $3;
    `;

    const result = await db.query(query, [req.userId, range.from, range.to]);
    const row = result.rows[0];

    res.json({
      success: true,
      data: {
        total_income: parseFloat(row.total_income),
        total_expense: parseFloat(row.total_expense),
        net_balance: parseFloat(row.net_balance),
        period: {
          from: range.from,
          to: range.to
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/dashboard/by-category
 * Spend grouped by category with pct_of_total
 */
const getByCategory = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const type = req.query.type || 'expense';

    if (type !== 'expense' && type !== 'income') {
      const err = new Error('Query parameter "type" must be either "expense" or "income"');
      err.statusCode = 400;
      throw err;
    }

    const range = getDateRange(from, to);

    const query = `
      WITH cat_totals AS (
        SELECT
          t.category_id,
          COALESCE(c.name, 'Uncategorized') AS category_name,
          SUM(t.amount) AS total,
          COUNT(t.id)::int AS txn_count
        FROM active_transactions t
        LEFT JOIN categories c ON c.id = t.category_id
        WHERE t.user_id = $1 AND t.type = $2 AND t.txn_date >= $3 AND t.txn_date <= $4
        GROUP BY t.category_id, c.name
      ),
      overall AS (
        SELECT COALESCE(SUM(amount), 0) AS grand_total
        FROM active_transactions
        WHERE user_id = $1 AND type = $2 AND txn_date >= $3 AND txn_date <= $4
      )
      SELECT
        ct.category_id,
        ct.category_name,
        ct.total,
        ct.txn_count,
        COALESCE(ROUND((ct.total / NULLIF(o.grand_total, 0) * 100)::numeric, 1), 0) AS pct_of_total
      FROM cat_totals ct
      CROSS JOIN overall o
      ORDER BY ct.total DESC;
    `;

    const result = await db.query(query, [req.userId, type, range.from, range.to]);

    const data = result.rows.map(row => ({
      category_id: row.category_id,
      category_name: row.category_name,
      total: parseFloat(row.total),
      txn_count: parseInt(row.txn_count, 10),
      pct_of_total: parseFloat(row.pct_of_total)
    }));

    res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/dashboard/by-vendor
 * Same shape as by-category, grouped by vendor, default top 10
 */
const getByVendor = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const type = req.query.type || 'expense';
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);

    if (type !== 'expense' && type !== 'income') {
      const err = new Error('Query parameter "type" must be either "expense" or "income"');
      err.statusCode = 400;
      throw err;
    }

    const range = getDateRange(from, to);

    const query = `
      WITH vendor_totals AS (
        SELECT
          v.id AS vendor_id,
          v.name AS vendor_name,
          SUM(t.amount) AS total,
          COUNT(t.id)::int AS txn_count
        FROM active_transactions t
        JOIN vendors v ON v.id = t.vendor_id
        WHERE t.user_id = $1 AND t.type = $2 AND t.txn_date >= $3 AND t.txn_date <= $4
        GROUP BY v.id, v.name
      ),
      overall AS (
        SELECT COALESCE(SUM(amount), 0) AS grand_total
        FROM active_transactions
        WHERE user_id = $1 AND type = $2 AND txn_date >= $3 AND txn_date <= $4
      )
      SELECT
        vt.vendor_id,
        vt.vendor_name,
        vt.total,
        vt.txn_count,
        COALESCE(ROUND((vt.total / NULLIF(o.grand_total, 0) * 100)::numeric, 1), 0) AS pct_of_total
      FROM vendor_totals vt
      CROSS JOIN overall o
      ORDER BY vt.total DESC
      LIMIT $5;
    `;

    const result = await db.query(query, [req.userId, type, range.from, range.to, limit]);

    const data = result.rows.map(row => ({
      vendor_id: row.vendor_id,
      vendor_name: row.vendor_name,
      total: parseFloat(row.total),
      txn_count: parseInt(row.txn_count, 10),
      pct_of_total: parseFloat(row.pct_of_total)
    }));

    res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/dashboard/trend
 * Monthly income/expense for trailing N months (default: 6)
 */
const getTrend = async (req, res, next) => {
  try {
    const months = Math.min(120, Math.max(1, parseInt(req.query.months, 10) || 6));

    const query = `
      WITH months AS (
        SELECT to_char(d, 'YYYY-MM') AS month,
               date_trunc('month', d)::date AS start_date,
               (date_trunc('month', d) + INTERVAL '1 month' - INTERVAL '1 day')::date AS end_date
        FROM generate_series(
          date_trunc('month', CURRENT_DATE) - (($2::int - 1) * INTERVAL '1 month'),
          date_trunc('month', CURRENT_DATE),
          INTERVAL '1 month'
        ) AS d
      )
      SELECT
        m.month,
        COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0) AS income,
        COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) AS expense
      FROM months m
      LEFT JOIN active_transactions t
        ON t.txn_date >= m.start_date
       AND t.txn_date <= m.end_date
       AND t.user_id = $1
      GROUP BY m.month, m.start_date
      ORDER BY m.start_date ASC;
    `;

    const result = await db.query(query, [req.userId, months]);

    const data = result.rows.map(row => ({
      month: row.month,
      income: parseFloat(row.income),
      expense: parseFloat(row.expense)
    }));

    res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/dashboard/unusual-transactions
 * Anomaly detection: mean + 2*stddev per category over trailing 6 months,
 * minimum 4 past transactions before flagging anything.
 */
const getUnusualTransactions = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (from && !dateRegex.test(from)) {
      const err = new Error('Invalid "from" date format. Expected YYYY-MM-DD');
      err.statusCode = 400;
      throw err;
    }
    if (to && !dateRegex.test(to)) {
      const err = new Error('Invalid "to" date format. Expected YYYY-MM-DD');
      err.statusCode = 400;
      throw err;
    }
    if (from && to && from > to) {
      const err = new Error('"from" date cannot be after "to" date');
      err.statusCode = 400;
      throw err;
    }

    let query = `
      WITH category_stats AS (
          SELECT
              category_id,
              AVG(amount) AS avg_amount,
              STDDEV_POP(amount) AS stddev_amount,
              COUNT(*) AS sample_size
          FROM active_transactions
          WHERE user_id = $1
            AND type = 'expense'
            AND txn_date >= (CURRENT_DATE - INTERVAL '6 months')
          GROUP BY category_id
          HAVING COUNT(*) >= 4
      )
      SELECT
          t.id,
          t.amount,
          t.txn_date::text AS txn_date,
          c.name AS category_name,
          v.name AS vendor_name,
          cs.avg_amount,
          cs.stddev_amount,
          ROUND(((t.amount - cs.avg_amount) / NULLIF(cs.stddev_amount, 0))::numeric, 2) AS z_score,
          CONCAT(
              c.name, ' expense of ₹', t.amount,
              ' is significantly higher than the historical average of ₹',
              ROUND(cs.avg_amount::numeric, 2),
              ' (', cs.sample_size, ' past transactions)'
          ) AS flag_reason
      FROM active_transactions t
      JOIN category_stats cs ON cs.category_id = t.category_id
      JOIN categories c ON c.id = t.category_id
      LEFT JOIN vendors v ON v.id = t.vendor_id
      WHERE t.user_id = $1
        AND t.type = 'expense'
        AND t.amount > (cs.avg_amount + 2 * cs.stddev_amount)
    `;

    const params = [req.userId];
    let paramIdx = 2;

    if (from) {
      query += ` AND t.txn_date >= $${paramIdx++}`;
      params.push(from);
    } else {
      query += ` AND t.txn_date >= (CURRENT_DATE - INTERVAL '6 months')`;
    }

    if (to) {
      query += ` AND t.txn_date <= $${paramIdx++}`;
      params.push(to);
    }

    query += ` ORDER BY z_score DESC;`;

    const result = await db.query(query, params);

    const data = result.rows.map(row => ({
      id: row.id,
      amount: parseFloat(row.amount),
      txn_date: row.txn_date,
      category_name: row.category_name,
      vendor_name: row.vendor_name,
      avg_amount: parseFloat(row.avg_amount),
      z_score: row.z_score !== null ? parseFloat(row.z_score) : null,
      flag_reason: row.flag_reason
    }));

    res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSummary,
  getByCategory,
  getByVendor,
  getTrend,
  getUnusualTransactions
};
