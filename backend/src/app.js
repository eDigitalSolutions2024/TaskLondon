const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const establishmentRoutes = require('./routes/establishmentRoutes');
const routineRoutes = require('./routes/routineRoutes');
const sectionRoutes = require('./routes/sectionRoutes');
const taskRoutes = require('./routes/taskRoutes');
const runRoutes = require('./routes/runRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/establishments', establishmentRoutes);
app.use('/routines', routineRoutes);
app.use('/sections', sectionRoutes);
app.use('/tasks', taskRoutes);
app.use('/runs', runRoutes);
app.use('/incidents', incidentRoutes);

// Endpoint de subida global como alias (soporta tanto multipart como base64)
app.post('/upload', require('./middleware/auth').authRequired, (req, res, next) => {
  if (req.body && req.body.base64) {
    try {
      const fs = require('fs');
      const base64Data = req.body.base64.replace(/^data:image\/\w+;base64,/, '');
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
      const filePath = path.join(__dirname, '..', 'uploads', filename);
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
      return res.status(201).json({ url: `/uploads/${filename}` });
    } catch (err) {
      console.error('Error guardando base64:', err);
      return res.status(400).json({ message: 'Error al procesar base64' });
    }
  }

  require('./middleware/upload').single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || 'Error al procesar imagen' });
    if (!req.file) return res.status(400).json({ message: 'No se recibió archivo' });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
