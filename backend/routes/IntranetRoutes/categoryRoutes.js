// routes/IntranetRoutes/categoryRoutes.js
const express             = require('express');
const router               = express.Router();
const verifyToken           = require('../../middleware/authMiddleware');
const categoryController    = require('../../controllers/IntranetController/categoryController');
const {
    uploadSingle,
    uploadMultiple,
    handleMulterError
} = require('../../config/intranetMulterConfig');

// ============================================
// FIELD MAPPER
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
// CATEGORY ROUTES
// ============================================
router.get('/categories',          verifyToken, mapUser, categoryController.getCategories);
router.post('/categories',         verifyToken, mapUser, categoryController.createCategory);
router.get('/categories/:id',      verifyToken, mapUser, categoryController.getCategory);
router.put('/categories/:id',      verifyToken, mapUser, categoryController.updateCategory);
router.delete('/categories/:id',   verifyToken, mapUser, categoryController.deleteCategory);

// ============================================
// FOLDER ROUTES
// ============================================
router.get('/folders',                       verifyToken, mapUser, categoryController.getFolders);
router.post('/folders',                      verifyToken, mapUser, categoryController.createFolder);
router.get('/folders/:id',                   verifyToken, mapUser, categoryController.getFolder);
router.put('/folders/:id',                   verifyToken, mapUser, categoryController.updateFolder);
router.delete('/categories/folders/:id',     verifyToken, mapUser, categoryController.deleteFolder);
router.get('/folders/tree/:category_id',     verifyToken, mapUser, categoryController.getFolderTree);

// ============================================
// SEARCH
// ============================================
router.get('/search',              verifyToken, mapUser, categoryController.search);

// ============================================
// FILE ROUTES
// ============================================
router.get('/files',                          verifyToken, mapUser, categoryController.getFiles);
router.get('/files/:id',                      verifyToken, mapUser, categoryController.getFile);
router.put('/files/:id',                      verifyToken, mapUser, categoryController.updateFile);
router.delete('/categories/files/:id',        verifyToken, mapUser, categoryController.deleteFile);

// ============================================
// UPLOAD ROUTES
// ============================================
router.post('/files/upload-single',           verifyToken, mapUser, uploadSingle('file'),    categoryController.uploadSingleFile);
router.post('/files/upload-multiple',         verifyToken, mapUser, uploadMultiple('files'), categoryController.uploadMultipleFiles);
router.post('/files/upload/resolve',          verifyToken, mapUser, categoryController.resolveUploadConflict);

// ============================================
// DOWNLOAD & PREVIEW
// No auth — user_id passed as query param (matches original behavior)
// ============================================
router.get('/files/:id/download',             categoryController.downloadFile);
router.get('/files/:id/preview',              categoryController.previewFile);

// ============================================
// MOVE
// ============================================
router.post('/files/move-multiple',           verifyToken, mapUser, categoryController.moveMultipleFiles);

// ============================================
// VERSION HISTORY
// ============================================
router.get('/files/:id/versions',                          verifyToken, mapUser, categoryController.getFileVersions);
router.post('/files/:id/versions/:versionId/restore',      verifyToken, mapUser, categoryController.restoreFileVersion);
router.delete('/files/:id/versions/:versionId',             verifyToken, mapUser, categoryController.deleteFileVersion);

// ============================================
// STARRED FILES
// ============================================
router.get('/starred-files',                  verifyToken, mapUser, categoryController.getStarredFiles);
router.post('/starred-files/star/:fileId',     verifyToken, mapUser, categoryController.toggleStar);
router.delete('/starred-files/star/:fileId',   verifyToken, mapUser, categoryController.unstarFile);
router.get('/starred-files/star/status/:fileId', verifyToken, mapUser, categoryController.getStarStatus);

// ============================================
// STATS
// ============================================
router.get('/files/stats/:category_id',        verifyToken, mapUser, categoryController.getFileStats);

// ============================================
// MULTER ERROR HANDLER
// Must be last
// ============================================
router.use(handleMulterError);

module.exports = router;