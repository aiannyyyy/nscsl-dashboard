// controllers/IntranetController/helpers/fileProtection.js
// Handles PDF/DOCX/XLSX password protection for intranet file downloads
// Used by both fileController and categoryController

const path     = require('path');
const fs       = require('fs');
const { execSync } = require('child_process');

// Password managers from utils/intranet/
const pdfPasswordManager   = require('../../../utils/intranet/passwordManager');
const wordPasswordManager  = require('../../../utils/intranet/wordPasswordManager');
const excelPasswordManager = require('../../../utils/intranet/excelPasswordManager');
const { stampPdf, requiresStamp } = require('../../../utils/intranet/pdfStamp');

// Temp directory for secured files
const TEMP_DIR = path.join(__dirname, '../../../temp-intranet');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    console.log(`📁 Created intranet temp directory: ${TEMP_DIR}`);
}

// ============================================
// CONTENT TYPES MAP
// ============================================
const CONTENT_TYPES = {
    'pdf':  'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'doc':  'application/msword',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xls':  'application/vnd.ms-excel'
};

// ============================================
// PROTECTED FILE TYPES
// ============================================
const PROTECTED_TYPES = ['pdf', 'docx', 'doc', 'xlsx', 'xls'];

// ============================================
// CHECK IF FILE NEEDS PROTECTION
// Skip protection for preview requests
// ============================================
function needsProtection(fileType, isPreview = false) {
    return PROTECTED_TYPES.includes(fileType?.toLowerCase()) && !isPreview;
}

// ============================================
// APPLY PDF PROTECTION
// Tries native qpdf first, falls back to node-qpdf2
// ============================================
async function applyPdfProtection(inputPath, outputPath, ownerPassword) {
    // Try native qpdf command first
    const inputFile  = inputPath.replace(/\\/g, '/');
    const outputFile = outputPath.replace(/\\/g, '/');

    const qpdfCommand = `qpdf --encrypt "" "${ownerPassword}" 256 --print=full --modify=none --extract=n --annotate=n --form=n --assemble=n -- "${inputFile}" "${outputFile}"`;

    console.log('📋 [Protection] Attempting native qpdf...');

    try {
        execSync(qpdfCommand, {
            encoding:    'utf8',
            stdio:       ['pipe', 'pipe', 'pipe'],
            windowsHide: true,
            shell:       true,
            timeout:     30000
        });

        if (fs.existsSync(outputPath)) {
            console.log('✅ [Protection] PDF protected via native qpdf');
            return { success: true, method: 'native-qpdf' };
        }
    } catch (execError) {
        console.warn('⚠️ [Protection] Native qpdf failed, trying node-qpdf2...');
    }

    // Fallback to node-qpdf2
    try {
        const qpdf = require('node-qpdf2');
        await qpdf.encrypt({
            input:         inputPath,
            output:        outputPath,
            ownerPassword: ownerPassword,
            userPassword:  '',
            keyLength:     256,
            restrictions: {
                print:     'full',
                modify:    'none',
                extract:   'n',
                annotate:  'n',
                fillForms: 'n',
                assembly:  'n'
            }
        });

        if (fs.existsSync(outputPath)) {
            console.log('✅ [Protection] PDF protected via node-qpdf2');
            return { success: true, method: 'node-qpdf2' };
        }
    } catch (qpdf2Error) {
        console.error('❌ [Protection] Both PDF encryption methods failed:', qpdf2Error.message);
    }

    return { success: false, method: 'none' };
}

// ============================================
// APPLY STAMP TO PDF
// Applies document control stamp before encryption
// ============================================
async function applyPdfStamp(filePath, documentStatus, stampPlacement = 'every_page') {
    if (!requiresStamp(documentStatus)) return filePath;

    console.log(`🔏 [Protection] Applying "${documentStatus}" stamp...`);

    const timestamp    = Date.now();
    const randomStr    = Math.random().toString(36).substring(7);
    const stampedPath  = path.join(TEMP_DIR, `stamped_${timestamp}_${randomStr}.pdf`);

    try {
        const originalBuffer = fs.readFileSync(filePath);
        const stampedBuffer  = await stampPdf(originalBuffer, documentStatus, stampPlacement);
        fs.writeFileSync(stampedPath, stampedBuffer);
        console.log('✅ [Protection] Stamp applied');
        return stampedPath; // Return new path for encryption input
    } catch (stampError) {
        console.error('❌ [Protection] Stamp failed:', stampError.message);
        throw new Error(`PDF stamp failed: ${stampError.message}`);
    }
}

// ============================================
// PROTECT AND SEND FILE
// Main function called by fileController and categoryController
// Handles PDF/DOCX/XLSX protection and sends to client
// ============================================
async function protectAndSendFile(res, file, filePath, options = {}) {
    const {
        userId      = null,
        isPreview   = false,
        fileIdField = 'id',       // 'id' for regular files, 'id' for category files
        fileNameField = 'file_name', // field name for the filename
        documentStatus = 'none',
        stampPlacement = 'every_page'
    } = options;

    const fileType     = file.file_type ? file.file_type.toLowerCase() : '';
    const fileName     = file[fileNameField] || file.file_name || file.name || 'download';
    const fileId       = file[fileIdField]   || file.id;

    // ── PDF PREVIEW: stamp the file (no encryption) ──────────
    // Previews are served unencrypted via serveFileDirectly, but the
    // stamp itself is a separate step from encryption — so we still need
    // to burn the stamp into the PDF before sending it, even on preview.
    if (isPreview && fileType === 'pdf' && requiresStamp(documentStatus)) {
        let previewStampedPath = null;
        try {
            previewStampedPath = await applyPdfStamp(filePath, documentStatus, stampPlacement);
            serveFileDirectly(res, previewStampedPath, fileName, file.mime_type, isPreview);
        } catch (stampError) {
            console.error('❌ [Protection] Preview stamp failed, serving raw file:', stampError.message);
            serveFileDirectly(res, filePath, fileName, file.mime_type, isPreview);
        } finally {
            if (previewStampedPath && previewStampedPath !== filePath) {
                setTimeout(() => cleanupTempFile(previewStampedPath), 10000);
            }
        }
        return;
    }

    // Non-protected or preview (non-pdf / no stamp needed) — serve directly
    if (!needsProtection(fileType, isPreview)) {
        console.log('✅ [Protection] Non-protected file, serving directly');
        return serveFileDirectly(res, filePath, fileName, file.mime_type, isPreview);
    }

    console.log(`🔒 [Protection] ===== ${fileType.toUpperCase()} PROTECTION =====`);

    const timestamp       = Date.now();
    const randomStr       = Math.random().toString(36).substring(7);
    const fileExt         = path.extname(fileName);
    const securedFilePath = path.join(TEMP_DIR, `secured_${timestamp}_${randomStr}${fileExt}`);

    let protectionSuccess = false;
    let encryptionMethod  = 'none';
    let stampedTempPath   = null;

    try {
        // ── PDF ──────────────────────────────────────────────
        if (fileType === 'pdf') {
            let pdfInputPath = filePath;

            // Apply stamp first if needed
            if (requiresStamp(documentStatus)) {
                stampedTempPath = await applyPdfStamp(filePath, documentStatus, stampPlacement);
                pdfInputPath    = stampedTempPath;
            }

            const ownerPassword = 'nscsl';
            pdfPasswordManager.savePassword(fileId, fileName, ownerPassword, userId || file.created_by);

            const result = await applyPdfProtection(pdfInputPath, securedFilePath, ownerPassword);
            protectionSuccess = result.success;
            encryptionMethod  = result.method;
        }

        // ── DOCX / DOC ───────────────────────────────────────
        else if (fileType === 'docx' || fileType === 'doc') {
            const ownerPassword = wordPasswordManager.generateFixedPassword(fileId);

            try {
                await wordPasswordManager.protectWordDocument(filePath, securedFilePath, ownerPassword);

                if (fs.existsSync(securedFilePath)) {
                    wordPasswordManager.savePassword(fileId, fileName, ownerPassword, userId || file.created_by);
                    protectionSuccess = true;
                    encryptionMethod  = 'officecrypto-tool';
                    console.log('✅ [Protection] Word protected');
                }
            } catch (wordError) {
                console.error('❌ [Protection] Word encryption failed:', wordError.message);
            }
        }

        // ── XLSX / XLS ───────────────────────────────────────
        else if (fileType === 'xlsx' || fileType === 'xls') {
            const ownerPassword = excelPasswordManager.generateFixedPassword(fileId);

            try {
                await excelPasswordManager.protectExcelDocument(filePath, securedFilePath, ownerPassword);

                if (fs.existsSync(securedFilePath)) {
                    excelPasswordManager.savePassword(fileId, fileName, ownerPassword, userId || file.created_by);
                    protectionSuccess = true;
                    encryptionMethod  = 'officecrypto-tool';
                    console.log('✅ [Protection] Excel protected');
                }
            } catch (excelError) {
                console.error('❌ [Protection] Excel encryption failed:', excelError.message);
            }
        }

        // ── SEND PROTECTED FILE ──────────────────────────────
        if (!protectionSuccess || !fs.existsSync(securedFilePath)) {
            throw new Error(`${fileType.toUpperCase()} protection failed — output file not created`);
        }

        const securedSize = fs.statSync(securedFilePath).size;
        if (securedSize < 1000) {
            throw new Error(`Secured file is suspiciously small (${securedSize} bytes)`);
        }

        const securedBuffer = fs.readFileSync(securedFilePath);
        const contentType   = CONTENT_TYPES[fileType] || 'application/octet-stream';
        const disposition   = isPreview ? 'inline' : 'attachment';

        res.setHeader('Content-Type',        contentType);
        res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(fileName)}"`);
        res.setHeader('Content-Length',      securedBuffer.length);
        res.setHeader('Cache-Control',       'private, no-cache, no-store, must-revalidate');
        res.setHeader('X-File-Protection',   'password-protected');
        res.setHeader('X-Encryption-Method', encryptionMethod);

        console.log(`📤 [Protection] Sending secured ${fileType.toUpperCase()} (${securedBuffer.length} bytes)`);
        res.send(securedBuffer);

        // Cleanup secured temp file after 10s
        setTimeout(() => cleanupTempFile(securedFilePath), 10000);

        console.log(`✅ [Protection] ===== ${fileType.toUpperCase()} DONE =====`);

    } catch (protectionError) {
        console.error(`❌ [Protection] FAILED:`, protectionError.message);
        cleanupTempFile(securedFilePath);

        if (!res.headersSent) {
            return res.status(500).json({
                error:   `${fileType.toUpperCase()} protection failed — download aborted`,
                message: `The system cannot apply security restrictions to this file. Please contact the administrator.`,
                details: protectionError.message
            });
        }
    } finally {
        // Cleanup stamped temp file after 12s
        if (stampedTempPath) {
            setTimeout(() => cleanupTempFile(stampedTempPath), 12000);
        }
    }
}

// ============================================
// SERVE PDF PREVIEW WITH STAMP (no encryption)
// ============================================
async function serveStampedPdfPreview(res, filePath, file) {
    const documentStatus = file.document_status;
    const stampPlacement = file.stamp_placement || 'every_page';
    const fileName       = file.file_name || file.name || 'preview.pdf';

    if (!requiresStamp(documentStatus)) {
        return serveFileDirectly(res, filePath, fileName, 'application/pdf', true);
    }

    console.log(`🔏 [Protection] Preview stamp: applying "${documentStatus}"...`);

    try {
        const pdfBuffer     = fs.readFileSync(filePath);
        const stampedBuffer = await stampPdf(pdfBuffer, documentStatus, stampPlacement);

        res.setHeader('Content-Type',        'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
        res.setHeader('Content-Length',      stampedBuffer.length);
        res.end(stampedBuffer);

        console.log('✅ [Protection] Stamped PDF preview sent');
    } catch (stampError) {
        console.error('❌ [Protection] Preview stamp failed:', stampError.message);
        // Fall through to raw file
        serveFileDirectly(res, filePath, fileName, 'application/pdf', true);
    }
}

// ============================================
// SERVE FILE DIRECTLY (no protection)
// For non-protected file types
// ============================================
function serveFileDirectly(res, filePath, fileName, mimeType = 'application/octet-stream', isPreview = false) {
    const disposition = isPreview ? 'inline' : 'attachment';
    const fileSize    = fs.statSync(filePath).size;

    res.setHeader('Content-Type',        mimeType);
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length',      fileSize);

    if (isPreview) {
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Accept-Ranges', 'bytes');
    }

    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (err) => {
        console.error('💥 [Protection] File stream error:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error reading file: ' + err.message });
        }
    });
    fileStream.pipe(res);
}

// ============================================
// CLEANUP TEMP FILE
// ============================================
function cleanupTempFile(filePath) {
    try {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🧹 [Protection] Cleaned up: ${path.basename(filePath)}`);
        }
    } catch (err) {
        console.error('⚠️ [Protection] Cleanup failed:', err.message);
    }
}

// ============================================
// EXPORTS
// ============================================
module.exports = {
    protectAndSendFile,
    serveStampedPdfPreview,
    serveFileDirectly,
    needsProtection,
    applyPdfProtection,
    applyPdfStamp,
    cleanupTempFile,
    PROTECTED_TYPES,
    CONTENT_TYPES,
    TEMP_DIR
};