const db = require('../db/pool');
const aiService = require('../services/aiService');

/**
 * GET /api/savings-goal
 * Returns all active savings goals for the user.
 */
const getAll = async (req, res, next) => {
  try {
    const query = `
      SELECT id, target_amount, monthly_save_amount, target_date, status, created_at
      FROM savings_goals
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [req.userId]);
    const data = result.rows.map((row) => ({
      id: row.id,
      target_amount: parseFloat(row.target_amount),
      monthly_save_amount: parseFloat(row.monthly_save_amount),
      target_date: row.target_date,
      status: row.status,
      created_at: row.created_at,
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/savings-goal
 * Creates a new savings goal.
 */
const create = async (req, res, next) => {
  try {
    const { target_amount, monthly_save_amount, target_date } = req.body;

    if (!target_amount || Number(target_amount) <= 0) {
      const err = new Error('target_amount must be a positive number');
      err.statusCode = 400;
      throw err;
    }

    const monthlySave = Number(monthly_save_amount) || Math.round(Number(target_amount) / 6);

    const query = `
      INSERT INTO savings_goals (user_id, target_amount, monthly_save_amount, target_date, status)
      VALUES ($1, $2, $3, $4, 'active')
      RETURNING *
    `;
    const result = await db.query(query, [req.userId, target_amount, monthlySave, target_date || null]);
    const row = result.rows[0];

    res.status(201).json({
      success: true,
      data: {
        id: row.id,
        target_amount: parseFloat(row.target_amount),
        monthly_save_amount: parseFloat(row.monthly_save_amount),
        target_date: row.target_date,
        status: row.status,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/savings-goal/suggestion
 * Generates an AI-powered savings plan using actual spending and Nemotron AI.
 */
const getSuggestion = async (req, res, next) => {
  try {
    const { target_monthly_save = 10000 } = req.body;

    // Fetch actual category breakdown over trailing 3 months to calculate monthly averages
    const query = `
      SELECT c.name as category, SUM(t.amount) as total
      FROM active_transactions t
      JOIN categories c ON c.id = t.category_id
      WHERE t.user_id = $1 AND t.type = 'expense'
        AND t.txn_date >= (CURRENT_DATE - INTERVAL '3 months')
      GROUP BY c.name
      ORDER BY total DESC;
    `;
    const result = await db.query(query, [req.userId]);

    const categoryBreakdown = result.rows.map((r) => ({
      category: r.category,
      total: Math.round(parseFloat(r.total) / 3), // monthly average
    }));

    const totalSpend = categoryBreakdown.reduce((sum, c) => sum + c.total, 0);

    const advice = await aiService.generateSavingsAdvice({
      targetMonthlySave: Number(target_monthly_save),
      categoryBreakdown,
      totalSpend,
    });

    res.json({
      success: true,
      data: advice,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  create,
  getSuggestion,
};
