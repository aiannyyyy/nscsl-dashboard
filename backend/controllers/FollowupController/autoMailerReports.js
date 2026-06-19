const oracledb = require('oracledb');

/**
 * G6PD Auto Mailer Controller
 *
 * Handles two report types:
 *  - Individual Report : filtered by a single LABNO
 *  - Summary Report    : filtered by a date range (DTRECV)
 *
 * Both queries UNION ALL master + archive tables and always:
 *   - MNEMONIC   = 'G22'
 *   - REPTCODE   = '90009'
 *   - ADRS_TYPE  = '1'
 */

// ── Shared column list (same for master and archive legs) ─────────────────────
const COLUMNS = `
    LIB_DISORDER."MAILERNAME",
    D."LABNO",
    D."REPTCODE",
    D."MNEMONIC",
    DA."REPTCODE"  AS AVG_REPTCODE,
    DA."VALUE",
    DA."TESTCODE",
    LDR."DESCR1",
    SD."LABNO"     AS DEMOG_LABNO,
    SD."LNAME",
    SD."FNAME",
    SD."PHYSID",
    SD."BIRTHDT",
    SD."BIRTHWT",
    SD."DTCOLL",
    SD."DTRECV",
    SD."DTRPTD",
    SD."SUBMID",
    SD."TWIN",
    SD."SEX",
    RPA."ADRS_TYPE",
    RPA."STREET1",
    RPA."STREET2",
    RPA."CITY",
    RPA."DESCR1"   AS PROVIDER_NAME,
    RPA."DESCR4",
    RPA."DESCR5",
    RPA."DESCR6"
`;

// ── Build one leg (master or archive) of the UNION ALL ────────────────────────
const buildLeg = (isMaster, whereClause) => {
    const disorderTable = isMaster ? 'DISORDER_MASTER'      : 'DISORDER_ARCHIVE';
    const avgTable      = isMaster ? 'DISORDER_AVG_MASTER'  : 'DISORDER_AVG_ARCHIVE';
    const demogTable    = isMaster ? 'SAMPLE_DEMOG_MASTER'  : 'SAMPLE_DEMOG_ARCHIVE';

    return `
        SELECT ${COLUMNS}
        FROM
            PHMSDS.LIB_DISORDER         LIB_DISORDER,
            PHMSDS.${disorderTable}     D,
            PHMSDS.${avgTable}          DA,
            PHMSDS.LIB_DISORDER_RESULT  LDR,
            PHMSDS.${demogTable}        SD,
            PHMSDS.REF_PROVIDER_ADDRESS RPA
        WHERE
            LIB_DISORDER."REPTCODE" = D."REPTCODE"
            AND D."LABNO"           = DA."LABNO"
            AND D."REPTCODE"        = DA."REPTCODE"
            AND D."MNEMONIC"        = LDR."MNEMONIC"
            AND D."REPTCODE"        = LDR."REPTCODE"
            AND D."LABNO"           = SD."LABNO"
            AND SD."SUBMID"         = RPA."PROVIDERID"
            AND RPA."ADRS_TYPE"     = '1'
            AND D."MNEMONIC"        = 'G22'
            AND DA."REPTCODE"       = '90009'
            ${whereClause}
    `;
};

// ── Helper: open connection ───────────────────────────────────────────────────
const getConnection = async (req, res) => {
    const oraclePool = req.app.locals.oracleDb;
    if (!oraclePool) {
        res.status(500).json({
            success: false,
            error: 'Database connection not available',
            message: 'Oracle connection pool is not initialized',
        });
        return null;
    }
    return oraclePool.getConnection();
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/followup/auto-mailer/individual
 *
 * Query Params:
 *   labno  (required) - the specimen / lab number to look up
 *
 * Returns G6PD report data for a single specimen.
 */
exports.getIndividualReport = async (req, res) => {
    let connection;
    const startTime = Date.now();

    try {
        console.log('[AutoMailer] Individual report request received');

        const { labno } = req.query;

        // ── Validate ──────────────────────────────────────────────────────
        if (!labno || String(labno).trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameter',
                message: '`labno` query parameter is required',
            });
        }

        const labnoClean = String(labno).trim();

        connection = await getConnection(req, res);
        if (!connection) return;

        // ── Build query ───────────────────────────────────────────────────
        const whereClause = `AND SD."LABNO" = :labno`;
        const binds       = { labno: labnoClean };

        const sql = `
            ${buildLeg(true,  whereClause)}
            UNION ALL
            ${buildLeg(false, whereClause)}
            ORDER BY 25, 2
        `;

        console.log(`[AutoMailer] Individual — LABNO: ${labnoClean}`);

        // ── Execute ───────────────────────────────────────────────────────
        const result = await connection.execute(sql, binds, {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
        });

        const executionTime = Date.now() - startTime;

        console.log(
            `[AutoMailer] Individual — rows: ${result.rows.length}, ` +
            `exec: ${executionTime}ms`
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No record found',
                message: `No G6PD report data found for LABNO: ${labnoClean}`,
                filters: { labno: labnoClean },
                executionTime: `${executionTime}ms`,
                timestamp: new Date().toISOString(),
            });
        }

        return res.json({
            success: true,
            data: result.rows,
            filters: { labno: labnoClean },
            total: result.rows.length,
            executionTime: `${executionTime}ms`,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('❌ AutoMailer Individual Report Error:', error);
        const executionTime = Date.now() - startTime;
        return res.status(500).json({
            success: false,
            error: 'An error occurred while fetching the individual G6PD report',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            executionTime: `${executionTime}ms`,
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('[AutoMailer] Individual — DB connection closed');
            } catch (closeErr) {
                console.error('❌ Error closing connection:', closeErr);
            }
        }
    }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/followup/auto-mailer/summary
 *
 * Query Params:
 *   dateFrom  (required) - start date  YYYY-MM-DD  (inclusive, 00:00:00)
 *   dateTo    (required) - end date    YYYY-MM-DD  (exclusive next day, 00:00:00)
 *
 * Returns G6PD report data for all specimens received within the date range.
 */
exports.getSummaryReport = async (req, res) => {
    let connection;
    const startTime = Date.now();

    try {
        console.log('[AutoMailer] Summary report request received');

        const { dateFrom, dateTo } = req.query;

        // ── Validate ──────────────────────────────────────────────────────
        if (!dateFrom || !dateTo) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters',
                message: 'Both `dateFrom` and `dateTo` query parameters are required (YYYY-MM-DD)',
            });
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateFrom) || !dateRegex.test(dateTo)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format',
                message: 'Dates must be in YYYY-MM-DD format',
            });
        }

        if (new Date(dateFrom) > new Date(dateTo)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date range',
                message: '`dateFrom` must be on or before `dateTo`',
            });
        }

        connection = await getConnection(req, res);
        if (!connection) return;

        // ── Build query ───────────────────────────────────────────────────
        // DTRECV >= dateFrom 00:00:00  AND  DTRECV < dateTo+1 00:00:00
        const whereClause = `
            AND SD."DTRECV" >= TO_DATE(:dateFrom, 'YYYY-MM-DD')
            AND SD."DTRECV" <  TO_DATE(:dateTo,   'YYYY-MM-DD') + 1
        `;
        const binds = { dateFrom, dateTo };

        const sql = `
            ${buildLeg(true,  whereClause)}
            UNION ALL
            ${buildLeg(false, whereClause)}
            ORDER BY 25, 2
        `;

        console.log(`[AutoMailer] Summary — dateFrom: ${dateFrom}, dateTo: ${dateTo}`);

        // ── Execute ───────────────────────────────────────────────────────
        const result = await connection.execute(sql, binds, {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
        });

        const executionTime = Date.now() - startTime;

        console.log(
            `[AutoMailer] Summary — rows: ${result.rows.length}, ` +
            `exec: ${executionTime}ms`
        );

        return res.json({
            success: true,
            data: result.rows,
            filters: { dateFrom, dateTo },
            total: result.rows.length,
            executionTime: `${executionTime}ms`,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('❌ AutoMailer Summary Report Error:', error);
        const executionTime = Date.now() - startTime;
        return res.status(500).json({
            success: false,
            error: 'An error occurred while fetching the G6PD summary report',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            executionTime: `${executionTime}ms`,
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('[AutoMailer] Summary — DB connection closed');
            } catch (closeErr) {
                console.error('❌ Error closing connection:', closeErr);
            }
        }
    }
};