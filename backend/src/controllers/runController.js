const RoutineRun = require('../models/RoutineRun');
const SectionRun = require('../models/SectionRun');
const RoutineSection = require('../models/RoutineSection');
const Routine = require('../models/Routine');
const Task = require('../models/Task');
const TaskResult = require('../models/TaskResult');
const Incident = require('../models/Incident');
const User = require('../models/User');
const { recalculateSectionProgress, calculateRoutineProgress } = require('../services/progress');

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// POST /runs  body: { routineId, shift }
// Reutiliza el run del día y turno si ya existe (evita duplicar "rutinas de hoy").
async function startRun(req, res, next) {
  try {
    const { routineId, shift: bodyShift } = req.body;
    const routine = await Routine.findById(routineId);
    if (!routine) return res.status(404).json({ message: 'Rutina no encontrada' });

    const date = todayStr();
    const user = await User.findById(req.user.sub);
    const shift = bodyShift || user?.shift || (routine.type === 'cierre' ? 'cierre' : routine.type === 'cambio_turno' ? 'cambio_turno' : 'apertura');

    // Buscar run existente de la rutina para hoy en el establecimiento
    // Si ya existe (iniciado por otro colaborador o en el mismo turno), reutilizarlo para sincronizar avances
    let run = await RoutineRun.findOne({ routineId, date, establishmentId: routine.establishmentId });

    if (!run) {
      run = await RoutineRun.create({
        routineId,
        establishmentId: routine.establishmentId,
        employeeId: req.user.sub,
        status: 'in_progress',
        date,
        shift,
        startedAt: new Date(),
      });

      const sections = await RoutineSection.find({ routineId, active: true });
      await Promise.all(
        sections.map((section) =>
          SectionRun.create({ routineRunId: run._id, sectionId: section._id, status: 'pending' })
        )
      );
    }

    res.status(201).json(run);
  } catch (err) {
    next(err);
  }
}

// GET /runs/:id — estado completo con progreso
async function getRun(req, res, next) {
  try {
    const run = await RoutineRun.findById(req.params.id);
    if (!run) return res.status(404).json({ message: 'Run no encontrado' });

    const progress = await calculateRoutineProgress(run._id);
    res.json({ ...run.toObject(), progress });
  } catch (err) {
    next(err);
  }
}

// GET /runs/:id/sections/:sectionId — actividades + resultados guardados de una sección
async function getRunSection(req, res, next) {
  try {
    const { id, sectionId } = req.params;
    const sectionRun = await SectionRun.findOne({ routineRunId: id, sectionId });
    if (!sectionRun) return res.status(404).json({ message: 'Sección no encontrada en este run' });

    const tasks = await Task.find({ sectionId, active: true }).sort({ order: 1 });
    const results = await TaskResult.find({ sectionRunId: sectionRun._id });
    const resultsByTask = Object.fromEntries(results.map((r) => [String(r.taskId), r]));

    res.json({
      sectionRun,
      tasks: tasks.map((t) => ({ ...t.toObject(), result: resultsByTask[String(t._id)] || null })),
    });
  } catch (err) {
    next(err);
  }
}

// POST /runs/:id/tasks/:taskId/result
async function submitTaskResult(req, res, next) {
  try {
    const { id: routineRunId, taskId } = req.params;
    const { value, comment, photoUrl, photoUrls } = req.body;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Actividad no encontrada' });

    const sectionRun = await SectionRun.findOne({ routineRunId, sectionId: task.sectionId });
    if (!sectionRun) return res.status(404).json({ message: 'Sección no encontrada en este run' });

    // Normalizar arreglo de fotos
    let allPhotos = Array.isArray(photoUrls) ? photoUrls.filter(Boolean) : [];
    if (photoUrl && !allPhotos.includes(photoUrl)) {
      allPhotos.unshift(photoUrl);
    }
    const primaryPhotoUrl = allPhotos[0] || photoUrl || undefined;

    if (task.requiresPhoto && allPhotos.length === 0) {
      return res.status(400).json({ message: 'Esta actividad requiere fotografía' });
    }
    if (task.requiresComment && !comment) {
      return res.status(400).json({ message: 'Esta actividad requiere comentario' });
    }

    const result = await TaskResult.findOneAndUpdate(
      { routineRunId, taskId },
      {
        routineRunId,
        sectionRunId: sectionRun._id,
        taskId,
        type: task.type,
        value,
        comment,
        photoUrl: primaryPhotoUrl,
        photoUrls: allPhotos,
        completedBy: req.user.sub,
        completedAt: new Date(),
      },
      { new: true, upsert: true }
    );

    if (sectionRun.status === 'pending') {
      sectionRun.status = 'in_progress';
      await sectionRun.save();
    }

    const sectionProgress = await recalculateSectionProgress(sectionRun._id);
    res.json({ result, sectionProgress });
  } catch (err) {
    next(err);
  }
}

// POST /runs/:id/incidents  body: { sectionId?, taskId?, title, description, photoUrl, priority }
async function reportIncident(req, res, next) {
  try {
    const { id: routineRunId } = req.params;
    const { sectionId, taskId, title, description, photoUrl, priority } = req.body;

    let sectionRunId;
    if (sectionId) {
      const sectionRun = await SectionRun.findOne({ routineRunId, sectionId });
      sectionRunId = sectionRun?._id;
    }

    const incident = await Incident.create({
      routineRunId,
      sectionRunId,
      taskId,
      title,
      description,
      photoUrl,
      priority,
      reportedBy: req.user.sub,
    });

    res.status(201).json(incident);
  } catch (err) {
    next(err);
  }
}

// POST /runs/:id/complete — valida secciones obligatorias y arma el resumen
async function completeRun(req, res, next) {
  try {
    const run = await RoutineRun.findById(req.params.id);
    if (!run) return res.status(404).json({ message: 'Run no encontrado' });

    const progress = await calculateRoutineProgress(run._id);
    if (!progress.allRequiredCompleted) {
      return res.status(400).json({
        message: 'Faltan secciones obligatorias por completar',
        progress,
      });
    }

    run.status = 'completed';
    run.completedAt = new Date();
    await run.save();

    const incidents = await Incident.find({ routineRunId: run._id });
    const results = await TaskResult.find({ routineRunId: run._id });
    const taskPhotosCount = results.reduce((sum, r) => {
      if (r.photoUrls && r.photoUrls.length > 0) return sum + r.photoUrls.length;
      return sum + (r.photoUrl ? 1 : 0);
    }, 0);
    const incidentPhotosCount = incidents.filter((i) => i.photoUrl).length;
    const photosCount = taskPhotosCount + incidentPhotosCount;
    const employee = await User.findById(run.employeeId);
    const routine = await Routine.findById(run.routineId);

    res.json({
      routine: { id: routine._id, name: routine.name },
      sections: progress.sections.map((s) => ({
        name: s.name,
        status: s.status,
        completed: s.completed,
        total: s.total,
        hasIncidents: s.hasIncidents,
      })),
      activitiesCompleted: progress.completedActivities,
      activitiesTotal: progress.totalActivities,
      percentage: progress.percentage,
      incidentsCount: incidents.length,
      photosCount,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      employee: employee ? { id: employee._id, name: employee.name } : null,
    });
  } catch (err) {
    next(err);
  }
}

// GET /runs?establishmentId=&date=&shift=  — para "Rutinas de hoy"
async function listRuns(req, res, next) {
  try {
    const { establishmentId, date, employeeId, shift } = req.query;
    const filter = {};
    if (establishmentId) filter.establishmentId = establishmentId;
    if (date) filter.date = date;
    if (employeeId) filter.employeeId = employeeId;
    if (shift) filter.shift = shift;

    const runs = await RoutineRun.find(filter).sort({ createdAt: -1 });
    res.json(runs);
  } catch (err) {
    next(err);
  }
}

// GET /runs/history?establishmentId=&date=&shift=&from=&to= — Historial detallado para el Admin
async function getHistory(req, res, next) {
  try {
    const { establishmentId, date, shift, from, to } = req.query;
    const filter = {};
    if (establishmentId) filter.establishmentId = establishmentId;
    if (shift) filter.shift = shift;
    if (date) {
      filter.date = date;
    } else if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const runs = await RoutineRun.find(filter)
      .populate('routineId', 'name type icon')
      .populate('employeeId', 'name username shift role')
      .sort({ date: -1, createdAt: -1 });

    const historyWithProgress = await Promise.all(
      runs.map(async (run) => {
        const progress = await calculateRoutineProgress(run._id);
        const incidentsCount = await Incident.countDocuments({ routineRunId: run._id });
        const results = await TaskResult.find({ routineRunId: run._id });
        const photosCount = results.reduce((sum, r) => {
          if (r.photoUrls && r.photoUrls.length > 0) return sum + r.photoUrls.length;
          return sum + (r.photoUrl ? 1 : 0);
        }, 0);

        return {
          _id: run._id,
          routineId: run.routineId,
          routine: run.routineId,
          employee: run.employeeId,
          status: run.status,
          date: run.date,
          shift: run.shift || 'apertura',
          startedAt: run.startedAt,
          completedAt: run.completedAt,
          createdAt: run.createdAt,
          progress,
          incidentsCount,
          photosCount,
        };
      })
    );

    res.json(historyWithProgress);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  startRun,
  getRun,
  getRunSection,
  submitTaskResult,
  reportIncident,
  completeRun,
  listRuns,
  getHistory,
};
