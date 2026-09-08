function notFound(req, res, next) {
  res.status(404).json({ message: `Ruta no encontrada: ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Error interno del servidor' });
}

module.exports = { notFound, errorHandler };
