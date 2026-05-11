const oracledb = require('oracledb');

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
    'BTS1'
];

exports.getPatientResultTable = async (req, res) => {
    let connection;

    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({
                success: false,
                error: 'Query parameter "date" is required (YYYY-MM-DD).',
            });
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format. Use YYYY-MM-DD.',
            });
        }

        const startDate = `${date} 00:00:00`;
        const endDate   = `${date} 23:59:59`;

        /*
         * OracleDB thin driver only supports named binds (:name).
         * To avoid duplicate bind name conflicts across UNION ALL legs,
         * each leg gets its own suffixed bind names:
         *   Leg 1 (ARCHIVE): :m0_a, :m1_a ... :startDate_a, :endDate_a
         *   Leg 2 (MASTER):  :m0_b, :m1_b ... :startDate_b, :endDate_b
         */
        const buildLegBinds = (suffix) => {
            const binds = {};
            const placeholders = ALL_MNEMONICS.map((m, i) => {
                binds[`m${i}_${suffix}`] = m;
                return `:m${i}_${suffix}`;
            }).join(', ');
            binds[`startDate_${suffix}`] = startDate;
            binds[`endDate_${suffix}`]   = endDate;
            return { binds, placeholders };
        };

        const legA = buildLegBinds('a'); // ARCHIVE leg
        const legB = buildLegBinds('b'); // MASTER leg

        const allBinds = { ...legA.binds, ...legB.binds };

        const query = `
            SELECT
                sd."LABNO",
                sd."LNAME",
                sd."FNAME",
                sd."DTRECV",
                sd."SUBMID",
                sd."TWIN",
                LISTAGG(da."MNEMONIC", ', ')
                    WITHIN GROUP (ORDER BY da."MNEMONIC") AS "MNEMONICS"
            FROM
                "PHMSDS"."SAMPLE_DEMOG_ARCHIVE"  sd
            JOIN (
                SELECT DISTINCT "LABNO", "MNEMONIC"
                FROM "PHMSDS"."DISORDER_ARCHIVE"
            ) da ON sd."LABNO" = da."LABNO"
            WHERE
                da."MNEMONIC" IN (${legA.placeholders})
                AND sd."DTRECV" >= TO_DATE(:startDate_a, 'YYYY-MM-DD HH24:MI:SS')
                AND sd."DTRECV" <  TO_DATE(:endDate_a,   'YYYY-MM-DD HH24:MI:SS')
            GROUP BY
                sd."LABNO",
                sd."LNAME",
                sd."FNAME",
                sd."DTRECV",
                sd."SUBMID",
                sd."TWIN"

            UNION ALL

            SELECT
                sd."LABNO",
                sd."LNAME",
                sd."FNAME",
                sd."DTRECV",
                sd."SUBMID",
                sd."TWIN",
                LISTAGG(da."MNEMONIC", ', ')
                    WITHIN GROUP (ORDER BY da."MNEMONIC") AS "MNEMONICS"
            FROM
                "PHMSDS"."SAMPLE_DEMOG_MASTER"  sd
            JOIN (
                SELECT DISTINCT "LABNO", "MNEMONIC"
                FROM "PHMSDS"."DISORDER_MASTER"
            ) da ON sd."LABNO" = da."LABNO"
            WHERE
                da."MNEMONIC" IN (${legB.placeholders})
                AND sd."DTRECV" >= TO_DATE(:startDate_b, 'YYYY-MM-DD HH24:MI:SS')
                AND sd."DTRECV" <  TO_DATE(:endDate_b,   'YYYY-MM-DD HH24:MI:SS')
            GROUP BY
                sd."LABNO",
                sd."LNAME",
                sd."FNAME",
                sd."DTRECV",
                sd."SUBMID",
                sd."TWIN"

            ORDER BY 1 ASC
        `;

        connection = await oracledb.getConnection();

        const result = await connection.execute(
            query,
            allBinds,
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        return res.status(200).json({
            success: true,
            date,
            total: result.rows.length,
            data: result.rows,
        });

    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).json({
            success: false,
            error: 'Internal server error.',
            details: err.message,
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (closeErr) {
                console.error('Error closing connection:', closeErr);
            }
        }
    }
};

exports.getPatientDisorderResultTable = async (req, res) => {
    let connection;

    try {
        const { labno } = req.query;

        if (!labno) {
            return res.status(400).json({
                success: false,
                error: 'Query parameter "labno" is required.',
            });
        }

        const query = `
            SELECT
                ldg."MAILERNAME",
                ld."NAME",
                ra."RFLAG",
                sd."LABNO",
                sd."LNAME",
                sd."FNAME",
                ldr."DESCR1"
            FROM
                "PHMSDS"."LIB_DISORDER_GROUP"        ldg,
                "PHMSDS"."LIB_DISORDER"              ld,
                "PHMSDS"."REF_REPORTABLE_TESTCODES"  rtc,
                "PHMSDS"."RESULT_ARCHIVE"             ra,
                "PHMSDS"."DISORDER_AVG_ARCHIVE"       daa,
                "PHMSDS"."DISORDER_ARCHIVE"           da,
                "PHMSDS"."SAMPLE_DEMOG_ARCHIVE"       sd,
                "PHMSDS"."LIB_DISORDER_RESULT"        ldr
            WHERE
                ldg."GROUPID"        = ld."GROUPID"
                AND ld."REPORTABLEID"    = rtc."REPORTABLEID"
                AND rtc."TESTCODE"       = ra."TESTCODE"
                AND ra."LABNO"           = daa."LABNO"
                AND ra."TESTCODE"        = daa."TESTCODE"
                AND daa."LABNO"          = da."LABNO"
                AND daa."REPTCODE"       = da."REPTCODE"
                AND da."LABNO"           = sd."LABNO"
                AND da."MNEMONIC"        = ldr."MNEMONIC"
                AND da."REPTCODE"        = ldr."REPTCODE"
                AND ldg."MAILERNAME" NOT IN (
                    'Unsatisfactory',
                    'Thyroxine (T4)',
                    'Phenylketonuria (PKU)',
                    'Maple Syrup Urine Disease (MSUD)'
                )
                AND sd."LABNO" = :labno_a

            UNION ALL

            SELECT
                ldg."MAILERNAME",
                ld."NAME",
                rm."RFLAG",
                sd."LABNO",
                sd."LNAME",
                sd."FNAME",
                ldr."DESCR1"
            FROM
                "PHMSDS"."LIB_DISORDER_GROUP"        ldg,
                "PHMSDS"."LIB_DISORDER"              ld,
                "PHMSDS"."REF_REPORTABLE_TESTCODES"  rtc,
                "PHMSDS"."RESULT_MASTER"              rm,
                "PHMSDS"."DISORDER_AVG_MASTER"        dam,
                "PHMSDS"."DISORDER_MASTER"            dm,
                "PHMSDS"."SAMPLE_DEMOG_MASTER"        sd,
                "PHMSDS"."LIB_DISORDER_RESULT"        ldr
            WHERE
                ldg."GROUPID"        = ld."GROUPID"
                AND ld."REPORTABLEID"    = rtc."REPORTABLEID"
                AND rtc."TESTCODE"       = rm."TESTCODE"
                AND rm."LABNO"           = dam."LABNO"
                AND rm."TESTCODE"        = dam."TESTCODE"
                AND dam."LABNO"          = dm."LABNO"
                AND dam."REPTCODE"       = dm."REPTCODE"
                AND dm."LABNO"           = sd."LABNO"
                AND dm."MNEMONIC"        = ldr."MNEMONIC"
                AND dm."REPTCODE"        = ldr."REPTCODE"
                AND ldg."MAILERNAME" NOT IN (
                    'Unsatisfactory',
                    'Thyroxine (T4)',
                    'Phenylketonuria (PKU)',
                    'Maple Syrup Urine Disease (MSUD)'
                )
                AND sd."LABNO" = :labno_b

            ORDER BY
                "LABNO"      ASC,
                "MAILERNAME" ASC,
                "NAME"       ASC
        `;

        const binds = {
            labno_a: labno,
            labno_b: labno,
        };

        connection = await oracledb.getConnection();

        const result = await connection.execute(
            query,
            binds,
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const seen = new Set();
        const uniqueRows = result.rows.filter((row) => {
            const key = `${row.LABNO}|${row.MAILERNAME}|${row.NAME}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        // Group deduplicated rows by MAILERNAME
        const grouped = uniqueRows.reduce((acc, row) => {
            const group = row.MAILERNAME;
            if (!acc[group]) {
                acc[group] = {
                    MAILERNAME: group,
                    LABNO:      row.LABNO,
                    LNAME:      row.LNAME,
                    FNAME:      row.FNAME,
                    disorders:  [],
                };
            }
            acc[group].disorders.push({
                NAME:   row.NAME,
                RFLAG:  row.RFLAG,
                DESCR1: row.DESCR1,
            });
            return acc;
        }, {});

        const data = Object.values(grouped);

        return res.status(200).json({
            success: true,
            labno,
            total: data.length,
            data,
        });

    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).json({
            success: false,
            error: 'Internal server error.',
            details: err.message,
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (closeErr) {
                console.error('Error closing connection:', closeErr);
            }
        }
    }
};