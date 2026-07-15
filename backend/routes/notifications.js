import express from 'express';
import { db } from '../database.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Get User's Notifications
router.get('/', verifyToken, async (req, res) => {
  try {
    const targetUserId = req.user.role === 'admin' ? 'admin' : req.user.id;
    const notifications = await db.notifications.find({ userId: targetUserId });
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'Server error fetching notifications.' });
  }
});

// Mark All Notifications as Read
router.put('/read', verifyToken, async (req, res) => {
  try {
    const targetUserId = req.user.role === 'admin' ? 'admin' : req.user.id;
    await db.notifications.updateMany({ userId: targetUserId, read: false }, { read: true });
    res.json({ message: 'Notifications marked as read.' });
  } catch (err) {
    console.error('Error updating notifications:', err);
    res.status(500).json({ message: 'Server error updating notifications.' });
  }
});

export default router;
