const oracledb = require("oracledb");
const { database } = require("../../config");
const { sendToUsersByPosition } = require("../../utils/notificationHelper");

const DB_TABLE = "test_nscslcom_nscsl_dashboard.logbook_endorsement";

const FIELD_LIMIT = {
  labno: 11,
  patient_name: 50,
  facility_code: 10,   // raised from 4 — submid from Oracle can be longer
  category: 50,
  mnemonic: 80,
  analytes: 4000,
  values: 4000,
  analyst: 50,         // raised from 20 — full names can exceed 20 chars
  person: 50,          // raised from 20 — tc/qao/fun names
};

/** Truncate to DB-safe length. Trims whitespace first. */
const toShortText = (value, max) => String(value || "").trim().slice(0, max);

// ─── Oracle lookup ────────────────────────────────────────────────────────────
const getPatientDetails = async (req, res) => {
  let connection;

  try {
    const oraclePool = req.app.locals.oracleDb;
    if (!oraclePool) {
      return res.status(500).json({
        success: false,
        error: "Oracle connection pool is not initialized",
      });
    }

    const { labno } = req.query;
    if (!labno || !String(labno).trim()) {
      return res.status(400).json({ success: false, error: "Lab Number is required" });
    }

    connection = await oraclePool.getConnection();

    const query = `
      SELECT DISTINCT
        SDA."LABNO",
        SDA."FNAME",
        SDA."LNAME",
        SDA."SUBMID",
        DA."MNEMONIC",
        LT."TESTNAME",
        DAA."VALUE",
        LT."TESTCODE"
      FROM "PHMSDS"."RESULT_ARCHIVE" RA
      INNER JOIN "PHMSDS"."DISORDER_AVG_ARCHIVE" DAA
        ON RA."LABNO" = DAA."LABNO"
        AND RA."TESTCODE" = DAA."TESTCODE"
      INNER JOIN "PHMSDS"."LIB_TESTCODE" LT
        ON RA."TESTCODE" = LT."TESTCODE"
      INNER JOIN "PHMSDS"."DISORDER_ARCHIVE" DA
        ON DAA."LABNO" = DA."LABNO"
        AND DAA."REPTCODE" = DA."REPTCODE"
      INNER JOIN "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" SDA
        ON DA."LABNO" = SDA."LABNO"
      WHERE RA."LABNO" = :labno
        AND DA."MNEMONIC" IN (
          'TSH1','TSH2','OHP1','OHP2','OHP3',
          'GMU','GN1','GC1','GN2','GC2','GMVC','GNC','GCC',
          'GALP','PHEMS1','PHEMS2','LEUMS1','LEUMS2',
          'METMS1','METMS2','SAMS2','TYRMS1','TYRMS2',
          'CITMS1','CITMS2','CUDMS1','CUDMS2',
          'CP1MS1','CP1MS2','CP2MS1','CP2MS2',
          'GA2MS1','GA2MS2','MCAMS1','MCAMS2',
          'VLCMS1','VLCMS2','LCHMS1','LCHMS2',
          'MMAMS1','MMAMS2','MDMS1','MDMS2',
          'BKTMS1','BKTMS2','IVAMS1','IVAMS2',
          'GA1MS1','GA1MS2','STPN','TPN1',
          'BTND1','BTND2','IRT1','IRT2','IRT3',
          'BARTS','FE','F','FAEB','FAES','FEA',
          'FS','FDA','BTS1'
        )
      ORDER BY SDA."LABNO" ASC, LT."TESTCODE" ASC
    `;

    const result = await connection.execute(
      query,
      { labno: String(labno).trim() },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No patient details found for this lab number",
      });
    }

    const firstRow = result.rows[0];
    const tests = result.rows.map((row) => ({
      mnemonic: row.MNEMONIC,
      testCode: row.TESTCODE,
      testName: row.TESTNAME,
      value: row.VALUE,
    }));

    return res.json({
      success: true,
      data: {
        labno: firstRow.LABNO,
        firstName: firstRow.FNAME,
        lastName: firstRow.LNAME,
        submid: firstRow.SUBMID,
        tests,
      },
    });
  } catch (error) {
    console.error("[logbookEndorsementController] getPatientDetails error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeErr) {
        console.error("[logbookEndorsementController] connection close error:", closeErr);
      }
    }
  }
};

// ─── Get all ──────────────────────────────────────────────────────────────────
const getAllLogbookEndorsements = async (_req, res) => {
  try {
    const [rows] = await database.mysqlPool.query(
      `SELECT
         id,
         date_input,
         labno,
         patient_name,
         facility_code,
         category,
         mnemonic,
         analytes,
         \`values\`,
         analyst,
         analyst_date,
         tc,
         tc_date,
         qao,
         qao_date,
         fun,
         fun_date,
         date_modified,
         modified_by
       FROM ${DB_TABLE}
       ORDER BY date_input DESC, id DESC`
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("[logbookEndorsementController] getAllLogbookEndorsements error:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch logbook endorsements" });
  }
};

// ─── Create ───────────────────────────────────────────────────────────────────
const createLogbookEndorsement = async (req, res) => {
  try {
    const {
      labno,
      patient_name,
      facility_code,
      category,
      mnemonic,
      analytes,
      values,
      analyst,
      tc,
      tc_date,
      qao,
      qao_date,
      fun,
      fun_date,
    } = req.body;

    // Validate required fields
    const missing = [];
    if (!labno)         missing.push("labno");
    if (!patient_name)  missing.push("patient_name");
    if (!facility_code) missing.push("facility_code");
    if (!category)      missing.push("category");
    if (!mnemonic)      missing.push("mnemonic");
    if (!analytes)      missing.push("analytes");
    if (!values)        missing.push("values");
    if (!analyst)       missing.push("analyst");

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    const now = new Date();

    const params = [
      now,
      toShortText(labno,         FIELD_LIMIT.labno),
      toShortText(patient_name,  FIELD_LIMIT.patient_name),
      toShortText(facility_code, FIELD_LIMIT.facility_code),
      toShortText(category,      FIELD_LIMIT.category),
      toShortText(mnemonic,      FIELD_LIMIT.mnemonic),
      toShortText(analytes,      FIELD_LIMIT.analytes),
      toShortText(values,        FIELD_LIMIT.values),
      toShortText(analyst,       FIELD_LIMIT.analyst),
      now,                                                           // analyst_date
      tc  ? toShortText(tc,  FIELD_LIMIT.person) : null,
      tc_date  || null,
      qao ? toShortText(qao, FIELD_LIMIT.person) : null,
      qao_date || null,
      fun ? toShortText(fun, FIELD_LIMIT.person) : null,
      fun_date || null,
    ];

    // Log the payload in dev so you can see exactly what hits the DB
    if (process.env.NODE_ENV === "development") {
      console.log("[createLogbookEndorsement] INSERT params:", params);
    }

    const [result] = await database.mysqlPool.query(
      `INSERT INTO ${DB_TABLE}
       (date_input, labno, patient_name, facility_code, category, mnemonic,
        analytes, \`values\`, analyst, analyst_date,
        tc, tc_date, qao, qao_date, fun, fun_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params
    );

    const createdByName =
      req.user?.name || toShortText(analyst, FIELD_LIMIT.analyst) || "System";
    const labnoDisp = toShortText(labno, FIELD_LIMIT.labno);
    const patientDisp = toShortText(patient_name, FIELD_LIMIT.patient_name);
    const categoryDisp = toShortText(category, FIELD_LIMIT.category);

    void sendToUsersByPosition({
      positions: ["Team Captain"],
      type: "logbook_endorsement",
      title: "New logbook endorsement to follow up",
      message: `Lab ${labnoDisp} — ${patientDisp}. Category: ${categoryDisp}.`,
      link: "/dashboard/laboratory/endorsement-to-followup",
      reference_id: result.insertId,
      reference_type: "logbook_endorsement",
      created_by: createdByName,
    }).catch((notifyErr) => {
      console.error(
        "[createLogbookEndorsement] Team Captain notification error:",
        notifyErr?.message || notifyErr
      );
    });

    return res.status(201).json({
      success: true,
      message: "Logbook endorsement created successfully",
      id: result.insertId,
    });
  } catch (error) {
    // Log the full MySQL error so you can see the exact column/constraint that failed
    console.error("[logbookEndorsementController] createLogbookEndorsement error:", {
      message: error.message,
      code:    error.code,       // e.g. ER_DATA_TOO_LONG, ER_NO_DEFAULT_FOR_FIELD
      sqlMessage: error.sqlMessage,
      sql:     error.sql,
    });

    return res.status(500).json({
      success: false,
      error: "Failed to create logbook endorsement",
      // Always return the DB error message so the frontend can show it
      message: error.sqlMessage || error.message,
    });
  }
};

// ─── Update ───────────────────────────────────────────────────────────────────
const updateLogbookEndorsement = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      category,
      mnemonic,
      analytes,
      values,
      tc,
      tc_date,
      qao,
      qao_date,
      fun,
      fun_date,
      modified_by,
    } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, error: "id is required" });
    }

    const now = new Date();
    const [result] = await database.mysqlPool.query(
      `UPDATE ${DB_TABLE}
       SET category     = ?,
           mnemonic     = ?,
           analytes     = ?,
           \`values\`   = ?,
           tc           = ?,
           tc_date      = ?,
           qao          = ?,
           qao_date     = ?,
           fun          = ?,
           fun_date     = ?,
           modified_by  = ?,
           date_modified = ?
       WHERE id = ?`,
      [
        toShortText(category, FIELD_LIMIT.category),
        toShortText(mnemonic, FIELD_LIMIT.mnemonic),
        toShortText(analytes, FIELD_LIMIT.analytes),
        toShortText(values,   FIELD_LIMIT.values),
        tc  ? toShortText(tc,  FIELD_LIMIT.person) : null,
        tc_date  || null,
        qao ? toShortText(qao, FIELD_LIMIT.person) : null,
        qao_date || null,
        fun ? toShortText(fun, FIELD_LIMIT.person) : null,
        fun_date || null,
        modified_by ? toShortText(modified_by, FIELD_LIMIT.person) : "SYSTEM",
        now,
        id,
      ]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, error: "Record not found" });
    }

    return res.json({ success: true, message: "Logbook endorsement updated successfully" });
  } catch (error) {
    console.error("[logbookEndorsementController] updateLogbookEndorsement error:", {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
    });
    return res.status(500).json({
      success: false,
      error: "Failed to update logbook endorsement",
      message: error.sqlMessage || error.message,
    });
  }
};

// ─── Stats — count DISTINCT labno so multi-analyte rows count as one ─────────
const getCategoryStats = async (_req, res) => {
  try {
    const [rows] = await database.mysqlPool.query(
      `SELECT category, COUNT(DISTINCT labno) AS count
       FROM ${DB_TABLE}
       GROUP BY category
       ORDER BY count DESC`
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("[logbookEndorsementController] getCategoryStats error:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch category stats" });
  }
};

const getMnemonicStats = async (_req, res) => {
  try {
    const [rows] = await database.mysqlPool.query(
      `SELECT mnemonic, COUNT(DISTINCT labno) AS count
       FROM ${DB_TABLE}
       GROUP BY mnemonic
       ORDER BY count DESC
       LIMIT 10`
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("[logbookEndorsementController] getMnemonicStats error:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch mnemonic stats" });
  }
};

module.exports = {
  getPatientDetails,
  getAllLogbookEndorsements,
  createLogbookEndorsement,
  updateLogbookEndorsement,
  getCategoryStats,
  getMnemonicStats,
};