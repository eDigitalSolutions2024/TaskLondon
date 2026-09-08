const express = require('express');
const { authRequired } = require('../middleware/auth');
const { getEstablishment } = require('../controllers/establishmentController');

const router = express.Router();

router.get('/:id', authRequired, getEstablishment);

module.exports = router;
