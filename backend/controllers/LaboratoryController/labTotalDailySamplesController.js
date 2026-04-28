const oracledb = require('oracledb');

const SAMPLE_RECEIVED = ['1', '87', '20', '2', '3', '4', '5', '18'];
const SAMPLE_SCREENED = ['4', '3', '20', '2', '1', '18'];
const SAMPLE_INITIAL = ['20'];

exports.getLabTotalDailySamples = async (req, res) => {
    let connection;
    const startTime = Date.now();

    try {
        let { year, month, sampleType } = req.query;

        if (!year || !month) {
            return res.status(400).json({
                success: false,
                error: 'Year and month are required parameters'
            });
        }

        console.log('[Lab Total Daily Samples] Request received:', { year, month, sampleType });

        const oraclePool = req.app.locals.oracleDb;
        if (!oraclePool) {
            return res.status(500).json({
                success: false,
                error: 'Database connection not available',
                message: 'Oracle connection pool is not initialized'
            });
        }

        connection = await oraclePool.getConnection();

        const monthMap = {
            'january': '01', 'february': '02', 'march': '03', 'april': '04',
            'may': '05', 'june': '06', 'july': '07', 'august': '08',
            'september': '09', 'october': '10', 'november': '11', 'december': '12'
        };

        month = month.toLowerCase().trim();

        if (!monthMap[month]) {
            return res.status(400).json({
                success: false,
                error: "Invalid month. Use full month name (e.g., 'January')"
            });
        }

        const monthNum = monthMap[month];

        // ✅ Added 'initial' sample type
        let specTypes;
        if (sampleType === 'received') {
            specTypes = SAMPLE_RECEIVED;
        } else if (sampleType === 'screened') {
            specTypes = SAMPLE_SCREENED;
        } else if (sampleType === 'initial') {
            specTypes = SAMPLE_INITIAL;
        } else {
            specTypes = SAMPLE_RECEIVED; // default
        }

        const startDate = `${year}-${monthNum}-01`;
        let nextYear = parseInt(year);
        let nextMonth = parseInt(monthNum) + 1;

        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear++;
        }

        const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

        console.log(`[Lab Total Daily Samples] Date range: ${startDate} to ${endDate}`);
        console.log(`[Lab Total Daily Samples] Sample types: ${specTypes.join(', ')}`);

        const specTypePlaceholders = specTypes.map((_, i) => `:specType${i}`).join(', ');

        const binds = { startDate, endDate };
        specTypes.forEach((type, i) => {
            binds[`specType${i}`] = type;
        });

        const query = `
            SELECT 
                RECEIVED_DATE,
                SUM(TOTAL_SAMPLES) AS TOTAL_SAMPLES
            FROM (
                SELECT 
                    TO_CHAR(DTRECV, 'YYYY-MM-DD') AS RECEIVED_DATE, 
                    COUNT(*) AS TOTAL_SAMPLES
                FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE
                WHERE 
                    DTRECV >= TO_DATE(:startDate, 'YYYY-MM-DD')
                    AND DTRECV < TO_DATE(:endDate, 'YYYY-MM-DD')
                    AND SPECTYPE IN (${specTypePlaceholders})
                GROUP BY TO_CHAR(DTRECV, 'YYYY-MM-DD')
                
                UNION ALL
                
                SELECT 
                    TO_CHAR(DTRECV, 'YYYY-MM-DD') AS RECEIVED_DATE, 
                    COUNT(*) AS TOTAL_SAMPLES
                FROM PHMSDS.SAMPLE_DEMOG_MASTER
                WHERE 
                    DTRECV >= TO_DATE(:startDate, 'YYYY-MM-DD')
                    AND DTRECV < TO_DATE(:endDate, 'YYYY-MM-DD')
                    AND SPECTYPE IN (${specTypePlaceholders})
                GROUP BY TO_CHAR(DTRECV, 'YYYY-MM-DD')
            )
            GROUP BY RECEIVED_DATE
            ORDER BY RECEIVED_DATE
        `;

        console.log('[Lab Total Daily Samples] Executing query...');

        const result = await connection.execute(query, binds, {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        const executionTime = Date.now() - startTime;
        console.log(`[Lab Total Daily Samples] Query returned ${result.rows.length} rows`);

        res.json({
            success: true,
            data: result.rows,
            filters: {
                year,
                month: Object.keys(monthMap).find(key => monthMap[key] === monthNum),
                sampleType: sampleType || 'received',
                specTypes
            },
            recordCount: result.rows.length,
            executionTime: `${executionTime}ms`,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Lab Total Daily Samples Error:', error);
        const executionTime = Date.now() - startTime;
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching lab total daily samples',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            executionTime: `${executionTime}ms`
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('[Lab Total Daily Samples] Database connection closed');
            } catch (closeErr) {
                console.error('❌ Error closing connection:', closeErr);
            }
        }
    }
};