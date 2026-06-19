// controllers/IntranetController/categoryController.js
const path      = require('path');
const fs        = require('fs');
const util      = require('util');
const unlinkAsync = util.promisify(fs.unlink);

const { inhousePool }                                                    = require('../../config/database');
const { validateUser, getUserDetails, addActivityLog, sanitizeInput }    = require('./helpers/intranetHelpers');
const { protectAndSendFile, serveStampedPdfPreview, serveFileDirectly }  = require('./helpers/fileProtection');
const { uploadSingle, uploadMultiple, formatFileSize, validateFilePath, cleanupFiles, UPLOADS_BASE } = require('../../config/intranetMulterConfig');

const pdfPasswordManager = require('../../utils/intranet/passwordManager');

// ============================================
// GET ALL CATEGORIES
// GET /api/intranet/categories
// ============================================
exports.getCategories = async (req, res) => {
    const { is_active, created_by } = req.query;

    try {
        let query = `
            SELECT 
                c.*,
                u.name  AS created_by_name,
                u.username AS created_by_username,
                u2.name AS updated_by_name,
                u2.username AS updated_by_username
            FROM categories c
            LEFT JOIN ${process.env.DATABASE_DB}.user u  ON c.created_by  = u.user_id
            LEFT JOIN ${process.env.DATABASE_DB}.user u2 ON c.updated_by  = u2.user_id
            WHERE 1=1
        `;
        const params = [];

        if (is_active !== undefined) {
            query += ' AND c.is_active = ?';
            params.push(is_active === 'true' ? 1 : 0);
        }
        if (created_by) {
            query += ' AND c.created_by = ?';
            params.push(created_by);
        }

        query += ' ORDER BY c.created_at DESC';

        const [categories] = await inhousePool.query(query, params);

        res.json({ message: 'Categories retrieved successfully', categories: categories || [], count: categories.length });

    } catch (error) {
        console.error('❌ Error getting categories:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

// ============================================
// GET SINGLE CATEGORY
// GET /api/intranet/categories/:id
// ============================================
exports.getCategory = async (req, res) => {
    const { id } = req.params;

    try {
        if (!id || isNaN(id)) return res.status(400).json({ error: 'Valid category ID is required' });

        const [categories] = await inhousePool.query('SELECT * FROM categories WHERE id = ?', [id]);
        if (categories.length === 0) return res.status(404).json({ error: 'Category not found' });

        res.json({ message: 'Category retrieved successfully', category: categories[0] });

    } catch (error) {
        console.error('Error getting category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================
// CREATE CATEGORY
// POST /api/intranet/categories
// ============================================
exports.createCategory = async (req, res) => {
    const { name, description, color, icon, is_active, created_by } = req.body;

    try {
        if (!name || !created_by) return res.status(400).json({ error: 'Name and created_by are required' });

        const sanitizedName   = sanitizeInput(name);
        const sanitizedDesc   = sanitizeInput(description || '');
        const sanitizedColor  = sanitizeInput(color || '#007bff');
        const sanitizedIcon   = sanitizeInput(icon || 'folder');
        const sanitizedActive = is_active !== undefined ? (is_active ? 1 : 0) : 1;

        const userValid = await validateUser(created_by);
        if (!userValid) return res.status(400).json({ error: 'Invalid created_by user' });

        const [result] = await inhousePool.query(
            `INSERT INTO categories (name, description, color, icon, is_active, created_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [sanitizedName, sanitizedDesc, sanitizedColor, sanitizedIcon, sanitizedActive, created_by]
        );

        await addActivityLog(created_by, 'create', 'category', result.insertId, sanitizedName);

        res.status(201).json({ message: 'Category created successfully', category_id: result.insertId });

    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================
// UPDATE CATEGORY
// PUT /api/intranet/categories/:id
// ============================================
exports.updateCategory = async (req, res) => {
    const { id }                                              = req.params;
    const { name, description, color, icon, is_active, updated_by } = req.body;

    try {
        if (!id || isNaN(id))  return res.status(400).json({ error: 'Valid category ID is required' });
        if (!updated_by)        return res.status(400).json({ error: 'updated_by is required' });

        const [existing] = await inhousePool.query('SELECT * FROM categories WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Category not found' });

        const currentCategory = existing[0];

        const userValid = await validateUser(updated_by);
        if (!userValid) return res.status(400).json({ error: 'Invalid updated_by user' });

        const updates = [];
        const params  = [];

        if (name        !== undefined) { updates.push('name = ?');        params.push(sanitizeInput(name)); }
        if (description !== undefined) { updates.push('description = ?'); params.push(sanitizeInput(description)); }
        if (color       !== undefined) { updates.push('color = ?');       params.push(sanitizeInput(color)); }
        if (icon        !== undefined) { updates.push('icon = ?');        params.push(sanitizeInput(icon)); }
        if (is_active   !== undefined) { updates.push('is_active = ?');   params.push(is_active ? 1 : 0); }

        updates.push('updated_by = ?, updated_at = NOW()');
        params.push(updated_by, id);

        await inhousePool.query(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, params);

        const actionType = (name && name !== currentCategory.name) ? 'rename' : 'update';
        await addActivityLog(updated_by, actionType, 'category', id, name || currentCategory.name);

        res.json({ message: 'Category updated successfully' });

    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================
// DELETE CATEGORY
// DELETE /api/intranet/categories/:id
// ============================================
exports.deleteCategory = async (req, res) => {
    const { id }         = req.params;
    const { deleted_by } = req.body;

    try {
        if (!id || isNaN(id))  return res.status(400).json({ error: 'Valid category ID is required' });
        if (!deleted_by)        return res.status(400).json({ error: 'deleted_by is required' });

        const userValid = await validateUser(deleted_by);
        if (!userValid) return res.status(400).json({ error: 'Invalid deleted_by user' });

        const [existing] = await inhousePool.query('SELECT * FROM categories WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Category not found' });

        const category = existing[0];

        const [folders] = await inhousePool.query('SELECT COUNT(*) as count FROM categories_folders WHERE category_id = ?', [id]);
        if (folders[0].count > 0) return res.status(400).json({ error: 'Cannot delete category with folders' });

        const [files] = await inhousePool.query('SELECT COUNT(*) as count FROM categories_files WHERE category_id = ?', [id]);
        if (files[0].count > 0) return res.status(400).json({ error: 'Cannot delete category with files' });

        await inhousePool.query('DELETE FROM categories WHERE id = ?', [id]);
        await addActivityLog(deleted_by, 'delete', 'category', id, category.name);

        res.json({ message: 'Category deleted successfully' });

    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================
// GET ALL FOLDERS
// GET /api/intranet/categories/folders
// ============================================
exports.getFolders = async (req, res) => {
    const { category_id, parent_folder_id, is_active } = req.query;

    try {
        let query = `
            SELECT f.*, c.name AS category_name, u.name AS created_by_name
            FROM categories_folders f
            LEFT JOIN categories c ON f.category_id = c.id
            LEFT JOIN ${process.env.DATABASE_DB}.user u ON f.created_by = u.user_id
            WHERE 1=1
        `;
        const params = [];

        if (category_id) {
            query += ' AND f.category_id = ?';
            params.push(category_id);
        }

        if (parent_folder_id !== undefined) {
            if (parent_folder_id === 'null' || parent_folder_id === '' || parent_folder_id === null) {
                query += ' AND f.parent_folder_id IS NULL';
            } else {
                query += ' AND f.parent_folder_id = ?';
                params.push(parent_folder_id);
            }
        } else {
            query += ' AND f.parent_folder_id IS NULL';
        }

        if (is_active !== undefined) {
            query += ' AND f.is_active = ?';
            params.push(is_active === 'true' ? 1 : 0);
        }

        query += ' ORDER BY f.created_at DESC';

        const [folders] = await inhousePool.query(query, params);

        res.json({ message: 'Folders retrieved successfully', folders });

    } catch (error) {
        console.error('Error getting folders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================
// GET SINGLE FOLDER
// GET /api/intranet/categories/folders/:id
// ============================================
exports.getFolder = async (req, res) => {
    const { id } = req.params;

    try {
        if (!id || isNaN(id)) return res.status(400).json({ error: 'Valid folder ID is required' });

        const [folders] = await inhousePool.query(
            `SELECT f.*, c.name AS category_name, u.name AS created_by_name, u2.name AS updated_by_name
             FROM categories_folders f
             LEFT JOIN categories c ON f.category_id = c.id
             LEFT JOIN ${process.env.DATABASE_DB}.user u  ON f.created_by = u.user_id
             LEFT JOIN ${process.env.DATABASE_DB}.user u2 ON f.updated_by = u2.user_id
             WHERE f.id = ?`,
            [id]
        );

        if (folders.length === 0) return res.status(404).json({ error: 'Folder not found' });

        res.json({ message: 'Folder retrieved successfully', folder: folders[0] });

    } catch (error) {
        console.error('Error getting folder:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================
// CREATE FOLDER
// POST /api/intranet/categories/folders
// ============================================
exports.createFolder = async (req, res) => {
    const { name, description, category_id, parent_folder_id, created_by } = req.body;

    try {
        if (!name || !category_id || !created_by) {
            return res.status(400).json({ error: 'Name, category_id, and created_by are required' });
        }

        const sanitizedName = sanitizeInput(name);
        const sanitizedDesc = sanitizeInput(description || '');
        const sanitizedPath = sanitizedName;

        const userValid = await validateUser(created_by);
        if (!userValid) return res.status(400).json({ error: 'Invalid created_by user' });

        const [categoryRows] = await inhousePool.query('SELECT id FROM categories WHERE id = ?', [category_id]);
        if (categoryRows.length === 0) return res.status(400).json({ error: 'Invalid category_id' });

        if (parent_folder_id) {
            const [parentRows] = await inhousePool.query('SELECT id FROM categories_folders WHERE id = ?', [parent_folder_id]);
            if (parentRows.length === 0) return res.status(400).json({ error: 'Invalid parent_folder_id' });
        }

        const [result] = await inhousePool.query(
            `INSERT INTO categories_folders (name, description, category_id, parent_folder_id, path, is_active, created_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 1, ?, NOW(), NOW())`,
            [sanitizedName, sanitizedDesc, category_id, parent_folder_id || null, sanitizedPath, created_by]
        );

        await addActivityLog(created_by, 'create', 'folder', result.insertId, sanitizedName);

        res.status(201).json({ message: 'Folder created successfully', folder_id: result.insertId });

    } catch (error) {
        console.error('Error creating folder:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================
// UPDATE FOLDER
// PUT /api/intranet/categories/folders/:id
// ============================================
exports.updateFolder = async (req, res) => {
    const { id }                                                                    = req.params;
    const { name, description, category_id, parent_folder_id, is_active, updated_by } = req.body;

    try {
        if (!id || isNaN(id))  return res.status(400).json({ error: 'Valid folder ID is required' });
        if (!updated_by)        return res.status(400).json({ error: 'updated_by is required' });

        const [existing] = await inhousePool.query('SELECT * FROM categories_folders WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Folder not found' });

        const currentFolder = existing[0];

        const userValid = await validateUser(updated_by);
        if (!userValid) return res.status(400).json({ error: 'Invalid updated_by user' });

        if (category_id && category_id !== currentFolder.category_id) {
            const [catRows] = await inhousePool.query('SELECT id FROM categories WHERE id = ?', [category_id]);
            if (catRows.length === 0) return res.status(400).json({ error: 'Invalid category_id' });
        }

        if (parent_folder_id && parent_folder_id !== currentFolder.parent_folder_id) {
            if (parent_folder_id == id) return res.status(400).json({ error: 'Folder cannot be its own parent' });
            const [parentRows] = await inhousePool.query('SELECT id FROM categories_folders WHERE id = ?', [parent_folder_id]);
            if (parentRows.length === 0) return res.status(400).json({ error: 'Invalid parent_folder_id' });
        }

        const updates = [];
        const params  = [];

        if (name             !== undefined) { updates.push('name = ?');             params.push(sanitizeInput(name)); }
        if (description      !== undefined) { updates.push('description = ?');      params.push(sanitizeInput(description)); }
        if (category_id      !== undefined) { updates.push('category_id = ?');      params.push(category_id); }
        if (parent_folder_id !== undefined) { updates.push('parent_folder_id = ?'); params.push(parent_folder_id || null); }
        if (is_active        !== undefined) { updates.push('is_active = ?');        params.push(is_active ? 1 : 0); }

        updates.push('updated_by = ?, updated_at = NOW()');
        params.push(updated_by, id);

        await inhousePool.query(`UPDATE categories_folders SET ${updates.join(', ')} WHERE id = ?`, params);

        const actionType = (name && name !== currentFolder.name) ? 'rename' : 'update';
        await addActivityLog(updated_by, actionType, 'folder', id, name || currentFolder.name);

        res.json({ message: 'Folder updated successfully' });

    } catch (error) {
        console.error('Error updating folder:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================
// DELETE FOLDER
// DELETE /api/intranet/categories/folders/:id
// ============================================
exports.deleteFolder = async (req, res) => {
    const { id }         = req.params;
    const { deleted_by } = req.body;

    try {
        if (!id || isNaN(id))  return res.status(400).json({ error: 'Valid folder ID is required' });
        if (!deleted_by)        return res.status(400).json({ error: 'deleted_by is required' });

        const userValid = await validateUser(deleted_by);
        if (!userValid) return res.status(400).json({ error: 'Invalid deleted_by user' });

        const [existing] = await inhousePool.query('SELECT * FROM categories_folders WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Folder not found' });

        const folder = existing[0];

        const [childFolders] = await inhousePool.query('SELECT COUNT(*) as count FROM categories_folders WHERE parent_folder_id = ?', [id]);
        if (childFolders[0].count > 0) return res.status(400).json({ error: 'Cannot delete folder with child folders' });

        const [files] = await inhousePool.query('SELECT COUNT(*) as count FROM categories_files WHERE folder_id = ?', [id]);
        if (files[0].count > 0) return res.status(400).json({ error: 'Cannot delete folder containing files' });

        await inhousePool.query('DELETE FROM categories_folders WHERE id = ?', [id]);
        await addActivityLog(deleted_by, 'delete', 'folder', id, folder.name);

        res.json({ message: 'Folder deleted successfully' });

    } catch (error) {
        console.error('Error deleting folder:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================
// GET FOLDER TREE
// GET /api/intranet/categories/folders/tree/:category_id
// ============================================
exports.getFolderTree = async (req, res) => {
    const { category_id } = req.params;

    try {
        if (!category_id || isNaN(category_id)) {
            return res.status(400).json({ error: 'Valid category ID is required' });
        }

        const [folders] = await inhousePool.query(
            'SELECT id, name, parent_folder_id, path FROM categories_folders WHERE category_id = ? AND is_active = 1 ORDER BY name',
            [category_id]
        );

        const buildTree = (parentId = null) => {
            return folders
                .filter(f => f.parent_folder_id === parentId)
                .map(f => ({ ...f, children: buildTree(f.id) }));
        };

        res.json({ message: 'Folder tree retrieved successfully', tree: buildTree() });

    } catch (error) {
        console.error('Error getting folder tree:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================
// UNIVERSAL SEARCH
// GET /api/intranet/categories/search
// ============================================
exports.search = async (req, res) => {
    const { q: query, limit = 50 } = req.query;

    try {
        if (!query || query.trim() === '') {
            return res.status(400).json({ error: "Search query 'q' is required" });
        }

        const searchTerm  = `%${sanitizeInput(query)}%`;
        const searchLimit = parseInt(limit);

        const [categories] = await inhousePool.query(
            `SELECT c.*, u.name AS created_by_name FROM categories c LEFT JOIN ${process.env.DATABASE_DB}.user u ON c.created_by = u.user_id WHERE c.name LIKE ? OR c.description LIKE ? ORDER BY c.name ASC LIMIT ?`,
            [searchTerm, searchTerm, searchLimit]
        );

        const [folders] = await inhousePool.query(
            `SELECT f.*, c.name AS category_name, u.name AS created_by_name FROM categories_folders f LEFT JOIN categories c ON f.category_id = c.id LEFT JOIN ${process.env.DATABASE_DB}.user u ON f.created_by = u.user_id WHERE f.name LIKE ? OR f.description LIKE ? ORDER BY f.name ASC LIMIT ?`,
            [searchTerm, searchTerm, searchLimit]
        );

        const [files] = await inhousePool.query(
            `SELECT f.*, c.name AS category_name, cf.name AS folder_name, u.name AS created_by_name FROM categories_files f LEFT JOIN categories c ON f.category_id = c.id LEFT JOIN categories_folders cf ON f.folder_id = cf.id LEFT JOIN ${process.env.DATABASE_DB}.user u ON f.created_by = u.user_id WHERE f.name LIKE ? OR f.original_name LIKE ? OR f.description LIKE ? ORDER BY f.name ASC LIMIT ?`,
            [searchTerm, searchTerm, searchTerm, searchLimit]
        );

        res.json({
            message:      'Search completed successfully',
            query:        query.trim(),
            results:      { categories: categories || [], folders: folders || [], files: files || [] },
            totalResults: categories.length + folders.length + files.length
        });

    } catch (error) {
        console.error('💥 Error in universal search:', error);
        res.status(500).json({ error: 'Search failed: ' + error.message });
    }
};

// ============================================
// GET ALL FILES
// GET /api/intranet/categories/files
// ============================================
exports.getFiles = async (req, res) => {
    const { category_id, folder_id, file_type, is_starred, is_active, search, limit, offset } = req.query;

    try {
        let query = `
            SELECT f.*, c.name AS category_name, cf.name AS folder_name,
                   u.name AS created_by_name, u2.name AS updated_by_name
            FROM categories_files f
            LEFT JOIN categories c ON f.category_id = c.id
            LEFT JOIN categories_folders cf ON f.folder_id = cf.id
            LEFT JOIN ${process.env.DATABASE_DB}.user u  ON f.created_by = u.user_id
            LEFT JOIN ${process.env.DATABASE_DB}.user u2 ON f.updated_by = u2.user_id
            WHERE 1=1
        `;
        const params = [];

        if (category_id)      { query += ' AND f.category_id = ?';  params.push(category_id); }
        if (folder_id !== undefined) {
            if (folder_id === 'null' || folder_id === '') { query += ' AND f.folder_id IS NULL'; }
            else { query += ' AND f.folder_id = ?'; params.push(folder_id); }
        }
        if (file_type)        { query += ' AND f.file_type = ?';     params.push(file_type); }
        if (is_starred !== undefined) { query += ' AND f.is_starred = ?'; params.push(is_starred === 'true' ? 1 : 0); }
        if (is_active  !== undefined) { query += ' AND f.is_active = ?';  params.push(is_active  === 'true' ? 1 : 0); }
        if (search) {
            query += ' AND (f.name LIKE ? OR f.original_name LIKE ?)';
            const st = `%${sanitizeInput(search)}%`;
            params.push(st, st);
        }

        query += ' ORDER BY f.created_at DESC';
        if (limit)  { query += ' LIMIT ?';  params.push(parseInt(limit)); }
        if (offset) { query += ' OFFSET ?'; params.push(parseInt(offset)); }

        const [files] = await inhousePool.query(query, params);

        res.json({
            message:     'Files retrieved successfully',
            files:       files.map(f => ({ ...f, formatted_size: formatFileSize(f.file_size) })),
            total_count: files.length
        });

    } catch (error) {
        console.error('Error getting files:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================
// GET SINGLE FILE
// GET /api/intranet/categories/files/:id
// ============================================
exports.getFile = async (req, res) => {
    const { id } = req.params;

    try {
        if (!id || isNaN(id)) return res.status(400).json({ error: 'Valid file ID is required' });

        const [files] = await inhousePool.query(
            `SELECT f.*, c.name AS category_name, cf.name AS folder_name,
                    u.name AS created_by_name, u2.name AS updated_by_name
             FROM categories_files f
             LEFT JOIN categories c ON f.category_id = c.id
             LEFT JOIN categories_folders cf ON f.folder_id = cf.id
             LEFT JOIN ${process.env.DATABASE_DB}.user u  ON f.created_by = u.user_id
             LEFT JOIN ${process.env.DATABASE_DB}.user u2 ON f.updated_by = u2.user_id
             WHERE f.id = ?`,
            [id]
        );

        if (files.length === 0) return res.status(404).json({ error: 'File not found' });

        const file = files[0];
        file.formatted_size = formatFileSize(file.file_size);

        res.json({ message: 'File retrieved successfully', file });

    } catch (error) {
        console.error('Error getting file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================
// UPLOAD SINGLE FILE
// POST /api/intranet/categories/files/upload-single
// ============================================
exports.uploadSingleFile = async (req, res) => {
    const { category_id, folder_id, created_by, description = '' } = req.body;
    const uploadedFile = req.file;

    try {
        if (!category_id || !created_by) {
            if (uploadedFile) await cleanupFiles([uploadedFile]);
            return res.status(400).json({ error: 'category_id and created_by are required' });
        }
        if (!uploadedFile) return res.status(400).json({ error: 'No file uploaded' });

        const userValid = await validateUser(created_by);
        if (!userValid) {
            await cleanupFiles([uploadedFile]);
            return res.status(400).json({ error: 'Invalid created_by user' });
        }

        const [categoryRows] = await inhousePool.query('SELECT id FROM categories WHERE id = ?', [category_id]);
        if (categoryRows.length === 0) {
            await cleanupFiles([uploadedFile]);
            return res.status(400).json({ error: 'Invalid category_id' });
        }

        if (folder_id) {
            const [folderRows] = await inhousePool.query(
                'SELECT id FROM categories_folders WHERE id = ? AND category_id = ?',
                [folder_id, category_id]
            );
            if (folderRows.length === 0) {
                await cleanupFiles([uploadedFile]);
                return res.status(400).json({ error: 'Invalid folder_id for this category' });
            }
        }

        const sanitizedName = sanitizeInput(uploadedFile.originalname);

        // Check for duplicate
        const conflictQuery  = folder_id
            ? 'SELECT id, name, file_size FROM categories_files WHERE name = ? AND folder_id = ? AND is_active = 1'
            : 'SELECT id, name, file_size FROM categories_files WHERE name = ? AND folder_id IS NULL AND category_id = ? AND is_active = 1';
        const conflictParams = folder_id ? [sanitizedName, folder_id] : [sanitizedName, category_id];
        const [existing]     = await inhousePool.query(conflictQuery, conflictParams);

        if (existing.length > 0) {
            return res.status(409).json({
                conflict:             true,
                message:              `A file named "${sanitizedName}" already exists at this location.`,
                existing_file:        { id: existing[0].id, name: existing[0].name, file_size: existing[0].file_size },
                uploaded_file:        { temp_path: uploadedFile.path, original_name: sanitizedName, file_size: uploadedFile.size, mime_type: uploadedFile.mimetype, file_type: path.extname(uploadedFile.originalname).substring(1).toLowerCase() },
                available_strategies: ['overwrite', 'version', 'skip'],
                context:              { category_id, folder_id: folder_id || null, created_by }
            });
        }

        const document_status = req.body.document_status || 'none';
        const stamp_placement = req.body.stamp_placement || 'every_page';

        const [result] = await inhousePool.query(
            `INSERT INTO categories_files
             (name, original_name, description, file_type, file_size, mime_type, file_path, category_id, folder_id,
              document_status, stamp_placement, is_starred, is_active, download_count, last_accessed, created_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 0, NOW(), ?, NOW(), NOW())`,
            [sanitizedName, sanitizedName, description, path.extname(uploadedFile.originalname).substring(1).toLowerCase(), uploadedFile.size, uploadedFile.mimetype, uploadedFile.path, category_id, folder_id || null, document_status, stamp_placement, created_by]
        );

        await addActivityLog(created_by, 'upload', 'file', result.insertId, sanitizedName, `Size: ${formatFileSize(uploadedFile.size)}`);

        res.status(201).json({
            message: 'File uploaded successfully',
            file: { file_id: result.insertId, original_name: sanitizedName, file_size: formatFileSize(uploadedFile.size), file_type: path.extname(uploadedFile.originalname).substring(1).toLowerCase(), mime_type: uploadedFile.mimetype, description }
        });

    } catch (error) {
        console.error('Error uploading file:', error);
        if (req.file) await cleanupFiles([req.file]);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================
// RESOLVE UPLOAD CONFLICT
// POST /api/intranet/categories/files/upload/resolve
// ============================================
exports.resolveUploadConflict = async (req, res) => {
    const { strategy, temp_path, original_name, file_size, mime_type, file_type, existing_file_id, category_id, folder_id, created_by, description = '' } = req.body;

    try {
        if (!strategy || !['overwrite', 'version', 'skip'].includes(strategy)) {
            return res.status(400).json({ error: 'strategy must be overwrite, version, or skip' });
        }
        if (!created_by)   return res.status(400).json({ error: 'created_by is required' });
        if (!category_id)  return res.status(400).json({ error: 'category_id is required' });

        const userValid = await validateUser(created_by);
        if (!userValid) return res.status(400).json({ error: 'Invalid created_by user' });

        // ── SKIP ──
        if (strategy === 'skip') {
            if (temp_path && fs.existsSync(temp_path)) {
                try { fs.unlinkSync(temp_path); } catch (e) {}
            }
            return res.json({ message: 'Upload skipped', skipped: true, original_name });
        }

        if (!existing_file_id) return res.status(400).json({ error: 'existing_file_id is required' });
        if (!temp_path)        return res.status(400).json({ error: 'temp_path is required' });

        const [existingRows] = await inhousePool.query('SELECT * FROM categories_files WHERE id = ? AND is_active = 1', [existing_file_id]);
        if (existingRows.length === 0) return res.status(404).json({ error: 'Existing file not found' });
        if (!fs.existsSync(temp_path)) return res.status(400).json({ error: 'Temp file no longer exists — please re-upload' });

        const existingFile    = existingRows[0];
        const document_status = req.body.document_status || 'none';
        const stamp_placement = req.body.stamp_placement || 'every_page';

        // ── OVERWRITE ──
        if (strategy === 'overwrite') {
            const [maxVer] = await inhousePool.query('SELECT MAX(version_number) as max_version FROM file_versions WHERE category_file_id = ?', [existing_file_id]);
            const nextVersion = (maxVer[0].max_version || 0) + 1;

            await inhousePool.query(
                `INSERT INTO file_versions (category_file_id, version_number, file_name, file_path, file_size, file_type, moved_from_folder_id, created_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [existing_file_id, nextVersion, existingFile.name, existingFile.file_path, existingFile.file_size, existingFile.file_type, existingFile.folder_id || null, created_by, `Overwritten by re-upload on ${new Date().toISOString()}`]
            );

            if (existingFile.file_path && existingFile.file_path !== temp_path && fs.existsSync(existingFile.file_path)) {
                try { fs.unlinkSync(existingFile.file_path); } catch (e) {}
            }

            await inhousePool.query(
                `UPDATE categories_files SET file_path = ?, file_size = ?, file_type = ?, mime_type = ?, description = ?, document_status = ?, stamp_placement = ?, updated_by = ?, updated_at = NOW() WHERE id = ?`,
                [temp_path, file_size, file_type, mime_type, description, document_status, stamp_placement, created_by, existing_file_id]
            );

            await addActivityLog(created_by, 'update', 'file', existing_file_id, existingFile.name, `Overwritten. Previous saved as v${nextVersion}.`);

            return res.json({ message: `File overwritten. Previous version saved as version ${nextVersion}.`, strategy: 'overwrite', file: { file_id: existing_file_id, name: existingFile.name, previous_version_saved: nextVersion } });
        }

        // ── VERSION ──
        if (strategy === 'version') {
            const sanitizedName    = sanitizeInput(original_name);
            const ext              = path.extname(sanitizedName);
            const baseName         = path.basename(sanitizedName, ext);
            const [maxVer]         = await inhousePool.query('SELECT MAX(version_number) as max_version FROM file_versions WHERE category_file_id = ?', [existing_file_id]);
            const nextVersion      = (maxVer[0].max_version || 0) + 1;
            const versionedName    = `${baseName} (Version ${nextVersion})${ext}`;

            const versionedPhysical = `${Date.now()}-${versionedName.replace(/[^a-zA-Z0-9.\-()]/g, '_')}`;
            const versionedFilePath = path.join('uploads-intranet', versionedPhysical);
            const resolvedPath      = path.join(process.cwd(), versionedFilePath);

            if (fs.existsSync(temp_path)) {
                try { await fs.promises.rename(temp_path, resolvedPath); } catch (e) { console.warn('Rename failed:', e.message); }
            }

            const finalPath = fs.existsSync(resolvedPath) ? versionedFilePath : temp_path;

            const [result] = await inhousePool.query(
                `INSERT INTO categories_files (name, original_name, description, file_type, file_size, mime_type, file_path, category_id, folder_id, document_status, stamp_placement, is_starred, is_active, download_count, last_accessed, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 0, NOW(), ?, NOW(), NOW())`,
                [versionedName, versionedName, description, file_type, file_size, mime_type, finalPath, category_id, folder_id || null, document_status, stamp_placement, created_by]
            );

            await inhousePool.query(
                `INSERT INTO file_versions (category_file_id, version_number, file_name, file_path, file_size, file_type, document_status, stamp_placement, moved_from_folder_id, created_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [existing_file_id, nextVersion, versionedName, finalPath, file_size, file_type, document_status, stamp_placement, folder_id || null, created_by, `Version ${nextVersion} — uploaded alongside existing file`]
            );

            await addActivityLog(created_by, 'upload', 'file', result.insertId, versionedName, `Saved as version ${nextVersion} of file ID ${existing_file_id}`);

            return res.json({ message: `File saved as "${versionedName}" (version ${nextVersion}).`, strategy: 'version', file: { file_id: result.insertId, name: versionedName, version_number: nextVersion, original_file_id: existing_file_id } });
        }

    } catch (error) {
        console.error('💥 Error resolving upload conflict:', error);
        return res.status(500).json({ error: 'Failed to resolve conflict: ' + error.message });
    }
};

// ============================================
// UPLOAD MULTIPLE FILES
// POST /api/intranet/categories/files/upload-multiple
// ============================================
exports.uploadMultipleFiles = async (req, res) => {
    const { category_id, folder_id, created_by } = req.body;
    const uploadedFiles = req.files;

    try {
        if (!category_id || !created_by) {
            if (uploadedFiles) await cleanupFiles(uploadedFiles);
            return res.status(400).json({ error: 'category_id and created_by are required' });
        }
        if (!uploadedFiles || uploadedFiles.length === 0) return res.status(400).json({ error: 'No files uploaded' });

        const userValid = await validateUser(created_by);
        if (!userValid) { await cleanupFiles(uploadedFiles); return res.status(400).json({ error: 'Invalid created_by user' }); }

        const [categoryRows] = await inhousePool.query('SELECT id FROM categories WHERE id = ?', [category_id]);
        if (categoryRows.length === 0) { await cleanupFiles(uploadedFiles); return res.status(400).json({ error: 'Invalid category_id' }); }

        if (folder_id) {
            const [folderRows] = await inhousePool.query('SELECT id FROM categories_folders WHERE id = ? AND category_id = ?', [folder_id, category_id]);
            if (folderRows.length === 0) { await cleanupFiles(uploadedFiles); return res.status(400).json({ error: 'Invalid folder_id for this category' }); }
        }

        const uploadResults = [];
        const errors        = [];
        const document_status = req.body.document_status || 'none';
        const stamp_placement = req.body.stamp_placement || 'every_page';

        for (const file of uploadedFiles) {
            try {
                const sanitizedName = sanitizeInput(file.originalname);

                const [result] = await inhousePool.query(
                    `INSERT INTO categories_files (name, original_name, description, file_type, file_size, mime_type, file_path, category_id, folder_id, document_status, stamp_placement, is_starred, is_active, download_count, last_accessed, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 0, NOW(), ?, NOW(), NOW())`,
                    [sanitizedName, sanitizedName, '', path.extname(file.originalname).substring(1).toLowerCase(), file.size, file.mimetype, file.path, category_id, folder_id || null, document_status, stamp_placement, created_by]
                );

                await addActivityLog(created_by, 'upload', 'file', result.insertId, sanitizedName, `Size: ${formatFileSize(file.size)}`);
                uploadResults.push({ file_id: result.insertId, original_name: sanitizedName, file_size: formatFileSize(file.size), file_type: path.extname(file.originalname).substring(1).toLowerCase(), mime_type: file.mimetype });

            } catch (fileError) {
                errors.push({ filename: file.originalname, error: 'Failed to process file' });
                try { await unlinkAsync(file.path); } catch (e) {}
            }
        }

        res.status(201).json({ message: `${uploadResults.length} file(s) uploaded successfully`, files: uploadResults, errors: errors.length > 0 ? errors : undefined, summary: { total: uploadedFiles.length, successful: uploadResults.length, failed: errors.length } });

    } catch (error) {
        console.error('Error uploading files:', error);
        if (req.files) await cleanupFiles(req.files);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================
// DOWNLOAD / PREVIEW FILE
// GET /api/intranet/categories/files/:id/download
// ============================================
exports.downloadFile = async (req, res) => {
    const { id }               = req.params;
    const { user_id, preview } = req.query;

    try {
        if (!id || isNaN(id)) return res.status(400).json({ error: 'Valid file ID is required' });

        const [files] = await inhousePool.query('SELECT * FROM categories_files WHERE id = ? AND is_active = 1', [id]);
        if (files.length === 0) return res.status(404).json({ error: 'File not found' });

        const file      = files[0];
        const isPreview = preview === 'true';

        if (!validateFilePath(file.file_path)) return res.status(400).json({ error: 'Invalid file path' });
        if (!fs.existsSync(file.file_path))    return res.status(404).json({ error: 'Physical file not found' });

        if (!isPreview) {
            await inhousePool.query('UPDATE categories_files SET download_count = download_count + 1, last_accessed = NOW() WHERE id = ?', [id]);
            if (user_id) await addActivityLog(user_id, 'download', 'file', id, file.name, `Downloaded - Size: ${formatFileSize(file.file_size)}`);
        } else {
            await inhousePool.query('UPDATE categories_files SET last_accessed = NOW() WHERE id = ?', [id]);
        }

        await protectAndSendFile(res, file, file.file_path, {
            userId:         user_id,
            isPreview,
            fileNameField:  'original_name',
            documentStatus: file.document_status,
            stampPlacement: file.stamp_placement
        });

    } catch (error) {
        console.error('❌ Error in download endpoint:', error);
        if (!res.headersSent) res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

// ============================================
// PREVIEW FILE
// GET /api/intranet/categories/files/:id/preview
// ============================================
exports.previewFile = async (req, res) => {
    const { id }     = req.params;
    const { user_id } = req.query;

    try {
        const [files] = await inhousePool.query('SELECT * FROM categories_files WHERE id = ? AND is_active = 1', [id]);
        if (files.length === 0) return res.status(404).json({ error: 'File not found' });

        const file = files[0];

        // Check access
        const [shares] = await inhousePool.query('SELECT id FROM file_shares WHERE category_file_id = ? AND shared_with = ?', [id, user_id]);
        if (String(file.created_by) !== String(user_id) && shares.length === 0) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!fs.existsSync(file.file_path)) return res.status(404).json({ error: 'File not found on disk' });

        // Stamped PDF preview
        if (file.file_type?.toLowerCase() === 'pdf') {
            return await serveStampedPdfPreview(res, file.file_path, { ...file, file_name: file.original_name });
        }

        serveFileDirectly(res, file.file_path, file.original_name, file.mime_type, true);

    } catch (error) {
        console.error('Error previewing file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================
// UPDATE FILE
// PUT /api/intranet/categories/files/:id
// ============================================
exports.updateFile = async (req, res) => {
    const { id }                                                          = req.params;
    const { name, category_id, folder_id, is_starred, is_active, updated_by } = req.body;

    try {
        if (!id || isNaN(id)) return res.status(400).json({ error: 'Valid file ID is required' });
        if (!updated_by)       return res.status(400).json({ error: 'updated_by is required' });

        const [existing] = await inhousePool.query('SELECT * FROM categories_files WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ error: 'File not found' });

        const currentFile = existing[0];

        const userValid = await validateUser(updated_by);
        if (!userValid) return res.status(400).json({ error: 'Invalid updated_by user' });

        const updates = [];
        const params  = [];

        if (name        !== undefined) { updates.push('name = ?');        params.push(sanitizeInput(name)); }
        if (category_id !== undefined) { updates.push('category_id = ?'); params.push(category_id); }
        if (folder_id   !== undefined) { updates.push('folder_id = ?');   params.push(folder_id || null); }
        if (is_starred  !== undefined) { updates.push('is_starred = ?');  params.push(is_starred ? 1 : 0); }
        if (is_active   !== undefined) { updates.push('is_active = ?');   params.push(is_active  ? 1 : 0); }

        updates.push('updated_by = ?, updated_at = NOW()');
        params.push(updated_by, id);

        await inhousePool.query(`UPDATE categories_files SET ${updates.join(', ')} WHERE id = ?`, params);

        const actionType = (name && name !== currentFile.name) ? 'rename' : 'update';
        await addActivityLog(updated_by, actionType, 'file', id, name || currentFile.name);

        res.json({ message: 'File updated successfully' });

    } catch (error) {
        console.error('Error updating file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================
// DELETE FILE
// DELETE /api/intranet/categories/files/:id
// ============================================
exports.deleteFile = async (req, res) => {
    const { id }                       = req.params;
    const { deleted_by, updated_by }   = req.body;
    const userId                       = deleted_by || updated_by;

    try {
        if (!id || isNaN(id)) return res.status(400).json({ error: 'Valid file ID is required' });
        if (!userId)           return res.status(400).json({ error: 'deleted_by or updated_by is required' });

        const userValid = await validateUser(userId);
        if (!userValid) return res.status(400).json({ error: 'Invalid user ID' });

        const [existing] = await inhousePool.query('SELECT * FROM categories_files WHERE id = ?', [parseInt(id)]);
        if (existing.length === 0) return res.status(404).json({ error: 'File not found' });

        const file = existing[0];

        try {
            if (validateFilePath(file.file_path) && fs.existsSync(file.file_path)) {
                await unlinkAsync(file.file_path);
            }
        } catch (fileError) {
            console.error('⚠️ Error deleting physical file:', fileError);
        }

        if (file.file_type?.toLowerCase() === 'pdf') {
            pdfPasswordManager.deletePassword(id);
        }

        await inhousePool.query('DELETE FROM categories_files WHERE id = ?', [parseInt(id)]);
        await addActivityLog(userId, 'delete', 'file', id, file.name, `Size: ${formatFileSize(file.file_size)}`);

        res.json({ message: 'File deleted successfully', deleted_file: { id: file.id, name: file.name } });

    } catch (error) {
        console.error('❌ Error deleting file:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

// ============================================
// MOVE MULTIPLE FILES
// POST /api/intranet/categories/files/move-multiple
// ============================================
exports.moveMultipleFiles = async (req, res) => {
    const { file_ids, target_category_id, target_folder_id, moved_by } = req.body;

    try {
        if (!file_ids || !Array.isArray(file_ids) || file_ids.length === 0) return res.status(400).json({ error: 'file_ids array is required' });
        if (!target_category_id || !moved_by) return res.status(400).json({ error: 'target_category_id and moved_by are required' });

        const userValid = await validateUser(moved_by);
        if (!userValid) return res.status(400).json({ error: 'Invalid moved_by user' });

        const [categoryRows] = await inhousePool.query('SELECT id FROM categories WHERE id = ?', [target_category_id]);
        if (categoryRows.length === 0) return res.status(400).json({ error: 'Invalid target_category_id' });

        const results = { moved: [], errors: [] };

        for (const file_id of file_ids) {
            try {
                const [files] = await inhousePool.query('SELECT * FROM categories_files WHERE id = ?', [file_id]);
                if (files.length === 0) { results.errors.push({ file_id, error: 'File not found' }); continue; }
                await inhousePool.query('UPDATE categories_files SET category_id = ?, folder_id = ?, updated_by = ?, updated_at = NOW() WHERE id = ?', [target_category_id, target_folder_id || null, moved_by, file_id]);
                await addActivityLog(moved_by, 'move', 'file', file_id, files[0].name);
                results.moved.push({ file_id, name: files[0].name });
            } catch (error) {
                results.errors.push({ file_id, error: 'Failed to move file' });
            }
        }

        res.json({ message: `Move completed: ${results.moved.length} moved, ${results.errors.length} errors`, results });

    } catch (error) {
        console.error('Error moving files:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================
// GET FILE VERSION HISTORY
// GET /api/intranet/categories/files/:id/versions
// ============================================
exports.getFileVersions = async (req, res) => {
    const { id } = req.params;

    try {
        if (!id || isNaN(id)) return res.status(400).json({ error: 'Valid file ID is required' });

        const [files] = await inhousePool.query(
            `SELECT f.*, cf.name AS folder_name FROM categories_files f LEFT JOIN categories_folders cf ON f.folder_id = cf.id WHERE f.id = ?`,
            [id]
        );
        if (files.length === 0) return res.status(404).json({ error: 'File not found' });

        const currentFile = files[0];

        const [versions] = await inhousePool.query(
            `SELECT fv.*, u.name AS created_by_name, cf.name AS moved_from_folder_name
             FROM file_versions fv
             LEFT JOIN ${process.env.DATABASE_DB}.user u ON fv.created_by = u.user_id
             LEFT JOIN categories_folders cf ON fv.moved_from_folder_id = cf.id
             WHERE fv.category_file_id = ?
             ORDER BY fv.version_number DESC`,
            [id]
        );

        res.json({
            message:      `Version history for "${currentFile.name}"`,
            current_file: { id: currentFile.id, name: currentFile.name, size: currentFile.file_size, type: currentFile.file_type, folder: currentFile.folder_name || 'root', updated_at: currentFile.updated_at },
            versions:     versions.map(v => ({ id: v.id, version_number: v.version_number, file_name: v.file_name, file_size: v.file_size, file_type: v.file_type, moved_from_folder: v.moved_from_folder_name || 'root', saved_by: v.created_by_name, saved_at: v.created_at, notes: v.notes })),
            total_versions: versions.length
        });

    } catch (err) {
        console.error('💥 Error getting version history:', err);
        res.status(500).json({ error: 'Failed to get version history: ' + err.message });
    }
};

// ============================================
// RESTORE FILE VERSION
// POST /api/intranet/categories/files/:id/versions/:versionId/restore
// ============================================
exports.restoreFileVersion = async (req, res) => {
    const { id, versionId } = req.params;
    const { restored_by }   = req.body;

    try {
        if (!restored_by) return res.status(400).json({ error: 'restored_by is required' });

        const userValid = await validateUser(restored_by);
        if (!userValid) return res.status(400).json({ error: 'Invalid restored_by user' });

        const [files]    = await inhousePool.query('SELECT * FROM categories_files WHERE id = ?', [id]);
        if (files.length === 0) return res.status(404).json({ error: 'File not found' });
        const currentFile = files[0];

        const [versions] = await inhousePool.query('SELECT * FROM file_versions WHERE id = ? AND category_file_id = ?', [versionId, id]);
        if (versions.length === 0) return res.status(404).json({ error: 'Version not found' });
        const versionToRestore = versions[0];

        // Verify version file exists
        let versionFilePath = versionToRestore.file_path;
        let found           = false;
        const pathVariations = [versionToRestore.file_path, path.resolve(versionToRestore.file_path), path.join(process.cwd(), versionToRestore.file_path), path.join(UPLOADS_BASE, path.basename(versionToRestore.file_path))];
        for (const p of pathVariations) { if (fs.existsSync(p)) { versionFilePath = p; found = true; break; } }
        if (!found) return res.status(404).json({ error: 'Version file not found on disk — cannot restore' });

        // Snapshot current before overwriting
        const [maxVer]        = await inhousePool.query('SELECT MAX(version_number) as max_version FROM file_versions WHERE category_file_id = ?', [id]);
        const snapshotVersion = (maxVer[0].max_version || 0) + 1;

        await inhousePool.query(
            `INSERT INTO file_versions (category_file_id, version_number, file_name, file_path, file_size, file_type, moved_from_folder_id, created_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, snapshotVersion, currentFile.name, currentFile.file_path, currentFile.file_size, currentFile.file_type, currentFile.folder_id || null, restored_by, `Auto-snapshot before restoring version ${versionToRestore.version_number}`]
        );

        await inhousePool.query('UPDATE categories_files SET file_path = ?, file_size = ?, file_type = ?, updated_by = ?, updated_at = NOW() WHERE id = ?', [versionToRestore.file_path, versionToRestore.file_size, versionToRestore.file_type, restored_by, id]);
        await inhousePool.query('DELETE FROM file_versions WHERE id = ?', [versionId]);
        await addActivityLog(restored_by, 'update', 'file', currentFile.id, currentFile.name, `Restored version ${versionToRestore.version_number}. Previous state saved as version ${snapshotVersion}.`);

        res.json({ message: `Version ${versionToRestore.version_number} restored. Previous state saved as version ${snapshotVersion}.`, restored: true, file: { id: currentFile.id, name: currentFile.name, restored_from_version: versionToRestore.version_number, previous_state_saved_as_version: snapshotVersion } });

    } catch (err) {
        console.error('💥 Error restoring version:', err);
        res.status(500).json({ error: 'Version restore failed: ' + err.message });
    }
};

// ============================================
// DELETE FILE VERSION
// DELETE /api/intranet/categories/files/:id/versions/:versionId
// ============================================
exports.deleteFileVersion = async (req, res) => {
    const { id, versionId } = req.params;
    const { deleted_by }    = req.body;

    try {
        if (!deleted_by) return res.status(400).json({ error: 'deleted_by is required' });

        const userValid = await validateUser(deleted_by);
        if (!userValid) return res.status(400).json({ error: 'Invalid deleted_by user' });

        const [files]    = await inhousePool.query('SELECT * FROM categories_files WHERE id = ?', [id]);
        if (files.length === 0) return res.status(404).json({ error: 'File not found' });
        const currentFile = files[0];

        const [versions] = await inhousePool.query('SELECT * FROM file_versions WHERE id = ? AND category_file_id = ?', [versionId, id]);
        if (versions.length === 0) return res.status(404).json({ error: 'Version not found' });
        const version = versions[0];

        const [versionCount] = await inhousePool.query('SELECT COUNT(*) as count FROM file_versions WHERE category_file_id = ?', [id]);

        await inhousePool.query('DELETE FROM file_versions WHERE id = ?', [versionId]);

        let physicalFileDeleted = false;
        if (path.resolve(version.file_path) !== path.resolve(currentFile.file_path)) {
            const pathVariations = [version.file_path, path.resolve(version.file_path), path.join(process.cwd(), version.file_path), path.join(UPLOADS_BASE, path.basename(version.file_path))];
            for (const p of pathVariations) {
                if (fs.existsSync(p)) {
                    try { fs.unlinkSync(p); physicalFileDeleted = true; } catch (e) {}
                    break;
                }
            }
        }

        await addActivityLog(deleted_by, 'delete', 'file', currentFile.id, currentFile.name, `Deleted version ${version.version_number}`);

        res.json({ message: `Version ${version.version_number} deleted successfully.`, deleted: true, version: { id: version.id, version_number: version.version_number, file_name: version.file_name }, physical_file_deleted: physicalFileDeleted, remaining_versions: versionCount[0].count - 1 });

    } catch (err) {
        console.error('💥 Error deleting version:', err);
        res.status(500).json({ error: 'Version delete failed: ' + err.message });
    }
};

// ============================================
// TOGGLE STAR CATEGORY FILE
// POST /api/intranet/categories/starred-files/star/:fileId
// ============================================
exports.toggleStar = async (req, res) => {
    const { fileId }  = req.params;
    const { user_id } = req.body;

    try {
        if (!user_id) return res.status(400).json({ error: 'user_id is required' });

        const userExists = await validateUser(user_id);
        if (!userExists) return res.status(400).json({ error: 'Invalid user' });

        const [fileCheck] = await inhousePool.query('SELECT id, name FROM categories_files WHERE id = ? AND is_active = 1', [fileId]);
        if (fileCheck.length === 0) return res.status(404).json({ error: 'File not found' });

        const [existing] = await inhousePool.query('SELECT id FROM starred_files WHERE user_id = ? AND category_file_id = ?', [user_id, fileId]);

        if (existing.length > 0) {
            await inhousePool.query('DELETE FROM starred_files WHERE user_id = ? AND category_file_id = ?', [user_id, fileId]);
            return res.json({ message: 'File unstarred successfully', starred: false, fileId, fileName: fileCheck[0].name });
        }

        await inhousePool.query('INSERT INTO starred_files (user_id, category_file_id, created_at) VALUES (?, ?, NOW())', [user_id, fileId]);
        return res.json({ message: 'File starred successfully', starred: true, fileId, fileName: fileCheck[0].name });

    } catch (err) {
        console.error('💥 Error toggling star:', err);
        res.status(500).json({ error: 'Failed to toggle star: ' + err.message });
    }
};

// ============================================
// GET STARRED CATEGORY FILES
// GET /api/intranet/categories/starred-files
// ============================================
exports.getStarredFiles = async (req, res) => {
    const { user_id } = req.query;

    try {
        if (!user_id) return res.status(400).json({ error: 'user_id is required' });

        const userExists = await validateUser(user_id);
        if (!userExists) return res.status(400).json({ error: 'Invalid user' });

        const [starredFiles] = await inhousePool.query(
            `SELECT f.*, sf.created_at AS starred_at, c.name AS category_name, cf.name AS folder_name, u.name AS created_by_name
             FROM starred_files sf
             JOIN categories_files f ON sf.category_file_id = f.id
             LEFT JOIN categories c ON f.category_id = c.id
             LEFT JOIN categories_folders cf ON f.folder_id = cf.id
             LEFT JOIN ${process.env.DATABASE_DB}.user u ON f.created_by = u.user_id
             WHERE sf.user_id = ? AND sf.category_file_id IS NOT NULL
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
// UNSTAR CATEGORY FILE
// DELETE /api/intranet/categories/starred-files/star/:fileId
// ============================================
exports.unstarFile = async (req, res) => {
    const { fileId }  = req.params;
    const { user_id } = req.body;

    try {
        if (!user_id) return res.status(400).json({ error: 'user_id is required' });

        const [result] = await inhousePool.query('DELETE FROM starred_files WHERE user_id = ? AND category_file_id = ?', [user_id, fileId]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Star not found' });

        res.json({ message: 'File unstarred successfully', starred: false, fileId });

    } catch (err) {
        console.error('💥 Error unstarring file:', err);
        res.status(500).json({ error: 'Failed to unstar file: ' + err.message });
    }
};

// ============================================
// CHECK STAR STATUS
// GET /api/intranet/categories/starred-files/star/status/:fileId
// ============================================
exports.getStarStatus = async (req, res) => {
    const { fileId }  = req.params;
    const { user_id } = req.query;

    try {
        if (!user_id) return res.status(400).json({ error: 'user_id is required' });

        const [result] = await inhousePool.query('SELECT id, created_at FROM starred_files WHERE user_id = ? AND category_file_id = ?', [user_id, fileId]);
        res.json({ fileId, starred: result.length > 0, starredAt: result.length > 0 ? result[0].created_at : null });

    } catch (err) {
        console.error('💥 Error checking star status:', err);
        res.status(500).json({ error: 'Failed to check star status: ' + err.message });
    }
};

// ============================================
// GET FILE STATS BY CATEGORY
// GET /api/intranet/categories/files/stats/:category_id
// ============================================
exports.getFileStats = async (req, res) => {
    const { category_id } = req.params;

    try {
        if (!category_id || isNaN(category_id)) return res.status(400).json({ error: 'Valid category ID is required' });

        const [stats] = await inhousePool.query(
            `SELECT COUNT(*) as total_files, SUM(file_size) as total_size, COUNT(CASE WHEN is_starred = 1 THEN 1 END) as starred_files, SUM(download_count) as total_downloads, file_type, COUNT(*) as type_count FROM categories_files WHERE category_id = ? GROUP BY category_id, file_type WITH ROLLUP`,
            [category_id]
        );

        const last = stats[stats.length - 1] || {};
        res.json({
            message: 'File statistics retrieved successfully',
            stats: {
                total_files:     last.total_files    || 0,
                total_size:      formatFileSize(last.total_size || 0),
                starred_files:   last.starred_files  || 0,
                total_downloads: last.total_downloads || 0,
                file_types:      stats.slice(0, -1).filter(s => s.file_type).map(s => ({ type: s.file_type, count: s.type_count, size: formatFileSize(s.total_size) }))
            }
        });

    } catch (error) {
        console.error('Error getting file statistics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};