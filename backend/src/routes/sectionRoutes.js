const express = require('express');
const { authRequired, adminOnly } = require('../middleware/auth');
const {
  listSections,
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
} = require('../controllers/sectionController');

const router = express.Router();

router.get('/', authRequired, listSections);
router.post('/', authRequired, adminOnly, createSection);
router.put('/reorder', authRequired, adminOnly, reorderSections);
router.put('/:id', authRequired, adminOnly, updateSection);
router.delete('/:id', authRequired, adminOnly, deleteSection);

module.exports = router;
