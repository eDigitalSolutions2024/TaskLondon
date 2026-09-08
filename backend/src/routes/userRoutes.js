const express = require('express');
const { authRequired, adminOnly } = require('../middleware/auth');
const { listUsers, createUser, updateUser, deactivateUser } = require('../controllers/userController');

const router = express.Router();

router.get('/', authRequired, adminOnly, listUsers);
router.post('/', authRequired, adminOnly, createUser);
router.put('/:id', authRequired, adminOnly, updateUser);
router.delete('/:id', authRequired, adminOnly, deactivateUser);

module.exports = router;
