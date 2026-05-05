// utils/notificationHelper.js
const { database } = require('../config');

/**
 * Capitalize first letter of a string
 */
function capitalizeFirstLetter(string) {
    if (!string) return string;
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

/**
 * Send notification to a department or specific user
 */
async function sendNotification(options) {
    try {
        console.log('🔔 ========== SENDING NOTIFICATION ==========');
        console.log('📦 Input options:', JSON.stringify(options, null, 2));

        const {
            department,
            user_id = null,
            type,
            title,
            message,
            link = null,
            reference_id = null,
            reference_type = null,
            created_by
        } = options;

        // Validate required fields
        if (!department || !type || !title || !message || !created_by) {
            const missing = [];
            if (!department) missing.push('department');
            if (!type) missing.push('type');
            if (!title) missing.push('title');
            if (!message) missing.push('message');
            if (!created_by) missing.push('created_by');
            
            console.error('❌ Missing required fields:', missing.join(', '));
            throw new Error(`Missing required notification fields: ${missing.join(', ')}`);
        }

        // Validate department
        const validDepartments = ['admin', 'administrator', 'program', 'laboratory', 'followup'];
        if (!validDepartments.includes(department.toLowerCase())) {
            console.error('❌ Invalid department:', department);
            throw new Error(`Invalid department. Valid options: ${validDepartments.join(', ')}`);
        }

        const now = new Date();
        const capitalizedDept = capitalizeFirstLetter(department);

        console.log('✅ Validation passed');
        console.log('📝 Will save with department:', capitalizedDept);
        if (user_id) {
            console.log('👤 Specific user ID:', user_id);
        } else {
            console.log('👥 For all users in department');
        }

        const sql = `
            INSERT INTO test_nscslcom_nscsl_dashboard.notifications 
            (department, user_id, type, title, message, link, reference_id, reference_type, created_by, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            capitalizedDept,
            user_id,
            type,
            title,
            message,
            link,
            reference_id,
            reference_type,
            created_by,
            now
        ];

        const [result] = await database.mysqlPool.query(sql, params);

        console.log('✅ Notification saved successfully!');
        console.log('🆔 Notification ID:', result.insertId);
        console.log('🔔 ========================================');

        return result.insertId;

    } catch (error) {
        console.error('❌ ========== NOTIFICATION ERROR ==========');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('❌ ========================================');
        throw error;
    }
}

/**
 * Send notifications to multiple departments at once
 */
async function sendToMultipleDepartments(departments, notificationData) {
    try {
        const promises = departments.map(dept => 
            sendNotification({
                ...notificationData,
                department: dept
            })
        );

        const results = await Promise.all(promises);
        console.log(`✅ Notifications sent to ${departments.length} departments`);
        return results;

    } catch (error) {
        console.error('❌ Failed to send notifications to multiple departments:', error);
        throw error;
    }
}

/**
 * Normalize dept from the user row to a value accepted by sendNotification().
 */
function normalizeUserDeptForNotification(dept) {
    if (!dept) return null;
    const d = String(dept).toLowerCase().trim();
    if (d === 'administrator') return 'administrator';
    if (d === 'admin') return 'admin';
    if (d === 'program' || d === 'pdo') return 'program';
    if (d === 'laboratory' || d === 'lab') return 'laboratory';
    if (d === 'follow up' || d === 'followup') return 'followup';
    return d;
}

/**
 * Send one notification per user matching any of the given job titles (user.position).
 */
async function sendToUsersByPosition(options) {
    try {
        const { positions, ...notificationData } = options;
        const posList = Array.isArray(positions) ? positions : positions ? [positions] : [];
        if (posList.length === 0) {
            console.log('⚠️ sendToUsersByPosition: no positions provided');
            return [];
        }

        const placeholders = posList.map(() => '?').join(',');
        const [users] = await database.mysqlPool.query(
            `SELECT user_id, dept, name FROM test_nscslcom_nscsl_dashboard.user 
             WHERE position IN (${placeholders})`,
            posList
        );

        if (users.length === 0) {
            console.log(`⚠️ No users found for position(s): ${posList.join(', ')}`);
            return [];
        }

        const validDepartments = ['admin', 'administrator', 'program', 'laboratory', 'followup'];
        const results = [];

        for (const user of users) {
            const department = normalizeUserDeptForNotification(user.dept);
            if (!department || !validDepartments.includes(department)) {
                console.warn(
                    `⚠️ Skipping notification for user ${user.user_id} (${user.name}): dept "${user.dept}" → invalid for notifications`
                );
                continue;
            }
            try {
                const id = await sendNotification({
                    ...notificationData,
                    department,
                    user_id: user.user_id,
                });
                results.push(id);
            } catch (err) {
                console.error(`❌ Notification failed for user ${user.user_id}:`, err.message);
            }
        }

        console.log(`✅ sendToUsersByPosition: ${results.length} notification(s) for position(s) ${posList.join(', ')}`);
        return results;
    } catch (error) {
        console.error('❌ sendToUsersByPosition failed:', error);
        throw error;
    }
}

/**
 * Send notification to ALL users in a department (individual notifications per user)
 */
async function sendToAllUsersInDepartment(options) {
    try {
        const { department, ...notificationData } = options;

        console.log(`🔍 Finding users in ${department} department...`);

        // Get all users in the target department (case-insensitive match)
        const [users] = await database.mysqlPool.query(
            `SELECT user_id, name, dept FROM test_nscslcom_nscsl_dashboard.user 
             WHERE LOWER(dept) = LOWER(?)`,
            [department]
        );

        console.log(`👥 Found ${users.length} users in ${department} department:`);
        users.forEach(u => console.log(`   - ${u.name} (ID: ${u.user_id}, Dept: ${u.dept})`));

        if (users.length === 0) {
            console.log(`⚠️ No users found in ${department} department`);
            return [];
        }

        // Create individual notification for each user
        const promises = users.map(user => {
            console.log(`📤 Sending to user: ${user.name} (ID: ${user.user_id})`);
            return sendNotification({
                ...notificationData,
                department: department,
                user_id: user.user_id
            });
        });

        const results = await Promise.all(promises);
        console.log(`✅ Successfully sent ${results.length} individual notifications`);
        return results;

    } catch (error) {
        console.error('❌ Failed to send notifications to department users:', error);
        throw error;
    }
}

module.exports = {
    sendNotification,
    sendToMultipleDepartments,
    sendToAllUsersInDepartment,
    sendToUsersByPosition
};