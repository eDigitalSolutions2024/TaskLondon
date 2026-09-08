const Establishment = require('../models/Establishment');

async function getEstablishment(req, res, next) {
  try {
    const establishment = await Establishment.findById(req.params.id);
    if (!establishment) return res.status(404).json({ message: 'Sucursal no encontrada' });
    res.json(establishment);
  } catch (err) {
    next(err);
  }
}

module.exports = { getEstablishment };
