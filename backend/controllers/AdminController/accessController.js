const getPool = (req) => req.app.locals.mysqlDb;

// ─── GET /api/admin/access/:userId ───────────────────────────────────────────
const getUserAccess = async (req, res, next) => {
  try {
    const pool = getPool(req);
    const [rows] = await pool.query(
      'SELECT module_key, sub_key, enabled FROM user_access WHERE user_id = ?',
      [req.params.userId]
    );

    // Build nested AccessState object from flat rows
    const state = {};
    for (const row of rows) {
      if (!state[row.module_key]) {
        state[row.module_key] = { enabled: false, subItems: {} };
      }
      state[row.module_key].subItems[row.sub_key] = Boolean(row.enabled);
    }

    // module enabled = true only when ALL sub-items are true
    for (const key of Object.keys(state)) {
      const subs = Object.values(state[key].subItems);
      state[key].enabled = subs.length > 0 && subs.every(Boolean);
    }

    res.json(state);
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/admin/access/:userId ───────────────────────────────────────────
const saveUserAccess = async (req, res, next) => {
  const pool = getPool(req);
  const conn = await pool.getConnection();

  try {
    const accessState = req.body;

    if (!accessState || typeof accessState !== 'object') {
      return res.status(400).json({ error: 'Invalid access state.' });
    }

    // Flatten AccessState into rows: [user_id, module_key, sub_key, enabled]
    const rows = [];
    for (const [moduleKey, moduleVal] of Object.entries(accessState)) {
      for (const [subKey, enabled] of Object.entries(moduleVal.subItems)) {
        rows.push([Number(req.params.userId), moduleKey, subKey, enabled ? 1 : 0]);
      }
    }

    await conn.beginTransaction();

    if (rows.length > 0) {
      await conn.query(
        `INSERT INTO user_access (user_id, module_key, sub_key, enabled)
         VALUES ?
         ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)`,
        [rows]
      );
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

module.exports = { getUserAccess, saveUserAccess };