const Routine = require('../models/Routine');
const RoutineSection = require('../models/RoutineSection');
const Task = require('../models/Task');
const RoutineRun = require('../models/RoutineRun');

// GET /routines?establishmentId= — para pantalla "Rutinas de hoy"
async function listRoutines(req, res, next) {
  try {
    const { establishmentId } = req.query;
    const filter = { active: true };
    if (establishmentId) filter.establishmentId = establishmentId;

    const routines = await Routine.find(filter).sort({ order: 1 });

    const withCounts = await Promise.all(
      routines.map(async (routine) => {
        const sections = await RoutineSection.find({ routineId: routine._id, active: true });
        const sectionIds = sections.map((s) => s._id);
        const activitiesCount = await Task.countDocuments({ sectionId: { $in: sectionIds }, active: true });
        return {
          ...routine.toObject(),
          sectionsCount: sections.length,
          activitiesCount,
        };
      })
    );

    res.json(withCounts);
  } catch (err) {
    next(err);
  }
}

// GET /routines/:id/full — rutina + secciones + tasks anidadas
async function getRoutineFull(req, res, next) {
  try {
    const routine = await Routine.findById(req.params.id);
    if (!routine) return res.status(404).json({ message: 'Rutina no encontrada' });

    const sections = await RoutineSection.find({ routineId: routine._id, active: true }).sort({ order: 1 });
    const sectionsWithTasks = await Promise.all(
      sections.map(async (section) => {
        const tasks = await Task.find({ sectionId: section._id, active: true }).sort({ order: 1 });
        return { ...section.toObject(), tasks };
      })
    );

    res.json({ ...routine.toObject(), sections: sectionsWithTasks });
  } catch (err) {
    next(err);
  }
}

async function createRoutine(req, res, next) {
  try {
    const routine = await Routine.create(req.body);
    res.status(201).json(routine);
  } catch (err) {
    next(err);
  }
}

async function updateRoutine(req, res, next) {
  try {
    const routine = await Routine.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!routine) return res.status(404).json({ message: 'Rutina no encontrada' });
    res.json(routine);
  } catch (err) {
    next(err);
  }
}

async function deleteRoutine(req, res, next) {
  try {
    const routine = await Routine.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    if (!routine) return res.status(404).json({ message: 'Rutina no encontrada' });
    res.json({ message: 'Rutina desactivada' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listRoutines, getRoutineFull, createRoutine, updateRoutine, deleteRoutine };
