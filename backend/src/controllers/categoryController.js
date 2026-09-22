const db = require('../db/pool');
const authMiddleware = require('../middleware/auth');

const getAll = async (req, res, next) => {
  try {
    const { type } = req.query;
    let query = 'SELECT id, name, type, icon, is_default FROM categories WHERE user_id = $1 AND is_deleted = false';
    const params = [req.userId];

    if (type) {
      query += ' AND type = $2';
      params.push(type);
    }

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { name, type, icon } = req.body;
    if (!name || !type) {
      const err = new Error('Name and type are required');
      err.statusCode = 400;
      throw err;
    }

    const result = await db.query(
      'INSERT INTO categories (name, type, icon, user_id) VALUES ($1, $2, $3, $4) RETURNING id, name, type, icon, is_default',
      [name, type, icon || null, req.userId]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, icon } = req.body;

    const result = await db.query(
      'UPDATE categories SET name = COALESCE($1, name), icon = COALESCE($2, icon) WHERE id = $3 AND user_id = $4 AND is_deleted = false RETURNING id, name, type, icon, is_default',
      [name, icon, id, req.userId]
    );

    if (result.rowCount === 0) {
      const err = new Error('Category not found');
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

    // Check if referenced by active transactions
    const refCheck = await db.query(
      'SELECT id FROM transactions WHERE category_id = $1 AND is_deleted = false LIMIT 1',
      [id]
    );

    if (refCheck.rows.length > 0) {
      const err = new Error('Cannot delete category referenced by active transactions');
      err.statusCode = 409;
      throw err;
    }

    await db.query('UPDATE categories SET is_deleted = true WHERE id = $1 AND user_id = $2', [id, req.userId]);
    res.json({ success: true, data: { id, deleted: true } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, create, update, remove };
