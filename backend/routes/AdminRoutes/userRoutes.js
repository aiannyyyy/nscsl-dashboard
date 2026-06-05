const express = require('express');
const {
  getAllUsers,
  createUser,
  deleteUser,
  changePassword,
} = require('../../controllers/AdminController/userController');

const router = express.Router();

router.get('/',                getAllUsers);
router.post('/',               createUser);
router.delete('/:id',          deleteUser);
router.put('/change-password', changePassword);

module.exports = router;