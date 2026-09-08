const mongoose = require('mongoose');

const routineSectionSchema = new mongoose.Schema(
  {
    routineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Routine', required: true },
    name: { type: String, required: true },
    description: { type: String },
    icon: { type: String, default: 'checklist' },
    order: { type: Number, default: 0 },
    required: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

routineSectionSchema.index({ routineId: 1, order: 1 });

module.exports = mongoose.model('RoutineSection', routineSectionSchema);
