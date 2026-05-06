const oracledb = require('oracledb');

// Full list of valid mnemonics — used when testCode === 'ALL'
const ALL_MNEMONICS = [
    'TSH1', 'TSH2',
    'OHP1', 'OHP2', 'OHP3',
    'GMU', 'GN1', 'GC1', 'GN2', 'GC2', 'GMVC', 'GNC', 'GCC', 'GALP',
    'PHEMS1', 'PHEMS2',
    'LEUMS1', 'LEUMS2',
    'METMS1', 'METMS2',
    'SAMS2',
    'TYRMS1', 'TYRMS2',
    'CITMS1', 'CITMS2',
    'CUDMS1', 'CUDMS2',
    'CP1MS1', 'CP1MS2',
    'CP2MS1', 'CP2MS2',
    'GA2MS1', 'GA2MS2',
    'MCAMS1', 'MCAMS2',
    'VLCMS1', 'VLCMS2',
    'LCHMS1', 'LCHMS2',
    'MMAMS1', 'MMAMS2',
    'MDMS1', 'MDMS2',
    'BKTMS1', 'BKTMS2',
    'IVAMS1', 'IVAMS2',
    'GA1MS1', 'GA1MS2',
    'STPN', 'TPN1',
    'BTND1', 'BTND2',
    'IRT1', 'IRT2', 'IRT3',
    'BARTS',
    'FE', 'F', 'FAEB', 'FAES', 'FEA', 'FS', 'FDA',
    'BTS1',
];

/**
 * Get Patient Details for Follow-up
 * Returns: patient lab results filtered by date range and optional test code.
 * When testCode === 'ALL', results are restricted to ALL_MNEMONICS list above.
 * When a specific testCode is provided, results are filtered to that code only.
 */
exports.getPatientDetails = async (req, res) => {
    let connection;
    const startTime = Date.now();

    try {
        console.log('[Patient Details] Request received');

        const { dateFrom, dateTo, testCode = 'ALL' } = req.query;

        if (!dateFrom || !dateTo) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters',
                message: 'dateFrom and dateTo are required query parameters'
            });
        }

        const oraclePool = req.app.locals.oracleDb;
        if (!oraclePool) {
            return res.status(500).json({
                success: false,
                error: 'Database connection not available',
                message: 'Oracle connection pool is not initialized'
            });
        }

        connection = await oraclePool.getConnection();

        let filterCondition = '';
        let binds = {
            StartDate: new Date(dateFrom),
            EndDate:   new Date(dateTo),
        };

        if (testCode && testCode !== 'ALL') {
            // Single specific code — filter TESTCODE or MNEMONIC
            filterCondition = `AND (daa."TESTCODE" = :Code OR da."MNEMONIC" = :Code)`;
            binds.Code = testCode;
        } else {
            // ALL — build an IN list from ALL_MNEMONICS using numbered bind variables
            const bindKeys = ALL_MNEMONICS.map((_, i) => `:mn${i}`).join(', ');
            filterCondition = `AND (daa."TESTCODE" IN (${bindKeys}) OR da."MNEMONIC" IN (${bindKeys}))`;
            ALL_MNEMONICS.forEach((mn, i) => { binds[`mn${i}`] = mn; });
        }

        console.log(`[Patient Details] Date range: ${dateFrom} to ${dateTo}, Test Code: ${testCode}`);

        const query = `
            SELECT
                "LABNO", "LINK", "MNEMONIC", "VALUE", "TESTCODE", "LASTMOD", "DTRECV",
                CURRENT_DTCOLL, LINKED_DTCOLL,
                "BIRTHTM", CURRENT_TMCOLL, LINKED_TMCOLL,
                "LNAME", "FNAME", "PHYSID", "BIRTHDT",
                "BIRTHWT", "SUBMID", "SEX", "GESTAGE", "CLINSTAT", "COUNTY", "TMRECV"
            FROM (
                -- ARCHIVE
                SELECT
                    da."LABNO",
                    sd."LINK",
                    da."MNEMONIC",
                    daa."VALUE",
                    daa."TESTCODE",
                    daa."LASTMOD",
                    sd."DTRECV",
                    sd."DTCOLL"         AS CURRENT_DTCOLL,
                    sd_link."DTCOLL"    AS LINKED_DTCOLL,
                    sd."BIRTHTM",
                    sd."TMCOLL"         AS CURRENT_TMCOLL,
                    sd_link."TMCOLL"    AS LINKED_TMCOLL,
                    sd."LNAME",
                    sd."FNAME",
                    sd."PHYSID",
                    sd."BIRTHDT",
                    sd."BIRTHWT",
                    sd."SUBMID",
                    sd."SEX",
                    sd."GESTAGE",
                    sd."CLINSTAT",
                    rpa."COUNTY",
                    sd."TMRECV",
                    ROW_NUMBER() OVER (
                        PARTITION BY da."LABNO", sd."LINK"
                        ORDER BY sd."DTRECV" DESC
                    ) AS rn
                FROM "PHMSDS"."DISORDER_ARCHIVE"          da
                JOIN "PHMSDS"."DISORDER_AVG_ARCHIVE"      daa
                    ON  da."LABNO"    = daa."LABNO"
                    AND da."REPTCODE" = daa."REPTCODE"
                JOIN "PHMSDS"."SAMPLE_DEMOG_ARCHIVE"      sd
                    ON  da."LABNO"    = sd."LABNO"
                LEFT JOIN "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" sd_link
                    ON  sd."LINK"     = sd_link."LABNO"
                JOIN "PHMSDS"."REF_PROVIDER_ADDRESS"      rpa
                    ON  sd."SUBMID"   = rpa."PROVIDERID"
                WHERE
                    sd."LNAME"  <> 'CDC'
                    AND sd."DTRECV" >= :StartDate
                    AND sd."DTRECV"  < :EndDate
                    ${filterCondition}

                UNION ALL

                -- MASTER
                SELECT
                    da."LABNO",
                    sd."LINK",
                    da."MNEMONIC",
                    daa."VALUE",
                    daa."TESTCODE",
                    daa."LASTMOD",
                    sd."DTRECV",
                    sd."DTCOLL"         AS CURRENT_DTCOLL,
                    sd_link."DTCOLL"    AS LINKED_DTCOLL,
                    sd."BIRTHTM",
                    sd."TMCOLL"         AS CURRENT_TMCOLL,
                    sd_link."TMCOLL"    AS LINKED_TMCOLL,
                    sd."LNAME",
                    sd."FNAME",
                    sd."PHYSID",
                    sd."BIRTHDT",
                    sd."BIRTHWT",
                    sd."SUBMID",
                    sd."SEX",
                    sd."GESTAGE",
                    sd."CLINSTAT",
                    rpa."COUNTY",
                    sd."TMRECV",
                    ROW_NUMBER() OVER (
                        PARTITION BY da."LABNO", sd."LINK"
                        ORDER BY sd."DTRECV" DESC
                    ) AS rn
                FROM "PHMSDS"."DISORDER_MASTER"          da
                JOIN "PHMSDS"."DISORDER_AVG_MASTER"      daa
                    ON  da."LABNO"    = daa."LABNO"
                    AND da."REPTCODE" = daa."REPTCODE"
                JOIN "PHMSDS"."SAMPLE_DEMOG_MASTER"      sd
                    ON  da."LABNO"    = sd."LABNO"
                LEFT JOIN "PHMSDS"."SAMPLE_DEMOG_MASTER" sd_link
                    ON  sd."LINK"     = sd_link."LABNO"
                JOIN "PHMSDS"."REF_PROVIDER_ADDRESS"      rpa
                    ON  sd."SUBMID"   = rpa."PROVIDERID"
                WHERE
                    sd."LNAME"  <> 'CDC'
                    AND sd."DTRECV" >= :StartDate
                    AND sd."DTRECV"  < :EndDate
                    ${filterCondition}
            ) x
            WHERE rn = 1
            ORDER BY "LABNO", "LINK"
        `;

        console.log('[Patient Details] Executing query...');

        const result = await connection.execute(query, binds, {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
            fetchArraySize: 1000
        });

        const rows = result.rows || [];
        const executionTime = Date.now() - startTime;

        console.log(`[Patient Details] Success - Total records: ${rows.length}, Time: ${executionTime}ms`);

        res.json({
            success: true,
            data: rows,
            meta: {
                totalRecords: rows.length,
                filters: { dateFrom, dateTo, testCode: testCode || 'ALL' }
            },
            executionTime: `${executionTime}ms`,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Patient Details Error:', error);
        const executionTime = Date.now() - startTime;
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching patient details',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            executionTime: `${executionTime}ms`
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('[Patient Details] Database connection closed');
            } catch (closeErr) {
                console.error('❌ Error closing connection:', closeErr);
            }
        }
    }
};

/**
 * Get Valid Test Codes
 * Returns 'ALL' plus every individual test code.
 */
exports.getTestCodes = (req, res) => {
    res.json({
        success: true,
        data: ['ALL', ...ALL_MNEMONICS],
        total: ALL_MNEMONICS.length + 1,
        timestamp: new Date().toISOString()
    });
};