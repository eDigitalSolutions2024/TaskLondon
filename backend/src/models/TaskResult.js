const mongoose = require('mongoose');

const taskResultSchema = new mongoose.Schema(
  {
    routineRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoutineRun', required: true },
    sectionRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'SectionRun', required: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    type: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed }, // bool | number | string | option label
    photoUrl: { type: String },
    photoUrls: [{ type: String }],
    comment: { type: String },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

taskResultSchema.index({ routineRunId: 1 });
taskResultSchema.index({ sectionRunId: 1 });
taskResultSchema.index({ routineRunId: 1, taskId: 1 }, { unique: true });

module.exports = mongoose.model('TaskResult', taskResultSchema);
