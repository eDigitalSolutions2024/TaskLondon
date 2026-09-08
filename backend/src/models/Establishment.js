const mongoose = require('mongoose');

const establishmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Establishment', establishmentSchema);
