const { database } = require("../../config");

const DB_TABLE = "test_nscslcom_nscsl_dashboard.logbook_endorsement";

const FIELD_LIMIT = {
  labno: 11,
  patient_name: 50,
  facility_code: 10,
  category: 50,
  mnemonic: 80,
  analytes: 4000,
  values: 4000,
  analyst: 50,
  person: 50,
};

/** Truncate to DB-safe length. Trims whitespace first. */
const toShortText = (value, max) => String(value || "").trim().slice(0, max);

// ─── List: FUN recall queue only — shows records pending FUN action ─
// Appears here only after: Team Captain approval + BOTH Lab Manager AND QAO in merged `qao` (`lm|qa`).
// Only shows records where fun IS NULL (not yet acted on by FUN)
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
       WHERE fun IS NULL
         AND fun_date IS NULL
       ORDER BY date_input DESC, id DESC`
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("[logbookEndorsementController] getAllLogbookEndorsements error:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch logbook endorsements" });
  }
};

// ─── Recalled section: records where FUN has acted (fun & fun_date are NOT NULL) ─
const getLogbookEndorsementsRecalledSection = async (_req, res) => {
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
       WHERE fun IS NOT NULL
         AND fun_date IS NOT NULL
       ORDER BY date_input DESC, id DESC`
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("[logbookEndorsementController] getLogbookEndorsementsRecalledSection error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch logbook endorsements (archive)",
    });
  }
};

// ─── Update (full) ────────────────────────────────────────────────────────────
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
       SET category      = ?,
           mnemonic      = ?,
           analytes      = ?,
           \`values\`    = ?,
           tc            = ?,
           tc_date       = ?,
           qao           = ?,
           qao_date      = ?,
           fun           = ?,
           fun_date      = ?,
           modified_by   = ?,
           date_modified = ?
       WHERE id = ?`,
      [
        toShortText(category, FIELD_LIMIT.category),
        toShortText(mnemonic, FIELD_LIMIT.mnemonic),
        toShortText(analytes, FIELD_LIMIT.analytes),
        toShortText(values,   FIELD_LIMIT.values),
        tc       ? toShortText(tc,  FIELD_LIMIT.person) : null,
        tc_date  || null,
        qao      ? toShortText(qao, FIELD_LIMIT.person) : null,
        qao_date || null,
        fun      ? toShortText(fun, FIELD_LIMIT.person) : null,
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

// ─── Done Recall (PATCH) — FUN name + server timestamps for fun_date / date_modified ───
const doneRecallLogbookEndorsement = async (req, res) => {
  try {
    const { id } = req.params;
    const { fun, modified_by } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, error: "id is required" });
    }
    if (!fun) {
      return res.status(400).json({ success: false, error: "fun is required" });
    }

    const funName = toShortText(fun, FIELD_LIMIT.person);
    const auditor =
      modified_by && String(modified_by).trim()
        ? toShortText(modified_by, FIELD_LIMIT.person)
        : funName;

    const [result] = await database.mysqlPool.query(
      `UPDATE ${DB_TABLE}
       SET fun           = ?,
           fun_date      = NOW(),
           modified_by   = ?,
           date_modified = NOW()
       WHERE id = ?`,
      [funName, auditor, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, error: "Record not found" });
    }

    return res.json({ success: true, message: "Recall marked as done" });
  } catch (error) {
    console.error("[logbookEndorsementController] doneRecallLogbookEndorsement error:", {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
    });
    return res.status(500).json({
      success: false,
      error: "Failed to mark recall as done",
      message: error.sqlMessage || error.message,
    });
  }
};

// ─── Stats ────────────────────────────────────────────────────────────────────
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
  getAllLogbookEndorsements,
  getLogbookEndorsementsRecalledSection,
  updateLogbookEndorsement,
  doneRecallLogbookEndorsement,
  getCategoryStats,
  getMnemonicStats,
};