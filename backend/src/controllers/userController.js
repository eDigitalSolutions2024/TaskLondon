const bcrypt = require('bcryptjs');
const User = require('../models/User');

function toPublicUser(user) {
  return {
    id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    shift: user.shift,
    establishmentId: user.establishmentId,
    active: user.active,
    createdAt: user.createdAt,
  };
}

// GET /users?establishmentId=
async function listUsers(req, res, next) {
  try {
    const { establishmentId } = req.query;
    const filter = {};
    if (establishmentId) filter.establishmentId = establishmentId;

    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json(users.map(toPublicUser));
  } catch (err) {
    next(err);
  }
}

// POST /users  body: { name, username, email?, password?, role, shift?, establishmentId }
async function createUser(req, res, next) {
  try {
    const { name, username, email, password, role, shift, establishmentId } = req.body;

    if (!name || !username || !establishmentId) {
      return res.status(400).json({ message: 'Nombre, usuario y sucursal son requeridos' });
    }

    const existing = await User.findOne({ username: username.toLowerCase().trim() });
    if (existing) return res.status(409).json({ message: 'Ese nombre de usuario ya está en uso' });

    const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;

    const user = await User.create({
      name,
      username: username.toLowerCase().trim(),
      email,
      passwordHash,
      role: role === 'admin' ? 'admin' : 'employee',
      shift,
      establishmentId,
    });

    res.status(201).json(toPublicUser(user));
  } catch (err) {
    next(err);
  }
}

// PUT /users/:id  body: { name?, username?, email?, password?, role?, shift?, active? }
async function updateUser(req, res, next) {
  try {
    const { name, username, email, password, role, shift, active } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (username !== undefined) update.username = username.toLowerCase().trim();
    if (email !== undefined) update.email = email;
    if (role !== undefined) update.role = role === 'admin' ? 'admin' : 'employee';
    if (shift !== undefined) update.shift = shift;
    if (active !== undefined) update.active = active;
    if (password) update.passwordHash = await bcrypt.hash(password, 10);

    if (update.username) {
      const existing = await User.findOne({ username: update.username, _id: { $ne: req.params.id } });
      if (existing) return res.status(409).json({ message: 'Ese nombre de usuario ya está en uso' });
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!user) return res.status(404).json({ message: 'Colaborador no encontrado' });
    res.json(toPublicUser(user));
  } catch (err) {
    next(err);
  }
}

// DELETE /users/:id — baja lógica (no se elimina el historial asociado)
async function deactivateUser(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    if (!user) return res.status(404).json({ message: 'Colaborador no encontrado' });
    res.json({ message: 'Colaborador desactivado' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, createUser, updateUser, deactivateUser };
