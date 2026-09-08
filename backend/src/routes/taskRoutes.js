const express = require('express');
const { authRequired, adminOnly } = require('../middleware/auth');
const {
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
  listTaskTypes,
} = require('../controllers/taskController');

const router = express.Router();

router.get('/types', listTaskTypes);
router.post('/', authRequired, adminOnly, createTask);
router.put('/reorder', authRequired, adminOnly, reorderTasks);
router.put('/:id', authRequired, adminOnly, updateTask);
router.delete('/:id', authRequired, adminOnly, deleteTask);

module.exports = router;
