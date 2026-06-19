// routes/IntranetRoutes/shareRoutes.js
const express    = require('express');
const router     = express.Router();
const verifyToken = require('../../middleware/authMiddleware');
const shareController = require('../../controllers/IntranetController/shareController');

// Field mapper — maps dashboard req.user fields to intranet field names
const mapUser = (req, res, next) => {
    req.user.id         = req.user.user_id;
    req.user.user_name  = req.user.username;
    req.user.department = req.user.dept;
    if (req.user.role === 'admin')           req.user.role = 'Admin';
    else if (req.user.role === 'super-user') req.user.role = 'Super User';
    else                                     req.user.role = 'Regular User';
    next();
};

// Share regular file
router.post('/files/:fileId/share',                    verifyToken, mapUser, shareController.shareFile);

// Share category file
router.post('/category-files/:categoryFileId/share',   verifyToken, mapUser, shareController.shareCategoryFile);

// Share entire category
router.post('/categories/:categoryId/share',           verifyToken, mapUser, shareController.shareCategory);

// Get files shared with me
router.get('/shared-with-me',                          verifyToken, mapUser, shareController.getSharedWithMe);

// Get who has access to a regular file
router.get('/files/:fileId/shares',                    verifyToken, mapUser, shareController.getFileShares);

// Get who has access to a category file
router.get('/category-files/:categoryFileId/shares',   verifyToken, mapUser, shareController.getCategoryFileShares);

// Get who has access to a category
router.get('/categories/:categoryId/shares',           verifyToken, mapUser, shareController.getCategoryShares);

// Get categories shared with me
router.get('/shared-categories-with-me',               verifyToken, mapUser, shareController.getSharedCategoriesWithMe);

// Get all users for dropdown
router.get('/users/all',                               verifyToken, mapUser, shareController.getAllUsers);

// Check file access
router.get('/files/:fileId/access/:type',              verifyToken, mapUser, shareController.checkFileAccess);

// Remove share
router.delete('/shares/:shareId',                      verifyToken, mapUser, shareController.removeShare);

// Remove all access for a user to a category
router.delete('/categories/:categoryId/remove-user/:userId', verifyToken, mapUser, shareController.removeCategoryShare);

module.exports = router;