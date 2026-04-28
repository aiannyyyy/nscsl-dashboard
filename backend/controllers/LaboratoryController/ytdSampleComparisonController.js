const oracledb = require('oracledb');

// Valid sample types mapping
const VALID_TYPES = {
    'received': ['1', '87', '20', '2', '3', '4', '5', '18'],
    'screened': ['4', '3', '20', '2', '1', '18'],
    'initial':  ['20']
};

/**
 * Get YTD (Year-to-Date) Sample Comparison
 * Returns: monthly sample counts for two years
 */
exports.getYTDSampleComparison = async (req, res) => {
    let connection;
    const startTime = Date.now();

    try {
        let { year1, year2, type } = req.query;

        // Validate required parameters
        if (!year1 || !year2 || !type) {
            return res.status(400).json({
                success: false,
                error: 'year1, year2, and type are required parameters'
            });
        }

        console.log('[YTD Sample Comparison] Request received:', { year1, year2, type });

        // Normalize type to lowercase
        type = type.toLowerCase().trim();

        // Validate type
        if (!VALID_TYPES[type]) {
            return res.status(400).json({
                success: false,
                error: "Invalid type. Use 'received', 'screened', or 'initial'.",
                validTypes: Object.keys(VALID_TYPES)
            });
        }

        const spectypeValues = VALID_TYPES[type];

        // Get database connection
        const oraclePool = req.app.locals.oracleDb;

        if (!oraclePool) {
            return res.status(500).json({
                success: false,
                error: 'Database connection not available',
                message: 'Oracle connection pool is not initialized'
            });
        }

        connection = await oraclePool.getConnection();

        // Build bind parameters for SPECTYPE
        const binds = { year1, year2 };
        spectypeValues.forEach((val, i) => {
            binds[`spectype${i}`] = val;
        });

        const spectypeBinds = spectypeValues.map((_, i) => `:spectype${i}`).join(', ');

        // Main Query - Combining ARCHIVE and MASTER tables
        const query = `
            SELECT 
                month,
                year,
                SUM(total_samples) AS total_samples
            FROM (
                SELECT 
                    EXTRACT(MONTH FROM DTRECV) AS month, 
                    EXTRACT(YEAR FROM DTRECV) AS year, 
                    COUNT(*) AS total_samples
                FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE
                WHERE EXTRACT(YEAR FROM DTRECV) IN (:year1, :year2) 
                AND SPECTYPE IN (${spectypeBinds})
                GROUP BY EXTRACT(YEAR FROM DTRECV), EXTRACT(MONTH FROM DTRECV)
                
                UNION ALL
                
                SELECT 
                    EXTRACT(MONTH FROM DTRECV) AS month, 
                    EXTRACT(YEAR FROM DTRECV) AS year, 
                    COUNT(*) AS total_samples
                FROM PHMSDS.SAMPLE_DEMOG_MASTER
                WHERE EXTRACT(YEAR FROM DTRECV) IN (:year1, :year2) 
                AND SPECTYPE IN (${spectypeBinds})
                GROUP BY EXTRACT(YEAR FROM DTRECV), EXTRACT(MONTH FROM DTRECV)
            )
            GROUP BY year, month
            ORDER BY year, month
        `;

        console.log('[YTD Sample Comparison] Executing query...');

        const result = await connection.execute(query, binds, {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        const executionTime = Date.now() - startTime;

        console.log(`[YTD Sample Comparison] Query returned ${result.rows.length} rows`);

        res.json({
            success: true,
            data: result.rows,
            filters: {
                year1,
                year2,
                type,
                spectypeValues
            },
            recordCount: result.rows.length,
            executionTime: `${executionTime}ms`,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ YTD Sample Comparison Error:', error);

        const executionTime = Date.now() - startTime;

        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching YTD sample comparison',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            executionTime: `${executionTime}ms`
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('[YTD Sample Comparison] Database connection closed');
            } catch (closeErr) {
                console.error('❌ Error closing connection:', closeErr);
            }
        }
    }
};