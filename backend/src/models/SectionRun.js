const mongoose = require('mongoose');

const sectionRunSchema = new mongoose.Schema(
  {
    routineRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoutineRun', required: true },
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoutineSection', required: true },
    status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

sectionRunSchema.index({ routineRunId: 1 });

module.exports = mongoose.model('SectionRun', sectionRunSchema);
