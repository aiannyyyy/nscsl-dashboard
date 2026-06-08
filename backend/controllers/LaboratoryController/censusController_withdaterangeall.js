const oracledb = require('oracledb');

const validTypes = {
    "Received": ["1", "87", "20", "2", "3", "4", "5", "18"],
    "Screened": ["4", "3", "20", "2", "1"],
    "Initial":  ["20", "1"]
};

/**
 * Get Cumulative Monthly Census Samples
 * Returns: Monthly aggregated sample counts by type (Received, Screened, or Initial)
 */
exports.getCumulativeMonthlyCensus = async (req, res) => {
    let connection;
    const startTime = Date.now();

    try {
        console.log('[Cumulative Monthly Census] Request received');
        console.log('[Cumulative Monthly Census] Query Params:', req.query);

        const { type } = req.query;

        // Validate type parameter
        if (!type || !validTypes[type.trim()]) {
            console.log('❌ [Cumulative Monthly Census] Invalid type:', type);
            return res.status(400).json({
                success: false,
                error: 'Invalid type parameter',
                // ✅ Updated message to include 'Initial'
                message: "Type must be 'Received', 'Screened', or 'Initial'",
                validTypes: Object.keys(validTypes)
            });
        }

        // Get database connection from app.locals
        const oraclePool = req.app.locals.oracleDb;

        if (!oraclePool) {
            return res.status(500).json({
                success: false,
                error: 'Database connection not available',
                message: 'Oracle connection pool is not initialized'
            });
        }

        connection = await oraclePool.getConnection();
        console.log('✅ [Cumulative Monthly Census] Database connection successful');

        const spectypeValues = validTypes[type.trim()];
        console.log('[Cumulative Monthly Census] Spectype Values:', spectypeValues);

        // Build bind placeholders once to avoid duplication
        const spectypeBinds = spectypeValues.map((_, i) => `:spectype${i}`).join(', ');

        // Build query with dynamic parameter placeholders using UNION ALL
        const query = `
            SELECT MONTH, YEAR, SUM(TOTAL_SAMPLES) AS TOTAL_SAMPLES
            FROM (
                SELECT EXTRACT(MONTH FROM DTRECV) AS MONTH, 
                       EXTRACT(YEAR FROM DTRECV) AS YEAR, 
                       COUNT(*) AS TOTAL_SAMPLES
                FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE
                WHERE SPECTYPE IN (${spectypeBinds})
                GROUP BY EXTRACT(YEAR FROM DTRECV), EXTRACT(MONTH FROM DTRECV)
                
                UNION ALL
                
                SELECT EXTRACT(MONTH FROM DTRECV) AS MONTH, 
                       EXTRACT(YEAR FROM DTRECV) AS YEAR, 
                       COUNT(*) AS TOTAL_SAMPLES
                FROM PHMSDS.SAMPLE_DEMOG_MASTER
                WHERE SPECTYPE IN (${spectypeBinds})
                GROUP BY EXTRACT(YEAR FROM DTRECV), EXTRACT(MONTH FROM DTRECV)
            )
            GROUP BY YEAR, MONTH
            ORDER BY YEAR, MONTH
        `;

        // Build parameters object
        const params = {};
        spectypeValues.forEach((val, i) => {
            params[`spectype${i}`] = val;
        });

        console.log('[Cumulative Monthly Census] Executing Query');
        console.log('[Cumulative Monthly Census] Query Parameters:', params);

        // Execute query
        const result = await connection.execute(query, params, {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        const executionTime = Date.now() - startTime;

        console.log(`✅ [Cumulative Monthly Census] Success - Retrieved ${result.rows.length} records`);

        // Send JSON Response
        res.json({
            success: true,
            data: result.rows,
            filters: {
                type: type.trim(),
                spectypes: spectypeValues
            },
            count: result.rows.length,
            executionTime: `${executionTime}ms`,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ [Cumulative Monthly Census] Error:', error);

        const executionTime = Date.now() - startTime;

        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching cumulative monthly census data',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            executionTime: `${executionTime}ms`
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('[Cumulative Monthly Census] Database connection closed');
            } catch (closeErr) {
                console.error('❌ [Cumulative Monthly Census] Error closing connection:', closeErr);
            }
        }
    }
};