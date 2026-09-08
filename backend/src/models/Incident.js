const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
  {
    routineRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoutineRun', required: true },
    sectionRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'SectionRun' },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    title: { type: String, required: true },
    description: { type: String },
    photoUrl: { type: String },
    priority: { type: String, enum: ['baja', 'media', 'alta', 'critica'], default: 'media' },
    status: { type: String, enum: ['open', 'resolved'], default: 'open' },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

incidentSchema.index({ routineRunId: 1 });

module.exports = mongoose.model('Incident', incidentSchema);
