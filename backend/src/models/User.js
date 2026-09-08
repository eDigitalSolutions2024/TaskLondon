const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    passwordHash: { type: String },
    role: { type: String, enum: ['admin', 'employee'], default: 'employee' },
    shift: { type: String, enum: ['apertura', 'cierre'] },
    establishmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Establishment', required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
