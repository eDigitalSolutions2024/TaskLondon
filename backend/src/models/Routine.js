const mongoose = require('mongoose');

const routineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    type: {
      type: String,
      enum: ['apertura', 'operacion', 'cierre', 'cambio_turno', 'custom'],
      default: 'custom',
    },
    icon: { type: String, default: 'checklist' },
    shift: { type: String, enum: ['apertura', 'cierre', 'ambos'], default: 'ambos' },
    establishmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Establishment', required: true },
    schedule: { type: String }, // ej. "06:00-07:00" texto libre por ahora
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Routine', routineSchema);
