// controllers/IntranetController/helpers/intranetHelpers.js
// Shared helper functions for all intranet controllers
// - validateUser        → queries dashboard user table (user_id)
// - getUserDetails      → queries dashboard user table
// - addActivityLog      → writes to intranet activity_logs
// - sanitizeInput       → pure function
// - executeWithTransaction → uses inhousePool

const validator = require('validator');
const { inhousePool, mysqlPool } = require('../../../config/database');

// ============================================
// VALIDATE USER
// Checks dashboard's user table by user_id
// ============================================
async function validateUser(userId) {
    console.log('🔍 [Intranet] Validating user ID:', userId);

    try {
        const [rows] = await mysqlPool.query(
            'SELECT user_id, name FROM user WHERE user_id = ?',
            [userId]
        );

        if (rows.length > 0) {
            console.log('✅ [Intranet] User found:', rows[0].name);
            return true;
        }

        console.log('❌ [Intranet] No user found with ID:', userId);
        return false;
    } catch (error) {
        console.error('💥 [Intranet] Error validating user:', error);
        return false;
    }
}

// ============================================
// GET USER DETAILS
// Returns user info from dashboard user table
// Maps dashboard fields → intranet field names
// ============================================
async function getUserDetails(userId) {
    try {
        const [rows] = await mysqlPool.query(
            'SELECT user_id, username, name, dept, position, role FROM user WHERE user_id = ?',
            [userId]
        );

        if (rows.length === 0) return null;

        const user = rows[0];

        // Return both dashboard and intranet field names
        return {
            id:         user.user_id,
            user_id:    user.user_id,
            user_name:  user.username,
            username:   user.username,
            name:       user.name,
            department: user.dept,
            dept:       user.dept,
            position:   user.position,
            role:       user.role
        };
    } catch (error) {
        console.error('💥 [Intranet] Error getting user details:', error);
        return null;
    }
}

// ============================================
// GET ALL USERS
// Returns all users from dashboard user table
// Mapped to intranet field names for dropdowns
// ============================================
async function getAllUsers(excludeUserId = null) {
    try {
        let query  = 'SELECT user_id, username, name, dept, position, role FROM user';
        const params = [];

        if (excludeUserId) {
            query += ' WHERE user_id != ?';
            params.push(excludeUserId);
        }

        query += ' ORDER BY name ASC';

        const [rows] = await mysqlPool.query(query, params);

        return rows.map(u => ({
            id:         u.user_id,
            user_id:    u.user_id,
            user_name:  u.username,
            name:       u.name,
            department: u.dept,
            position:   u.position,
            role:       u.role
        }));
    } catch (error) {
        console.error('💥 [Intranet] Error getting all users:', error);
        return [];
    }
}

// ============================================
// ADD ACTIVITY LOG
// Writes to intranet activity_logs table
// ============================================
async function addActivityLog(userId, action, targetType, targetId, targetName, additionalInfo = null) {
    try {
        const actionMap = {
            'create':     'CREATE',
            'upload':     'CREATE',
            'update':     'UPDATE',
            'rename':     'RENAME',
            'move':       'MOVE',
            'move_rename':'MOVE',
            'delete':     'DELETE',
            'download':   'DOWNLOAD',
            'copy':       'COPY',
            'share':      'SHARED',
            'star':       'UPDATE',
            'unstar':     'UPDATE'
        };

        const entityTypeMap = {
            'category': 'CATEGORY',
            'folder':   'FOLDER',
            'file':     'FILE'
        };

        const mappedAction     = actionMap[action]         || 'CREATE';
        const mappedEntityType = entityTypeMap[targetType] || 'FILE';

        await inhousePool.query(
            `INSERT INTO activity_logs 
             (user_id, action, target_type, target_id, target_name, additional_info, created_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [userId, mappedAction, mappedEntityType, targetId, targetName, additionalInfo]
        );

        console.log(`📝 [Intranet] Log: ${mappedAction} ${mappedEntityType} (${targetName}) by user ${userId}`);
    } catch (error) {
        console.error('💥 [Intranet] Error adding activity log:', error);
    }
}

// ============================================
// SANITIZE INPUT
// Pure function — no DB needed
// ============================================
function sanitizeInput(input) {
    if (!input) return input;
    return validator.escape(input.toString().trim());
}

// ============================================
// CHECK FILE ACCESS
// Checks if user owns or has shared access
// fileType: 'regular' | 'category'
// ============================================
async function checkFileAccess(fileId, userId, fileType = 'regular') {
    try {
        const fileTable   = fileType === 'regular' ? 'files' : 'categories_files';
        const shareColumn = fileType === 'regular' ? 'file_id' : 'category_file_id';

        const [files] = await inhousePool.query(
            `SELECT created_by FROM ${fileTable} WHERE id = ?`,
            [fileId]
        );

        if (files.length === 0) {
            return { hasAccess: false, isOwner: false, error: 'File not found' };
        }

        if (files[0].created_by === userId) {
            return { hasAccess: true, isOwner: true };
        }

        const [shares] = await inhousePool.query(
            `SELECT id FROM file_shares WHERE ${shareColumn} = ? AND shared_with = ?`,
            [fileId, userId]
        );

        if (shares.length > 0) {
            return { hasAccess: true, isOwner: false };
        }

        return { hasAccess: false, isOwner: false, error: 'Access denied' };

    } catch (error) {
        console.error('💥 [Intranet] Error checking file access:', error);
        return { hasAccess: false, isOwner: false, error: 'Access check failed' };
    }
}

// ============================================
// EXECUTE WITH TRANSACTION
// Wraps multiple DB operations in a transaction
// ============================================
async function executeWithTransaction(operations) {
    const connection = await inhousePool.getConnection();
    try {
        await connection.beginTransaction();

        const results = [];
        for (const operation of operations) {
            const result = await operation(connection);
            results.push(result);
        }

        await connection.commit();
        return results;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// ============================================
// EXPORTS
// ============================================
module.exports = {
    validateUser,
    getUserDetails,
    getAllUsers,
    addActivityLog,
    sanitizeInput,
    checkFileAccess,
    executeWithTransaction
};