const { database } = require('../../config');
const oracledb = require('oracledb');

// Get all facility visits
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

// Create new facility visit
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

        // Get user info from session/token
        const userName = req.user?.name || req.body.userName || 'System';

        // Handle file uploads
        const filePaths = req.files && req.files.length > 0
            ? req.files.map((file) => "uploads/" + file.filename).join(",")
            : null;

        // Convert the datetime from frontend to MySQL datetime format
        const mysqlDateTime = date_visited.replace('T', ' ') + ':00';

        // Get current timestamp
        const now = new Date();

        const sql = `
            INSERT INTO test_nscslcom_nscsl_dashboard.pdo_visit 
            (facility_code, facility_name, date_visited, province, status, remarks, mark, attachment_path, created_by, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await database.mysqlPool.query(sql, [
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
        ]);

        res.json({ 
            message: "Facility visit added successfully", 
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

// Update facility visit
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

        // Get user info from session/token
        const userName = req.user?.name || req.body.userName || 'System';

        // Get current record to preserve created_by and created_at
        const [currentRecord] = await database.mysqlPool.query(
            "SELECT attachment_path, created_by, created_at FROM test_nscslcom_nscsl_dashboard.pdo_visit WHERE id = ?",
            [id]
        );

        if (currentRecord.length === 0) {
            return res.status(404).json({ error: "Facility visit not found" });
        }

        const currentAttachmentPath = currentRecord[0].attachment_path;
        const createdBy = currentRecord[0].created_by;
        const createdAt = currentRecord[0].created_at;

        // Parse file management data
        let filesToKeep = [];
        let filesToDelete = [];

        try {
            if (files_to_keep) filesToKeep = JSON.parse(files_to_keep);
            if (files_to_delete) filesToDelete = JSON.parse(files_to_delete);
        } catch (error) {
            console.error("Error parsing file management data:", error);
        }

        // Handle new uploads
        let newFilePaths = [];
        if (req.files && req.files.length > 0) {
            newFilePaths = req.files.map((file) => "uploads/" + file.filename);
        }

        // Determine final attachment paths
        let attachmentPathString;

        if (files_to_keep !== undefined || files_to_delete !== undefined || newFilePaths.length > 0) {
            let finalFilePaths = [...filesToKeep, ...newFilePaths];
            attachmentPathString = finalFilePaths.length > 0 ? finalFilePaths.join(",") : null;

            // Delete files marked for deletion
            if (filesToDelete.length > 0) {
                const fs = require('fs');
                const path = require('path');
                filesToDelete.forEach(filePath => {
                    const fullPath = path.join(__dirname, '..', filePath);
                    fs.unlink(fullPath, (err) => {
                        if (err) {
                            console.error(`Error deleting file ${filePath}:`, err);
                        } else {
                            console.log(`Successfully deleted file: ${filePath}`);
                        }
                    });
                });
            }
        } else {
            // Preserve existing attachments and add new ones
            let existingPaths = currentAttachmentPath ? currentAttachmentPath.split(',') : [];
            let allPaths = [...existingPaths, ...newFilePaths];
            attachmentPathString = allPaths.length > 0 ? allPaths.join(",") : null;
        }

        // Convert datetime format for MySQL
        const mysqlDateTime = date_visited.includes('T') 
            ? date_visited.replace('T', ' ') + ':00'
            : date_visited;

        // Get current timestamp - just use new Date() object, mysql2 handles it
        const now = new Date();

        // Update database
        const sql = `
            UPDATE test_nscslcom_nscsl_dashboard.pdo_visit 
            SET facility_code=?, facility_name=?, date_visited=?, province=?, status=?, remarks=?, mark=?, attachment_path=?, 
                created_by=?, created_at=?, modified_by=?, modified_at=?
            WHERE id=?
        `;

        const [result] = await database.mysqlPool.query(sql, [
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
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Facility visit not found" });
        }

        res.json({
            message: "Facility visit updated successfully",
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

// Delete facility visit
const deleteVisit = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get attachment path before deleting
        const [record] = await database.mysqlPool.query(
            "SELECT attachment_path FROM test_nscslcom_nscsl_dashboard.pdo_visit WHERE id = ?",
            [id]
        );

        // Delete the record
        const [result] = await database.mysqlPool.query(
            "DELETE FROM test_nscslcom_nscsl_dashboard.pdo_visit WHERE id=?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Facility visit not found" });
        }

        // Delete associated files
        if (record.length > 0 && record[0].attachment_path) {
            const fs = require('fs');
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

// Update status only
const updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Get user info
        const userName = req.user?.name || req.body.userName || 'System';
        const now = new Date();

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

// Get facility status count (for doughnut chart)
const getStatusCount = async (req, res) => {
    try {
        const { date_from, date_to, province } = req.query;

        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const defaultFrom = new Date(year, month, 1).toISOString().split("T")[0];
        const defaultTo = new Date(year, month + 1, 0).toISOString().split("T")[0];

        const fromDate = date_from || defaultFrom;
        const toDate = date_to || defaultTo;

        // Build query dynamically based on whether province is provided
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

        const statusCount = {
            active: Number(results[0].active),
            inactive: Number(results[0].inactive),
            closed: Number(results[0].closed)
        };

        res.json(statusCount);
    } catch (err) {
        console.error("Status count error:", err);
        res.status(500).json({ 
            error: "Database error",
            message: err.message 
        });
    }
};

// Get facilities by status
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

// Get facility by code from Oracle
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

        // Get connection from pool
        connection = await oraclePool.getConnection();

        const query = `
            SELECT 
                PROVIDERID AS facilitycode, 
                ADRS_TYPE AS adrs_type, 
                DESCR1 AS facilityname,
                COUNTY as province
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