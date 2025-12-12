const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware para verificar token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'changeme_super_secret');
    req.userId = payload.id;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

router.post('/register', async (req, res) => {
  try {
    console.log('[AUTH] register body:', req.body);
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Missing fields' });
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ message: 'Username already taken' });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hash });
    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET || 'changeme_super_secret');
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        username: user.username,
        profileImage: user.profileImage,
        bio: user.bio,
        email: user.email
      } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    console.log('[AUTH] login body:', req.body);
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET || 'changeme_super_secret');
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        username: user.username,
        profileImage: user.profileImage,
        bio: user.bio,
        email: user.email
      } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Obtener perfil del usuario autenticado
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Actualizar perfil del usuario
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { bio, email, profileImage } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { 
        bio: bio || '',
        email: email || '',
        profileImage: profileImage || null,
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Obtener perfil de otro usuario por nombre
router.get('/profile/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Obtener lista de todos los usuarios (excepto el actual)
router.get('/users/list/all', verifyToken, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.userId } })
      .select('username profileImage bio email')
      .limit(100);
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
