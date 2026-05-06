const { database } = require('../config');

/**
 * Department string for matching department-wide rows (user_id IS NULL).
 * Normalize follow-up spellings so LOWER(notification.department) can match inserts like "Followup".
 */
function broadcastDeptParam(dept) {
    if (dept == null) return '';
    const trimmed = String(dept).trim();
    /** Collapse "Follow - Up", "Follow  Up" → canonical "follow up" for comparisons */
    const normalized = trimmed
        .toLowerCase()
        .replace(/-/g, ' ')
        .replace(/\s+/g, ' ');
    if (
        normalized === 'followup'
        || normalized === 'follow up'
        || normalized.startsWith('follow up ')
    ) {
        return 'followup';
    }
    return trimmed;
}

// Get all notifications for a user
const getNotifications = async (req, res) => {
    try {
        const userId = req.user?.user_id;
        const deptForBroadcast = broadcastDeptParam(req.user?.dept);
        const { limit = 50, offset = 0 } = req.query;

        console.log('==========================================');
        console.log('🔍 GETTING NOTIFICATIONS FOR:');
        console.log('User ID:', userId);
        console.log('User Dept (broadcast match):', deptForBroadcast || '(none)');
        console.log('User Name:', req.user?.name);
        console.log('==========================================');

        if (userId == null) {
            return res.status(400).json({ error: "User not found" });
        }

        // ✅ FIXED LOGIC:
        // Show notification if:
        //   A) It is specifically for this user (user_id = me), regardless of department
        //   OR
        //   B) It is a department-wide broadcast (user_id IS NULL) for my department
        //
        // This prevents Follow Up Head from seeing Program Manager's user-specific notifications
        // while still allowing department-wide endorsement notifications to work as before.
        const sql = `
            SELECT 
                id,
                department,
                user_id,
                type,
                title,
                message,
                link,
                reference_id,
                reference_type,
                is_read,
                created_by,
                created_at,
                read_at
            FROM test_nscslcom_nscsl_dashboard.notifications
            WHERE is_deleted = FALSE
                AND (
                    user_id = ?
                    OR (user_id IS NULL AND LOWER(department) = LOWER(?))
                )
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;

        console.log('📝 Query params:', [userId, deptForBroadcast, parseInt(limit), parseInt(offset)]);

        const [results] = await database.mysqlPool.query(sql, [
            userId,
            deptForBroadcast,
            parseInt(limit),
            parseInt(offset)
        ]);

        console.log('📊 Results:', results.length, 'notifications found');

        res.json(results);
    } catch (err) {
        console.error("❌ Get notifications error:", err);
        res.status(500).json({
            error: "Failed to retrieve notifications",
            message: err.message
        });
    }
};

// Get unread count
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user?.user_id;
        const deptForBroadcast = broadcastDeptParam(req.user?.dept);

        if (userId == null) {
            return res.status(400).json({ error: "User not found" });
        }

        // ✅ Same fixed logic as getNotifications
        const sql = `
            SELECT COUNT(*) as count
            FROM test_nscslcom_nscsl_dashboard.notifications
            WHERE is_deleted = FALSE
                AND is_read = FALSE
                AND (
                    user_id = ?
                    OR (user_id IS NULL AND LOWER(department) = LOWER(?))
                )
        `;

        const [results] = await database.mysqlPool.query(sql, [userId, deptForBroadcast]);

        res.json({ count: Number(results[0].count) });
    } catch (err) {
        console.error("Get unread count error:", err);
        res.status(500).json({
            error: "Failed to get unread count",
            message: err.message
        });
    }
};

// Create a new notification
const createNotification = async (req, res) => {
    try {
        const {
            department,
            user_id,
            type,
            title,
            message,
            link,
            reference_id,
            reference_type
        } = req.body;

        const userName = req.user?.name || 'System';
        const now = new Date();

        if (!department || !type || !title || !message) {
            return res.status(400).json({
                error: "Missing required fields",
                required: ['department', 'type', 'title', 'message']
            });
        }

        const validDepartments = ['admin', 'administrator', 'program', 'laboratory', 'followup'];
        if (!validDepartments.includes(department.toLowerCase())) {
            return res.status(400).json({
                error: "Invalid department",
                valid: validDepartments
            });
        }

        const capitalizeFirstLetter = (str) => {
            if (!str) return str;
            return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        };

        const sql = `
            INSERT INTO test_nscslcom_nscsl_dashboard.notifications 
            (department, user_id, type, title, message, link, reference_id, reference_type, created_by, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await database.mysqlPool.query(sql, [
            capitalizeFirstLetter(department),
            user_id || null,
            type,
            title,
            message,
            link || null,
            reference_id || null,
            reference_type || null,
            userName,
            now
        ]);

        res.json({
            message: "Notification created successfully",
            id: result.insertId
        });
    } catch (err) {
        console.error("Create notification error:", err);
        res.status(500).json({
            error: "Failed to create notification",
            message: err.message
        });
    }
};

// Mark notification as read
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const now = new Date();

        const sql = `
            UPDATE test_nscslcom_nscsl_dashboard.notifications 
            SET is_read = TRUE, read_at = ?
            WHERE id = ?
        `;

        const [result] = await database.mysqlPool.query(sql, [now, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Notification not found" });
        }

        res.json({ message: "Notification marked as read" });
    } catch (err) {
        console.error("Mark as read error:", err);
        res.status(500).json({
            error: "Failed to mark notification as read",
            message: err.message
        });
    }
};

// Mark all notifications as read for this user
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user?.user_id;
        const deptForBroadcast = broadcastDeptParam(req.user?.dept);
        const now = new Date();

        if (userId == null) {
            return res.status(400).json({ error: "User not found" });
        }

        // ✅ Same fixed logic
        const sql = `
            UPDATE test_nscslcom_nscsl_dashboard.notifications 
            SET is_read = TRUE, read_at = ?
            WHERE is_deleted = FALSE
                AND is_read = FALSE
                AND (
                    user_id = ?
                    OR (user_id IS NULL AND LOWER(department) = LOWER(?))
                )
        `;

        const [result] = await database.mysqlPool.query(sql, [now, userId, deptForBroadcast]);

        res.json({
            message: "All notifications marked as read",
            updated: result.affectedRows
        });
    } catch (err) {
        console.error("Mark all as read error:", err);
        res.status(500).json({
            error: "Failed to mark all notifications as read",
            message: err.message
        });
    }
};

// Delete notification (soft delete)
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const now = new Date();

        const sql = `
            UPDATE test_nscslcom_nscsl_dashboard.notifications 
            SET is_deleted = TRUE, deleted_at = ?
            WHERE id = ?
        `;

        const [result] = await database.mysqlPool.query(sql, [now, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Notification not found" });
        }

        res.json({ message: "Notification deleted successfully" });
    } catch (err) {
        console.error("Delete notification error:", err);
        res.status(500).json({
            error: "Failed to delete notification",
            message: err.message
        });
    }
};

// Delete all notifications for this user
const deleteAllNotifications = async (req, res) => {
    try {
        const userId = req.user?.user_id;
        const deptForBroadcast = broadcastDeptParam(req.user?.dept);
        const now = new Date();

        if (userId == null) {
            return res.status(400).json({ error: "User not found" });
        }

        // ✅ Same fixed logic
        const sql = `
            UPDATE test_nscslcom_nscsl_dashboard.notifications 
            SET is_deleted = TRUE, deleted_at = ?
            WHERE is_deleted = FALSE
                AND (
                    user_id = ?
                    OR (user_id IS NULL AND LOWER(department) = LOWER(?))
                )
        `;

        const [result] = await database.mysqlPool.query(sql, [now, userId, deptForBroadcast]);

        res.json({
            message: "All notifications deleted successfully",
            deleted: result.affectedRows
        });
    } catch (err) {
        console.error("Delete all notifications error:", err);
        res.status(500).json({
            error: "Failed to delete all notifications",
            message: err.message
        });
    }
};

module.exports = {
    getNotifications,
    getUnreadCount,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications
};