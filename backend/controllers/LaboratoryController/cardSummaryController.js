const oracledb = require('oracledb');

// Allowed spec types with their labels
const SPECTYPE_MAP = {
    '20': 'initial',
    '2':  'repeatUnsat',
    '3':  'repeatAbnormal',
    '4':  'repeatNormal',
    '5':  'monitoring',
    '87': 'unfit',
};

const VALID_SPECTYPES = Object.keys(SPECTYPE_MAP);

/**
 * Get Laboratory Summary Card Data
 * Returns: received, screened, unsatisfactory counts + breakdown by spectype
 *
 * Query Params:
 *   dateFrom   - optional, YYYY-MM-DD  (default: start of current month)
 *   dateTo     - optional, YYYY-MM-DD  (default: end of current month)
 *   spectype   - optional, single value from: 20, 2, 3, 4, 5, 87
 *                if omitted, all spec types are included
 */
exports.getCardSummary = async (req, res) => {
    let connection;
    const startTime = Date.now();

    try {
        console.log('[Laboratory Card Summary] Request received');

        const { dateFrom, dateTo, spectype } = req.query;

        // ── Validate spectype ──────────────────────────────────────────────
        if (spectype && !VALID_SPECTYPES.includes(spectype)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid spectype value',
                message: `Allowed values: ${VALID_SPECTYPES.join(', ')}`,
            });
        }

        // ── Database connection ────────────────────────────────────────────
        const oraclePool = req.app.locals.oracleDb;
        if (!oraclePool) {
            return res.status(500).json({
                success: false,
                error: 'Database connection not available',
                message: 'Oracle connection pool is not initialized',
            });
        }

        connection = await oraclePool.getConnection();

        // ── Date filter ────────────────────────────────────────────────────
        let dateFilter;
        let binds = {};

        if (dateFrom && dateTo) {
            dateFilter = `DTRECV BETWEEN TO_DATE(:dateFrom, 'YYYY-MM-DD') AND TO_DATE(:dateTo, 'YYYY-MM-DD') + 1`;
            binds = { dateFrom, dateTo };
            console.log(`[Laboratory Card Summary] Custom date range: ${dateFrom} to ${dateTo}`);
        } else {
            dateFilter = `DTRECV BETWEEN TRUNC(SYSDATE, 'MM') AND LAST_DAY(SYSDATE)`;
            console.log('[Laboratory Card Summary] Using current month date range');
        }

        // ── Spectype filter ────────────────────────────────────────────────
        // For summary counts: if a spectype is provided, scope all queries to it.
        // Received includes spectype 5 (monitoring) as well; screened excludes it.
        const receivedSpectypes  = spectype ? `'${spectype}'` : `'5', '4', '3', '20', '2', '87'`;
        const screenedSpectypes  = spectype
            ? (spectype === '5' ? null : `'${spectype}'`)   // monitoring is not "screened"
            : `'4', '3', '20', '2', '87'`;

        const spectypeBindFilter = spectype
            ? `AND SPECTYPE = :spectype`
            : '';

        if (spectype) binds.spectype = spectype;

        // ── Helpers ────────────────────────────────────────────────────────
        const unionDemog = (table, extra = '') => `
            SELECT LABNO FROM PHMSDS.${table}
            WHERE SPECTYPE IN (${receivedSpectypes})
            AND ${dateFilter}
            ${extra}
        `;

        const unionResult = (demogTable, resultTable) => `
            SELECT DISTINCT sda.LABNO
            FROM PHMSDS.${demogTable} sda
            JOIN PHMSDS.${resultTable} ra ON sda.LABNO = ra.LABNO
            WHERE ra.MNEMONIC IN ('DE','INS','E101','E100','E102','E103','E107','E109','UD','ODC','NDE','NE','E108')
            AND sda.${dateFilter}
            ${spectypeBindFilter}
        `;

        // ── Summary queries ────────────────────────────────────────────────
        const receivedQuery = `
            SELECT COUNT(*) AS TOTAL_RECEIVED FROM (
                SELECT LABNO FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE
                WHERE SPECTYPE IN (${receivedSpectypes}) AND ${dateFilter}
                UNION ALL
                SELECT LABNO FROM PHMSDS.SAMPLE_DEMOG_MASTER
                WHERE SPECTYPE IN (${receivedSpectypes}) AND ${dateFilter}
            )`;

        // If spectype=5 (monitoring), screened count is 0 — monitoring is received but not screened
        const screenedQuery = screenedSpectypes
            ? `SELECT COUNT(*) AS TOTAL_SCREENED FROM (
                SELECT LABNO FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE
                WHERE SPECTYPE IN (${screenedSpectypes}) AND ${dateFilter}
                UNION ALL
                SELECT LABNO FROM PHMSDS.SAMPLE_DEMOG_MASTER
                WHERE SPECTYPE IN (${screenedSpectypes}) AND ${dateFilter}
            )`
            : null;

        const unsatQuery = `
            SELECT COUNT(DISTINCT LABNO) AS TOTAL_UNSAT FROM (
                ${unionResult('SAMPLE_DEMOG_ARCHIVE', 'RESULT_ARCHIVE')}
                UNION ALL
                ${unionResult('SAMPLE_DEMOG_MASTER', 'RESULT_MASTER')}
            )`;

        // ── Breakdown query ────────────────────────────────────────────────
        // Count per SPECTYPE across both tables (only for the active filter)
        const breakdownSpectypes = spectype ? `'${spectype}'` : `'5', '4', '3', '20', '2', '87'`;

        const breakdownQuery = `
            SELECT SPECTYPE, COUNT(*) AS CNT
            FROM (
                SELECT SPECTYPE FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE
                WHERE SPECTYPE IN (${breakdownSpectypes}) AND ${dateFilter}
                UNION ALL
                SELECT SPECTYPE FROM PHMSDS.SAMPLE_DEMOG_MASTER
                WHERE SPECTYPE IN (${breakdownSpectypes}) AND ${dateFilter}
            )
            GROUP BY SPECTYPE
        `;

        // ── Execute ────────────────────────────────────────────────────────
        console.log('[Laboratory Card Summary] Executing queries...');

        const queryOptions = { outFormat: oracledb.OUT_FORMAT_OBJECT };

        const [receivedResult, unsatResult, breakdownResult, screenedResult] = await Promise.all([
            connection.execute(receivedQuery,  binds, queryOptions),
            connection.execute(unsatQuery,     binds, queryOptions),
            connection.execute(breakdownQuery, binds, queryOptions),
            screenedQuery
                ? connection.execute(screenedQuery, binds, queryOptions)
                : Promise.resolve({ rows: [{ TOTAL_SCREENED: 0 }] }),
        ]);

        // ── Parse summary ──────────────────────────────────────────────────
        const totalReceived = receivedResult.rows[0]?.TOTAL_RECEIVED || 0;
        const totalScreened = screenedResult.rows[0]?.TOTAL_SCREENED || 0;
        const totalUnsat    = unsatResult.rows[0]?.TOTAL_UNSAT       || 0;

        // ── Parse breakdown ────────────────────────────────────────────────
        const breakdownRaw = {
            initial:        0,
            repeatUnsat:    0,
            repeatAbnormal: 0,
            repeatNormal:   0,
            monitoring:     0,
            unfit:          0,
        };

        for (const row of breakdownResult.rows) {
            const key = SPECTYPE_MAP[String(row.SPECTYPE)];
            if (key) breakdownRaw[key] = row.CNT || 0;
        }

        const executionTime = Date.now() - startTime;

        console.log(
            `[Laboratory Card Summary] Success — Received: ${totalReceived}, ` +
            `Screened: ${totalScreened}, Unsat: ${totalUnsat}, ` +
            `Exec: ${executionTime}ms`
        );

        // ── Response ───────────────────────────────────────────────────────
        return res.json({
            success: true,
            data: {
                received: totalReceived,
                screened: totalScreened,
                unsat:    totalUnsat,
                breakdown: breakdownRaw,
            },
            filters: {
                ...(dateFrom && dateTo ? { dateFrom, dateTo } : {}),
                ...(spectype ? { spectype, spectypeLabel: SPECTYPE_MAP[spectype] } : {}),
                type: dateFrom && dateTo ? 'custom' : 'current_month',
            },
            executionTime: `${executionTime}ms`,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('❌ Laboratory Card Summary Error:', error);
        const executionTime = Date.now() - startTime;
        return res.status(500).json({
            success: false,
            error: 'An error occurred while fetching laboratory summary data',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            executionTime: `${executionTime}ms`,
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('[Laboratory Card Summary] Database connection closed');
            } catch (closeErr) {
                console.error('❌ Error closing connection:', closeErr);
            }
        }
    }
};