// routes/IntranetRoutes/categoryRoutes.js
const express            = require('express');
const router             = express.Router();
const verifyToken        = require('../../middleware/authMiddleware');
const categoryController = require('../../controllers/IntranetController/categoryController');
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
// CATEGORY ROUTES — static, no :id
// /api/intranet/categories
// ============================================
router.get('/',  verifyToken, mapUser, categoryController.getCategories);
router.post('/', verifyToken, mapUser, categoryController.createCategory);

// ============================================
// SEARCH (before any :param routes)
// GET /api/intranet/categories/search
// ============================================
router.get('/search', verifyToken, mapUser, categoryController.search);

// ============================================
// FOLDER ROUTES
// /api/intranet/categories/folders
// ============================================
router.get('/folders',                   verifyToken, mapUser, categoryController.getFolders);
router.post('/folders',                  verifyToken, mapUser, categoryController.createFolder);
router.get('/folders/tree/:category_id', verifyToken, mapUser, categoryController.getFolderTree); // before /folders/:id
router.get('/folders/:id',               verifyToken, mapUser, categoryController.getFolder);
router.put('/folders/:id',               verifyToken, mapUser, categoryController.updateFolder);
router.delete('/folders/:id',            verifyToken, mapUser, categoryController.deleteFolder);

// ============================================
// STARRED FILES
// Static routes BEFORE :param routes
// /api/intranet/categories/starred-files
// ============================================
router.get('/starred-files',                     verifyToken, mapUser, categoryController.getStarredFiles);
router.get('/starred-files/star/status/:fileId', verifyToken, mapUser, categoryController.getStarStatus); // before /star/:fileId
router.post('/starred-files/star/:fileId',       verifyToken, mapUser, categoryController.toggleStar);
router.delete('/starred-files/star/:fileId',     verifyToken, mapUser, categoryController.unstarFile);

// ============================================
// FILE ROUTES
// Specific/static routes BEFORE :param routes
// /api/intranet/categories/files
// ============================================

// ── Upload ──────────────────────────────────
router.post('/files/upload-single',
    verifyToken, mapUser, uploadSingle('file'), categoryController.uploadSingleFile);

router.post('/files/upload-multiple',
    verifyToken, mapUser, uploadMultiple('files'), categoryController.uploadMultipleFiles);

router.post('/files/upload/resolve',
    verifyToken, mapUser, categoryController.resolveUploadConflict);

// ── Move & Copy ─────────────────────────────
router.post('/files/move-multiple',
    verifyToken, mapUser, categoryController.moveMultipleFiles);

// ── Stats (before /files/:id) ───────────────
router.get('/files/stats/:category_id',
    verifyToken, mapUser, categoryController.getFileStats);

// ── Download & Preview (no auth — user_id via query param) ──
router.get('/files/:id/download', categoryController.downloadFile);
router.get('/files/:id/preview',  categoryController.previewFile);

// ── Version History (before /files/:id) ─────
router.get('/files/:id/versions',
    verifyToken, mapUser, categoryController.getFileVersions);
router.post('/files/:id/versions/:versionId/restore',
    verifyToken, mapUser, categoryController.restoreFileVersion);
router.delete('/files/:id/versions/:versionId',
    verifyToken, mapUser, categoryController.deleteFileVersion);

// ── Files list (static, before /files/:id) ──
router.get('/files', verifyToken, mapUser, categoryController.getFiles);

// ── Files CRUD by id ─────────────────────────
router.get('/files/:id',    verifyToken, mapUser, categoryController.getFile);
router.put('/files/:id',    verifyToken, mapUser, categoryController.updateFile);
router.delete('/files/:id', verifyToken, mapUser, categoryController.deleteFile);

// ============================================
// CATEGORY :id ROUTES — MUST BE LAST.
// A single ":id" segment matches "/folders", "/files",
// "/starred-files", "/search", etc, so this block has to
// come after every other static route above or it will
// swallow those requests (e.g. GET /categories/folders
// would hit getCategory with id="folders" instead of
// hitting getFolders).
// ============================================
router.get('/:id',    verifyToken, mapUser, categoryController.getCategory);
router.put('/:id',    verifyToken, mapUser, categoryController.updateCategory);
router.delete('/:id', verifyToken, mapUser, categoryController.deleteCategory);

// ============================================
// MULTER ERROR HANDLER (must be last)
// ============================================
router.use(handleMulterError);

module.exports = router;