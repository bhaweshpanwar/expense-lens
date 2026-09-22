const db = require('../db/pool');
const authMiddleware = require('../middleware/auth');

const getAll = async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = 'SELECT id, name, default_category_id FROM vendors WHERE user_id = $1 AND is_deleted = false';
    const params = [req.userId];

    if (search) {
      query += ' AND normalized_name ILIKE $2';
      params.push(`%${search.toLowerCase().trim()}%`);
    }

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { name, default_category_id } = req.body;
    if (!name) {
      const err = new Error('Vendor name is required');
      err.statusCode = 400;
      throw err;
    }

    const normalized_name = name.toLowerCase().trim();

    // Check for existing vendor with same normalized name
    const existing = await db.query(
      'SELECT id, name, default_category_id FROM vendors WHERE normalized_name = $1 AND user_id = $2 AND is_deleted = false',
      [normalized_name, req.userId]
    );

    if (existing.rows.length > 0) {
      return res.json({ success: true, data: existing.rows[0] });
    }

    const result = await db.query(
      'INSERT INTO vendors (name, normalized_name, default_category_id, user_id) VALUES ($1, $2, $3, $4) RETURNING id, name, default_category_id',
      [name, normalized_name, default_category_id || null, req.userId]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, default_category_id } = req.body;

    let normalized_name = null;
    if (name) {
      normalized_name = name.toLowerCase().trim();
    }

    const result = await db.query(
      'UPDATE vendors SET name = COALESCE($1, name), normalized_name = COALESCE($2, normalized_name), default_category_id = COALESCE($3, default_category_id) WHERE id = $4 AND user_id = $5 AND is_deleted = false RETURNING id, name, default_category_id',
      [name, normalized_name, default_category_id, id, req.userId]
    );

    if (result.rowCount === 0) {
      const err = new Error('Vendor not found');
      err.statusCode = 404;
      throw err;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE vendors SET is_deleted = true WHERE id = $1 AND user_id = $2', [id, req.userId]);
    res.json({ success: true, data: { id, deleted: true } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, create, update, remove };
