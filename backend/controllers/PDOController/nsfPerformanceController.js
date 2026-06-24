const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// ============================================================================
// CONFIGURATION
// ============================================================================

const REPORT_CONFIG = {
    CRYSTAL_REPORTS_DIR: path.join(__dirname, '..', 'crystal_reports'),
    OUTPUT_DIR:          path.join(__dirname, '..', 'reports'),
    TEMP_DIR:            path.join(__dirname, '..', 'temp'),
    REPORT_TEMPLATE:     'nsf_performance.rpt',
    CACHE_TTL_MS:        5 * 60 * 1000, // 5 minutes — skip re-generation for same params
};

// Ensure directories exist
[REPORT_CONFIG.OUTPUT_DIR, REPORT_CONFIG.TEMP_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

console.log('✅ Crystal Reports integration using VB.NET executable');

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}

function formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toISOString().split('T')[0];
}

/**
 * Build a deterministic filename so the same submid + date range always
 * resolves to the same file — enabling cache hits and clean overwrites.
 */
function buildReportFileName(submid, dateFrom, dateTo) {
    return `nsf_performance_${submid}_${dateFrom.replace(/-/g, '')}_${dateTo.replace(/-/g, '')}.pdf`;
}

/**
 * Run the Crystal Reports VB.NET executable and return the path of the
 * generated PDF.  Throws on any failure; returns null when the exe
 * reports no data (non-throwing "empty" case).
 */
async function runCrystalReportExe(requestId, submid, dateFrom, dateTo) {
    const exeDir      = path.join(__dirname, '..', '..', 'CrystalReportExporter');
    const exePath     = path.join(exeDir, 'CrystalReportExporter.exe');
    const templatePath = path.join(exeDir, 'Reports', 'nsf_performance.rpt');

    if (!fs.existsSync(exePath)) {
        throw new Error(
            `Crystal Reports executable not found: ${exePath}\n` +
            `Please ensure CrystalReportExporter.exe is in: ${exeDir}`
        );
    }
    if (!fs.existsSync(templatePath)) {
        throw new Error(`Crystal Reports template not found: ${templatePath}`);
    }

    // VB.NET expects: CrystalReportExporter.exe <Submid> <DateFrom> <DateTo>
    const command = `"${exePath}" ${submid} ${dateFrom} ${dateTo}`;

    console.log(`[${requestId}] Executing: ${command}`);
    console.log(`[${requestId}] Working directory: ${exeDir}`);

    const { stdout, stderr } = await execPromise(command, {
        cwd:         exeDir,
        timeout:     180000,           // 3 minutes
        maxBuffer:   10 * 1024 * 1024, // 10 MB
        windowsHide: true,
    });

    if (stdout) {
        console.log(`[${requestId}] VB.NET output:`);
        stdout.split('\n').forEach(line => { if (line.trim()) console.log(`  ${line.trim()}`); });
    }
    if (stderr) {
        console.warn(`[${requestId}] VB.NET stderr:`);
        stderr.split('\n').forEach(line => { if (line.trim()) console.warn(`  ${line.trim()}`); });
    }

    // The exe writes to its own Reports subfolder using the standard filename
    const fileName      = buildReportFileName(submid, dateFrom, dateTo);
    const exeOutputPath = path.join(exeDir, 'Reports', fileName);

    if (!fs.existsSync(exeOutputPath)) {
        throw new Error(
            `PDF generation failed — VB.NET did not create: ${exeOutputPath}\n` +
            `VB.NET output:\n${stdout}\nErrors:\n${stderr}`
        );
    }

    const { size } = fs.statSync(exeOutputPath);
    console.log(`[${requestId}] Crystal Report generated: ${size} bytes`);

    return exeOutputPath; // caller handles moving to final destination
}

// ============================================================================
// DATA QUERY CONTROLLERS
// ============================================================================

/**
 * GET /api/pdo/nsf-performance
 * Query params: county, dateFrom, dateTo
 */
exports.getNsfPerformance = async (req, res) => {
    let connection;
    const startTime = Date.now();

    try {
        const { county, dateFrom, dateTo } = req.query;

        if (!county || !dateFrom || !dateTo) {
            return res.status(400).json({
                success: false,
                error: 'Missing required query parameters: county, dateFrom, dateTo',
            });
        }

        const countyUpper = county.toUpperCase().trim();
        console.log('[NSF Performance Request]', { county: countyUpper, dateFrom, dateTo });

        const oraclePool = req.app.locals.oracleDb;
        if (!oraclePool) {
            return res.status(500).json({
                success: false,
                error: 'Database connection not available',
                message: 'Oracle connection pool is not initialized',
            });
        }

        connection = await oraclePool.getConnection();

        const query = `
            WITH filtered_sda AS (
                SELECT *
                FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE
                WHERE DTRECV >= TO_DATE(:dateFrom, 'YYYY-MM-DD')
                AND DTRECV < TO_DATE(:dateTo, 'YYYY-MM-DD') + 1
                AND LABNO NOT LIKE '_______8%'
            ),
            filtered_rpa AS (
                SELECT *
                FROM PHMSDS.REF_PROVIDER_ADDRESS
                WHERE ADRS_TYPE = '1'
                AND TRIM(COUNTY) = :county
            ),
            unsat_results AS (
                SELECT DISTINCT LABNO, MNEMONIC
                FROM PHMSDS.RESULT_ARCHIVE
                WHERE MNEMONIC IN ('E100', 'E102', 'E108', 'E109', 'DE')
            ),
            full_results AS (
                SELECT ra.LABNO, ra.MNEMONIC
                FROM PHMSDS.RESULT_ARCHIVE ra
            ),
            joined_data AS (
                SELECT
                    sda.SUBMID,
                    rpa.DESCR1      AS FACILITY_NAME,
                    sda.LABNO,
                    sda.BIRTHHOSP,
                    sda.SPECTYPE,
                    sda.AGECOLL,
                    sda.DTCOLL,
                    sda.DTRECV,
                    ur.MNEMONIC     AS UNSAT_MNEMONIC,
                    fr.MNEMONIC     AS ALL_MNEMONIC
                FROM filtered_sda sda
                JOIN filtered_rpa rpa ON rpa.PROVIDERID = sda.SUBMID
                LEFT JOIN unsat_results ur ON sda.LABNO = ur.LABNO
                LEFT JOIN full_results  fr ON sda.LABNO = fr.LABNO
            )
            SELECT
                SUBMID,
                FACILITY_NAME,
                COUNT(DISTINCT LABNO) AS TOTAL_SAMPLE_COUNT,
                COUNT(DISTINCT CASE WHEN BIRTHHOSP = SUBMID THEN LABNO END) AS TOTAL_INBORN,
                COUNT(DISTINCT CASE WHEN BIRTHHOSP = 'HOME' THEN LABNO END) AS TOTAL_HOMEBIRTH,
                COUNT(DISTINCT CASE WHEN BIRTHHOSP NOT IN ('HOME', 'UNK') AND BIRTHHOSP <> SUBMID THEN LABNO END) AS TOTAL_HOB,
                COUNT(DISTINCT CASE WHEN BIRTHHOSP = 'UNK' THEN LABNO END) AS TOTAL_UNKNOWN,
                COUNT(DISTINCT CASE WHEN BIRTHHOSP IN ('HOME', 'UNK') OR (BIRTHHOSP NOT IN ('HOME', 'UNK') AND BIRTHHOSP <> SUBMID) THEN LABNO END) AS OUTBORN_TOTAL,
                COUNT(DISTINCT CASE WHEN ALL_MNEMONIC = 'E100' THEN LABNO END) AS MISSING_INFORMATION,
                COUNT(DISTINCT CASE WHEN ALL_MNEMONIC = 'E102' THEN LABNO END) AS LESS_THAN_24_HOURS,
                COUNT(DISTINCT CASE WHEN ALL_MNEMONIC = 'E108' THEN LABNO END) AS INSUFFICIENT,
                COUNT(DISTINCT CASE WHEN ALL_MNEMONIC = 'E109' THEN LABNO END) AS CONTAMINATED,
                COUNT(DISTINCT CASE WHEN ALL_MNEMONIC = 'DE'   THEN LABNO END) AS DATA_ERASURES,
                COUNT(DISTINCT CASE WHEN UNSAT_MNEMONIC IS NOT NULL THEN LABNO END) AS TOTAL_UNSAT_COUNT,
                ROUND(
                    COUNT(DISTINCT CASE WHEN UNSAT_MNEMONIC IS NOT NULL THEN LABNO END) * 100.0
                    / NULLIF(COUNT(DISTINCT LABNO), 0), 2
                ) AS TOTAL_UNSAT_RATE,
                ROUND(AVG(CASE WHEN SPECTYPE IN (20, 87) THEN AGECOLL / 24 END), 2) AS AVE_AOC,
                ROUND(AVG(DTRECV - DTCOLL), 2) AS TRANSIT_TIME,
                ROUND(AVG(CASE WHEN BIRTHHOSP = SUBMID AND SPECTYPE IN (20, 87) THEN AGECOLL / 24 END), 2) AS INBORN_AVERAGE,
                ROUND(AVG(CASE WHEN BIRTHHOSP <> SUBMID AND SPECTYPE IN (20, 87) THEN AGECOLL / 24 END), 2) AS OUTBORN_AVERAGE
            FROM joined_data
            GROUP BY SUBMID, FACILITY_NAME
            ORDER BY SUBMID, FACILITY_NAME
        `;

        const result = await connection.execute(
            query,
            { county: countyUpper, dateFrom, dateTo },
            { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 1000, maxRows: 0 }
        );

        const executionTime = Date.now() - startTime;

        if (!result.rows || result.rows.length === 0) {
            console.warn('[No Results Found]', { county: countyUpper, dateFrom, dateTo });
            return res.json({
                success: true,
                message: 'No data found for the specified criteria',
                data: [],
                executionTime: `${executionTime}ms`,
                recordCount: 0,
                filters: { county: countyUpper, dateFrom, dateTo },
            });
        }

        console.log(`[Query Result] Returned ${result.rows.length} rows`);

        res.json({
            success: true,
            data: result.rows,
            executionTime: `${executionTime}ms`,
            recordCount: result.rows.length,
            filters: { county: countyUpper, dateFrom, dateTo },
        });

    } catch (err) {
        console.error('❌ Database error:', err);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching NSF performance data',
            message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
            executionTime: `${Date.now() - startTime}ms`,
        });
    } finally {
        if (connection) {
            try { await connection.close(); }
            catch (e) { console.error('❌ Error closing connection:', e); }
        }
    }
};

/**
 * GET /api/pdo/nsf-performance/lab-details
 * Query params: submid, dateFrom, dateTo
 */
exports.getNsfPerformanceLabDetails = async (req, res) => {
    let connection;
    const startTime = Date.now();

    try {
        const { submid, dateFrom, dateTo } = req.query;

        if (!submid || !dateFrom || !dateTo) {
            return res.status(400).json({
                success: false,
                error: 'Missing required query parameters: submid, dateFrom, dateTo',
            });
        }

        console.log('[Lab Details Request]', { submid, dateFrom, dateTo });

        const oraclePool = req.app.locals.oracleDb;
        if (!oraclePool) {
            return res.status(500).json({
                success: false,
                error: 'Database connection not available',
                message: 'Oracle connection pool is not initialized',
            });
        }

        connection = await oraclePool.getConnection();

        const query = `
            WITH COMBINED AS (
                SELECT /*+ MATERIALIZE */
                    S."LABNO"     AS LABNO,
                    S."SUBMID"    AS SUBMID,
                    S."FNAME"     AS FNAME,
                    S."LNAME"     AS LNAME,
                    S."SPECTYPE"  AS SPECTYPE,
                    S."BIRTHHOSP" AS BIRTHHOSP,
                    D."MNEMONIC"  AS MNEMONIC,
                    'DISORDER'    AS SOURCE_TABLE
                FROM "PHMSDS"."DISORDER_ARCHIVE" D
                JOIN "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" S ON D."LABNO" = S."LABNO"
                WHERE S."SUBMID"  = :submid
                  AND S."DTRECV" >= TO_DATE(:dateFrom, 'YYYY-MM-DD')
                  AND S."DTRECV"  < TO_DATE(:dateTo,   'YYYY-MM-DD') + 1
                  AND S."LABNO" NOT LIKE '_______8%'

                UNION ALL

                SELECT /*+ MATERIALIZE */
                    S."LABNO"        AS LABNO,
                    S."SUBMID"       AS SUBMID,
                    S."FNAME"        AS FNAME,
                    S."LNAME"        AS LNAME,
                    S."SPECTYPE"     AS SPECTYPE,
                    S."BIRTHHOSP"    AS BIRTHHOSP,
                    RSLT."MNEMONIC"  AS MNEMONIC,
                    'RESULT'         AS SOURCE_TABLE
                FROM "PHMSDS"."RESULT_ARCHIVE" RSLT
                JOIN "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" S ON RSLT."LABNO" = S."LABNO"
                WHERE S."SUBMID"  = :submid
                  AND S."DTRECV" >= TO_DATE(:dateFrom, 'YYYY-MM-DD')
                  AND S."DTRECV"  < TO_DATE(:dateTo,   'YYYY-MM-DD') + 1
                  AND S."LABNO" NOT LIKE '_______8%'
            )
            SELECT
                LABNO,
                MAX(SUBMID)    AS SUBMID,
                MAX(FNAME)     AS FNAME,
                MAX(LNAME)     AS LNAME,
                MAX(SPECTYPE)  AS SPECTYPE,
                CASE
                    WHEN MAX(SPECTYPE) = 20          THEN 'Initial'
                    WHEN MAX(SPECTYPE) IN (2, 3, 4)  THEN 'Repeat'
                    WHEN MAX(SPECTYPE) = 5           THEN 'Monitoring'
                    WHEN MAX(SPECTYPE) = 87          THEN 'Unfit'
                    ELSE 'Other'
                END AS SPECTYPE_LABEL,
                MAX(BIRTHHOSP) AS BIRTHHOSP,
                CASE
                    WHEN MAX(BIRTHHOSP) = TO_CHAR(MAX(SUBMID))  THEN 'INBORN'
                    WHEN MAX(BIRTHHOSP) = 'HOME'                THEN 'HOMEBIRTH'
                    WHEN MAX(BIRTHHOSP) = 'UNK'                 THEN 'UNKNOWN'
                    WHEN MAX(BIRTHHOSP) NOT IN ('HOME', 'UNK')
                     AND MAX(BIRTHHOSP) <> TO_CHAR(MAX(SUBMID)) THEN 'HOB'
                    ELSE 'OTHER'
                END AS BIRTH_CATEGORY,
                CASE
                    WHEN MAX(CASE WHEN MNEMONIC NOT IN ('FA', '*FA', 'NFT', 'E106', 'NFTR', 'ABN') THEN 1 ELSE 0 END) = 0
                    THEN 'NORMAL'
                    ELSE MAX(CASE
                        WHEN MNEMONIC = 'E100' THEN 'MISSING_INFORMATION'
                        WHEN MNEMONIC = 'E102' THEN 'LESS_THAN_24_HOURS'
                        WHEN MNEMONIC = 'E108' THEN 'INSUFFICIENT'
                        WHEN MNEMONIC = 'E109' THEN 'CONTAMINATED'
                        WHEN MNEMONIC = 'DE'   THEN 'DATA_ERASURES'
                        ELSE NULL
                    END)
                END AS ISSUE_DESCRIPTION
            FROM COMBINED
            GROUP BY LABNO
            ORDER BY LABNO ASC
        `;

        const result = await connection.execute(
            query,
            { submid, dateFrom, dateTo },
            { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 1000, maxRows: 0 }
        );

        const executionTime = Date.now() - startTime;
        console.log(`[Lab Details] ${result.rows.length} rows in ${executionTime}ms`);

        if (!result.rows || result.rows.length === 0) {
            return res.json({
                success: true,
                message: 'No lab details found for the specified criteria',
                data: [],
                executionTime: `${executionTime}ms`,
                recordCount: 0,
                filters: { submid, dateFrom, dateTo },
            });
        }

        res.json({
            success: true,
            data: result.rows,
            executionTime: `${executionTime}ms`,
            recordCount: result.rows.length,
            filters: { submid, dateFrom, dateTo },
        });

    } catch (err) {
        console.error('❌ Database error:', err);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching lab details',
            message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
            executionTime: `${Date.now() - startTime}ms`,
        });
    } finally {
        if (connection) {
            try { await connection.close(); }
            catch (e) { console.error('❌ Error closing connection:', e); }
        }
    }
};

// ============================================================================
// CRYSTAL REPORTS GENERATION
// ============================================================================

/**
 * GET /api/pdo/nsf-performance/generate-report
 * Query params: submid, dateFrom, dateTo
 *
 * Strategy:
 *   1. Cache check — if the PDF is fresh (< CACHE_TTL_MS), stream it immediately.
 *   2. Run the VB.NET exe; on success, move the file to OUTPUT_DIR and stream.
 *   3. Browser receives Cache-Control: private, max-age=300 so it doesn't
 *      re-download on every tab open or PDF viewer remount.
 */
exports.generateNsfReport = async (req, res) => {
    const { submid, dateFrom, dateTo } = req.query;
    const requestId = generateRequestId();
    let connection;

    console.log(`[${requestId}] ============================================`);
    console.log(`[${requestId}] Crystal Reports PDF Generation Request`);
    console.log(`[${requestId}] SUBMID: ${submid} | ${dateFrom} → ${dateTo}`);
    console.log(`[${requestId}] ============================================`);

    try {
        // ── Validate ─────────────────────────────────────────────────────────
        if (!submid || !dateFrom || !dateTo) {
            return res.status(400).json({
                error: 'Missing required parameters: submid, dateFrom, dateTo',
                requestId,
            });
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateFrom) || !dateRegex.test(dateTo)) {
            return res.status(400).json({
                error: 'Invalid date format. Use YYYY-MM-DD.',
                requestId,
            });
        }

        if (new Date(dateFrom) > new Date(dateTo)) {
            return res.status(400).json({
                error: 'Start date cannot be after end date.',
                requestId,
            });
        }

        const fileName  = buildReportFileName(submid, dateFrom, dateTo);
        const finalPath = path.join(REPORT_CONFIG.OUTPUT_DIR, fileName);

        // ── Cache check — serve existing file if it's still fresh ─────────────
        if (fs.existsSync(finalPath)) {
            const { mtimeMs, size } = fs.statSync(finalPath);
            if (Date.now() - mtimeMs < REPORT_CONFIG.CACHE_TTL_MS) {
                console.log(`[${requestId}] Cache hit — serving: ${fileName}`);
                res.setHeader('Content-Type',        'application/pdf');
                res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
                res.setHeader('Content-Length',      size);
                res.setHeader('Cache-Control',       'private, max-age=300');
                res.setHeader('X-Request-ID',        requestId);
                res.setHeader('X-Report-Source',     'cache');
                fs.createReadStream(finalPath).pipe(res);
                return;
            }
            console.log(`[${requestId}] Cache expired — regenerating`);
        }

        // ── DB connection — fetch facility name ───────────────────────────────
        const oraclePool = req.app.locals.oracleDb;
        if (!oraclePool) {
            return res.status(500).json({
                error: 'Database connection not available',
                requestId,
            });
        }

        connection = await oraclePool.getConnection();
        console.log(`[${requestId}] DB connection established`);

        const facilityResult = await connection.execute(
            `SELECT DESCR1 AS FACILITY_NAME
             FROM PHMSDS.REF_PROVIDER_ADDRESS
             WHERE PROVIDERID = :submid AND ADRS_TYPE = '1'`,
            { submid },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const facilityName = facilityResult.rows?.[0]?.FACILITY_NAME || '';
        console.log(`[${requestId}] Facility: ${facilityName}`);

        // ── Run exe ──────────────────────────────────────────────────────────
        console.log(`[${requestId}] Running Crystal Reports exe...`);
        const exeOutputPath = await runCrystalReportExe(requestId, submid, dateFrom, dateTo);

        // ── Move to final destination ─────────────────────────────────────────
        if (fs.existsSync(finalPath)) {
            try { fs.unlinkSync(finalPath); } catch (_) { /* ignore */ }
        }

        // Copy instead of rename — exe may be on a different drive/mount
        fs.copyFileSync(exeOutputPath, finalPath);
        try { fs.unlinkSync(exeOutputPath); } catch (_) { /* best-effort cleanup */ }

        console.log(`[${requestId}] Saved to: ${finalPath}`);

        // ── Stream to client ──────────────────────────────────────────────────
        const { size } = fs.statSync(finalPath);
        console.log(`[${requestId}] Streaming PDF (${size} bytes)`);

        res.setHeader('Content-Type',        'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        res.setHeader('Content-Length',      size);
        res.setHeader('Cache-Control',       'private, max-age=300');
        res.setHeader('X-Request-ID',        requestId);
        res.setHeader('X-Report-Generator',  'Crystal Reports');
        res.setHeader('X-Report-Source',     'generated');
        res.setHeader('X-File-Size',         size.toString());

        const stream = fs.createReadStream(finalPath);
        stream.pipe(res);

        stream.on('end',   () => console.log(`[${requestId}] ✅ PDF streamed successfully`));
        stream.on('error', (err) => {
            console.error(`[${requestId}] ❌ Stream error:`, err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error streaming PDF', requestId });
            }
        });

    } catch (error) {
        console.error(`[${requestId}] ❌ Error:`, error.message);
        console.error(`[${requestId}] ❌ Stack:`, error.stack);

        if (error.code === 'ENOENT') {
            return res.status(500).json({
                error: 'Crystal Reports executable not found.',
                details: 'Ensure CrystalReportExporter.exe is in backend/CrystalReportExporter/',
                requestId,
            });
        }
        if (error.killed) {
            return res.status(500).json({
                error: 'Crystal Reports generation timed out (exceeded 3 minutes).',
                requestId,
            });
        }

        if (!res.headersSent) {
            res.status(500).json({
                error: 'Internal server error during PDF generation',
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                requestId,
            });
        }
    } finally {
        if (connection) {
            try { await connection.close(); console.log(`[${requestId}] DB connection closed`); }
            catch (e) { console.error(`[${requestId}] Error closing connection:`, e); }
        }
    }
};

// ============================================================================
// REPORT FILE MANAGEMENT
// ============================================================================

/**
 * GET /api/pdo/nsf-performance/reports
 * List all available PDF reports.
 */
exports.listReports = async (req, res) => {
    try {
        if (!fs.existsSync(REPORT_CONFIG.OUTPUT_DIR)) {
            return res.status(404).json({
                error: 'Reports directory not found',
                expectedPath: REPORT_CONFIG.OUTPUT_DIR,
            });
        }

        const files = fs.readdirSync(REPORT_CONFIG.OUTPUT_DIR)
            .filter(f => f.endsWith('.pdf'))
            .map(f => {
                const stats = fs.statSync(path.join(REPORT_CONFIG.OUTPUT_DIR, f));
                return { name: f, size: stats.size, created: stats.birthtime, modified: stats.mtime };
            })
            .sort((a, b) => b.modified - a.modified);

        res.json({
            reportsDirectory: REPORT_CONFIG.OUTPUT_DIR,
            totalFiles: files.length,
            files,
            generator: 'Crystal Reports',
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        res.status(500).json({ error: error.message, timestamp: new Date().toISOString() });
    }
};

/**
 * GET /api/pdo/nsf-performance/reports/:filename
 * Serve a specific report file.
 */
exports.serveReport = async (req, res) => {
    const requestId = generateRequestId();
    const { filename } = req.params;

    console.log(`[${requestId}] Serving report: ${filename}`);

    try {
        const filePath    = path.join(REPORT_CONFIG.OUTPUT_DIR, filename);
        const resolvedFile = path.resolve(filePath);
        const resolvedDir  = path.resolve(REPORT_CONFIG.OUTPUT_DIR);

        if (!resolvedFile.startsWith(resolvedDir)) {
            console.warn(`[${requestId}] Directory traversal attempt blocked`);
            return res.status(403).json({ error: 'Access denied' });
        }
        if (!filename.toLowerCase().endsWith('.pdf')) {
            return res.status(400).json({ error: 'Only PDF files allowed' });
        }
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const { size } = fs.statSync(filePath);
        res.setHeader('Content-Type',        'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.setHeader('Content-Length',      size);
        res.setHeader('Cache-Control',       'private, max-age=300');
        res.setHeader('X-Report-Generator',  'Crystal Reports');

        fs.createReadStream(filePath).pipe(res);
        console.log(`[${requestId}] ✅ Report served`);

    } catch (error) {
        console.error(`[${requestId}] ❌ Error:`, error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /api/pdo/nsf-performance/report-health
 */
exports.reportSystemHealth = async (req, res) => {
    try {
        console.log('🏥 Running Crystal Reports health check...');

        const exeDir          = path.join(__dirname, '..', '..', 'CrystalReportExporter');
        const exePath         = path.join(exeDir, 'CrystalReportExporter.exe');
        const templatePath    = path.join(exeDir, 'Reports', 'nsf_performance.rpt');
        const exeReportsDir   = path.join(exeDir, 'Reports');

        const outputDirExists    = fs.existsSync(REPORT_CONFIG.OUTPUT_DIR);
        const tempDirExists      = fs.existsSync(REPORT_CONFIG.TEMP_DIR);
        const exeDirExists       = fs.existsSync(exeDir);
        const exeExists          = fs.existsSync(exePath);
        const templateExists     = fs.existsSync(templatePath);
        const exeReportsDirExists = fs.existsSync(exeReportsDir);

        const issues = [];
        if (!exeExists)           issues.push(`VB.NET executable not found: ${exePath}`);
        if (!outputDirExists)     issues.push(`Output directory not found: ${REPORT_CONFIG.OUTPUT_DIR}`);
        if (!exeDirExists)        issues.push(`CrystalReportExporter directory not found: ${exeDir}`);
        if (!templateExists)      issues.push(`Crystal Reports template not found: ${templatePath}`);
        if (!exeReportsDirExists) issues.push(`VB.NET Reports directory not found: ${exeReportsDir}`);

        const recentFiles = outputDirExists
            ? fs.readdirSync(REPORT_CONFIG.OUTPUT_DIR).filter(f => f.endsWith('.pdf')).slice(0, 5)
            : [];

        res.status(200).json({
            status:           issues.length === 0 ? 'ok' : 'error',
            reportGenerator:  'Crystal Reports (VB.NET Executable)',
            vbnetExecutable:  exeExists ? 'available' : 'not available',
            cacheTtlMs:       REPORT_CONFIG.CACHE_TTL_MS,
            directories: {
                output:               { path: REPORT_CONFIG.OUTPUT_DIR, exists: outputDirExists },
                temp:                 { path: REPORT_CONFIG.TEMP_DIR,   exists: tempDirExists },
                crystalReportExporter:{ path: exeDir,                   exists: exeDirExists },
                vbnetReports:         { path: exeReportsDir,            exists: exeReportsDirExists },
            },
            executable: { path: exePath,     exists: exeExists,    name: 'CrystalReportExporter.exe' },
            template:   { path: templatePath, exists: templateExists, name: 'nsf_performance.rpt' },
            recentFiles,
            issues: issues.length > 0 ? issues : null,
            configuration: REPORT_CONFIG,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('❌ Health check error:', error);
        res.status(200).json({
            status:          'error',
            reportGenerator: 'Crystal Reports (VB.NET Executable)',
            vbnetExecutable: 'unknown',
            error:           error.message,
            timestamp:       new Date().toISOString(),
        });
    }
};