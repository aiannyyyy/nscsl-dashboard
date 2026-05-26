const { database } = require('../../config');
const oracledb = require('oracledb');

// ── STATUS MAP ────────────────────────────────────────────────────────────────
const statusMap = {
    '1': 'active',
    '0': 'inactive',
    '2': 'closed',
};

// ── SHARED HELPER: sync nsf_facilities + log if status changed ────────────────
const syncFacilityStatus = async (facility_code, mappedStatus, remarks, userName, now) => {
    const [existing] = await database.mysqlPool.query(
        `SELECT id, status FROM test_nscslcom_nscsl_dashboard.nsf_facilities WHERE facility_code = ?`,
        [facility_code]
    );

    if (existing.length === 0) return; // facility not found, skip silently

    const facilityId = existing[0].id;
    const oldStatus  = existing[0].status;

    await database.mysqlPool.query(
        `UPDATE test_nscslcom_nscsl_dashboard.nsf_facilities
         SET status = ?, remarks = ?, modified_by = ?, modified_date = ?
         WHERE facility_code = ?`,
        [mappedStatus, remarks || 'No remarks', userName, now, facility_code]
    );

    if (oldStatus !== mappedStatus) {
        const action = mappedStatus === 'active' ? 'reactivated' : 'deactivated';
        await database.mysqlPool.query(
            `INSERT INTO test_nscslcom_nscsl_dashboard.nsf_reactivation_logs
                (facility_id, action, old_status, new_status, remarks, created_by, created_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [
                facilityId,
                action,
                oldStatus,
                mappedStatus,
                `Status updated via facility visit by ${userName}`,
                userName
            ]
        );
    }
};

// ── GET ALL FACILITY VISITS ───────────────────────────────────────────────────
const getAllVisits = async (req, res) => {
    try {
        const [results] = await database.mysqlPool.query(
            "SELECT * FROM test_nscslcom_nscsl_dashboard.pdo_visit ORDER BY date_visited DESC"
        );
        res.json(results);
    } catch (err) {
        console.error("Database query error:", err);
        res.status(500).json({ 
            error: "Database query failed",
            message: err.message 
        });
    }
};

// ── CREATE FACILITY VISIT ─────────────────────────────────────────────────────
const createVisit = async (req, res) => {
    try {
        const {
            facility_code,
            facility_name,
            date_visited,
            province,
            status,
            remarks,
            mark,
        } = req.body;

        const userName = req.user?.name || req.body.userName || 'System';

        // Validate status
        const mappedStatus = statusMap[status];
        if (!mappedStatus) {
            return res.status(400).json({
                error: "Invalid status value",
                message: `Status "${status}" is not recognized. Must be 0, 1, or 2.`
            });
        }

        const filePaths = req.files && req.files.length > 0
            ? req.files.map((file) => "uploads/" + file.filename).join(",")
            : null;

        const mysqlDateTime = date_visited.replace('T', ' ') + ':00';
        const now = new Date();

        // 1. Insert visit record
        const [result] = await database.mysqlPool.query(
            `INSERT INTO test_nscslcom_nscsl_dashboard.pdo_visit 
             (facility_code, facility_name, date_visited, province, status, remarks, mark, attachment_path, created_by, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                facility_code,
                facility_name,
                mysqlDateTime,
                province,
                status,
                remarks || 'No remarks',
                mark,
                filePaths,
                userName,
                now
            ]
        );

        // 2. Sync nsf_facilities status + write log if changed
        await syncFacilityStatus(facility_code, mappedStatus, remarks, userName, now);

        res.json({ 
            message: "Facility visit added and facility record updated successfully", 
            id: result.insertId 
        });
    } catch (err) {
        console.error("Insert error:", err);
        res.status(500).json({ 
            error: "Failed to add facility visit",
            message: err.message 
        });
    }
};

// ── UPDATE FACILITY VISIT ─────────────────────────────────────────────────────
const updateVisit = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            facility_code,
            facility_name,
            date_visited,
            province,
            status,
            remarks,
            mark,
            files_to_keep,
            files_to_delete
        } = req.body;

        const userName = req.user?.name || req.body.userName || 'System';

        // Validate status
        const mappedStatus = statusMap[status];
        if (!mappedStatus) {
            return res.status(400).json({
                error: "Invalid status value",
                message: `Status "${status}" is not recognized. Must be 0, 1, or 2.`
            });
        }

        // Get current record
        const [currentRecord] = await database.mysqlPool.query(
            "SELECT attachment_path, created_by, created_at FROM test_nscslcom_nscsl_dashboard.pdo_visit WHERE id = ?",
            [id]
        );

        if (currentRecord.length === 0) {
            return res.status(404).json({ error: "Facility visit not found" });
        }

        const { 
            attachment_path: currentAttachmentPath, 
            created_by: createdBy, 
            created_at: createdAt 
        } = currentRecord[0];

        // Parse file management data
        let filesToKeep   = [];
        let filesToDelete = [];
        try {
            if (files_to_keep)   filesToKeep   = JSON.parse(files_to_keep);
            if (files_to_delete) filesToDelete = JSON.parse(files_to_delete);
        } catch (error) {
            console.error("Error parsing file management data:", error);
        }

        // Handle new uploads
        const newFilePaths = req.files && req.files.length > 0
            ? req.files.map((file) => "uploads/" + file.filename)
            : [];

        // Determine final attachment paths
        let attachmentPathString;
        if (files_to_keep !== undefined || files_to_delete !== undefined || newFilePaths.length > 0) {
            const finalFilePaths = [...filesToKeep, ...newFilePaths];
            attachmentPathString = finalFilePaths.length > 0 ? finalFilePaths.join(",") : null;

            if (filesToDelete.length > 0) {
                const fs   = require('fs');
                const path = require('path');
                filesToDelete.forEach(filePath => {
                    const fullPath = path.join(__dirname, '..', filePath);
                    fs.unlink(fullPath, (err) => {
                        if (err) console.error(`Error deleting file ${filePath}:`, err);
                        else console.log(`Successfully deleted file: ${filePath}`);
                    });
                });
            }
        } else {
            const existingPaths = currentAttachmentPath ? currentAttachmentPath.split(',') : [];
            const allPaths = [...existingPaths, ...newFilePaths];
            attachmentPathString = allPaths.length > 0 ? allPaths.join(",") : null;
        }

        const mysqlDateTime = date_visited.includes('T')
            ? date_visited.replace('T', ' ') + ':00'
            : date_visited;

        const now = new Date();

        // 1. Update visit record
        const [result] = await database.mysqlPool.query(
            `UPDATE test_nscslcom_nscsl_dashboard.pdo_visit 
             SET facility_code=?, facility_name=?, date_visited=?, province=?, status=?, remarks=?, mark=?, attachment_path=?, 
                 created_by=?, created_at=?, modified_by=?, modified_at=?
             WHERE id=?`,
            [
                facility_code,
                facility_name,
                mysqlDateTime,
                province,
                status,
                remarks || 'No remarks',
                mark,
                attachmentPathString,
                createdBy,
                createdAt,
                userName,
                now,
                id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Facility visit not found" });
        }

        // 2. Sync nsf_facilities status + write log if changed
        await syncFacilityStatus(facility_code, mappedStatus, remarks, userName, now);

        res.json({
            message: "Facility visit updated and facility record synced successfully",
            attachments_updated: attachmentPathString ? attachmentPathString.split(',').length : 0,
            files_deleted: filesToDelete.length
        });
    } catch (err) {
        console.error("Update error:", err);
        res.status(500).json({ 
            error: "Failed to update facility visit",
            message: err.message 
        });
    }
};

// ── DELETE FACILITY VISIT ─────────────────────────────────────────────────────
const deleteVisit = async (req, res) => {
    try {
        const { id } = req.params;

        const [record] = await database.mysqlPool.query(
            "SELECT attachment_path FROM test_nscslcom_nscsl_dashboard.pdo_visit WHERE id = ?",
            [id]
        );

        const [result] = await database.mysqlPool.query(
            "DELETE FROM test_nscslcom_nscsl_dashboard.pdo_visit WHERE id=?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Facility visit not found" });
        }

        if (record.length > 0 && record[0].attachment_path) {
            const fs   = require('fs');
            const path = require('path');
            const files = record[0].attachment_path.split(',');
            files.forEach(filePath => {
                const fullPath = path.join(__dirname, '..', filePath);
                fs.unlink(fullPath, (err) => {
                    if (err) console.error(`Error deleting file ${filePath}:`, err);
                });
            });
        }

        res.json({ message: "Facility visit deleted successfully" });
    } catch (err) {
        console.error("Delete error:", err);
        res.status(500).json({ 
            error: "Failed to delete facility visit",
            message: err.message 
        });
    }
};

// ── UPDATE STATUS ONLY ────────────────────────────────────────────────────────
const updateStatus = async (req, res) => {
    try {
        const { id }     = req.params;
        const { status } = req.body;

        const userName = req.user?.name || req.body.userName || 'System';
        const now      = new Date();

        const [result] = await database.mysqlPool.query(
            "UPDATE test_nscslcom_nscsl_dashboard.pdo_visit SET status=?, modified_by=?, modified_at=? WHERE id=?",
            [status, userName, now, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Facility visit not found" });
        }

        res.json({ message: "Status updated successfully" });
    } catch (err) {
        console.error("Status update error:", err);
        res.status(500).json({ 
            error: "Failed to update status",
            message: err.message 
        });
    }
};

// ── GET FACILITY STATUS COUNT (doughnut chart) ────────────────────────────────
const getStatusCount = async (req, res) => {
    try {
        const { date_from, date_to, province } = req.query;

        const today        = new Date();
        const year         = today.getFullYear();
        const month        = today.getMonth();
        const defaultFrom  = new Date(year, month, 1).toISOString().split("T")[0];
        const defaultTo    = new Date(year, month + 1, 0).toISOString().split("T")[0];

        const fromDate = date_from || defaultFrom;
        const toDate   = date_to   || defaultTo;

        let sql = `
            SELECT
                COUNT(CASE WHEN status = '1' THEN 1 END) AS active,
                COUNT(CASE WHEN status = '0' THEN 1 END) AS inactive,
                COUNT(CASE WHEN status = '2' THEN 1 END) AS closed
            FROM test_nscslcom_nscsl_dashboard.pdo_visit
            WHERE date_visited BETWEEN ? AND ?
        `;

        const params = [fromDate, toDate];

        if (province && province.trim() !== '') {
            sql += ` AND province = ?`;
            params.push(province.trim());
        }

        const [results] = await database.mysqlPool.query(sql, params);

        res.json({
            active:   Number(results[0].active),
            inactive: Number(results[0].inactive),
            closed:   Number(results[0].closed)
        });
    } catch (err) {
        console.error("Status count error:", err);
        res.status(500).json({ 
            error: "Database error",
            message: err.message 
        });
    }
};

// ── GET FACILITIES BY STATUS ──────────────────────────────────────────────────
const getFacilitiesByStatus = async (req, res) => {
    try {
        const { status } = req.params;
        const { startDate, endDate } = req.query;

        let sql = `
            SELECT 
                facility_code,
                facility_name,
                date_visited,
                province
            FROM test_nscslcom_nscsl_dashboard.pdo_visit
            WHERE status = ?
        `;

        const params = [status];

        if (startDate && endDate) {
            sql += " AND date_visited BETWEEN ? AND ?";
            params.push(startDate, endDate);
        } else if (startDate) {
            sql += " AND date_visited >= ?";
            params.push(startDate);
        } else if (endDate) {
            sql += " AND date_visited <= ?";
            params.push(endDate);
        }

        const [results] = await database.mysqlPool.query(sql, params);
        res.json(results);
    } catch (err) {
        console.error("Facility filter error:", err);
        res.status(500).json({ 
            error: "Failed to retrieve facilities",
            message: err.message 
        });
    }
};

// ── GET FACILITY BY CODE (Oracle) ─────────────────────────────────────────────
const getFacilityByCode = async (req, res) => {
    let connection;
    try {
        const oraclePool = req.app.locals.oracleDb;

        if (!oraclePool) {
            return res.status(500).json({ error: "Oracle connection pool is not initialized" });
        }

        const { facilitycode } = req.query;

        if (!facilitycode) {
            return res.status(400).json({ error: 'Facility code is required' });
        }

        connection = await oraclePool.getConnection();

        const query = `
            SELECT 
                PROVIDERID AS facilitycode, 
                ADRS_TYPE  AS adrs_type, 
                DESCR1     AS facilityname,
                COUNTY     AS province
            FROM PHMSDS.REF_PROVIDER_ADDRESS 
            WHERE ADRS_TYPE = '1'
            AND PROVIDERID = :facilitycode
        `;

        const result = await connection.execute(query, [facilitycode], {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        if (result.rows && result.rows.length > 0) {
            const facility = result.rows[0];
            res.json([[
                facility.FACILITYCODE,
                facility.ADRS_TYPE || '',
                facility.FACILITYNAME,
                facility.PROVINCE || ''
            ]]);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error("Facility lookup error:", error);
        res.status(500).json({ 
            error: "Internal Server Error", 
            details: error.message 
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing Oracle connection:', err);
            }
        }
    }
};

// ── EXPORTS ───────────────────────────────────────────────────────────────────
module.exports = {
    getAllVisits,
    createVisit,
    updateVisit,
    deleteVisit,
    updateStatus,
    getStatusCount,
    getFacilitiesByStatus,
    getFacilityByCode
};