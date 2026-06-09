const oracledb = require('oracledb');

const SPECTYPE_RECEIVED  = ['20', '2', '3', '4', '5', '87']; // total received
const SPECTYPE_SCREENED  = ['20', '2', '3', '4', '87'];       // initial sample screened
const SPECTYPE_INITIAL   = ['20'];                             // total sample screened

// ---------------------------------------------------------------------------
// Helper: build bind params object
// ---------------------------------------------------------------------------
function buildParams(spectypes) {
    const params = {};
    spectypes.forEach((val, i) => {
        params[`spectype${i}`] = val;
    });
    return params;
}

// ---------------------------------------------------------------------------
// Helper: build UNION ALL query for ARCHIVE + MASTER
// ---------------------------------------------------------------------------
function buildQuery(spectypeBinds) {
    return `
        SELECT year_month, SUM(total_samples) AS total_samples
        FROM (
            SELECT TO_CHAR(DTRECV, 'YYYY-MM') AS year_month,
                   COUNT(labno)               AS total_samples
            FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE
            WHERE SPECTYPE IN (${spectypeBinds})
              AND DTRECV IS NOT NULL
              AND DTRECV >= DATE '2026-01-01'
            GROUP BY TO_CHAR(DTRECV, 'YYYY-MM')

            UNION ALL

            SELECT TO_CHAR(DTRECV, 'YYYY-MM') AS year_month,
                   COUNT(labno)               AS total_samples
            FROM PHMSDS.SAMPLE_DEMOG_MASTER
            WHERE SPECTYPE IN (${spectypeBinds})
              AND DTRECV IS NOT NULL
              AND DTRECV >= DATE '2026-01-01'
            GROUP BY TO_CHAR(DTRECV, 'YYYY-MM')
        )
        GROUP BY year_month
        ORDER BY year_month ASC
    `;
}

// ---------------------------------------------------------------------------
// Helper: shared execution logic
// ---------------------------------------------------------------------------
async function executeCensusQuery(req, res, spectypes, label) {
    let connection;
    const startTime = Date.now();

    try {
        console.log(`[${label}] Request received`);

        const oraclePool = req.app.locals.oracleDb;

        if (!oraclePool) {
            return res.status(500).json({
                success: false,
                error: 'Database connection not available',
                message: 'Oracle connection pool is not initialized',
            });
        }

        connection = await oraclePool.getConnection();
        console.log(`✅ [${label}] Database connection successful`);

        const spectypeBinds = spectypes.map((_, i) => `:spectype${i}`).join(', ');
        const query  = buildQuery(spectypeBinds);
        const params = buildParams(spectypes);

        console.log(`[${label}] Executing Query`);

        const result = await connection.execute(query, params, {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
        });

        const executionTime = Date.now() - startTime;
        console.log(`✅ [${label}] Success — ${result.rows.length} records`);

        res.json({
            success: true,
            data: result.rows,
            filters: {
                spectypes,
                dateFrom: '2026-01-01',
            },
            count: result.rows.length,
            executionTime: `${executionTime}ms`,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error(`❌ [${label}] Error:`, error);

        res.status(500).json({
            success: false,
            error: `An error occurred while fetching ${label} data`,
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            executionTime: `${Date.now() - startTime}ms`,
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log(`[${label}] Database connection closed`);
            } catch (closeErr) {
                console.error(`❌ [${label}] Error closing connection:`, closeErr);
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Controllers
// ---------------------------------------------------------------------------

/** Total received — SPECTYPEs: 20, 2, 3, 4, 5, 87 */
exports.getCumulativeAnnualCensus = (req, res) =>
    executeCensusQuery(req, res, SPECTYPE_RECEIVED, 'Cumulative Annual Census - Received');

/** Initial sample screened — SPECTYPEs: 20, 2, 3, 4, 87 */
exports.getCumulativeAnnualCensusScreened = (req, res) =>
    executeCensusQuery(req, res, SPECTYPE_SCREENED, 'Cumulative Annual Census - Screened');

/** Total sample initial — SPECTYPE: 20 */
exports.getCumulativeAnnualCensusInitial = (req, res) =>
    executeCensusQuery(req, res, SPECTYPE_INITIAL, 'Cumulative Annual Census - Initial');