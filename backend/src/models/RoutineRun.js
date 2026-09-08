const mongoose = require('mongoose');

const routineRunSchema = new mongoose.Schema(
  {
    routineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Routine', required: true },
    establishmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Establishment', required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
    date: { type: String, required: true }, // YYYY-MM-DD, para agrupar "rutinas de hoy"
    shift: { type: String, enum: ['apertura', 'cierre', 'operacion', 'cambio_turno', 'custom'], default: 'apertura' },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

routineRunSchema.index({ establishmentId: 1, date: 1, shift: 1 });
routineRunSchema.index({ routineId: 1, date: 1, shift: 1 });

module.exports = mongoose.model('RoutineRun', routineRunSchema);
