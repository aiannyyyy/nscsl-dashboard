const oracledb = require("oracledb");

/**
 * Unsatisfactory mnemonics
 */
const UNSAT_MNEMONICS = `
'UD','ODC','NE','INS',
'E109','E108','E107','E103','E102','E101','E100','DE'
`;

const ALLOWED_PROVINCES = ['BATANGAS', 'CAVITE', 'LAGUNA', 'RIZAL', 'QUEZON'];

// =====================================================
// TOP UNSATISFACTORY FACILITIES (BY COUNT)
// =====================================================
exports.topUnsatisfactory = async (req, res) => {
  let connection;

  try {
    const { from, to, province } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        error: "Missing required query parameters: from, to"
      });
    }

    const oraclePool = req.app.locals.oracleDb;
    if (!oraclePool) {
      return res.status(500).json({
        error: "Oracle connection pool is not initialized"
      });
    }

    connection = await oraclePool.getConnection();

    // ================= BUILD PROVINCE FILTER =================
    let provinceFilter = '';
    const params = { date_from: from, date_to: to };

    if (province && province !== 'all') {
      // Specific province selected - use TRIM to handle trailing spaces
      provinceFilter = `AND UPPER(TRIM(RPA."COUNTY")) = UPPER(:province)`;
      params.province = province;
    } else {
      // All provinces - filter to the 5 allowed provinces - use TRIM
      const provinceList = ALLOWED_PROVINCES.map(p => `'${p}'`).join(',');
      provinceFilter = `AND UPPER(TRIM(RPA."COUNTY")) IN (${provinceList})`;
    }

    const sql = `
      WITH COMBINED AS (
        SELECT
          RPA."DESCR1" AS facility_name,
          RPA."COUNTY" AS province,
          SDA."LABNO"
        FROM "PHMSDS"."DISORDER_ARCHIVE" DA
        JOIN "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" SDA
          ON DA."LABNO" = SDA."LABNO"
        JOIN "PHMSDS"."REF_PROVIDER_ADDRESS" RPA
          ON SDA."SUBMID" = RPA."PROVIDERID"
        WHERE SDA."DTRECV" BETWEEN
              TO_DATE(:date_from,'YYYY-MM-DD HH24:MI:SS')
          AND TO_DATE(:date_to,'YYYY-MM-DD HH24:MI:SS')
          AND DA."MNEMONIC" IN (${UNSAT_MNEMONICS})
          AND RPA."ADRS_TYPE" = '1'
          AND SDA."LABNO" NOT LIKE '_______8%'
          ${provinceFilter}

        UNION ALL

        SELECT
          RPA."DESCR1" AS facility_name,
          RPA."COUNTY" AS province,
          SDA."LABNO"
        FROM "PHMSDS"."RESULT_MASTER" RA
        JOIN "PHMSDS"."SAMPLE_DEMOG_MASTER" SDA
          ON RA."LABNO" = SDA."LABNO"
        JOIN "PHMSDS"."REF_PROVIDER_ADDRESS" RPA
          ON SDA."SUBMID" = RPA."PROVIDERID"
        WHERE SDA."DTRECV" BETWEEN
              TO_DATE(:date_from,'YYYY-MM-DD HH24:MI:SS')
          AND TO_DATE(:date_to,'YYYY-MM-DD HH24:MI:SS')
          AND RA."MNEMONIC" IN (${UNSAT_MNEMONICS})
          AND RPA."ADRS_TYPE" = '1'
          AND SDA."LABNO" NOT LIKE '_______8%'
          ${provinceFilter}
      )
      SELECT
        facility_name,
        province,
        COUNT(DISTINCT LABNO) AS unsatisfactory_count
      FROM COMBINED
      GROUP BY facility_name, province
      ORDER BY unsatisfactory_count DESC
    `;

    const result = await connection.execute(
      sql,
      params,
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        maxRows: 0,
        fetchArraySize: 1000
      }
    );

    res.json(result.rows);

  } catch (err) {
    console.error("❌ topUnsatisfactory error:", err);
    res.status(500).json({
      error: "Database error",
      details: err.message
    });
  } finally {
    if (connection) await connection.close();
  }
};


/**
 * =====================================================
 * UNSATISFACTORY DETAILS (PER FACILITY)
 * =====================================================
 */
exports.detailsUnsatisfactory = async (req, res) => {
  let connection;

  try {
    const { from, to, facility_name } = req.query;

    // ================================
    // Validation
    // ================================
    if (!from || !to || !facility_name) {
      return res.status(400).json({
        error: "Missing required parameters: from, to, facility_name",
      });
    }

    // Oracle expects DATE only (YYYY-MM-DD)
    const fromDate = from.split(" ")[0];
    const toDate = to.split(" ")[0];

    console.log("🔍 detailsUnsatisfactory", {
      from: fromDate,
      to: toDate,
      facility_name,
    });

    // ================================
    // Get Oracle connection
    // ================================
    const oraclePool = req.app.locals.oracleDb;
    if (!oraclePool) {
      return res.status(500).json({
        error: "Oracle connection pool not initialized",
      });
    }

    connection = await oraclePool.getConnection();

    // ================================
    // SQL (UNCHANGED)
    // ================================
    const sql = `
        WITH COMBINED AS (
            -- DISORDER_ARCHIVE
            SELECT
                SDA."LABNO",
                SDA."FNAME",
                SDA."LNAME",
                RPA."DESCR1" AS facility_name,
                RPA."COUNTY" AS province,
                LDR."DESCR1" AS test_result
            FROM "PHMSDS"."DISORDER_ARCHIVE" DA
            JOIN "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" SDA
                ON DA."LABNO" = SDA."LABNO"
            JOIN "PHMSDS"."REF_PROVIDER_ADDRESS" RPA
                ON SDA."SUBMID" = RPA."PROVIDERID"
            JOIN "PHMSDS"."LIB_DISORDER_RESULT" LDR
                ON DA."MNEMONIC" = LDR."MNEMONIC"
            WHERE SDA."DTRECV" BETWEEN TO_DATE(:date_from,'YYYY-MM-DD') AND TO_DATE(:date_to,'YYYY-MM-DD')
              AND DA."MNEMONIC" IN ('UD','ODC','NE','INS','E109','E108','E107','E103','E102','E101','E100','DE')
              AND RPA."ADRS_TYPE" = '1'
              AND SDA."SPECTYPE" IN ('2','3','4','20','87')
              AND SDA."LABNO" NOT LIKE '_______8%'

            UNION ALL

            -- RESULT_ARCHIVE
            SELECT
                SDA."LABNO",
                SDA."FNAME",
                SDA."LNAME",
                RPA."DESCR1" AS facility_name,
                RPA."COUNTY" AS province,
                LDR."DESCR1" AS test_result
            FROM "PHMSDS"."RESULT_ARCHIVE" RA
            JOIN "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" SDA
                ON RA."LABNO" = SDA."LABNO"
            JOIN "PHMSDS"."REF_PROVIDER_ADDRESS" RPA
                ON SDA."SUBMID" = RPA."PROVIDERID"
            JOIN "PHMSDS"."LIB_DISORDER_RESULT" LDR
                ON RA."MNEMONIC" = LDR."MNEMONIC"
            WHERE SDA."DTRECV" BETWEEN TO_DATE(:date_from,'YYYY-MM-DD') AND TO_DATE(:date_to,'YYYY-MM-DD')
              AND RA."MNEMONIC" IN ('UD','ODC','NE','INS','E109','E108','E107','E103','E102','E101','E100','DE')
              AND RPA."ADRS_TYPE" = '1'
              AND SDA."SPECTYPE" IN ('2','3','4','20','87')
              AND SDA."LABNO" NOT LIKE '_______8%'
        )
        SELECT 
            LABNO,
            MIN(FNAME) AS first_name,
            MIN(LNAME) AS last_name,
            MIN(test_result) AS test_result,
            MIN(facility_name) AS facility_name,
            MIN(province) AS province
        FROM COMBINED
        WHERE UPPER(facility_name) = UPPER(:facility_name)
        GROUP BY LABNO
        ORDER BY LABNO
    `;

    // ================================
    // Execute
    // ================================
    const result = await connection.execute(
      sql,
      {
        date_from: fromDate,
        date_to: toDate,
        facility_name,
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log(
      `✅ detailsUnsatisfactory rows: ${result.rows?.length || 0}`
    );

    res.json(result.rows || []);

  } catch (err) {
    console.error("❌ detailsUnsatisfactory error:", err);

    res.status(500).json({
      error: "Database error",
      details: err.message,
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeErr) {
        console.error("⚠️ Failed to close connection:", closeErr);
      }
    }
  }
};


/**
 * =====================================================
 * TOTAL SAMPLES (PER FACILITY)
 * =====================================================
 */
exports.totalSamples = async (req, res) => {
    let connection;

    try {
        const { from, to, facility_name } = req.query;

        if (!from || !to || !facility_name) {
            return res.status(400).json({
                error: "Missing required parameters: from, to, facility_name"
            });
        }

        const oraclePool = req.app.locals.oracleDb;
        connection = await oraclePool.getConnection();

        const sql = `
            SELECT COUNT(DISTINCT SDA."LABNO") AS total_samples
            FROM "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" SDA
            JOIN "PHMSDS"."REF_PROVIDER_ADDRESS" RPA
                ON SDA."SUBMID" = RPA."PROVIDERID"
            WHERE SDA."DTRECV" BETWEEN
                    TO_DATE(:date_from,'YYYY-MM-DD HH24:MI:SS')
                AND TO_DATE(:date_to,'YYYY-MM-DD HH24:MI:SS')
              AND RPA."DESCR1" = :facility_name
        `;

        const result = await connection.execute(
            sql,
            {
                date_from: from,
                date_to: to,
                facility_name
            },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json(result.rows[0]);

    } catch (err) {
        console.error("❌ totalSamples error:", err);
        res.status(500).json({
            error: "Database error",
            details: err.message
        });
    } finally {
        if (connection) await connection.close();
    }
};

/**
 * =====================================================
 * FULL PATIENT LIST (PER FACILITY)
 * =====================================================
 */
exports.fullPatient = async (req, res) => {
    let connection;

    try {
        const { from, to, facility_name } = req.query;

        if (!from || !to || !facility_name) {
            return res.status(400).json({
                error: "Missing required parameters: from, to, facility_name"
            });
        }

        const oraclePool = req.app.locals.oracleDb;
        if (!oraclePool) {
            return res.status(500).json({
                error: "Oracle connection pool is not initialized"
            });
        }

        connection = await oraclePool.getConnection();

        const fromDate = from.split(" ")[0];
        const toDate = to.split(" ")[0];

        const sql = `
            WITH COMBINED AS (
                -- DISORDER_ARCHIVE
                SELECT
                    SDA."LABNO",
                    SDA."FNAME",
                    SDA."LNAME",
                    RPA."DESCR1" AS facility_name,
                    RPA."COUNTY" AS province,
                    LDR."DESCR1" AS test_result
                FROM "PHMSDS"."DISORDER_ARCHIVE" DA
                JOIN "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" SDA
                    ON DA."LABNO" = SDA."LABNO"
                JOIN "PHMSDS"."REF_PROVIDER_ADDRESS" RPA
                    ON SDA."SUBMID" = RPA."PROVIDERID"
                JOIN "PHMSDS"."LIB_DISORDER_RESULT" LDR
                    ON DA."MNEMONIC" = LDR."MNEMONIC"
                WHERE SDA."DTRECV" BETWEEN
                        TO_DATE(:date_from,'YYYY-MM-DD')
                    AND TO_DATE(:date_to,'YYYY-MM-DD')
                  AND RPA."ADRS_TYPE" = '1'
                  AND SDA."SPECTYPE" IN ('2','3','4','20','87')
                  AND SDA."LABNO" NOT LIKE '_______8%'

                UNION ALL

                -- RESULT_ARCHIVE
                SELECT
                    SDA."LABNO",
                    SDA."FNAME",
                    SDA."LNAME",
                    RPA."DESCR1" AS facility_name,
                    RPA."COUNTY" AS province,
                    LDR."DESCR1" AS test_result
                FROM "PHMSDS"."RESULT_MASTER" RA
                JOIN "PHMSDS"."SAMPLE_DEMOG_MASTER" SDA
                    ON RA."LABNO" = SDA."LABNO"
                JOIN "PHMSDS"."REF_PROVIDER_ADDRESS" RPA
                    ON SDA."SUBMID" = RPA."PROVIDERID"
                JOIN "PHMSDS"."LIB_DISORDER_RESULT" LDR
                    ON RA."MNEMONIC" = LDR."MNEMONIC"
                WHERE SDA."DTRECV" BETWEEN
                        TO_DATE(:date_from,'YYYY-MM-DD')
                    AND TO_DATE(:date_to,'YYYY-MM-DD')
                  AND RPA."ADRS_TYPE" = '1'
                  AND SDA."SPECTYPE" IN ('2','3','4','20','87')
                  AND SDA."LABNO" NOT LIKE '_______8%'
            )
            SELECT 
                LABNO,
                MIN(FNAME) AS first_name,
                MIN(LNAME) AS last_name,
                MIN(test_result) AS test_result,
                MIN(facility_name) AS facility_name,
                MIN(province) AS province
            FROM COMBINED
            WHERE UPPER(facility_name) = UPPER(:facility_name)
            GROUP BY LABNO
            ORDER BY LABNO
        `;

        const result = await connection.execute(
            sql,
            {
                date_from: fromDate,
                date_to: toDate,
                facility_name
            },
            {
                outFormat: oracledb.OUT_FORMAT_OBJECT
            }
        );

        res.json({
            total: result.rows.length,
            rows: result.rows
        });

    } catch (err) {
        console.error("❌ fullPatient error:", err);
        res.status(500).json({
            error: "Database error",
            details: err.message
        });
    } finally {
        if (connection) await connection.close();
    }
};

// =====================================================
// UNSATISFACTORY RATE (%) - FIXED VERSION
// =====================================================
exports.unsatRate = async (req, res) => {
  let connection;

  try {
    const oraclePool = req.app.locals.oracleDb;
    if (!oraclePool) {
      return res.status(500).json({
        error: "Oracle connection pool is not initialized"
      });
    }

    const { from, to, facility_name, province } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        error: "Missing required query parameters: from, to"
      });
    }

    connection = await oraclePool.getConnection();

    const fromDateOnly = from.split(" ")[0];
    const toDateOnly = to.split(" ")[0];

    // ================= CALCULATE THRESHOLD =================
    const fromDate = new Date(fromDateOnly);
    const toDate = new Date(toDateOnly);
    const diffTime = Math.abs(toDate - fromDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Calculate months (approximate)
    const diffMonths = Math.round(diffDays / 30);
    
    // Determine threshold based on date range
    let sampleThreshold;
    if (diffMonths <= 1) {
      sampleThreshold = 50;
    } else if (diffMonths <= 3) {
      sampleThreshold = 150;
    } else if (diffMonths <= 6) {
      sampleThreshold = 300;
    } else {
      sampleThreshold = 600;
    }

    console.log(`📊 Date range: ${diffDays} days (~${diffMonths} months), threshold: ${sampleThreshold}`);

    // ================= BUILD PROVINCE FILTER =================
    let provinceFilter = '';
    const unsatParams = { date_from: from, date_to: to };
    const totalParams = { 
      date_from: fromDateOnly, 
      date_to: toDateOnly
    };

    if (province && province !== 'all') {
      // Specific province selected - use TRIM to handle trailing spaces
      provinceFilter = `AND UPPER(TRIM(RPA."COUNTY")) = UPPER(:province)`;
      unsatParams.province = province;
      totalParams.province = province;
    } else {
      // All provinces - filter to the 5 allowed provinces - use TRIM
      const provinceList = ALLOWED_PROVINCES.map(p => `'${p}'`).join(',');
      provinceFilter = `AND UPPER(TRIM(RPA."COUNTY")) IN (${provinceList})`;
    }

    if (facility_name) {
      unsatParams.facility_name = facility_name;
      totalParams.facility_name = facility_name;
    }

    /* ================= UNSAT COUNT ================= */
    const unsatSql = `
      WITH COMBINED AS (
        SELECT
          RPA."DESCR1" AS facility_name,
          RPA."COUNTY" AS province,
          SDA."LABNO"
        FROM "PHMSDS"."DISORDER_ARCHIVE" DA
        JOIN "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" SDA
          ON DA."LABNO" = SDA."LABNO"
        JOIN "PHMSDS"."REF_PROVIDER_ADDRESS" RPA
          ON SDA."SUBMID" = RPA."PROVIDERID"
        WHERE SDA."DTRECV" BETWEEN
              TO_DATE(:date_from,'YYYY-MM-DD HH24:MI:SS')
          AND TO_DATE(:date_to,'YYYY-MM-DD HH24:MI:SS')
          AND DA."MNEMONIC" IN (${UNSAT_MNEMONICS})
          AND RPA."ADRS_TYPE" = '1'
          AND SDA."LABNO" NOT LIKE '_______8%'
          ${provinceFilter}
          ${facility_name ? `AND UPPER(RPA."DESCR1") = UPPER(:facility_name)` : ""}

        UNION ALL

        SELECT
          RPA."DESCR1" AS facility_name,
          RPA."COUNTY" AS province,
          SDA."LABNO"
        FROM "PHMSDS"."RESULT_ARCHIVE" RA
        JOIN "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" SDA
          ON RA."LABNO" = SDA."LABNO"
        JOIN "PHMSDS"."REF_PROVIDER_ADDRESS" RPA
          ON SDA."SUBMID" = RPA."PROVIDERID"
        WHERE SDA."DTRECV" BETWEEN
              TO_DATE(:date_from,'YYYY-MM-DD HH24:MI:SS')
          AND TO_DATE(:date_to,'YYYY-MM-DD HH24:MI:SS')
          AND RA."MNEMONIC" IN (${UNSAT_MNEMONICS})
          AND RPA."ADRS_TYPE" = '1'
          AND SDA."LABNO" NOT LIKE '_______8%'
          ${provinceFilter}
          ${facility_name ? `AND UPPER(RPA."DESCR1") = UPPER(:facility_name)` : ""}
      )
      SELECT
        facility_name,
        province,
        COUNT(DISTINCT LABNO) AS unsatisfactory_count
      FROM COMBINED
      GROUP BY facility_name, province
    `;

    /* ================= TOTAL SAMPLES (NO THRESHOLD IN SQL) ================= */
    const totalSql = `
      WITH COMBINED AS (
        SELECT
          SDA."LABNO",
          RPA."DESCR1" AS facility_name,
          RPA."COUNTY" AS province
        FROM "PHMSDS"."DISORDER_ARCHIVE" DA
        JOIN "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" SDA
          ON DA."LABNO" = SDA."LABNO"
        JOIN "PHMSDS"."REF_PROVIDER_ADDRESS" RPA
          ON SDA."SUBMID" = RPA."PROVIDERID"
        WHERE SDA."DTRECV" BETWEEN
              TO_DATE(:date_from,'YYYY-MM-DD')
          AND TO_DATE(:date_to,'YYYY-MM-DD')
          AND RPA."ADRS_TYPE" = '1'
          AND SDA."SPECTYPE" IN ('2','3','4','20','87')
          AND SDA."LABNO" NOT LIKE '_______8%'
          ${provinceFilter}
          ${facility_name ? `AND UPPER(RPA."DESCR1") = UPPER(:facility_name)` : ""}

        UNION ALL

        SELECT
          SDA."LABNO",
          RPA."DESCR1" AS facility_name,
          RPA."COUNTY" AS province
        FROM "PHMSDS"."RESULT_ARCHIVE" RA
        JOIN "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" SDA
          ON RA."LABNO" = SDA."LABNO"
        JOIN "PHMSDS"."REF_PROVIDER_ADDRESS" RPA
          ON SDA."SUBMID" = RPA."PROVIDERID"
        WHERE SDA."DTRECV" BETWEEN
              TO_DATE(:date_from,'YYYY-MM-DD')
          AND TO_DATE(:date_to,'YYYY-MM-DD')
          AND RPA."ADRS_TYPE" = '1'
          AND SDA."SPECTYPE" IN ('2','3','4','20','87')
          AND SDA."LABNO" NOT LIKE '_______8%'
          ${provinceFilter}
          ${facility_name ? `AND UPPER(RPA."DESCR1") = UPPER(:facility_name)` : ""}
      )
      SELECT
        facility_name,
        province,
        COUNT(DISTINCT LABNO) AS total_samples
      FROM COMBINED
      GROUP BY facility_name, province
    `;

    const unsatResult = await connection.execute(
      unsatSql,
      unsatParams,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const totalResult = await connection.execute(
      totalSql,
      totalParams,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    /* ================= MERGE ================= */
    const totalMap = {};
    totalResult.rows.forEach(r => {
      totalMap[`${r.FACILITY_NAME}_${r.PROVINCE}`] = r.TOTAL_SAMPLES;
    });

    const data = unsatResult.rows.map(r => {
      const total = totalMap[`${r.FACILITY_NAME}_${r.PROVINCE}`] || 0;
      const unsat = r.UNSATISFACTORY_COUNT;

      return {
        facility_name: r.FACILITY_NAME,
        province: r.PROVINCE,
        unsatisfactory_count: unsat,
        total_samples: total,
        unsat_rate: total ? Number(((unsat / total) * 100).toFixed(2)) : 0
      };
    });

    /* ================= FILTER BY THRESHOLD AFTER MERGE ================= */
    const filteredData = data.filter(d => d.total_samples >= sampleThreshold);
    filteredData.sort((a, b) => b.unsat_rate - a.unsat_rate);

    console.log(`✅ Total facilities before filter: ${data.length}, after filter: ${filteredData.length} (threshold: ${sampleThreshold})`);

    res.json(filteredData);

  } catch (err) {
    console.error("❌ unsatRate error:", err);
    res.status(500).json({
      error: "Database error",
      details: err.message
    });
  } finally {
    if (connection) await connection.close();
  }
};

/**
 * =====================================================
 * UNSATISFACTORY BY PROVINCE (COMPARE TWO PERIODS)
 * =====================================================
 */
exports.unsatProvince = async (req, res) => {
  let connection;

  try {
    const {
      dateFrom1,
      dateTo1,
      dateFrom2,
      dateTo2
    } = req.query;

    // ================= VALIDATION =================
    if (!dateFrom1 || !dateTo1 || !dateFrom2 || !dateTo2) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required parameters: dateFrom1, dateTo1, dateFrom2, dateTo2"
      });
    }

    console.log('📅 Received dates:', { dateFrom1, dateTo1, dateFrom2, dateTo2 });

    // ================= GET POOL =================
    const oraclePool = req.app.locals.oracleDb;
    if (!oraclePool) {
      return res.status(500).json({
        success: false,
        error: "Oracle connection pool is not initialized"
      });
    }

    // ================= GET CONNECTION =================
    connection = await oraclePool.getConnection();

    // ================= SQL - UPDATED TO HANDLE DATETIME =================
    const sql = `
      WITH COMBINED AS (
        SELECT
          SDA."LABNO" AS LABNO,
          SDA."DTRECV" AS DTRECV,
          RPA."COUNTY" AS COUNTY,
          '1' AS PERIOD
        FROM "PHMSDS"."DISORDER_ARCHIVE" DA
        JOIN "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" SDA
          ON DA."LABNO" = SDA."LABNO"
        JOIN "PHMSDS"."REF_PROVIDER_ADDRESS" RPA
          ON SDA."SUBMID" = RPA."PROVIDERID"
        WHERE SUBSTR(SDA."LABNO", 8, 1) <> '8'
          AND DA."MNEMONIC" IN
            ('UD','ODC','E109','INS', 'NE','E108','E107','E103','E102','E101','E100','DE', 'CONT')
          AND RPA."ADRS_TYPE" = '1'
          AND SDA."DTRECV" BETWEEN TO_DATE(:dateFrom1,'YYYY-MM-DD HH24:MI:SS')
                              AND TO_DATE(:dateTo1,'YYYY-MM-DD HH24:MI:SS')
          AND SDA."SPECTYPE" IN ('20','87','2','3','4')

        UNION ALL

        SELECT
          SDA."LABNO",
          SDA."DTRECV",
          RPA."COUNTY",
          '1'
        FROM "PHMSDS"."RESULT_ARCHIVE" RA
        JOIN "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" SDA
          ON RA."LABNO" = SDA."LABNO"
        JOIN "PHMSDS"."REF_PROVIDER_ADDRESS" RPA
          ON SDA."SUBMID" = RPA."PROVIDERID"
        WHERE SUBSTR(SDA."LABNO", 8, 1) <> '8'
          AND RA."MNEMONIC" IN
            ('UD','ODC','E109','INS', 'NE','E108','E107','E103','E102','E101','E100','DE', 'CONT')
          AND RPA."ADRS_TYPE" = '1'
          AND SDA."DTRECV" BETWEEN TO_DATE(:dateFrom1,'YYYY-MM-DD HH24:MI:SS')
                              AND TO_DATE(:dateTo1,'YYYY-MM-DD HH24:MI:SS')
          AND SDA."SPECTYPE" IN ('20','87','2','3','4')

        UNION ALL

        SELECT
          SDA."LABNO",
          SDA."DTRECV",
          RPA."COUNTY",
          '2'
        FROM "PHMSDS"."DISORDER_ARCHIVE" DA
        JOIN "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" SDA
          ON DA."LABNO" = SDA."LABNO"
        JOIN "PHMSDS"."REF_PROVIDER_ADDRESS" RPA
          ON SDA."SUBMID" = RPA."PROVIDERID"
        WHERE SUBSTR(SDA."LABNO", 8, 1) <> '8'
          AND DA."MNEMONIC" IN
            ('UD','ODC','E109','INS', 'NE','E108','E107','E103','E102','E101','E100', 'DE', 'CONT')
          AND RPA."ADRS_TYPE" = '1'
          AND SDA."DTRECV" BETWEEN TO_DATE(:dateFrom2,'YYYY-MM-DD HH24:MI:SS')
                              AND TO_DATE(:dateTo2,'YYYY-MM-DD HH24:MI:SS')
          AND SDA."SPECTYPE" IN ('20','87')

        UNION ALL

        SELECT
          SDA."LABNO",
          SDA."DTRECV",
          RPA."COUNTY",
          '2'
        FROM "PHMSDS"."RESULT_ARCHIVE" RA
        JOIN "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" SDA
          ON RA."LABNO" = SDA."LABNO"
        JOIN "PHMSDS"."REF_PROVIDER_ADDRESS" RPA
          ON SDA."SUBMID" = RPA."PROVIDERID"
        WHERE SUBSTR(SDA."LABNO", 8, 1) <> '8'
          AND RA."MNEMONIC" IN
            ('UD','ODC','E109','INS', 'NE','E108','E107','E103','E102','E101','E100', 'DE', 'CONT')
          AND RPA."ADRS_TYPE" = '1'
          AND SDA."DTRECV" BETWEEN TO_DATE(:dateFrom2,'YYYY-MM-DD HH24:MI:SS')
                              AND TO_DATE(:dateTo2,'YYYY-MM-DD HH24:MI:SS')
          AND SDA."SPECTYPE" IN ('20','87')
      )
      SELECT
        COUNTY,
        COUNT(DISTINCT CASE WHEN PERIOD = '1' THEN LABNO END) AS TOTAL_DISTINCT_UNSAT_PERIOD1,
        COUNT(DISTINCT CASE WHEN PERIOD = '2' THEN LABNO END) AS TOTAL_DISTINCT_UNSAT_PERIOD2
      FROM COMBINED
      GROUP BY COUNTY
      ORDER BY COUNTY
    `;

    // ================= EXECUTE =================
    const result = await connection.execute(
      sql,
      {
        dateFrom1,
        dateTo1,
        dateFrom2,
        dateTo2
      },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchArraySize: 1000
      }
    );

    console.log(`✅ unsatProvince returned ${result.rows.length} rows`);

    // ================= RESPONSE =================
    res.json({
      success: true,
      rows: result.rows,
      rowCount: result.rows.length
    });

  } catch (err) {
    console.error("❌ unsatProvince error:", err);
    res.status(500).json({
      success: false,
      error: "Database error",
      details: err.message
    });
  } finally {
    if (connection) await connection.close();
  }
};