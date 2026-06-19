// controllers/IntranetController/shareController.js
const { inhousePool, mysqlPool } = require('../../config/database');
const notificationController = require('../notificationsController');

// ================== Helper: Add Activity Log ==================
async function addActivityLog(userId, action, targetType, targetId, targetName, additionalInfo = null) {
  try {
    const actionMap = {
      'create':     'CREATE',
      'upload':     'CREATE',
      'update':     'UPDATE',
      'rename':     'RENAME',
      'move':       'MOVE',
      'move_rename':'MOVE',
      'delete':     'DELETE',
      'download':   'DOWNLOAD',
      'copy':       'COPY',
      'share':      'SHARED'
    };

    const entityTypeMap = {
      'category': 'CATEGORY',
      'folder':   'FOLDER',
      'file':     'FILE'
    };

    const mappedAction     = actionMap[action]     || 'CREATE';
    const mappedEntityType = entityTypeMap[targetType] || 'FILE';

    await inhousePool.query(
      `INSERT INTO activity_logs (user_id, action, target_type, target_id, target_name, additional_info, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [userId, mappedAction, mappedEntityType, targetId, targetName, additionalInfo]
    );

    console.log(`📝 Log: ${mappedAction} ${mappedEntityType} (${targetName}) by user ${userId}`);
  } catch (error) {
    console.error('💥 Error adding activity log:', error);
  }
}

// ================== Share a regular file ==================
exports.shareFile = async (req, res) => {
  try {
    const { fileId }  = req.params;
    const { userIds } = req.body;
    const sharedBy    = req.user.id;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'Please select at least one user' });
    }

    const [files] = await inhousePool.query(
      'SELECT created_by, file_name FROM files WHERE id = ?',
      [fileId]
    );

    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (String(files[0].created_by) !== String(sharedBy)) {
      return res.status(403).json({ error: 'Only file owner can share this file' });
    }

    const validUserIds = userIds.filter(id => String(id) !== String(sharedBy));

    if (validUserIds.length === 0) {
      return res.status(400).json({ error: 'Cannot share file with yourself' });
    }

    const now    = new Date();
    const values = validUserIds.map(userId => [fileId, null, sharedBy, userId, now]);

    await inhousePool.query(
      'INSERT IGNORE INTO file_shares (file_id, category_file_id, shared_by, shared_with, created_at) VALUES ?',
      [values]
    );

    await addActivityLog(
      sharedBy, 'share', 'file', fileId, files[0].file_name,
      `Shared with ${validUserIds.length} user(s): ${validUserIds.join(', ')}`
    );

    res.json({ success: true, message: 'File shared successfully', sharedWith: validUserIds.length });

    notificationController.createShareNotificationsForMany(
      sharedBy, validUserIds, files[0].file_name, fileId, null
    ).catch(err => console.error('⚠️ Bulk notification error:', err.message));

  } catch (error) {
    console.error('❌ Error sharing file:', error);
    res.status(500).json({ error: 'Failed to share file', details: error.message });
  }
};

// ================== Share a category file ==================
exports.shareCategoryFile = async (req, res) => {
  try {
    const { categoryFileId } = req.params;
    const { userIds }        = req.body;
    const sharedBy           = req.user.id;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'Please select at least one user' });
    }

    const [files] = await inhousePool.query(
      'SELECT created_by, name FROM categories_files WHERE id = ?',
      [categoryFileId]
    );

    if (files.length === 0) return res.status(404).json({ error: 'File not found' });

    if (String(files[0].created_by) !== String(sharedBy)) {
      return res.status(403).json({ error: 'Only file owner can share this file' });
    }

    const validUserIds = userIds.filter(id => String(id) !== String(sharedBy));
    if (validUserIds.length === 0) return res.status(400).json({ error: 'Cannot share file with yourself' });

    const now    = new Date();
    const values = validUserIds.map(userId => [null, categoryFileId, sharedBy, userId, now]);

    await inhousePool.query(
      'INSERT IGNORE INTO file_shares (file_id, category_file_id, shared_by, shared_with, created_at) VALUES ?',
      [values]
    );

    await addActivityLog(
      sharedBy, 'share', 'file', categoryFileId, files[0].name,
      `Shared with ${validUserIds.length} user(s): ${validUserIds.join(', ')}`
    );

    res.json({ success: true, message: 'File shared successfully', sharedWith: validUserIds.length });

    notificationController.createShareNotificationsForMany(
      sharedBy, validUserIds, files[0].name, null, categoryFileId
    ).catch(err => console.error('⚠️ Bulk notification error:', err.message));

  } catch (error) {
    console.error('Error sharing category file:', error);
    res.status(500).json({ error: 'Failed to share file' });
  }
};

// ================== Share entire category ==================
exports.shareCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { userIds }    = req.body;
    const sharedBy       = req.user.id;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'Please select at least one user' });
    }

    const [categories] = await inhousePool.query(
      'SELECT id, name FROM categories WHERE id = ?', [categoryId]
    );
    if (categories.length === 0) return res.status(404).json({ error: 'Category not found' });

    const category = categories[0];

    const [files] = await inhousePool.query(
      'SELECT id FROM categories_files WHERE category_id = ?', [categoryId]
    );
    if (files.length === 0) return res.status(400).json({ error: 'Category has no files to share' });

    const validUserIds = userIds.filter(id => String(id) !== String(sharedBy));
    if (validUserIds.length === 0) return res.status(400).json({ error: 'Cannot share with yourself' });

    const now    = new Date();
    const values = [];
    for (const file of files) {
      for (const userId of validUserIds) {
        values.push([null, file.id, sharedBy, userId, now]);
      }
    }

    await inhousePool.query(
      'INSERT IGNORE INTO file_shares (file_id, category_file_id, shared_by, shared_with, created_at) VALUES ?',
      [values]
    );

    await addActivityLog(
      sharedBy, 'share', 'category', categoryId, category.name,
      `Shared category with ${validUserIds.length} user(s) (${files.length} files): ${validUserIds.join(', ')}`
    );

    res.json({
      success: true,
      message: 'Category shared successfully',
      categoryName: category.name,
      filesShared: files.length,
      sharedWith: validUserIds.length
    });

    notificationController.createShareNotificationsForMany(
      sharedBy, validUserIds, `Category: ${category.name}`, null, null
    ).catch(err => console.error('⚠️ Bulk notification error:', err.message));

  } catch (error) {
    console.error('Error sharing category:', error);
    res.status(500).json({ error: 'Failed to share category' });
  }
};

// ================== Get files shared with me ==================
exports.getSharedWithMe = async (req, res) => {
  try {
    const userId = req.user.id;

    // Regular files — JOIN dashboard user table
    const [regularFiles] = await inhousePool.query(
      `SELECT 
        f.id, f.file_name, f.file_path, f.file_type, f.file_size, f.created_at,
        fs.created_at as shared_at,
        u.name as owner_name, u.dept as owner_department,
        COALESCE(u2.name, u.name) as shared_by_name,
        'regular' as source_type
       FROM file_shares fs
       INNER JOIN files f ON fs.file_id = f.id
       INNER JOIN ${process.env.DATABASE_DB}.user u ON f.created_by = u.user_id
       LEFT JOIN ${process.env.DATABASE_DB}.user u2 ON fs.shared_by = u2.user_id
       WHERE fs.shared_with = ?
       ORDER BY fs.created_at DESC`,
      [userId]
    );

    // Category files — JOIN dashboard user table
    const [categoryFiles] = await inhousePool.query(
      `SELECT 
        cf.id, cf.name as file_name, cf.original_name, cf.file_path, cf.file_type, cf.file_size, cf.created_at,
        fs.created_at as shared_at,
        u.name as owner_name, u.dept as owner_department,
        COALESCE(u2.name, u.name) as shared_by_name,
        'category' as source_type
       FROM file_shares fs
       INNER JOIN categories_files cf ON fs.category_file_id = cf.id
       INNER JOIN ${process.env.DATABASE_DB}.user u ON cf.created_by = u.user_id
       LEFT JOIN ${process.env.DATABASE_DB}.user u2 ON fs.shared_by = u2.user_id
       WHERE fs.shared_with = ?
       ORDER BY fs.created_at DESC`,
      [userId]
    );

    const allSharedFiles = [...regularFiles, ...categoryFiles]
      .sort((a, b) => new Date(b.shared_at) - new Date(a.shared_at));

    res.json({ success: true, data: allSharedFiles, count: allSharedFiles.length });

  } catch (error) {
    console.error('❌ Error fetching shared files:', error);
    res.status(500).json({ error: 'Failed to fetch shared files', details: error.message });
  }
};

// ================== Get who has access to a regular file ==================
exports.getFileShares = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId     = req.user.id;

    const [files] = await inhousePool.query(
      'SELECT created_by FROM files WHERE id = ?', [fileId]
    );
    if (files.length === 0) return res.status(404).json({ error: 'File not found' });
    if (files[0].created_by !== userId) return res.status(403).json({ error: 'Only file owner can view shares' });

    // JOIN dashboard user table for share recipients
    const [shares] = await inhousePool.query(
      `SELECT 
        fs.id, fs.shared_with, fs.created_at,
        u.name as username, u.username as user_name,
        u.dept as department, u.position
       FROM file_shares fs
       INNER JOIN ${process.env.DATABASE_DB}.user u ON fs.shared_with = u.user_id
       WHERE fs.file_id = ?
       ORDER BY fs.created_at DESC`,
      [fileId]
    );

    res.json({ success: true, data: shares, count: shares.length });

  } catch (error) {
    console.error('Error fetching file shares:', error);
    res.status(500).json({ error: 'Failed to fetch file shares' });
  }
};

// ================== Get who has access to a category file ==================
exports.getCategoryFileShares = async (req, res) => {
  try {
    const { categoryFileId } = req.params;
    const userId             = req.user.id;

    const [files] = await inhousePool.query(
      'SELECT created_by FROM categories_files WHERE id = ?', [categoryFileId]
    );
    if (files.length === 0) return res.status(404).json({ error: 'File not found' });
    if (files[0].created_by !== userId) return res.status(403).json({ error: 'Only file owner can view shares' });

    const [shares] = await inhousePool.query(
      `SELECT 
        fs.id, fs.shared_with, fs.created_at,
        u.name as username, u.username as user_name,
        u.dept as department, u.position
       FROM file_shares fs
       INNER JOIN ${process.env.DATABASE_DB}.user u ON fs.shared_with = u.user_id
       WHERE fs.category_file_id = ?
       ORDER BY fs.created_at DESC`,
      [categoryFileId]
    );

    res.json({ success: true, data: shares, count: shares.length });

  } catch (error) {
    console.error('Error fetching category file shares:', error);
    res.status(500).json({ error: 'Failed to fetch file shares' });
  }
};

// ================== Remove share access ==================
exports.removeShare = async (req, res) => {
  try {
    const { shareId } = req.params;
    const userId      = req.user.id;

    const [shares] = await inhousePool.query(
      `SELECT 
        fs.*,
        COALESCE(f.created_by, cf.created_by) as file_owner,
        COALESCE(f.file_name, cf.name) as file_name
       FROM file_shares fs
       LEFT JOIN files f ON fs.file_id = f.id
       LEFT JOIN categories_files cf ON fs.category_file_id = cf.id
       WHERE fs.id = ?`,
      [shareId]
    );

    if (shares.length === 0) return res.status(404).json({ error: 'Share not found' });
    if (String(shares[0].file_owner) !== String(userId)) {
      return res.status(403).json({ error: 'Only file owner can remove shares' });
    }

    const share = shares[0];
    await inhousePool.query('DELETE FROM file_shares WHERE id = ?', [shareId]);

    await addActivityLog(
      userId, 'share', 'file',
      share.file_id || share.category_file_id, share.file_name,
      `Removed share access for user ID: ${share.shared_with}`
    );

    res.json({ success: true, message: 'Share removed successfully' });

  } catch (error) {
    console.error('Error removing share:', error);
    res.status(500).json({ error: 'Failed to remove share' });
  }
};

// ================== Get all users for sharing dropdown ==================
// Queries dashboard user table
exports.getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const [users] = await mysqlPool.query(
      `SELECT user_id as id, username as user_name, name, dept as department, position
       FROM user
       WHERE user_id != ?
       ORDER BY name ASC`,
      [currentUserId]
    );

    res.json({ success: true, data: users, count: users.length });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// ================== Check file access ==================
exports.checkFileAccess = async (req, res) => {
  try {
    const { fileId, type } = req.params;
    const userId           = req.user.id;

    const table = type === 'regular' ? 'files' : 'categories_files';
    const [files] = await inhousePool.query(
      `SELECT created_by FROM ${table} WHERE id = ?`, [fileId]
    );

    if (files.length === 0) return res.status(404).json({ error: 'File not found' });

    if (files[0].created_by === userId) {
      return res.json({ success: true, hasAccess: true, isOwner: true });
    }

    const shareCol    = type === 'regular' ? 'file_id' : 'category_file_id';
    const [shares]    = await inhousePool.query(
      `SELECT id FROM file_shares WHERE ${shareCol} = ? AND shared_with = ?`,
      [fileId, userId]
    );

    res.json({ success: true, hasAccess: shares.length > 0, isOwner: false });

  } catch (error) {
    console.error('Error checking file access:', error);
    res.status(500).json({ error: 'Failed to check access' });
  }
};

// ================== Get who has access to a category ==================
exports.getCategoryShares = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const [shares] = await inhousePool.query(
      `SELECT DISTINCT
        fs.id, fs.shared_with, fs.created_at,
        u.name as username, u.username as user_name,
        u.dept as department, u.position,
        COUNT(DISTINCT fs.category_file_id) as files_shared
       FROM file_shares fs
       INNER JOIN categories_files cf ON fs.category_file_id = cf.id
       INNER JOIN ${process.env.DATABASE_DB}.user u ON fs.shared_with = u.user_id
       WHERE cf.category_id = ?
       GROUP BY fs.shared_with, u.user_id, u.name
       ORDER BY fs.created_at DESC`,
      [categoryId]
    );

    res.json({ success: true, data: shares, count: shares.length });

  } catch (error) {
    console.error('Error fetching category shares:', error);
    res.status(500).json({ error: 'Failed to fetch category shares' });
  }
};

// ================== Get categories shared with me ==================
exports.getSharedCategoriesWithMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const [categories] = await inhousePool.query(
      `SELECT DISTINCT
        c.id, c.name, c.description, c.color, c.icon,
        u.name as created_by_name, u.dept as created_by_department,
        COUNT(DISTINCT fs.id) as files_shared,
        MAX(fs.created_at) as last_shared
       FROM file_shares fs
       INNER JOIN categories_files cf ON fs.category_file_id = cf.id
       INNER JOIN categories c ON cf.category_id = c.id
       INNER JOIN ${process.env.DATABASE_DB}.user u ON c.created_by = u.user_id
       WHERE fs.shared_with = ? AND fs.category_file_id IS NOT NULL
       GROUP BY c.id, c.name, c.description
       ORDER BY last_shared DESC`,
      [userId]
    );

    res.json({ success: true, data: categories, count: categories.length });

  } catch (error) {
    console.error('Error fetching shared categories:', error);
    res.status(500).json({ error: 'Failed to fetch shared categories' });
  }
};

// ================== Remove all access for a user to a category ==================
exports.removeCategoryShare = async (req, res) => {
  try {
    const { categoryId, userId } = req.params;
    const currentUserId          = req.user.id;

    const [categories] = await inhousePool.query(
      'SELECT id, name FROM categories WHERE id = ?', [categoryId]
    );
    if (categories.length === 0) return res.status(404).json({ error: 'Category not found' });

    const category = categories[0];

    const [result] = await inhousePool.query(
      `DELETE fs FROM file_shares fs
       INNER JOIN categories_files cf ON fs.category_file_id = cf.id
       WHERE cf.category_id = ? AND fs.shared_with = ?`,
      [categoryId, userId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'No shares found to remove' });

    await addActivityLog(
      currentUserId, 'share', 'category', categoryId, category.name,
      `Removed share access for user ID: ${userId} (${result.affectedRows} files)`
    );

    res.json({ success: true, message: 'Category access removed successfully', sharesDeleted: result.affectedRows });

  } catch (error) {
    console.error('Error removing category share:', error);
    res.status(500).json({ error: 'Failed to remove category share' });
  }
};

module.exports = exports;