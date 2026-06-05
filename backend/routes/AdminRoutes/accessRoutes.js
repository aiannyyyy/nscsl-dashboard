const express = require('express');
const { getUserAccess, saveUserAccess } = require('../../controllers/AdminController/accessController');

const router = express.Router();

router.get('/:userId', getUserAccess);
router.put('/:userId', saveUserAccess);

module.exports = router;