import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), accountType: user.accountType, adminRole: user.adminRole },
    process.env.JWT_SECRET || 'dev_fallback_secret',
    { expiresIn: '7d' }
  );
}

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, orgName } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: { code: 'ERR_VALIDATION', message: 'Name, email, and password are required.' } });
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(409).json({ error: { code: 'ERR_EMAIL_EXISTS', message: 'Email already registered.' } });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, accountType: 'BORROWER', orgName: orgName || `${name} Inc.` });
    const token = signToken(user);
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, accountType: user.accountType, adminRole: user.adminRole, orgName: user.orgName } });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user || !(await user.comparePassword(password || ''))) {
      return res.status(401).json({ error: { code: 'ERR_INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
    }
    const token = signToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, accountType: user.accountType, adminRole: user.adminRole, orgName: user.orgName } });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
