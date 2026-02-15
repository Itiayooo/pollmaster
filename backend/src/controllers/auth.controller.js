const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const sendAuthResponse = (res, user, statusCode = 200) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      email: user.email,
      username: user.username,
      displayName: user.displayName || user.username,
      role: user.role,
      plan: user.plan,
      isVerified: user.isVerified,
      pollsCreated: user.pollsCreated,
    },
  });
};

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { email, username, password, displayName } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email, username, and password are required.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters.',
      });
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(409).json({ success: false, message: 'Username already taken.' });
    }

    const user = await User.create({
      email,
      username,
      password,
      displayName: displayName || username,
    });

    sendAuthResponse(res, user, 201);
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    sendAuthResponse(res, user);
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
};

// PATCH /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const { displayName, username } = req.body;
    const updates = {};

    if (displayName) updates.displayName = displayName;
    if (username) {
      const taken = await User.findOne({ username, _id: { $ne: req.user._id } });
      if (taken) {
        return res.status(409).json({ success: false, message: 'Username already taken.' });
      }
      updates.username = username;
    }

    const updated = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, user: updated });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both passwords are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, updateProfile, changePassword };
