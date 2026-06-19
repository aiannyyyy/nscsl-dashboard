// controllers/IntranetController/fileController.js

const path      = require('path');
const fs        = require('fs');
const util      = require('util');
const validator = require('validator');
const archiver  = require('archiver');

const unlinkAsync = util.promisify(fs.unlink);

const { inhousePool }                          = require('../../config/database');
const { validateUser, getUserDetails, addActivityLog, sanitizeInput } = require('./helpers/intranetHelpers');
const { protectAndSendFile, serveStampedPdfPreview, serveFileDirectly, needsProtection } = require('./helpers/fileProtection');
const { uploadSingle, uploadMultiple, formatFileSize, validateFilePath, cleanupFiles, UPLOADS_BASE } = require('../../config/intranetMulterConfig');

const pdfPasswordManager = require('../../utils/intranet/passwordManager');

// ============================================
// CREATE FOLDER
// POST /api/intranet/files/folders
// ============================================
exports.createFolder = async (req, res) => {
    const { name, parent_id, created_by } = req.body;

    try {
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Folder name is required' });
        }

        if (!created_by) {
            return res.status(400).json({ error: 'created_by user ID is required' });
        }

        const sanitizedName = sanitizeInput(name);

        const userExists = await validateUser(created_by);
        if (!userExists) {
            return res.status(400).json({ error: 'Invalid created_by user' });
        }

        if (parent_id) {
            const [parentCheck] = await inhousePool.query('SELECT id FROM folders WHERE id = ?', [parent_id]);
            if (parentCheck.length === 0) {
                return res.status(400).json({ error: 'Parent folder not found' });
            }
        }

        const duplicateCheck = parent_id
            ? await inhousePool.query('SELECT id FROM folders WHERE name = ? AND parent_id = ?', [sanitizedName, parent_id])
            : await inhousePool.query('SELECT id FROM folders WHERE name = ? AND parent_id IS NULL', [sanitizedName]);

        if (duplicateCheck[0].length > 0) {
            return res.status(400).json({ error: 'A folder with this name already exists in the same location' });
        }

        const [result] = await inhousePool.query(
            `INSERT INTO folders (name, parent_id, created_by, updated_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, NOW(), NOW())`,
            [sanitizedName, parent_id || null, created_by, created_by]
        );

        const physicalFolderPath = path.join(UPLOADS_BASE, `folder-${result.insertId}`);
        fs.mkdirSync(physicalFolderPath, { recursive: true });

        const userDetails = await getUserDetails(created_by);

        await addActivityLog(created_by, 'create', 'folder', result.insertId, sanitizedName);

        res.json({
            message:    'Folder created successfully',
            folderId:   result.insertId,
            folderName: sanitizedName,
            createdBy:  userDetails,
            parentId:   parent_id || null
        });

    } catch (err) {
        console.error('💥 Error creating folder:', err);
        res.status(500).json({ error: 'Failed to create folder: ' + err.message });
    }
};

// ============================================
// GET ROOT FILES/FOLDERS
// GET /api/intranet/files/list
// ============================================
exports.getList = async (req, res) => {
    try {
        const [files] = await inhousePool.query(
            `SELECT f.*, u.name AS created_by_name, u2.name AS updated_by_name
             FROM files f
             LEFT JOIN ${process.env.DATABASE_DB}.user u  ON f.created_by  = u.user_id
             LEFT JOIN ${process.env.DATABASE_DB}.user u2 ON f.updated_by  = u2.user_id
             WHERE folder_id IS NULL
             ORDER BY f.file_name ASC`
        );

        const [folders] = await inhousePool.query(
            `SELECT f.*, u.name AS created_by_name, u2.name AS updated_by_name
             FROM folders f
             LEFT JOIN ${process.env.DATABASE_DB}.user u  ON f.created_by  = u.user_id
             LEFT JOIN ${process.env.DATABASE_DB}.user u2 ON f.updated_by  = u2.user_id
             WHERE parent_id IS NULL
             ORDER BY f.name ASC`
        );

        res.json({ folders: folders || [], files: files || [], location: 'root' });

    } catch (err) {
        console.error('💥 Error getting root files/folders:', err);
        res.status(500).json({ error: 'Failed to get files/folders: ' + err.message });
    }
};

// ============================================
// GET FOLDER CONTENTS
// GET /api/intranet/files/list/:folderId
// ============================================
exports.getFolderContents = async (req, res) => {
    const { folderId } = req.params;

    try {
        const [folderCheck] = await inhousePool.query('SELECT * FROM folders WHERE id = ?', [folderId]);
        if (folderCheck.length === 0) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        const folderInfo = folderCheck[0];

        const [files] = await inhousePool.query(
            `SELECT f.*, u.name AS created_by_name, u2.name AS updated_by_name
             FROM files f
             LEFT JOIN ${process.env.DATABASE_DB}.user u  ON f.created_by = u.user_id
             LEFT JOIN ${process.env.DATABASE_DB}.user u2 ON f.updated_by = u2.user_id
             WHERE folder_id = ?
             ORDER BY f.file_name ASC`,
            [folderId]
        );

        const [folders] = await inhousePool.query(
            `SELECT f.*, u.name AS created_by_name, u2.name AS updated_by_name
             FROM folders f
             LEFT JOIN ${process.env.DATABASE_DB}.user u  ON f.created_by = u.user_id
             LEFT JOIN ${process.env.DATABASE_DB}.user u2 ON f.updated_by = u2.user_id
             WHERE parent_id = ?
             ORDER BY f.name ASC`,
            [folderId]
        );

        res.json({ folders: folders || [], files: files || [], currentFolder: folderInfo, location: folderInfo.name });

    } catch (err) {
        console.error('💥 Error getting folder contents:', err);
        res.status(500).json({ error: 'Failed to get folder contents: ' + err.message });
    }
};

// ============================================
// GET FOLDER PATH (BREADCRUMB)
// GET /api/intranet/files/path/:folderId
// ============================================
exports.getFolderPath = async (req, res) => {
    const { folderId } = req.params;

    try {
        const breadcrumb = [];
        let currentId    = folderId;

        while (currentId) {
            const [folderResult] = await inhousePool.query(
                'SELECT id, name, parent_id FROM folders WHERE id = ?',
                [currentId]
            );
            if (folderResult.length === 0) break;

            const folder = folderResult[0];
            breadcrumb.unshift(folder);
            currentId = folder.parent_id;
        }

        res.json({ path: breadcrumb });

    } catch (err) {
        console.error('💥 Error getting folder path:', err);
        res.status(500).json({ error: 'Failed to get folder path: ' + err.message });
    }
};

// ============================================
// UPLOAD SINGLE FILE
// POST /api/intranet/files/upload
// ============================================
exports.uploadFile = async (req, res) => {
    const { folder_id, created_by } = req.body;

    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        if (!validateFilePath(file.path)) {
            await unlinkAsync(file.path).catch(() => {});
            return res.status(400).json({ error: 'Invalid file path' });
        }

        if (!created_by) {
            await unlinkAsync(file.path).catch(() => {});
            return res.status(400).json({ error: 'created_by user ID is required' });
        }

        const userExists = await validateUser(created_by);
        if (!userExists) {
            await unlinkAsync(file.path).catch(() => {});
            return res.status(400).json({ error: 'Invalid created_by user' });
        }

        if (folder_id) {
            const [folderCheck] = await inhousePool.query('SELECT id FROM folders WHERE id = ?', [folder_id]);
            if (folderCheck.length === 0) {
                await unlinkAsync(file.path).catch(() => {});
                return res.status(400).json({ error: 'Folder not found' });
            }
        }

        // Check for duplicate
        const duplicateCheck = folder_id
            ? await inhousePool.query('SELECT id, file_name FROM files WHERE file_name = ? AND folder_id = ?', [file.originalname, folder_id])
            : await inhousePool.query('SELECT id, file_name FROM files WHERE file_name = ? AND folder_id IS NULL', [file.originalname]);

        if (duplicateCheck[0].length > 0) {
            const existingFile = duplicateCheck[0][0];
            return res.status(409).json({
                conflict:           true,
                message:            `A file named "${file.originalname}" already exists in this location.`,
                existing_file:      { id: existingFile.id, file_name: existingFile.file_name },
                uploaded_file:      { temp_path: file.path, file_name: file.originalname, file_size: file.size, file_type: path.extname(file.originalname).substring(1).toLowerCase() },
                available_strategies: ['overwrite', 'version', 'skip'],
                hint:               'Resubmit with conflict_strategy and temp_path to resolve'
            });
        }

        const document_status = req.body.document_status || 'none';
        const stamp_placement = req.body.stamp_placement || 'every_page';

        const [result] = await inhousePool.query(
            `INSERT INTO files (folder_id, file_name, file_path, file_type, file_size, document_status, stamp_placement, created_by, updated_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [folder_id || null, file.originalname, file.path, path.extname(file.originalname).substring(1).toLowerCase(), file.size, document_status, stamp_placement, created_by, created_by]
        );

        const userDetails = await getUserDetails(created_by);

        await addActivityLog(created_by, 'upload', 'file', result.insertId, file.originalname, JSON.stringify({ size: file.size, type: file.mimetype }));

        res.json({
            message:           'File uploaded successfully',
            fileId:            result.insertId,
            fileName:          file.originalname,
            fileSize:          file.size,
            fileSizeFormatted: formatFileSize(file.size),
            fileType:          path.extname(file.originalname).substring(1).toLowerCase(),
            createdBy:         userDetails,
            folderId:          folder_id || null
        });

    } catch (err) {
        console.error('💥 Error uploading file:', err);
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            await unlinkAsync(req.file.path).catch(() => {});
        }
        res.status(500).json({ error: 'Failed to upload file: ' + err.message });
    }
};

// ============================================
// RESOLVE UPLOAD CONFLICT
// POST /api/intranet/files/upload/resolve
// ============================================
exports.resolveUploadConflict = async (req, res) => {
    const { conflict_strategy, temp_path, file_name, file_size, file_type, folder_id, created_by, existing_file_id } = req.body;

    try {
        if (!conflict_strategy) return res.status(400).json({ error: 'conflict_strategy is required' });
        if (!temp_path)         return res.status(400).json({ error: 'temp_path is required' });
        if (!created_by)        return res.status(400).json({ error: 'created_by is required' });

        const userExists = await validateUser(created_by);
        if (!userExists) {
            await unlinkAsync(temp_path).catch(() => {});
            return res.status(400).json({ error: 'Invalid created_by user' });
        }

        if (!fs.existsSync(temp_path)) {
            return res.status(400).json({ error: 'Uploaded file no longer exists. Please upload again.' });
        }

        const document_status = req.body.document_status || 'none';
        const stamp_placement = req.body.stamp_placement || 'every_page';

        // ── SKIP ──
        if (conflict_strategy === 'skip') {
            await unlinkAsync(temp_path).catch(() => {});
            return res.json({ message: 'Upload skipped.', skipped: true });
        }

        // ── OVERWRITE ──
        if (conflict_strategy === 'overwrite') {
            const [existingRows] = await inhousePool.query('SELECT * FROM files WHERE id = ?', [existing_file_id]);
            if (existingRows.length === 0) {
                await unlinkAsync(temp_path).catch(() => {});
                return res.status(404).json({ error: 'Existing file not found' });
            }
            const existingFile = existingRows[0];

            if (existingFile.file_path && fs.existsSync(existingFile.file_path)) {
                await unlinkAsync(existingFile.file_path).catch(() => {});
            }

            await inhousePool.query(
                `UPDATE files SET file_path = ?, file_size = ?, file_type = ?, document_status = ?, stamp_placement = ?, updated_by = ?, updated_at = NOW() WHERE id = ?`,
                [temp_path, file_size, file_type, document_status, stamp_placement, created_by, existing_file_id]
            );

            await addActivityLog(created_by, 'update', 'file', existing_file_id, file_name, JSON.stringify({ action: 'overwrite_upload' }));

            return res.json({ message: `"${file_name}" overwritten successfully.`, fileId: existing_file_id, fileName: file_name, strategy: 'overwrite' });
        }

        // ── VERSION ──
        if (conflict_strategy === 'version') {
            const [existingRows] = await inhousePool.query('SELECT * FROM files WHERE id = ?', [existing_file_id]);
            if (existingRows.length === 0) {
                await unlinkAsync(temp_path).catch(() => {});
                return res.status(404).json({ error: 'Existing file not found' });
            }

            const [versionRows] = await inhousePool.query(
                'SELECT MAX(version_number) as max_version FROM file_versions WHERE file_id = ?',
                [existing_file_id]
            );
            const versionNumber = (versionRows[0].max_version || 0) + 1;

            const ext             = path.extname(file_name);
            const baseName        = path.basename(file_name, ext);
            const versionedName   = `${baseName} (Version ${versionNumber})${ext}`;
            const targetFolder    = folder_id ? path.join(UPLOADS_BASE, `folder-${folder_id}`) : UPLOADS_BASE;
            fs.mkdirSync(targetFolder, { recursive: true });

            const versionedPhysical = `${Date.now()}-${versionedName.replace(/[^a-zA-Z0-9.\-()]/g, '_')}`;
            const versionedFilePath = folder_id ? path.join('uploads-intranet', `folder-${folder_id}`, versionedPhysical) : path.join('uploads-intranet', versionedPhysical);
            const resolvedPath      = path.join(process.cwd(), versionedFilePath);

            await fs.promises.rename(temp_path, resolvedPath);

            const [result] = await inhousePool.query(
                `INSERT INTO files (folder_id, file_name, file_path, file_type, file_size, document_status, stamp_placement, created_by, updated_by, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [folder_id || null, versionedName, versionedFilePath, file_type, file_size, document_status, stamp_placement, created_by, created_by]
            );

            await inhousePool.query(
                `INSERT INTO file_versions (file_id, version_number, file_name, file_path, file_size, file_type, document_status, stamp_placement, moved_from_folder_id, created_by, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [existing_file_id, versionNumber, versionedName, versionedFilePath, file_size, file_type, document_status, stamp_placement, folder_id || null, created_by, `Version ${versionNumber} — uploaded alongside existing file`]
            );

            await addActivityLog(created_by, 'upload', 'file', result.insertId, versionedName, JSON.stringify({ action: 'version_upload', original_file_id: existing_file_id, version_number: versionNumber }));

            return res.json({ message: `Saved as "${versionedName}" (version ${versionNumber}).`, fileId: result.insertId, fileName: versionedName, strategy: 'version', versionNumber });
        }

        return res.status(400).json({ error: `Unknown conflict_strategy: ${conflict_strategy}` });

    } catch (err) {
        console.error('💥 Error resolving upload conflict:', err);
        await unlinkAsync(temp_path).catch(() => {});
        return res.status(500).json({ error: 'Failed to resolve conflict: ' + err.message });
    }
};

// ============================================
// UPLOAD MULTIPLE FILES
// POST /api/intranet/files/upload/multiple
// ============================================
exports.uploadMultipleFiles = async (req, res) => {
    const { folder_id, created_by } = req.body;
    const uploadedFiles = [];
    const errors        = [];

    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const userExists = await validateUser(created_by);
        if (!userExists) {
            for (const file of req.files) {
                if (fs.existsSync(file.path)) await unlinkAsync(file.path).catch(() => {});
            }
            return res.status(400).json({ error: 'Invalid created_by user' });
        }

        if (folder_id) {
            const [folderCheck] = await inhousePool.query('SELECT id FROM folders WHERE id = ?', [folder_id]);
            if (folderCheck.length === 0) {
                for (const file of req.files) {
                    if (fs.existsSync(file.path)) await unlinkAsync(file.path).catch(() => {});
                }
                return res.status(400).json({ error: 'Folder not found' });
            }
        }

        for (const file of req.files) {
            try {
                const duplicateCheck = folder_id
                    ? await inhousePool.query('SELECT id FROM files WHERE file_name = ? AND folder_id = ?', [file.originalname, folder_id])
                    : await inhousePool.query('SELECT id FROM files WHERE file_name = ? AND folder_id IS NULL', [file.originalname]);

                if (duplicateCheck[0].length > 0) {
                    errors.push({ fileName: file.originalname, error: 'File already exists' });
                    await unlinkAsync(file.path).catch(() => {});
                    continue;
                }

                const document_status = req.body.document_status || 'none';
                const stamp_placement = req.body.stamp_placement || 'every_page';

                const [result] = await inhousePool.query(
                    `INSERT INTO files (folder_id, file_name, file_path, file_type, file_size, document_status, stamp_placement, created_by, updated_by, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                    [folder_id || null, file.originalname, file.path, path.extname(file.originalname).substring(1).toLowerCase(), file.size, document_status, stamp_placement, created_by, created_by]
                );

                uploadedFiles.push({ fileId: result.insertId, fileName: file.originalname, fileSize: file.size, fileSizeFormatted: formatFileSize(file.size), fileType: path.extname(file.originalname).substring(1).toLowerCase() });

                await addActivityLog(created_by, 'upload', 'file', result.insertId, file.originalname);

            } catch (fileError) {
                console.error('💥 Error processing file:', file.originalname, fileError);
                errors.push({ fileName: file.originalname, error: fileError.message });
                if (fs.existsSync(file.path)) await unlinkAsync(file.path).catch(() => {});
            }
        }

        res.json({ message: `${uploadedFiles.length} files uploaded successfully`, uploadedFiles, errors: errors.length > 0 ? errors : undefined, totalUploaded: uploadedFiles.length, totalErrors: errors.length });

    } catch (err) {
        console.error('💥 Error in multiple upload:', err);
        if (req.files) {
            for (const file of req.files) {
                if (fs.existsSync(file.path)) await unlinkAsync(file.path).catch(() => {});
            }
        }
        res.status(500).json({ error: 'Failed to upload files: ' + err.message });
    }
};

// ============================================
// DOWNLOAD FILE
// GET /api/intranet/files/download/:id
// ============================================
exports.downloadFile = async (req, res) => {
    const { id }              = req.params;
    const { user_id, preview } = req.query;

    try {
        if (!user_id) return res.status(400).json({ error: 'user_id is required' });

        const [result] = await inhousePool.query('SELECT * FROM files WHERE id = ?', [id]);
        if (result.length === 0) return res.status(404).json({ error: 'File not found in database' });

        const file        = result[0];
        const isPreview   = preview === 'true';

        // Find physical file
        let actualFilePath = file.file_path;
        let fileExists     = false;

        const pathVariations = [
            file.file_path,
            path.resolve(file.file_path),
            path.join(process.cwd(), file.file_path),
            path.join(UPLOADS_BASE, path.basename(file.file_path)),
            path.join(__dirname, '../../../uploads-intranet', path.basename(file.file_path))
        ];

        for (const testPath of pathVariations) {
            if (fs.existsSync(testPath)) { actualFilePath = testPath; fileExists = true; break; }
        }

        if (!fileExists) {
            return res.status(404).json({ error: 'File missing on server', debug: { storedPath: file.file_path, fileName: file.file_name } });
        }

        const resolvedPath = path.resolve(actualFilePath);
        if (!resolvedPath.includes('uploads-intranet')) {
            return res.status(403).json({ error: 'Invalid file location' });
        }

        if (!isPreview) {
            await addActivityLog(user_id, 'download', 'file', file.id, file.file_name, 'Downloaded');
        }

        await protectAndSendFile(res, file, actualFilePath, {
            userId:         user_id,
            isPreview,
            fileNameField:  'file_name',
            documentStatus: file.document_status,
            stampPlacement: file.stamp_placement
        });

    } catch (err) {
        console.error('💥 Error downloading file:', err);
        if (!res.headersSent) res.status(500).json({ error: 'Download failed: ' + err.message });
    }
};

// ============================================
// PREVIEW FILE
// GET /api/intranet/files/preview/:id
// ============================================
exports.previewFile = async (req, res) => {
    const { id } = req.params;

    try {
        if (!id || !validator.isNumeric(id.toString())) {
            return res.status(400).json({ error: 'Invalid file ID' });
        }

        const [files] = await inhousePool.query('SELECT * FROM files WHERE id = ?', [id]);
        if (!files || files.length === 0) return res.status(404).json({ error: 'File not found' });

        const fileRecord = files[0];
        let filePath     = path.isAbsolute(fileRecord.file_path) ? fileRecord.file_path : path.resolve(fileRecord.file_path);

        if (!fs.existsSync(filePath)) {
            const altPaths = [
                path.join(process.cwd(), fileRecord.file_path),
                path.join(UPLOADS_BASE, path.basename(fileRecord.file_path))
            ];
            let found = null;
            for (const p of altPaths) { if (fs.existsSync(p)) { found = p; break; } }
            if (!found) return res.status(404).json({ error: 'File not found on disk' });
            filePath = found;
        }

        const ext = path.extname(fileRecord.file_name || '').toLowerCase();

        // Handle stamped PDF preview
        if (ext === '.pdf') {
            return await serveStampedPdfPreview(res, filePath, fileRecord);
        }

        // Handle range requests for video/audio
        const mimeTypes = {
            '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
            '.gif': 'image/gif',  '.webp': 'image/webp', '.pdf': 'application/pdf',
            '.mp4': 'video/mp4',  '.webm': 'video/webm', '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',  '.txt': 'text/plain; charset=utf-8',
            '.csv': 'text/csv; charset=utf-8'
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        const fileSize    = fs.statSync(filePath).size;
        const range       = req.headers.range;

        if (range && (contentType.startsWith('video/') || contentType.startsWith('audio/'))) {
            const parts    = range.replace(/bytes=/, '').split('-');
            const start    = parseInt(parts[0], 10);
            const end      = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;

            res.status(206);
            res.setHeader('Content-Range',  `bytes ${start}-${end}/${fileSize}`);
            res.setHeader('Content-Length', chunksize);
            res.setHeader('Content-Type',   contentType);
            fs.createReadStream(filePath, { start, end }).pipe(res);
            return;
        }

        res.setHeader('Content-Type',        contentType);
        res.setHeader('Content-Length',      fileSize);
        res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(fileRecord.file_name)}`);
        res.setHeader('Cache-Control',       'public, max-age=3600');
        res.setHeader('Accept-Ranges',       'bytes');

        fs.createReadStream(filePath).pipe(res);

    } catch (error) {
        console.error('💥 Preview error:', error);
        if (!res.headersSent) res.status(500).json({ error: 'Failed to preview file: ' + error.message });
    }
};

// ============================================
// DOWNLOAD FOLDER AS ZIP
// GET /api/intranet/files/download/folder/:id
// ============================================
exports.downloadFolder = async (req, res) => {
    const { id } = req.params;

    try {
        const [folderResult] = await inhousePool.query('SELECT * FROM folders WHERE id = ?', [id]);
        if (folderResult.length === 0) return res.status(404).json({ error: 'Folder not found' });

        const folder = folderResult[0];
        const files  = await getAllFilesInFolder(id);
        if (files.length === 0) return res.status(404).json({ error: 'No files found in folder' });

        res.setHeader('Content-Type',        'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${folder.name}.zip"`);

        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.on('error', (err) => { if (!res.headersSent) res.status(500).json({ error: 'Archive creation failed' }); });
        archive.pipe(res);

        for (const file of files) {
            if (fs.existsSync(file.file_path)) archive.file(file.file_path, { name: file.file_name });
        }

        await archive.finalize();

    } catch (err) {
        console.error('💥 Error creating folder ZIP:', err);
        if (!res.headersSent) res.status(500).json({ error: 'Folder download failed: ' + err.message });
    }
};

// ============================================
// BULK DOWNLOAD
// POST /api/intranet/files/download/bulk
// ============================================
exports.bulkDownload = async (req, res) => {
    const { itemIds } = req.body;

    try {
        if (!itemIds || itemIds.length === 0) return res.status(400).json({ error: 'No items selected' });

        res.setHeader('Content-Type',        'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="selected_files.zip"');

        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.on('error', (err) => { if (!res.headersSent) res.status(500).json({ error: 'Archive creation failed' }); });
        archive.pipe(res);

        for (const itemId of itemIds) {
            const [fileResult] = await inhousePool.query('SELECT * FROM files WHERE id = ?', [itemId]);
            if (fileResult.length > 0) {
                const file = fileResult[0];
                if (fs.existsSync(file.file_path)) archive.file(file.file_path, { name: file.file_name });
            } else {
                const [folderResult] = await inhousePool.query('SELECT * FROM folders WHERE id = ?', [itemId]);
                if (folderResult.length > 0) {
                    const folderFiles = await getAllFilesInFolder(itemId);
                    for (const file of folderFiles) {
                        if (fs.existsSync(file.file_path)) archive.file(file.file_path, { name: `${folderResult[0].name}/${file.file_name}` });
                    }
                }
            }
        }

        await archive.finalize();

    } catch (err) {
        console.error('💥 Error creating bulk ZIP:', err);
        if (!res.headersSent) res.status(500).json({ error: 'Bulk download failed: ' + err.message });
    }
};

// ============================================
// RENAME / MOVE FILE OR FOLDER
// PATCH /api/intranet/files/:id
// ============================================
exports.updateItem = async (req, res) => {
    const { id }                          = req.params;
    const { new_name, new_folder_id, updated_by } = req.body;

    try {
        if (!updated_by) return res.status(400).json({ error: 'updated_by user ID is required' });

        const userExists = await validateUser(updated_by);
        if (!userExists) return res.status(400).json({ error: 'Invalid updated_by user' });

        // Check if file
        const [fileResult] = await inhousePool.query('SELECT * FROM files WHERE id = ?', [id]);
        if (fileResult.length > 0) {
            const file           = fileResult[0];
            const sanitizedName  = new_name ? sanitizeInput(new_name) : file.file_name;
            const targetFolderId = new_folder_id !== undefined ? new_folder_id : file.folder_id;

            if (targetFolderId) {
                const [folderCheck] = await inhousePool.query('SELECT id FROM folders WHERE id = ?', [targetFolderId]);
                if (folderCheck.length === 0) return res.status(400).json({ error: 'Target folder not found' });
            }

            await inhousePool.query(
                'UPDATE files SET file_name = ?, folder_id = ?, updated_by = ?, updated_at = NOW() WHERE id = ?',
                [sanitizedName, targetFolderId, updated_by, id]
            );

            const action = new_name && new_folder_id !== undefined ? 'move_rename' : (new_name ? 'rename' : 'move');
            await addActivityLog(updated_by, action, 'file', id, sanitizedName);

            return res.json({ message: 'File updated successfully', updatedItem: { type: 'file', id: file.id, oldName: file.file_name, newName: sanitizedName } });
        }

        // Check if folder
        const [folderResult] = await inhousePool.query('SELECT * FROM folders WHERE id = ?', [id]);
        if (folderResult.length > 0) {
            const folder         = folderResult[0];
            const sanitizedName  = new_name ? sanitizeInput(new_name) : folder.name;
            const targetParentId = new_folder_id !== undefined ? new_folder_id : folder.parent_id;

            await inhousePool.query(
                'UPDATE folders SET name = ?, parent_id = ?, updated_by = ?, updated_at = NOW() WHERE id = ?',
                [sanitizedName, targetParentId, updated_by, id]
            );

            const action = new_name && new_folder_id !== undefined ? 'move_rename' : (new_name ? 'rename' : 'move');
            await addActivityLog(updated_by, action, 'folder', id, sanitizedName);

            return res.json({ message: 'Folder updated successfully', updatedItem: { type: 'folder', id: folder.id, oldName: folder.name, newName: sanitizedName } });
        }

        return res.status(404).json({ error: 'Item not found' });

    } catch (err) {
        console.error('💥 Error updating item:', err);
        res.status(500).json({ error: 'Update failed: ' + err.message });
    }
};

// ============================================
// DELETE FILE OR FOLDER
// DELETE /api/intranet/files/:id
// ============================================
exports.deleteItem = async (req, res) => {
    const { id }                    = req.params;
    const { updated_by, force }     = req.body;

    try {
        if (!updated_by) return res.status(400).json({ error: 'updated_by user ID is required' });

        const userExists = await validateUser(updated_by);
        if (!userExists) return res.status(400).json({ error: 'Invalid updated_by user' });

        // Check if file
        const [fileResult] = await inhousePool.query('SELECT * FROM files WHERE id = ?', [id]);
        if (fileResult.length > 0) {
            const file = fileResult[0];

            if (file.file_path && fs.existsSync(file.file_path)) {
                await unlinkAsync(file.file_path).catch(() => {});
            }

            if (file.file_type?.toLowerCase() === 'pdf') {
                pdfPasswordManager.deletePassword(id);
            }

            await inhousePool.query('DELETE FROM files WHERE id = ?', [id]);
            await addActivityLog(updated_by, 'delete', 'file', file.id, file.file_name);

            return res.json({ message: 'File deleted successfully', deletedItem: { type: 'file', id: file.id, name: file.file_name } });
        }

        // Check if folder
        const [folderResult] = await inhousePool.query('SELECT * FROM folders WHERE id = ?', [id]);
        if (folderResult.length > 0) {
            const folder = folderResult[0];

            if (force) {
                const deletedItems = await recursivelyDeleteFolder(id, updated_by);
                return res.json({ message: 'Folder and all contents deleted successfully', deletedItem: { type: 'folder', id: folder.id, name: folder.name }, deletedContents: deletedItems });
            }

            const [containedFiles]   = await inhousePool.query('SELECT id, file_name FROM files WHERE folder_id = ?', [id]);
            const [containedFolders] = await inhousePool.query('SELECT id, name FROM folders WHERE parent_id = ?', [id]);

            if (containedFiles.length > 0 || containedFolders.length > 0) {
                return res.status(400).json({ error: 'Cannot delete non-empty folder. Use force=true to delete with contents.' });
            }

            await inhousePool.query('DELETE FROM folders WHERE id = ?', [id]);

            const physicalFolderPath = path.join(UPLOADS_BASE, `folder-${id}`);
            if (fs.existsSync(physicalFolderPath)) {
                fs.rmSync(physicalFolderPath, { recursive: true, force: true });
            }

            await addActivityLog(updated_by, 'delete', 'folder', folder.id, folder.name);

            return res.json({ message: 'Folder deleted successfully', deletedItem: { type: 'folder', id: folder.id, name: folder.name } });
        }

        return res.status(404).json({ error: 'Item not found' });

    } catch (err) {
        console.error('💥 Error during deletion:', err);
        res.status(500).json({ error: 'Delete failed: ' + err.message });
    }
};

// ============================================
// BULK DELETE
// DELETE /api/intranet/files/bulk/delete
// ============================================
exports.bulkDelete = async (req, res) => {
    const { ids, updated_by, force } = req.body;

    try {
        if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'IDs array is required' });
        if (!updated_by) return res.status(400).json({ error: 'updated_by user ID is required' });

        const userExists = await validateUser(updated_by);
        if (!userExists) return res.status(400).json({ error: 'Invalid updated_by user' });

        const results = { deleted: [], errors: [] };

        for (const id of ids) {
            try {
                const [fileResult] = await inhousePool.query('SELECT * FROM files WHERE id = ?', [id]);
                if (fileResult.length > 0) {
                    const file = fileResult[0];
                    if (file.file_path && fs.existsSync(file.file_path)) await unlinkAsync(file.file_path).catch(() => {});
                    await inhousePool.query('DELETE FROM files WHERE id = ?', [id]);
                    await addActivityLog(updated_by, 'delete', 'file', file.id, file.file_name, 'bulk_delete');
                    results.deleted.push({ type: 'file', id: file.id, name: file.file_name });
                    continue;
                }

                const [folderResult] = await inhousePool.query('SELECT * FROM folders WHERE id = ?', [id]);
                if (folderResult.length > 0) {
                    const folder = folderResult[0];
                    if (force) {
                        await recursivelyDeleteFolder(id, updated_by);
                        results.deleted.push({ type: 'folder', id: folder.id, name: folder.name, forceDeleted: true });
                    } else {
                        const [cf] = await inhousePool.query('SELECT COUNT(*) as count FROM files WHERE folder_id = ?', [id]);
                        const [cd] = await inhousePool.query('SELECT COUNT(*) as count FROM folders WHERE parent_id = ?', [id]);
                        if (cf[0].count > 0 || cd[0].count > 0) {
                            results.errors.push({ id, name: folder.name, error: 'Folder not empty. Use force=true.' });
                            continue;
                        }
                        await inhousePool.query('DELETE FROM folders WHERE id = ?', [id]);
                        await addActivityLog(updated_by, 'delete', 'folder', folder.id, folder.name, 'bulk_delete');
                        results.deleted.push({ type: 'folder', id: folder.id, name: folder.name });
                    }
                    continue;
                }

                results.errors.push({ id, error: 'Item not found' });
            } catch (itemError) {
                results.errors.push({ id, error: itemError.message });
            }
        }

        res.json({ message: `Bulk delete completed. ${results.deleted.length} items deleted, ${results.errors.length} errors.`, results });

    } catch (err) {
        console.error('💥 Error in bulk delete:', err);
        res.status(500).json({ error: 'Bulk delete failed: ' + err.message });
    }
};

// ============================================
// SEARCH FILES/FOLDERS
// GET /api/intranet/files/search
// ============================================
exports.search = async (req, res) => {
    const { q: query, type, created_after, created_before, min_size, max_size, created_by } = req.query;

    try {
        if (!query || query.trim() === '') return res.status(400).json({ error: 'Search query is required' });

        const searchTerm = `%${query.trim()}%`;
        const results    = { files: [], folders: [] };

        if (!type || type === 'file') {
            let sql    = `SELECT f.*, u.name AS created_by_name, fo.name AS folder_name FROM files f LEFT JOIN ${process.env.DATABASE_DB}.user u ON f.created_by = u.user_id LEFT JOIN folders fo ON f.folder_id = fo.id WHERE f.file_name LIKE ?`;
            const params = [searchTerm];
            if (created_after)  { sql += ' AND f.created_at >= ?'; params.push(created_after); }
            if (created_before) { sql += ' AND f.created_at <= ?'; params.push(created_before); }
            if (min_size)       { sql += ' AND f.file_size >= ?';  params.push(parseInt(min_size)); }
            if (max_size)       { sql += ' AND f.file_size <= ?';  params.push(parseInt(max_size)); }
            if (created_by)     { sql += ' AND f.created_by = ?';  params.push(created_by); }
            sql += ' ORDER BY f.file_name ASC LIMIT 100';
            const [files] = await inhousePool.query(sql, params);
            results.files = files;
        }

        if (!type || type === 'folder') {
            let sql    = `SELECT f.*, u.name AS created_by_name FROM folders f LEFT JOIN ${process.env.DATABASE_DB}.user u ON f.created_by = u.user_id WHERE f.name LIKE ?`;
            const params = [searchTerm];
            if (created_after)  { sql += ' AND f.created_at >= ?'; params.push(created_after); }
            if (created_before) { sql += ' AND f.created_at <= ?'; params.push(created_before); }
            if (created_by)     { sql += ' AND f.created_by = ?';  params.push(created_by); }
            sql += ' ORDER BY f.name ASC LIMIT 100';
            const [folders] = await inhousePool.query(sql, params);
            results.folders = folders;
        }

        res.json({ query: query.trim(), results, totalResults: results.files.length + results.folders.length });

    } catch (err) {
        console.error('💥 Error during search:', err);
        res.status(500).json({ error: 'Search failed: ' + err.message });
    }
};

// ============================================
// GET STATISTICS
// GET /api/intranet/files/stats
// ============================================
exports.getStats = async (req, res) => {
    try {
        const [fileCount]     = await inhousePool.query('SELECT COUNT(*) as count FROM files');
        const [folderCount]   = await inhousePool.query('SELECT COUNT(*) as count FROM folders');
        const [sizeResult]    = await inhousePool.query('SELECT SUM(file_size) as total_size FROM files');
        const [fileTypes]     = await inhousePool.query(`SELECT file_type, COUNT(*) as count, SUM(file_size) as total_size FROM files WHERE file_type IS NOT NULL AND file_type != '' GROUP BY file_type ORDER BY count DESC LIMIT 10`);
        const [recentActivity]= await inhousePool.query(`SELECT COUNT(*) as count, action FROM activity_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) GROUP BY action ORDER BY count DESC`);

        const totalSize = sizeResult[0].total_size || 0;

        res.json({
            totalFiles:              fileCount[0].count,
            totalFolders:            folderCount[0].count,
            totalSize,
            totalSizeFormatted:      formatFileSize(totalSize),
            fileTypes,
            recentActivity,
            averageFileSize:         fileCount[0].count > 0 ? Math.round(totalSize / fileCount[0].count) : 0,
            averageFileSizeFormatted: fileCount[0].count > 0 ? formatFileSize(Math.round(totalSize / fileCount[0].count)) : '0 Bytes'
        });

    } catch (err) {
        console.error('💥 Error getting statistics:', err);
        res.status(500).json({ error: 'Failed to get statistics: ' + err.message });
    }
};

// ============================================
// TOGGLE STAR FILE
// POST /api/intranet/files/star/:fileId
// ============================================
exports.toggleStar = async (req, res) => {
    const { fileId }   = req.params;
    const { user_id }  = req.body;

    try {
        if (!user_id) return res.status(400).json({ error: 'user_id is required' });

        const userExists = await validateUser(user_id);
        if (!userExists) return res.status(400).json({ error: 'Invalid user' });

        const [fileCheck] = await inhousePool.query('SELECT id, file_name FROM files WHERE id = ?', [fileId]);
        if (fileCheck.length === 0) return res.status(404).json({ error: 'File not found' });

        const [existing] = await inhousePool.query('SELECT id FROM starred_files WHERE user_id = ? AND file_id = ?', [user_id, fileId]);

        if (existing.length > 0) {
            await inhousePool.query('DELETE FROM starred_files WHERE user_id = ? AND file_id = ?', [user_id, fileId]);
            return res.json({ message: 'File unstarred successfully', starred: false, fileId, fileName: fileCheck[0].file_name });
        }

        await inhousePool.query('INSERT INTO starred_files (user_id, file_id, created_at) VALUES (?, ?, NOW())', [user_id, fileId]);
        return res.json({ message: 'File starred successfully', starred: true, fileId, fileName: fileCheck[0].file_name });

    } catch (err) {
        console.error('💥 Error toggling star:', err);
        res.status(500).json({ error: 'Failed to toggle star: ' + err.message });
    }
};

// ============================================
// GET STARRED FILES
// GET /api/intranet/files/starred
// ============================================
exports.getStarred = async (req, res) => {
    const { user_id } = req.query;

    try {
        if (!user_id) return res.status(400).json({ error: 'user_id is required' });

        const userExists = await validateUser(user_id);
        if (!userExists) return res.status(400).json({ error: 'Invalid user' });

        const [starredFiles] = await inhousePool.query(
            `SELECT f.*, sf.created_at AS starred_at, u.name AS created_by_name, fo.name AS folder_name
             FROM starred_files sf
             JOIN files f ON sf.file_id = f.id
             LEFT JOIN ${process.env.DATABASE_DB}.user u ON f.created_by = u.user_id
             LEFT JOIN folders fo ON f.folder_id = fo.id
             WHERE sf.user_id = ?
             ORDER BY sf.created_at DESC`,
            [user_id]
        );

        res.json({ starredFiles, count: starredFiles.length });

    } catch (err) {
        console.error('💥 Error getting starred files:', err);
        res.status(500).json({ error: 'Failed to get starred files: ' + err.message });
    }
};

// ============================================
// GET ACTIVITY LOGS
// GET /api/intranet/files/activity-logs
// ============================================
exports.getActivityLogs = async (req, res) => {
    const { user_id, action, target_type, limit = 100, offset = 0 } = req.query;

    let sql    = `SELECT al.*, u.name AS user_name FROM activity_logs al JOIN ${process.env.DATABASE_DB}.user u ON al.user_id = u.user_id WHERE 1=1`;
    const params = [];

    if (user_id)     { sql += ' AND al.user_id = ?';     params.push(user_id); }
    if (action)      { sql += ' AND al.action = ?';      params.push(action); }
    if (target_type) { sql += ' AND al.target_type = ?'; params.push(target_type); }

    sql += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    try {
        const [rows]        = await inhousePool.query(sql, params);
        const [countResult] = await inhousePool.query('SELECT COUNT(*) as total FROM activity_logs al WHERE 1=1');

        res.json({
            logs:       rows,
            pagination: { total: countResult[0].total, limit: parseInt(limit), offset: parseInt(offset), hasMore: countResult[0].total > (parseInt(offset) + parseInt(limit)) }
        });
    } catch (err) {
        console.error('Error fetching activity logs:', err);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
};

// ============================================
// GET USERS (for sharing dropdown)
// GET /api/intranet/files/users
// ============================================
exports.getUsers = async (req, res) => {
    try {
        const { mysqlPool } = require('../../config/database');
        const [rows] = await mysqlPool.query(
            'SELECT user_id as id, username as user_name, name, dept as department, position, role FROM user ORDER BY name'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

// ============================================
// PRIVATE HELPERS
// ============================================
async function getAllFilesInFolder(folderId) {
    const files = [];
    const [directFiles] = await inhousePool.query('SELECT * FROM files WHERE folder_id = ?', [folderId]);
    files.push(...directFiles);
    const [subFolders] = await inhousePool.query('SELECT * FROM folders WHERE parent_id = ?', [folderId]);
    for (const subFolder of subFolders) {
        const subFiles = await getAllFilesInFolder(subFolder.id);
        files.push(...subFiles);
    }
    return files;
}

async function recursivelyDeleteFolder(folderId, deletedBy) {
    const deletedItems = { files: [], folders: [] };
    const [folderInfo] = await inhousePool.query('SELECT name FROM folders WHERE id = ?', [folderId]);
    const folderName   = folderInfo.length > 0 ? folderInfo[0].name : `Folder ${folderId}`;
    const [files]      = await inhousePool.query('SELECT * FROM files WHERE folder_id = ?', [folderId]);

    for (const file of files) {
        if (file.file_path && fs.existsSync(file.file_path)) await unlinkAsync(file.file_path).catch(() => {});
        await inhousePool.query('DELETE FROM files WHERE id = ?', [file.id]);
        deletedItems.files.push({ id: file.id, name: file.file_name });
        await addActivityLog(deletedBy, 'delete', 'file', file.id, file.file_name, 'force_delete_folder');
    }

    const [subfolders] = await inhousePool.query('SELECT * FROM folders WHERE parent_id = ?', [folderId]);
    for (const subfolder of subfolders) {
        const subfolderDeleted = await recursivelyDeleteFolder(subfolder.id, deletedBy);
        deletedItems.files.push(...subfolderDeleted.files);
        deletedItems.folders.push(...subfolderDeleted.folders);
        deletedItems.folders.push({ id: subfolder.id, name: subfolder.name });
    }

    await inhousePool.query('DELETE FROM folders WHERE id = ?', [folderId]);

    const physicalFolderPath = path.join(UPLOADS_BASE, `folder-${folderId}`);
    if (fs.existsSync(physicalFolderPath)) fs.rmSync(physicalFolderPath, { recursive: true, force: true });

    await addActivityLog(deletedBy, 'delete', 'folder', folderId, folderName, 'force_delete');

    return deletedItems;
}

// ============================================
// BULK CREATE FOLDERS
// POST /api/intranet/files/folders/bulk
// ============================================
exports.bulkCreateFolders = async (req, res) => {
    const { folders, created_by } = req.body;

    try {
        if (!Array.isArray(folders) || folders.length === 0) {
            return res.status(400).json({ error: 'folders array is required' });
        }
        if (!created_by) return res.status(400).json({ error: 'created_by user ID is required' });

        const userExists = await validateUser(created_by);
        if (!userExists) return res.status(400).json({ error: 'Invalid created_by user' });

        const results = { created: [], errors: [] };

        for (const folderData of folders) {
            try {
                const { name, parent_id } = folderData;

                if (!name || name.trim() === '') {
                    results.errors.push({ folderData, error: 'Folder name is required' });
                    continue;
                }

                const sanitizedName = sanitizeInput(name);

                if (parent_id) {
                    const [parentCheck] = await inhousePool.query('SELECT id FROM folders WHERE id = ?', [parent_id]);
                    if (parentCheck.length === 0) {
                        results.errors.push({ folderData, error: 'Parent folder not found' });
                        continue;
                    }
                }

                const duplicateCheck = parent_id
                    ? await inhousePool.query('SELECT id FROM folders WHERE name = ? AND parent_id = ?', [sanitizedName, parent_id])
                    : await inhousePool.query('SELECT id FROM folders WHERE name = ? AND parent_id IS NULL', [sanitizedName]);

                if (duplicateCheck[0].length > 0) {
                    results.errors.push({ folderData, error: 'A folder with this name already exists in the same location' });
                    continue;
                }

                const [result] = await inhousePool.query(
                    `INSERT INTO folders (name, parent_id, created_by, updated_by, created_at, updated_at)
                     VALUES (?, ?, ?, ?, NOW(), NOW())`,
                    [sanitizedName, parent_id || null, created_by, created_by]
                );

                await addActivityLog(created_by, 'create', 'folder', result.insertId, sanitizedName, 'bulk_create');

                results.created.push({ id: result.insertId, name: sanitizedName, parent_id: parent_id || null });

            } catch (folderError) {
                results.errors.push({ folderData, error: folderError.message });
            }
        }

        res.json({
            message: `Bulk folder creation completed. ${results.created.length} folders created, ${results.errors.length} errors.`,
            results
        });

    } catch (err) {
        console.error('💥 Error in bulk folder creation:', err);
        res.status(500).json({ error: 'Bulk folder creation failed: ' + err.message });
    }
};

// ============================================
// GET ITEM INFO (file or folder)
// GET /api/intranet/files/info/:id
// ============================================
exports.getItemInfo = async (req, res) => {
    const { id } = req.params;

    try {
        const [fileResult] = await inhousePool.query(
            `SELECT f.*, u.name AS created_by_name, u2.name AS updated_by_name, fo.name AS folder_name
             FROM files f
             LEFT JOIN ${process.env.DATABASE_DB}.user u  ON f.created_by = u.user_id
             LEFT JOIN ${process.env.DATABASE_DB}.user u2 ON f.updated_by = u2.user_id
             LEFT JOIN folders fo ON f.folder_id = fo.id
             WHERE f.id = ?`,
            [id]
        );

        if (fileResult.length > 0) {
            const file      = fileResult[0];
            let fileStats   = null;

            if (fs.existsSync(file.file_path)) {
                const stats = await fs.promises.stat(file.file_path);
                fileStats   = { size: stats.size, created: stats.birthtime, modified: stats.mtime, accessed: stats.atime };
            }

            return res.json({
                type:       'file',
                id:         file.id,
                name:       file.file_name,
                path:       file.file_path,
                size:       file.file_size,
                sizeFormatted: formatFileSize(file.file_size),
                fileType:   file.file_type,
                folder:     file.folder_id ? { id: file.folder_id, name: file.folder_name } : null,
                createdBy:  { id: file.created_by, name: file.created_by_name },
                updatedBy:  { id: file.updated_by, name: file.updated_by_name },
                createdAt:  file.created_at,
                updatedAt:  file.updated_at,
                fileStats,
                exists:     fs.existsSync(file.file_path)
            });
        }

        const [folderResult] = await inhousePool.query(
            `SELECT f.*, u.name AS created_by_name, u2.name AS updated_by_name, pf.name AS parent_folder_name
             FROM folders f
             LEFT JOIN ${process.env.DATABASE_DB}.user u  ON f.created_by = u.user_id
             LEFT JOIN ${process.env.DATABASE_DB}.user u2 ON f.updated_by = u2.user_id
             LEFT JOIN folders pf ON f.parent_id = pf.id
             WHERE f.id = ?`,
            [id]
        );

        if (folderResult.length > 0) {
            const folder          = folderResult[0];
            const [fileCount]     = await inhousePool.query('SELECT COUNT(*) as count FROM files WHERE folder_id = ?', [id]);
            const [subfolderCount]= await inhousePool.query('SELECT COUNT(*) as count FROM folders WHERE parent_id = ?', [id]);
            const [totalSize]     = await inhousePool.query('SELECT SUM(file_size) as total FROM files WHERE folder_id = ?', [id]);

            return res.json({
                type:         'folder',
                id:           folder.id,
                name:         folder.name,
                parentFolder: folder.parent_id ? { id: folder.parent_id, name: folder.parent_folder_name } : null,
                createdBy:    { id: folder.created_by, name: folder.created_by_name },
                updatedBy:    { id: folder.updated_by, name: folder.updated_by_name },
                createdAt:    folder.created_at,
                updatedAt:    folder.updated_at,
                statistics: {
                    fileCount:          fileCount[0].count,
                    subfolderCount:     subfolderCount[0].count,
                    totalSize:          totalSize[0].total || 0,
                    totalSizeFormatted: formatFileSize(totalSize[0].total || 0)
                }
            });
        }

        return res.status(404).json({ error: 'Item not found' });

    } catch (err) {
        console.error('💥 Error getting item info:', err);
        res.status(500).json({ error: 'Failed to get item info: ' + err.message });
    }
};

// ============================================
// COPY FILES/FOLDERS
// POST /api/intranet/files/copy
// ============================================
exports.copyItems = async (req, res) => {
    const { source_ids, target_folder_id, created_by } = req.body;

    try {
        if (!Array.isArray(source_ids) || source_ids.length === 0) {
            return res.status(400).json({ error: 'source_ids array is required' });
        }
        if (!created_by) return res.status(400).json({ error: 'created_by user ID is required' });

        const userExists = await validateUser(created_by);
        if (!userExists) return res.status(400).json({ error: 'Invalid created_by user' });

        if (target_folder_id) {
            const [folderCheck] = await inhousePool.query('SELECT id FROM folders WHERE id = ?', [target_folder_id]);
            if (folderCheck.length === 0) return res.status(400).json({ error: 'Target folder not found' });
        }

        const results = { copied: [], errors: [] };

        for (const sourceId of source_ids) {
            try {
                const [fileResult] = await inhousePool.query('SELECT * FROM files WHERE id = ?', [sourceId]);

                if (fileResult.length > 0) {
                    const originalFile = fileResult[0];
                    let copyName       = originalFile.file_name;
                    let counter        = 1;

                    while (true) {
                        const duplicateCheck = target_folder_id
                            ? await inhousePool.query('SELECT id FROM files WHERE file_name = ? AND folder_id = ?', [copyName, target_folder_id])
                            : await inhousePool.query('SELECT id FROM files WHERE file_name = ? AND folder_id IS NULL', [copyName]);
                        if (duplicateCheck[0].length === 0) break;
                        const nameWithoutExt = path.parse(originalFile.file_name).name;
                        const ext            = path.parse(originalFile.file_name).ext;
                        copyName             = `${nameWithoutExt} (Copy ${counter})${ext}`;
                        counter++;
                    }

                    const targetFolderPath   = target_folder_id ? path.join(UPLOADS_BASE, `folder-${target_folder_id}`) : UPLOADS_BASE;
                    fs.mkdirSync(targetFolderPath, { recursive: true });

                    const newPhysicalName    = `${Date.now()}-${copyName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                    const newFilePath        = path.join(targetFolderPath, newPhysicalName);
                    await fs.promises.copyFile(path.resolve(originalFile.file_path), newFilePath);

                    const newRelativePath    = target_folder_id
                        ? path.join('uploads-intranet', `folder-${target_folder_id}`, newPhysicalName)
                        : path.join('uploads-intranet', newPhysicalName);

                    const [result] = await inhousePool.query(
                        `INSERT INTO files (folder_id, file_name, file_path, file_type, file_size, created_by, updated_by, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                        [target_folder_id || null, copyName, newRelativePath, originalFile.file_type, originalFile.file_size, created_by, created_by]
                    );

                    await addActivityLog(created_by, 'copy', 'file', result.insertId, copyName, JSON.stringify({ source_id: sourceId }));
                    results.copied.push({ type: 'file', originalId: sourceId, newId: result.insertId, originalName: originalFile.file_name, newName: copyName });
                    continue;
                }

                const [folderResult] = await inhousePool.query('SELECT * FROM folders WHERE id = ?', [sourceId]);
                if (folderResult.length > 0) {
                    const originalFolder = folderResult[0];
                    let copyName         = originalFolder.name;
                    let counter          = 1;

                    while (true) {
                        const duplicateCheck = target_folder_id
                            ? await inhousePool.query('SELECT id FROM folders WHERE name = ? AND parent_id = ?', [copyName, target_folder_id])
                            : await inhousePool.query('SELECT id FROM folders WHERE name = ? AND parent_id IS NULL', [copyName]);
                        if (duplicateCheck[0].length === 0) break;
                        copyName = `${originalFolder.name} (Copy ${counter})`;
                        counter++;
                    }

                    const [result] = await inhousePool.query(
                        `INSERT INTO folders (name, parent_id, created_by, updated_by, created_at, updated_at)
                         VALUES (?, ?, ?, ?, NOW(), NOW())`,
                        [copyName, target_folder_id || null, created_by, created_by]
                    );

                    await addActivityLog(created_by, 'copy', 'folder', result.insertId, copyName, JSON.stringify({ source_id: sourceId }));
                    results.copied.push({ type: 'folder', originalId: sourceId, newId: result.insertId, originalName: originalFolder.name, newName: copyName });
                    continue;
                }

                results.errors.push({ id: sourceId, error: 'Item not found' });

            } catch (itemError) {
                results.errors.push({ id: sourceId, error: itemError.message });
            }
        }

        res.json({ message: `Copy completed. ${results.copied.length} items copied, ${results.errors.length} errors.`, results });

    } catch (err) {
        console.error('💥 Error in copy operation:', err);
        res.status(500).json({ error: 'Copy failed: ' + err.message });
    }
};

// ============================================
// GET RECENT FILES
// GET /api/intranet/files/recent
// ============================================
exports.getRecentFiles = async (req, res) => {
    const { limit = 20, user_id } = req.query;

    try {
        let sql      = `SELECT f.*, u.name AS created_by_name, fo.name AS folder_name FROM files f LEFT JOIN ${process.env.DATABASE_DB}.user u ON f.created_by = u.user_id LEFT JOIN folders fo ON f.folder_id = fo.id WHERE 1=1`;
        const params = [];

        if (user_id) { sql += ' AND f.created_by = ?'; params.push(user_id); }
        sql += ' ORDER BY f.created_at DESC LIMIT ?';
        params.push(parseInt(limit));

        const [files] = await inhousePool.query(sql, params);
        res.json({ files, count: files.length, limit: parseInt(limit) });

    } catch (err) {
        console.error('💥 Error getting recent files:', err);
        res.status(500).json({ error: 'Failed to get recent files: ' + err.message });
    }
};

// ============================================
// GET DISK USAGE
// GET /api/intranet/files/disk-usage
// ============================================
exports.getDiskUsage = async (req, res) => {
    try {
        const [dbSize]    = await inhousePool.query('SELECT SUM(file_size) as total FROM files');
        const totalDbSize = dbSize[0].total || 0;
        let actualDiskUsage = 0;

        if (fs.existsSync(UPLOADS_BASE)) {
            const calculateDirSize = async (dirPath) => {
                let size       = 0;
                const entries  = await fs.promises.readdir(dirPath);
                for (const entry of entries) {
                    const entryPath = path.join(dirPath, entry);
                    const stats     = await fs.promises.stat(entryPath);
                    size += stats.isDirectory() ? await calculateDirSize(entryPath) : stats.size;
                }
                return size;
            };
            actualDiskUsage = await calculateDirSize(UPLOADS_BASE);
        }

        const [fileTypes] = await inhousePool.query(
            `SELECT file_type, COUNT(*) as count, SUM(file_size) as size FROM files WHERE file_type IS NOT NULL AND file_type != '' GROUP BY file_type ORDER BY size DESC`
        );

        res.json({
            databaseSize:          totalDbSize,
            databaseSizeFormatted: formatFileSize(totalDbSize),
            actualDiskUsage,
            actualDiskUsageFormatted: formatFileSize(actualDiskUsage),
            difference:            Math.abs(actualDiskUsage - totalDbSize),
            differenceFormatted:   formatFileSize(Math.abs(actualDiskUsage - totalDbSize)),
            isConsistent:          Math.abs(actualDiskUsage - totalDbSize) < (1024 * 1024),
            fileTypeBreakdown:     fileTypes
        });

    } catch (err) {
        console.error('💥 Error checking disk usage:', err);
        res.status(500).json({ error: 'Failed to check disk usage: ' + err.message });
    }
};

// ============================================
// GET STARRED FILES
// GET /api/intranet/files/starred
// ============================================
exports.getStarredFiles = async (req, res) => {
    const { user_id } = req.query;

    try {
        if (!user_id) return res.status(400).json({ error: 'user_id is required' });

        const userExists = await validateUser(user_id);
        if (!userExists) return res.status(400).json({ error: 'Invalid user' });

        const [starredFiles] = await inhousePool.query(
            `SELECT f.*, sf.created_at AS starred_at, u.name AS created_by_name, fo.name AS folder_name
             FROM starred_files sf
             JOIN files f ON sf.file_id = f.id
             LEFT JOIN ${process.env.DATABASE_DB}.user u ON f.created_by = u.user_id
             LEFT JOIN folders fo ON f.folder_id = fo.id
             WHERE sf.user_id = ?
             ORDER BY sf.created_at DESC`,
            [user_id]
        );

        res.json({ starredFiles, count: starredFiles.length });

    } catch (err) {
        console.error('💥 Error getting starred files:', err);
        res.status(500).json({ error: 'Failed to get starred files: ' + err.message });
    }
};

// ============================================
// UNSTAR FILE
// DELETE /api/intranet/files/star/:fileId
// ============================================
exports.unstarFile = async (req, res) => {
    const { fileId }  = req.params;
    const { user_id } = req.body;

    try {
        if (!user_id) return res.status(400).json({ error: 'user_id is required' });

        const userExists = await validateUser(user_id);
        if (!userExists) return res.status(400).json({ error: 'Invalid user' });

        const [result] = await inhousePool.query(
            'DELETE FROM starred_files WHERE user_id = ? AND file_id = ?',
            [user_id, fileId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Star not found — file was not starred by this user' });
        }

        res.json({ message: 'File unstarred successfully', starred: false, fileId });

    } catch (err) {
        console.error('💥 Error unstarring file:', err);
        res.status(500).json({ error: 'Failed to unstar file: ' + err.message });
    }
};

// ============================================
// GET STAR STATUS
// GET /api/intranet/files/star/status/:fileId
// ============================================
exports.getStarStatus = async (req, res) => {
    const { fileId }  = req.params;
    const { user_id } = req.query;

    try {
        if (!user_id) return res.status(400).json({ error: 'user_id is required' });

        const [result] = await inhousePool.query(
            'SELECT id, created_at FROM starred_files WHERE user_id = ? AND file_id = ?',
            [user_id, fileId]
        );

        res.json({ fileId, starred: result.length > 0, starredAt: result.length > 0 ? result[0].created_at : null });

    } catch (err) {
        console.error('💥 Error checking star status:', err);
        res.status(500).json({ error: 'Failed to check star status: ' + err.message });
    }
};

// ============================================
// DOWNLOAD FOLDER AS ZIP
// GET /api/intranet/files/download/folder/:id
// ============================================
exports.downloadFolderAsZip = async (req, res) => {
    const { id } = req.params;

    try {
        const [folderResult] = await inhousePool.query('SELECT * FROM folders WHERE id = ?', [id]);
        if (folderResult.length === 0) return res.status(404).json({ error: 'Folder not found' });

        const folder = folderResult[0];
        const files  = await getAllFilesInFolder(id);
        if (files.length === 0) return res.status(404).json({ error: 'No files found in folder' });

        res.setHeader('Content-Type',        'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${folder.name}.zip"`);

        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.on('error', (err) => { if (!res.headersSent) res.status(500).json({ error: 'Archive creation failed' }); });
        archive.pipe(res);

        for (const file of files) {
            if (fs.existsSync(file.file_path)) archive.file(file.file_path, { name: file.file_name });
        }

        await archive.finalize();

    } catch (err) {
        console.error('💥 Error creating folder ZIP:', err);
        if (!res.headersSent) res.status(500).json({ error: 'Folder download failed: ' + err.message });
    }
};

// ============================================
// GET ROOT LIST (alias for getList)
// GET /api/intranet/files/list
// ============================================
exports.getRootList = exports.getList;

// ============================================
// DIAGNOSTIC
// GET /api/intranet/files/diagnostic/:id
// ============================================
exports.getDiagnostic = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await inhousePool.query('SELECT * FROM files WHERE id = ?', [id]);
        if (result.length === 0) return res.json({ error: 'File not found in database', fileId: id });

        const file         = result[0];
        const pathVariations = [
            file.file_path,
            path.resolve(file.file_path),
            path.join(process.cwd(), file.file_path),
            path.join(UPLOADS_BASE, path.basename(file.file_path))
        ];

        const pathChecks = {};
        for (const p of pathVariations) {
            pathChecks[p] = fs.existsSync(p);
        }

        res.json({
            success: true,
            file:    { id: file.id, name: file.file_name, type: file.file_type, size: file.file_size, created_at: file.created_at },
            pathChecks,
            uploadsBase: { path: UPLOADS_BASE, exists: fs.existsSync(UPLOADS_BASE) }
        });

    } catch (err) {
        console.error('Diagnostic error:', err);
        res.status(500).json({ error: err.message });
    }
};