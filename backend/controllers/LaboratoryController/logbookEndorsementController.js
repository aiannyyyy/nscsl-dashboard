const oracledb = require("oracledb");
const path = require("path");
const fs = require("fs");
const { database } = require("../../config");
const upload = require("../../config/multer"); // adjust path to your multer.js
const { sendNotificationsToFollowupTeam, sendToUsersByPosition } = require("../../utils/notificationHelper");

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

/** Readable ASCII for notification body. */
const plainNotificationText = (value) =>
  String(value || "")
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const TEAM_CAPTAIN_POSITION = "Team Captain";
const LAB_MANAGER_POSITION = "Laboratory Manager";
const QAO_POSITION = "Quality Assurance Officer";
const NOTIFY_ON_TC_APPROVE_POSITIONS = ["Laboratory Manager", "Quality Assurance Officer"];

/** Lab Manager + QAO share `qao` as "lm|qa", legacy QA-only as plain string. */
function parseLmQaStored(raw) {
  const s = raw == null ? "" : String(raw).trim();
  if (!s) return { lm: "", qa: "" };
  const i = s.indexOf("|");
  if (i === -1) return { lm: "", qa: s.trim() };
  return { lm: s.slice(0, i).trim(), qa: s.slice(i + 1).trim() };
}

function buildLmQaStored(lm, qa) {
  const l = lm != null ? String(lm).trim() : "";
  const q = qa != null ? String(qa).trim() : "";
  if (l && q) return `${l}|${q}`;
  if (l) return `${l}|`;
  if (q) return q;
  return "";
}

/** Delete a file from disk silently (used on rollback). Accepts absolute path or backend-relative ("uploads/..."). */
function deleteFileSilently(filePath) {
  const absolute = diskPathFromStored(filePath);
  if (!absolute) return;
  try {
    if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
  } catch (err) {
    console.error("[logbookEndorsementController] failed to delete file:", err?.message);
  }
}

/** Resolve DB-stored attachment path for unlink (comma paths use each segment separately). */
function diskPathFromStored(storedRelative) {
  const s = (storedRelative || "").replace(/\\/g, "/").trim();
  if (!s) return null;
  if (path.isAbsolute(s)) return s;
  return path.join(__dirname, "..", "..", s);
}

/** Stored value for Multer uploads (matches unsat endorsement: "uploads/filename.ext"). */
function multerStoredPath(file) {
  if (!file || !file.filename) return null;
  return `uploads/${file.filename}`.replace(/\\/g, "/");
}

function appendStoredAttachmentPaths(paths, filePathsToAppend) {
  const next = paths.filter(Boolean);
  for (const p of filePathsToAppend) {
    if (p && !next.includes(p)) next.push(p);
  }
  return next.length ? next.join(",") : null;
}

function splitAttachmentPaths(csv) {
  if (!csv || typeof csv !== "string") return [];
  return csv
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Follow-up recall when both LM and QAO slots are filled. */
function sendRecallNotifications(row, endorsementId, createdBy) {
  const { lm: lmStr, qa: qaStr } = parseLmQaStored(row.qao);
  if (!lmStr || !qaStr) return;

  const labnoDisp = plainNotificationText(toShortText(row.labno, FIELD_LIMIT.labno));
  const recallTitle = plainNotificationText(`Recall ready (${labnoDisp})`.slice(0, 120));
  const recallMessage = plainNotificationText(
    `${labnoDisp}: LM/QAO verified. FUN recall pending.`.slice(0, 240)
  );

  void sendNotificationsToFollowupTeam({
    type: "logbook_endorsement_recall",
    title: recallTitle,
    message: recallMessage,
    link: `/dashboard/followup/logbook-endorsement?endorsementId=${endorsementId}`,
    reference_id: Number(endorsementId),
    reference_type: "logbook_endorsement",
    created_by: plainNotificationText(createdBy),
  }).catch((err) => {
    console.error("[approveLabQa] notify Followup error:", err?.message || err);
  });
}

// ─── Multer middleware (multiple files, field name "attachments") ──────────────
/** Max simultaneous uploads per request (comma-separated paths in attachment_path column). */
const LOGBOOK_ATTACHMENT_LIMIT = 10;

/**
 * Use in router:
 *   router.post("/", uploadEndorsementAttachments, createLogbookEndorsement);
 *   router.put("/:id", uploadEndorsementAttachments, updateLogbookEndorsement);
 */
const uploadEndorsementAttachments = (req, res, next) => {
  upload.array("attachments", LOGBOOK_ATTACHMENT_LIMIT)(req, res, (err) => {
    if (!err) return next();

    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "File too large. Maximum allowed size is 10 MB per file.",
      });
    }
    if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        error: `You can attach up to ${LOGBOOK_ATTACHMENT_LIMIT} files per request.`,
      });
    }
    return res.status(400).json({
      success: false,
      error: err.message || "File upload error.",
    });
  });
};

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
         note,
         attachment_path,
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
  const uploadedDiskPaths = (req.files || []).map((f) => f.path).filter(Boolean);

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
      note,
    } = req.body;

    const newStoredPaths =
      req.files && req.files.length ? req.files.map(multerStoredPath).filter(Boolean) : [];

    const attachment_path = appendStoredAttachmentPaths([], newStoredPaths);

    // ── Validate required fields ──────────────────────────────────────────────
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
      uploadedDiskPaths.forEach((p) => deleteFileSilently(p));
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    const now = new Date();

    const params = [
      now,                                                            // date_input
      toShortText(labno,         FIELD_LIMIT.labno),
      toShortText(patient_name,  FIELD_LIMIT.patient_name),
      toShortText(facility_code, FIELD_LIMIT.facility_code),
      toShortText(category,      FIELD_LIMIT.category),
      toShortText(mnemonic,      FIELD_LIMIT.mnemonic),
      toShortText(analytes,      FIELD_LIMIT.analytes),
      toShortText(values,        FIELD_LIMIT.values),
      toShortText(analyst,       FIELD_LIMIT.analyst),
      now,                                                            // analyst_date
      tc  ? toShortText(tc,  FIELD_LIMIT.person) : null,
      tc_date  || null,
      qao ? toShortText(qao, FIELD_LIMIT.person) : null,
      qao_date || null,
      fun ? toShortText(fun, FIELD_LIMIT.person) : null,
      fun_date || null,
      note        ? String(note).trim()  : null,                     // longtext — no truncate
      attachment_path,                                                // varchar
    ];

    if (process.env.NODE_ENV === "development") {
      console.log("[createLogbookEndorsement] INSERT params:", params);
    }

    const [result] = await database.mysqlPool.query(
      `INSERT INTO ${DB_TABLE}
       (date_input, labno, patient_name, facility_code, category, mnemonic,
        analytes, \`values\`, analyst, analyst_date,
        tc, tc_date, qao, qao_date, fun, fun_date,
        note, attachment_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params
    );

    // ── Notifications ─────────────────────────────────────────────────────────
    const createdByName =
      req.user?.name || toShortText(analyst, FIELD_LIMIT.analyst) || "System";
    const labnoDisp    = plainNotificationText(toShortText(labno,         FIELD_LIMIT.labno));
    const patientDisp  = plainNotificationText(toShortText(patient_name,  FIELD_LIMIT.patient_name));
    const categoryDisp = plainNotificationText(toShortText(category,      FIELD_LIMIT.category));

    void sendToUsersByPosition({
      positions: ["Team Captain"],
      type: "logbook_endorsement",
      title: "New logbook endorsement",
      message: `Lab ${labnoDisp}, patient ${patientDisp}. Category ${categoryDisp}.`,
      link: `/dashboard/laboratory/endorsement-to-followup?endorsementId=${result.insertId}`,
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
      attachment_path,
    });
  } catch (error) {
    uploadedDiskPaths.forEach((p) => deleteFileSilently(p));

    console.error("[logbookEndorsementController] createLogbookEndorsement error:", {
      message:    error.message,
      code:       error.code,
      sqlMessage: error.sqlMessage,
      sql:        error.sql,
    });

    return res.status(500).json({
      success: false,
      error:   "Failed to create logbook endorsement",
      message: error.sqlMessage || error.message,
    });
  }
};

// ─── Update ───────────────────────────────────────────────────────────────────
const updateLogbookEndorsement = async (req, res) => {
  const uploadedDiskPaths = (req.files || []).map((f) => f.path).filter(Boolean);

  try {
    const { id } = req.params;
    if (!id) {
      uploadedDiskPaths.forEach((p) => deleteFileSilently(p));
      return res.status(400).json({ success: false, error: "id is required" });
    }

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
      note,
      // pass remove_attachment=true to clear attachments and delete files from disk
      remove_attachment,
      // JSON arrays (same pattern as UNSAT endorsement): paths to retain / remove when editing uploads
      files_to_keep,
      files_to_delete,
    } = req.body;

    const newStoredPaths =
      req.files && req.files.length ? req.files.map(multerStoredPath).filter(Boolean) : [];

    let attachmentUpdate = undefined;
    /** Stored paths deleted from disk after a successful UPDATE (comma-aware). */
    let pathsToDeleteFromDisk = [];

    const [existingRows] = await database.mysqlPool.query(
      `SELECT attachment_path FROM ${DB_TABLE} WHERE id = ?`,
      [id]
    );
    const currentAttachmentCsv = existingRows[0]?.attachment_path ?? null;
    const currentPaths = splitAttachmentPaths(currentAttachmentCsv);

    const removeAll =
      remove_attachment === "true" || remove_attachment === true || remove_attachment === "1";

    if (removeAll) {
      attachmentUpdate = null;
      pathsToDeleteFromDisk = [...currentPaths];
    } else {
      const hasExplicitKeep = Object.prototype.hasOwnProperty.call(req.body, "files_to_keep");
      const hasExplicitDelete = Object.prototype.hasOwnProperty.call(req.body, "files_to_delete");

      if (hasExplicitKeep || hasExplicitDelete) {
        let parsedKeep = [];
        let parsedDelete = [];

        try {
          if (hasExplicitKeep && files_to_keep != null && String(files_to_keep).trim()) {
            parsedKeep = JSON.parse(files_to_keep);
          }
          if (hasExplicitDelete && files_to_delete != null && String(files_to_delete).trim()) {
            parsedDelete = JSON.parse(files_to_delete);
          }
        } catch (_e) {
          uploadedDiskPaths.forEach((p) => deleteFileSilently(p));
          return res.status(400).json({
            success: false,
            error: "Invalid JSON in files_to_keep or files_to_delete.",
          });
        }

        if (!Array.isArray(parsedKeep)) parsedKeep = [];
        if (!Array.isArray(parsedDelete)) parsedDelete = [];

        const finalPaths = [...new Set([...parsedKeep, ...newStoredPaths])];
        attachmentUpdate = finalPaths.length ? finalPaths.join(",") : null;
        pathsToDeleteFromDisk = [
          ...parsedDelete,
          ...currentPaths.filter((p) => !finalPaths.includes(p)),
        ];
      } else if (newStoredPaths.length > 0) {
        attachmentUpdate = appendStoredAttachmentPaths(currentPaths, newStoredPaths);
      }
    }

    const now = new Date();

    // Build SET clause dynamically so we only touch attachment_path when needed
    const setClauses = [
      "category      = ?",
      "mnemonic      = ?",
      "analytes      = ?",
      "`values`      = ?",
      "tc            = ?",
      "tc_date       = ?",
      "qao           = ?",
      "qao_date      = ?",
      "fun           = ?",
      "fun_date      = ?",
      "note          = ?",
      "modified_by   = ?",
      "date_modified = ?",
    ];
    const setParams = [
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
      note != null ? String(note).trim() : null,
      modified_by ? toShortText(modified_by, FIELD_LIMIT.person) : "SYSTEM",
      now,
    ];

    if (attachmentUpdate !== undefined) {
      setClauses.push("attachment_path = ?");
      setParams.push(attachmentUpdate);
    }

    setParams.push(id); // WHERE id = ?

    const [result] = await database.mysqlPool.query(
      `UPDATE ${DB_TABLE} SET ${setClauses.join(", ")} WHERE id = ?`,
      setParams
    );

    if (!result.affectedRows) {
      uploadedDiskPaths.forEach((p) => deleteFileSilently(p));
      return res.status(404).json({ success: false, error: "Record not found" });
    }

    for (const rel of [...new Set(pathsToDeleteFromDisk)]) {
      deleteFileSilently(rel);
    }

    return res.json({
      success: true,
      message: "Logbook endorsement updated successfully",
      ...(attachmentUpdate !== undefined && { attachment_path: attachmentUpdate }),
    });
  } catch (error) {
    uploadedDiskPaths.forEach((p) => deleteFileSilently(p));

    console.error("[logbookEndorsementController] updateLogbookEndorsement error:", {
      message:    error.message,
      code:       error.code,
      sqlMessage: error.sqlMessage,
    });
    return res.status(500).json({
      success: false,
      error:   "Failed to update logbook endorsement",
      message: error.sqlMessage || error.message,
    });
  }
};

// ─── Team Captain approve ─────────────────────────────────────────────────────
const approveTeamCaptain = async (req, res) => {
  try {
    const pos = String(req.user?.position || "").trim();
    if (pos !== TEAM_CAPTAIN_POSITION) {
      return res.status(403).json({
        success: false,
        error: "Only Team Captain can record this approval.",
      });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: "id is required" });
    }

    const [rows] = await database.mysqlPool.query(
      `SELECT id, labno, patient_name, category, tc FROM ${DB_TABLE} WHERE id = ?`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: "Record not found" });
    }

    const row = rows[0];
    if (row.tc != null && String(row.tc).trim() !== "") {
      return res.status(409).json({
        success: false,
        error: "Team Captain approval is already recorded for this endorsement.",
      });
    }

    const now = new Date();
    const captainName = toShortText(req.user.name, FIELD_LIMIT.person);

    const [result] = await database.mysqlPool.query(
      `UPDATE ${DB_TABLE}
       SET tc = ?, tc_date = ?, modified_by = ?, date_modified = ?
       WHERE id = ?
         AND (tc IS NULL OR TRIM(tc) = '')`,
      [captainName, now, captainName, now, id]
    );

    if (!result.affectedRows) {
      return res.status(409).json({
        success: false,
        error: "Team Captain approval is already recorded for this endorsement.",
      });
    }

    const labnoDisp    = plainNotificationText(toShortText(row.labno,         FIELD_LIMIT.labno));
    const patientDisp  = plainNotificationText(toShortText(row.patient_name,  FIELD_LIMIT.patient_name));
    const categoryDisp = plainNotificationText(toShortText(row.category,      FIELD_LIMIT.category));
    const captainDisp  = plainNotificationText(captainName);

    void sendToUsersByPosition({
      positions: NOTIFY_ON_TC_APPROVE_POSITIONS,
      type: "logbook_tc_approved",
      title: "Approved by Team Captain",
      message: `Lab ${labnoDisp}, patient ${patientDisp}. Approved by Team Captain ${captainDisp}. Category ${categoryDisp}.`,
      link: `/dashboard/laboratory/endorsement-to-followup?endorsementId=${id}`,
      reference_id: Number(id),
      reference_type: "logbook_endorsement",
      created_by: captainDisp,
    }).catch((err) => {
      console.error("[approveTeamCaptain] notify LM/QAO error:", err?.message || err);
    });

    return res.json({
      success: true,
      message: "Team Captain approval saved.",
      tc: captainName,
      tc_date: now.toISOString(),
    });
  } catch (error) {
    console.error("[logbookEndorsementController] approveTeamCaptain error:", {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
    });
    return res.status(500).json({
      success: false,
      error:   "Failed to save Team Captain approval",
      message: error.sqlMessage || error.message,
    });
  }
};

// ─── Lab Manager + QAO / FUN ──────────────────────────────────────────────────
const approveLabQa = async (req, res) => {
  try {
    const role = String(req.body?.role ?? "").trim().toLowerCase();
    const pos  = String(req.user?.position ?? "").trim();

    const asLabManager = role === "lab_manager" || role === "laboratory_manager";
    const asQao        = role === "qao"          || role === "quality_assurance_officer";

    if (!asLabManager && !asQao) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Use "lab_manager" or "qao".',
      });
    }
    if (asLabManager && pos !== LAB_MANAGER_POSITION) {
      return res.status(403).json({
        success: false,
        error: "Only Laboratory Manager can record this approval.",
      });
    }
    if (asQao && pos !== QAO_POSITION) {
      return res.status(403).json({
        success: false,
        error: "Only Quality Assurance Officer can record this approval.",
      });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: "id is required" });
    }

    const [rows] = await database.mysqlPool.query(
      `SELECT id, labno, patient_name, category, tc, qao, fun FROM ${DB_TABLE} WHERE id = ?`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: "Record not found" });
    }

    const row = rows[0];
    if (row.tc == null || String(row.tc).trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Team Captain must approve before Lab Manager or QAO.",
      });
    }

    const prevQao    = row.qao == null ? null : String(row.qao);
    const approverName = toShortText(req.user.name, FIELD_LIMIT.person);
    const now        = new Date();

    if (asLabManager) {
      const parsed = parseLmQaStored(row.qao);
      if (parsed.lm) {
        return res.status(409).json({
          success: false,
          error: "Laboratory Manager signature is already recorded.",
        });
      }
      const combined = toShortText(
        buildLmQaStored(approverName, parsed.qa),
        FIELD_LIMIT.person
      );
      const [result] = await database.mysqlPool.query(
        `UPDATE ${DB_TABLE}
         SET qao = ?, qao_date = ?, modified_by = ?, date_modified = ?
         WHERE id = ? AND qao <=> ?`,
        [combined, now, approverName, now, id, prevQao]
      );
      if (!result.affectedRows) {
        return res.status(409).json({
          success: false,
          error: "Laboratory Manager signature is already recorded.",
        });
      }
    } else {
      const parsed = parseLmQaStored(row.qao);
      if (parsed.qa) {
        return res.status(409).json({
          success: false,
          error: "Quality Assurance signature is already recorded.",
        });
      }
      const combined = toShortText(
        buildLmQaStored(parsed.lm, approverName),
        FIELD_LIMIT.person
      );
      const [result] = await database.mysqlPool.query(
        `UPDATE ${DB_TABLE}
         SET qao = ?, qao_date = ?, modified_by = ?, date_modified = ?
         WHERE id = ? AND qao <=> ?`,
        [combined, now, approverName, now, id, prevQao]
      );
      if (!result.affectedRows) {
        return res.status(409).json({
          success: false,
          error: "Quality Assurance signature is already recorded.",
        });
      }
    }

    const [afterRows] = await database.mysqlPool.query(
      `SELECT labno, patient_name, category, qao, fun FROM ${DB_TABLE} WHERE id = ?`,
      [id]
    );
    if (afterRows.length) {
      sendRecallNotifications(afterRows[0], id, approverName);
    }

    const [fresh] = await database.mysqlPool.query(
      `SELECT qao, qao_date, fun, fun_date FROM ${DB_TABLE} WHERE id = ?`,
      [id]
    );
    const r = fresh[0] || {};

    return res.json({
      success: true,
      message: asLabManager
        ? "Laboratory Manager approval saved."
        : "Quality Assurance approval saved.",
      qao:      r.qao      ?? null,
      qao_date: r.qao_date ? new Date(r.qao_date).toISOString() : null,
      fun:      r.fun      ?? null,
      fun_date: r.fun_date ? new Date(r.fun_date).toISOString() : null,
    });
  } catch (error) {
    console.error("[logbookEndorsementController] approveLabQa error:", {
      message:    error.message,
      code:       error.code,
      sqlMessage: error.sqlMessage,
    });
    return res.status(500).json({
      success: false,
      error:   "Failed to save approval",
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
  getPatientDetails,
  getAllLogbookEndorsements,
  createLogbookEndorsement,
  updateLogbookEndorsement,
  uploadEndorsementAttachments,
  approveTeamCaptain,
  approveLabQa,
  getCategoryStats,
  getMnemonicStats,
};