const express = require('express');
const { getAllUsers, createUser, deleteUser } = require('../../controllers/AdminController/userController');

const router = express.Router();

router.get('/',       getAllUsers);
router.post('/',      createUser);
router.delete('/:id', deleteUser);

module.exports = router;