// routes/IntranetRoutes/fileRoutes.js
const express        = require('express');
const router         = express.Router();
const verifyToken    = require('../../middleware/authMiddleware');
const fileController = require('../../controllers/IntranetController/fileController');
const {
    uploadSingle,
    uploadMultiple,
    handleMulterError
} = require('../../config/intranetMulterConfig');

// ============================================
// FIELD MAPPER
// Maps dashboard req.user fields → intranet field names
// Applied only on routes that need req.user.id etc.
// ============================================
const mapUser = (req, res, next) => {
    req.user.id         = req.user.user_id;
    req.user.user_name  = req.user.username;
    req.user.department = req.user.dept;
    if (req.user.role === 'admin')           req.user.role = 'Admin';
    else if (req.user.role === 'super-user') req.user.role = 'Super User';
    else                                     req.user.role = 'Regular User';
    next();
};

// ============================================
// FOLDER ROUTES
// ============================================

// Create folder
router.post('/folders',          verifyToken, mapUser, fileController.createFolder);

// Bulk create folders
router.post('/folders/bulk',     verifyToken, mapUser, fileController.bulkCreateFolders);

// Get folder tree (breadcrumb)
router.get('/path/:folderId',    verifyToken, mapUser, fileController.getFolderPath);

// ============================================
// FILE LISTING ROUTES
// ============================================

// Get root files and folders
router.get('/list',              verifyToken, mapUser, fileController.getRootList);

// Get folder contents
router.get('/list/:folderId',    verifyToken, mapUser, fileController.getFolderContents);

// Get item info (file or folder)
router.get('/info/:id',          verifyToken, mapUser, fileController.getItemInfo);

// ============================================
// UPLOAD ROUTES
// ============================================

// Single file upload
router.post('/upload',           verifyToken, mapUser, uploadSingle('file'),    fileController.uploadFile);

// Multiple file upload
router.post('/upload/multiple',  verifyToken, mapUser, uploadMultiple('files'), fileController.uploadMultipleFiles);

// Resolve upload conflict
router.post('/upload/resolve',   verifyToken, mapUser, fileController.resolveUploadConflict);

// ============================================
// DOWNLOAD & PREVIEW ROUTES
// No auth on download — user_id passed as query param
// ============================================

// Download file (no auth middleware — user_id in query)
router.get('/download/folder/:id',                      fileController.downloadFolderAsZip);
router.post('/download/bulk',                           fileController.bulkDownload);
router.get('/download/:id',                             fileController.downloadFile);

// Preview file (no auth middleware)
router.get('/preview/:id',                              fileController.previewFile);

// ============================================
// FILE / FOLDER MANAGEMENT ROUTES
// ============================================

// Rename or move file/folder
router.patch('/:id',             verifyToken, mapUser, fileController.updateItem);

// Delete file or folder
router.delete('/:id',            verifyToken, mapUser, fileController.deleteItem);

// Bulk delete
router.delete('/bulk/delete',    verifyToken, mapUser, fileController.bulkDelete);

// Copy files/folders
router.post('/copy',             verifyToken, mapUser, fileController.copyItems);

// ============================================
// SEARCH & STATS ROUTES
// ============================================

// Search files and folders
router.get('/search',            verifyToken, mapUser, fileController.search);

// File statistics
router.get('/stats',             verifyToken, mapUser, fileController.getStats);

// Activity logs
router.get('/activity-logs',     verifyToken, mapUser, fileController.getActivityLogs);

// Disk usage
router.get('/disk-usage',        verifyToken, mapUser, fileController.getDiskUsage);

// Recent files
router.get('/recent',            verifyToken, mapUser, fileController.getRecentFiles);

// ============================================
// STARRED FILES ROUTES
// ============================================

// Get starred files
router.get('/starred',           verifyToken, mapUser, fileController.getStarredFiles);

// Toggle star (POST to star, also handles unstar)
router.post('/star/:fileId',     verifyToken, mapUser, fileController.toggleStar);

// Unstar file
router.delete('/star/:fileId',   verifyToken, mapUser, fileController.unstarFile);

// Check star status
router.get('/star/status/:fileId', verifyToken, mapUser, fileController.getStarStatus);

// ============================================
// USERS ROUTE (for sharing dropdown)
// ============================================
router.get('/users',             verifyToken, mapUser, fileController.getUsers);

// ============================================
// DIAGNOSTIC ROUTES (dev only)
// ============================================
router.get('/diagnostic/:id',    fileController.getDiagnostic);

// ============================================
// MULTER ERROR HANDLER
// Must be last
// ============================================
router.use(handleMulterError);

module.exports = router;