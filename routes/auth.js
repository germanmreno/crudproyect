// src/routes/authRouter.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Registro de usuario
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ msg: 'Todos los campos son obligatorios' });
    }

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) {
      return res.status(409).json({ msg: 'Usuario o email ya registrado' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashed });

    return res
      .status(201)
      .json({ id: user._id, username: user.username, email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error en el servidor' });
  }
});

// Inicio de sesión
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ msg: 'Email y contraseña son obligatorios' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ msg: 'Credenciales incorrectas' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ msg: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        preferences: user.preferences,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error en el servidor' });
  }
});

// Actualizar perfil
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (username && username !== user.username) {
      const exists = await User.findOne({ username });
      if (exists) {
        return res.status(400).json({ msg: 'Nombre de usuario ya existe' });
      }
      user.username = username;
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ msg: 'Contraseña actual requerida' });
      }

      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) {
        return res.status(400).json({ msg: 'Contraseña actual incorrecta' });
      }

      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();

    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        preferences: user.preferences,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al actualizar perfil' });
  }
});

// Actualizar avatar
router.put('/avatar', authMiddleware, async (req, res) => {
  try {
    const { avatarUrl } = req.body;
    if (!avatarUrl) {
      return res.status(400).json({ msg: 'URL de avatar requerida' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: avatarUrl },
      { new: true }
    );

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        preferences: user.preferences,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al actualizar avatar' });
  }
});

// Actualizar preferencias
router.put('/preferences', authMiddleware, async (req, res) => {
  try {
    const { gridSize, sortBy } = req.body;
    const update = {};

    if (gridSize) {
      if (!['small', 'medium', 'large'].includes(gridSize)) {
        return res.status(400).json({ msg: 'Tamaño de cuadrícula inválido' });
      }
      update['preferences.gridSize'] = gridSize;
    }

    if (sortBy) {
      if (
        ![
          'recent',
          'oldest',
          'rating-desc',
          'rating-asc',
          'title-asc',
          'title-desc',
        ].includes(sortBy)
      ) {
        return res
          .status(400)
          .json({ msg: 'Criterio de ordenamiento inválido' });
      }
      update['preferences.sortBy'] = sortBy;
    }

    const user = await User.findByIdAndUpdate(req.user.id, update, {
      new: true,
    });

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        preferences: user.preferences,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al actualizar preferencias' });
  }
});

// --- AUTOCOMPLETADO DE USUARIOS ---
router.get('/search-users', authMiddleware, async (req, res) => {
  try {
    const { username } = req.query;
    if (!username || !username.trim()) {
      return res.status(400).json({ msg: 'El nombre de usuario es requerido' });
    }
    // Buscar usuarios cuyo username coincida parcialmente, excluyendo al usuario actual
    const users = await User.find({
      username: { $regex: username, $options: 'i' },
      _id: { $ne: req.user.id },
    })
      .select('_id username avatar')
      .limit(10);
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al buscar usuarios' });
  }
});

export default router;
