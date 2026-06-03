const { mysqlPool } = require("../../config/database");

// GET all events with participants
const getEvents = async (req, res) => {
  try {
    const [events] = await mysqlPool.query(`
      SELECT 
        e.event_id, e.created_by, e.title, e.description,
        e.start_datetime, e.end_datetime, e.is_all_day,
        e.color, e.category, e.created_at,
        u.name AS created_by_name, u.dept AS created_by_dept
      FROM events e
      JOIN user u ON e.created_by = u.user_id
      ORDER BY e.start_datetime ASC
    `);

    const [participants] = await mysqlPool.query(`
      SELECT ep.event_id, ep.user_id, u.name, u.dept
      FROM event_participants ep
      JOIN user u ON ep.user_id = u.user_id
    `);

    const result = events.map((event) => ({
      ...event,
      participant_ids: participants
        .filter((p) => p.event_id === event.event_id)
        .map((p) => p.user_id),
      participants: participants
        .filter((p) => p.event_id === event.event_id)
        .map((p) => ({ user_id: p.user_id, name: p.name, dept: p.dept })),
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error("getEvents error:", err);
    return res.status(500).json({ message: "Failed to fetch events", error: err.message });
  }
};

// GET all users for participant picker
const getUsers = async (req, res) => {
  try {
    const [rows] = await mysqlPool.query(
      "SELECT user_id, name, dept, position FROM user ORDER BY name ASC"
    );
    return res.status(200).json(rows);
  } catch (err) {
    console.error("getUsers error:", err);
    return res.status(500).json({ message: "Failed to fetch users", error: err.message });
  }
};

// POST create event
const createEvent = async (req, res) => {
  const conn = await mysqlPool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      created_by,
      title, description, start_datetime, end_datetime,
      is_all_day, color, category, participant_ids = [],
    } = req.body;

    if (!title || !start_datetime || !end_datetime || !created_by) {
      return res.status(400).json({ message: "title, start_datetime, end_datetime and created_by are required" });
    }

    const [result] = await conn.query(`
      INSERT INTO events (created_by, title, description, start_datetime, end_datetime, is_all_day, color, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      created_by, title, description || null,
      start_datetime, end_datetime,
      is_all_day ? 1 : 0, color || '#3498db', category || null,
    ]);

    const event_id = result.insertId;

    if (participant_ids.length > 0) {
      const values = participant_ids.map((uid) => [event_id, uid]);
      await conn.query("INSERT INTO event_participants (event_id, user_id) VALUES ?", [values]);
    }

    await conn.commit();

    const [rows] = await mysqlPool.query(`
      SELECT e.*, u.name AS created_by_name, u.dept AS created_by_dept
      FROM events e JOIN user u ON e.created_by = u.user_id
      WHERE e.event_id = ?
    `, [event_id]);

    const [parts] = await mysqlPool.query(
      "SELECT user_id FROM event_participants WHERE event_id = ?", [event_id]
    );

    return res.status(201).json({
      ...rows[0],
      participant_ids: parts.map((p) => p.user_id),
    });
  } catch (err) {
    await conn.rollback();
    console.error("createEvent error:", err);
    return res.status(500).json({ message: "Failed to create event", error: err.message });
  } finally {
    conn.release();
  }
};

// PUT update event
const updateEvent = async (req, res) => {
  const conn = await mysqlPool.getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const {
      title, description, start_datetime, end_datetime,
      is_all_day, color, category, participant_ids = [],
    } = req.body;

    if (!title || !start_datetime || !end_datetime) {
      return res.status(400).json({ message: "title, start_datetime and end_datetime are required" });
    }

    const [result] = await conn.query(`
      UPDATE events SET
        title = ?, description = ?, start_datetime = ?, end_datetime = ?,
        is_all_day = ?, color = ?, category = ?, updated_at = NOW()
      WHERE event_id = ?
    `, [
      title, description || null, start_datetime, end_datetime,
      is_all_day ? 1 : 0, color || '#3498db', category || null, id,
    ]);

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Event not found" });
    }

    await conn.query("DELETE FROM event_participants WHERE event_id = ?", [id]);
    if (participant_ids.length > 0) {
      const values = participant_ids.map((uid) => [id, uid]);
      await conn.query("INSERT INTO event_participants (event_id, user_id) VALUES ?", [values]);
    }

    await conn.commit();

    const [rows] = await mysqlPool.query(`
      SELECT e.*, u.name AS created_by_name, u.dept AS created_by_dept
      FROM events e JOIN user u ON e.created_by = u.user_id
      WHERE e.event_id = ?
    `, [id]);

    const [parts] = await mysqlPool.query(
      "SELECT user_id FROM event_participants WHERE event_id = ?", [id]
    );

    return res.status(200).json({
      ...rows[0],
      participant_ids: parts.map((p) => p.user_id),
    });
  } catch (err) {
    await conn.rollback();
    console.error("updateEvent error:", err);
    return res.status(500).json({ message: "Failed to update event", error: err.message });
  } finally {
    conn.release();
  }
};

// DELETE event
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await mysqlPool.query(
      "DELETE FROM events WHERE event_id = ?", [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Event not found" });
    }
    return res.status(200).json({ message: "Event deleted successfully" });
  } catch (err) {
    console.error("deleteEvent error:", err);
    return res.status(500).json({ message: "Failed to delete event", error: err.message });
  }
};

module.exports = { getEvents, getUsers, createEvent, updateEvent, deleteEvent };