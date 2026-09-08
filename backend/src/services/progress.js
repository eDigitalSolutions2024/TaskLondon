const Task = require('../models/Task');
const TaskResult = require('../models/TaskResult');
const SectionRun = require('../models/SectionRun');
const RoutineSection = require('../models/RoutineSection');
const Incident = require('../models/Incident');

/**
 * Calcula progreso de una sección dentro de un run: total de tareas activas,
 * completadas, porcentaje y estado. Actualiza el SectionRun correspondiente.
 */
async function recalculateSectionProgress(sectionRunId) {
  const sectionRun = await SectionRun.findById(sectionRunId);
  if (!sectionRun) return null;

  const tasks = await Task.find({ sectionId: sectionRun.sectionId, active: true });
  const results = await TaskResult.find({ sectionRunId });
  const resultTaskIds = new Set(results.map((r) => String(r.taskId)));

  const total = tasks.length;
  const completed = tasks.filter((t) => resultTaskIds.has(String(t._id))).length;
  const hasIncidents = (await Incident.countDocuments({ sectionRunId, status: 'open' })) > 0;

  let status = 'pending';
  if (completed > 0 && completed < total) status = 'in_progress';
  if (total > 0 && completed === total) status = 'completed';

  sectionRun.status = status;
  if (status === 'completed' && !sectionRun.completedAt) sectionRun.completedAt = new Date();
  await sectionRun.save();

  return {
    sectionRunId: String(sectionRunId),
    sectionId: String(sectionRun.sectionId),
    total,
    completed,
    percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
    status,
    hasIncidents,
  };
}

/**
 * Progreso agregado de toda la rutina (todas las secciones del run).
 */
async function calculateRoutineProgress(routineRunId) {
  const sectionRuns = await SectionRun.find({ routineRunId });
  const sections = await Promise.all(
    sectionRuns.map(async (sr) => {
      const section = await RoutineSection.findById(sr.sectionId);
      const progress = await recalculateSectionProgress(sr._id);
      return { ...progress, name: section?.name, icon: section?.icon, required: section?.required };
    })
  );

  const totalActivities = sections.reduce((sum, s) => sum + s.total, 0);
  const completedActivities = sections.reduce((sum, s) => sum + s.completed, 0);
  const requiredSections = sections.filter((s) => s.required);
  const allRequiredCompleted = requiredSections.every((s) => s.status === 'completed');

  return {
    sections,
    totalActivities,
    completedActivities,
    percentage: totalActivities === 0 ? 0 : Math.round((completedActivities / totalActivities) * 100),
    allRequiredCompleted,
  };
}

module.exports = { recalculateSectionProgress, calculateRoutineProgress };
