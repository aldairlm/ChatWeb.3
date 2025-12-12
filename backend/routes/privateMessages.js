const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const PrivateMessage = require('../models/PrivateMessage');

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

// Obtener conversación privada con un usuario
router.get('/:userId', verifyToken, async (req, res) => {
  try {
    const messages = await PrivateMessage.find({
      $or: [
        { sender: req.userId, recipient: req.params.userId },
        { sender: req.params.userId, recipient: req.userId }
      ]
    })
    .populate('sender', 'username profileImage')
    .populate('recipient', 'username profileImage')
    .sort({ createdAt: 1 })
    .limit(100);

    // Marcar mensajes como leídos
    await PrivateMessage.updateMany(
      { sender: req.params.userId, recipient: req.userId, read: false },
      { read: true }
    );

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Obtener lista de conversaciones (últimos usuarios con los que chateó)
router.get('/conversations/list', verifyToken, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const conversations = await PrivateMessage.aggregate([
      {
        $match: {
          $or: [
            { sender: userId },
            { recipient: userId }
          ]
        }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', userId] },
              '$recipient',
              '$sender'
            ]
          },
          lastMessage: { $last: '$$ROOT' }
        }
      },
      { $sort: { 'lastMessage.createdAt': -1 } },
      { $limit: 50 }
    ]);

    // Enriquecer con datos del usuario
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const user = await User.findById(conv._id).select('username profileImage');
        return {
          userId: conv._id,
          user,
          lastMessage: conv.lastMessage
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Enviar mensaje privado
router.post('/:recipientId', verifyToken, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Content required' });
    }

    const recipient = await User.findById(req.params.recipientId);
    if (!recipient) return res.status(404).json({ message: 'User not found' });

    const message = await PrivateMessage.create({
      sender: req.userId,
      recipient: req.params.recipientId,
      content: content.trim()
    });

    await message.populate('sender', 'username profileImage');
    await message.populate('recipient', 'username profileImage');

    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Marcar mensajes como leídos
router.patch('/:userId/read', verifyToken, async (req, res) => {
  try {
    await PrivateMessage.updateMany(
      { sender: req.params.userId, recipient: req.userId, read: false },
      { read: true }
    );
    res.json({ message: 'Messages marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
