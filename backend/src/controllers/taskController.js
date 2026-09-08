const Task = require('../models/Task');

async function createTask(req, res, next) {
  try {
    const task = await Task.create(req.body);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
}

async function updateTask(req, res, next) {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!task) return res.status(404).json({ message: 'Actividad no encontrada' });
    res.json(task);
  } catch (err) {
    next(err);
  }
}

async function deleteTask(req, res, next) {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    if (!task) return res.status(404).json({ message: 'Actividad no encontrada' });
    res.json({ message: 'Actividad desactivada' });
  } catch (err) {
    next(err);
  }
}

// PUT /tasks/reorder  body: { tasks: [{ id, order }] }
async function reorderTasks(req, res, next) {
  try {
    const { tasks } = req.body;
    await Promise.all((tasks || []).map((t) => Task.findByIdAndUpdate(t.id, { order: t.order })));
    res.json({ message: 'Orden actualizado' });
  } catch (err) {
    next(err);
  }
}

async function listTaskTypes(req, res) {
  res.json(Task.TASK_TYPES);
}

module.exports = { createTask, updateTask, deleteTask, reorderTasks, listTaskTypes };
