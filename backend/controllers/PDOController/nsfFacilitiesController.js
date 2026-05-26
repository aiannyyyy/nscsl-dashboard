const { database } = require('../../config');

// ── DATE HELPER ───────────────────────────────────────────────────────────────
/**
 * Normalise any date value to "YYYY-MM-DD" for MySQL DATE columns.
 * Accepts: "YYYY-MM-DD", ISO-8601 strings, Date objects, null/undefined.
 * Returns null when the value is absent or unparseable.
 */
const toDateOnly = (val) => {
    if (val === null || val === undefined || val === '') return null;
    if (val instanceof Date) {
        return isNaN(val) ? null : val.toISOString().slice(0, 10);
    }
    if (typeof val === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
        const d = new Date(val);
        return isNaN(d) ? null : d.toISOString().slice(0, 10);
    }
    return null;
};


// ── GET ALL FACILITIES (pagination + search) ──────────────────────────────────
const getAllNSFFacilities = async (req, res) => {
    try {
        const page   = parseInt(req.query.page)  || 1;
        const limit  = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search?.trim() || null;

        const conditions = [];
        const params     = [];

        if (search) {
            conditions.push(`(
                facility_name LIKE ? OR
                CAST(facility_code AS CHAR) LIKE ?
            )`);
            params.push(`%${search}%`, `%${search}%`);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const [[{ total }]] = await database.mysqlPool.query(
            `SELECT COUNT(*) AS total FROM nsf_facilities ${where}`,
            params
        );

        const [results] = await database.mysqlPool.query(
            `SELECT * FROM nsf_facilities
             ${where}
             ORDER BY date_accredited DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        res.json({
            data:        results,
            total:       Number(total),
            page:        page,
            limit:       limit,
            total_pages: Math.ceil(total / limit),
        });
    } catch (err) {
        console.error("getAllNSFFacilities error:", err);
        res.status(500).json({ error: "Failed to fetch facilities", message: err.message });
    }
};

// ── GET SINGLE FACILITY ───────────────────────────────────────────────────────
const getNSFFacilityById = async (req, res) => {
    try {
        const { id } = req.params;

        const [[record]] = await database.mysqlPool.query(
            "SELECT * FROM nsf_facilities WHERE id = ?",
            [id]
        );

        if (!record) return res.status(404).json({ error: "Facility not found" });

        res.json({ data: record });
    } catch (err) {
        console.error("getNSFFacilityById error:", err);
        res.status(500).json({ error: "Failed to fetch facility", message: err.message });
    }
};


// ── ADD FACILITY ──────────────────────────────────────────────────────────────
const addNSFFacility = async (req, res) => {
    try {
        const {
            facility_code, facility_name, category, type1, type2,
            medical_director, contact_person, designation,
            tel_cell, fax, email, address, city, province, region,
            date_accredited, year_accredited,
            last_po_date, po_number,
            created_by, remarks
        } = req.body;

        const now = new Date();

        // ── Ensure facility_code exists in parent facilities table ──────────
        await database.mysqlPool.query(
            `INSERT IGNORE INTO facilities (facility_code, facility_name)
             VALUES (?, ?)`,
            [facility_code, facility_name]
        );

        // ── Insert into nsf_facilities ──────────────────────────────────────
        const [result] = await database.mysqlPool.query(
            `INSERT INTO nsf_facilities (
                facility_code, facility_name, category, type1, type2,
                medical_director, contact_person, designation,
                tel_cell, fax, email, address, city, province, region,
                date_accredited, year_accredited, status,
                last_po_date, po_number,
                created_by, created_date,
                modified_by, modified_date,
                remarks
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?)`,
            [
                facility_code, facility_name, category, type1, type2,
                medical_director, contact_person, designation,
                tel_cell, fax, email, address, city, province, region || "4A",
                toDateOnly(date_accredited),
                year_accredited ? parseInt(year_accredited) : null,
                toDateOnly(last_po_date), po_number || null,
                created_by, now,
                created_by, now,
                remarks || null
            ]
        );

        await database.mysqlPool.query(
            `INSERT INTO nsf_reactivation_logs
                (facility_id, action, old_status, new_status, remarks, created_by, created_at)
             VALUES (?, 'added', NULL, 'active', 'New facility added', ?, NOW())`,
            [result.insertId, created_by]
        );

        res.status(201).json({
            message: "Facility added successfully",
            id: result.insertId
        });
    } catch (err) {
        console.error("addNSFFacility error:", err);
        res.status(500).json({ error: "Failed to add facility", message: err.message });
    }
};


// ── UPDATE FACILITY ───────────────────────────────────────────────────────────
const updateNSFFacility = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            facility_code, facility_name, category, type1, type2,
            medical_director, contact_person, designation,
            tel_cell, fax, email, address, city, province, region,
            date_accredited, year_accredited, status,
            last_po_date, po_number,
            modified_by, remarks
        } = req.body;

        const [[old]] = await database.mysqlPool.query(
            "SELECT * FROM nsf_facilities WHERE id = ?",
            [id]
        );

        if (!old) return res.status(404).json({ error: "Facility not found" });

        const now = new Date();
        let finalStatus = status ? status.toLowerCase() : old.status;

        // Resolve and sanitise the PO date we'll actually store
        const resolvedPoDate = toDateOnly(last_po_date ?? old.last_po_date);

        const poDate = resolvedPoDate ? new Date(resolvedPoDate) : null;

        if (poDate) {
            const diffMonths =
                (now.getFullYear() - poDate.getFullYear()) * 12 +
                (now.getMonth() - poDate.getMonth());

            // A new PO date on an inactive/closed facility reactivates it
            if (last_po_date && (old.status === "inactive" || old.status === "closed")) {
                finalStatus = "active";
            }

            // Auto-deactivate if PO date is 6+ months old
            if (diffMonths >= 6 && finalStatus === "active") {
                finalStatus = "inactive";
            }
        }

        await database.mysqlPool.query(
            `UPDATE nsf_facilities SET
                facility_code=?, facility_name=?, category=?, type1=?, type2=?,
                medical_director=?, contact_person=?, designation=?,
                tel_cell=?, fax=?, email=?, address=?, city=?, province=?, region=?,
                date_accredited=?, year_accredited=?, status=?,
                last_po_date=?, po_number=?,
                modified_by=?, modified_date=?, remarks=?
             WHERE id=?`,
            [
                facility_code    ?? old.facility_code,
                facility_name    ?? old.facility_name,
                category         ?? old.category,
                type1            ?? old.type1,
                type2            ?? old.type2,
                medical_director ?? old.medical_director,
                contact_person   ?? old.contact_person,
                designation      ?? old.designation,
                tel_cell         ?? old.tel_cell,
                fax              ?? old.fax,
                email            ?? old.email,
                address          ?? old.address,
                city             ?? old.city,
                province         ?? old.province,
                region           ?? old.region,
                toDateOnly(date_accredited ?? old.date_accredited),
                year_accredited  ? parseInt(year_accredited) : old.year_accredited,
                finalStatus,
                resolvedPoDate,
                po_number        ?? old.po_number,
                modified_by, now,
                remarks          ?? old.remarks,
                id
            ]
        );

        if (old.status !== finalStatus) {
            const action    = finalStatus === "active" ? "reactivated" : "deactivated";
            const logRemark = finalStatus === "inactive"
                ? "Auto-deactivated: last PO date exceeded 6 months"
                : "Reactivated: new PO date provided";

            await database.mysqlPool.query(
                `INSERT INTO nsf_reactivation_logs
                    (facility_id, action, old_status, new_status, remarks, created_by, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                [id, action, old.status, finalStatus, logRemark, modified_by]
            );
        }

        res.json({
            message:        "Facility updated successfully",
            status_changed: old.status !== finalStatus,
            old_status:     old.status,
            new_status:     finalStatus,
        });
    } catch (err) {
        console.error("updateNSFFacility error:", err);
        res.status(500).json({ error: "Failed to update facility", message: err.message });
    }
};


// ── DELETE FACILITY ───────────────────────────────────────────────────────────
const deleteNSFFacility = async (req, res) => {
    try {
        const { id } = req.params;
        const { deleted_by } = req.body;

        const [[record]] = await database.mysqlPool.query(
            "SELECT * FROM nsf_facilities WHERE id = ?",
            [id]
        );

        if (!record) return res.status(404).json({ error: "Facility not found" });

        await database.mysqlPool.query(
            "DELETE FROM nsf_facilities WHERE id = ?",
            [id]
        );

        await database.mysqlPool.query(
            `INSERT INTO nsf_reactivation_logs
                (facility_id, action, old_status, new_status, remarks, created_by, created_at)
             VALUES (?, 'deleted', ?, NULL, 'Facility deleted', ?, NOW())`,
            [id, record.status, deleted_by || "system"]
        );

        res.json({ message: "Facility deleted successfully" });
    } catch (err) {
        console.error("deleteNSFFacility error:", err);
        res.status(500).json({ error: "Failed to delete facility", message: err.message });
    }
};


// ── SUMMARY CARDS ─────────────────────────────────────────────────────────────
const getNSFSummaryCards = async (req, res) => {
    try {
        const { month, year } = req.query;

        // Build two separate WHERE clauses
        const createdConditions  = [];
        const modifiedConditions = [];
        const createdParams      = [];
        const modifiedParams     = [];

        if (month && month !== 'All') {
            createdConditions.push('MONTH(created_date) = ?');
            createdParams.push(parseInt(month));
            modifiedConditions.push('MONTH(modified_date) = ?');
            modifiedParams.push(parseInt(month));
        }
        if (year) {
            createdConditions.push('YEAR(created_date) = ?');
            createdParams.push(parseInt(year));
            modifiedConditions.push('YEAR(modified_date) = ?');
            modifiedParams.push(parseInt(year));
        }

        const createdWhere  = createdConditions.length  ? `WHERE ${createdConditions.join(' AND ')}`  : '';
        const modifiedWhere = modifiedConditions.length ? `WHERE ${modifiedConditions.join(' AND ')}` : '';

        // Total: count by created_date (new additions only)
        const [[totalRow]] = await database.mysqlPool.query(
            `SELECT COUNT(*) AS total FROM nsf_facilities ${createdWhere}`,
            createdParams
        );

        // Status counts: count by modified_date (status changes)
        const [[statusRow]] = await database.mysqlPool.query(
            `SELECT
                SUM(status = 'active')   AS active,
                SUM(status = 'inactive') AS inactive,
                SUM(status = 'closed')   AS closed,
                SUM(status = 'partner')  AS partner
             FROM nsf_facilities
             ${modifiedWhere}`,
            modifiedParams
        );

        res.json({
            total:    Number(totalRow.total)      || 0,
            active:   Number(statusRow.active)    || 0,
            inactive: Number(statusRow.inactive)  || 0,
            closed:   Number(statusRow.closed)    || 0,
            partner:  Number(statusRow.partner)   || 0,
        });
    } catch (err) {
        console.error("getNSFSummaryCards error:", err);
        res.status(500).json({ error: "Failed to fetch summary cards", message: err.message });
    }
};


// ── STATUS DISTRIBUTION CHART ─────────────────────────────────────────────────
const getNSFStatusDistribution = async (req, res) => {
    try {
        const [results] = await database.mysqlPool.query(
            `SELECT status, COUNT(*) AS count
             FROM nsf_facilities
             GROUP BY status
             ORDER BY count DESC`
        );

        res.json({ data: results });
    } catch (err) {
        console.error("getNSFStatusDistribution error:", err);
        res.status(500).json({ error: "Failed to fetch status distribution", message: err.message });
    }
};


// ── REACTIVATION STATUS ───────────────────────────────────────────────────────
const getNSFReactivationStatus = async (req, res) => {
    const connection = await database.mysqlPool.getConnection();
    try {
        await connection.beginTransaction();

        // Auto-deactivate: active but no PO in 6 months
        const [deactivated] = await connection.query(
            `UPDATE nsf_facilities
             SET status = 'inactive', modified_date = NOW(), modified_by = 'system'
             WHERE status = 'active'
               AND last_po_date IS NOT NULL
               AND last_po_date < DATE_SUB(NOW(), INTERVAL 6 MONTH)`
        );

        // Auto-reactivate: inactive OR closed but has PO within 6 months
        const [reactivated] = await connection.query(
            `UPDATE nsf_facilities
             SET status = 'active', modified_date = NOW(), modified_by = 'system'
             WHERE status IN ('inactive', 'closed')
               AND last_po_date IS NOT NULL
               AND last_po_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)`
        );

        // Log auto-deactivations
        if (deactivated.affectedRows > 0) {
            await connection.query(
                `INSERT INTO nsf_reactivation_logs
                    (facility_id, action, old_status, new_status, remarks, created_by, created_at)
                 SELECT id, 'deactivated', 'active', 'inactive',
                        'Auto-deactivated: last PO date exceeded 6 months',
                        'system', NOW()
                 FROM nsf_facilities
                 WHERE status = 'inactive'
                   AND modified_by = 'system'
                   AND modified_date >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)`
            );
        }

        // Log auto-reactivations (covers both inactive and closed)
        if (reactivated.affectedRows > 0) {
            await connection.query(
                `INSERT INTO nsf_reactivation_logs
                    (facility_id, action, old_status, new_status, remarks, created_by, created_at)
                 SELECT id, 'reactivated', 'inactive/closed', 'active',
                        'Auto-reactivated: new PO date is within 6 months',
                        'system', NOW()
                 FROM nsf_facilities
                 WHERE status = 'active'
                   AND modified_by = 'system'
                   AND modified_date >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)`
            );
        }

        await connection.commit();

        // Build filter
        const { month, year } = req.query;
        const conditions = ['last_po_date IS NOT NULL'];
        const params = [];

        if (month && !isNaN(parseInt(month))) {
            conditions.push('MONTH(last_po_date) = ?');
            params.push(parseInt(month));
        }
        if (year && !isNaN(parseInt(year))) {
            conditions.push('YEAR(last_po_date) = ?');
            params.push(parseInt(year));
        }

        const where = `WHERE ${conditions.join(' AND ')}`;

        const [results] = await connection.query(
            `SELECT
                id, facility_code, facility_name,
                status, last_po_date, province,
                TIMESTAMPDIFF(MONTH, last_po_date, NOW()) AS months_since_po,
                CASE
                    WHEN last_po_date < DATE_SUB(NOW(), INTERVAL 6 MONTH) THEN 'needs_reactivation'
                    ELSE 'ok'
                END AS reactivation_flag
             FROM nsf_facilities
             ${where}
             ORDER BY last_po_date ASC`,
            params
        );

        res.json({
            data:             results,
            auto_deactivated: deactivated.affectedRows,
            auto_reactivated: reactivated.affectedRows,
        });

    } catch (err) {
        await connection.rollback();
        console.error("getNSFReactivationStatus error:", err);
        res.status(500).json({ error: "Failed to fetch reactivation status", message: err.message });
    } finally {
        connection.release();
    }
};

// ── REACTIVATION LOGS ─────────────────────────────────────────────────────────
const getNSFReactivationLogs = async (req, res) => {
    try {
        const { facility_id, action, page, limit: limitParam, month, year } = req.query;

        const conditions = [];
        const params     = [];

        if (facility_id) {
            conditions.push("l.facility_id = ?");
            params.push(facility_id);
        }
        if (action) {
            conditions.push("l.action = ?");
            params.push(action);
        }

        // ── Filter by created_at month / year ──────────────────────────────
        if (month && month !== 'All') {
            conditions.push("MONTH(l.created_at) = ?");
            params.push(parseInt(month));
        }
        if (year) {
            conditions.push("YEAR(l.created_at) = ?");
            params.push(parseInt(year));
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        const currentPage = parseInt(page)      || 1;
        const limit       = parseInt(limitParam) || 20;
        const offset      = (currentPage - 1) * limit;

        const [[{ total }]] = await database.mysqlPool.query(
            `SELECT COUNT(*) AS total FROM nsf_reactivation_logs l ${where}`,
            params
        );

        const [results] = await database.mysqlPool.query(
            `SELECT
                l.id, l.facility_id,
                f.facility_name, f.facility_code,
                f.province,
                l.action, l.old_status, l.new_status,
                l.remarks, l.created_by, l.created_at
            FROM nsf_reactivation_logs l
            LEFT JOIN nsf_facilities f ON f.id = l.facility_id
            ${where}
            ORDER BY l.created_at DESC
            LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        res.json({
            data:        results,
            total:       Number(total),
            page:        currentPage,
            limit:       limit,
            total_pages: Math.ceil(total / limit),
        });
    } catch (err) {
        console.error("getNSFReactivationLogs error:", err);
        res.status(500).json({ error: "Failed to fetch reactivation logs", message: err.message });
    }
};

// ── PROVINCES DROPDOWN ────────────────────────────────────────────────────────
const getNSFProvinces = async (req, res) => {
    try {
        const [results] = await database.mysqlPool.query(
            `SELECT DISTINCT province
             FROM nsf_facilities
             WHERE province IS NOT NULL
             ORDER BY province ASC`
        );

        res.json({ data: results.map(r => r.province) });
    } catch (err) {
        console.error("getNSFProvinces error:", err);
        res.status(500).json({ error: "Failed to fetch provinces", message: err.message });
    }
};

const getNSFSummaryTrend = async (req, res) => {
    try {
        const { month, year } = req.query;

        const conditions = [];
        const params     = [];

        if (month && month !== 'All') {
            conditions.push('MONTH(l.created_at) = ?');
            params.push(parseInt(month));
        }
        if (year) {
            conditions.push('YEAR(l.created_at) = ?');
            params.push(parseInt(year));
        }

        const where = conditions.length > 0
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        const [[row]] = await database.mysqlPool.query(
            `SELECT
                SUM(l.action = 'added')                          AS total,
                SUM(l.new_status = 'active'   AND l.action != 'added') AS active,
                SUM(l.new_status = 'inactive')                   AS inactive,
                SUM(l.new_status = 'closed')                     AS closed,
                SUM(l.new_status = 'partner')                    AS partner
             FROM nsf_reactivation_logs l
             ${where}`,
            params
        );

        res.json({
            total:    Number(row.total)    || 0,
            active:   Number(row.active)   || 0,
            inactive: Number(row.inactive) || 0,
            closed:   Number(row.closed)   || 0,
            partner:  Number(row.partner)  || 0,
        });
    } catch (err) {
        console.error("getNSFSummaryTrend error:", err);
        res.status(500).json({ error: "Failed to fetch summary trend", message: err.message });
    }
};


module.exports = {
    getAllNSFFacilities,
    getNSFFacilityById,
    addNSFFacility,
    updateNSFFacility,
    deleteNSFFacility,
    getNSFSummaryCards,
    getNSFStatusDistribution,
    getNSFReactivationStatus,
    getNSFReactivationLogs,
    getNSFProvinces,
    getNSFSummaryTrend,
};