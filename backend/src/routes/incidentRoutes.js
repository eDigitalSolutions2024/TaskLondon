const express = require('express');
const { authRequired } = require('../middleware/auth');
const { listIncidents, resolveIncident } = require('../controllers/incidentController');

const router = express.Router();

router.get('/', authRequired, listIncidents);
router.put('/:id/resolve', authRequired, resolveIncident);

module.exports = router;
