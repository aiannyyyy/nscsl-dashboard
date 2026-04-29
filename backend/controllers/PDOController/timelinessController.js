const oracledb = require('oracledb');

exports.getTimelinessData = async (req, res) => {
    let connection;
    const startTime = Date.now();

    try {
        const { year1, year2, month, province } = req.query;

        if (!year1 || !year2 || !month) {
            return res.status(400).json({
                success: false,
                error: 'Missing required query parameters: year1, year2, month'
            });
        }

        const monthInt  = parseInt(month, 10);
        const year1Int  = parseInt(year1, 10);
        const year2Int  = parseInt(year2, 10);

        if (isNaN(monthInt) || monthInt < 1 || monthInt > 12)
            return res.status(400).json({ success: false, error: 'Invalid month value, must be between 1 and 12' });

        if (isNaN(year1Int) || isNaN(year2Int))
            return res.status(400).json({ success: false, error: 'Invalid year values' });

        const monthPadded     = monthInt.toString().padStart(2, '0');
        const date_from_year1 = `${year1Int}-${monthPadded}-01`;
        const date_from_year2 = `${year2Int}-${monthPadded}-01`;

        const nextMonth      = monthInt === 12 ? 1 : monthInt + 1;
        const nextMonthYear1 = monthInt === 12 ? year1Int + 1 : year1Int;
        const nextMonthYear2 = monthInt === 12 ? year2Int + 1 : year2Int;
        const nextMonthPadded = nextMonth.toString().padStart(2, '0');

        const date_to_year1 = `${nextMonthYear1}-${nextMonthPadded}-01`;
        const date_to_year2 = `${nextMonthYear2}-${nextMonthPadded}-01`;

        const oraclePool = req.app.locals.oracleDb;
        if (!oraclePool) {
            return res.status(500).json({
                success: false,
                error: 'Database connection not available',
                message: 'Oracle connection pool is not initialized'
            });
        }

        connection = await oraclePool.getConnection();

        const hasProvince = province && province.trim() !== '' && province.trim().toLowerCase() !== 'all provinces';

        const query = `
            SELECT
                ${hasProvince ? 'p.COUNTY,' : ''}
                TO_CHAR(r.DTRECV, 'YYYY-MM')                 AS MONTH_YEAR,
                ROUND(AVG(r.DTRECV - r.DTCOLL), 2)           AS DTCOLL_DTRECV_MEAN,
                ROUND(MEDIAN(r.DTRECV - r.DTCOLL), 2)        AS DTCOLL_DTRECV_MEDIAN,
                ROUND(STATS_MODE(r.DTRECV - r.DTCOLL), 2)    AS DTCOLL_DTRECV_MODE,
                ROUND(AVG(r.DTRECV - r.BIRTHDT), 2)          AS AGE_RECEIVED_MEAN,
                ROUND(MEDIAN(r.DTRECV - r.BIRTHDT), 2)       AS AGE_RECEIVED_MEDIAN,
                ROUND(STATS_MODE(r.DTRECV - r.BIRTHDT), 2)   AS AGE_RECEIVED_MODE,
                ROUND(AVG(r.DTCOLL - r.BIRTHDT), 2)          AS AGE_COLLECTION_MEAN,
                ROUND(MEDIAN(r.DTCOLL - r.BIRTHDT), 2)       AS AGE_COLLECTION_MEDIAN,
                ROUND(STATS_MODE(r.DTCOLL - r.BIRTHDT), 2)   AS AGE_COLLECTION_MODE,
                COUNT(*) AS RECORD_COUNT
            FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE r
            JOIN PHMSDS.REF_PROVIDER_ADDRESS p
              ON r.SUBMID = p.PROVIDERID
            WHERE (
                    (r.DTRECV >= TO_DATE(:date_from_year1, 'YYYY-MM-DD')
                     AND r.DTRECV <  TO_DATE(:date_to_year1, 'YYYY-MM-DD'))
                    OR
                    (r.DTRECV >= TO_DATE(:date_from_year2, 'YYYY-MM-DD')
                     AND r.DTRECV <  TO_DATE(:date_to_year2, 'YYYY-MM-DD'))
                  )
              AND r.BIRTHDT IS NOT NULL
              AND r.DTCOLL IS NOT NULL
              AND (r.RELEASEDT - r.BIRTHDT) <= 20
              AND p.COUNTY <> 'QUEZON CITY'
              AND p.COUNTY <> '""'
              AND p.COUNTY IS NOT NULL
              ${hasProvince ? `AND UPPER(p.COUNTY) LIKE UPPER(:province || '%')` : ''}
            GROUP BY
                ${hasProvince ? 'p.COUNTY,' : ''}
                TO_CHAR(r.DTRECV, 'YYYY-MM')
            ORDER BY
                ${hasProvince ? 'p.COUNTY,' : ''}
                TO_CHAR(r.DTRECV, 'YYYY-MM')
        `;

        const binds = {
            date_from_year1,
            date_to_year1,
            date_from_year2,
            date_to_year2,
            ...(hasProvince && { province: province.trim() })
        };

        const result = await connection.execute(query, binds, {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
            fetchArraySize: 1000,
            maxRows: 0
        });

        const executionTime = Date.now() - startTime;

        if (!result.rows || result.rows.length === 0) {
            return res.json({
                success: true,
                message: 'No data found for the specified criteria',
                data: [],
                executionTime: `${executionTime}ms`,
                recordCount: 0
            });
        }

        const year1Data = result.rows.find(row => row.MONTH_YEAR.startsWith(year1));
        const year2Data = result.rows.find(row => row.MONTH_YEAR.startsWith(year2));

        const transformedData = [{
            month: `${monthInt}`,
            aoc_mean_year1:       year1Data?.AGE_COLLECTION_MEAN    || 0,
            aoc_mean_year2:       year2Data?.AGE_COLLECTION_MEAN    || 0,
            aoc_median_year1:     year1Data?.AGE_COLLECTION_MEDIAN  || 0,
            aoc_median_year2:     year2Data?.AGE_COLLECTION_MEDIAN  || 0,
            aoc_mode_year1:       year1Data?.AGE_COLLECTION_MODE    || 0,
            aoc_mode_year2:       year2Data?.AGE_COLLECTION_MODE    || 0,
            transit_mean_year1:   year1Data?.DTCOLL_DTRECV_MEAN     || 0,
            transit_mean_year2:   year2Data?.DTCOLL_DTRECV_MEAN     || 0,
            transit_median_year1: year1Data?.DTCOLL_DTRECV_MEDIAN   || 0,
            transit_median_year2: year2Data?.DTCOLL_DTRECV_MEDIAN   || 0,
            transit_mode_year1:   year1Data?.DTCOLL_DTRECV_MODE     || 0,
            transit_mode_year2:   year2Data?.DTCOLL_DTRECV_MODE     || 0,
            aur_mean_year1:       year1Data?.AGE_RECEIVED_MEAN      || 0,
            aur_mean_year2:       year2Data?.AGE_RECEIVED_MEAN      || 0,
            aur_median_year1:     year1Data?.AGE_RECEIVED_MEDIAN    || 0,
            aur_median_year2:     year2Data?.AGE_RECEIVED_MEDIAN    || 0,
            aur_mode_year1:       year1Data?.AGE_RECEIVED_MODE      || 0,
            aur_mode_year2:       year2Data?.AGE_RECEIVED_MODE      || 0,
        }];

        res.json({
            success: true,
            data: transformedData,
            executionTime: `${executionTime}ms`,
            recordCount: transformedData.length,
            rawDataCount: result.rows.length,
            filters: {
                year1: year1Int,
                year2: year2Int,
                month: monthInt,
                province: hasProvince ? province.trim() : 'All Provinces'
            },
            ...(process.env.NODE_ENV === 'development' && {
                debug: {
                    year1DataFound: !!year1Data,
                    year2DataFound: !!year2Data,
                    rawRows: result.rows.length,
                    hasProvinceFilter: hasProvince
                }
            })
        });

    } catch (err) {
        console.error('❌ Database error:', err);
        const executionTime = Date.now() - startTime;
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching timeliness data',
            message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
            executionTime: `${executionTime}ms`
        });
    } finally {
        if (connection) {
            try { await connection.close(); }
            catch (closeErr) { console.error('❌ Error closing connection:', closeErr); }
        }
    }
};

exports.getTimelinessDataNoCounty = async (req, res) => {
    let connection;
    const startTime = Date.now();

    try {
        const { year1, year2, startMonth, endMonth } = req.query;

        if (!year1 || !year2 || !startMonth || !endMonth) {
            return res.status(400).json({
                success: false,
                error: 'Missing required query parameters: year1, year2, startMonth, endMonth'
            });
        }

        const startMonthInt = parseInt(startMonth, 10);
        const endMonthInt   = parseInt(endMonth, 10);
        const year1Int      = parseInt(year1, 10);
        const year2Int      = parseInt(year2, 10);

        if (isNaN(startMonthInt) || startMonthInt < 1 || startMonthInt > 12)
            return res.status(400).json({ success: false, error: 'Invalid startMonth, must be between 1 and 12' });

        if (isNaN(endMonthInt) || endMonthInt < 1 || endMonthInt > 12)
            return res.status(400).json({ success: false, error: 'Invalid endMonth, must be between 1 and 12' });

        if (startMonthInt > endMonthInt)
            return res.status(400).json({ success: false, error: 'startMonth cannot be greater than endMonth' });

        if (isNaN(year1Int) || isNaN(year2Int))
            return res.status(400).json({ success: false, error: 'Invalid year values' });

        const startMonthPadded = startMonthInt.toString().padStart(2, '0');
        const nextMonth        = endMonthInt === 12 ? 1 : endMonthInt + 1;
        const nextMonthPadded  = nextMonth.toString().padStart(2, '0');

        const date_from_year1 = `${year1Int}-${startMonthPadded}-01`;
        const date_from_year2 = `${year2Int}-${startMonthPadded}-01`;

        const nextMonthYear1  = endMonthInt === 12 ? year1Int + 1 : year1Int;
        const nextMonthYear2  = endMonthInt === 12 ? year2Int + 1 : year2Int;

        const date_to_year1   = `${nextMonthYear1}-${nextMonthPadded}-01`;
        const date_to_year2   = `${nextMonthYear2}-${nextMonthPadded}-01`;

        const oraclePool = req.app.locals.oracleDb;
        if (!oraclePool) {
            return res.status(500).json({
                success: false,
                error: 'Database connection not available',
                message: 'Oracle connection pool is not initialized'
            });
        }

        connection = await oraclePool.getConnection();

        const query = `
            SELECT
                TO_CHAR(r.DTRECV, 'YYYY-MM')                 AS MONTH_YEAR,
                ROUND(AVG(r.DTRECV - r.DTCOLL), 2)           AS DTCOLL_DTRECV_MEAN,
                ROUND(MEDIAN(r.DTRECV - r.DTCOLL), 2)        AS DTCOLL_DTRECV_MEDIAN,
                ROUND(STATS_MODE(r.DTRECV - r.DTCOLL), 2)    AS DTCOLL_DTRECV_MODE,
                ROUND(AVG(r.DTRECV - r.BIRTHDT), 2)          AS AGE_RECEIVED_MEAN,
                ROUND(MEDIAN(r.DTRECV - r.BIRTHDT), 2)       AS AGE_RECEIVED_MEDIAN,
                ROUND(STATS_MODE(r.DTRECV - r.BIRTHDT), 2)   AS AGE_RECEIVED_MODE,
                ROUND(AVG(r.DTCOLL - r.BIRTHDT), 2)          AS AGE_COLLECTION_MEAN,
                ROUND(MEDIAN(r.DTCOLL - r.BIRTHDT), 2)       AS AGE_COLLECTION_MEDIAN,
                ROUND(STATS_MODE(r.DTCOLL - r.BIRTHDT), 2)   AS AGE_COLLECTION_MODE,
                COUNT(*) AS RECORD_COUNT
            FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE r
            JOIN PHMSDS.REF_PROVIDER_ADDRESS p
              ON r.SUBMID = p.PROVIDERID
            WHERE (
                    (r.DTRECV >= TO_DATE(:date_from_year1, 'YYYY-MM-DD')
                     AND r.DTRECV <  TO_DATE(:date_to_year1, 'YYYY-MM-DD'))
                    OR
                    (r.DTRECV >= TO_DATE(:date_from_year2, 'YYYY-MM-DD')
                     AND r.DTRECV <  TO_DATE(:date_to_year2, 'YYYY-MM-DD'))
                  )
              AND r.BIRTHDT IS NOT NULL
              AND r.DTCOLL IS NOT NULL
              AND (r.RELEASEDT - r.BIRTHDT) <= 20
              AND p.COUNTY <> 'QUEZON CITY'
              AND p.COUNTY <> '""'
              AND p.COUNTY IS NOT NULL
            GROUP BY
                TO_CHAR(r.DTRECV, 'YYYY-MM')
            ORDER BY
                TO_CHAR(r.DTRECV, 'YYYY-MM')
        `;

        const binds = {
            date_from_year1,
            date_to_year1,
            date_from_year2,
            date_to_year2
        };

        const result = await connection.execute(query, binds, {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
            fetchArraySize: 1000,
            maxRows: 0
        });

        const executionTime = Date.now() - startTime;

        if (!result.rows || result.rows.length === 0) {
            return res.json({
                success: true,
                message: 'No data found for the specified criteria',
                data: [],
                executionTime: `${executionTime}ms`,
                recordCount: 0
            });
        }

        const year1Rows = result.rows.filter(row => row.MONTH_YEAR.startsWith(year1));
        const year2Rows = result.rows.filter(row => row.MONTH_YEAR.startsWith(year2));

        const avg = (rows, field) => {
            const vals = rows.map(r => r[field]).filter(v => v !== null && v !== undefined);
            return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : 0;
        };

        const transformedData = [{
            startMonth: startMonthInt,
            endMonth:   endMonthInt,
            aoc_mean_year1:       avg(year1Rows, 'AGE_COLLECTION_MEAN'),
            aoc_mean_year2:       avg(year2Rows, 'AGE_COLLECTION_MEAN'),
            aoc_median_year1:     avg(year1Rows, 'AGE_COLLECTION_MEDIAN'),
            aoc_median_year2:     avg(year2Rows, 'AGE_COLLECTION_MEDIAN'),
            aoc_mode_year1:       avg(year1Rows, 'AGE_COLLECTION_MODE'),
            aoc_mode_year2:       avg(year2Rows, 'AGE_COLLECTION_MODE'),
            transit_mean_year1:   avg(year1Rows, 'DTCOLL_DTRECV_MEAN'),
            transit_mean_year2:   avg(year2Rows, 'DTCOLL_DTRECV_MEAN'),
            transit_median_year1: avg(year1Rows, 'DTCOLL_DTRECV_MEDIAN'),
            transit_median_year2: avg(year2Rows, 'DTCOLL_DTRECV_MEDIAN'),
            transit_mode_year1:   avg(year1Rows, 'DTCOLL_DTRECV_MODE'),
            transit_mode_year2:   avg(year2Rows, 'DTCOLL_DTRECV_MODE'),
            aur_mean_year1:       avg(year1Rows, 'AGE_RECEIVED_MEAN'),
            aur_mean_year2:       avg(year2Rows, 'AGE_RECEIVED_MEAN'),
            aur_median_year1:     avg(year1Rows, 'AGE_RECEIVED_MEDIAN'),
            aur_median_year2:     avg(year2Rows, 'AGE_RECEIVED_MEDIAN'),
            aur_mode_year1:       avg(year1Rows, 'AGE_RECEIVED_MODE'),
            aur_mode_year2:       avg(year2Rows, 'AGE_RECEIVED_MODE'),
        }];

        res.json({
            success: true,
            data: transformedData,
            executionTime: `${executionTime}ms`,
            recordCount: transformedData.length,
            rawDataCount: result.rows.length,
            filters: { year1: year1Int, year2: year2Int, startMonth: startMonthInt, endMonth: endMonthInt },
            ...(process.env.NODE_ENV === 'development' && {
                debug: {
                    year1RowsFound: year1Rows.length,
                    year2RowsFound: year2Rows.length,
                    rawRows: result.rows.length,
                    dateRanges: { date_from_year1, date_to_year1, date_from_year2, date_to_year2 }
                }
            })
        });

    } catch (err) {
        console.error('❌ Database error:', err);
        const executionTime = Date.now() - startTime;
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching timeliness data',
            message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
            executionTime: `${executionTime}ms`
        });
    } finally {
        if (connection) {
            try { await connection.close(); }
            catch (closeErr) { console.error('❌ Error closing connection:', closeErr); }
        }
    }
};

exports.getTimelinessDataMonthlySingle = async (req, res) => {
    let connection;
    const startTime = Date.now();

    try {
        const { year1, year2, month } = req.query;

        if (!year1 || !year2 || !month) {
            return res.status(400).json({
                success: false,
                error: 'Missing required query parameters: year1, year2, month'
            });
        }

        const monthInt  = parseInt(month, 10);
        const year1Int  = parseInt(year1, 10);
        const year2Int  = parseInt(year2, 10);

        if (isNaN(monthInt) || monthInt < 1 || monthInt > 12)
            return res.status(400).json({ success: false, error: 'Invalid month value, must be between 1 and 12' });

        if (isNaN(year1Int) || isNaN(year2Int))
            return res.status(400).json({ success: false, error: 'Invalid year values' });

        const monthPadded     = monthInt.toString().padStart(2, '0');
        const date_from_year1 = `${year1Int}-${monthPadded}-01`;
        const date_from_year2 = `${year2Int}-${monthPadded}-01`;

        const nextMonth       = monthInt === 12 ? 1 : monthInt + 1;
        const nextMonthYear1  = monthInt === 12 ? year1Int + 1 : year1Int;
        const nextMonthYear2  = monthInt === 12 ? year2Int + 1 : year2Int;
        const nextMonthPadded = nextMonth.toString().padStart(2, '0');

        const date_to_year1 = `${nextMonthYear1}-${nextMonthPadded}-01`;
        const date_to_year2 = `${nextMonthYear2}-${nextMonthPadded}-01`;

        const oraclePool = req.app.locals.oracleDb;
        if (!oraclePool) {
            return res.status(500).json({
                success: false,
                error: 'Database connection not available',
                message: 'Oracle connection pool is not initialized'
            });
        }

        connection = await oraclePool.getConnection();

        const query = `
            SELECT
                TO_CHAR(r.DTRECV, 'YYYY-MM')                AS MONTH_YEAR,
                ROUND(AVG(r.DTRECV - r.DTCOLL), 2)          AS DTCOLL_DTRECV_MEAN,
                ROUND(MEDIAN(r.DTRECV - r.DTCOLL), 2)       AS DTCOLL_DTRECV_MEDIAN,
                ROUND(STATS_MODE(r.DTRECV - r.DTCOLL), 2)   AS DTCOLL_DTRECV_MODE,
                ROUND(AVG(r.DTRECV - r.BIRTHDT), 2)         AS AGE_RECEIVED_MEAN,
                ROUND(MEDIAN(r.DTRECV - r.BIRTHDT), 2)      AS AGE_RECEIVED_MEDIAN,
                ROUND(STATS_MODE(r.DTRECV - r.BIRTHDT), 2)  AS AGE_RECEIVED_MODE,
                ROUND(AVG(r.DTCOLL - r.BIRTHDT), 2)         AS AGE_COLLECTION_MEAN,
                ROUND(MEDIAN(r.DTCOLL - r.BIRTHDT), 2)      AS AGE_COLLECTION_MEDIAN,
                ROUND(STATS_MODE(r.DTCOLL - r.BIRTHDT), 2)  AS AGE_COLLECTION_MODE,
                COUNT(*) AS RECORD_COUNT
            FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE r
            JOIN PHMSDS.REF_PROVIDER_ADDRESS p
              ON r.SUBMID = p.PROVIDERID
            WHERE (
                    (r.DTRECV >= TO_DATE(:date_from_year1, 'YYYY-MM-DD')
                     AND r.DTRECV <  TO_DATE(:date_to_year1, 'YYYY-MM-DD'))
                    OR
                    (r.DTRECV >= TO_DATE(:date_from_year2, 'YYYY-MM-DD')
                     AND r.DTRECV <  TO_DATE(:date_to_year2, 'YYYY-MM-DD'))
                  )
              AND r.BIRTHDT IS NOT NULL
              AND r.DTCOLL IS NOT NULL
              AND (r.RELEASEDT - r.BIRTHDT) <= 20
              AND p.COUNTY <> 'QUEZON CITY'
              AND p.COUNTY <> '""'
              AND p.COUNTY IS NOT NULL
            GROUP BY
                TO_CHAR(r.DTRECV, 'YYYY-MM')
            ORDER BY
                TO_CHAR(r.DTRECV, 'YYYY-MM')
        `;

        const binds = { date_from_year1, date_to_year1, date_from_year2, date_to_year2 };

        const result = await connection.execute(query, binds, {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
            fetchArraySize: 1000,
            maxRows: 0
        });

        const executionTime = Date.now() - startTime;

        if (!result.rows || result.rows.length === 0) {
            return res.json({
                success: true,
                message: 'No data found for the specified criteria',
                data: [],
                executionTime: `${executionTime}ms`,
                recordCount: 0
            });
        }

        const year1Data = result.rows.find(row => row.MONTH_YEAR.startsWith(year1));
        const year2Data = result.rows.find(row => row.MONTH_YEAR.startsWith(year2));

        const transformedData = [{
            month: `${monthInt}`,
            aoc_mean_year1:       year1Data?.AGE_COLLECTION_MEAN    || 0,
            aoc_mean_year2:       year2Data?.AGE_COLLECTION_MEAN    || 0,
            aoc_median_year1:     year1Data?.AGE_COLLECTION_MEDIAN  || 0,
            aoc_median_year2:     year2Data?.AGE_COLLECTION_MEDIAN  || 0,
            aoc_mode_year1:       year1Data?.AGE_COLLECTION_MODE    || 0,
            aoc_mode_year2:       year2Data?.AGE_COLLECTION_MODE    || 0,
            transit_mean_year1:   year1Data?.DTCOLL_DTRECV_MEAN     || 0,
            transit_mean_year2:   year2Data?.DTCOLL_DTRECV_MEAN     || 0,
            transit_median_year1: year1Data?.DTCOLL_DTRECV_MEDIAN   || 0,
            transit_median_year2: year2Data?.DTCOLL_DTRECV_MEDIAN   || 0,
            transit_mode_year1:   year1Data?.DTCOLL_DTRECV_MODE     || 0,
            transit_mode_year2:   year2Data?.DTCOLL_DTRECV_MODE     || 0,
            aur_mean_year1:       year1Data?.AGE_RECEIVED_MEAN      || 0,
            aur_mean_year2:       year2Data?.AGE_RECEIVED_MEAN      || 0,
            aur_median_year1:     year1Data?.AGE_RECEIVED_MEDIAN    || 0,
            aur_median_year2:     year2Data?.AGE_RECEIVED_MEDIAN    || 0,
            aur_mode_year1:       year1Data?.AGE_RECEIVED_MODE      || 0,
            aur_mode_year2:       year2Data?.AGE_RECEIVED_MODE      || 0,
        }];

        res.json({
            success: true,
            data: transformedData,
            executionTime: `${executionTime}ms`,
            recordCount: transformedData.length,
            rawDataCount: result.rows.length,
            filters: { year1: year1Int, year2: year2Int, month: monthInt },
            ...(process.env.NODE_ENV === 'development' && {
                debug: {
                    year1DataFound: !!year1Data,
                    year2DataFound: !!year2Data,
                    rawRows: result.rows.length,
                }
            })
        });

    } catch (err) {
        console.error('❌ Database error:', err);
        const executionTime = Date.now() - startTime;
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching timeliness data',
            message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
            executionTime: `${executionTime}ms`
        });
    } finally {
        if (connection) {
            try { await connection.close(); }
            catch (closeErr) { console.error('❌ Error closing connection:', closeErr); }
        }
    }
};