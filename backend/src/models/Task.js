const mongoose = require('mongoose');

const TASK_TYPES = [
  'checkbox',
  'confirmation',
  'temperature',
  'quantity',
  'selection',
  'text',
  'photo',
  'photo_confirmation',
];

const taskSchema = new mongoose.Schema(
  {
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoutineSection', required: true },
    title: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: TASK_TYPES, required: true },
    icon: { type: String, default: 'checklist' },
    order: { type: Number, default: 0 },
    required: { type: Boolean, default: true },
    requiresPhoto: { type: Boolean, default: false },
    requiresComment: { type: Boolean, default: false },
    config: {
      unit: { type: String }, // ej. "°C" para temperature, "bolsas" para quantity
      min: { type: Number },
      max: { type: Number },
      options: [{ type: String }], // para selection
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

taskSchema.index({ sectionId: 1, order: 1 });

taskSchema.statics.TASK_TYPES = TASK_TYPES;

module.exports = mongoose.model('Task', taskSchema);
