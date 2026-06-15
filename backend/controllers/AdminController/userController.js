const bcrypt = require('bcrypt');

const getPool = (req) => req.app.locals.mysqlDb;

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
const getAllUsers = async (req, res, next) => {
  try {
    const pool = getPool(req);
    const [rows] = await pool.query(
      'SELECT user_id, username, name, dept, email, position, role FROM `user` ORDER BY user_id DESC'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/admin/users ────────────────────────────────────────────────────
const createUser = async (req, res, next) => {
  try {
    const pool = getPool(req);
    const { username, password, name, dept, email, position, role = 'user' } = req.body;

    if (!username || !password || !name || !dept || !email || !position) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const [existing] = await pool.query(
      'SELECT user_id FROM `user` WHERE username = ?',
      [username]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username already taken.' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO `user` (username, password, name, dept, email, position, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, hashed, name, dept, email, position, role]
    );

    res.status(201).json({
      user_id: result.insertId,
      username,
      name,
      dept,
      email,
      position,
      role,
    });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/admin/users/:id ──────────────────────────────────────────────
const deleteUser = async (req, res, next) => {
  try {
    const pool = getPool(req);
    const [result] = await pool.query(
      'DELETE FROM `user` WHERE user_id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ success: true, deleted_id: Number(req.params.id) });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/admin/users/change-password ─────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const pool = getPool(req);
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Fetch the stored hash for this user
    const [rows] = await pool.query(
      'SELECT password FROM `user` WHERE user_id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Verify current password against stored hash
    const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    // Hash and save the new password
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE `user` SET password = ? WHERE user_id = ?',
      [hashed, userId]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllUsers, createUser, deleteUser, changePassword };