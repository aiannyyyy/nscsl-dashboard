// routes/IntranetRoutes/categoryMoveRoutes.js
const express                = require('express');
const router                  = express.Router();
const verifyToken              = require('../../middleware/authMiddleware');
const categoryMoveController   = require('../../controllers/IntranetController/categoryMoveController');

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
router.post('/single', verifyToken, mapUser, categoryMoveController.moveSingle);
router.post('/bulk',   verifyToken, mapUser, categoryMoveController.moveBulk);

// ============================================
// PREVIEW
// ============================================
router.get('/preview', verifyToken, mapUser, categoryMoveController.getPreview);

// ============================================
// MOVE HISTORY / UNDO
// ============================================
router.get('/history',        verifyToken, mapUser, categoryMoveController.getMoveHistory);
router.post('/undo/:batchId', verifyToken, mapUser, categoryMoveController.undoBatch);

// ============================================
// FOLDER TREE & CATEGORIES (for move modal)
// ============================================
router.get('/folders',     verifyToken, mapUser, categoryMoveController.getFoldersForTree);
router.get('/categories',  verifyToken, mapUser, categoryMoveController.getCategoriesForMove);

module.exports = router;