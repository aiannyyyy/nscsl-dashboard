const fs   = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const util = require('util');
const execFilePromise = util.promisify(execFile);
const oracledb = require('oracledb');

/**
 * G6PD Auto Mailer Controller
 *
 * Handles two report types:
 *  - Individual Report : filtered by a single LABNO
 *  - Summary Report    : filtered by a date range (DTRECV)
 *
 * Both queries UNION ALL master + archive tables and always:
 *   - MNEMONIC   = 'G22'
 *   - REPTCODE   = '90009'
 *   - ADRS_TYPE  = '1'
 */

// ── Shared column list (same for master and archive legs) ─────────────────────
const COLUMNS = ` 
    LIB_DISORDER."MAILERNAME",
    D."LABNO",
    D."REPTCODE",
    D."MNEMONIC",
    DA."REPTCODE"  AS AVG_REPTCODE,
    DA."VALUE",
    DA."TESTCODE",
    LDR."DESCR1",
    SD."LABNO"     AS DEMOG_LABNO,
    SD."LNAME",
    SD."FNAME",
    SD."PHYSID",
    SD."BIRTHDT",
    SD."BIRTHWT",
    SD."DTCOLL",
    SD."DTRECV",
    SD."DTRPTD",
    SD."SUBMID",
    SD."TWIN",
    SD."SEX",
    RPA."ADRS_TYPE",
    RPA."STREET1",
    RPA."STREET2",
    RPA."CITY",
    RPA."DESCR1"   AS PROVIDER_NAME,
    RPA."DESCR4",
    RPA."DESCR5",
    RPA."DESCR6"
`;

// ── Build one leg (master or archive) of the UNION ALL ────────────────────────
const buildLeg = (isMaster, whereClause) => {
    const disorderTable = isMaster ? 'DISORDER_MASTER'      : 'DISORDER_ARCHIVE';
    const avgTable      = isMaster ? 'DISORDER_AVG_MASTER'  : 'DISORDER_AVG_ARCHIVE';
    const demogTable    = isMaster ? 'SAMPLE_DEMOG_MASTER'  : 'SAMPLE_DEMOG_ARCHIVE';

    return `
        SELECT ${COLUMNS}
        FROM
            PHMSDS.LIB_DISORDER         LIB_DISORDER,
            PHMSDS.${disorderTable}     D,
            PHMSDS.${avgTable}          DA,
            PHMSDS.LIB_DISORDER_RESULT  LDR,
            PHMSDS.${demogTable}        SD,
            PHMSDS.REF_PROVIDER_ADDRESS RPA
        WHERE
            LIB_DISORDER."REPTCODE" = D."REPTCODE"
            AND D."LABNO"           = DA."LABNO"
            AND D."REPTCODE"        = DA."REPTCODE"
            AND D."MNEMONIC"        = LDR."MNEMONIC"
            AND D."REPTCODE"        = LDR."REPTCODE"
            AND D."LABNO"           = SD."LABNO"
            AND SD."SUBMID"         = RPA."PROVIDERID"
            AND RPA."ADRS_TYPE"     = '1'
            AND D."MNEMONIC"        = 'G22'
            AND DA."REPTCODE"       = '90009'
            ${whereClause}
    `;
};

// ── Helper: open connection ───────────────────────────────────────────────────
const getConnection = async (req, res) => {
    const oraclePool = req.app.locals.oracleDb;
    if (!oraclePool) {
        res.status(500).json({
            success: false,
            error: 'Database connection not available',
            message: 'Oracle connection pool is not initialized',
        });
        return null;
    }
    return oraclePool.getConnection();
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/followup/auto-mailer/individual
 *
 * Query Params:
 *   labno  (required) - the specimen / lab number to look up
 *
 * Returns G6PD report data for a single specimen.
 */
exports.getIndividualReport = async (req, res) => {
    let connection;
    const startTime = Date.now();

    try {
        console.log('[AutoMailer] Individual report request received');

        const { labno } = req.query;

        // ── Validate ──────────────────────────────────────────────────────
        if (!labno || String(labno).trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameter',
                message: '`labno` query parameter is required',
            });
        }

        const labnoClean = String(labno).trim();

        connection = await getConnection(req, res);
        if (!connection) return;

        // ── Build query ───────────────────────────────────────────────────
        const whereClause = `AND SD."LABNO" = :labno`;
        const binds       = { labno: labnoClean };

        const sql = `
            ${buildLeg(true,  whereClause)}
            UNION ALL
            ${buildLeg(false, whereClause)}
            ORDER BY 25, 2
        `;

        console.log(`[AutoMailer] Individual — LABNO: ${labnoClean}`);

        // ── Execute ───────────────────────────────────────────────────────
        const result = await connection.execute(sql, binds, {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
        });

        const executionTime = Date.now() - startTime;

        console.log(
            `[AutoMailer] Individual — rows: ${result.rows.length}, ` +
            `exec: ${executionTime}ms`
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No record found',
                message: `No G6PD report data found for LABNO: ${labnoClean}`,
                filters: { labno: labnoClean },
                executionTime: `${executionTime}ms`,
                timestamp: new Date().toISOString(),
            });
        }

        return res.json({
            success: true,
            data: result.rows,
            filters: { labno: labnoClean },
            total: result.rows.length,
            executionTime: `${executionTime}ms`,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('❌ AutoMailer Individual Report Error:', error);
        const executionTime = Date.now() - startTime;
        return res.status(500).json({
            success: false,
            error: 'An error occurred while fetching the individual G6PD report',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            executionTime: `${executionTime}ms`,
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('[AutoMailer] Individual — DB connection closed');
            } catch (closeErr) {
                console.error('❌ Error closing connection:', closeErr);
            }
        }
    }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/followup/auto-mailer/summary
 *
 * Query Params:
 *   dateFrom  (required) - start date  YYYY-MM-DD  (inclusive, 00:00:00)
 *   dateTo    (required) - end date    YYYY-MM-DD  (exclusive next day, 00:00:00)
 *
 * Returns G6PD report data for all specimens received within the date range.
 */
exports.getSummaryReport = async (req, res) => {
    let connection;
    const startTime = Date.now();

    try {
        console.log('[AutoMailer] Summary report request received');

        const { dateFrom, dateTo } = req.query;

        // ── Validate ──────────────────────────────────────────────────────
        if (!dateFrom || !dateTo) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters',
                message: 'Both `dateFrom` and `dateTo` query parameters are required (YYYY-MM-DD)',
            });
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateFrom) || !dateRegex.test(dateTo)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format',
                message: 'Dates must be in YYYY-MM-DD format',
            });
        }

        if (new Date(dateFrom) > new Date(dateTo)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date range',
                message: '`dateFrom` must be on or before `dateTo`',
            });
        }

        connection = await getConnection(req, res);
        if (!connection) return;

        // ── Build query ───────────────────────────────────────────────────
        // DTRECV >= dateFrom 00:00:00  AND  DTRECV < dateTo+1 00:00:00
        const whereClause = `
            AND SD."DTRECV" >= TO_DATE(:dateFrom, 'YYYY-MM-DD')
            AND SD."DTRECV" <  TO_DATE(:dateTo,   'YYYY-MM-DD') + 1
        `;
        const binds = { dateFrom, dateTo };

        const sql = `
            ${buildLeg(true,  whereClause)}
            UNION ALL
            ${buildLeg(false, whereClause)}
            ORDER BY 25, 2
        `;

        console.log(`[AutoMailer] Summary — dateFrom: ${dateFrom}, dateTo: ${dateTo}`);

        // ── Execute ───────────────────────────────────────────────────────
        const result = await connection.execute(sql, binds, {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
        });

        const executionTime = Date.now() - startTime;

        console.log(
            `[AutoMailer] Summary — rows: ${result.rows.length}, ` +
            `exec: ${executionTime}ms`
        );

        return res.json({
            success: true,
            data: result.rows,
            filters: { dateFrom, dateTo },
            total: result.rows.length,
            executionTime: `${executionTime}ms`,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('❌ AutoMailer Summary Report Error:', error);
        const executionTime = Date.now() - startTime;
        return res.status(500).json({
            success: false,
            error: 'An error occurred while fetching the G6PD summary report',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            executionTime: `${executionTime}ms`,
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('[AutoMailer] Summary — DB connection closed');
            } catch (closeErr) {
                console.error('❌ Error closing connection:', closeErr);
            }
        }
    }
};

/**
 * ============================================================================
 * G6PD REPORT GENERATION (CrystalReports .exe wrapper)
 * ============================================================================
 *
 * Add these requires to the TOP of autoMailerReports.js (alongside `oracledb`):
 *
 *   const fs   = require('fs');
 *   const path = require('path');
 *   const { execFile } = require('child_process');
 *   const util = require('util');
 *   const execFilePromise = util.promisify(execFile);
 *
 * Then paste everything below into autoMailerReports.js.
 * ============================================================================
 */

// ── Config ───────────────────────────────────────────────────────────────────
const G6PD_REPORT_CONFIG = {
    EXE_DIR: path.join(__dirname, '..', '..', 'CMSReportGeneration'),
    get EXE_PATH() {
        return path.join(this.EXE_DIR, 'CMSReportGeneration.exe');
    },
    get REPORTS_DIR() {
        return path.join(this.EXE_DIR, 'Reports');
    },
    TIMEOUT_MS: 120000, // 2 minutes
};

// ── Validation helpers ───────────────────────────────────────────────────────

// LABNO is numeric per the examples in the exe usage text (e.g. 20261060483).
// Lock it down to digits only — this is what protects against argument
// injection at the source, on top of using execFile (see below).
const LABNO_REGEX = /^\d+$/;
const DATE_REGEX  = /^\d{4}-\d{2}-\d{2}$/;

const buildIndividualFileName = (labNo) => `g6pd_individual_${labNo}.pdf`;
const buildSummaryFileName    = (dateFrom, dateTo) =>
    `g6pd_summary_${dateFrom.replace(/-/g, '')}_to_${dateTo.replace(/-/g, '')}.pdf`;

/**
 * Run G6PDReportExporter.exe ("CMSReportGeneration.exe" per the exe project,
 * matching the VB.net Module1 you shared).
 *
 * IMPORTANT: uses execFile, NOT exec — args are passed as an array, so the
 * OS spawns the process directly without going through a shell. There is no
 * string interpolation into a command line, so shell metacharacters in any
 * argument are inert. This is the fix for the injection risk in the CMS
 * controller's exec()-based runCMSReport.
 */
const runG6PDReport = async (reportArgs) => {
    const exePath = G6PD_REPORT_CONFIG.EXE_PATH;
    const exeDir  = G6PD_REPORT_CONFIG.EXE_DIR;

    if (!fs.existsSync(exePath)) {
        throw new Error(`G6PD report exe not found at: ${exePath}`);
    }

    console.log(`[G6PD Report] Running: ${exePath} ${reportArgs.join(' ')}`);

    const { stdout, stderr } = await execFilePromise(exePath, reportArgs, {
        cwd:         exeDir,
        timeout:     G6PD_REPORT_CONFIG.TIMEOUT_MS,
        maxBuffer:   10 * 1024 * 1024,
        windowsHide: true,
    });

    if (stdout) {
        stdout.split('\n').forEach(line => { if (line.trim()) console.log(`  ${line.trim()}`); });
    }
    if (stderr) {
        stderr.split('\n').forEach(line => { if (line.trim()) console.warn(`  [stderr] ${line.trim()}`); });
    }

    const statusMatch = stdout.match(/^STATUS:(\w+)/m);
    const fileMatch   = stdout.match(/^FILE:(.+)/m);
    const sizeMatch   = stdout.match(/^SIZE:(\d+)/m);

    const status      = statusMatch ? statusMatch[1].trim() : 'FAILED';
    const exeFilePath = fileMatch   ? fileMatch[1].trim()   : null;
    const fileSize    = sizeMatch   ? parseInt(sizeMatch[1].trim(), 10) : 0;

    console.log(`[G6PD Report] STATUS: ${status} | SIZE: ${fileSize}`);

    if (status === 'NODATA' || fileSize === 0) {
        // Exe still writes a 0-byte file in the NODATA case per the VB code —
        // clean it up so it doesn't linger in Reports/.
        if (exeFilePath && fs.existsSync(exeFilePath)) {
            try { fs.unlinkSync(exeFilePath); } catch (_) { /* ignore */ }
        }
        return { hasData: false };
    }

    if (status !== 'SUCCESS' || !exeFilePath) {
        throw new Error(`G6PD report exporter failed. STATUS: ${status}`);
    }

    if (!fs.existsSync(exeFilePath)) {
        throw new Error(`PDF not found on disk after export: ${exeFilePath}`);
    }

    return { hasData: true, exeFilePath };
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/followup/auto-mailer/individual/generate
 *
 * Body: { labNo: string }
 */
exports.generateIndividualG6PDReport = async (req, res) => {
    const { labNo } = req.body;

    if (!labNo || typeof labNo !== 'string' || !labNo.trim()) {
        return res.status(400).json({ success: false, error: 'labNo is required.' });
    }

    const cleanLabNo = labNo.trim();

    if (!LABNO_REGEX.test(cleanLabNo)) {
        return res.status(400).json({
            success: false,
            error: 'labNo must contain digits only.',
        });
    }

    try {
        const outputFileName = buildIndividualFileName(cleanLabNo);
        const finalPath      = path.join(G6PD_REPORT_CONFIG.REPORTS_DIR, outputFileName);

        const result = await runG6PDReport(['individual', cleanLabNo]);

        if (!result.hasData) {
            return res.status(200).json({
                success:  true,
                labNo:    cleanLabNo,
                hasData:  false,
                fileName: null,
            });
        }

        if (fs.existsSync(finalPath)) {
            try { fs.unlinkSync(finalPath); } catch (_) { /* ignore */ }
        }
        fs.renameSync(result.exeFilePath, finalPath);

        return res.status(200).json({
            success:  true,
            labNo:    cleanLabNo,
            hasData:  true,
            fileName: outputFileName,
        });

    } catch (err) {
        console.error('[G6PD Report] Individual generation error:', err);
        return res.status(500).json({
            success: false,
            error:   'Report generation failed.',
            details: err.message,
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/followup/auto-mailer/summary/generate
 *
 * Body: { dateFrom: 'YYYY-MM-DD', dateTo: 'YYYY-MM-DD' }
 */
exports.generateSummaryG6PDReport = async (req, res) => {
    const { dateFrom, dateTo } = req.body;

    if (!dateFrom || !dateTo) {
        return res.status(400).json({
            success: false,
            error: 'dateFrom and dateTo are required (YYYY-MM-DD).',
        });
    }

    if (!DATE_REGEX.test(dateFrom) || !DATE_REGEX.test(dateTo)) {
        return res.status(400).json({
            success: false,
            error: 'Dates must be in YYYY-MM-DD format.',
        });
    }

    if (new Date(dateFrom) > new Date(dateTo)) {
        return res.status(400).json({
            success: false,
            error: 'dateFrom must be on or before dateTo.',
        });
    }

    try {
        const outputFileName = buildSummaryFileName(dateFrom, dateTo);
        const finalPath      = path.join(G6PD_REPORT_CONFIG.REPORTS_DIR, outputFileName);

        const result = await runG6PDReport(['summary', dateFrom, dateTo]);

        if (!result.hasData) {
            return res.status(200).json({
                success:  true,
                dateFrom,
                dateTo,
                hasData:  false,
                fileName: null,
            });
        }

        if (fs.existsSync(finalPath)) {
            try { fs.unlinkSync(finalPath); } catch (_) { /* ignore */ }
        }
        fs.renameSync(result.exeFilePath, finalPath);

        return res.status(200).json({
            success:  true,
            dateFrom,
            dateTo,
            hasData:  true,
            fileName: outputFileName,
        });

    } catch (err) {
        console.error('[G6PD Report] Summary generation error:', err);
        return res.status(500).json({
            success: false,
            error:   'Report generation failed.',
            details: err.message,
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/followup/auto-mailer/serve-report/:filename
 *
 * Streams the generated PDF back to the client.
 */
exports.serveG6PDReport = async (req, res) => {
    const { filename } = req.params;

    if (!filename || !filename.endsWith('.pdf')) {
        return res.status(400).json({ success: false, error: 'Invalid filename.' });
    }

    const filePath = path.join(G6PD_REPORT_CONFIG.REPORTS_DIR, filename);

    // Security: prevent directory traversal
    const resolvedFile = path.resolve(filePath);
    const resolvedDir  = path.resolve(G6PD_REPORT_CONFIG.REPORTS_DIR);
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
    res.setHeader('Cache-Control',       'private, max-age=300');

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);

    stream.on('end', () => {
        console.log(`[G6PD Report] Served: ${filename}`);
    });

    stream.on('error', (err) => {
        console.error(`[G6PD Report] Stream error for ${filename}:`, err.message);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Error streaming report.' });
        }
    });
};