const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function login(req, res, next) {
  try {
    const { username, name, email, identifier, password } = req.body;
    const loginQuery = (name || username || identifier || email || '').trim();
    
    if (!loginQuery) {
      return res.status(400).json({ message: 'Ingresa el nombre del empleado' });
    }

    const escapedQuery = loginQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({
      active: true,
      $or: [
        { name: new RegExp(`^${escapedQuery}$`, 'i') },
        { username: loginQuery.toLowerCase() },
        { email: loginQuery.toLowerCase() },
      ],
    });
    if (!user) return res.status(401).json({ message: 'Empleado no encontrado o inactivo' });

    if (user.role === 'admin') {
      if (!user.passwordHash) {
        return res.status(401).json({ message: 'Esta cuenta de administrador no tiene contraseña configurada' });
      }
      if (!password) {
        return res.status(401).json({ message: 'Contraseña requerida' });
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return res.status(401).json({ message: 'Contraseña inválida' });
    }

    const token = jwt.sign(
      { sub: user._id, role: user.role, establishmentId: user.establishmentId, name: user.name, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        shift: user.shift,
        establishmentId: user.establishmentId,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { login };
