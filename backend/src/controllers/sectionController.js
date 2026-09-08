const RoutineSection = require('../models/RoutineSection');
const Task = require('../models/Task');
const Routine = require('../models/Routine');

async function listSections(req, res, next) {
  try {
    const { routineId, establishmentId } = req.query;
    let query = { active: true };

    if (routineId) {
      query.routineId = routineId;
    } else if (establishmentId) {
      const routines = await Routine.find({ establishmentId, active: true }).select('_id');
      const routineIds = routines.map((r) => r._id);
      query.routineId = { $in: routineIds };
    }

    const sections = await RoutineSection.find(query)
      .populate('routineId', 'name type shift')
      .sort({ order: 1 });

    const withCount = await Promise.all(
      sections.map(async (s) => {
        const tasksCount = await Task.countDocuments({ sectionId: s._id, active: true });
        return {
          ...s.toObject(),
          tasksCount,
        };
      })
    );

    res.json(withCount);
  } catch (err) {
    next(err);
  }
}

async function createSection(req, res, next) {
  try {
    const section = await RoutineSection.create(req.body);
    res.status(201).json(section);
  } catch (err) {
    next(err);
  }
}

async function updateSection(req, res, next) {
  try {
    const section = await RoutineSection.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!section) return res.status(404).json({ message: 'Sección no encontrada' });
    res.json(section);
  } catch (err) {
    next(err);
  }
}

async function deleteSection(req, res, next) {
  try {
    const section = await RoutineSection.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    if (!section) return res.status(404).json({ message: 'Sección no encontrada' });
    res.json({ message: 'Sección desactivada' });
  } catch (err) {
    next(err);
  }
}

// PUT /sections/reorder  body: { sections: [{ id, order }] }
async function reorderSections(req, res, next) {
  try {
    const { sections } = req.body;
    await Promise.all(
      (sections || []).map((s) => RoutineSection.findByIdAndUpdate(s.id, { order: s.order }))
    );
    res.json({ message: 'Orden actualizado' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listSections, createSection, updateSection, deleteSection, reorderSections };
