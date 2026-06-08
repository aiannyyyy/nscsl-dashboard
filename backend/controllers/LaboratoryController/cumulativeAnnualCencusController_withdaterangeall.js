const oracledb = require('oracledb');

/**
 * Spectype & date-range definitions per breakdown
 *
 * received  (test_6)  — 2013-09-24 to 2018-12-31  — SPECTYPEs: 1, 18, 87, 2, 3, 4, 5
 * received  (enbs)    — 2018-07-16 onwards          — SPECTYPEs: 20, 2, 3, 4, 5, 87
 * screened            — 2018-01-01 onwards          — SPECTYPEs: 4, 3, 20, 2
 * initial             — 2018-01-01 onwards          — SPECTYPE:  20
 *
 * NOTE: 'INITIAL' and 'SCREENED' are reserved/sensitive in Oracle — using
 *       prefixed aliases (cnt_screened, cnt_initial) to avoid ORA-00904.
 */

exports.getCumulativeAnnualCensus = async (req, res) => {
    let connection;
    const startTime = Date.now();

    try {
        console.log('[Cumulative Annual Census] Request received');

        const oraclePool = req.app.locals.oracleDb;

        if (!oraclePool) {
            return res.status(500).json({
                success: false,
                error: 'Database connection not available',
                message: 'Oracle connection pool is not initialized'
            });
        }

        connection = await oraclePool.getConnection();
        console.log('✅ [Cumulative Annual Census] Database connection successful');

        const query = `
            SELECT 
                year_month,
                SUM(total_samples)  AS total_samples,
                SUM(test_6)         AS test_6,
                SUM(enbs)           AS enbs,
                SUM(cnt_screened)   AS cnt_screened,
                SUM(cnt_initial)    AS cnt_initial
            FROM (
                SELECT 
                    TO_CHAR(DTRECV, 'YYYY-MM') AS year_month,
                    COUNT(labno)               AS total_samples,

                    -- received / test_6: SPECTYPEs 1,18,87,2,3,4,5 — 2013-09-24 to 2018-12-31
                    SUM(CASE
                        WHEN SPECTYPE IN ('1', '18', '87', '2', '3', '4', '5')
                         AND DTRECV BETWEEN TO_DATE('2013-09-24', 'YYYY-MM-DD')
                                       AND TO_DATE('2018-12-31', 'YYYY-MM-DD')
                        THEN 1 ELSE 0
                    END) AS test_6,

                    -- received / enbs: SPECTYPEs 20,2,3,4,5,87 — 2018-07-16 onwards
                    SUM(CASE
                        WHEN SPECTYPE IN ('20', '2', '3', '4', '5', '87')
                         AND DTRECV >= TO_DATE('2018-07-16', 'YYYY-MM-DD')
                        THEN 1 ELSE 0
                    END) AS enbs,

                    -- cnt_screened: SPECTYPEs 4,3,20,2 — 2018-01-01 onwards
                    SUM(CASE
                        WHEN SPECTYPE IN ('4', '3', '20', '2')
                         AND DTRECV >= TO_DATE('2018-01-01', 'YYYY-MM-DD')
                        THEN 1 ELSE 0
                    END) AS cnt_screened,

                    -- cnt_initial: SPECTYPE 20 only — 2018-01-01 onwards
                    SUM(CASE
                        WHEN SPECTYPE = '20'
                         AND DTRECV >= TO_DATE('2018-01-01', 'YYYY-MM-DD')
                        THEN 1 ELSE 0
                    END) AS cnt_initial

                FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE
                WHERE SPECTYPE IN ('1', '87', '20', '2', '3', '4', '5', '18')
                  AND DTRECV IS NOT NULL
                GROUP BY TO_CHAR(DTRECV, 'YYYY-MM')

                UNION ALL

                SELECT 
                    TO_CHAR(DTRECV, 'YYYY-MM') AS year_month,
                    COUNT(labno)               AS total_samples,

                    SUM(CASE
                        WHEN SPECTYPE IN ('1', '18', '87', '2', '3', '4', '5')
                         AND DTRECV BETWEEN TO_DATE('2013-09-24', 'YYYY-MM-DD')
                                       AND TO_DATE('2018-12-31', 'YYYY-MM-DD')
                        THEN 1 ELSE 0
                    END) AS test_6,

                    SUM(CASE
                        WHEN SPECTYPE IN ('20', '2', '3', '4', '5', '87')
                         AND DTRECV >= TO_DATE('2018-07-16', 'YYYY-MM-DD')
                        THEN 1 ELSE 0
                    END) AS enbs,

                    SUM(CASE
                        WHEN SPECTYPE IN ('4', '3', '20', '2')
                         AND DTRECV >= TO_DATE('2018-01-01', 'YYYY-MM-DD')
                        THEN 1 ELSE 0
                    END) AS cnt_screened,

                    SUM(CASE
                        WHEN SPECTYPE = '20'
                         AND DTRECV >= TO_DATE('2018-01-01', 'YYYY-MM-DD')
                        THEN 1 ELSE 0
                    END) AS cnt_initial

                FROM PHMSDS.SAMPLE_DEMOG_MASTER
                WHERE SPECTYPE IN ('1', '87', '20', '2', '3', '4', '5', '18')
                  AND DTRECV IS NOT NULL
                GROUP BY TO_CHAR(DTRECV, 'YYYY-MM')
            )
            GROUP BY year_month
            ORDER BY year_month ASC
        `;

        console.log('[Cumulative Annual Census] Executing Query');

        const result = await connection.execute(query, [], {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        const executionTime = Date.now() - startTime;
        console.log(`✅ [Cumulative Annual Census] Success - Retrieved ${result.rows.length} records`);

        res.json({
            success: true,
            data: result.rows,
            filters: {
                breakdowns: {
                    received: {
                        test_6: { spectypes: ['1', '18', '87', '2', '3', '4', '5'], dateRange: '2013-09-24 to 2018-12-31' },
                        enbs:   { spectypes: ['20', '2', '3', '4', '5', '87'],       dateRange: '2018-07-16 onwards' }
                    },
                    screened: { spectypes: ['4', '3', '20', '2'], dateRange: '2018-01-01 onwards' },
                    initial:  { spectypes: ['20'],                dateRange: '2018-01-01 onwards' }
                }
            },
            count: result.rows.length,
            executionTime: `${executionTime}ms`,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ [Cumulative Annual Census] Error:', error);

        const executionTime = Date.now() - startTime;

        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching cumulative annual census data',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            executionTime: `${executionTime}ms`
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('[Cumulative Annual Census] Database connection closed');
            } catch (closeErr) {
                console.error('❌ [Cumulative Annual Census] Error closing connection:', closeErr);
            }
        }
    }
};