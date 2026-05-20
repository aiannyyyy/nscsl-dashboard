const { mysqlPool } = require("../../config/database");
const oracledb = require('oracledb');
const path = require("path");
const fs = require('fs');

// Helper function to safely trim and truncate strings
const safeTrim = (str, maxLength) => {
    if (!str) return null;
    const trimmed = str.trim();
    if (trimmed.length > maxLength) {
        console.warn(`⚠️ Truncating field from ${trimmed.length} to ${maxLength} chars: "${trimmed}"`);
        return trimmed.substring(0, maxLength);
    }
    return trimmed;
};

// Get all car list
const getAllCarList = async (req, res) => {
    try {
        const query = "SELECT * FROM test_nscslcom_nscsl_dashboard.list_car ORDER BY date_endorsed DESC";
        
        const [results] = await mysqlPool.query(query);
        
        res.json({
            success: true,
            data: results,
            count: results.length
        });
    } catch (err) {
        console.error("MySQL query error:", err);
        return res.status(500).json({ 
            error: "Database Query Error",
            message: err.message,
            code: err.code
        });
    }
};

// Get filtered car list by status and date range
const getFilteredCarList = async (req, res) => {
    try {
        const { status, date_start, date_end } = req.query;

        const query = `
            SELECT * FROM test_nscslcom_nscsl_dashboard.list_car
            WHERE LOWER(status) = LOWER(?)
            AND DATE(date_endorsed) BETWEEN ? AND ?
            ORDER BY date_endorsed DESC
        `;

        const [results] = await mysqlPool.query(query, [status, date_start, date_end]);

        return res.status(200).json({
            success: true,
            total: results.length,
            data: results
        });
    } catch (err) {
        console.error("MySQL query error:", err);
        return res.status(500).json({
            error: "Database Query Error",
            message: err.message,
            code: err.code
        });
    }
};

// Get car list grouped by province
const getCarListGroupedByProvince = async (req, res) => {
    try {
        const { status, date_start, date_end, province } = req.query;

        let query = `
            SELECT province, COUNT(DISTINCT id) as count
            FROM test_nscslcom_nscsl_dashboard.list_car
            WHERE province IS NOT NULL AND province != ''
        `;

        const params = [];

        if (status && status !== '') {
            query += ` AND LOWER(status) = LOWER(?)`;
            params.push(status);
        }

        if (date_start && date_end) {
            query += ` AND DATE(date_endorsed) BETWEEN ? AND ?`;
            params.push(date_start);
            params.push(date_end);
        }

        // ← add this block
        if (province && province !== '') {
            query += ` AND LOWER(province) = LOWER(?)`;
            params.push(province);
        }

        query += ` GROUP BY province ORDER BY count DESC`;

        const [results] = await mysqlPool.query(query, params);

        return res.status(200).json({
            success: true,
            total: results.length,
            data: results
        });
    } catch (err) {
        console.error("MySQL query error:", err);
        return res.status(500).json({
            error: "Database Query Error",
            message: err.message,
            code: err.code
        });
    }
};

// Get car list grouped by sub_code1 (for pie chart with date range filter)
const getCarListGrouped = async (req, res) => {
    try {
        const { from, to, province, status } = req.query;

        let query = `
            SELECT sub_code1, COUNT(*) as count
            FROM test_nscslcom_nscsl_dashboard.list_car
        `;
        const params = [];
        const conditions = [];

        if (from && to) {
            conditions.push(`date_endorsed BETWEEN ? AND ?`);
            params.push(from, to);
        }

        if (province && province !== '') {
            conditions.push(`LOWER(province) = LOWER(?)`);
            params.push(province);
        }

        if (status && status !== '') {
            conditions.push(`LOWER(status) = LOWER(?)`);
            params.push(status);
        }

        if (conditions.length > 0) {
            query += ` WHERE ` + conditions.join(' AND ');
        }

        query += ` GROUP BY sub_code1 ORDER BY count DESC`;

        const [results] = await mysqlPool.query(query, params);

        res.json({ success: true, data: results });
    } catch (err) {
        console.error("MySQL query error:", err);
        return res.status(500).json({ 
            error: "Database Query Error",
            message: err.message,
            code: err.code,
            sqlMessage: err.sqlMessage
        });
    }
};

// Get next case number for auto-generation
const getNextCaseNumber = async (req, res) => {
    try {
        const { province, year } = req.query;

        if (!province || !year) {
            return res.status(400).json({
                success: false,
                message: "Province code and year are required"
            });
        }

        // Query to find the highest case number for the given province and year
        const query = `
            SELECT case_no 
            FROM test_nscslcom_nscsl_dashboard.list_car
            WHERE case_no LIKE ?
            ORDER BY case_no DESC
            LIMIT 1
        `;

        const pattern = `CAR-PDO-${year}-%${province}`;
        
        const [results] = await mysqlPool.query(query, [pattern]);

        let nextNumber = 1;

        if (results && results.length > 0) {
            // Extract the incremental number from the case_no
            // Format: CAR-PDO-26-001-LAG
            const lastCaseNo = results[0].case_no;
            const parts = lastCaseNo.split('-');
            
            if (parts.length >= 4) {
                const lastIncrement = parseInt(parts[3]);
                if (!isNaN(lastIncrement)) {
                    nextNumber = lastIncrement + 1;
                }
            }
        }

        res.json({
            success: true,
            nextNumber: nextNumber,
            formattedNumber: nextNumber.toString().padStart(3, '0'),
            preview: `CAR-PDO-${year}-${nextNumber.toString().padStart(3, '0')}-${province}`
        });

    } catch (error) {
        console.error("Get next case number error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get next case number",
            error: error.message
        });
    }
};

// Add new car record
const addCar = async (req, res) => {
    console.log("\n=== ADD-CAR CONTROLLER DEBUG START ===");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Request headers:", req.headers);
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("File info:", req.file ? {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path
    } : "No file uploaded");

    try {
        // Test database connection first
        await mysqlPool.query("SELECT 1 as connection_test");
        console.log("Database connection test PASSED");

        // Extract and validate form data
        const {
            case_no,
            date_endorsed,
            endorsed_by,
            facility_code,
            facility_name,
            city,
            province,
            labno,
            repeat_field,
            status,
            number_sample,
            case_code,
            sub_code1,
            sub_code2,
            sub_code3,
            sub_code4,
            remarks,
            frc,
            wrc,
            prepared_by,
            followup_on,
            reviewed_on,
            closed_on,
        } = req.body;

        // ⭐ Get username from request (passed from frontend)
        const userName = req.user?.name || req.body.userName || 'System';

        console.log("Extracted form data:");
        console.log("- case_no:", case_no);
        console.log("- date_endorsed:", date_endorsed);
        console.log("- facility_code:", facility_code);
        console.log("- facility_name:", facility_name);
        console.log("- city:", city);
        console.log("- province:", province);
        console.log("- userName:", userName);

        // Validate required fields
        const missingFields = [];
        if (!case_no || !case_no.trim()) missingFields.push('case_no');
        if (!date_endorsed) missingFields.push('date_endorsed');
        if (!facility_code || !facility_code.trim()) missingFields.push('facility_code');

        if (missingFields.length > 0) {
            console.error("Missing required fields:", missingFields);
            return res.status(400).json({
                error: "Validation Error",
                message: `Missing required fields: ${missingFields.join(', ')}`,
                missingFields: missingFields
            });
        }

        // File path handling
        const attachment_path = req.file ? `/uploads/${req.file.filename}` : null;
        console.log("Attachment path:", attachment_path);

        // Get current timestamp
        const now = new Date();

        const sql = `
            INSERT INTO test_nscslcom_nscsl_dashboard.list_car 
            (case_no, date_endorsed, endorsed_by, facility_code, facility_name, city, province, labno,
            repeat_field, status, number_sample, case_code, sub_code1, sub_code2, sub_code3, sub_code4,
            remarks, frc, wrc, prepared_by, followup_on, reviewed_on, closed_on, attachment_path, 
            created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Prepare values array with proper length limits matching database schema
        const values = [
            safeTrim(case_no, 25),           // VARCHAR(25)
            date_endorsed || null,            // datetime
            safeTrim(endorsed_by, 100),        // VARCHAR(25)
            safeTrim(facility_code, 4),       // VARCHAR(4)
            safeTrim(facility_name, 50),      // VARCHAR(50)
            safeTrim(city, 25),               // VARCHAR(25)
            safeTrim(province, 25),           // VARCHAR(25)
            safeTrim(labno, 100),             // VARCHAR(100)
            safeTrim(repeat_field, 50),       // VARCHAR(50)
            safeTrim(status, 20),             // VARCHAR(20)
            number_sample ? parseInt(number_sample) : null,  // varchar(4) but storing as int
            safeTrim(case_code, 10),          // VARCHAR(10)
            safeTrim(sub_code1, 25),          // VARCHAR(25)
            safeTrim(sub_code2, 25),          // VARCHAR(25)
            safeTrim(sub_code3, 25),          // VARCHAR(25)
            safeTrim(sub_code4, 25),          // VARCHAR(25)
            safeTrim(remarks, 100),           // VARCHAR(100)
            safeTrim(frc, 10),                // VARCHAR(10)
            safeTrim(wrc, 10),                // VARCHAR(10)
            safeTrim(prepared_by, 100),        // VARCHAR(15)
            followup_on || null,              // VARCHAR(15) - date field
            reviewed_on || null,              // VARCHAR(15) - date field
            closed_on || null,                // datetime
            safeTrim(attachment_path, 255),   // VARCHAR(255)
            safeTrim(userName, 100),          // created_by
            now                               // created_at
        ];

        console.log("SQL Query:", sql);
        console.log("Values count:", values.length);

        // Execute the insert
        const [result] = await mysqlPool.query(sql, values);

        console.log("=== INSERT SUCCESS ===");
        console.log("Insert ID:", result.insertId);
        console.log("Affected rows:", result.affectedRows);

        // Success response
        const response = {
            success: true,
            message: "Record added successfully",
            id: result.insertId,
            affectedRows: result.affectedRows,
            data: {
                case_no: case_no,
                date_endorsed: date_endorsed,
                facility_code: facility_code,
                created_by: userName,
                attachment: req.file ? {
                    filename: req.file.filename,
                    originalname: req.file.originalname,
                    size: req.file.size
                } : null
            }
        };

        console.log("Sending success response:", response);
        res.status(201).json(response);

    } catch (error) {
        console.error("\n=== DATABASE INSERT ERROR ===");
        console.error("Error message:", error.message);
        console.error("Error code:", error.code);
        console.error("Full error:", error);

        // Handle specific MySQL errors
        let errorMessage = "Database insert failed";
        let statusCode = 500;

        switch (error.code) {
            case 'ER_DUP_ENTRY':
                errorMessage = "Duplicate entry: A record with this case number may already exist";
                statusCode = 409;
                break;
            case 'ER_NO_SUCH_TABLE':
                errorMessage = "Database table 'list_car' not found";
                statusCode = 500;
                break;
            case 'ER_BAD_FIELD_ERROR':
                errorMessage = "Database column mismatch - check table structure";
                statusCode = 500;
                break;
            case 'ER_WRONG_VALUE_COUNT_ON_ROW':
                errorMessage = "Column count doesn't match value count";
                statusCode = 500;
                break;
            case 'ER_DATA_TOO_LONG':
                errorMessage = "Data too long for one or more columns. Check server logs for field lengths.";
                statusCode = 400;
                break;
            case 'ER_BAD_NULL_ERROR':
                errorMessage = "NULL value not allowed in required field";
                statusCode = 400;
                break;
        }

        res.status(statusCode).json({
            error: "Database Insert Error",
            message: errorMessage,
            details: error.message,
            code: error.code,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }

    console.log("=== ADD-CAR CONTROLLER DEBUG END ===\n");
};

// Update car record (for edit functionality)
const updateCar = async (req, res) => {
    console.log("\n=== UPDATE-CAR CONTROLLER DEBUG START ===");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("File info:", req.file ? {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path
    } : "No new file uploaded");

    try {
        // Extract form data
        const {
            id,
            case_no,
            date_endorsed,
            endorsed_by,
            facility_code,
            facility_name,
            city,
            province,
            labno,
            repeat_field,
            status,
            number_sample,
            case_code,
            sub_code1,
            sub_code2,
            sub_code3,
            sub_code4,
            remarks,
            frc,
            wrc,
            prepared_by,
            followup_on,
            reviewed_on,
            closed_on,
        } = req.body;

        // ⭐ Get username from request
        const userName = req.user?.name || req.body.userName || 'System';
        const now = new Date();

        console.log("Extracted form data:");
        console.log("- id:", id);
        console.log("- case_no:", case_no);
        console.log("- facility_code:", facility_code);
        console.log("- userName:", userName);

        // Validate required fields
        if (!id) {
            return res.status(400).json({
                error: "Validation Error",
                message: "Record ID is required"
            });
        }

        const missingFields = [];
        if (!case_no || !case_no.trim()) missingFields.push('case_no');
        if (!date_endorsed) missingFields.push('date_endorsed');
        if (!facility_code || !facility_code.trim()) missingFields.push('facility_code');

        if (missingFields.length > 0) {
            console.error("Missing required fields:", missingFields);
            return res.status(400).json({
                error: "Validation Error",
                message: `Missing required fields: ${missingFields.join(', ')}`,
                missingFields: missingFields
            });
        }

        // Check if record exists
        const checkSql = "SELECT id, attachment_path FROM test_nscslcom_nscsl_dashboard.list_car WHERE id = ?";
        const [checkResult] = await mysqlPool.query(checkSql, [id]);

        if (!checkResult || checkResult.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Record not found",
                message: "No record found with the provided ID"
            });
        }

        const existingRecord = checkResult[0];
        
        // Handle file attachment
        let attachment_path = existingRecord.attachment_path; // Keep existing if no new file
        
        if (req.file) {
            // New file uploaded
            attachment_path = `/uploads/${req.file.filename}`;
            
            // Delete old file if it exists
            if (existingRecord.attachment_path) {
                const oldFilePath = path.join(__dirname, '..', existingRecord.attachment_path);
                fs.unlink(oldFilePath, (err) => {
                    if (err) {
                        console.error(`Error deleting old file ${oldFilePath}:`, err);
                    } else {
                        console.log(`Successfully deleted old file: ${oldFilePath}`);
                    }
                });
            }
        }

        // Update SQL
        const sql = `
            UPDATE test_nscslcom_nscsl_dashboard.list_car 
            SET 
                case_no = ?,
                date_endorsed = ?,
                endorsed_by = ?,
                facility_code = ?,
                facility_name = ?,
                city = ?,
                province = ?,
                labno = ?,
                repeat_field = ?,
                status = ?,
                number_sample = ?,
                case_code = ?,
                sub_code1 = ?,
                sub_code2 = ?,
                sub_code3 = ?,
                sub_code4 = ?,
                remarks = ?,
                frc = ?,
                wrc = ?,
                prepared_by = ?,
                followup_on = ?,
                reviewed_on = ?,
                closed_on = ?,
                attachment_path = ?,
                modified_by = ?,
                modified_at = ?
            WHERE id = ?
        `;

        // Prepare values array with proper length limits
        const values = [
            safeTrim(case_no, 25),
            date_endorsed || null,
            safeTrim(endorsed_by, 100),
            safeTrim(facility_code, 4),
            safeTrim(facility_name, 50),
            safeTrim(city, 25),
            safeTrim(province, 25),
            safeTrim(labno, 100),
            safeTrim(repeat_field, 50),
            safeTrim(status, 20),
            number_sample ? parseInt(number_sample) : null,
            safeTrim(case_code, 10),
            safeTrim(sub_code1, 25),
            safeTrim(sub_code2, 25),
            safeTrim(sub_code3, 25),
            safeTrim(sub_code4, 25),
            safeTrim(remarks, 100),
            safeTrim(frc, 10),
            safeTrim(wrc, 10),
            safeTrim(prepared_by, 100),
            followup_on || null,
            reviewed_on || null,
            closed_on || null,
            safeTrim(attachment_path, 255),
            safeTrim(userName, 100),
            now,
            id
        ];

        console.log("SQL Query:", sql);
        console.log("Values count:", values.length);

        // Execute the update
        const [result] = await mysqlPool.query(sql, values);

        console.log("=== UPDATE SUCCESS ===");
        console.log("Affected rows:", result.affectedRows);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Update failed",
                message: "No record was updated"
            });
        }

        // Success response
        const response = {
            success: true,
            message: "Record updated successfully",
            id: id,
            affectedRows: result.affectedRows,
            data: {
                case_no: case_no,
                date_endorsed: date_endorsed,
                facility_code: facility_code,
                modified_by: userName,
                attachment: req.file ? {
                    filename: req.file.filename,
                    originalname: req.file.originalname,
                    size: req.file.size
                } : (attachment_path ? { existing: true } : null)
            }
        };

        console.log("Sending success response:", response);
        res.status(200).json(response);

    } catch (error) {
        console.error("\n=== DATABASE UPDATE ERROR ===");
        console.error("Error message:", error.message);
        console.error("Error code:", error.code);
        console.error("Full error:", error);

        // Handle specific MySQL errors
        let errorMessage = "Database update failed";
        let statusCode = 500;

        switch (error.code) {
            case 'ER_DUP_ENTRY':
                errorMessage = "Duplicate entry: A record with this case number may already exist";
                statusCode = 409;
                break;
            case 'ER_DATA_TOO_LONG':
                errorMessage = "Data too long for one or more columns";
                statusCode = 400;
                break;
            case 'ER_BAD_NULL_ERROR':
                errorMessage = "NULL value not allowed in required field";
                statusCode = 400;
                break;
        }

        res.status(statusCode).json({
            error: "Database Update Error",
            message: errorMessage,
            details: error.message,
            code: error.code,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }

    console.log("=== UPDATE-CAR CONTROLLER DEBUG END ===\n");
};

// Update status of a car record
const updateStatus = async (req, res) => {
    try {
        console.log('Update status endpoint hit with body:', req.body);
        
        const { id, status } = req.body;
        
        // ⭐ Get username from request
        const userName = req.user?.name || req.body.userName || 'System';
        const now = new Date();

        if (!id) {
            console.error('Missing ID in request');
            return res.status(400).json({
                success: false,
                error: "Missing required fields",
                message: "ID is required"
            });
        }

        if (!status) {
            console.error('Missing status in request');
            return res.status(400).json({
                success: false,
                error: "Missing required fields", 
                message: "Status is required"
            });
        }

        const validStatuses = ['open', 'closed', 'pending'];
        if (!validStatuses.includes(status.toLowerCase())) {
            console.error('Invalid status provided:', status);
            return res.status(400).json({
                success: false,
                error: "Invalid status",
                message: "Status must be: open, closed, or pending"
            });
        }

        console.log('Updating record ID:', id, 'to status:', status);

        // Check if record exists first
        const checkSql = "SELECT id, status FROM test_nscslcom_nscsl_dashboard.list_car WHERE id = ?";
        const [checkResult] = await mysqlPool.query(checkSql, [id]);

        if (!checkResult || checkResult.length === 0) {
            console.error('Record not found with ID:', id);
            return res.status(404).json({
                success: false,
                error: "Record not found",
                message: "No record found with the provided ID"
            });
        }

        console.log('Record exists, current status:', checkResult[0].status);

        // ✅ FIX: Swapped modified_at and modified_by so that
        //    modified_at (DATETIME) receives `now`
        //    modified_by (VARCHAR)  receives `userName`
        let sql, values;
        
        if (status.toLowerCase() === 'closed') {
            sql = "UPDATE test_nscslcom_nscsl_dashboard.list_car SET status = ?, closed_on = NOW(), modified_at = ?, modified_by = ? WHERE id = ?";
            values = [status.toLowerCase(), now, userName, id];
            console.log('Setting status to closed and updating closed_on timestamp');
        } else {
            sql = "UPDATE test_nscslcom_nscsl_dashboard.list_car SET status = ?, closed_on = NULL, modified_at = ?, modified_by = ? WHERE id = ?";
            values = [status.toLowerCase(), now, userName, id];
            console.log('Setting status to', status, 'and clearing closed_on timestamp');
        }

        console.log('Executing SQL:', sql, 'with values:', values);

        const [result] = await mysqlPool.query(sql, values);

        console.log('Update result:', result);

        if (result.affectedRows === 0) {
            console.error('No rows affected by update');
            return res.status(404).json({
                success: false,
                error: "Update failed",
                message: "No record was updated"
            });
        }

        // Get the updated record to confirm the change
        const selectSql = "SELECT id, status, closed_on, modified_by, modified_at FROM test_nscslcom_nscsl_dashboard.list_car WHERE id = ?";
        const [selectResult] = await mysqlPool.query(selectSql, [id]);
        
        const updatedRecord = selectResult && selectResult[0] ? selectResult[0] : null;
        console.log('Updated record:', updatedRecord);
        
        res.json({
            success: true,
            message: `Status updated to ${status}`,
            affectedRows: result.affectedRows,
            updatedRecord: updatedRecord
        });

    } catch (error) {
        console.error("Update status controller error:", error);
        res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: error.message
        });
    }
};

// Delete car record
const deleteCar = async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('Delete endpoint hit with ID:', id);

        if (!id) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields",
                message: "ID is required"
            });
        }

        // Get attachment path before deleting
        const [record] = await mysqlPool.query(
            "SELECT attachment_path FROM test_nscslcom_nscsl_dashboard.list_car WHERE id = ?",
            [id]
        );

        if (!record || record.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Record not found",
                message: "No record found with the provided ID"
            });
        }

        // Delete the record
        const [result] = await mysqlPool.query(
            "DELETE FROM test_nscslcom_nscsl_dashboard.list_car WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Delete failed",
                message: "No record was deleted"
            });
        }

        // Delete associated file if exists
        if (record[0].attachment_path) {
            const filePath = path.join(__dirname, '..', record[0].attachment_path);
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error(`Error deleting file ${filePath}:`, err);
                } else {
                    console.log(`Successfully deleted file: ${filePath}`);
                }
            });
        }

        res.json({
            success: true,
            message: "Record deleted successfully",
            affectedRows: result.affectedRows
        });

    } catch (error) {
        console.error("Delete controller error:", error);
        res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: error.message
        });
    }
};

// Test database connection
const testDatabaseConnection = async (req, res) => {
    try {
        const [mysqlResult] = await mysqlPool.query("SELECT 1 as mysql_test, NOW() as current_time");
        const mysqlStatus = { db: 'mysql', result: mysqlResult[0], status: 'connected' };

        let oracleStatus;
        const oracleDb = req.app.locals.oracleDb;
        if (!oracleDb) {
            oracleStatus = { db: 'oracle', status: 'not_configured' };
        } else {
            try {
                const oracleResult = await oracleDb.execute("SELECT 1 as oracle_test FROM DUAL");
                oracleStatus = { db: 'oracle', result: oracleResult.rows[0], status: 'connected' };
            } catch (err) {
                oracleStatus = { db: 'oracle', status: 'error', error: err.message };
            }
        }

        const response = {
            timestamp: new Date().toISOString(),
            databases: {
                mysql: mysqlStatus,
                oracle: oracleStatus
            }
        };

        const allConnected = mysqlStatus.status === 'connected' && 
                           (oracleStatus.status === 'connected' || oracleStatus.status === 'not_configured');

        res.status(allConnected ? 200 : 500).json(response);
    } catch (error) {
        res.status(500).json({
            timestamp: new Date().toISOString(),
            databases: {
                mysql: { status: 'error', error: error.message }
            }
        });
    }
};

// Get Facility Details By Code (Oracle)
const getFacilityByCode = async (req, res) => {
    let connection;

    try {
        const oraclePool = req.app.locals.oracleDb;
        if (!oraclePool) {
            return res.status(500).json({
                success: false,
                message: "Oracle connection pool not initialized"
            });
        }

        const { facilitycode } = req.query;

        if (!facilitycode || !facilitycode.trim()) {
            return res.status(400).json({
                success: false,
                message: "Facility code is required"
            });
        }

        connection = await oraclePool.getConnection();

        const query = `
            SELECT 
                PROVIDERID AS facility_code,
                ADRS_TYPE  AS adrs_type,
                DESCR1     AS facility_name,
                CITY       AS city,
                COUNTY     AS province
            FROM PHMSDS.REF_PROVIDER_ADDRESS
            WHERE ADRS_TYPE = '1'
              AND PROVIDERID = :facilitycode
        `;

        const result = await connection.execute(
            query,
            { facilitycode: facilitycode.trim() },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (!result.rows || result.rows.length === 0) {
            return res.json({
                success: true,
                found: false,
                data: null
            });
        }

        res.json({
            success: true,
            found: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error("Facility lookup error:", error);
        res.status(500).json({
            success: false,
            message: "Facility lookup failed",
            error: error.message
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error("Error closing Oracle connection:", err);
            }
        }
    }
};

module.exports = {
    getAllCarList,
    getFilteredCarList,
    getCarListGroupedByProvince,
    getCarListGrouped,
    getNextCaseNumber,  // ⭐ New export
    addCar,
    updateCar,
    updateStatus,
    deleteCar,
    testDatabaseConnection,
    getFacilityByCode
};