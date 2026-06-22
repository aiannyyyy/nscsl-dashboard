const { mysqlPool } = require("../config/database");
const { sendNotification } = require("../utils/notificationHelper");

// GET all events with participants (department-aware)
const getEvents = async (req, res) => {
  try {
    const userDept   = req.user.dept
    const userId     = req.user.user_id

    const [events] = await mysqlPool.query(`
      SELECT 
        e.event_id, e.created_by, e.department, e.title, e.description,
        e.start_datetime, e.end_datetime, e.is_all_day,
        e.color, e.category, e.created_at,
        u.name AS created_by_name, u.dept AS created_by_dept
      FROM events e
      JOIN user u ON e.created_by = u.user_id
      WHERE e.department = ?                    -- own dept events
         OR EXISTS (                            -- ✅ event has ANY participant from user's dept
           SELECT 1 
           FROM event_participants ep
           JOIN user pu ON ep.user_id = pu.user_id
           WHERE ep.event_id = e.event_id
             AND pu.dept = ?                    -- any participant belongs to my dept
         )
      ORDER BY e.start_datetime ASC
    `, [userDept, userDept])

    const eventIds = events.map(e => e.event_id)

    const [participants] = eventIds.length > 0
      ? await mysqlPool.query(`
          SELECT ep.event_id, ep.user_id, u.name, u.dept
          FROM event_participants ep
          JOIN user u ON ep.user_id = u.user_id
          WHERE ep.event_id IN (?)
        `, [eventIds])
      : [[]]

    const result = events.map((event) => ({
      ...event,
      participant_ids: participants
        .filter((p) => p.event_id === event.event_id)
        .map((p) => p.user_id),
      participants: participants
        .filter((p) => p.event_id === event.event_id)
        .map((p) => ({ user_id: p.user_id, name: p.name, dept: p.dept })),
    }))

    return res.status(200).json(result)
  } catch (err) {
    console.error("getEvents error:", err)
    return res.status(500).json({ message: "Failed to fetch events", error: err.message })
  }
}

// GET all users for participant picker (scoped to department)
const getUsers = async (req, res) => {
  try {
    const [rows] = await mysqlPool.query(
      "SELECT user_id, name, dept, position FROM user ORDER BY dept ASC, name ASC"
      // ✅ removed WHERE dept = ? — returns all departments
    )
    return res.status(200).json(rows)
  } catch (err) {
    console.error("getUsers error:", err)
    return res.status(500).json({ message: "Failed to fetch users", error: err.message })
  }
}

// POST create event
const createEvent = async (req, res) => {
  const conn = await mysqlPool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      created_by,
      title, description, start_datetime, end_datetime,
      is_all_day, color, category,
      participant_ids = [],
      reminder_minutes = null,
    } = req.body;

    const department = req.user.dept;

    if (!title || !start_datetime || !end_datetime || !created_by) {
      return res.status(400).json({ message: "title, start_datetime, end_datetime and created_by are required" });
    }

    const [result] = await conn.query(`
      INSERT INTO events (created_by, department, title, description, start_datetime, end_datetime, is_all_day, color, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      created_by, department, title, description || null,
      start_datetime, end_datetime,
      is_all_day ? 1 : 0, color || '#3498db', category || null,
    ]);

    const event_id = result.insertId;

    if (participant_ids.length > 0) {
      const values = participant_ids.map((uid) => [event_id, uid]);
      await conn.query("INSERT INTO event_participants (event_id, user_id) VALUES ?", [values]);
    }

    if (reminder_minutes !== null && reminder_minutes !== '') {
      const remind_at = new Date(new Date(start_datetime).getTime() - reminder_minutes * 60 * 1000);
      await conn.query(`
        INSERT INTO event_reminders (event_id, remind_at, method, is_sent)
        VALUES (?, ?, 'popup', 0)
      `, [event_id, remind_at]);
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
      is_all_day, color, category,
      participant_ids = [],
      reminder_minutes = null,
    } = req.body;

    if (!title || !start_datetime || !end_datetime) {
      return res.status(400).json({ message: "title, start_datetime and end_datetime are required" });
    }

    const [result] = await conn.query(`
      UPDATE events SET
        title = ?, description = ?, start_datetime = ?, end_datetime = ?,
        is_all_day = ?, color = ?, category = ?, updated_at = NOW()
      WHERE event_id = ? AND department = ?
    `, [
      title, description || null, start_datetime, end_datetime,
      is_all_day ? 1 : 0, color || '#3498db', category || null,
      id, req.user.dept,
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

    await conn.query("DELETE FROM event_reminders WHERE event_id = ?", [id]);
    if (reminder_minutes !== null && reminder_minutes !== '') {
      const remind_at = new Date(new Date(start_datetime).getTime() - reminder_minutes * 60 * 1000);
      await conn.query(`
        INSERT INTO event_reminders (event_id, remind_at, method, is_sent)
        VALUES (?, ?, 'popup', 0)
      `, [id, remind_at]);
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
      "DELETE FROM events WHERE event_id = ? AND department = ?",
      [id, req.user.dept]
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

// GET check and send due reminders
const checkReminders = async (req, res) => {
  try {
    const [reminders] = await mysqlPool.query(`
      SELECT 
        er.reminder_id, er.event_id, er.remind_at,
        e.title, e.start_datetime, e.created_by, e.department, e.category
      FROM event_reminders er
      JOIN events e ON er.event_id = e.event_id
      WHERE er.is_sent = 0 AND er.remind_at <= NOW()
    `);

    if (reminders.length === 0) {
      return res.status(200).json({ message: "No reminders due", sent: 0 });
    }

    let totalSent = 0;

    for (const reminder of reminders) {
      const [participants] = await mysqlPool.query(`
        SELECT u.user_id, u.name, u.dept
        FROM event_participants ep
        JOIN user u ON ep.user_id = u.user_id
        WHERE ep.event_id = ?
        UNION
        SELECT u.user_id, u.name, u.dept
        FROM user u
        WHERE u.user_id = ?
      `, [reminder.event_id, reminder.created_by]);

      const now          = new Date();
      const eventStart   = new Date(reminder.start_datetime);
      const minutesUntil = Math.round((eventStart - now) / 60000);
      const timeLabel =
        minutesUntil <= 0   ? 'now' :
        minutesUntil < 60   ? `in ${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''}` :
        minutesUntil < 1440 ? `in ${Math.round(minutesUntil / 60)} hour${Math.round(minutesUntil / 60) !== 1 ? 's' : ''}` :
                              `in ${Math.round(minutesUntil / 1440)} day${Math.round(minutesUntil / 1440) !== 1 ? 's' : ''}`;

      const eventDate = eventStart.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      });
      const eventTime = eventStart.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit',
      });

      const message = [
        `Your event "${reminder.title}" starts ${timeLabel}.`,
        `Date: ${eventDate} at ${eventTime}`,
        reminder.category ? `Category: ${reminder.category}` : null,
      ].filter(Boolean).join('\n');

      const eventDept = reminder.department?.toLowerCase().trim();

      for (const user of participants) {
        const userDeptNorm = user.dept?.toLowerCase().trim();

        // ✅ Removed hardcoded validDepts list — just match the event's department directly
        if (!userDeptNorm || userDeptNorm !== eventDept) continue;

        try {
          await sendNotification({
            department:     userDeptNorm,
            user_id:        user.user_id,
            type:           'calendar_reminder',
            title:          `Reminder: ${reminder.title}`,
            message,
            link:           '/calendar',  // ✅ was hardcoded '/pdo/calendar'
            reference_id:   reminder.event_id,
            reference_type: 'calendar_event',
            created_by:     'System',
          });
          totalSent++;
        } catch (notifErr) {
          console.error(`Failed to notify user ${user.user_id}:`, notifErr.message);
        }
      }

      await mysqlPool.query(
        "UPDATE event_reminders SET is_sent = 1 WHERE reminder_id = ?",
        [reminder.reminder_id]
      );
    }

    return res.status(200).json({
      message:            'Reminders processed',
      reminders_checked:  reminders.length,
      notifications_sent: totalSent,
    });
  } catch (err) {
    console.error("checkReminders error:", err);
    return res.status(500).json({ message: "Failed to check reminders", error: err.message });
  }
};

// GET public holidays from external API
const getHolidays = async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/PH`);
    if (!response.ok) throw new Error("Failed to fetch holidays");
    const holidays = await response.json();
    res.json(holidays);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getEvents, getUsers, createEvent, updateEvent, deleteEvent, checkReminders, getHolidays };