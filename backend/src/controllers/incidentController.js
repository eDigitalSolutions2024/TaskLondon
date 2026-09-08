const Incident = require('../models/Incident');

async function listIncidents(req, res, next) {
  try {
    const { establishmentId, status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    let incidents = await Incident.find(filter).sort({ createdAt: -1 });

    if (establishmentId) {
      const RoutineRun = require('../models/RoutineRun');
      const runs = await RoutineRun.find({ establishmentId }).select('_id');
      const runIds = new Set(runs.map((r) => String(r._id)));
      incidents = incidents.filter((i) => runIds.has(String(i.routineRunId)));
    }

    res.json(incidents);
  } catch (err) {
    next(err);
  }
}

async function resolveIncident(req, res, next) {
  try {
    const incident = await Incident.findByIdAndUpdate(req.params.id, { status: 'resolved' }, { new: true });
    if (!incident) return res.status(404).json({ message: 'Incidencia no encontrada' });
    res.json(incident);
  } catch (err) {
    next(err);
  }
}

module.exports = { listIncidents, resolveIncident };
