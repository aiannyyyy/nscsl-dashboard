const { database } = require('../../config');
const oracledb = require('oracledb');
const cron = require('node-cron');

// ── DATE HELPER ───────────────────────────────────────────────────────────────
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


// ── CRON: AUTO SYNC LAST SAMPLE SENT (every 1 hour at :00) ───────────────────
const runSyncLastSampleSent = async (app) => {
    let connection;
    try {
        const oraclePool = app?.locals?.oracleDb;
        if (!oraclePool) {
            console.log('[Sync] Oracle pool not available, skipping...');
            return { updated: 0, total: 0 };
        }

        connection = await oraclePool.getConnection();

        const [facilities] = await database.mysqlPool.query(
            `SELECT id, facility_code FROM nsf_facilities
             WHERE facility_code IS NOT NULL AND facility_code != ''`
        );

        if (facilities.length === 0) {
            console.log('[Sync] No facilities found, skipping...');
            return { updated: 0, total: 0 };
        }

        const result = await connection.execute(
            `SELECT SUBMID, DTRECV, TMRECV
             FROM (
                 SELECT SUBMID, DTRECV, TMRECV,
                     ROW_NUMBER() OVER (
                         PARTITION BY SUBMID
                         ORDER BY DTRECV DESC, TMRECV DESC
                     ) RN
                 FROM PHMSDS.SAMPLE_DEMOG_MASTER
             ) WHERE RN = 1`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const PHT_OFFSET = 8 * 60 * 60 * 1000;
        const oracleMap = {};

        for (const row of result.rows) {
            if (!row.SUBMID || !row.DTRECV) continue;
            const submid = String(row.SUBMID).trim();
            const dtrecv = new Date(row.DTRECV);
            if (isNaN(dtrecv)) continue;

            let hh = 0, mm = 0;
            if (row.TMRECV) {
                const t = String(row.TMRECV).trim().padStart(4, '0');
                hh = parseInt(t.slice(0, 2), 10);
                mm = parseInt(t.slice(2, 4), 10);
                if (isNaN(hh) || isNaN(mm) || hh > 23 || mm > 59) { hh = 0; mm = 0; }
            }

            const phtDate = new Date(dtrecv.getTime() + PHT_OFFSET);
            phtDate.setUTCHours(hh, mm, 0, 0);
            oracleMap[submid] = phtDate.toISOString().slice(0, 19).replace('T', ' ');
        }

        let updated = 0;
        const missed = [];

        for (const facility of facilities) {
            const key = String(facility.facility_code).trim();
            const lastSampleSent = oracleMap[key];

            if (lastSampleSent) {
                const [updateResult] = await database.mysqlPool.query(
                    `UPDATE nsf_facilities
                     SET last_sample_sent = ?
                     WHERE id = ?`,
                    [lastSampleSent, facility.id]
                );
                if (updateResult.affectedRows > 0) updated++;
            } else {
                missed.push(facility.facility_code);
            }
        }

        console.log(`[Sync] ✅ last_sample_sent done — ${updated}/${facilities.length} updated | ${missed.length} not found in Oracle | ${new Date().toISOString()}`);
        return { updated, total: facilities.length, missed: missed.length };

    } catch (error) {
        console.error('[Sync] ❌ last_sample_sent error:', error.message);
        return { updated: 0, total: 0, error: error.message };
    } finally {
        if (connection) {
            try { await connection.close(); }
            catch (err) { console.error('[Sync] Error closing Oracle connection:', err); }
        }
    }
};


// ── CRON: AUTO SYNC REACTIVATION STATUS (every 1 hour at :05) ────────────────
const runSyncReactivationStatus = async () => {
    const connection = await database.mysqlPool.getConnection();
    try {
        await connection.beginTransaction();

        const [toDeactivate] = await connection.query(
            `SELECT id, status FROM nsf_facilities
             WHERE status = 'active'
               AND NOT (
                   last_sample_sent IS NOT NULL AND last_sample_sent >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                   OR
                   last_po_date IS NOT NULL AND last_po_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
               )
               AND NOT (last_sample_sent IS NULL AND last_po_date IS NULL)`
        );

        if (toDeactivate.length > 0) {
            await connection.query(
                `UPDATE nsf_facilities
                 SET status = 'inactive', modified_date = NOW(), modified_by = 'system'
                 WHERE status = 'active'
                   AND NOT (
                       last_sample_sent IS NOT NULL AND last_sample_sent >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                       OR
                       last_po_date IS NOT NULL AND last_po_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                   )
                   AND NOT (last_sample_sent IS NULL AND last_po_date IS NULL)`
            );

            for (const f of toDeactivate) {
                await connection.query(
                    `INSERT INTO nsf_reactivation_logs
                        (facility_id, action, old_status, new_status, remarks, created_by, created_at)
                     VALUES (?, 'deactivated', ?, 'inactive',
                             'Auto-deactivated: both last_sample_sent and last_po_date exceeded 6 months',
                             'system', NOW())`,
                    [f.id, f.status]
                );
            }
        }

        const [toReactivate] = await connection.query(
            `SELECT id, status FROM nsf_facilities
             WHERE status = 'inactive'
               AND NOT (last_sample_sent IS NULL AND last_po_date IS NULL)
               AND (
                   last_sample_sent IS NOT NULL AND last_sample_sent >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                   OR
                   last_po_date IS NOT NULL AND last_po_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
               )`
        );

        if (toReactivate.length > 0) {
            await connection.query(
                `UPDATE nsf_facilities
                 SET status = 'active', modified_date = NOW(), modified_by = 'system'
                 WHERE status = 'inactive'
                   AND NOT (last_sample_sent IS NULL AND last_po_date IS NULL)
                   AND (
                       last_sample_sent IS NOT NULL AND last_sample_sent >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                       OR
                       last_po_date IS NOT NULL AND last_po_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                   )`
            );

            for (const f of toReactivate) {
                await connection.query(
                    `INSERT INTO nsf_reactivation_logs
                        (facility_id, action, old_status, new_status, remarks, created_by, created_at)
                     VALUES (?, 'reactivated', ?, 'active',
                             'Auto-reactivated: last_sample_sent or last_po_date is within 6 months',
                             'system', NOW())`,
                    [f.id, f.status]
                );
            }
        }

        await connection.commit();
        console.log(`[Sync] ✅ Reactivation sync done — deactivated: ${toDeactivate.length}, reactivated: ${toReactivate.length} | ${new Date().toISOString()}`);
        return { deactivated: toDeactivate.length, reactivated: toReactivate.length };

    } catch (err) {
        await connection.rollback();
        console.error('[Sync] ❌ Reactivation sync error:', err.message);
        return { deactivated: 0, reactivated: 0, error: err.message };
    } finally {
        connection.release();
    }
};


// ── CRON INIT — call this once from app.js ────────────────────────────────────
const initSyncCron = (app) => {
    console.log('[Cron] Running initial last_sample_sent sync on startup...');
    runSyncLastSampleSent(app);
    cron.schedule('0 * * * *', () => {
        console.log('[Cron] ⏰ Hourly last_sample_sent sync triggered...');
        runSyncLastSampleSent(app);
    });

    console.log('[Cron] Running initial reactivation status sync on startup...');
    setTimeout(() => runSyncReactivationStatus(), 30 * 1000);
    cron.schedule('5 * * * *', () => {
        console.log('[Cron] ⏰ Hourly reactivation status sync triggered...');
        runSyncReactivationStatus();
    });

    console.log('[Cron] ✅ All syncs scheduled (last_sample_sent @ :00, reactivation @ :05)');
};

/*
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
                facility_code LIKE ?
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
*/
const getAllNSFFacilities = async (req, res) => {
    try {
        const page     = parseInt(req.query.page)  || 1;
        const limit    = parseInt(req.query.limit) || 20;
        const offset   = (page - 1) * limit;
        const search   = req.query.search?.trim()   || null;
        const province = req.query.province?.trim() || null;
 
        const conditions = [];
        const params     = [];
 
        if (search) {
            conditions.push(`(facility_name LIKE ? OR facility_code LIKE ?)`);
            params.push(`%${search}%`, `%${search}%`);
        }
        if (province) {
            conditions.push(`province = ?`);
            params.push(province);
        }
 
        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
 
        const [[{ total }]] = await database.mysqlPool.query(
            `SELECT COUNT(*) AS total FROM nsf_facilities ${where}`, params
        );
        const [results] = await database.mysqlPool.query(
            // CHANGED: ORDER BY created_date DESC, id DESC (was: date_accredited DESC)
            `SELECT * FROM nsf_facilities ${where} ORDER BY created_date DESC, id DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
 
        res.json({ data: results, total: Number(total), page, limit, total_pages: Math.ceil(total / limit) });
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

        await database.mysqlPool.query(
            `INSERT IGNORE INTO facilities (facility_code, facility_name)
             VALUES (?, ?)`,
            [facility_code, facility_name]
        );

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
                year_accredited ?? null,           // ← was: year_accredited ? parseInt(year_accredited) : null
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

        const finalStatus  = status ? status.toLowerCase() : old.status;
        const resolvedPoDate = toDateOnly(last_po_date ?? old.last_po_date);

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
                year_accredited  ?? old.year_accredited,   // ← was: year_accredited ? parseInt(year_accredited) : old.year_accredited
                finalStatus,
                resolvedPoDate,
                po_number        ?? old.po_number,
                modified_by, now,
                remarks          ?? old.remarks,
                id
            ]
        );

        if (old.status !== finalStatus) {
            const action    = finalStatus === 'active' ? 'reactivated' : 'deactivated';
            const logRemark = `Manually ${action} by ${modified_by}`;

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

/*
// ── SUMMARY CARDS ─────────────────────────────────────────────────────────────
const getNSFSummaryCards = async (req, res) => {
    try {
        const { month, year } = req.query;

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

        const [[totalRow]] = await database.mysqlPool.query(
            `SELECT COUNT(*) AS total FROM nsf_facilities ${createdWhere}`,
            createdParams
        );

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
*/
const getNSFSummaryCards = async (req, res) => {
    try {
        const { month, year, province } = req.query; // ← add province

        const conditions  = [];
        const params      = [];

        if (month && month !== 'All') {
            conditions.push('MONTH(created_date) = ?');
            params.push(parseInt(month));
        }
        if (year) {
            conditions.push('YEAR(created_date) = ?');
            params.push(parseInt(year));
        }
        if (province) {                              // ← add
            conditions.push('province = ?');
            params.push(province);
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const [[totalRow]]  = await database.mysqlPool.query(
            `SELECT COUNT(*) AS total FROM nsf_facilities ${where}`, params
        );
        const [[statusRow]] = await database.mysqlPool.query(
            `SELECT
                SUM(status = 'active')   AS active,
                SUM(status = 'inactive') AS inactive,
                SUM(status = 'closed')   AS closed,
                SUM(status = 'partner')  AS partner
             FROM nsf_facilities ${where}`,
            params
        );

        res.json({
            total:    Number(totalRow.total)     || 0,
            active:   Number(statusRow.active)   || 0,
            inactive: Number(statusRow.inactive) || 0,
            closed:   Number(statusRow.closed)   || 0,
            partner:  Number(statusRow.partner)  || 0,
        });
    } catch (err) {
        console.error("getNSFSummaryCards error:", err);
        res.status(500).json({ error: "Failed to fetch summary cards", message: err.message });
    }
};

/*
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
*/
const getNSFStatusDistribution = async (req, res) => {
    try {
        const province = req.query.province?.trim() || null; // ← add

        const conditions = [];
        const params     = [];

        if (province) {
            conditions.push(`province = ?`);
            params.push(province);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const [results] = await database.mysqlPool.query(
            `SELECT status, COUNT(*) AS count
             FROM nsf_facilities
             ${where}
             GROUP BY status
             ORDER BY count DESC`,
            params
        );

        res.json({ data: results });
    } catch (err) {
        console.error("getNSFStatusDistribution error:", err);
        res.status(500).json({ error: "Failed to fetch status distribution", message: err.message });
    }
};


// ── REACTIVATION STATUS (pure read — no mutations) ────────────────────────────
const getNSFReactivationStatus = async (req, res) => {
    try {
        const { month, year } = req.query;
        const conditions = ['(last_sample_sent IS NOT NULL OR last_po_date IS NOT NULL)'];
        const params     = [];

        if (month && !isNaN(parseInt(month))) {
            conditions.push('(MONTH(last_sample_sent) = ? OR MONTH(last_po_date) = ?)');
            params.push(parseInt(month), parseInt(month));
        }
        if (year && !isNaN(parseInt(year))) {
            conditions.push('(YEAR(last_sample_sent) = ? OR YEAR(last_po_date) = ?)');
            params.push(parseInt(year), parseInt(year));
        }

        const [results] = await database.mysqlPool.query(
            `SELECT
                id, facility_code, facility_name,
                status, last_sample_sent, last_po_date, province,
                TIMESTAMPDIFF(MONTH, last_sample_sent, NOW()) AS months_since_last_sample,
                TIMESTAMPDIFF(MONTH, last_po_date, NOW())     AS months_since_last_po,
                CASE
                    WHEN (
                        last_sample_sent IS NOT NULL AND last_sample_sent >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                        OR
                        last_po_date IS NOT NULL AND last_po_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                    ) THEN 'ok'
                    ELSE 'needs_reactivation'
                END AS reactivation_flag
             FROM nsf_facilities
             WHERE ${conditions.join(' AND ')}
             ORDER BY GREATEST(
                COALESCE(last_sample_sent, '1900-01-01'),
                COALESCE(last_po_date, '1900-01-01')
             ) ASC`,
            params
        );

        res.json({ data: results });
    } catch (err) {
        console.error("getNSFReactivationStatus error:", err);
        res.status(500).json({ error: "Failed to fetch reactivation status", message: err.message });
    }
};

/*
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
*/
const getNSFReactivationLogs = async (req, res) => {
    try {
        const { facility_id, action, page, limit: limitParam, month, year, province } = req.query; // ← add province

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
        if (month && month !== 'All') {
            conditions.push("MONTH(l.created_at) = ?");
            params.push(parseInt(month));
        }
        if (year) {
            conditions.push("YEAR(l.created_at) = ?");
            params.push(parseInt(year));
        }
        if (province) {                          // ← add
            conditions.push("f.province = ?");
            params.push(province);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        const currentPage = parseInt(page)       || 1;
        const limit       = parseInt(limitParam)  || 20;
        const offset      = (currentPage - 1) * limit;

        const [[{ total }]] = await database.mysqlPool.query(
            `SELECT COUNT(*) AS total FROM nsf_reactivation_logs l
             LEFT JOIN nsf_facilities f ON f.id = l.facility_id
             ${where}`,
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
/*
const getNSFReactivatedByProvince = async (req, res) => {
    try {
        const { month, year, action } = req.query;

        const validActions = ['reactivated', 'deactivated'];
        const resolvedAction = validActions.includes(action) ? action : 'reactivated';

        const conditions = [`l.action = ?`];
        const params     = [resolvedAction];

        if (month && month !== 'All') {
            conditions.push('MONTH(l.created_at) = ?');
            params.push(parseInt(month));
        }
        if (year) {
            conditions.push('YEAR(l.created_at) = ?');
            params.push(parseInt(year));
        }

        const [results] = await database.mysqlPool.query(
            `SELECT
                COALESCE(f.province, 'Unknown') AS province,
                COUNT(*)                         AS count
             FROM nsf_reactivation_logs l
             LEFT JOIN nsf_facilities f ON f.id = l.facility_id
             WHERE ${conditions.join(' AND ')}
             GROUP BY f.province
             ORDER BY count DESC`,
            params
        );

        const total = results.reduce((sum, r) => sum + Number(r.count), 0);
        res.json({ data: results, total });

    } catch (err) {
        console.error("getNSFReactivatedByProvince error:", err);
        res.status(500).json({ error: "Failed to fetch reactivated by province", message: err.message });
    }
};
*/
const getNSFReactivatedByProvince = async (req, res) => {
    try {
        const { month, year, action, province } = req.query; // ← add province

        const validActions   = ['reactivated', 'deactivated'];
        const resolvedAction = validActions.includes(action) ? action : 'reactivated';

        const conditions = [`l.action = ?`];
        const params     = [resolvedAction];

        if (month && month !== 'All') {
            conditions.push('MONTH(l.created_at) = ?');
            params.push(parseInt(month));
        }
        if (year) {
            conditions.push('YEAR(l.created_at) = ?');
            params.push(parseInt(year));
        }
        if (province) {                              // ← add
            conditions.push('f.province = ?');
            params.push(province);
        }

        const [results] = await database.mysqlPool.query(
            `SELECT
                COALESCE(f.province, 'Unknown') AS province,
                COUNT(*)                         AS count
             FROM nsf_reactivation_logs l
             LEFT JOIN nsf_facilities f ON f.id = l.facility_id
             WHERE ${conditions.join(' AND ')}
             GROUP BY f.province
             ORDER BY count DESC`,
            params
        );

        const total = results.reduce((sum, r) => sum + Number(r.count), 0);
        res.json({ data: results, total });
    } catch (err) {
        console.error("getNSFReactivatedByProvince error:", err);
        res.status(500).json({ error: "Failed to fetch reactivated by province", message: err.message });
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

/*
// ── SUMMARY TREND ─────────────────────────────────────────────────────────────
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
                SUM(l.action = 'added')                                AS total,
                SUM(l.new_status = 'active' AND l.action != 'added')   AS active,
                SUM(l.new_status = 'inactive')                         AS inactive,
                SUM(l.new_status = 'closed')                           AS closed,
                SUM(l.new_status = 'partner')                          AS partner
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
*/
const getNSFSummaryTrend = async (req, res) => {
    try {
        const { month, year, province } = req.query; // ← add province

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
        if (province) {                              // ← add
            conditions.push('f.province = ?');
            params.push(province);
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const [[row]] = await database.mysqlPool.query(
            `SELECT
                SUM(l.action = 'added')                              AS total,
                SUM(l.new_status = 'active' AND l.action != 'added') AS active,
                SUM(l.new_status = 'inactive')                       AS inactive,
                SUM(l.new_status = 'closed')                         AS closed,
                SUM(l.new_status = 'partner')                        AS partner
             FROM nsf_reactivation_logs l
             LEFT JOIN nsf_facilities f ON f.id = l.facility_id
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

// ── GET LAST SAMPLE SENT PER SUBMID (Oracle — raw view) ───────────────────────
const getLastSampleSent = async (req, res) => {
    let connection;
    try {
        const oraclePool = req.app.locals.oracleDb;
        if (!oraclePool) {
            return res.status(500).json({ error: "Oracle connection pool is not initialized" });
        }

        connection = await oraclePool.getConnection();

        const result = await connection.execute(
            `SELECT SUBMID, DTRECV, TMRECV
             FROM (
                 SELECT SUBMID, DTRECV, TMRECV,
                     ROW_NUMBER() OVER (
                         PARTITION BY SUBMID
                         ORDER BY DTRECV DESC, TMRECV DESC
                     ) RN
                 FROM PHMSDS.SAMPLE_DEMOG_MASTER
             ) WHERE RN = 1
             ORDER BY SUBMID`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json(result.rows || []);
    } catch (error) {
        console.error("getLastSampleSent error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); }
            catch (err) { console.error('Error closing Oracle connection:', err); }
        }
    }
};


// ── MANUAL SYNC ENDPOINT — last_sample_sent (HTTP trigger) ───────────────────
const syncLastSampleSent = async (req, res) => {
    try {
        const result = await runSyncLastSampleSent(req.app);
        res.json({
            message:             "last_sample_sent synced successfully",
            total_facilities:    result.total,
            updated:             result.updated,
            not_found_in_oracle: result.missed ?? 0,
            ...(result.error ? { error: result.error } : {}),
        });
    } catch (error) {
        console.error("syncLastSampleSent error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
};


// ── MANUAL SYNC ENDPOINT — reactivation status (HTTP trigger) ────────────────
const syncReactivationStatus = async (req, res) => {
    try {
        const result = await runSyncReactivationStatus();
        res.json({
            message:      "Reactivation status synced successfully",
            deactivated:  result.deactivated,
            reactivated:  result.reactivated,
            ...(result.error ? { error: result.error } : {}),
        });
    } catch (error) {
        console.error("syncReactivationStatus error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
};


module.exports = {
    // Facilities CRUD
    getAllNSFFacilities,
    getNSFFacilityById,
    addNSFFacility,
    updateNSFFacility,
    deleteNSFFacility,

    // Charts & Cards
    getNSFSummaryCards,
    getNSFStatusDistribution,
    getNSFSummaryTrend,

    // Reactivation
    getNSFReactivationStatus,
    getNSFReactivationLogs,
    getNSFReactivatedByProvince,

    // Provinces
    getNSFProvinces,

    // Last Sample Sent
    getLastSampleSent,
    syncLastSampleSent,

    // Reactivation Sync (manual HTTP trigger)
    syncReactivationStatus,

    // Cron init — call this once in app.js
    initSyncCron,
};