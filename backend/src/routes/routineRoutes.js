const express = require('express');
const { authRequired, adminOnly } = require('../middleware/auth');
const {
  listRoutines,
  getRoutineFull,
  createRoutine,
  updateRoutine,
  deleteRoutine,
} = require('../controllers/routineController');

const router = express.Router();

router.get('/', authRequired, listRoutines);
router.get('/:id/full', authRequired, getRoutineFull);
router.post('/', authRequired, adminOnly, createRoutine);
router.put('/:id', authRequired, adminOnly, updateRoutine);
router.delete('/:id', authRequired, adminOnly, deleteRoutine);

module.exports = router;
