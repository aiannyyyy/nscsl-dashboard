const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

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

// ============================================================================
// CMS REPORT CONFIGURATION
// ============================================================================

const CMS_REPORT_CONFIG = {
    EXE_DIR: path.join(__dirname, '..', '..', 'CMSReportExporter'),
    get EXE_PATH() {
        return path.join(this.EXE_DIR, 'CMSReportExporter.exe');
    },
    get REPORTS_DIR() {
        return path.join(this.EXE_DIR, 'Reports');
    },
    TIMEOUT_MS: 180000,     // 3 minutes per exe call
    CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes — skip re-generation for same file
};

// ============================================================================
// EXISTING CONTROLLERS
// ============================================================================

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

        const legA = buildLegBinds('a');
        const legB = buildLegBinds('b');
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
            try { await connection.close(); }
            catch (closeErr) { console.error('Error closing connection:', closeErr); }
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

        const binds = { labno_a: labno, labno_b: labno };

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
            try { await connection.close(); }
            catch (closeErr) { console.error('Error closing connection:', closeErr); }
        }
    }
};

// ============================================================================
// CMS REPORT GENERATION
// ============================================================================

/**
 * Build a deterministic output filename from labNo + disorders.
 * Same labNo + same disorders → same filename → file gets overwritten (intended).
 */
const buildOutputFileName = (labNo, disorderNames) => {
    const safeLabNo = labNo.replace(/[/\\]/g, '-');
    const disorderPart = disorderNames
        .map(d => d.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
        .sort()
        .join('_');
    return `cms_${safeLabNo}_${disorderPart}.pdf`;
};

/**
 * Run CMSReportExporter.exe for a specific reportType ('master' | 'archive').
 *
 * Each call gets its own temp filename so parallel runs don't collide on disk.
 * The caller is responsible for renaming/cleaning up afterward.
 *
 * Returns { hasData, fileName, filePath } on success.
 * Returns { hasData: false }              when no records matched.
 * Throws on hard failure.
 */
const runCMSReport = async (reportType, labNo, disorderNames, isUrgent, outputFileName) => {
    const exePath = CMS_REPORT_CONFIG.EXE_PATH;
    const exeDir  = CMS_REPORT_CONFIG.EXE_DIR;

    if (!fs.existsSync(exePath)) {
        throw new Error(`CMSReportExporter.exe not found at: ${exePath}`);
    }

    const disorderArg = disorderNames.join('|');
    const urgentArg   = isUrgent ? 'true' : 'false';
    const command     = `"${exePath}" ${reportType} ${labNo} "${disorderArg}" ${urgentArg}`;

    console.log(`[CMS Report] Running ${reportType} report...`);
    console.log(`[CMS Report] Command: ${command}`);

    const { stdout, stderr } = await execPromise(command, {
        cwd:         exeDir,
        timeout:     CMS_REPORT_CONFIG.TIMEOUT_MS,
        maxBuffer:   10 * 1024 * 1024,
        windowsHide: true,
    });

    if (stdout) {
        console.log(`[CMS Report - ${reportType}] Output:`);
        stdout.split('\n').forEach(line => { if (line.trim()) console.log(`  ${line.trim()}`); });
    }
    if (stderr) {
        console.warn(`[CMS Report - ${reportType}] Stderr:`);
        stderr.split('\n').forEach(line => { if (line.trim()) console.warn(`  ${line.trim()}`); });
    }

    const statusMatch = stdout.match(/^STATUS:(\w+)/m);
    const fileMatch   = stdout.match(/^FILE:(.+)/m);
    const sizeMatch   = stdout.match(/^SIZE:(\d+)/m);

    const status      = statusMatch ? statusMatch[1].trim()              : 'FAILED';
    const exeFilePath = fileMatch   ? fileMatch[1].trim()                : null;
    const fileSize    = sizeMatch   ? parseInt(sizeMatch[1].trim(), 10) : 0;

    console.log(`[CMS Report - ${reportType}] STATUS: ${status} | SIZE: ${fileSize}`);

    if (status === 'NODATA' || fileSize === 0) {
        if (exeFilePath && fs.existsSync(exeFilePath)) {
            try { fs.unlinkSync(exeFilePath); } catch (_) { /* ignore */ }
        }
        return { hasData: false };
    }

    if (status !== 'SUCCESS' || !exeFilePath) {
        throw new Error(`CMSReportExporter failed for ${reportType}. STATUS: ${status}`);
    }

    if (!fs.existsSync(exeFilePath)) {
        throw new Error(`PDF not found on disk after export: ${exeFilePath}`);
    }

    // Each parallel run keeps the exe's own timestamped path until the
    // winner is decided — the caller will rename it to outputFileName.
    return {
        hasData:     true,
        fileName:    outputFileName,
        filePath:    exeFilePath,   // still the exe's temp path at this point
        reportType,
    };
};

/**
 * POST /api/cms/generate-report
 *
 * Body:
 * {
 *   labNo         : string    — e.g. "20261060483"
 *   disorderNames : string[]  — e.g. ["CAH", "HGB HPLC"]
 *   urgent        : boolean
 * }
 *
 * Strategy (parallel, ~50 % faster than sequential):
 *   1. If a fresh cached PDF already exists on disk → return it immediately.
 *   2. Otherwise, run "master" and "archive" concurrently with Promise.allSettled.
 *   3. Prefer "master" when both have data; discard the unused file.
 *   4. Return a single { hasData, fileName } response.
 */
exports.generateCMSReport = async (req, res) => {
    const { labNo, disorderNames, urgent } = req.body;

    console.log('[CMS Report] Generate request received:');
    console.log(`  labNo         : ${labNo}`);
    console.log(`  disorderNames : ${JSON.stringify(disorderNames)}`);
    console.log(`  urgent        : ${urgent}`);

    // ── Validate ──────────────────────────────────────────────────────────────
    if (!labNo || typeof labNo !== 'string' || !labNo.trim()) {
        return res.status(400).json({ success: false, error: 'labNo is required.' });
    }
    if (!Array.isArray(disorderNames) || disorderNames.length === 0) {
        return res.status(400).json({ success: false, error: 'disorderNames must be a non-empty array.' });
    }
    if (typeof urgent !== 'boolean') {
        return res.status(400).json({ success: false, error: 'urgent must be a boolean.' });
    }

    const cleanLabNo     = labNo.trim();
    const cleanDisorders = disorderNames.map(d => d.trim()).filter(Boolean);
    const isUrgent       = urgent;

    const outputFileName = buildOutputFileName(cleanLabNo, cleanDisorders);
    const finalPath      = path.join(CMS_REPORT_CONFIG.REPORTS_DIR, outputFileName);

    // ── Cache check — skip exe if file is fresh enough ────────────────────────
    if (fs.existsSync(finalPath)) {
        const { mtimeMs } = fs.statSync(finalPath);
        if (Date.now() - mtimeMs < CMS_REPORT_CONFIG.CACHE_TTL_MS) {
            console.log(`[CMS Report] Cache hit — serving existing file: ${outputFileName}`);
            return res.status(200).json({
                success:  true,
                labNo:    cleanLabNo,
                urgent:   isUrgent,
                source:   'cache',
                hasData:  true,
                fileName: outputFileName,
            });
        }
        console.log(`[CMS Report] Cache expired — regenerating: ${outputFileName}`);
    }

    // ── Run master & archive IN PARALLEL ──────────────────────────────────────
    console.log('[CMS Report] Starting parallel master + archive runs...');

    const [masterSettled, archiveSettled] = await Promise.allSettled([
        runCMSReport('master',  cleanLabNo, cleanDisorders, isUrgent, outputFileName),
        runCMSReport('archive', cleanLabNo, cleanDisorders, isUrgent, outputFileName),
    ]);

    // ── Collect results ───────────────────────────────────────────────────────
    const settled = [
        { reportType: 'master',  settled: masterSettled  },
        { reportType: 'archive', settled: archiveSettled },
    ];

    let winner   = null;   // { hasData, filePath, fileName, reportType }
    const errors = [];

    for (const { reportType, settled: s } of settled) {
        if (s.status === 'rejected') {
            console.error(`[CMS Report] ${reportType} failed:`, s.reason?.message);
            errors.push({ reportType, error: s.reason?.message });
            continue;
        }

        const attempt = s.value;

        if (!attempt.hasData) {
            console.log(`[CMS Report] No data from ${reportType}.`);
            continue;
        }

        if (!winner) {
            // First result with data becomes the winner (master is always first in the array)
            winner = attempt;
            console.log(`[CMS Report] Winner: ${reportType} — will rename to ${outputFileName}`);
        } else {
            // Both ran and both had data — discard the runner-up's temp file
            console.log(`[CMS Report] Discarding duplicate from ${reportType}: ${attempt.filePath}`);
            try {
                if (fs.existsSync(attempt.filePath)) fs.unlinkSync(attempt.filePath);
            } catch (e) {
                console.warn(`[CMS Report] Could not delete duplicate: ${e.message}`);
            }
        }
    }

    // ── Both errored out ──────────────────────────────────────────────────────
    if (!winner && errors.length === 2) {
        return res.status(500).json({
            success: false,
            error:   'Report generation failed for both master and archive.',
            details: errors,
        });
    }

    // ── No data in either source ──────────────────────────────────────────────
    if (!winner) {
        return res.status(200).json({
            success:  true,
            labNo:    cleanLabNo,
            urgent:   isUrgent,
            source:   null,
            hasData:  false,
            fileName: null,
        });
    }

    // ── Move winner's temp file → deterministic final path ────────────────────
    if (fs.existsSync(finalPath)) {
        try { fs.unlinkSync(finalPath); } catch (_) { /* ignore */ }
    }

    fs.renameSync(winner.filePath, finalPath);
    console.log(`[CMS Report] Saved: ${outputFileName} (source: ${winner.reportType})`);

    // ── Success ───────────────────────────────────────────────────────────────
    return res.status(200).json({
        success:  true,
        labNo:    cleanLabNo,
        urgent:   isUrgent,
        source:   winner.reportType,
        hasData:  true,
        fileName: outputFileName,
    });
};

/**
 * GET /api/cms/serve-report/:filename
 *
 * Streams the generated PDF back to the client.
 * Uses a short private cache so the browser doesn't re-download on every open.
 */
exports.serveCMSReport = async (req, res) => {
    const { filename } = req.params;

    if (!filename || !filename.endsWith('.pdf')) {
        return res.status(400).json({ success: false, error: 'Invalid filename.' });
    }

    const filePath = path.join(CMS_REPORT_CONFIG.REPORTS_DIR, filename);

    // Security: prevent directory traversal
    const resolvedFile = path.resolve(filePath);
    const resolvedDir  = path.resolve(CMS_REPORT_CONFIG.REPORTS_DIR);
    if (!resolvedFile.startsWith(resolvedDir)) {
        return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: 'Report file not found.' });
    }

    const stats = fs.statSync(filePath);

    res.setHeader('Content-Type',        'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length',      stats.size);
    // Allow the browser to cache the PDF for 5 minutes — avoids re-downloading
    // the blob on every tab open or component remount
    res.setHeader('Cache-Control',       'private, max-age=300');

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);

    stream.on('end', () => {
        console.log(`[CMS Report] Served: ${filename}`);
    });

    stream.on('error', (err) => {
        console.error(`[CMS Report] Stream error for ${filename}:`, err.message);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Error streaming report.' });
        }
    });
};