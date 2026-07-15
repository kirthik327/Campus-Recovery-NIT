import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../database.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'campus_lost_and_found_secret_key_12345';

// Register Student
router.post('/register', async (req, res) => {
  const { username, email, password, contact, department, year, registerNumber } = req.body;

  if (!username || !email || !password || !registerNumber) {
    return res.status(400).json({ message: 'Username, email, password, and register number are required.' });
  }

  if (!registerNumber.startsWith('7210')) {
    return res.status(400).json({ message: 'Register Number must start with 7210.' });
  }

  try {
    // Check if user already exists
    const existingUser = await db.users.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    const existingReg = await db.users.findOne({ registerNumber });
    if (existingReg) {
      return res.status(400).json({ message: 'User with this register number already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await db.users.create({
      username,
      email,
      password: hashedPassword,
      registerNumber,
      contact: contact || '',
      department: department || '',
      year: year || '',
      role: 'student' // Default registration is student
    });

    // Sign JWT
    const token = jwt.sign(
      { id: newUser._id || newUser.id, username: newUser.username, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser._id || newUser.id,
        username: newUser.username,
        email: newUser.email,
        registerNumber: newUser.registerNumber,
        role: newUser.role,
        contact: newUser.contact,
        department: newUser.department,
        year: newUser.year
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// Login (Student or Admin)
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body; // identifier can be email or registerNumber

  if (!identifier || !password) {
    return res.status(400).json({ message: 'Register number/Email and password are required.' });
  }

  try {
    // Find user by email or register number
    let user;
    if (identifier.includes('@')) {
      user = await db.users.findOne({ email: identifier });
    } else {
      user = await db.users.findOne({ registerNumber: identifier });
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user._id || user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id || user.id,
        username: user.username,
        email: user.email,
        registerNumber: user.registerNumber,
        role: user.role,
        contact: user.contact,
        department: user.department,
        year: user.year
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// Get Current User Profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await db.users.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({
      id: user._id || user.id,
      username: user.username,
      email: user.email,
      registerNumber: user.registerNumber,
      role: user.role,
      contact: user.contact,
      department: user.department,
      year: user.year
    });
  } catch (err) {
    console.error('Me query error:', err);
    res.status(500).json({ message: 'Server error fetching user details.' });
  }
});

// Update User Profile
router.put('/profile', verifyToken, async (req, res) => {
  const { username, department, year, contact, registerNumber } = req.body;

  try {
    const userRecord = await db.users.findById(req.user.id);
    if (!userRecord) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const updates = {};
    if (username) updates.username = username;
    if (department !== undefined) updates.department = department;
    if (year !== undefined) updates.year = year;
    if (contact !== undefined) updates.contact = contact;

    if (registerNumber) {
      if (userRecord.registerNumber && userRecord.registerNumber.trim() !== '') {
        return res.status(400).json({ message: 'Register Number cannot be altered once registered.' });
      }
      if (!registerNumber.startsWith('7210')) {
        return res.status(400).json({ message: 'Register Number must start with 7210.' });
      }
      // Ensure unique register number
      const existingUser = await db.users.findOne({ registerNumber });
      if (existingUser && String(existingUser._id || existingUser.id) !== String(req.user.id)) {
        return res.status(400).json({ message: 'Register Number is already registered by another account.' });
      }
      updates.registerNumber = registerNumber;
    }

    const updatedUser = await db.users.findByIdAndUpdate(req.user.id, updates);
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({
      message: 'Profile updated successfully.',
      user: {
        id: updatedUser._id || updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        registerNumber: updatedUser.registerNumber,
        role: updatedUser.role,
        contact: updatedUser.contact,
        department: updatedUser.department,
        year: updatedUser.year
      }
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: 'Server error updating profile details.' });
  }
});

export default router;
