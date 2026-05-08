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