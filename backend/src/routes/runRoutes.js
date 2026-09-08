const express = require('express');
const { authRequired } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  startRun,
  getRun,
  getRunSection,
  submitTaskResult,
  reportIncident,
  completeRun,
  listRuns,
  getHistory,
} = require('../controllers/runController');

const router = express.Router();

router.get('/', authRequired, listRuns);
router.get('/history', authRequired, getHistory);
router.post('/upload', authRequired, (req, res, next) => {
  if (req.body && req.body.base64) {
    try {
      const fs = require('fs');
      const path = require('path');
      const base64Data = req.body.base64.replace(/^data:image\/\w+;base64,/, '');
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
      const filePath = path.join(__dirname, '..', '..', 'uploads', filename);
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
      return res.status(201).json({ url: `/uploads/${filename}` });
    } catch (err) {
      console.error('Error guardando base64:', err);
      return res.status(400).json({ message: 'Error al procesar base64' });
    }
  }

  upload.single('photo')(req, res, (err) => {
    if (err) {
      console.error('Error en multer upload:', err);
      return res.status(400).json({ message: err.message || 'Error al procesar la imagen' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No se recibió archivo o formato incompatible' });
    }
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});
router.post('/', authRequired, startRun);
router.get('/:id', authRequired, getRun);
router.get('/:id/sections/:sectionId', authRequired, getRunSection);
router.post('/:id/tasks/:taskId/result', authRequired, submitTaskResult);
router.post('/:id/incidents', authRequired, reportIncident);
router.post('/:id/complete', authRequired, completeRun);

module.exports = router;
