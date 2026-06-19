// routes/IntranetRoutes/moveRoutes.js
const express          = require('express');
const router            = express.Router();
const verifyToken        = require('../../middleware/authMiddleware');
const moveController     = require('../../controllers/IntranetController/moveController');

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
// MOVE OPERATIONS
// ============================================
router.post('/single', verifyToken, mapUser, moveController.moveSingle);
router.post('/bulk',   verifyToken, mapUser, moveController.moveBulk);
router.post('/mixed',  verifyToken, mapUser, moveController.moveMixed);
router.post('/folder', verifyToken, mapUser, moveController.moveFolder);

// ============================================
// PREVIEW
// ============================================
router.get('/preview', verifyToken, mapUser, moveController.getPreview);

// ============================================
// VERSION HISTORY
// ⚠️ Order matters! Specific routes BEFORE dynamic ones
// ============================================
router.get('/versions/:fileId',                          verifyToken, mapUser, moveController.getVersionHistory);
router.get('/versions/:fileId/compare',                  verifyToken, mapUser, moveController.compareVersions);
router.get('/versions/:fileId/download/:versionId',      verifyToken, mapUser, moveController.downloadVersion);
router.post('/versions/:fileId/restore/:versionId',      verifyToken, mapUser, moveController.restoreVersion);
router.delete('/versions/:fileId/version/:versionId',    verifyToken, mapUser, moveController.deleteVersion);

// ============================================
// MOVE HISTORY / UNDO
// ============================================
router.get('/history',              verifyToken, mapUser, moveController.getMoveHistory);
router.get('/history/:batchId',     verifyToken, mapUser, moveController.getBatchDetail);
router.post('/undo/:batchId',       verifyToken, mapUser, moveController.undoBatch);

module.exports = router;